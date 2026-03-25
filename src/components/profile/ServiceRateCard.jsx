import { DollarSign } from "lucide-react";

const RATE_FIELDS = [
  { key: "rate_residential", label: "Residential", description: "Standard residential transactions" },
  { key: "rate_creative_finance", label: "Creative Finance", description: "Subject-To, Seller Finance, Wrap" },
  { key: "rate_commercial", label: "Commercial", description: "Commercial & multi-family deals" },
  { key: "rate_rush", label: "Rush / Expedited", description: "Fast-track closing required" },
];

export default function ServiceRateCard({ profile }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg font-bold text-navy">Service Rates</h3>
      </div>
      <div className="divide-y divide-border">
        {RATE_FIELDS.map((f) => {
          const rate = profile?.[f.key];
          return (
            <div key={f.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-semibold text-navy">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              {rate ? (
                <span className="text-base font-extrabold gradient-primary-text">{rate}</span>
              ) : (
                <span className="text-sm text-muted-foreground italic">Contact for rate</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}