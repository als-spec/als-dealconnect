import React from "react";
import { cn } from "@/lib/utils";

/**
 * Compact badge with a neutral surface and a small colored dot.
 *
 * Replaces the previous pattern of full-color role/status pills
 * (bg-purple-50 text-purple-700, bg-emerald-50 text-emerald-700, etc.)
 * with a quieter visual language that stays inside the brand palette.
 *
 * Semantic meaning is carried by the dot color (from ROLE_DOT_COLORS or
 * STATUS_DOT_COLORS) and the label text. The badge surface stays neutral
 * in every instance — role/status distinction doesn't visually shout.
 *
 * Usage:
 *
 *   import DotBadge from "@/components/DotBadge";
 *   import { ROLE_DOT_COLORS } from "@/lib/roleStyles";
 *
 *   <DotBadge color={ROLE_DOT_COLORS[user.role]}>
 *     {ROLE_LABELS[user.role]}
 *   </DotBadge>
 *
 * Props:
 *   color     — hex string for the dot. Pull from the color maps in
 *                src/lib/roleStyles.js rather than hardcoding.
 *   children  — the label text
 *   className — extra classes applied to the outer span
 */
export default function DotBadge({ color, children, className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "text-xs font-medium",
        "bg-muted/40 text-foreground border border-border/60",
        "whitespace-nowrap",
        className
      )}
      {...props}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
