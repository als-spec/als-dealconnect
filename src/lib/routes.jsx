// Route table for authenticated routes inside the Layout shell.
//
// Design goals:
//   - Permission matrix (which roles can hit which paths) is readable at a glance
//   - Zero per-role duplication — shared routes are declared once with a
//     `roles` array
//   - The same route + component can resolve different content per role
//     (e.g., /profile is TCProfilePage for TCs, InvestorProfilePage for
//     investors, PMLProfilePage for PMLs)
//
// Shape:
//   { path: string, roles: ("admin"|"tc"|"investor"|"pml")[], element: ReactNode }
//
// App.jsx filters this table by the current user's role and emits a <Route>
// for each matching entry, in order.
//
// Behavior preservation note (T2.6): this table was derived from a careful
// read of the old per-role route blocks in App.jsx. Every route that existed
// before still exists. No routes were added, removed, or had their role
// access changed. A few pre-existing quirks (e.g., TC has /profile/pml but
// not /profile/tc; admin has /profile/tc and /profile/pml but not
// /profile/investor) are preserved exactly. Flagged in the PR body for
// product consideration but deliberately not changed here.

import Dashboard from "@/pages/Dashboard";
import Applications from "@/pages/admin/Applications";
import Members from "@/pages/admin/Members";
import AdminPartners from "@/pages/admin/Partners";
import AdminSupportTickets from "@/pages/admin/SupportTickets";
import ComingSoon from "@/pages/ComingSoon";
import TCProfilePage from "@/pages/TCProfilePage";
import InvestorProfilePage from "@/pages/InvestorProfilePage";
import PMLProfilePage from "@/pages/PMLProfilePage";
import TCDirectory from "@/pages/TCDirectory";
import InvestorDirectory from "@/pages/InvestorDirectory";
import PMLDirectory from "@/pages/PMLDirectory";
import DealBoard from "@/pages/DealBoard";
import Messages from "@/pages/Messages";
import ServiceRequests from "@/pages/ServiceRequests";
import SupportTickets from "@/pages/SupportTickets";

export const ALL_ROLES = ["admin", "tc", "investor", "pml"];

/**
 * Authenticated routes rendered inside <Layout>. Each entry is visible
 * only to users whose role is in `roles`.
 *
 * Entries are ordered by domain: dashboard → admin-only → role-specific
 * features → shared (directories, profile-by-role).
 */
export const AUTHENTICATED_ROUTES = [
  // Everyone with a valid role gets the dashboard.
  { path: "/dashboard", roles: ALL_ROLES, element: <Dashboard /> },

  // Admin-only
  { path: "/admin/applications", roles: ["admin"], element: <Applications /> },
  { path: "/admin/members", roles: ["admin"], element: <Members /> },
  { path: "/admin/partners", roles: ["admin"], element: <AdminPartners /> },
  { path: "/admin/support", roles: ["admin"], element: <AdminSupportTickets /> },
  { path: "/settings", roles: ["admin"], element: <ComingSoon title="Platform Settings" /> },

  // Deal board — TC and investor only
  { path: "/deal-board", roles: ["tc", "investor"], element: <DealBoard /> },

  // Messages — everyone except admin
  { path: "/messages", roles: ["tc", "investor", "pml"], element: <Messages /> },

  // Service requests — admin, TC, investor (not PML)
  { path: "/service-requests", roles: ["admin", "tc", "investor"], element: <ServiceRequests /> },

  // Support tickets (member-side) — everyone except admin (admin uses /admin/support instead)
  { path: "/support", roles: ["tc", "investor", "pml"], element: <SupportTickets /> },

  // Analytics — TC and PML only (investors see deal-board instead)
  { path: "/analytics", roles: ["tc", "pml"], element: <ComingSoon title="Analytics" /> },

  // PML-only
  { path: "/pipeline", roles: ["pml"], element: <ComingSoon title="Pipeline" /> },

  // Directories — available to every role
  { path: "/tc-directory", roles: ALL_ROLES, element: <TCDirectory /> },
  { path: "/investor-directory", roles: ALL_ROLES, element: <InvestorDirectory /> },
  { path: "/pml-directory", roles: ALL_ROLES, element: <PMLDirectory /> },

  // "My profile" — resolves to different components per role
  { path: "/profile", roles: ["tc"], element: <TCProfilePage /> },
  { path: "/profile", roles: ["investor"], element: <InvestorProfilePage /> },
  { path: "/profile", roles: ["pml"], element: <PMLProfilePage /> },

  // Role-specific profile views (viewing someone else's profile)
  // Note: these pre-existing quirks are preserved as-is.
  //   - TC can hit /profile/pml but not /profile/tc
  //   - Admin gets /profile/tc and /profile/pml but not /profile/investor
  //   - Investor and PML get all three
  { path: "/profile/tc", roles: ["admin", "investor", "pml"], element: <TCProfilePage /> },
  { path: "/profile/pml", roles: ["admin", "tc", "investor", "pml"], element: <PMLProfilePage /> },
];

/**
 * Return just the routes the given role can access.
 */
export function routesForRole(role) {
  if (!role) return [];
  return AUTHENTICATED_ROUTES.filter(r => r.roles.includes(role));
}
