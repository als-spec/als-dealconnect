import { Check } from "lucide-react";
import GradientButton from "../GradientButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = {
  tc: [
    {
      id: "starter",
      name: "Starter",
      price: "$49",
      period: "/mo",
      features: ["Up to 5 active deals", "Basic profile listing", "Deal Board access", "Email support"],
    },
    {
      id: "professional",
      name: "Professional",
      price: "$99",
      period: "/mo",
      popular: true,
      features: ["Unlimited deals", "Featured profile listing", "Priority Deal Board placement", "Analytics dashboard", "Direct messaging", "Phone support"],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "$199",
      period: "/mo",
      features: ["Everything in Professional", "Custom branding", "API access", "Dedicated account manager", "Team seats", "White-glove onboarding"],
    },
  ],
  investor: [
    {
      id: "starter",
      name: "Starter",
      price: "$39",
      period: "/mo",
      features: ["Browse TC Directory", "Up to 3 deal posts/mo", "Basic search filters", "Email support"],
    },
    {
      id: "professional",
      name: "Professional",
      price: "$79",
      period: "/mo",
      popular: true,
      features: ["Unlimited deal posts", "Advanced TC search & filters", "Direct TC messaging", "PML Directory access", "Investor dashboard", "Priority support"],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "$149",
      period: "/mo",
      features: ["Everything in Professional", "Bulk deal posting", "CRM integration", "Dedicated manager", "Team access", "Custom reports"],
    },
  ],
  pml: [
    {
      id: "starter",
      name: "Starter",
      price: "$59",
      period: "/mo",
      features: ["Basic lending profile", "Receive deal inquiries", "Up to 10 active listings", "Email support"],
    },
    {
      id: "professional",
      name: "Professional",
      price: "$119",
      period: "/mo",
      popular: true,
      features: ["Featured lending profile", "Unlimited listings", "Pipeline dashboard", "Direct messaging", "Deal analytics", "Priority support"],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "$249",
      period: "/mo",
      features: ["Everything in Professional", "Portfolio analytics", "Automated matching", "API integrations", "White-label options", "Dedicated manager"],
    },
  ],
};

export default function PlanSelectionStep({ memberType, selectedPlan, onSelect, onNext, onBack }) {
  const plans = PLANS[memberType] || PLANS.investor;

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-navy">Choose Your Plan</h2>
        <p className="text-slate-text mt-1">Select the membership tier that fits your needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const selected = selectedPlan === plan.id;
          return (
            <div
              key={plan.id}
              onClick={() => onSelect(plan.id)}
              className={cn(
                "relative flex flex-col p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                selected
                  ? "border-teal shadow-lg shadow-teal/10"
                  : "border-border bg-white hover:border-teal/40 hover:shadow-md",
                plan.popular && !selected && "border-cyan/30"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="gradient-primary text-white text-xs font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <h3 className="text-lg font-bold text-navy">{plan.name}</h3>
              <div className="mt-3 mb-5">
                <span className="text-4xl font-extrabold text-navy">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-3 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-text">
                    <Check className="w-4 h-4 text-teal mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {selected ? (
                  <div className="gradient-primary text-white text-center py-2.5 rounded-lg font-semibold text-sm">
                    Selected
                  </div>
                ) : (
                  <div className="border-2 border-border text-navy text-center py-2.5 rounded-lg font-semibold text-sm hover:border-teal/40 transition-colors">
                    Select Plan
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          Back
        </Button>
        <GradientButton onClick={onNext} disabled={!selectedPlan} className="px-10">
          Continue to NDA
        </GradientButton>
      </div>
    </div>
  );
}