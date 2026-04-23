# Fix unauth navigation: move navigateToLogin into useEffect

**Production fix.** Even after the revert PR, unauthenticated visitors clicking landing-page CTAs don't navigate. URL doesn't change. This patch makes those clicks redirect to Base44's login page as intended.

**Stats:** 1 file · +39 / −2 · Build ✅ · Full lint ✅ (0 errors) · Patch self-tested

---

## The bug

Compare two buttons on the landing page:

| Button | Technique | Worked? |
|---|---|---|
| Sign In (header) | `onClick={() => base44.auth.redirectToLogin(window.location.href)}` | ✅ |
| Partners (header) | `<Link to="/partners">` | ✅ |
| **I'm a TC** | `<Link to="/onboarding?type=tc">` | ❌ |
| **Join as TC / Investor / Lender** | `<Link to="/onboarding?type=X">` | ❌ |
| **Join Now** (header + bottom) | `<Link to="/onboarding">` | ❌ |
| **I'm an Investor or Lender** | `<DropdownMenuItem onSelect={() => navigate(...)}>` | ❌ |

Everything pointing at `/onboarding` failed. Everything else worked.

## Why

```jsx
// App.jsx — before this fix
if (authError.type === "auth_required") {
  if (publicPaths.includes(currentPath)) {
    return <Routes>...</Routes>;  // public landing render
  }
  navigateToLogin();  // ← called during render
  return null;
}
```

`navigateToLogin()` calls `base44.auth.redirectToLogin()`, which sets `window.location`. **Calling a side effect during render is illegal in React.** Strict mode silently swallows the call; in dev mode React warns. The click triggers a re-render where `currentPath` becomes `/onboarding`, the conditional falls through, `navigateToLogin()` "runs" — but React's render phase suppresses the `window.location` write, so the page just... stays put.

Sign In worked because its onClick handler ran post-render in an event context, where side effects are legal. Same `base44.auth.redirectToLogin()` function, different timing.

## Why it didn't always show

This branch of App.jsx only executes for unauthenticated visitors on non-public paths. When Base44 was set to a more restrictive "Private" auth mode, Base44's own infrastructure intercepted every request before the React SPA booted — the buggy code path was never reached. Switching to "Public (login required)" lets the SPA boot for unauth users, which reveals this pre-existing bug.

**Not caused by any recent PR.** Not caused by the signup-flow-fix or its revert. Latent since the `navigateToLogin()` pattern was introduced.

## The fix

Move the redirect into a tiny helper component that runs the call inside `useEffect`:

```jsx
function RedirectToLogin({ navigateToLogin }) {
  useEffect(() => {
    navigateToLogin();
  }, [navigateToLogin]);
  return null;
}
```

And return it from the auth_required + non-public-path branch:

```diff
-  navigateToLogin();
-  return null;
+  return <RedirectToLogin navigateToLogin={navigateToLogin} />;
```

React runs the effect after commit (the legal side-effect phase), `window.location` is set, browser navigates to `/login?from_url=...`. Done.

`navigateToLogin` passed as a prop (instead of pulled from `useAuth` inside the helper) to keep the component dumb and independent of context.

---

## Files (1)

- `src/App.jsx` — adds `useEffect` import, adds `RedirectToLogin` helper component above `AuthenticatedApp`, replaces the inline `navigateToLogin(); return null;` with `return <RedirectToLogin ...>`. Most of the +39 is explanatory comments — the actual code change is tiny.

---

## Deploy sequence (same as every PR that touches the custom-domain deploy)

1. **Merge this PR** to main
2. **Base44 editor** — wait for GitHub sync (~30 seconds)
3. **Click Publish** — merging alone doesn't update the live site
4. **Verify in private browser** — see checklist below

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds

**Post-deploy (private browser, unauthenticated):**
- [ ] Visit `alsdfconnect.alsdealflow.com/` → landing renders
- [ ] Click "I'm a TC" → URL briefly changes to `/onboarding?type=tc` then redirects to `/login?from_url=...`
- [ ] Base44 login page renders (Google SSO, email/password, "Need an account? Sign up")
- [ ] Back to landing → click "I'm an Investor or Lender" dropdown → select Investor → same login redirect
- [ ] Back to landing → scroll down → click "Join as TC" card CTA → same login redirect
- [ ] Header "Join Now" → same login redirect
- [ ] Footer "Join" link → same login redirect

**Already-working paths still work:**
- [ ] Header "Sign In" → login redirect (was already working, shouldn't regress)
- [ ] Header "Partners" → navigates to partners page
- [ ] Clicking on hero "Premier Creative Finance Platform" badge or trust bar items → no-ops (unchanged)

**Authenticated sanity (Base44 editor or signed-in browser):**
- [ ] Landing shows "Go to Dashboard" button (unchanged)
- [ ] Clicking "Go to Dashboard" works (unchanged)
- [ ] /onboarding accessible for mid-flow authenticated users (unchanged)
- [ ] No regressions in any authenticated route

---

## Progress

| Item | Status |
|---|---|
| T2.1 through T3.4 | ✅ Merged |
| AuthContext refactor | ✅ Merged |
| Mutation error handling | ✅ Merged |
| Icon modernization | ✅ Merged |
| Signup flow fix | ⚠️ Merged (publicPaths part was bad; dropdown swap fine) |
| Revert publicPaths | ✅ Merged + published (reverted the bad part) |
| **Fix unauth navigation** | **⏳ This PR** |

After this lands + publishes, the full unauthenticated signup flow should work end-to-end.

---

## Session-end note

The bug here was a classic React footgun: side effects during render. The lesson isn't "always trace auth-adjacent code carefully" (I said that last time and still missed this) — it's that production's auth mode quietly changed at some point from "Private" to "Public (login required)", which reveals latent bugs in the React app's own auth handling. Worth auditing App.jsx's auth branches specifically for render-phase side effects once this settles.

Three follow-ups for a future session if you want them:
- Audit other `navigate*` or `window.location` calls throughout the codebase for the same during-render pattern
- Consider whether Base44 should stay on "Public (login required)" or move back to "Private" — depends on whether you want bots / scrapers to reach the landing page
- Add a React strict-mode-specific smoke test (private browser click-through) to the deploy routine for auth changes
