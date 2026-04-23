# Signup flow fix: /onboarding public + dropdown emoji cleanup

Small fix-up PR surfaced while smoke-testing the icon modernization deploy on the live URL.

**Stats:** 2 files · +21 / −3 · Build ✅ · Full lint ✅ (0 errors) · Patch self-tested via `git apply --check`

---

## Fix 1 — Add `/onboarding` to `publicPaths` (the real bug)

### What was broken

With Base44 configured as **"Public (login required)"**, unauthenticated visitors could see the landing page but any CTA that tried to navigate elsewhere triggered App.jsx's `auth_required` branch, which calls `navigateToLogin()`.

All landing-page signup CTAs link to `/onboarding?type=<role>`:
- Hero: "I'm a TC"
- Hero dropdown: "I'm an Investor or Lender" → Investor / PML
- Member cards: "Join as TC" / "Join as Investor" / "Join as Lender"
- Footer: "Join"

Since `/onboarding` wasn't in `publicPaths`, every single one of these buttons led to:
1. Browser navigates to `/onboarding?type=tc` (etc)
2. App.jsx auth check: `/onboarding` not in publicPaths
3. `navigateToLogin()` → Base44 login page
4. Visitor has no account yet → dead-end

**Chicken-and-egg problem: requiring login to sign up.** Users without accounts couldn't complete the signup flow.

### Why nobody noticed

Confirmed with user: testing was mostly done from inside the Base44 editor, where the editor user is already authenticated, so the `authedUser` branch of the LandingPage rendered instead ("Go to Dashboard" button). The broken unauthenticated flow was never hit.

This appears to have been a pre-existing bug since `publicPaths` was introduced — not caused by any recent PR.

### The fix

```diff
- const publicPaths = ["/", "/partners"];
+ const publicPaths = ["/", "/partners", "/onboarding"];
```

Plus the corresponding `<Route>` added to the `auth_required` Routes block.

### Why this is safe

`Onboarding.jsx` already handles `user === null` gracefully:
```js
try {
  user = await refetchUser();
} catch (e) {
  setLoading(false);
  return;  // stays on initial member_type step
}
if (!user) {
  setLoading(false);
  return;
}
```

The signup flow design is: unauthenticated visitor picks role → plan selection → Stripe checkout creates the Base44 account → back to onboarding for NDA / non-compete / pending approval. Auth happens inside the flow, not before it.

### Security note

`/onboarding` being public means any unauthenticated visitor (including bots) can render the form. That's the correct behavior for a signup flow, but worth flagging:

- The form itself doesn't mutate anything until the user reaches plan selection + Stripe
- Base44 provides the auth barrier at Stripe checkout time
- Rate limiting on the Stripe invoke function (if any) is Base44-side, not app-side

If spam becomes an issue, standard mitigations (Cloudflare Turnstile, hCaptcha before Stripe) can be added later.

---

## Fix 2 — Replace 2 missed emoji in dropdown (cleanup)

### What was missed

The icon modernization PR replaced emoji in the `MEMBER_CARDS` (Who We Serve section) with lucide icons — but missed the two emoji inside the hero section's "I'm an Investor or Lender" dropdown menu items:

```jsx
// Before — line 148
<span className="text-xl">🏗️</span>

// Before — line 160
<span className="text-xl">💼</span>
```

These only render when unauthenticated visitors click the dropdown, which is why they weren't caught in the first pass — the dropdown is a hover/click-to-reveal surface, not a top-level element.

### The fix

Same icons used in the Who We Serve cards, in smaller (32×32) teal-tinted tiles to match the compact dropdown row context:

```jsx
// After
<div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
  <Icon as={Building2} className="w-4 h-4 text-navy" />
</div>
```

`Building2` for Investor, `Landmark` for PML. Reuses imports already pulled in by icon modernization — no new dependencies.

---

## Files (2)

- `src/App.jsx` — `publicPaths` expanded to include `/onboarding`, new `<Route>` added to the auth_required branch, comment explaining the signup-flow rationale
- `src/pages/LandingPage.jsx` — two `<span className="text-xl">🏗️|💼</span>` swapped for `<div><Icon as={Building2|Landmark} /></div>`

---

## Dependencies

**Hard:** icon modernization PR (uses `Icon` component, `Building2` and `Landmark` imports from LandingPage.jsx)

**Soft:** none

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds

- [ ] **Public URL in private browser** (`alsdfconnect.alsdealflow.com`):
  - Landing page loads, shows unauthenticated CTAs ("I'm a TC" / "I'm an Investor or Lender")
  - Click "I'm a TC" → lands on `/onboarding?type=tc` with the onboarding form (not redirected to Base44 login)
  - Back to landing, click "I'm an Investor or Lender" → dropdown opens
  - Dropdown shows Investor / Agent and Private Money Lender items, each with a **lucide icon in a teal tile** (no emoji)
  - Click Investor → lands on `/onboarding?type=investor`
  - Click PML → lands on `/onboarding?type=pml`
  - All three "Join as X" card CTAs (if visible at current viewport) also work
- [ ] **Authenticated view** (inside Base44 editor or signed-in browser):
  - Landing page still shows "Go to Dashboard" button (unchanged)
  - Clicking it still navigates to /dashboard (unchanged)
  - All other authenticated flows still work

---

## Progress

| Item | Status |
|---|---|
| T2.1 through T3.4 | ✅ Merged |
| AuthContext refactor | ✅ Merged |
| Mutation error handling | ✅ Merged |
| Icon modernization | ✅ Merged |
| **Signup flow fix** | **⏳ This PR** |

After this lands, remaining work is non-code (T2.7 permission audit) or blocked (Sentry, Base44 aggregation) — see README for full backlog.
