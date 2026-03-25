import { Construction } from "lucide-react";

export default function ComingSoon({ title = "Coming Soon" }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-5">
        <Construction className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-2xl font-extrabold text-navy mb-2">{title}</h1>
      <p className="text-muted-foreground max-w-sm">
        This feature is under development and will be available soon. Check back later!
      </p>
    </div>
  );
}