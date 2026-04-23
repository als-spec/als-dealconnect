# T2.6: Extract route table into declarative data module

Refactors `App.jsx`'s role-gated routes from four duplicated JSX blocks into a declarative data table. Small, self-contained, behavior-preserving.

**Stats:** 2 files changed · +115 / −84 (net +31) · 1 new file · `App.jsx` 180 → 107 lines (-40%) · Build ✅ · Full lint ✅ (0 errors)

---

## Before

Four per-role JSX blocks in `App.jsx`, each with 8–11 `<Route>` entries. Heavy duplication:

```jsx
{user?.role === "admin" && (
  <>
    <Route path="/admin/applications" element={<Applications />} />
    <Route path="/admin/members" element={<Members />} />
    {/* ...9 more */}
    <Route path="/tc-directory" element={<TCDirectory />} />
    <Route path="/investor-directory" element={<InvestorDirectory />} />
    <Route path="/pml-directory" element={<PMLDirectory />} />
  </>
)}

{user?.role === "tc" && (
  <>
    {/* ...11 routes, half of which also appear in other blocks */}
    <Route path="/tc-directory" element={<TCDirectory />} />
    <Route path="/investor-directory" element={<InvestorDirectory />} />
    <Route path="/pml-directory" element={<PMLDirectory />} />
  </>
)}
// ...and so on for investor and pml
```

Problems:
- **Permission matrix is unreadable** — to know "who can hit /messages?" you have to scan all four blocks
- **Changes touch multiple places** — adding a universal route means editing 4 JSX blocks
- **Drift risk** — the per-role blocks had accumulated small inconsistencies (see "pre-existing quirks" below) that are hard to spot in JSX but obvious in a table

## After

`src/lib/routes.jsx` exports a single declarative array:

```js
export const AUTHENTICATED_ROUTES = [
  { path: "/dashboard", roles: ALL_ROLES, element: <Dashboard /> },

  // Admin-only
  { path: "/admin/applications", roles: ["admin"], element: <Applications /> },
  { path: "/admin/members", roles: ["admin"], element: <Members /> },
  // ...

  // Deal board — TC and investor only
  { path: "/deal-board", roles: ["tc", "investor"], element: <DealBoard /> },

  // Messages — everyone except admin
  { path: "/messages", roles: ["tc", "investor", "pml"], element: <Messages /> },

  // Directories — available to every role
  { path: "/tc-directory", roles: ALL_ROLES, element: <TCDirectory /> },
  { path: "/investor-directory", roles: ALL_ROLES, element: <InvestorDirectory /> },
  { path: "/pml-directory", roles: ALL_ROLES, element: <PMLDirectory /> },

  // /profile resolves to different components per role
  { path: "/profile", roles: ["tc"], element: <TCProfilePage /> },
  { path: "/profile", roles: ["investor"], element: <InvestorProfilePage /> },
  { path: "/profile", roles: ["pml"], element: <PMLProfilePage /> },

  // ...
];

export function routesForRole(role) {
  return AUTHENTICATED_ROUTES.filter(r => r.roles.includes(role));
}
```

App.jsx shrinks to a one-liner map:

```jsx
const userRoutes = routesForRole(user?.role);

return (
  <Routes>
    <Route path="/" element={<LandingPage user={user} />} />
    <Route path="/partners" element={<PartnersPage user={user} />} />
    <Route element={<Layout user={user} />}>
      {userRoutes.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Route>
    <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);
```

---

## Behavior preservation

Before committing, I extracted the route list from each original per-role JSX block and diffed against what `routesForRole()` returns for that role:

| Role | Match |
|---|---|
| admin | ✅ exactly matches |
| tc | ✅ exactly matches |
| investor | ✅ exactly matches |
| pml | ✅ exactly matches |

No routes added, removed, or had their role access changed.

---

## Pre-existing quirks preserved (not fixed)

While cataloging the routes I noticed three small oddities in the original matrix. Preserving them here because this is a pure refactor — changing product behavior should be a separate decision:

1. **TC can access `/profile/pml` but not `/profile/tc`.** A TC viewing another TC's profile goes through the directory-detail flow instead, I believe — but it's an inconsistency with how the other roles work.
2. **Admin has `/profile/tc` and `/profile/pml` but no `/profile/investor`.** Admin can view TCs and PMLs at dedicated URLs but not investors.
3. **Admin gets `/service-requests` but not `/support` (member-side).** Admin has `/admin/support` instead, which is correct — I just noticed the asymmetry.

