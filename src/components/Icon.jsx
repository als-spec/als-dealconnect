import React from "react";
import { cn } from "@/lib/utils";

/**
 * Icon wrapper around lucide-react icons.
 *
 * Gives every icon in the app a consistent, lighter stroke weight (1.5px vs
 * lucide's 2px default). Matches the Apple SF Symbols aesthetic and keeps
 * icons feeling quiet rather than shouty. Any rare place that needs heavier
 * strokes can still override via strokeWidth prop.
 *
 * Usage:
 *
 *   import { Users } from "lucide-react";
 *   import Icon from "@/components/Icon";
 *
 *   <Icon as={Users} className="w-5 h-5 text-navy" />
 *
 * Why wrap rather than configure lucide globally:
 *   - lucide-react doesn't support a global default via import; each
 *     component has its own default props baked in.
 *   - An Icon wrapper lets us centralize other conventions later (sizing
 *     scale, aria-label handling) without touching every call site.
 *
 * Size conventions — prefer these explicit sizes:
 *   - sidebar / inline text:     w-4 h-4 (16px)
 *   - buttons / form controls:   w-4 h-4 (16px)
 *   - card headers / stat cards: w-5 h-5 (20px) or w-6 h-6 (24px)
 *   - hero / empty state:        w-8 h-8 (32px) or larger
 *
 * Non-goal: this component is NOT a substitute for lucide-react imports.
 * Keep importing the specific icon you need; pass it as the `as` prop.
 */
export default function Icon({ as: LucideIcon, strokeWidth = 1.5, className, ...props }) {
  if (!LucideIcon) return null;
  return (
    <LucideIcon
      strokeWidth={strokeWidth}
      className={cn(className)}
      {...props}
    />
  );
}
