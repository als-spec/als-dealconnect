import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Logo from "../Logo";
import UnreadBadge from "./UnreadBadge";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Handshake,
  MessageSquare,
  BarChart3,
  Settings,
  Building2,
  DollarSign,
  Briefcase,
  LogOut,
  ChevronLeft,
  Menu,
  FileText,
  TrendingUp,
  LifeBuoy,
} from "lucide-react";

const NAV_ITEMS = {
  admin: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Applications", icon: ClipboardList, path: "/admin/applications" },
    { label: "Members", icon: Users, path: "/admin/members" },
    { label: "Partners", icon: Handshake, path: "/admin/partners" },
    { label: "Support Tickets", icon: LifeBuoy, path: "/admin/support" },
    { label: "TC Directory", icon: Briefcase, path: "/tc-directory" },
    { label: "Investor Directory", icon: TrendingUp, path: "/investor-directory" },
    { label: "PML Directory", icon: DollarSign, path: "/pml-directory" },
    { label: "Settings", icon: Settings, path: "/settings" },
  ],
  tc: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Deal Board", icon: ClipboardList, path: "/deal-board" },
    { label: "Service Requests", icon: FileText, path: "/service-requests" },
    { label: "TC Directory", icon: Briefcase, path: "/tc-directory" },
    { label: "Investor Directory", icon: TrendingUp, path: "/investor-directory" },
    { label: "PML Directory", icon: DollarSign, path: "/pml-directory" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "Analytics", icon: BarChart3, path: "/analytics" },
    { label: "Support", icon: LifeBuoy, path: "/support" },
    { label: "My Profile", icon: Briefcase, path: "/profile" },
  ],
  investor: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Deal Board", icon: ClipboardList, path: "/deal-board" },
    { label: "Service Requests", icon: FileText, path: "/service-requests" },
    { label: "TC Directory", icon: Users, path: "/tc-directory" },
    { label: "Investor Directory", icon: TrendingUp, path: "/investor-directory" },
    { label: "PML Directory", icon: DollarSign, path: "/pml-directory" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "Support", icon: LifeBuoy, path: "/support" },
    { label: "My Profile", icon: Building2, path: "/profile" },
  ],
  pml: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Pipeline", icon: ClipboardList, path: "/pipeline" },
    { label: "TC Directory", icon: Briefcase, path: "/tc-directory" },
    { label: "Investor Directory", icon: TrendingUp, path: "/investor-directory" },
    { label: "PML Directory", icon: Users, path: "/pml-directory" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "Analytics", icon: BarChart3, path: "/analytics" },
    { label: "Support", icon: LifeBuoy, path: "/support" },
    { label: "My Profile", icon: DollarSign, path: "/profile" },
  ],
};

export default function Sidebar({ userRole, collapsed, onToggle, userId, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const items = NAV_ITEMS[userRole] || NAV_ITEMS.investor;
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (userRole === "admin") {
      base44.entities.MemberApplication.filter({ status: "pending" })
        .then(apps => setPendingCount(apps.length))
        .catch(() => {});
    }
  }, [userRole]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-40",
        // Desktop
        collapsed ? "md:w-[68px]" : "md:w-[260px]",
        // Mobile: off-canvas, slides in when open
        "w-[260px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && <Logo size="sm" />}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3">
          <div className="gradient-primary text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg text-center">
            {userRole === "tc" ? "Transaction Coordinator" : userRole === "pml" ? "Private Money Lender" : userRole === "admin" ? "Administrator" : "Investor / Agent"}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <span className="relative">
                <Icon className={cn("w-5 h-5 shrink-0", active && "text-sidebar-primary")} />
                {item.path === "/messages" && <UnreadBadge userId={userId} />}
              </span>
              {!collapsed && (
                <span className="text-sm font-medium truncate flex-1">{item.label}</span>
              )}
              {!collapsed && item.path === "/admin/applications" && pendingCount > 0 && (
                <span className="ml-auto gradient-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}