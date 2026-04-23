# T2.2g: Migrate 2 public member pages to useQuery (closes T2.2)

Sixth and **final** slice of the T2.2 react-query fan-out. Migrates the two remaining user-facing pages that still used `useState + useEffect + manual fetch`: PartnersPage (public directory) and SupportTickets (member ticket list).

**Stats:** 2 files changed · +19 / −23 (net −4) · Build ✅ · Full lint ✅ (0 errors)

---

## This PR completes T2.2

After this lands, the T2.2 fan-out is done. Tally:

| Slice | Files | PR |
|---|---|---|
| T2.2a | 3 (directories) | Merged |
| T2.2e | 3 (profile pages) | Merged |
| T2.2b | 4 (admin CRUD) | Merged |
| T2.2d | 1 (DealBoard) | Merged |
| T2.2f | 4 (dashboards) | Merged |
| **T2.2g** | **2 (public pages)** | **This PR** |
| **Total migrated** | **17 files** | |
| T2.2c (Messages, ServiceRequests) | 2 | Folds into T2.4 |
| Onboarding.jsx | 1 | Intentionally excluded (state-machine page) |

---

## What's migrated

### `src/pages/PartnersPage.jsx` — public partner directory

Simplest migration in the entire T2.2 series. One query, no mutations, no dependent queries, no cache invalidation:

```js
const { data: partners = [], isLoading: loading } = useQuery({
  queryKey: ['Partner', { is_active: true }],
  queryFn: () => base44.entities.Partner.filter({ is_active: true }),
});
```

The old code was also simple — a single `.then()` inside `useEffect`. The migration converts it to the useQuery pattern for consistency and cache sharing with admin Partners page (which uses `['Partner', 'list', { sort: '-created_date' }]` — different key, so no direct overlap, but the `['Partner']` prefix means admin mutations that invalidate `['Partner']` will correctly refresh this public view too).

### `src/pages/SupportTickets.jsx` — member ticket list

The member-facing counterpart to admin/SupportTickets (migrated in T2.2b). Converts `useCallback(load) + useEffect` to `useQuery` gated on user:

```js
const { data: tickets = [], isLoading: loading } = useQuery({
  queryKey: ['SupportTicket', { reported_by_user_id: user?.id }],
  queryFn: () => base44.entities.SupportTicket.filter({ reported_by_user_id: user.id }, "-created_date"),
  enabled: !!user?.id,
});

const refreshTickets = () => queryClient.invalidateQueries({ queryKey: ['SupportTicket'] });
```

Both mutation handlers (`handleSubmit` for new tickets, `handleComment` for replies) replaced their `load()` call with `refreshTickets()`. Invalidating the broad `['SupportTicket']` key also refreshes admin views of the same ticket if an admin has the admin page open — consistent with T2.2b's pattern.

---

## Intentional exclusions

Two pages remain with `useState + useEffect + manual fetch` after this PR. Both are intentional:

### `Messages.jsx` and `ServiceRequests.jsx` (deferred to T2.4)

These are the "god components" flagged in the audit — ~390 and ~490 lines respectively. Their fetch logic is tangled with:

- **Subscription lifecycle** — both subscribe to Base44 realtime events via `entity.subscribe(callback)` with complex cleanup semantics
- **Optimistic UI updates** — messages append locally before server confirmation
- **Cross-entity coordination** — comments trigger document-entity writes, message reads trigger thread-unread-state writes, etc.

Migrating these to useQuery piecemeal would leave them in a half-migrated state that's worse than either end. T2.4 will decompose them into focused child components, and the migration to useQuery happens cleanly as part of that extraction.

### `Onboarding.jsx` (not a useQuery fit)

State-machine page. User progresses linearly through member_type → plan_selection → checkout → nda → non_compete → pending_approval, writing to the User entity and then immediately reading it back to advance state. The imperative pattern `await updateMe(...); const freshUser = await refetchUser();` is the right tool for this flow.

Already uses `useRefetchCurrentUser` and `useInvalidateCurrentUser` from T2.1 — which is useQuery-powered under the hood. So this page benefits from the query client's cache without fighting its declarative model.

No change warranted.

---

## Dependencies

**Hard (must be merged first):**
- ✅ T2.1 (useCurrentUser) — SupportTickets imports it
- ✅ T2.2a (directories useQuery) — template established

**Soft (not required):**
- All other T2.2 slices — independent

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] **As a visitor (not logged in)** — visit `/partners`. Partner cards render. Filter by tier (All / Platinum / Gold / Preferred) works. "Become a Partner" modal opens, form submits, success state shown.
- [ ] **As an approved member** — visit `/partners`. Same behavior, plus "Go to Dashboard" button in nav (instead of Sign In / Join Now).
- [ ] **As a member** — visit `/support` (SupportTickets). Your own tickets render. Click "New Ticket" → form opens. Submit → toast success, list refreshes, new ticket appears.
- [ ] **Comment on a ticket** — expand a ticket, add a comment, submit → comment appears in the thread without a page reload.
- [ ] **Cache check** — as admin, open `/admin/support-tickets`, resolve a ticket. Navigate to `/support` as the original reporter (different user/tab simulated). Ticket status should reflect the resolution (either immediate if same session, or on next focus).
- [ ] **Navigation cache** — open `/partners`, navigate to `/` and back. Partners should render instantly from cache.

---

## Reviewer notes

- The `enabled: !!user?.id` on SupportTickets prevents an unauthenticated fetch from firing before useCurrentUser resolves. Consistent with T2.2e/f patterns.
- No `useMutation` conversion — same rationale as prior slices. handleSubmit and handleComment have meaningful per-handler logic (validation, local state resets, toasts).
- PartnersPage's filter/search UI is pure client state (`filter` useState). Unchanged.
- The public PartnersPage doesn't use useCurrentUser — it gets `user` passed as a prop from App.jsx. Preserved as-is.

---

## Final T2.2 reflection (not for merge, just observation)

Across six PRs, T2.2 migrated:
- **17 of ~18 page files** to useQuery
- Removed **~30 `useEffect` + `load()` patterns**
- Introduced **structured query keys** that dedupe across pages
- **Replaced `setLoading(true/false)` flags** with react-query's `isLoading`
- **Eliminated a class of "stale loading state" bugs** where a failed fetch could leave a spinner spinning forever
- Preserved every existing behavior (no regressions intended)

Remaining Tier 2 work: T2.4 (god-component decomposition, absorbs T2.2c), T2.5 (data-loss bug, pending design decision), T2.6 (route table refactor), T2.7 (Base44 permission audit — doc work).
