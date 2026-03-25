import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StarRating({ rating = 0, size = "sm", showValue = false }) {
  const sizes = { sm: "w-3.5 h-3.5", md: "w-5 h-5", lg: "w-6 h-6" };
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            sizes[size],
            i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          )}
        />
      ))}
      {showValue && (
        <span className="ml-1 text-sm font-bold text-navy">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}