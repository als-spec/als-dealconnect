import { cn } from "@/lib/utils";
import { STAGES } from "@/lib/serviceRequestUtils";

/**
 * Horizontal stage indicator for a ServiceRequest's status lifecycle.
 * Renders: Requested → Accepted → In Progress → Completed
 *
 * Props:
 *   status - current status key (one of STAGES keys)
 */
export default function ProgressStepper({ status }) {
  const currentIdx = STAGES.findIndex(s => s.key === status);
  return (
    <div className="flex items-center w-full py-4">
      {STAGES.map((stage, i) => {
        const Icon = stage.icon;
        const done = i <= currentIdx;
        const current = i === currentIdx;
        return (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all",
                done
                  ? "border-transparent text-white"
                  : "border-border text-muted-foreground bg-background"
              )}
                style={done ? { background: "linear-gradient(135deg, hsl(168 100% 45%), hsl(196 100% 50%))" } : {}}
              >
                <Icon className={cn("w-4 h-4", current && !done && "animate-spin")} />
              </div>
              <span className={cn(
                "text-xs mt-1 font-medium whitespace-nowrap",
                done ? "text-teal" : "text-muted-foreground"
              )}>
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 rounded-full"
                style={i < currentIdx
                  ? { background: "linear-gradient(90deg, hsl(168 100% 45%), hsl(196 100% 50%))" }
                  : { background: "hsl(var(--border))" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
