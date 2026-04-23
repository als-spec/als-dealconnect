# Revert: remove /onboarding from publicPaths (production fix)

**Production is currently broken.** This PR rolls back the `App.jsx` change from the signup-flow-fix PR. Merge and then click Publish in Base44 to restore the signup flow.

**Stats:** 1 file · +19 / −13 · Build ✅ · Full lint ✅ (0 errors) · Patch self-tested

---

## What's broken right now

The signup-flow-fix PR added `/onboarding` to `publicPaths` with the intent of letting unauthenticated visitors reach the signup form. It turns out the onboarding flow is not designed to run for unauthenticated users:

```js
// src/pages/Onboarding.jsx
const handleMemberTypeNext = async () => {
  await base44.auth.updateMe({ member_type: formData.member_type, ... });
  //          ^^^^^^^^^^^^^^^ requires authenticated session
};
```

Every step handler (`handleMemberTypeNext`, `handlePlanNext`, `handleNDAAccept`, `handleNonCompeteAccept`) calls `base44.auth.updateMe`. With the page now public, unauthenticated visitors reach it but hit cascading 403s on every background query:

- `GET /me` → 403
- `GET /api/apps/public/prod...` → 403
- `[queryCache] Query error: Base44Error: You must be logged in to access this app`
- `POST /app-logs/.../user-in-app/home` → 405
- ... and more

The page never successfully renders. Users clicking "I'm a TC" or "Join as TC" land on a blank error-flooded page.

Confirmed live by user:
> "onboarding never rendered and the PR was already merged"

---

## The correct flow (restored by this revert)

```
1. Unauthenticated visitor clicks "I'm a TC" on landing
2. Navigates to /onboarding?type=tc
3. App.jsx: /onboarding not in publicPaths → navigateToLogin()
4. Redirects to /login?from_url=...&type=tc
5. Base44's login page renders with:
     - Continue with Google SSO
     - Email + password form
     - "Need an account? Sign up" link   ←  new users go here
6. User signs up or signs in
7. Returns authenticated to /onboarding?type=tc
8. App.jsx sees valid user → /onboarding renders
9. Step handlers work because auth is present
```

Base44's login UI was always the intended signup entry point. The earlier attempt to bypass it broke the flow it was supposed to fix.

---

## The change

```diff
-  // (misleading comment about /onboarding being the signup entry point)
-  const publicPaths = ["/", "/partners", "/onboarding"];
+  // /onboarding is NOT in this list. Even though it's the destination
+  // of every landing-page CTA, unauthenticated users can't complete
+  // the flow — every step handler (handleMemberTypeNext, ...) calls
+  // base44.auth.updateMe which requires a valid session.
+  //
+  // The correct flow for new users: navigateToLogin() → Base44's
+  // login page (has 'Sign up' link) → return authenticated → reach
+  // /onboarding → step handlers work.
+  const publicPaths = ["/", "/partners"];
```

Plus removing the corresponding `<Route path="/onboarding">` from the `auth_required` Routes block.

**Longer comment on purpose.** I replaced the original misleading comment with one that explains WHY `/onboarding` is intentionally not public, so a future contributor (or me in a future session) doesn't make the same mistake.

---

## Dropdown emoji swap is PRESERVED

The signup-flow-fix PR bundled two changes. The App.jsx change was bad; the `LandingPage.jsx` dropdown emoji swap (🏗️ → Building2, 💼 → Landmark) was a fine cleanup. This revert touches ONLY `App.jsx`, so the good change stays.

---

## Files (1)

- `src/App.jsx` — revert publicPaths + Route change; rewrite comment to explain the design

---

## Deploy sequence

1. **Merge this PR to main**
2. **In the Base44 editor**, wait for GitHub sync to pull the revert (usually seconds)
3. **Click Publish** — this is required; merging to main alone doesn't update the live site
4. **Verify in private browser** — see testing checklist below

Without step 3, production stays broken.

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds

**Post-deploy (private browser, after Base44 Publish):**
- [ ] `alsdfconnect.alsdealflow.com/` — landing renders (unchanged)
- [ ] Click "I'm a TC" → URL briefly shows `/onboarding?type=tc`, then redirects to `/login?from_url=...`
- [ ] Base44 login page renders with "Continue with Google", email/password, and "Need an account? Sign up" link
- [ ] Click "I'm an Investor or Lender" → dropdown opens with Building2 / Landmark lucide icons (no emoji)
- [ ] Each dropdown item → same redirect-to-login flow
- [ ] Each "Join as X" member card → same redirect-to-login flow

**NOT expected:** stuck on `/onboarding` with a blank page and 403 errors in console.

**Authenticated sanity (Base44 editor or signed-in browser):**
- [ ] `/onboarding` still accessible to authenticated users (via the separate authenticated-branch `<Route>` in App.jsx)
- [ ] Step handlers still work
- [ ] Landing page still shows "Go to Dashboard" for authenticated visitors

---

## Progress

| Item | Status |
|---|---|
| T2.1 through T3.4 | ✅ Merged |
| AuthContext refactor | ✅ Merged |
| Mutation error handling | ✅ Merged |
| Icon modernization | ✅ Merged |
| Signup flow fix | ⚠️ Merged but broken; reverted by this PR (dropdown emoji swap preserved) |
| **Revert publicPaths** | **⏳ This PR** |

---

## Postmortem note (for the record)

My prior analysis missed that the onboarding step handlers require auth. I read `Onboarding.jsx`'s initial `loadUserState` (which does catch null-user gracefully via try/catch) and assumed the rest of the flow handled unauthenticated visitors. It doesn't. Should have traced through every handler before declaring the publicPaths change "safe."

Going forward: auth-adjacent changes get a full-flow trace of every mutating call before I ship.
