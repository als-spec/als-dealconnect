import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Sends profile-completion reminder emails to approved members (tc, investor, pml)
 * who have not yet set up their profile (is_published is false or profile doesn't exist).
 *
 * Called by a scheduled automation — admin-only if invoked manually.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (service-role) calls through; block manual calls to non-admins.
    let isScheduled = false;
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      // No session = called from the scheduler (service-role context) — allow it.
      isScheduled = true;
    }

    const sr = base44.asServiceRole;

    // Fetch all approved members (tc, investor, pml roles)
    const [tcUsers, investorUsers, pmlUsers] = await Promise.all([
      sr.entities.User.filter({ role: 'tc' }),
      sr.entities.User.filter({ role: 'investor' }),
      sr.entities.User.filter({ role: 'pml' }),
    ]);

    // Only include users who have completed onboarding (approved)
    const approvedFilter = (u) => u.onboarding_step === 'approved';
    const allApproved = [
      ...tcUsers.filter(approvedFilter),
      ...investorUsers.filter(approvedFilter),
      ...pmlUsers.filter(approvedFilter),
    ];

    if (allApproved.length === 0) {
      return Response.json({ sent: 0, message: 'No approved members found.' });
    }

    // Fetch all published profiles to identify who already has one
    const [tcProfiles, investorProfiles, pmlProfiles] = await Promise.all([
      sr.entities.TCProfile.filter({ is_published: true }),
      sr.entities.InvestorProfile.filter({ is_published: true }),
      sr.entities.PMLProfile.filter({ is_published: true }),
    ]);

    const publishedUserIds = new Set([
      ...tcProfiles.map((p) => p.user_id),
      ...investorProfiles.map((p) => p.user_id),
      ...pmlProfiles.map((p) => p.user_id),
    ]);

    // Filter to users without a published profile
    const needsProfile = allApproved.filter((u) => !publishedUserIds.has(u.id));

    if (needsProfile.length === 0) {
      return Response.json({ sent: 0, message: 'All approved members already have published profiles.' });
    }

    const roleLabels = { tc: 'Transaction Coordinator', investor: 'Investor', pml: 'Private Money Lender' };
    const profileUrls = {
      tc: 'https://alsdfconnect.alsdealflow.com/profile/tc',
      investor: 'https://alsdfconnect.alsdealflow.com/profile/investor',
      pml: 'https://alsdfconnect.alsdealflow.com/profile/pml',
    };

    let sent = 0;
    const errors = [];

    for (const user of needsProfile) {
      const roleLabel = roleLabels[user.role] || 'Member';
      const profileUrl = profileUrls[user.role] || 'https://alsdfconnect.alsdealflow.com/dashboard';
      const firstName = user.full_name?.split(' ')[0] || 'there';

      try {
        await sr.integrations.Core.SendEmail({
          to: user.email,
          from_name: 'ALS DealConnect',
          subject: 'Complete your profile to get discovered on ALS DealConnect',
          body: `Hi ${firstName},

You're approved on ALS DealConnect as a ${roleLabel} — but your profile isn't set up yet, so other members can't find or connect with you.

Setting up your profile only takes a few minutes and lets investors, TCs, and lenders discover you and reach out for deals.

Complete your profile here:
${profileUrl}

Once your profile is published, you'll appear in the member directory and start getting connection requests.

See you on the platform,
The ALS DealConnect Team`,
        });
        sent++;
      } catch (e) {
        errors.push({ user_id: user.id, email: user.email, error: e.message });
      }
    }

    return Response.json({
      sent,
      total_needing_profile: needsProfile.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});