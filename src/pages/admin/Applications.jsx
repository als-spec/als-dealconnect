import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { CheckCircle2, XCircle, Clock, Eye } from "lucide-react";
import Icon from "@/components/Icon";
import DotBadge from "@/components/DotBadge";
import { STATUS_DOT_COLORS } from "@/lib/roleStyles";
import GradientButton from "../../components/GradientButton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_LABELS = {
  tc: "Transaction Coordinator",
  investor: "Investor / Agent",
  pml: "Private Money Lender",
};

export default function Applications() {
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState("pending");

  // Real member applications, newest first.
  const { data: apps = [], isLoading: loadingApps } = useQuery({
    queryKey: ['MemberApplication', 'list', { sort: '-created_date' }],
    queryFn: () => base44.entities.MemberApplication.list("-created_date"),
  });

  // Pending users (some may not have a MemberApplication yet — we synthesize).
  // Scoped server-side to members with pending status. Per Onboarding.jsx,
  // member_status: "pending" is set together with onboarding_step: "pending_approval",
  // so this filter catches both conditions the client previously OR'd together.
  const { data: pendingUsersRaw = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['User', { member_status: 'pending' }],
    queryFn: () => base44.entities.User.filter({ member_status: "pending" }),
  });

  // Derive synthetic applications for pending users with no MemberApplication.
  // useMemo keeps this stable across renders as long as the underlying
  // queries haven't updated.
  const applications = useMemo(() => {
    const appUserIds = new Set(apps.map(a => a.user_id).filter(Boolean));
    const pendingUsers = pendingUsersRaw.filter(u => !appUserIds.has(u.id));
    const syntheticApps = pendingUsers.map(u => ({
      id: "user_" + u.id,
      user_id: u.id,
      email: u.email,
      full_name: u.full_name,
      member_type: u.member_type || u.role,
      company_name: u.company_name,
      state: u.state,
      status: "pending",
      _synthetic: true,
    }));
    return [...apps, ...syntheticApps];
  }, [apps, pendingUsersRaw]);

  const loading = loadingApps || loadingUsers;

  // Invalidate both queries after a mutation — applications list, pending users,
  // plus the global User cache in case approval changed a user's role.
  const refreshAfterMutation = () => {
    queryClient.invalidateQueries({ queryKey: ['MemberApplication'] });
    queryClient.invalidateQueries({ queryKey: ['User'] });
  };

  const handleAction = async (appId, action) => {
    setProcessing(true);
    const app = applications.find((a) => a.id === appId);

    // Database updates must succeed before we notify the user
    try {
      if (!app._synthetic) {
        await base44.entities.MemberApplication.update(appId, {
          status: action,
          admin_notes: adminNotes,
          reviewed_date: new Date().toISOString(),
        });
      }

      if (app.user_id) {
        const userUpdate = { member_status: action };
        if (action === "approved") {
          userUpdate.role = app.member_type;
          userUpdate.onboarding_step = "approved";
        }
        await base44.entities.User.update(app.user_id, userUpdate);
      }
    } catch (e) {
      toast.error("Failed to process application. Please try again.");
      setProcessing(false);
      return;
    }

    // Email notification — failure here should not roll back the approval
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
      // Email failure does not undo the approval; surface a warning
      toast.warning(`Application ${action === "approved" ? "approved" : "rejected"} but notification email could not be sent.`);
      setSelectedApp(null);
      setAdminNotes("");
      setProcessing(false);
      refreshAfterMutation();
      return;
    }

    toast.success(`Application ${action === "approved" ? "approved" : "rejected"} successfully`);
    setSelectedApp(null);
    setAdminNotes("");
    setProcessing(false);
    refreshAfterMutation();
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
            <Icon as={Clock} className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
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
                <DotBadge color={STATUS_DOT_COLORS[app.status]} className="capitalize">
                  {app.status}
                </DotBadge>
                {app.nda_accepted && (
                  <Badge variant="outline" className="bg-muted/40 text-foreground border-border/60 text-xs">NDA signed</Badge>
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
                <Icon as={Eye} className="w-4 h-4" /> Review
              </Button>
              {app.status === "pending" && (
                <>
                  <GradientButton
                    className="text-sm px-4 py-2"
                    onClick={() => handleAction(app.id, "approved")}
                  >
                    <Icon as={CheckCircle2} className="w-4 h-4 mr-1.5 inline" /> Approve
                  </GradientButton>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(app.id, "rejected")}
                    className="border-destructive/30 text-destructive hover:bg-destructive/5"
                  >
                    <Icon as={XCircle} className="w-4 h-4 mr-1.5" /> Reject
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