import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { key: "registration", label: "Profile" },
  { key: "plan_selection", label: "Plan" },
  { key: "nda", label: "NDA" },
  { key: "pending_approval", label: "Review" },
];

export default function OnboardingProgress({ currentStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-1 mb-10">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                  isComplete && "gradient-primary text-white",
                  isCurrent && "gradient-primary text-white shadow-lg shadow-teal/30 scale-110",
                  !isComplete && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs mt-1.5 font-medium transition-colors",
                  isCurrent ? "text-navy" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-12 md:w-20 h-0.5 mx-2 mb-5 transition-colors",
                  i < currentIndex ? "bg-teal" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}