import { cn } from "@/lib/utils";
import GradientButton from "../GradientButton";
import { ArrowRight } from "lucide-react";

const MEMBER_TYPES = [
  {
    value: "tc",
    label: "Transaction Coordinator",
    icon: "📋",
    description:
      "Professional profile with specialties, certifications, and service rates. Visible on the TC Deal Board and directory.",
    tags: ["Creative Finance", "Fix & Flip", "DSCR", "Subject-To"],
  },
  {
    value: "investor",
    label: "Investor / Agent",
    icon: "🏗️",
    description:
      "Post deal coordination requests, browse TC profiles, and track service requests from your dashboard.",
    tags: ["Deal Flow", "TC Matching", "Private Lending", "Closings"],
  },
  {
    value: "pml",
    label: "Private Money Lender",
    icon: "💼",
    description:
      "Dedicated lending profile, searchable by investors. Manage your deal inquiry inbox and grow your portfolio.",
    tags: ["Bridge Loans", "Fix & Flip", "DSCR", "Ground-Up"],
  },
];

export default function MemberTypeStep({ selected, onSelect, onNext }) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-extrabold text-navy">How will you use ALS DealConnect?</h2>
        <p className="text-slate-text mt-1 text-sm">Choose your role to get started — this determines your plan and features.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {MEMBER_TYPES.map((type) => {
          const isSelected = selected === type.value;
          return (
            <button
              key={type.value}
              onClick={() => onSelect(type.value)}
              className={cn(
                "w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 bg-white hover:shadow-md",
                isSelected
                  ? "border-teal shadow-lg shadow-teal/10"
                  : "border-border hover:border-teal/40"
              )}
            >
              <div className="flex items-start gap-4">
                {/* Teal gradient border on icon when selected */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-all",
                    isSelected ? "gradient-primary" : "bg-muted"
                  )}
                >
                  {type.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-navy">{type.label}</h3>
                    {isSelected && (
                      <span className="gradient-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-text mt-1 leading-relaxed">{type.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {type.tags.map((t) => (
                      <span
                        key={t}
                        className={cn(
                          "text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-colors",
                          isSelected
                            ? "bg-teal/10 text-teal border-teal/20"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <GradientButton
          onClick={onNext}
          disabled={!selected}
          className="flex items-center gap-2 px-8"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </GradientButton>
      </div>
    </div>
  );
}