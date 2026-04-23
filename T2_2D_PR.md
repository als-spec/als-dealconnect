# T2.2d: Migrate DealBoard to useQuery

Fourth slice of the T2.2 react-query fan-out. Migrates `DealBoard.jsx` — the investor/TC deal board — from `useState + useEffect + useCallback(loadData)` to three role-aware `useQuery` calls.

**Stats:** 1 file changed · +69 / −41 (net +28) · Build ✅ · Full lint ✅ (0 errors)

---

## Scope decision: why only 1 file

The "deal board family" has three candidate files. Only **DealBoard.jsx** has page-level reads. The other two fetch inside mutation handlers:

**`DealDetailModal.jsx`** — two fetches, both inside `handleApply`:
- `DealApplication.filter(...)` for the duplicate-apply guard
- `TCProfile.filter(...)` to gather data for the AI match-score call

These are imperative, race-critical reads. The duplicate-check only helps if it's fresh; caching it would introduce the race it's meant to prevent. Leaving unchanged.

**`MatchCard.jsx`** — one fetch inside `handleAccept`:
- `Deal.filter(...)` as the concurrent-accept guard (has the deal been filled by someone else in the last few seconds?)

Same story — fresh read is the entire point. Caching would defeat the guard. Leaving unchanged.

**`PostDealForm.jsx`** — pure mutation, no reads. Nothing to migrate.

So this PR is only DealBoard.jsx. Small surface, focused change.

---

## What changes in DealBoard.jsx

Before: one `loadData` function sequentially fetched Deals → Applications → TC profiles, setting 3 local state slices and one loading flag. Multiple handlers called `loadData()` to refetch everything after a mutation.

After: three role-aware `useQuery` calls with `enabled` gating, `useMemo`-derived intermediate state, and a single `refreshDealBoard()` helper that invalidates the relevant keys.

### Query 1: Deal list

```js
const { data: deals = [], isLoading: loadingDeals } = useQuery({
  queryKey: ['Deal', 'list', { sort: '-created_date', limit: 100 }],
  queryFn: () => base44.entities.Deal.list("-created_date", 100),
  enabled: !!user,
});
```

Always runs once `user` resolves. Serves every role.

### Derived: myDeals (investor-only)

```js
const myDeals = useMemo(
  () => (user?.role === "investor" ? deals.filter(d => d.investor_id === user.id) : []),
  [deals, user]
);
```

Replaces a local `setMyDeals` that had to be hand-synced inside `loadData`. Now derived purely from the Deal query + user role.

### Query 2: DealApplication list (investor-gated)

```js
const { data: allApplications = [] } = useQuery({
  queryKey: ['DealApplication', 'list', { sort: '-created_date', limit: 200 }],
  queryFn: () => base44.entities.DealApplication.list("-created_date", 200),
  enabled: user?.role === "investor" && myDeals.length > 0,
});

const applications = useMemo(() => {
  if (user?.role !== "investor") return [];
  const dealIds = new Set(myDeals.map(d => d.id));
  return allApplications.filter(a => dealIds.has(a.deal_id));
}, [allApplications, myDeals, user]);
```

Filtering happens client-side. (`DealApplication.filter({ deal_id: [...] })` isn't supported by Base44's single-key filter semantics, confirmed in other parts of the codebase.)

### Query 3: TCProfile (role-aware)

The original code had two separate code paths for TC profiles — one for investors (loop to fetch one profile per unique tc_id across applications), one for TCs (fetch own profile). Now combined into a single useQuery with a stable key:

```js
const { data: tcProfiles = {} } = useQuery({
  queryKey: [
    'TCProfile',
    'dealboard',
    user?.role,
    user?.role === "tc" ? user.id : applications.map(a => a.tc_id).filter(Boolean).sort(),
  ],
  queryFn: async () => {
    if (user?.role === "tc") {
      const profiles = await base44.entities.TCProfile.filter({ user_id: user.id });
      return profiles[0] ? { [user.id]: profiles[0] } : {};
    }
    // Investor path: fetch one profile per unique tc_id from their applications.
    const seen = new Set();
    const map = {};
    for (const app of applications) {
      if (app.tc_profile_id && app.tc_id && !seen.has(app.tc_id)) {
        seen.add(app.tc_id);
        const profiles = await base44.entities.TCProfile.filter({ user_id: app.tc_id });
        if (profiles[0]) map[app.tc_profile_id] = profiles[0];
      }
    }
    return map;
  },
  enabled: !!user && (user.role === "tc" || (user.role === "investor" && applications.length > 0)),
});
```

