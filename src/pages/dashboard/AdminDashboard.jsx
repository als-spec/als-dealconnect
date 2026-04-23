import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Users, ClipboardList, MessageSquare, CheckCircle2, XCircle, Building2, MapPin, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GradientButton from "../../components/GradientButton";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const TYPE_LABELS = { tc: "Transaction Coordinator", investor: "Investor / Agent", pml: "Private Money Lender" };
const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};
const PIE_COLORS = ["hsl(168 100% 45%)", "hsl(196 100% 50%)", "hsl(215 55% 15%)", "hsl(213 30% 42%)"];

export default function AdminDashboard({ user }) {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(null);

  // Five parallel queries. Each has its own cache entry shared with other
  // admin pages (Applications, Members, Partners).
  const { data: apps = [], isLoading: loadingApps } = useQuery({
    queryKey: ['MemberApplication', 'list', { sort: '-created_date' }],
    queryFn: () => base44.entities.MemberApplication.list('-created_date'),
  });

  // Admin dashboard needs the full user table for role breakdown charts
  // and total member counts. At scale (>~500 members) this should move
  // to a server-side stats aggregation — tracked as T3.4.
  // Admin dashboard needs the full user table for role breakdown charts,
  // total member counts, and pending-user synthetic-app derivation. This
  // is aggregation data, not a paginated list — pagination wouldn't help
  // because we need every row to compute the stats correctly.
  //
  // The proper fix is a server-side stats endpoint that returns just the
  // aggregates (counts by role, pending-user list, etc.) instead of the
  // full user records. That requires a custom Base44 function and is
  // tracked as a follow-up to T3.4 (T3.4 proper covered admin/Members.jsx
  // pagination, which was a genuine list-scrolling problem).
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['User', 'list'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: deals = [], isLoading: loadingDeals } = useQuery({
    queryKey: ['Deal', 'list'],
    queryFn: () => base44.entities.Deal.list(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['MessageThread', 'list'],
    queryFn: () => base44.entities.MessageThread.list(),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['Review', 'list', { sort: '-created_date', limit: 20 }],
    queryFn: () => base44.entities.Review.list('-created_date', 20),
  });

  // Derive synthetic entries for pending users with no MemberApplication.
  // Pure function of (apps, users) — only re-runs when either underlying
  // query updates.
  const applications = useMemo(() => {
    const appUserIds = new Set(apps.map(a => a.user_id).filter(Boolean));
    const pendingUsers = users.filter(
      u => (u.onboarding_step === "pending_approval" || u.member_status === "pending") && !appUserIds.has(u.id)
    );
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
  }, [apps, users]);

  // Members for role breakdown (excludes admins and pending users).
  const members = useMemo(
    () => users.filter(u => u.role && u.role !== "admin" && u.role !== "pending"),
    [users]
  );

  const loading = loadingApps || loadingUsers || loadingDeals;

  // Invalidate both MemberApplication and User after approve/reject —
  // approval changes a user's role, so other admin views reading the User
  // cache must refresh.
  const refreshAfterMutation = () => {
    queryClient.invalidateQueries({ queryKey: ['MemberApplication'] });
    queryClient.invalidateQueries({ queryKey: ['User'] });
  };

  const handleAction = async (appId, action) => {
    setProcessing(appId + action);
    const app = applications.find(a => a.id === appId);
    if (!app._synthetic) {
      await base44.entities.MemberApplication.update(appId, {
        status: action,
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
          body: `Hi ${app.full_name},\n\nThank you for applying to ALS DealConnect. After reviewing your application, we are unable to approve your membership at this time.\n\nThe ALS DealConnect Team`,
        });
      }
    } catch (e) {}
    toast.success(`Application ${action}`);
    setProcessing(null);
    refreshAfterMutation();
  };

  const pending = applications.filter(a => a.status === "pending");

  const membersByRole = [
    { name: "TCs", value: members.filter(m => m.role === "tc").length },
    { name: "Investors", value: members.filter(m => m.role === "investor").length },
    { name: "PMLs", value: members.filter(m => m.role === "pml").length },
  ].filter(d => d.value > 0);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-navy">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform-wide overview and management tools.</p>
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Total Members", value: members.length },
          { icon: ClipboardList, label: "Pending Approvals", value: pending.length },
          { icon: BarChart3, label: "Active Deals", value: deals.filter(d => d.status === "open").length },
          { icon: MessageSquare, label: "Message Threads", value: messages.length },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-card rounded-2xl border-t-2 border-t-teal border border-border p-5">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center mb-4">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-extrabold text-navy">{value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approval queue */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-navy text-lg flex items-center gap-2">
              Approval Queue
              {pending.length > 0 && (
                <span className="gradient-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
              )}
            </h2>
            <Link to="/admin/applications" className="text-sm text-teal font-semibold hover:underline">View all</Link>
          </div>
          {pending.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-10 h-10 text-teal/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All caught up! No pending applications.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.slice(0, 5).map(app => (
                <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-navy truncate">{app.full_name}</p>
                      <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full capitalize">{TYPE_LABELS[app.member_type]?.split(" ")[0]}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {app.company_name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{app.company_name}</span>}
                      {app.state && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.state}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <GradientButton
                      className="text-xs px-3 py-1.5"
                      onClick={() => handleAction(app.id, "approved")}
                      disabled={!!processing}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Approve
                    </GradientButton>
                    <Button variant="outline" size="sm" className="text-xs border-destructive/30 text-destructive hover:bg-destructive/5 h-7 px-3"
                      onClick={() => handleAction(app.id, "rejected")} disabled={!!processing}>
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members by role chart */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold text-navy text-lg mb-4">Members by Role</h2>
          {membersByRole.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No members yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={membersByRole} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {membersByRole.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 space-y-2">
            {[
              { label: "TCs", count: members.filter(m => m.role === "tc").length },
              { label: "Investors", count: members.filter(m => m.role === "investor").length },
              { label: "PMLs", count: members.filter(m => m.role === "pml").length },
            ].map(({ label, count }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-bold text-navy">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent reviews */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-bold text-navy text-lg mb-4">Recent Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="text-left pb-3 font-semibold">Reviewer</th>
                  <th className="text-left pb-3 font-semibold">Rating</th>
                  <th className="text-left pb-3 font-semibold">Deal Type</th>
                  <th className="text-left pb-3 font-semibold">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map(r => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 font-medium text-navy">{r.reviewer_name || "Anonymous"}</td>
                    <td className="py-3">
                      <span className="font-bold text-amber-500">{r.rating}★</span>
                    </td>
                    <td className="py-3 text-muted-foreground">{r.deal_type || "—"}</td>
                    <td className="py-3 text-muted-foreground max-w-xs truncate">{r.body || r.title || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}