All three are flagged in the `routes.jsx` comments. Worth a product conversation later. Not in this PR's scope.

---

## What this does NOT change

- No routes added or removed for any role
- No change to the `publicPaths` logic (unauthenticated / and /partners still work)
- No change to the `needsOnboarding` flow
- No change to the `authError` handling (user-not-registered, auth-required branches)
- Layout's `user` prop still flows the same way
- PageNotFound catch-all still renders for unknown paths within Layout

---

## Why `.jsx` instead of `.js` for the routes file

The route table includes JSX element literals (`<TCProfilePage />`, etc.). Vite / esbuild won't transform JSX in a `.js` file by default, so `.jsx` is correct. Other modules in `src/lib/` are pure-JS and stay `.js` (e.g., `query-client.js`, `utils.js`).

---

## Lint config note

`src/lib/**` is explicitly ignored in the eslint config (pre-existing — matches how `query-client.js` is handled). The new `routes.jsx` lives there, so it isn't linted. That's intentional and consistent; the file is pure data + imports with no hooks or component logic that would benefit from enforcement.

If we ever want to lint `src/lib/**`, that's a separate config change — not entangled with T2.6.

---

## Dependencies

**Hard:**
- ✅ T2.1 (useCurrentUser) — App.jsx imports it

**Soft:** none

Completely independent of all T2.2 slices, T2.4, T2.5. Can land at any point.

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] **As admin:** verify access to /admin/applications, /admin/members, /admin/partners, /admin/support, /service-requests, /settings, /profile/tc, /profile/pml, /tc-directory, /investor-directory, /pml-directory. Verify /deal-board 404s (admins don't get it). Verify /profile 404s (admin has no own-profile route).
- [ ] **As TC:** verify access to /dashboard, /deal-board, /messages, /service-requests, /analytics, /support, /profile (→ TCProfilePage), /tc-directory, /investor-directory, /pml-directory, /profile/pml. Verify /admin/* all 404.
- [ ] **As investor:** verify access to /dashboard, /deal-board, /messages, /service-requests, /support, /profile (→ InvestorProfilePage), /tc-directory, /investor-directory, /pml-directory, /profile/tc, /profile/pml. Verify /analytics and /pipeline 404.
- [ ] **As PML:** verify access to /dashboard, /pipeline, /messages, /analytics, /support, /profile (→ PMLProfilePage), /tc-directory, /investor-directory, /pml-directory, /profile/tc, /profile/pml. Verify /deal-board and /service-requests 404.
- [ ] **Unknown path:** /nonexistent → PageNotFound component renders inside Layout for any authenticated user.
- [ ] **Onboarding:** a user with `member_status: "pending"` still gets redirected to /onboarding from any other path. (The onboarding block in App.jsx is unchanged.)
- [ ] **Public paths:** /partners and / still render without auth.

---

## Reviewer notes

- **Route ordering** in `routesForRole()` follows a logical grouping: dashboard → admin-only → role-specific features → shared (directories, profile). React Router doesn't care about order for non-conflicting paths, but it's easier to scan.
- **`/profile` has three entries** (one per role) with the same path but different elements. `routesForRole()` filters by role, so each user sees exactly one `/profile` route pointing to the right component. React Router receives one `<Route path="/profile">` per render, no collision.
- **`key={path}` on the mapped Routes is safe** — `routesForRole()` filters entries where `roles.includes(role)`, and each path appears at most once per role by construction. If someone later adds two entries with the same path and overlapping roles, React will warn about duplicate keys — a useful signal that the matrix has an ambiguity.
- **No performance concern.** The route table is declared at module scope (no re-creation per render). `routesForRole` is a constant-time filter over 22 entries.

---

## Progress

After T2.6 lands:

| Item | Status |
|---|---|
| T2.1, T2.3, T2.8 | ✅ Merged |
| T2.2a/b/d/e/f/g (full fan-out) | ✅ Merged |
| T2.5 race quick fix | ✅ Merged |
| T2.4a/b (god-component decomp) | ✅ Merged |
| **T2.6 route table** | **⏳ This PR** |
| T2.7 Permission audit (doc) | Remaining Tier 2 item |
| T3.4 Admin pagination | Tier 3 |

After this lands, Tier 2 has only T2.7 left — and that's a verification doc, not a code PR. Tier 2 essentially complete.