Notes:
- The queryKey includes the sorted list of `tc_id`s so the cache correctly invalidates when applications change but hits when they don't.
- The sequential loop inside `queryFn` preserves the original behavior. Base44's SDK has no batch filter for `id IN [...]`, so there's no way to parallelize this without a new backend endpoint. Same total request count as before.

### Invalidation helper

```js
const refreshDealBoard = () => {
  queryClient.invalidateQueries({ queryKey: ['Deal'] });
  queryClient.invalidateQueries({ queryKey: ['DealApplication'] });
};
```

All previous `loadData()` call sites replaced:
- `handleClosePost` (investor closes their own deal)
- `onApplied` (TC submits an interest via DealDetailModal)
- `onSave` (deal created or edited via PostDealForm)
- `MatchCard onUpdate` (investor accepts/declines a TC application)

---

## Behavior changes to be aware of

1. **Cache hits on revisit.** Navigating away and back to `/deal-board` within the default staleTime renders instantly from cache with background revalidation. Previously every navigation re-fetched everything.

2. **DealApplication fetch is now correctly gated.** Old code checked `dealIds.length > 0` before fetching apps. New code uses `enabled: user?.role === "investor" && myDeals.length > 0`. Same behavior.

3. **TCProfile cache is shared within the session.** If the same tc_id appears in two different applications, the old loop checked `!profileMap[app.tc_profile_id]` to dedupe. The new code uses `seen.has(app.tc_id)` for the same dedupe. Cache key includes the sorted tc_id list so session-level dedupe is automatic.

4. **No more "stale loading state" bug.** Previously `setLoading(false)` only fired at the end of `loadData`, which meant if `loadData` crashed partway through, the spinner could persist. Now `loadingDeals` comes directly from react-query — always accurate.

---

## What this does NOT do

- No changes to rendering / JSX
- No `useMutation` conversion (same rationale as T2.2b — mutation handlers have per-handler logic that stays clearer as try/catch + await)
- No migration of DealDetailModal or MatchCard (intentional — see scope decision above)
- No change to the filter/search predicates (pure client state, unaffected)

---

## Dependencies

**Hard (must be merged first):**
- ✅ T2.1 (useCurrentUser hook)
- ✅ T2.2a (directories useQuery template)

**Soft (not required):**
- T2.8, T2.3, T2.2e, T2.2b — independent siblings

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] **As an investor with deals posted** — visit `/deal-board`. Matches tab shows TC applications with match scores and TC profile data populated.
- [ ] **As an investor — post a new deal** via the Post Deal button → deal appears in the board immediately after save.
- [ ] **As an investor — close your own deal** → deal's status updates to "closed" in the UI.
- [ ] **As an investor — accept a TC match** → MatchCard updates, Deal moves to "filled" state.
- [ ] **As a TC** — visit `/deal-board`. Open deals list renders. Open a deal, submit interest → success state shown, modal closes.
- [ ] **Navigation cache** — open `/deal-board`, navigate to `/dashboard`, come back. Deal list should render instantly (cached) then revalidate silently.
- [ ] **Role gating** — verify a TC user doesn't see the Matches tab (it should only render for investors).

---

## Reviewer notes

- The investor's TCProfile fetch is a sequential loop. I considered `Promise.all`, but Base44's SDK enforces one-request-per-tc_id anyway since there's no batch filter. The loop structure matches the original.
- The `tcProfiles` map is indexed by `tc_profile_id` for investors and by `user.id` for TCs. Consumers already handle both (`tcProfiles[app.tc_profile_id] || tcProfiles[app.tc_id]` at MatchCard).
- The `loading` variable now only tracks the deals query, not the downstream ones. This matches the original behavior — the old `loadData` set `loading = false` after the TCProfile loop but the loop could be empty (no applications), so effectively it was gated on deals. Preserved.

---

## Progress on T2.2 fan-out

- ✅ T2.2a — Directory pages (3 files) [merged]
- ✅ T2.2e — Profile pages (3 files) [merged]
- ✅ T2.2b — Admin CRUD pages (4 files) [merged]
- ⏳ **T2.2d — DealBoard (1 file) [this PR]**
- ⏳ T2.2f — Dashboard pages (~4 files)
- ⏳ T2.2g — Public member pages (~2 files)
- ⚠️ T2.2c — Messaging pages — folds into T2.4 god-component decomposition

After this PR, 11 of ~18 page files on useQuery. Remaining: T2.2f (dashboards) + T2.2g (public pages). Both mechanical.
