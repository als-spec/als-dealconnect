# T2.2b: Migrate 4 admin pages to useQuery

Third slice of the T2.2 react-query fan-out. Applies the template proved in T2.2a (directories) and extended in T2.2e (profiles) to the four admin CRUD pages.

**Stats:** 4 files changed · +75 / −63 (net +12) · Build ✅ · Full lint ✅ (0 errors)

---

## What's migrated

| File | Queries introduced | Mutation sites touched |
|---|---|---|
| `admin/Members.jsx` | 1: User.list | Member edit-save |
| `admin/Applications.jsx` | 2: MemberApplication.list, User.filter(pending) | Approve, Reject |
| `admin/Partners.jsx` | 1: Partner.list (2 partitions via useMemo) | Create, Update, Delete, Approve, Reject |
| `admin/SupportTickets.jsx` | 1: SupportTicket.list | Status change, Comment |

---

## Pattern applied

Standard `useQuery` + `useQueryClient` + invalidation on mutation, matching T2.2a/T2.2e:

```jsx
const { data = [], isLoading } = useQuery({
  queryKey: ['<Entity>', 'list', { sort: '-created_date' }],
  queryFn: () => base44.entities.<Entity>.list('-created_date'),
});

// After any mutation:
queryClient.invalidateQueries({ queryKey: ['<Entity>'] });
```

---

## Page-specific highlights

### `admin/Members.jsx` — simplest case

Single query, single invalidation. Minimal change.

### `admin/Applications.jsx` — two parallel queries + derived state

The old code fetched MemberApplications and pending Users in parallel (already via `Promise.all`), then synthesized application entries for pending users with no MemberApplication. Now:

- **Two useQuery calls** — MemberApplication and User(pending). React-query runs them in parallel automatically.
- **useMemo derives synthetic applications** — previously re-computed inside `loadApplications()` on every refresh; now only re-runs when either underlying query updates.
- **`refreshAfterMutation()` invalidates both `['MemberApplication']` and `['User']`** — because approving an application changes a user's role, and the User cache needs to reflect that for other admin views that read from it.

### `admin/Partners.jsx` — one query, two partitions

The old code had `partners` and `applications` as separate local state slices, both written from the same `Partner.list()` call in `load()`. The partitioning logic duplicated each time load ran. Now:

- **One useQuery** fetches all partners.
- **Two `useMemo` partitions** derive `partners` (approved) and `applications` (pending/rejected) from the single source of truth.
- Any mutation invalidates `['Partner']` and both partitions refresh together — no risk of drift.

### `admin/SupportTickets.jsx` — uses useCurrentUser from T2.1

Previously had `useCurrentUser` (added in T2.1) alongside a separate `useState+useCallback(load)` for tickets. Now the tickets fetch is a useQuery; `useCurrentUser` remains unchanged for author attribution on comments.

---

## Design decision: no `useMutation` conversion

The audit originally flagged T2.2b as the place to introduce the `useMutation` pattern. I considered it and decided against it for this PR. Reasons:

Each admin handler has meaningful per-handler logic that stays clearer as straight try/catch + await:

- **Email side-effects** — `handleAction` in Applications sends welcome/rejection emails after the DB write. `updateStatus` in SupportTickets does the same. Wrapping the email block in a separate mutation just to use `useMutation` for the DB write adds ceremony.
- **Partial-success paths** — Applications explicitly handles the case where the DB update succeeds but the email fails. It raises a `toast.warning` and still calls `refreshAfterMutation()`. This logic is clearer as linear code.
- **Confirm dialogs** — Partners' `remove()` uses `confirm()` before deleting. Splitting that out of the handler adds indirection.
- **Bundled toast messaging** — every handler builds its toast message from the action + entity, which is naturally inline.

**If you decide you want useMutation consolidation later**, it can be a separate small PR that only touches the mutation handlers. This PR stays focused on the read-side migration, matching T2.2a and T2.2e.

---

## What this does NOT do

- **No rendering changes.** JSX is untouched in all four files.
- **No useMutation** — see above.
- **No pagination** — `admin/Members.jsx` and `AdminDashboard` still pull the full User table. Tracked as T3.4.
- **No change to the synthetic-application logic** — it's just moved into useMemo. Behavior is identical.

---

## Dependencies

**Hard (must be merged first):**
- ✅ T2.1 (useCurrentUser hook) — `admin/SupportTickets.jsx` imports it
- ✅ T2.3 (scoped User.list) — `admin/Applications.jsx` expects the `User.filter({ member_status: 'pending' })` call shape
- ✅ T2.2a (directories useQuery) — this PR extends the same pattern; preflight checks for it on main

**Soft (not required):**
- T2.8 (error boundaries) — independent
- T2.2e (profiles) — sibling; either order works

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] **`admin/Members`** — as admin, visit `/admin/members`. Member list renders, filter by role works. Click Edit on a member, change their role, Save → list refetches and shows the updated role.
- [ ] **`admin/Applications`** — as admin, visit `/admin/applications`. List shows both real MemberApplications AND pending users without applications (synthetic entries). Approve one → toast, list refreshes, approved item disappears from pending filter. Reject one → same flow.
- [ ] **`admin/Applications` email failure path** — if email integration is flaky, the approval still writes to DB and surfaces `toast.warning` instead of `toast.error`. Should still refetch after.
- [ ] **`admin/Partners`** — as admin, visit `/admin/partners`. Tab switch between Partners and Applications works. Create a new partner → list refreshes, new entry visible. Delete one → confirm dialog, list refreshes. Approve a pending application → it moves from the Applications tab to the Partners tab.
- [ ] **`admin/SupportTickets`** — as admin, visit `/admin/support-tickets`. Filter tabs work. Change status on a ticket → list refetches. Post a comment → comment appears in the ticket thread. Both actions should email the member (existing behavior, unchanged).
- [ ] **Navigation cache check** — open `/admin/members`, navigate to `/admin/applications`, then back. Members view should render instantly from cache (no skeleton); data revalidates in background.

---

## Reviewer notes

- **`Applications.jsx` invalidation scope:** the key `['MemberApplication']` invalidates all MemberApplication queries (currently just the list) and `['User']` invalidates every User query (directories, pickers, profile pages, admin views). This is intentional — approving an application changes that user's role and member_status, so every cached User view needs to refresh.
- **`Partners.jsx` partitioning logic** is identical to before; just moved from setState inside load() into useMemo. Filter predicates unchanged.
- **Query keys use array-of-strings-plus-object form** (`['User', 'list', { sort: '-created_date' }]`) for consistency with T2.2a/e. react-query compares keys structurally so this gives us deduplication with other views that share the same shape.
- **The `refreshPartners()` and `refreshAfterMutation()` helpers** are tiny local utilities just to avoid repeating `queryClient.invalidateQueries(...)` four times in the same file. Keeps the mutation handlers readable.

---

## Progress on T2.2 fan-out

- ✅ T2.2a — Directory pages (3 files) [merged]
- ✅ T2.2e — Profile pages (3 files) [merged]
- ⏳ **T2.2b — Admin CRUD pages (4 files) [this PR]**
- ⏳ T2.2d — Deal board family (~3 files)
- ⏳ T2.2f — Dashboard pages (~4 files)
- ⏳ T2.2g — Public member pages (~2 files)
- ⚠️ T2.2c — Messaging pages — folds into T2.4 god-component decomposition

After this PR, 10 of ~18 page files are on useQuery. Remaining slices (T2.2d/f/g) are mechanical.
