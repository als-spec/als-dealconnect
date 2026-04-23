# T2.2f: Migrate 4 dashboard pages to useQuery

Fifth slice of the T2.2 react-query fan-out. Migrates the four dashboard pages from `useState + useEffect + Promise.all(load)` to per-entity `useQuery` calls.

**Stats:** 4 files changed · +146 / −98 (net +48) · Build ✅ · Full lint ✅ (0 errors)

---

## What's migrated

| File | Queries | Key behavior |
|---|---|---|
| `PMLDashboard.jsx` | 2 (MessageThread, PMLProfile) | Simplest case |
| `TCDashboard.jsx` | 4 (ServiceRequest, TCProfile, Review, MessageThread) | Review cascades via `enabled: !!profile?.id` |
| `InvestorDashboard.jsx` | 4 (Deal, ServiceRequest, DealApplication, MessageThread) | Deal and ServiceRequest server-scoped by `investor_id` |
| `AdminDashboard.jsx` | 5 (MemberApplication, User, Deal, MessageThread, Review) | Synthetic apps derived via useMemo; handleAction mutation invalidates both MemberApplication AND User |

---

## Key design choice: separate queries per entity

Each dashboard uses **separate `useQuery` calls per entity** rather than one combined query. The reason:

Cache keys like `['Deal', { investor_id: user.id }]` on InvestorDashboard are the same shape as what DealBoard or admin views could produce. Navigation between pages that share entity data hits the cache instantly instead of re-fetching.

If dashboards used a single combined query like `['dashboard', 'investor', user.id]`, it would be isolated cache — any other page fetching Deals would miss, and invalidating after a mutation would miss the dashboard cache.

Per-entity queries are a little more verbose but pay off in sharing.

---

## Per-page notes

### `PMLDashboard.jsx` — simplest

Two queries (threads, profile), one `useMemo` to filter threads by participant. No mutations.

### `TCDashboard.jsx` — dependent query cascade

Follows the pattern established in T2.2e TCProfilePage: TCProfile fetches first, then Review fetches only when profile.id is available:

```js
const { data: reviews = [] } = useQuery({
  queryKey: ['Review', { tc_profile_id: profile?.id }],
  queryFn: () => base44.entities.Review.filter({ tc_profile_id: profile.id }),
  enabled: !!profile?.id,
});
```

No manual sequencing in a `load()` function. React-query handles the dependency natively.

### `InvestorDashboard.jsx` — full DealApplication list filtered client-side

The old code fetched all DealApplications and used them to count applicants per deal. The migration preserves this — no server-side `deal_id IN [...]` filter exists in Base44 — but keeps the `dealApplicantCounts` derivation unchanged. Cache entry shared with DealBoard's DealApplication query.

### `AdminDashboard.jsx` — biggest, includes mutation

Five parallel queries. The synthetic-application derivation (for users pending approval without a MemberApplication entry) moved into `useMemo`:

```js
const applications = useMemo(() => {
  const appUserIds = new Set(apps.map(a => a.user_id).filter(Boolean));
  const pendingUsers = users.filter(/* pending check */);
  const syntheticApps = pendingUsers.map(/* build synthetic entries */);
  return [...apps, ...syntheticApps];
}, [apps, users]);
```

Only re-runs when either underlying query updates — previously this logic ran inside every `load()` call.

`handleAction` (the approve/reject handler) now calls `refreshAfterMutation()` instead of `load()`:

```js
const refreshAfterMutation = () => {
  queryClient.invalidateQueries({ queryKey: ['MemberApplication'] });
  queryClient.invalidateQueries({ queryKey: ['User'] });
};
```

**Why both `['MemberApplication']` and `['User']`:** approving an application changes the user's role, member_status, and onboarding_step. Other admin views (Applications, Members) read from the User cache, so they must refresh too.

This matches the pattern established in T2.2b admin/Applications.jsx.

---

## Behavior changes

1. **Cache hits on dashboard revisit.** Navigating to /dashboard from another page within the default staleTime (0) still triggers a background revalidation, but renders instantly from cache. Previously every navigation re-fetched everything.

2. **Cache sharing with other pages.** Because per-entity queryKeys match across pages:
   - Investor navigating /deal-board → /dashboard sees their Deals cached from DealBoard
   - Admin navigating /admin/applications → /dashboard sees MemberApplications and Users cached

3. **Dependent query cascade in TCDashboard.** TCProfile must resolve before Review fetches. If a new TC has no profile yet, Review query stays disabled — no wasted request. Matches T2.2e behavior.

4. **No stale-loading-state bug.** The old `load` functions set `loading = false` at the end. If one of the parallel `Promise.all` fetches failed, `setLoading(false)` might not fire. Now `loading` comes directly from react-query — always accurate.

---

## What this does NOT do

- No changes to rendering / JSX in any file
- No `useMutation` conversion (same rationale as prior T2.2 slices — handleAction has per-handler logic that stays clearer as try/catch + await)
- No changes to the derived metrics (active deals, unread threads, activity score, role breakdown, etc.) — these all still compute from the same shape of data
- No pagination for AdminDashboard's User.list (still tracked as T3.4)

---

## Dependencies

**Hard (must be merged first):**
- ✅ T2.1 (useCurrentUser) — dashboards are passed `user` from Dashboard.jsx which uses useCurrentUser
- ✅ T2.2a (directories useQuery) — template established

**Soft (not required):**
- T2.3, T2.8, T2.2e, T2.2b, T2.2d — independent siblings

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] **As a TC** — visit /dashboard. Stats (active requests, completed deals, avg rating, unread messages) render. Activity feed combines messages + reviews correctly.
- [ ] **As an investor** — visit /dashboard. Stats (active deals, TC connections, open requests) render. Deal applicant counts populate correctly.
- [ ] **As a PML** — visit /dashboard. Active inquiries, total inquiries, activity score render. Profile gauge correct.
- [ ] **As admin** — visit /dashboard. Role breakdown chart, member counts, deal count, message count render. Click approve/reject on a pending application → toast, list refreshes, approved item disappears.
- [ ] **Cache sharing smoke test** — as admin, go to /admin/applications and approve someone. Navigate to /dashboard. Member count should reflect the new approved user (invalidation worked).
- [ ] **Navigation cache** — open /dashboard, navigate to /deal-board, come back. Dashboard should render instantly from cache.

---

## Reviewer notes

- The MessageThread filter (`threads.filter(t => t.participants?.includes(user.id))`) is identical across TC/Investor/PML dashboards. Could be extracted to a utility but that's a separate cleanup — not worth expanding scope here.
- The PMLDashboard `activityScore` calculation and InvestorDashboard's `dealApplicantCounts` derivation are unchanged.
- AdminDashboard's `processing` useState stays — it's mutation state, not query state. Mirrors the pattern from other admin pages.
- `handleAction` uses `app._synthetic` to skip the MemberApplication.update when the pending user has no MemberApplication entry yet. This logic is unchanged.

---

## Progress on T2.2 fan-out

- ✅ T2.2a — Directory pages (3 files)
- ✅ T2.2e — Profile pages (3 files)
- ✅ T2.2b — Admin CRUD pages (4 files)
- ✅ T2.2d — DealBoard (1 file)
- ⏳ **T2.2f — Dashboard pages (4 files) [this PR]**
- ⏳ T2.2g — Public member pages (~2 files — PartnersPage, member SupportTickets)
- ⚠️ T2.2c — Messaging pages — folds into T2.4 god-component decomposition

**After this PR: 15 of ~18 page files on useQuery.** Only T2.2g remains in the fan-out — two small files. After that, T2.2 is complete.
