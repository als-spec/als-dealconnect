# AuthContext: remove dead state, prime react-query cache

Closes the T2.1 loop. T2.1 migrated 16 `base44.auth.me()` call sites to the `useCurrentUser` hook but intentionally left `AuthContext.jsx`'s imperative call alone because it was tangled with bootstrap sequencing and `authError` state routing. This PR untangles what's safely untanglable and leaves the load-bearing bootstrap flow intact.

**Stats:** 2 files changed · +91 / −104 (net −13) · Build ✅ · Full lint ✅ (0 errors)

---

## Why now, and why not bigger

After T2.1, every initial app load made **two separate `base44.auth.me()` requests**:

1. Inside `AuthContext.checkUserAuth()` — imperative, stored in the provider's local `user` state
2. Inside `App.jsx`'s `useCurrentUser()` — react-query-backed, stored in the query cache

They were on different caches so they couldn't dedupe. This PR stops the duplication by priming the react-query cache from AuthContext after a successful bootstrap.

What this PR deliberately does **not** attempt: converting AuthContext's imperative bootstrap to a declarative `useQuery` call. The bootstrap has strict ordering (public-settings → user check), and response errors route to specific `authError` types that App.jsx's render logic depends on. T2.1's original decision to leave this imperative was correct; this PR respects that.

---

## What changes

### 1. Prime the react-query cache after successful auth

`checkUserAuth` now calls `queryClientInstance.setQueryData(['currentUser'], user)` after a successful `base44.auth.me()`:

```js
const currentUser = await base44.auth.me();
queryClientInstance.setQueryData(['currentUser'], currentUser);
```

The `['currentUser']` key matches `useCurrentUser`'s queryKey. On first render, `App.jsx`'s `useCurrentUser({ enabled: !isLoadingAuth && ... })` finds the cache already populated and returns immediately — no network roundtrip.

### 2. Remove five dead exports

Verified via grep that **zero external consumers** read these:

| Export | Verdict |
|---|---|
| `user` | `useCurrentUser` is the source everywhere in the app |
| `isAuthenticated` | No consumers |
| `appPublicSettings` | Fetched, saved, never read |
| `logout` | Sidebar calls `base44.auth.logout()` directly, bypassing context |
| `checkAppState` | Only called internally via `useEffect` |

App.jsx only consumes `isLoadingAuth`, `isLoadingPublicSettings`, `authError`, `navigateToLogin` — those stay.

Deleting the unused exports means fewer things for future devs to accidentally couple to.

### 3. Internal simplifications

Smaller refactors that fell out naturally while cleaning up:

- **Flattened nested try/catch.** The original had a try/catch inside another try/catch, with both setting `authError`. Now a linear flow with a single `try` per step and an early-return when the app check fails (so the user check doesn't run and double-set `authError`).
- **public_settings response body dropped.** Was saved to state and never read. Now we just check `res.ok` and move on.
- **One `setIsLoadingAuth(false)` path per branch** instead of two.

---

## What stays exactly the same

Every user-facing behavior. Specifically:

- **Bootstrap sequence**: public_settings fetch → if OK and token present → user check → either success or authError. Same ordering, same response-to-authError mapping.
- **Unauthenticated public pages**: if there's no token, `checkAppState` returns before calling `checkUserAuth`, same as before. `/` and `/partners` still load without auth.
- **Error routing**: 403 with `extra_data.reason === 'auth_required'` → `authError.type === 'auth_required'`. Same for `user_not_registered` and the `unknown` catch-all.
- **`base44.auth.me()` call site**: still inside `checkUserAuth`. Not moved, not replaced with `useQuery`.
- **Provider nesting in App.jsx**: `<AuthProvider><QueryClientProvider>...` unchanged. `queryClientInstance` is a module-level singleton that AuthContext imports directly, so it's available regardless of provider order.

---

## What this PR does NOT do

- **No conversion to `useQuery`.** The imperative bootstrap stays imperative. `useQuery`'s declarative model fights the two-step ordering and the error-to-authError routing.
- **No change to Provider nesting.** Swapping to `<QueryClientProvider><AuthProvider>` would be the conventional React Query pattern, but there's no functional benefit here — AuthContext accesses `queryClientInstance` via import, not via `useQueryClient()`.
- **No logout through context.** Sidebar's direct `base44.auth.logout()` call is fine — logout doesn't need context-wide state coordination. Wrapping it in context now would just be ceremony.

---

## Verification performed before committing

- **Consumers of removed exports**: grep across `src/` for `isAuthenticated`, `appPublicSettings`, `.logout`, `checkAppState`, `useAuth().user` — zero matches outside `AuthContext.jsx` itself.
- **App.jsx uses**: confirmed App.jsx destructures only `isLoadingAuth`, `isLoadingPublicSettings`, `authError`, `navigateToLogin`. No `user` read from `useAuth()`.
- **Full codebase lint**: 0 errors.
- **Build**: succeeds.

---

## Manual smoke test (recommended after deploy)

Open DevTools → Network tab → filter "me" (or whatever Base44's auth.me endpoint path contains).

**Before:** hard refresh sees two `me` requests to the Base44 API.
**After:** hard refresh sees one.

(If your token is invalid, you'll see just the public_settings 403, same as before.)

---

## Dependencies

**Hard:**
- ✅ T2.1 (useCurrentUser) — this PR primes the cache that T2.1 put in place

**Soft:** none

No conflicts with any other PR. App.jsx gets a tiny comment update but no structural change.

---

## Reviewer notes

- **The one `eslint-disable-next-line`** in the useEffect (for `react-hooks/exhaustive-deps`) is deliberate: `checkAppState` doesn't depend on props or state, so an empty dep array is correct. Matching patterns exist in `src/hooks/useThreadMessages.js` from T2.4a. (Note: `src/lib/` isn't in the eslint config's file patterns, so the disable is effectively a comment for humans — but I put it there anyway for consistency and in case the config is ever expanded.)
- **No breaking changes for future consumers.** If someone adds a component that wants `user` from context, they'll get a destructuring `undefined`. The right fix is for them to use `useCurrentUser()` instead — which is what every other page already does.
- **`queryClientInstance` import from `@/lib/query-client`** uses the same path everything else does. No new module coupling introduced.

---

## Progress

| Item | Status |
|---|---|
| T2.1, T2.3, T2.8 | ✅ Merged |
| T2.2a/b/d/e/f/g | ✅ Merged |
| T2.4a/b, T2.5 | ✅ Merged |
| T2.6, T2.6.1, T2.6.2 | ✅ Merged |
| T3.4 pagination | ✅ Merged |
| **AuthContext refactor** | **⏳ This PR** |
| T2.7 permission audit (doc) | Remaining Tier 2 (not code) |
| Mutation toast consolidation | Outside-audit, small |
| AdminDashboard server-side aggregation | Outside-audit, requires Base44 function |
| Observability wiring | Blocked on Sentry setup decision |

After this lands, the T2.1 useCurrentUser story is truly complete. `base44.auth.me()` appears in exactly one place in the codebase (AuthContext.checkUserAuth), and the result flows into the same cache every other consumer reads from.
