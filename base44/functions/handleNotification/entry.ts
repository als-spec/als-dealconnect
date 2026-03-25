import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { event, data, old_data, changed_fields } = body;

    const base44 = createClientFromRequest(req);

    const sendEmail = async (to, subject, htmlBody) => {
      await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body: htmlBody });
    };

    const getAllUsers = async () => base44.asServiceRole.entities.User.list();
    const getUserById = async (id) => {
      const users = await getAllUsers();
      return users.find(u => u.id === id);
    };

    // --- New member application → notify admins ---
    if (event?.entity_name === 'MemberApplication' && event?.type === 'create') {
      const users = await getAllUsers();
      const admins = users.filter(u => u.role === 'admin');
      for (const admin of admins) {
        await sendEmail(
          admin.email,
          'New Member Application — ALS DealConnect',
          `<p>Hi ${admin.full_name},</p>
           <p>A new member application was submitted:</p>
           <ul>
             <li><strong>Name:</strong> ${data.full_name}</li>
             <li><strong>Email:</strong> ${data.email}</li>
             <li><strong>Type:</strong> ${data.member_type}</li>
             <li><strong>Plan:</strong> ${data.selected_plan}</li>
           </ul>
           <p>Please log in to the admin panel to review and approve or reject it.</p>`
        );
      }
    }

    // --- Application status change → notify member ---
    if (event?.entity_name === 'MemberApplication' && event?.type === 'update' &&
        changed_fields?.includes('status') &&
        (data.status === 'approved' || data.status === 'rejected')) {
      await sendEmail(
        data.email,
        `Your ALS DealConnect Application Has Been ${data.status === 'approved' ? 'Approved' : 'Rejected'}`,
        `<p>Hi ${data.full_name},</p>
         <p>Your membership application has been <strong>${data.status}</strong>.</p>
         ${data.status === 'approved'
           ? '<p>You can now log in to access the full ALS DealConnect platform. Welcome aboard!</p>'
           : `<p>Unfortunately your application did not meet our current requirements.${data.admin_notes ? ' Notes: ' + data.admin_notes : ''}</p>`
         }
         <p>If you have any questions, please contact our team.</p>`
      );
    }

    // --- New message → notify thread participants ---
    if (event?.entity_name === 'Message' && event?.type === 'create') {
      const threads = await base44.asServiceRole.entities.MessageThread.list();
      const thread = threads.find(t => t.id === data.thread_id);
      if (thread) {
        const recipientIds = (thread.participants || []).filter(id => id !== data.sender_id);
        for (const recipientId of recipientIds) {
          const recipient = await getUserById(recipientId);
          if (recipient?.email) {
            await sendEmail(
              recipient.email,
              `New message from ${data.sender_name} — ALS DealConnect`,
              `<p>Hi ${recipient.full_name},</p>
               <p>You have a new message from <strong>${data.sender_name}</strong>:</p>
               <blockquote style="border-left:3px solid #00E5A0;padding-left:12px;color:#555;margin:12px 0;">${data.content || '[Attachment]'}</blockquote>
               <p>Log in to ALS DealConnect to reply.</p>`
            );
          }
        }
      }
    }

    // --- Service request status change → notify investor ---
    if (event?.entity_name === 'ServiceRequest' && event?.type === 'update' &&
        changed_fields?.includes('status')) {
      const statusLabels = { accepted: 'Accepted', in_progress: 'In Progress', completed: 'Completed' };
      if (statusLabels[data.status]) {
        const investor = await getUserById(data.investor_id);
        if (investor?.email) {
          await sendEmail(
            investor.email,
            `Service Request Update — ${data.deal_title || 'Your Deal'}`,
            `<p>Hi ${investor.full_name},</p>
             <p>Your service request for <strong>${data.deal_title || 'your deal'}</strong> has been updated to: <strong>${statusLabels[data.status]}</strong>.</p>
             <p>Transaction Coordinator: ${data.tc_name}</p>
             <p>Log in to ALS DealConnect to view full details.</p>`
          );
        }
      }
    }

    // --- New review → notify TC ---
    if (event?.entity_name === 'Review' && event?.type === 'create') {
      const profiles = await base44.asServiceRole.entities.TCProfile.list();
      const profile = profiles.find(p => p.id === data.tc_profile_id);
      if (profile) {
        const tc = await getUserById(profile.user_id);
        if (tc?.email) {
          await sendEmail(
            tc.email,
            'You received a new review — ALS DealConnect',
            `<p>Hi ${tc.full_name},</p>
             <p>You received a new <strong>${data.rating}-star review</strong>${data.reviewer_name ? ` from ${data.reviewer_name}` : ''}:</p>
             <blockquote style="border-left:3px solid #00E5A0;padding-left:12px;color:#555;margin:12px 0;">"${data.body || data.title || ''}"</blockquote>
             <p>Log in to view your updated profile.</p>`
          );
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});