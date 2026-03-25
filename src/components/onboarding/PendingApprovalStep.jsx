import { Clock, CheckCircle2, Mail } from "lucide-react";
import Logo from "../Logo";

const TYPE_LABELS = {
  tc: "Transaction Coordinator",
  investor: "Investor / Agent",
  pml: "Private Money Lender",
};

const PLAN_LABELS = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export default function PendingApprovalStep({ memberType, selectedPlan }) {
  return (
    <div className="text-center space-y-8 py-8">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200">
        <Clock className="w-10 h-10 text-amber-500" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-navy">Application Under Review</h2>
        <p className="text-slate-text mt-2 max-w-md mx-auto">
          Thank you for applying to ALS DealConnect. Your application is being reviewed by our team. 
          You'll receive an email notification once a decision has been made.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 max-w-sm mx-auto space-y-4">
        <h3 className="font-bold text-navy text-sm uppercase tracking-wider">Application Summary</h3>
        <div className="space-y-3 text-left">
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Member Type</span>
            <span className="text-sm font-semibold text-navy">{TYPE_LABELS[memberType] || memberType}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Selected Plan</span>
            <span className="text-sm font-semibold text-navy">{PLAN_LABELS[selectedPlan] || selectedPlan}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              Pending Review
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Mail className="w-4 h-4" />
        <span>We'll notify you via email when your application is reviewed</span>
      </div>
    </div>
  );
}