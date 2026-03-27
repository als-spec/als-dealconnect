import { Clock, Mail, Phone } from "lucide-react";

const TYPE_LABELS = {
  tc: "Transaction Coordinator",
  investor: "Investor / Agent",
  pml: "Private Money Lender",
};

const TYPE_LABELS = {
  tc: "Transaction Coordinator",
  investor: "Investor / Agent",
  pml: "Private Money Lender",
};



export default function PendingApprovalStep({ memberType, selectedPlan }) {
  return (
    <div className="text-center space-y-8 py-8">
      {/* Teal gradient status badge */}
      <div className="inline-flex items-center gap-2 gradient-primary text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg shadow-teal/20">
        <Clock className="w-4 h-4" />
        Application Pending Review
      </div>

      <div>
        <h2 className="text-2xl font-bold text-navy">You're Almost In!</h2>
        <p className="text-slate-text mt-2 max-w-md mx-auto">
          Your application has been submitted successfully. Our team reviews all applications
          within <span className="font-semibold text-navy">1–2 business days</span>.
          You'll receive an email once a decision has been made.
        </p>
      </div>

      <div className="bg-white rounded-2xl border-t-2 border-t-teal border border-border p-6 max-w-sm mx-auto space-y-4 text-left shadow-sm">
        <h3 className="font-bold text-navy text-sm uppercase tracking-wider text-center">Application Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Member Type</span>
            <span className="text-sm font-semibold text-navy">{TYPE_LABELS[memberType] || memberType || "—"}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Selected Plan</span>
            <span className="text-sm font-semibold text-navy">{selectedPlan || "—"}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">NDA</span>
            <span className="text-sm font-semibold text-emerald-600">✓ Signed</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Non-Compete</span>
            <span className="text-sm font-semibold text-emerald-600">✓ Signed</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Review Timeline</span>
            <span className="text-sm font-semibold text-navy">1–2 Business Days</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" />
          <span>Email notification sent upon decision</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Phone className="w-4 h-4" />
          <span>Support: <a href="mailto:support@alsdealconnect.com" className="text-teal font-semibold hover:underline">support@alsdealconnect.com</a></span>
        </div>
      </div>
    </div>
  );
}