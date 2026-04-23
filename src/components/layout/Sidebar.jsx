import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Logo from "../Logo";
import Icon from "../Icon";
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
  LogOut,
  ChevronLeft,
  Menu,
  FileText,
  LifeBuoy,
  UserCheck,
  Landmark,
  User,
  Layers,
  Building2,
} from "lucide-react";

// Per-role navigation. Must stay in sync with src/lib/routes.jsx — that's
// the authoritative source for which roles can access which paths. A
// sidebar link to a route the user can't access would 404 on click.
//
// Icon choices (post-modernization):
//   - UserCheck for TC Directory — 'vetted professionals' semantic, not
//     generic Briefcase
//   - Building2 for Investor Directory — real-estate focus, not generic
//     TrendingUp ('market up' arrow that was overused)
//   - Landmark for PML Directory — banking-institution silhouette,
//     distinct from generic DollarSign
//   - User (unified) for 'My Profile' across all four roles, instead
//     of the previous role-varying Briefcase/Building2/DollarSign
//   - Layers for Pipeline — stacked deals, distinct from Applications'
//     ClipboardList
//
// T2.6.1 access philosophy:
//   - Admin: oversight only. Gets admin/* + service-requests + directories.
//     No deal-board, pipeline, analytics, own-profile.
//   - TC/Investor/PML: full networking participants. Get deal-board,
//     service-requests, pipeline, analytics, messages, support, own-profile
//     + all three directories.
const NAV_ITEMS = {
  admin: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Applications", icon: ClipboardList, path: "/admin/applications" },
    { label: "Members", icon: Users, path: "/admin/members" },
    { label: "Partners", icon: Handshake, path: "/admin/partners" },
    { label: "Service Requests", icon: FileText, path: "/service-requests" },
    { label: "Support Tickets", icon: LifeBuoy, path: "/admin/support" },
    { label: "TC Directory", icon: UserCheck, path: "/tc-directory" },
    { label: "Investor Directory", icon: Building2, path: "/investor-directory" },
    { label: "PML Directory", icon: Landmark, path: "/pml-directory" },
    { label: "Settings", icon: Settings, path: "/settings" },
  ],
  tc: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Deal Board", icon: ClipboardList, path: "/deal-board" },
    { label: "Service Requests", icon: FileText, path: "/service-requests" },
    { label: "Pipeline", icon: Layers, path: "/pipeline" },
    { label: "TC Directory", icon: UserCheck, path: "/tc-directory" },
    { label: "Investor Directory", icon: Building2, path: "/investor-directory" },
    { label: "PML Directory", icon: Landmark, path: "/pml-directory" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "Analytics", icon: BarChart3, path: "/analytics" },
    { label: "Support", icon: LifeBuoy, path: "/support" },
    { label: "My Profile", icon: User, path: "/profile" },
  ],
  investor: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Deal Board", icon: ClipboardList, path: "/deal-board" },
    { label: "Service Requests", icon: FileText, path: "/service-requests" },
    { label: "Pipeline", icon: Layers, path: "/pipeline" },
    { label: "TC Directory", icon: UserCheck, path: "/tc-directory" },
    { label: "Investor Directory", icon: Building2, path: "/investor-directory" },
    { label: "PML Directory", icon: Landmark, path: "/pml-directory" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "Analytics", icon: BarChart3, path: "/analytics" },
    { label: "Support", icon: LifeBuoy, path: "/support" },
    { label: "My Profile", icon: User, path: "/profile" },
  ],
  pml: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Deal Board", icon: ClipboardList, path: "/deal-board" },
    { label: "Service Requests", icon: FileText, path: "/service-requests" },
    { label: "Pipeline", icon: Layers, path: "/pipeline" },
    { label: "TC Directory", icon: UserCheck, path: "/tc-directory" },
    { label: "Investor Directory", icon: Building2, path: "/investor-directory" },
    { label: "PML Directory", icon: Landmark, path: "/pml-directory" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "Analytics", icon: BarChart3, path: "/analytics" },
    { label: "Support", icon: LifeBuoy, path: "/support" },
    { label: "My Profile", icon: User, path: "/profile" },
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
        {collapsed ? (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground mx-auto"
            title="ALS Deal Connect"
          >
            <Icon as={Menu} className="w-5 h-5" />
          </button>
        ) : (
          <>
            <div className="flex flex-col gap-0.5 min-w-0">
              <Logo size="sm" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40 pl-0.5">ALS Deal Connect</span>
            </div>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground shrink-0"
            >
              <Icon as={ChevronLeft} className="w-5 h-5" />
            </button>
          </>
        )}
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
          const ItemIcon = item.icon;
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
                <Icon as={ItemIcon} className={cn("w-5 h-5 shrink-0", active && "text-sidebar-primary")} />
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
          <Icon as={LogOut} className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}