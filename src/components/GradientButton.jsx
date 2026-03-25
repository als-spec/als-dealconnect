import { cn } from "@/lib/utils";

export default function GradientButton({ children, className, disabled, ...props }) {
  return (
    <button
      className={cn(
        "gradient-primary text-white font-semibold px-6 py-2.5 rounded-lg",
        "hover:opacity-90 active:opacity-80 transition-all duration-200",
        "shadow-md hover:shadow-lg",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}