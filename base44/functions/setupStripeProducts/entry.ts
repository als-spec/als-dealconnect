import Stripe from "npm:stripe@14.21.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const plans = [
      { name: "TC Basic Plan", description: "Transaction Coordinator membership - ALS DealConnect", amount: 1500, key: "tc_basic" },
      { name: "Investor Plan", description: "Investor membership - ALS DealConnect", amount: 2900, key: "investor" },
      { name: "Private Money Lender Plan", description: "Private Money Lender membership - ALS DealConnect", amount: 2900, key: "pml" },
    ];

    const results = [];

    for (const plan of plans) {
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: { plan_key: plan.key },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.amount,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { plan_key: plan.key },
      });

      results.push({
        plan: plan.name,
        product_id: product.id,
        price_id: price.id,
        amount: `$${plan.amount / 100}/mo`,
      });
    }

    return Response.json({ success: true, products: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});