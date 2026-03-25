import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CRITERIA = [
  { label: "Loan Size Range", render: (p) => p.loan_min && p.loan_max ? `${p.loan_min} – ${p.loan_max}` : p.loan_min || p.loan_max || null, gradient: true },
  { label: "Max LTV", key: "max_ltv", suffix: "" },
  { label: "Max ARV Ratio", key: "max_arv", suffix: "" },
  { label: "Interest Rate Range", render: (p) => p.rate_min && p.rate_max ? `${p.rate_min} – ${p.rate_max}` : p.rate_min || p.rate_max || null, suffix: "" },
  { label: "Points / Origination", render: (p) => p.points_min && p.points_max ? `${p.points_min} – ${p.points_max}` : p.points_min || p.points_max || null },
  { label: "Loan Term Range", render: (p) => p.term_min && p.term_max ? `${p.term_min} – ${p.term_max}` : p.term_min || p.term_max || null },
  { label: "Min Credit Score", key: "min_credit_score" },
  { label: "Pre-Payment Penalty", render: (p) => p.prepayment_penalty != null ? (p.prepayment_penalty ? "Yes" : "No") : null, boolean: true },
];

const PROPERTY_TYPES = [
  "SFR",
  "Multi-Family 2–4",
  "Multi-Family 5+",
  "Commercial",
  "Mixed-Use",
  "Land (case by case)",
];

export default function PMLLendingCriteria({ profile }) {
  return (
    <div className="space-y-5">
      {/* Criteria card */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="text-lg font-bold text-navy mb-5">Lending Criteria</h3>
        <div className="divide-y divide-border">
          {CRITERIA.map((c) => {
            const val = c.render ? c.render(profile) : profile?.[c.key];
            if (!val && val !== false && val !== 0) return null;
            const display = String(val);
            const isPenalty = c.label === "Pre-Payment Penalty";
            return (
              <div key={c.label} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <span className="text-sm text-muted-foreground font-medium">{c.label}</span>
                {c.gradient ? (
                  <span className="text-sm font-extrabold gradient-primary-text">{display}</span>
                ) : isPenalty ? (
                  <span className={cn("inline-flex items-center gap-1 text-sm font-bold", val ? "text-destructive" : "text-teal")}>
                    {val ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    {display}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-navy">{display}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Property types */}
      {profile?.property_types?.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-base font-bold text-navy mb-4">Eligible Property Types</h3>
          <div className="space-y-2.5">
            {PROPERTY_TYPES.map((pt) => {
              const eligible = profile.property_types.includes(pt);
              return (
                <div key={pt} className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 border",
                    eligible ? "gradient-primary border-transparent" : "border-border bg-muted"
                  )}>
                    {eligible && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn("text-sm", eligible ? "text-navy font-medium" : "text-muted-foreground line-through")}>{pt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}