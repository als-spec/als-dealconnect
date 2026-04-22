# T2.1: useCurrentUser hook — consolidate 16 redundant auth.me() calls

Tier 2, item 1 from the app audit. Introduces a shared, cached, react-query-backed hook as the single source of truth for the authenticated user. Migrates 12 call sites across the app to use it.

**Stats:** 13 files changed · +197 / −138 · Build ✅ · Full lint ✅ (0 errors)

---

## The problem this solves

Before this PR, every page that needed the current user did its own ad-hoc fetch:

```js
const [user, setUser] = useState(null);
useEffect(() => {
  base44.auth.me().then(setUser);
}, []);
```

Consequences:

- **16 redundant `base44.auth.me()` calls** across the app — every route transition re-fetched the user from scratch, even though it almost never changes during a session
- **Duplicated loading-state boilerplate** in every page (the user was null until the effect resolved)
- **No deduplication** — if two components needed the user in the same render tree, they'd both fetch independently
- **Fragmented query keys** — `PageNotFound` had its own `useQuery({ queryKey: ['user'] })` that never shared cache with anything
- **Error handling varied by file** — some silently caught, some threw, some toasted

---

## The fix

### New hook: `src/hooks/useCurrentUser.js`

Three exports:

```js
// Primary read — replaces useState+useEffect+base44.auth.me() patterns
const { data: user, isLoading } = useCurrentUser();

// Conditional fetch (e.g., wait for auth preflight)
const { data: user } = useCurrentUser({ enabled: !isLoadingAuth });

// Invalidate after mutations (soft refetch on next read)
const invalidateUser = useInvalidateCurrentUser();
await base44.auth.updateMe({ ... });
await invalidateUser();

// Imperative fresh fetch (used during onboarding's write-then-read flows)
const refetchUser = useRefetchCurrentUser();
const freshUser = await refetchUser();
```

Backing query:
- Single `queryKey: ['currentUser']` shared by every consumer
- `staleTime: 5 * 60 * 1000` — 5 minutes, appropriate for auth data
- `retry: 1` — match existing query client defaults

### Migrated files (12 call sites)

| File | Pattern |
|---|---|
| `src/App.jsx` | `useCurrentUser({ enabled: ... })` with gate from AuthContext |
| `src/pages/Dashboard.jsx` | Direct read, replaces useState+useEffect |
| `src/pages/Messages.jsx` | Direct read, dependent fetches key off `user?.id` |
| `src/pages/ServiceRequests.jsx` | Same |
| `src/pages/DealBoard.jsx` | Same, `loadData` now has `user` in deps |
| `src/pages/TCProfilePage.jsx` | Same, load uses useCallback keyed on user |
| `src/pages/PMLProfilePage.jsx` | Same |
| `src/pages/InvestorProfilePage.jsx` | Same |
| `src/pages/SupportTickets.jsx` | Same |
| `src/pages/admin/SupportTickets.jsx` | Same |
| `src/pages/Onboarding.jsx` | 4 call sites → `useRefetchCurrentUser` + `useInvalidateCurrentUser` for the write-then-read flows |
| `src/lib/PageNotFound.jsx` | Was using its own `queryKey: ['user']` — now consolidated |

### Intentionally NOT migrated

**`src/lib/AuthContext.jsx`** still has one `base44.auth.me()` call in the auth bootstrap. This is tightly integrated with the `public_settings` + `authError` lifecycle (the "is the app even loadable for this user" check). Refactoring it would expand scope meaningfully and risks regressions in the error-routing logic in `App.jsx` lines 62-78.

Tracked as a potential follow-up; not required for T2.1 to deliver its value.

---

## Call-site count after this PR

| Location | Count | Note |
|---|---|---|
| `src/hooks/useCurrentUser.js` | 2 | The canonical query fns |
| `src/lib/AuthContext.jsx` | 1 | Intentional (see above) |
| Everywhere else | 0 | Was 13 before this PR |

From 16 sites to 3. The remaining 3 are all appropriate (2 in the hook, 1 in the boot-sequence auth context).

---

## Behavior changes (explicit)

1. **Route transitions no longer re-fetch the user.** Previously, navigating from `/dashboard` to `/messages` triggered at least one `base44.auth.me()` round-trip. Now the result is cached for 5 minutes.

2. **Onboarding's write-then-read flows use imperative refetch.** Previously, steps did `updateMe(...)` then immediately called `base44.auth.me()` to read the updated user. Now they call `refetchUser()` which bypasses cache and fetches fresh. Behavior is equivalent; the explicit intent is clearer in code.

3. **Onboarding also invalidates the cache after decline/decline-to-back navigation** (`handleNDADecline`, `handleNonCompeteDecline`) so that if the user later re-enters the flow, they see the updated `onboarding_step`.

4. **`PageNotFound` no longer has its own query key.** Admin-note visibility check still works identically, but now shares cache with the rest of the app.

---

## What this unblocks

T2.1 is foundational. With this in place:

- **T2.2 (replace page-level useState+useEffect data fetches with useQuery)** is now mechanical — the pattern is established, consumers just follow it for other entities.
- **T2.4 (decompose god-components in Messages and ServiceRequests)** gets easier because `user` is no longer threaded through component state.
- **Future optimistic updates on user mutations** are now trivial via `queryClient.setQueryData(CURRENT_USER_KEY, ...)`.

---

## Testing checklist

- [ ] `npm run lint` → 0 errors (full codebase, `--quiet` suppresses warnings)
- [ ] `npm run build` → succeeds
- [ ] Navigate from `/` → `/dashboard` → `/messages` → `/service-requests` → `/deal-board` — observe in devtools Network tab that `base44.auth.me()` is called at most once across all transitions (previously: once per page)
- [ ] Complete an onboarding flow (member type → plan → NDA → non-compete) and confirm the step progression still writes correctly. After each step, reload the page — the flow should resume from the saved `onboarding_step`.
- [ ] As an admin, navigate to `/admin/members`, edit a member, save — no regression from the `AuthContext` bootstrap still happening in parallel.
- [ ] As a logged-out user, visit `/` → confirm LandingPage renders without spinning forever.

---

## What's NOT in this PR (deferred)

- T2.2 — page-level `useState+useEffect` fetches for entities (Deals, Messages, Threads, Tickets, etc.). The pattern is now established; the mechanical migrations come next.
- T2.3 — scoping the 8 `User.list()` calls with server-side filters.
- T2.4 — decomposing `Messages.jsx` and `ServiceRequests.jsx` into child components.
- `AuthContext.jsx` bootstrap migration.
- The `react-hooks/exhaustive-deps` warnings on pre-existing subscription-closure bugs in Messages (lines 54, 87). Separate fix.

See the full audit report for the Tier 2/3 roadmap.
