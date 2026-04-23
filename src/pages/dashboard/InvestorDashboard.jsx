import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ClipboardList, Users, FileText, DollarSign, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

function MetricCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-card rounded-2xl border-t-2 border-t-teal border border-border p-5 hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-extrabold text-navy">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-teal font-medium mt-1">{sub}</p>}
    </div>
  );
}

const STAGE_COLORS = {
  "Under Contract": "bg-amber-50 text-amber-600",
  "Pre-Close": "bg-cyan/10 text-cyan",
  "Closing Soon": "bg-teal/10 text-teal",
};

const SR_COLORS = {
  requested: "bg-amber-50 text-amber-600",
  accepted: "bg-teal/10 text-teal",
  in_progress: "bg-cyan/10 text-cyan",
  completed: "bg-green-50 text-green-600",
};

export default function InvestorDashboard({ user }) {
  // This investor's deals.
  const { data: deals = [], isLoading: loadingDeals } = useQuery({
    queryKey: ['Deal', { investor_id: user?.id }],
    queryFn: () => base44.entities.Deal.filter({ investor_id: user.id }),
    enabled: !!user?.id,
  });

  // Service requests this investor is party to.
  const { data: serviceRequests = [], isLoading: loadingReqs } = useQuery({
    queryKey: ['ServiceRequest', { investor_id: user?.id }],
    queryFn: () => base44.entities.ServiceRequest.filter({ investor_id: user.id }),
    enabled: !!user?.id,
  });

  // All deal applications (filtered client-side to applicants for this investor's deals).
  const { data: applications = [] } = useQuery({
    queryKey: ['DealApplication', 'list', { sort: '-created_date', limit: 200 }],
    queryFn: () => base44.entities.DealApplication.list('-created_date', 200),
    enabled: !!user?.id,
  });

  // Message threads — filtered client-side by participant.
  const { data: allThreads = [], isLoading: loadingThreads } = useQuery({
    queryKey: ['MessageThread', 'list', { sort: '-last_message_at', limit: 50 }],
    queryFn: () => base44.entities.MessageThread.list('-last_message_at', 50),
    enabled: !!user?.id,
  });

  const threads = useMemo(
    () => (user?.id ? allThreads.filter(t => t.participants?.includes(user.id)) : []),
    [allThreads, user?.id]
  );

  const loading = loadingDeals || loadingReqs || loadingThreads;

  const activeDeals = deals.filter(d => d.status === "open" || d.status === "in_review");
  const tcConnections = [...new Set(serviceRequests.map(r => r.tc_id))].length;
  const openRequests = serviceRequests.filter(r => r.status !== "completed").length;
  const unreadThreads = threads.filter(t => t.unread_by?.includes(user.id));

  const dealApplicantCounts = {};
  applications.forEach(a => {
    dealApplicantCounts[a.deal_id] = (dealApplicantCounts[a.deal_id] || 0) + 1;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-navy">Welcome back, {user.full_name?.split(" ")[0]}</h1>
        <p className="text-muted-foreground mt-1">Here's your deal activity overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={ClipboardList} label="Active Deals" value={activeDeals.length} />
        <MetricCard icon={Users} label="TCs Connected" value={tcConnections} />
        <MetricCard icon={FileText} label="Open Requests" value={openRequests} />
        <MetricCard icon={DollarSign} label="Total Spend" value="—" sub="Coming soon" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active deals with stage */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-navy text-lg">Active Deals</h2>
            <Link to="/deal-board" className="text-sm text-teal font-semibold flex items-center gap-1 hover:underline">
              Deal Board <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {activeDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No active deals</p>
          ) : (
            <div className="space-y-3">
              {activeDeals.slice(0, 5).map(deal => (
                <div key={deal.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">{deal.title}</p>
                    <p className="text-xs text-muted-foreground">{deal.property_type} · {deal.market || deal.state}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STAGE_COLORS[deal.deal_stage] || "bg-muted text-muted-foreground")}>
                      {deal.deal_stage || "Under Contract"}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">{dealApplicantCounts[deal.id] || 0} applicants</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Service Requests */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-navy text-lg">Service Requests</h2>
            <Link to="/service-requests" className="text-sm text-teal font-semibold flex items-center gap-1 hover:underline">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {serviceRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No service requests yet</p>
          ) : (
            <div className="space-y-3">
              {serviceRequests.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">{req.deal_title}</p>
                    <p className="text-xs text-muted-foreground">TC: {req.tc_name}</p>
                  </div>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full capitalize", SR_COLORS[req.status])}>
                    {req.status?.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message threads */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-navy text-lg">Recent Messages</h2>
          <Link to="/messages" className="text-sm text-teal font-semibold flex items-center gap-1 hover:underline">
            View all <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {threads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No messages yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {threads.slice(0, 4).map(t => {
              const isUnread = t.unread_by?.includes(user.id);
              const otherIdx = t.participants?.indexOf(user.id) === 0 ? 1 : 0;
              const otherName = t.participant_names?.[otherIdx] || "Unknown";
              return (
                <Link key={t.id} to="/messages" className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-colors hover:border-teal/40",
                  isUnread ? "border-teal/30 bg-teal/5" : "border-border bg-muted/20"
                )}>
                  <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {otherName[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm truncate", isUnread ? "font-bold text-navy" : "font-medium text-navy")}>{otherName}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.last_message || t.subject}</p>
                  </div>
                  {isUnread && <span className="w-2 h-2 rounded-full bg-teal flex-shrink-0" />}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}