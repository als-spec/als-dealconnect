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

    // --- New member application → notify admins + confirm to applicant ---
    if (event?.entity_name === 'MemberApplication' && event?.type === 'create') {
      // Notify admins
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
      // Confirm to applicant
      const applicantFirstName = (data.full_name || '').split(' ')[0] || data.full_name;
      await sendEmail(
        data.email,
        "You're Subscribed — Your ALS Deal Connect Membership is Under Review",
        `<p>Hi ${applicantFirstName},</p>
         <p>Thank you for subscribing to ALS Deal Connect. Your membership payment has been received and we're excited to have you on board.</p>
         <p>Your account is currently waiting for approval. Our admin team will review and verify your account within 24–48 hours and activate your access once the review is complete.</p>
         <p>You'll receive a separate welcome email with your dashboard access and onboarding instructions as soon as you're approved.</p>
         <p>Questions in the meantime? Simply reply to this email — we're happy to help.</p>
         <p>Looking forward to working with you,<br><strong>The ALS Deal Connect Team</strong></p>`
      );
    }

    // --- Application status change → notify member ---
    if (event?.entity_name === 'MemberApplication' && event?.type === 'update' &&
        changed_fields?.includes('status') &&
        (data.status === 'approved' || data.status === 'rejected')) {
      const firstName = (data.full_name || '').split(' ')[0] || data.full_name;
      const userTypeLabel = { tc: 'Transaction Coordinator', investor: 'Investor / Agent', pml: 'Private Money Lender' }[data.member_type] || 'Member';
      await sendEmail(
        data.email,
        data.status === 'approved'
          ? "You're In — Welcome to ALS Deal Connect 🎉"
          : "ALS Deal Connect — Application Update",
        data.status === 'approved'
          ? `<p>Hi ${firstName},</p>
             <p>Great news — your ALS Deal Connect membership is officially active! We've reviewed your account and you're cleared to start using the platform.</p>
             <p><strong>Here's how to hit the ground running:</strong></p>
             <ol>
               <li><strong>Log In &amp; Complete Your Profile</strong><br>Head to your dashboard and complete your ${userTypeLabel} profile. A complete profile helps us surface the right opportunities and connections for you.</li>
               <li><strong>Explore the Platform</strong><br>Browse active deals, funding opportunities, and connect with investors, lenders, and transaction coordinators in the member directory.</li>
               <li><strong>Schedule Your Onboarding Call</strong><br>Book a complimentary 30-minute onboarding call with our team for a personalized platform walkthrough and answers to any questions you have.</li>
               <li><strong>Connect with the Community</strong><br>Introduce yourself in the member directory and start building relationships with fellow deal-makers across the ALS Deal Connect network.</li>
             </ol>
             <p><a href="https://alsdealflow.com/dashboard" style="background:linear-gradient(135deg,#00e5b3,#00c8ff);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Access Your Dashboard →</a></p>
             <p>We're excited to have you on board. If you ever need support, our team is just an email away at <a href="mailto:support@alsdealflow.com">support@alsdealflow.com</a></p>
             <p>Here's to great deals,<br><strong>The ALS Deal Connect Team</strong></p>`
          : `<p>Hi ${firstName},</p>
             <p>Thank you for applying to ALS Deal Connect. After reviewing your application, we are unable to approve your membership at this time.${data.admin_notes ? `</p><p>Note from our team: ${data.admin_notes}` : ''}</p>
             <p>If you have questions, please reach out to us at <a href="mailto:support@alsdealflow.com">support@alsdealflow.com</a></p>
             <p>The ALS Deal Connect Team</p>`
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