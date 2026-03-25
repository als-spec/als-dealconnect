import { cn } from "@/lib/utils";

export default function TagPill({ label, variant = "teal", onRemove }) {
  const variants = {
    teal: "bg-teal/10 text-teal border-teal/20 hover:bg-teal/15",
    cyan: "bg-cyan/10 text-cyan border-cyan/20 hover:bg-cyan/15",
    navy: "bg-navy/8 text-navy border-navy/15",
    muted: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors",
        variants[variant] || variants.teal
      )}
    >
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-1 hover:opacity-70 transition-opacity text-base leading-none">×</button>
      )}
    </span>
  );
}