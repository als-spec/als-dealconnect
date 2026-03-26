import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { DollarSign, ClipboardList, BarChart3, Clock, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

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

const performanceData = [
  { name: "Oct", inquiries: 0 }, { name: "Nov", inquiries: 0 }, { name: "Dec", inquiries: 0 },
  { name: "Jan", inquiries: 0 }, { name: "Feb", inquiries: 0 }, { name: "Mar", inquiries: 0 },
];

export default function PMLDashboard({ user }) {
  const [threads, setThreads] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    load();
  }, [user?.id]);

  const load = async () => {
    const [threads_, profiles] = await Promise.all([
      base44.entities.MessageThread.list('-last_message_at', 100),
      base44.entities.PMLProfile.filter({ user_id: user.id }),
    ]);
    setThreads(threads_.filter(t => t.participants?.includes(user.id)));
    if (profiles.length > 0) setProfile(profiles[0]);
    setLoading(false);
  };

  const activeInquiries = threads.filter(t => t.unread_by?.includes(user.id)).length;
  const totalInquiries = threads.length;

  const activityScore = Math.min(100, Math.round(
    (profile?.deals_funded || 0) * 5 +
    totalInquiries * 2 +
    (profile?.is_published ? 10 : 0) +
    (profile?.is_verified ? 15 : 0)
  ));

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-navy">Welcome back, {user.full_name?.split(" ")[0]}</h1>
          <p className="text-muted-foreground mt-1">Here's your lending activity overview.</p>
        </div>
        {activityScore > 0 && (
          <div className="flex items-center gap-2 gradient-primary px-4 py-2 rounded-xl shadow-md">
            <BarChart3 className="w-4 h-4 text-white" />
            <span className="text-white font-bold text-sm">Activity Score: {activityScore}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={ClipboardList} label="Active Inquiries" value={activeInquiries} />
        <MetricCard icon={DollarSign} label="Funded Deals" value={profile?.deals_funded || 0} />
        <MetricCard icon={BarChart3} label="Total Loan Volume" value="—" sub="Coming soon" />
        <MetricCard icon={Clock} label="Avg Close Time" value={profile?.avg_close_days ? `${profile.avg_close_days}d` : "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inquiry pipeline */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-navy text-lg">Deal Inquiries</h2>
            <Link to="/messages" className="text-sm text-teal font-semibold flex items-center gap-1 hover:underline">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {threads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No inquiries yet</p>
          ) : (
            <div className="space-y-3">
              {threads.slice(0, 6).map(t => {
                const isUnread = t.unread_by?.includes(user.id);
                const otherIdx = t.participants?.indexOf(user.id) === 0 ? 1 : 0;
                const otherName = t.participant_names?.[otherIdx] || "Unknown";
                return (
                  <Link key={t.id} to="/messages" className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-colors hover:border-teal/40",
                    isUnread ? "border-teal/30 bg-teal/5" : "border-border bg-muted/20"
                  )}>
                    <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {otherName[0] || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", isUnread ? "font-bold text-navy" : "font-medium text-navy")}>{otherName}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                    </div>
                    {isUnread && <span className="w-2 h-2 rounded-full bg-teal flex-shrink-0" />}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Performance chart */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-bold text-navy text-lg">Inquiry Volume</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Demo</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={performanceData}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(168 100% 45%)" />
                  <stop offset="100%" stopColor="hsl(196 100% 50%)" />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="inquiries" fill="url(#barGrad)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
            <div className="bg-teal/5 rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-navy">{totalInquiries}</p>
              <p className="text-xs text-muted-foreground">Total Inquiries</p>
            </div>
            <div className="bg-teal/5 rounded-xl p-3 text-center">
              <p className="text-lg font-extrabold text-navy">{profile?.is_published ? "Live" : "Draft"}</p>
              <p className="text-xs text-muted-foreground">Profile Status</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}