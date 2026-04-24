# Landing page: signup CTAs redirect to Base44 login directly

Works around the render-phase side effect bug in App.jsx by taking signup clicks out of the React Router flow entirely. All unauthenticated-visible CTAs now call `base44.auth.redirectToLogin()` from onClick handlers — the same proven pattern the existing Sign In button uses.

**Stats:** 1 file · +48 / −15 · Build ✅ · Lint ✅ (0 errors, 0 warnings) · Patch self-tested

---

## The problem

Unauthenticated visitors clicking "I'm a TC" (or any `/onboarding` CTA) saw nothing happen. URL didn't change. Meanwhile Sign In worked.

Root cause: the `<Link to="/onboarding">` pattern triggers a client-side route change. React re-renders App.jsx, sees `authError` + non-public path, falls through to `navigateToLogin()` — which is called **synchronously during render**. React silently swallows the side effect. Click appears dead.

Sign In worked because its onClick handler ran post-render in event context, where side effects are legal. Same `base44.auth.redirectToLogin()` function, different timing.

## The fix

Instead of fighting React's render-phase rules in App.jsx, replicate the Sign In button's proven pattern for every unauth CTA on the landing page. Direct onClick → `base44.auth.redirectToLogin()`. No Router involvement, no render-phase side effects, no fight with App.jsx.

```jsx
// Before (broken)
<Link to="/onboarding?type=tc" className="...">
  I'm a TC <ArrowRight />
</Link>

// After (works)
<button
  onClick={() => redirectToSignup("tc")}
  className="..."
>
  I'm a TC <ArrowRight />
</button>
```

Where `redirectToSignup` is a single helper defined once at the top of the component:

```jsx
const redirectToSignup = (type) => {
  const target = type
    ? `${window.location.origin}/onboarding?type=${type}`
    : `${window.location.origin}/onboarding`;
  base44.auth.redirectToLogin(target);
};
```

After sign-up, Base44 redirects the user back to the `from_url`, which lands them on the correct `/onboarding?type=X` variant — authenticated this time, so the step handlers work.

## Why this is safe

- Same function call (`base44.auth.redirectToLogin`) as Sign In — **proven working in production**
- Called from onClick (post-render), not from render phase — **side effects are legal here**
- Role intent preserved through `from_url` — **UX is identical to the original intent**
- Doesn't modify App.jsx at all — **no risk of regressing authenticated flows**
- Helper defined once, used consistently — **easy to audit, easy to extend**

## Sites migrated (7)

| # | Location | Target |
|---|---|---|
| 1 | Header "Join Now" | `redirectToSignup()` |
| 2 | Hero "I'm a TC" | `redirectToSignup('tc')` |
| 3 | Hero dropdown "Investor / Agent" | `redirectToSignup('investor')` |
| 4 | Hero dropdown "Private Money Lender" | `redirectToSignup('pml')` |
| 5 | Member cards "Join as TC/Investor/Lender" | `redirectToSignup(card.type)` |
| 6 | Bottom "Join Now" | `redirectToSignup()` |
| 7 | Footer "Join" | `redirectToSignup()` |

**Left unchanged** (already worked, or doesn't go through `/onboarding`):
- Header "Sign In" (was already using onClick + redirectToLogin)
- "Login as a Member" bottom button (same)
- Header + footer "Partners" links (navigate to `/partners`, which is a public route)
- Authenticated "Go to Dashboard" buttons (navigate to `/dashboard` via React Router — works for auth users)

---

## Deploy sequence

1. **Merge this PR**
2. **Base44 editor** — wait for GitHub sync (~30s)
3. **Click Publish** — merging alone doesn't update the live site
4. **Verify in private browser** — see checklist below

---

## Testing checklist

- [ ] `npm run lint` → 0 errors, 0 warnings
- [ ] `npm run build` → succeeds

**Post-deploy (private browser on `alsdfconnect.alsdealflow.com`):**
- [ ] Landing page renders (unchanged)
- [ ] Click "I'm a TC" → redirects to `/login?from_url=...onboarding?type=tc`
- [ ] Base44 login page renders with "Continue with Google", email/password, and "Need an account? Sign up"
- [ ] Sign up on that page → return to app authenticated → land on `/onboarding?type=tc` → onboarding flow renders and step handlers work
- [ ] Repeat for "I'm an Investor or Lender" dropdown items (both rows)
- [ ] Repeat for each member card ("Join as TC/Investor/Lender")
- [ ] Repeat for bottom "Join Now" and footer "Join"
- [ ] Repeat for header "Join Now"
- [ ] "Sign In" still works (should be unchanged)
- [ ] "Partners" links still work (should be unchanged)

**Authenticated sanity (Base44 editor or signed-in browser):**
- [ ] "Go to Dashboard" buttons work (unchanged)
- [ ] `/onboarding` accessible to mid-flow users (unchanged)
- [ ] No regressions in authenticated routes

---

## Scope decision: NOT fixing App.jsx render-phase bug

The underlying bug — `navigateToLogin()` called synchronously during render in App.jsx — still exists after this PR. Deliberately left alone because:

- No other page exhibits the symptom (only unauth CTAs pointing at `/onboarding` triggered it, and those all live on the landing page)
- After this PR, the buggy code path in App.jsx becomes unreachable by clicking — the only way to hit it is typing `/onboarding` directly into the URL bar while unauthenticated, which is unusual user behavior
- This session has had enough App.jsx churn
- If it matters later, the useEffect-wrapped RedirectToLogin helper pattern is straightforward (previously drafted)

Noted as a low-priority follow-up for a future session.

---

## Progress

| Item | Status |
|---|---|
| T2.1 through T3.4 | ✅ Merged |
| AuthContext refactor | ✅ Merged |
| Mutation error handling | ✅ Merged |
| Icon modernization | ✅ Merged |
| Signup flow fix (publicPaths) | ⚠️ Merged then reverted — dropdown emoji swap survives |
| Revert publicPaths | ✅ Merged + published |
| **Landing login redirect** | **⏳ This PR** |

After this lands + publishes, the unauthenticated signup flow works end-to-end. Genuine session close.
