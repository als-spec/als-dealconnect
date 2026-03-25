import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, Users, ClipboardList, TrendingUp, ArrowUpRight, DollarSign, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, trend, trendUp }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span className={cn(
            "inline-flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full",
            trendUp ? "text-teal bg-teal/10" : "text-destructive bg-destructive/10"
          )}>
            <ArrowUpRight className={cn("w-3 h-3", !trendUp && "rotate-90")} />
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-extrabold text-navy">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
    };
    loadUser();
  }, []);

  const role = user?.role;

  const adminStats = [
    { icon: Users, label: "Total Members", value: "0", trend: null },
    { icon: ClipboardList, label: "Pending Applications", value: "0", trend: null },
    { icon: BarChart3, label: "Active Deals", value: "0", trend: null },
    { icon: TrendingUp, label: "Monthly Revenue", value: "$0", trend: null },
  ];

  const tcStats = [
    { icon: ClipboardList, label: "Active Deals", value: "0", trend: null },
    { icon: Briefcase, label: "Completed Deals", value: "0", trend: null },
    { icon: BarChart3, label: "Response Rate", value: "0%", trend: null },
    { icon: TrendingUp, label: "Earnings This Month", value: "$0", trend: null },
  ];

  const investorStats = [
    { icon: ClipboardList, label: "My Deal Posts", value: "0", trend: null },
    { icon: Users, label: "TC Connections", value: "0", trend: null },
    { icon: DollarSign, label: "Deals Funded", value: "0", trend: null },
    { icon: TrendingUp, label: "Active Requests", value: "0", trend: null },
  ];

  const pmlStats = [
    { icon: DollarSign, label: "Active Listings", value: "0", trend: null },
    { icon: ClipboardList, label: "Deal Inquiries", value: "0", trend: null },
    { icon: BarChart3, label: "Funded This Month", value: "$0", trend: null },
    { icon: TrendingUp, label: "Pipeline Value", value: "$0", trend: null },
  ];

  const stats = role === "admin" ? adminStats : role === "tc" ? tcStats : role === "pml" ? pmlStats : investorStats;
  const greeting = user?.full_name ? `Welcome back, ${user.full_name.split(" ")[0]}` : "Welcome back";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-navy">{greeting}</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your account today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-lg font-bold text-navy mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {role === "admin" && (
            <>
              <QuickAction label="Review Applications" description="Pending member approvals" href="/admin/applications" />
              <QuickAction label="Manage Members" description="View all active members" href="/admin/members" />
              <QuickAction label="Platform Settings" description="Configure platform settings" href="/settings" />
            </>
          )}
          {role === "tc" && (
            <>
              <QuickAction label="View Deal Board" description="Browse new deal requests" href="/deal-board" />
              <QuickAction label="Messages" description="Check your inbox" href="/messages" />
              <QuickAction label="Edit Profile" description="Update your TC profile" href="/profile" />
            </>
          )}
          {role === "investor" && (
            <>
              <QuickAction label="Post a Deal" description="Create a new deal request" href="/deal-board" />
              <QuickAction label="Find a TC" description="Browse TC Directory" href="/tc-directory" />
              <QuickAction label="Find Lending" description="Browse PML Directory" href="/pml-directory" />
            </>
          )}
          {role === "pml" && (
            <>
              <QuickAction label="View Pipeline" description="Manage your deal pipeline" href="/pipeline" />
              <QuickAction label="Messages" description="Check deal inquiries" href="/messages" />
              <QuickAction label="Edit Profile" description="Update lending criteria" href="/profile" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, description, href }) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-teal/40 hover:shadow-sm transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-muted group-hover:bg-teal/10 flex items-center justify-center transition-colors">
        <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-teal transition-colors" />
      </div>
      <div>
        <p className="text-sm font-bold text-navy">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </a>
  );
}