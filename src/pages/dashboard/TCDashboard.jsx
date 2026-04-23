import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ClipboardList, CheckCircle2, Star, Eye, ArrowUpRight, MessageSquare, Award } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import StarRating from "../../components/StarRating";

function MetricCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-card rounded-2xl border-t-2 border-t-teal border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-extrabold text-navy">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-teal font-medium mt-1">{sub}</p>}
      </div>
    </div>
  );
}

const STATUS_COLORS = {
  requested: "bg-amber-50 text-amber-600",
  accepted: "bg-teal/10 text-teal",
  in_progress: "bg-cyan/10 text-cyan",
  completed: "bg-green-50 text-green-600",
};

const earningsData = [
  { month: "Oct", value: 0 }, { month: "Nov", value: 0 }, { month: "Dec", value: 0 },
  { month: "Jan", value: 0 }, { month: "Feb", value: 0 }, { month: "Mar", value: 0 },
];

export default function TCDashboard({ user }) {
  // Service requests this TC is party to.
  const { data: serviceRequests = [], isLoading: loadingReqs } = useQuery({
    queryKey: ['ServiceRequest', { tc_id: user?.id }],
    queryFn: () => base44.entities.ServiceRequest.filter({ tc_id: user.id }),
    enabled: !!user?.id,
  });

  // This TC's own profile. Needed for reviews query to cascade.
  const { data: profiles = [], isLoading: loadingProfile } = useQuery({
    queryKey: ['TCProfile', { user_id: user?.id }],
    queryFn: () => base44.entities.TCProfile.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });
  const profile = profiles[0] || null;

  // Reviews — depends on profile.id.
  const { data: reviews = [] } = useQuery({
    queryKey: ['Review', { tc_profile_id: profile?.id }],
    queryFn: () => base44.entities.Review.filter({ tc_profile_id: profile.id }),
    enabled: !!profile?.id,
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

  const loading = loadingReqs || loadingProfile || loadingThreads;

  const activeRequests = serviceRequests.filter(r => r.status !== "completed");
  const completedDeals = serviceRequests.filter(r => r.status === "completed").length;
  const avgRating = profile?.average_rating || 0;
  const unreadThreads = threads.filter(t => t.unread_by?.includes(user.id));

  // Activity feed: recent messages + reviews combined
  const activityFeed = [
    ...unreadThreads.map(t => ({ type: "message", label: `New message in "${t.subject}"`, time: t.last_message_at, path: "/messages" })),
    ...reviews.slice(0, 3).map(r => ({ type: "review", label: `${r.reviewer_name} left a ${r.rating}★ review`, time: r.created_date, path: "/profile" })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" /></div>;
  }

  const credScore = Math.min(100, Math.round((avgRating / 5) * 60 + (completedDeals * 4) + (profile?.review_count || 0) * 2));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-navy">Welcome back, {user.full_name?.split(" ")[0]}</h1>
          <p className="text-muted-foreground mt-1">Here's your TC overview for today.</p>
        </div>
        {credScore > 0 && (
          <div className="flex items-center gap-2 gradient-primary px-4 py-2 rounded-xl shadow-md">
            <Award className="w-4 h-4 text-white" />
            <span className="text-white font-bold text-sm">Credibility Score: {credScore}</span>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={ClipboardList} label="Active Requests" value={activeRequests.length} />
        <MetricCard icon={CheckCircle2} label="Completed Deals" value={completedDeals} />
        <MetricCard icon={Star} label="Average Rating" value={avgRating > 0 ? avgRating.toFixed(1) : "—"} sub={avgRating > 0 ? `${profile?.review_count || 0} reviews` : "No reviews yet"} />
        <MetricCard icon={Eye} label="Profile Views" value="—" sub="Coming soon" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active requests table */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-navy text-lg">Active Service Requests</h2>
            <Link to="/service-requests" className="text-sm text-teal font-semibold flex items-center gap-1 hover:underline">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {activeRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No active requests</p>
          ) : (
            <div className="space-y-3">
              {activeRequests.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">{req.investor_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{req.deal_title}</p>
                  </div>
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full capitalize", STATUS_COLORS[req.status])}>
                    {req.status?.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold text-navy text-lg mb-4">Recent Activity</h2>
          {activityFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activityFeed.map((item, i) => (
                <Link key={i} to={item.path} className="flex items-start gap-3 hover:bg-muted/30 rounded-xl p-2 transition-colors">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                    {item.type === "message" ? <MessageSquare className="w-4 h-4 text-white" /> : <Star className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-navy leading-snug">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.time ? new Date(item.time).toLocaleDateString() : ""}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Earnings chart + Recent reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-bold text-navy text-lg">Earnings This Year</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Demo</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={earningsData}>
              <defs>
                <linearGradient id="earningsGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(168 100% 45%)" />
                  <stop offset="100%" stopColor="hsl(196 100% 50%)" />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => [`$${v}`, "Earnings"]} />
              <Line type="monotone" dataKey="value" stroke="url(#earningsGrad)" strokeWidth={3} dot={{ fill: "hsl(168 100% 45%)", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-navy text-lg">Latest Reviews</h2>
            <Link to="/profile" className="text-sm text-teal font-semibold flex items-center gap-1 hover:underline">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No reviews yet</p>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 3).map(r => (
                <div key={r.id} className="p-3 rounded-xl bg-muted/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-navy">{r.reviewer_name}</p>
                    <StarRating rating={r.rating} size="sm" />
                  </div>
                  {r.body && <p className="text-xs text-muted-foreground line-clamp-2">{r.body}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}