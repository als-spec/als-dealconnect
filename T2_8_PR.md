# T2.8: Error boundaries + global error handlers (safety net)

Tier 2, item 8 from the app audit. A safety net under runtime failures so white-screen crashes become recoverable error screens. Small, self-contained — intended to land before the bigger T2.2/T2.4 refactors so those get a net underneath.

**Stats:** 4 files changed · +161 / −3 · 1 new file · Build ✅ · Full lint ✅ (0 errors, 0 warnings on touched files)

---

## The problem this solves

Before this PR, a JavaScript error anywhere in the rendering tree produced a blank white page. A stale closure referencing a missing field, an unexpected null in an API response, a missing optional chain — any of these would take down the whole app.

Three gaps specifically:

1. **No React error boundary.** Render-phase errors propagated to the root and unmounted everything.
2. **No react-query error handler.** Query failures logged to console but had no user-facing signal.
3. **No unhandled promise rejection handler.** Stray `.then()` chains without `.catch()` failed silently.

---

## The fix

### 1. `src/components/ErrorBoundary.jsx` (new, ~110 lines)

Class-based React error boundary with a branded fallback UI:

```jsx
<ErrorBoundary>
  <AuthenticatedApp />
</ErrorBoundary>
```

Fallback UI:
- AlertTriangle icon in red circle
- "Something went wrong" heading
- Reassuring subcopy ("your work in other tabs is not affected")
- **Collapsible "Technical details" section** — shows the error message for debugging without alarming non-technical users
- Two recovery actions:
  - **Try again** — resets boundary state, re-renders children
  - **Go home** — hard navigation to `/` for a fresh state

Implementation notes:
- Uses `componentDidCatch` to log full stack + component stack (observability hook point for future Sentry/LogRocket)
- Supports optional render-prop `fallback` if a consumer needs custom UI
- Documents explicitly what it does NOT catch (event handler errors, async errors, SSR) and where those are handled instead

### 2. `src/lib/query-client.js` (upgraded)

Before: basic `QueryClient` with `refetchOnWindowFocus: false` and `retry: 1`.

After: adds `queryCache.onError` and `mutationCache.onError` handlers.

```js
queryCache: new QueryCache({
  onError: (error, query) => {
    // Only toast for BACKGROUND refresh failures (query.state.data !== undefined).
    // Initial-load failures render per-page empty/error states and would
    // double up with a toast.
    if (query.state.data !== undefined) {
      toast.error("We couldn't refresh this data. Please try again.");
    }
    console.error("[queryCache] Query error:", error);
  },
}),
mutationCache: new MutationCache({
  onError: (error) => {
    // Log-only — most mutation sites have local try/catch + toast.error already
    // (Applications.jsx, Messages.jsx, ServiceRequests.jsx). Adding a toast here
    // would duplicate. T2.2 will centralize when migrating to useMutation.
    console.error("[mutationCache] Mutation error:", error);
  },
}),
```

Two design decisions explicitly commented in the code:

- **Query toasts only on background refresh**, not initial load — prevents double-up with per-page "failed to load" states
- **Mutation errors log-only for now** — existing call sites already handle their own mutation failures; centralizing here would duplicate. Flagged as a T2.2 follow-up.

### 3. `src/main.jsx` (updated)

Adds a global `unhandledrejection` listener:

```js
window.addEventListener('unhandledrejection', (event) => {
  console.error('[unhandledrejection]', event.reason);
});
```

Catches stray promise rejections that escape both try/catch and react-query. Log-only today; observability hook point for Sentry.

### 4. `src/App.jsx` (updated)

Wraps `<AuthenticatedApp />` in `<ErrorBoundary>`. Placement is **inside** `<Router>` (so `Link`/`useNavigate` work in the fallback if needed) but **outside** `<AuthenticatedApp />` (so auth-related crashes still get caught).

```jsx
<AuthProvider>
  <QueryClientProvider client={queryClientInstance}>
    <Router>
      <ErrorBoundary>
        <AuthenticatedApp />
      </ErrorBoundary>
    </Router>
    <Toaster />
  </QueryClientProvider>
</AuthProvider>
```

---

## What this does NOT catch

Documented directly in the ErrorBoundary component's JSDoc:

- **Event handler errors** — React's design; use try/catch + toast.error locally
- **Async errors** — use useQuery/useMutation (caught by queryCache/mutationCache), or the global unhandledrejection listener catches strays
- **SSR errors** — not applicable, Vite client-only

---

## Design decisions worth flagging

### Why a single top-level boundary, not per-route?

Per-route boundaries would let one page crash without affecting navigation. Valuable but bigger refactor. For this PR the single top-level boundary is enough to prevent white-screens; per-route is a future enhancement.

### Why `console.error` instead of Sentry right now?

Sentry/LogRocket adds a dependency, DSN configuration, and operational overhead. All three error-logging sites (ErrorBoundary, queryCache, mutationCache, unhandledrejection) have a single-line swap-point documented in comments — when observability lands, they can all be wired up in one pass.

### Why not toast on mutation errors globally?

Every existing mutation site (Partners admin, Applications admin, Messages, ServiceRequests) already has its own try/catch + `toast.error`. A global mutation toast would duplicate every one of them. When T2.2 migrates those to `useMutation`, the local handlers can be removed and the global one activated. That's explicitly flagged in the comment.

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] Open DevTools console. Navigate around the app — normal usage should produce zero error logs.
- [ ] **Smoke test the boundary:** temporarily break something — e.g., add `throw new Error('test')` in the render of any page component. Reload. You should see:
  - The branded error UI with red AlertTriangle
  - The "Technical details" section expands to show your error message
  - Clicking "Try again" resets state (will re-throw if the bug is deterministic, so you may need "Go home")
  - Clicking "Go home" hard-navigates to `/` and the app recovers
  - Remove your test throw before committing
- [ ] **Smoke test the query cache handler:** temporarily point `base44Client.js` at a bad URL. Reload a data-heavy page (e.g., Dashboard). First load shows the page's own empty state (no toast); trigger a background refresh (e.g., react-query's `refetch`) and you should see the toast.
- [ ] Confirm console shows `[queryCache] Query error:` for query failures and `[unhandledrejection]` for raw rejections when they occur.

---

## Bundle size impact

~2KB gzipped. One small class component (ErrorBoundary) and three icons (`AlertTriangle`, `RefreshCcw`, `Home`) that aren't already in the bundle from other screens.

---

## What's next (remaining Tier 2)

- **T2.2** — Mechanical react-query migration for entity fetches (Deals, Threads, Tickets, etc.). Now much cleaner with the error handlers already in place — failing queries surface as toasts automatically. Can ship as multiple small PRs per page group.
- **T2.5** — Comment/document update race in ServiceRequests (data loss bug). Needs a design decision: refetch-then-merge (reduces window) vs. new Comment entity (eliminates race). Worth discussing before packaging.
- **T2.4** — Decompose Messages + ServiceRequests god-components. Benefits from the safety net that this PR establishes.
- **T2.6** — Route table refactor in App.jsx. Small, self-contained.
- **T2.7** — Base44 entity permission audit. Verification, not code.

See the full audit report for the Tier 2/3 roadmap.
