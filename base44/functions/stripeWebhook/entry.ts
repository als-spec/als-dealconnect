import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

// Map Stripe price/product to member roles
// We identify the member type from the customer's email in the MemberApplication
const ROLE_MAP = {
  tc: 'tc',
  investor: 'investor',
  pml: 'pml',
};

Deno.serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email || session.customer_email;

    if (!customerEmail) {
      console.error('No customer email found in session');
      return Response.json({ received: true });
    }

    try {
      const base44 = createClientFromRequest(req);

      // Find the MemberApplication by email
      const applications = await base44.asServiceRole.entities.MemberApplication.filter({
        email: customerEmail,
        status: 'pending',
      });

      if (applications.length === 0) {
        console.log('No pending application found for email:', customerEmail);
        return Response.json({ received: true });
      }

      const application = applications[0];
      const memberType = application.member_type;
      const role = ROLE_MAP[memberType] || memberType;

      // Approve the application
      await base44.asServiceRole.entities.MemberApplication.update(application.id, {
        status: 'approved',
        reviewed_date: new Date().toISOString(),
        admin_notes: 'Auto-approved via Stripe payment',
      });

      // Find the user by email and update their role + onboarding status
      const users = await base44.asServiceRole.entities.User.filter({ email: customerEmail });
      if (users.length > 0) {
        const user = users[0];
        await base44.asServiceRole.entities.User.update(user.id, {
          role: role,
          onboarding_step: 'approved',
        });
        console.log(`User ${customerEmail} approved as ${role}`);
      } else {
        console.log('No user found for email:', customerEmail);
      }
    } catch (err) {
      console.error('Error processing webhook:', err.message);
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  return Response.json({ received: true });
});