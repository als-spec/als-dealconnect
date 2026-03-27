import { useState } from "react";
import { Check, CreditCard, Loader2 } from "lucide-react";
import GradientButton from "../GradientButton";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const PLANS = {
  tc: {
    name: "TC Basic Plan",
    price: "$15",
    priceId: "price_1TFKRbBBAWoOZVYC1HY2RQ7i",
    features: [
      "Full Deal Board access",
      "Service request management",
      "TC profile listing in directory",
      "Direct messaging with investors",
      "Analytics dashboard",
      "Priority support",
    ],
  },
  investor: {
    name: "Investor Plan",
    price: "$29",
    priceId: "price_1TFKRcBBAWoOZVYCzDIdMCVO",
    features: [
      "Unlimited deal posts",
      "TC Directory access",
      "PML Directory access",
      "Direct messaging",
      "Investor dashboard & analytics",
      "Deal match notifications",
    ],
  },
  pml: {
    name: "Private Money Lender Plan",
    price: "$29",
    priceId: "price_1TFKRcBBAWoOZVYCxOzErcSG",
    features: [
      "Featured PML profile listing",
      "Unlimited deal inquiries",
      "Pipeline dashboard",
      "Direct messaging",
      "Deal analytics",
      "Priority support",
    ],
  },
};

export default function PlanSelectionStep({ memberType, onBack, paymentError }) {
  const [loading, setLoading] = useState(false);
  const plan = PLANS[memberType] || PLANS.investor;

  const handleCheckout = async () => {
    setLoading(true);
    const origin = window.location.origin;
    const response = await base44.functions.invoke("createCheckoutSession", {
      priceId: plan.priceId,
      successUrl: `${origin}/onboarding?payment=success`,
      cancelUrl: `${origin}/onboarding?payment=cancel`,
      memberType,
      planName: plan.name,
    });
    window.location.href = response.data.url;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-navy">Your Membership Plan</h2>
        <p className="text-slate-text mt-1">Secure checkout powered by Stripe</p>
      </div>

      {paymentError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 text-sm font-medium">
          {paymentError}
        </div>
      )}

      <div className="max-w-md mx-auto">
        <div className="relative flex flex-col p-8 rounded-2xl border-2 border-teal shadow-lg shadow-teal/10 bg-white">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="gradient-primary text-white text-xs font-bold px-4 py-1 rounded-full">
              Your Plan
            </span>
          </div>

          <h3 className="text-xl font-bold text-navy">{plan.name}</h3>
          <div className="mt-3 mb-6 flex items-end gap-1">
            <span className="text-5xl font-extrabold text-navy">{plan.price}</span>
            <span className="text-muted-foreground text-base mb-1">/month</span>
          </div>

          <ul className="space-y-3 flex-1 mb-8">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-text">
                <Check className="w-4 h-4 text-teal mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <GradientButton
            onClick={handleCheckout}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 text-base"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Stripe...</>
            ) : (
              <><CreditCard className="w-4 h-4" /> Pay & Continue</>
            )}
          </GradientButton>

          <p className="text-xs text-muted-foreground text-center mt-3">
            Cancel anytime. Billed monthly. Secure payment via Stripe.
          </p>
        </div>
      </div>

      <div className="flex justify-start pt-2">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          Back
        </Button>
      </div>
    </div>
  );
}