import Stripe from "npm:stripe@14.21.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await req.json();
    if (!sessionId) return Response.json({ error: "Missing sessionId" }, { status: 400 });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status !== "complete" && session.payment_status !== "paid") {
      return Response.json({ success: false, status: session.status });
    }

    // Store stripe IDs and advance onboarding
    await base44.auth.updateMe({
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      onboarding_step: "nda",
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});