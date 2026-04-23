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
// History:
//   - T2.6 extracted this table from the four duplicated per-role JSX
//     blocks in App.jsx. Behavior was preserved exactly at that point.
//   - T2.6.1 (this version) EXPANDED role access to make the platform
//     properly networking-oriented: TC/Investor/PML now all get deal-
//     board, service-requests, pipeline, analytics, and all three
//     profile-view routes. Admin is held to oversight-only — no
//     deal-board, no pipeline, no analytics, no own-profile, no
//     profile-view routes. Admin retains /service-requests for
//     workflow observability. See PR body for rationale.

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

// Member roles — everyone who is NOT an admin. Used for features where
// admin is oversight-only and doesn't engage as a network participant
// (posting deals, creating service requests, having a profile, etc.).
export const MEMBER_ROLES = ["tc", "investor", "pml"];

/**
 * Authenticated routes rendered inside <Layout>. Each entry is visible
 * only to users whose role is in `roles`.
 *
 * Entries are ordered by domain: dashboard → admin-only → networking
 * features (member roles) → admin-visible workflow → shared (directories,
 * profiles).
 *
 * Access philosophy (T2.6.1):
 *   - Admins are OVERSIGHT: admin/* routes for engagement, /service-
 *     requests for observability. No deal-board, pipeline, analytics,
 *     own-profile, or profile-view routes — admins don't network as
 *     participants.
 *   - TC/Investor/PML are PARTICIPANTS: full access to the networking
 *     core — deal board, service requests, pipeline, analytics, plus
 *     all three profile-view routes (so any member can look at any
 *     member's profile).
 *
 * Note: this PR grants ROUTE ACCESS only. Mutation affordances on the
 * now-visible pages are still visible to admins at the component level.
 * T2.6.2 will follow up to hide create/edit buttons when the viewer is
 * an admin.
 */
export const AUTHENTICATED_ROUTES = [
  // Everyone with a valid role gets the dashboard.
  { path: "/dashboard", roles: ALL_ROLES, element: <Dashboard /> },

  // Admin-only engagement surfaces
  { path: "/admin/applications", roles: ["admin"], element: <Applications /> },
  { path: "/admin/members", roles: ["admin"], element: <Members /> },
  { path: "/admin/partners", roles: ["admin"], element: <AdminPartners /> },
  { path: "/admin/support", roles: ["admin"], element: <AdminSupportTickets /> },
  { path: "/settings", roles: ["admin"], element: <ComingSoon title="Platform Settings" /> },

  // Deal board — all member roles (TC, investor, PML). PML gets view
  // access for context on lending opportunities. Admin excluded — not
  // a network participant.
  { path: "/deal-board", roles: MEMBER_ROLES, element: <DealBoard /> },

  // Service requests — all member roles PLUS admin for oversight.
  { path: "/service-requests", roles: ALL_ROLES, element: <ServiceRequests /> },

  // Messages — member-to-member only. Admin communicates via /admin/support.
  { path: "/messages", roles: MEMBER_ROLES, element: <Messages /> },

  // Support tickets (member-side) — members file tickets, admin reads
  // them at /admin/support.
  { path: "/support", roles: MEMBER_ROLES, element: <SupportTickets /> },

  // Analytics — universal for members. Pipeline — universal for members.
  // Admin doesn't engage with these workflow concepts.
  { path: "/analytics", roles: MEMBER_ROLES, element: <ComingSoon title="Analytics" /> },
  { path: "/pipeline", roles: MEMBER_ROLES, element: <ComingSoon title="Pipeline" /> },

  // Directories — universal. Admin needs them for oversight; members
  // need them to find each other.
  { path: "/tc-directory", roles: ALL_ROLES, element: <TCDirectory /> },
  { path: "/investor-directory", roles: ALL_ROLES, element: <InvestorDirectory /> },
  { path: "/pml-directory", roles: ALL_ROLES, element: <PMLDirectory /> },

  // "My profile" — resolves to different components per role. Admin
  // excluded because there's no admin profile entity.
  { path: "/profile", roles: ["tc"], element: <TCProfilePage /> },
  { path: "/profile", roles: ["investor"], element: <InvestorProfilePage /> },
  { path: "/profile", roles: ["pml"], element: <PMLProfilePage /> },

  // Profile views (viewing another user's profile). Universal across
  // member roles so any member can look at any other member. Admin
  // excluded — uses /admin/members for member oversight instead.
  //
  // These routes handle the ?id=<userId> query param to fetch the
  // target user's profile (infrastructure from T2.2e).
  { path: "/profile/tc", roles: MEMBER_ROLES, element: <TCProfilePage /> },
  { path: "/profile/investor", roles: MEMBER_ROLES, element: <InvestorProfilePage /> },
  { path: "/profile/pml", roles: MEMBER_ROLES, element: <PMLProfilePage /> },
];

/**
 * Return just the routes the given role can access.
 */
export function routesForRole(role) {
  if (!role) return [];
  return AUTHENTICATED_ROUTES.filter(r => r.roles.includes(role));
}
