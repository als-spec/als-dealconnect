import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, Eye, Building2, Phone, MapPin } from "lucide-react";
import GradientButton from "../../components/GradientButton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_LABELS = {
  tc: "Transaction Coordinator",
  investor: "Investor / Agent",
  pml: "Private Money Lender",
};

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    const apps = await base44.entities.MemberApplication.list("-created_date");
    setApplications(apps);
    setLoading(false);
  };

  const handleAction = async (appId, action) => {
    setProcessing(true);
    const app = applications.find((a) => a.id === appId);

    await base44.entities.MemberApplication.update(appId, {
      status: action,
      admin_notes: adminNotes,
      reviewed_date: new Date().toISOString(),
    });

    if (app.user_id) {
      const userUpdate = { member_status: action };
      if (action === "approved") {
        userUpdate.role = app.member_type;
        userUpdate.onboarding_step = "approved";
      }
      await base44.entities.User.update(app.user_id, userUpdate);
    }

    // Send email notification
    try {
      if (action === "approved") {
        await base44.integrations.Core.SendEmail({
          to: app.email,
          subject: "Welcome to ALS DealConnect — Your Application is Approved!",
          body: `Hi ${app.full_name},\n\nGreat news! Your application to join ALS DealConnect as a ${TYPE_LABELS[app.member_type]} has been approved. You can now log in and access the platform.\n\nWelcome aboard!\n\nThe ALS DealConnect Team`,
        });
      } else {
        await base44.integrations.Core.SendEmail({
          to: app.email,
          subject: "ALS DealConnect — Application Update",
          body: `Hi ${app.full_name},\n\nThank you for applying to ALS DealConnect. After reviewing your application, we are unable to approve your membership at this time.${adminNotes ? `\n\nNote from our team: ${adminNotes}` : ""}\n\nIf you have questions, please reach out to our support team.\n\nThe ALS DealConnect Team`,
        });
      }
    } catch (e) {
      // Email failure should not block the action
    }

    toast.success(`Application ${action === "approved" ? "approved" : "rejected"} successfully`);
    setSelectedApp(null);
    setAdminNotes("");
    setProcessing(false);
    loadApplications();
  };

  const filtered = applications.filter((a) => filter === "all" || a.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-navy">Member Applications</h1>
        <p className="text-muted-foreground mt-1">Review and manage membership applications</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["pending", "approved", "rejected", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all",
              filter === f
                ? "gradient-primary text-white shadow-md"
                : "bg-card border border-border text-muted-foreground hover:border-teal/40"
            )}
          >
            {f} {f !== "all" && `(${applications.filter((a) => a.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Applications list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No {filter === "all" ? "" : filter} applications found</p>
          </div>
        )}
        {filtered.map((app) => (
          <div
            key={app.id}
            className="bg-card rounded-2xl border border-border p-5 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h3 className="text-base font-bold text-navy">{app.full_name}</h3>
                <span className="text-sm text-muted-foreground">{app.email}</span>
                <Badge variant="outline" className={cn("text-xs", STATUS_STYLES[app.status])}>
                  {app.status}
                </Badge>
                {app.nda_accepted && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">NDA ✓</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="font-medium text-navy">{TYPE_LABELS[app.member_type]}</span>
                <span>Plan: <span className="capitalize font-medium">{app.selected_plan || "—"}</span></span>
                <span>Applied: {app.created_date ? new Date(app.created_date).toLocaleDateString() : "—"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectedApp(app); setAdminNotes(app.admin_notes || ""); }}
                className="gap-1.5"
              >
                <Eye className="w-4 h-4" /> Review
              </Button>
              {app.status === "pending" && (
                <>
                  <GradientButton
                    className="text-sm px-4 py-2"
                    onClick={() => handleAction(app.id, "approved")}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5 inline" /> Approve
                  </GradientButton>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(app.id, "rejected")}
                    className="border-destructive/30 text-destructive hover:bg-destructive/5"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-navy">Application Review</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-semibold text-navy">{selectedApp.full_name}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-semibold text-navy">{selectedApp.email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-semibold text-navy">{selectedApp.phone}</span></div>
                <div><span className="text-muted-foreground">Company:</span> <span className="font-semibold text-navy">{selectedApp.company_name}</span></div>
                <div><span className="text-muted-foreground">State:</span> <span className="font-semibold text-navy">{selectedApp.state}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-semibold text-navy">{TYPE_LABELS[selectedApp.member_type]}</span></div>
                <div><span className="text-muted-foreground">Plan:</span> <span className="font-semibold text-navy capitalize">{selectedApp.selected_plan}</span></div>
                <div><span className="text-muted-foreground">NDA:</span> <span className="font-semibold text-navy">{selectedApp.nda_accepted ? `Accepted ${selectedApp.nda_accepted_date ? new Date(selectedApp.nda_accepted_date).toLocaleString() : ""}` : "Not Accepted"}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">NDA Signer:</span> <span className="font-semibold text-navy">{selectedApp.nda_signer_name || "—"}</span></div>
                <div><span className="text-muted-foreground">Non-Compete:</span> <span className="font-semibold text-navy">{selectedApp.non_compete_accepted ? `Accepted ${selectedApp.non_compete_accepted_date ? new Date(selectedApp.non_compete_accepted_date).toLocaleString() : ""}` : "Not Accepted"}</span></div>
                <div><span className="text-muted-foreground">NC Signer:</span> <span className="font-semibold text-navy">{selectedApp.non_compete_signer_name || "—"}</span></div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-navy">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this application..."
                  rows={3}
                />
              </div>

              {selectedApp.status === "pending" && (
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleAction(selectedApp.id, "rejected")}
                    disabled={processing}
                    className="border-destructive/30 text-destructive hover:bg-destructive/5"
                  >
                    Reject
                  </Button>
                  <GradientButton
                    onClick={() => handleAction(selectedApp.id, "approved")}
                    disabled={processing}
                  >
                    {processing ? "Processing..." : "Approve Application"}
                  </GradientButton>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}