# T2.2a: Migrate 3 directory pages to useQuery

First slice of the Tier 2, item 2 react-query fan-out. Migrates the three public directory pages to `useQuery`, establishing the template for the remaining ~15 pages that still use `useState + useEffect + manual fetch`.

**Stats:** 3 files changed · +65 / −66 (net -1) · Build ✅ · Full lint ✅ (0 errors, 0 warnings on touched files)

---

## Why just the directories for the first slice?

T2.2 is a large mechanical refactor touching many files. Doing it in one PR would be a ~700-line diff that's hard to review and risky to revert. Chunking by page category gives us:

- **Smaller, reviewable PRs** — this one is 3 files, trivially reviewable
- **Lower blast radius** — if the pattern has an issue, we catch it before propagating to 15+ more pages
- **Proven template** — subsequent sub-PRs (T2.2b/c/d...) just apply the same shape

The directories are the best place to start because they:
- Are **read-only** (no mutations, no race conditions to worry about)
- Have **three nearly-identical files** — the same pattern applied three times validates it thoroughly
- Are **frequently revisited** — caching provides immediate UX benefit
- Are **public-ish** — visible to all approved members, so a subtle regression gets noticed fast

---

## The pattern (applied to all 3 files)

**Before:**
```jsx
const [profiles, setProfiles] = useState([]);
const [userMap, setUserMap] = useState({});
const [loading, setLoading] = useState(true);

useEffect(() => { load(); }, []);

const load = async () => {
  setLoading(true);
  const pmls = await base44.entities.PMLProfile.filter({ is_published: true });
  setProfiles(pmls);
  if (pmls.length > 0) {
    try {
      const users = await base44.entities.User.filter({ role: "pml" });
      const map = {};
      users.forEach((u) => { map[u.id] = u; });
      setUserMap(map);
    } catch {}
  }
  setLoading(false);
};
```

**After:**
```jsx
const { data: profiles = [], isLoading } = useQuery({
  queryKey: ['PMLProfile', { is_published: true }],
  queryFn: () => base44.entities.PMLProfile.filter({ is_published: true }),
});

const { data: users = [] } = useQuery({
  queryKey: ['User', { role: 'pml' }],
  queryFn: () => base44.entities.User.filter({ role: "pml" }),
  enabled: profiles.length > 0,
});

const userMap = useMemo(() => {
  const map = {};
  users.forEach((u) => { map[u.id] = u; });
  return map;
}, [users]);
```

### What changed and why

| Concern | Before | After |
|---|---|---|
| **Fetch trigger** | `useEffect` on mount | `useQuery` — automatic with dedup across the app |
| **Loading state** | `useState(true)` + manual toggle | `isLoading` from react-query |
| **Conditional user fetch** | `if (pmls.length > 0)` branch | `enabled: profiles.length > 0` option |
| **Lookup map** | `useState({})` + manual build in effect | `useMemo(...)` derived from query data |
| **Error handling** | Empty `try/catch` that silently swallowed | Falls through to queryCache handler (T2.8) or default react-query behavior |
| **Revisit behavior** | Re-fetched everything every mount | Cached — instant render, background revalidation |

### Key preserved behavior

- **`enabled: profiles.length > 0`** keeps the original optimization: don't fetch users if no profiles to enrich. Saves a round-trip for empty states.
- **Query keys are structured** (`['PMLProfile', { is_published: true }]`) so future queries with the same filter share cache automatically.
- **Member status scoping from T2.3 is preserved** — the User fetches are still role-scoped server-side, not full table pulls.

---

## Files in this PR (3)

- `src/pages/InvestorDirectory.jsx`
- `src/pages/PMLDirectory.jsx`
- `src/pages/TCDirectory.jsx`

All three use identical patterns modulo entity names and role strings.

---

## What's NOT in this PR

Remaining T2.2 sub-PRs, each following the same template:

- **T2.2b** — admin CRUD pages (Members, Applications, Partners, SupportTickets, admin/SupportTickets). These have mutations too, so a second pass may also migrate those to `useMutation`.
- **T2.2c** — messaging pages (Messages, ServiceRequests). These are god-components flagged for T2.4 decomposition; T2.2 migration there is entangled with T2.4 so we may do them together.
- **T2.2d** — deal board family (DealBoard, DealDetailModal, MatchCard). Multi-entity fetches, good place to showcase `useQueries` for parallel fetches.
- **T2.2e** — profile pages (TCProfilePage, PMLProfilePage, InvestorProfilePage). Similar shape to directories.
- **T2.2f** — dashboard pages (TCDashboard, InvestorDashboard, PMLDashboard, AdminDashboard). AdminDashboard is the biggest; may need its own PR.
- **T2.2g** — public PartnersPage + SupportTickets (member-facing).

---

## Dependencies

**Hard dependencies (required to be merged first):**
- ✅ T2.3 (scoped User.list) — this patch relies on the `User.filter({ role: ... })` call shape already in the directory files

**Soft dependencies (not required, but better together):**
- T2.8 (error boundaries + queryCache handler) — if merged first, query failures from these new useQuery calls surface as toasts via the central handler. If not merged, they fall through to default react-query behavior. Either way works; no conflict.

**No dependencies on:**
- T2.1 (useCurrentUser) — directories don't read current user
- T2.2b-g — those are siblings, each independent

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] Visit `/investor-directory` as any approved member — investor cards render with names/companies populated
- [ ] Visit `/pml-directory` as any approved member — PML cards render
- [ ] Visit `/tc-directory` as any approved member — TC cards render
- [ ] Navigate away from `/tc-directory` and back within 5 minutes — should render instantly with cached data (verify no new network requests in DevTools on re-entry)
- [ ] Filter/search controls still work (these are pure client-side state, unchanged by this PR)
- [ ] Reload a directory page with network throttled to Slow 3G — verify the skeleton-card loading state still appears while `isLoading` is true

---

## Reviewer notes

- The `enabled: profiles.length > 0` on the User query deliberately mirrors the original conditional logic. Removing it would fetch users even when there are no profiles to enrich — small regression.
- The useMemo for `userMap` uses `users` as the only dep. Strictly the map construction is O(n) per render but only re-runs when `users` identity changes, which is bounded by query revalidations.
- Query keys use array form (`['PMLProfile', { is_published: true }]`) not string form, for consistency with how `useCurrentUser` uses `['currentUser']`. react-query compares keys structurally.
- No changes to the rendering logic below the migration — `filtered`, `userMap` consumer code, and JSX are identical.
