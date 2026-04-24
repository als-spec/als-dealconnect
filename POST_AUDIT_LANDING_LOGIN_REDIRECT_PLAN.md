# POST_AUDIT_LANDING_LOGIN_REDIRECT_PLAN.md — Landing CTAs redirect directly

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

Replaces `<Link to="/onboarding">` on the landing page with `<button onClick={base44.auth.redirectToLogin(...)}>`. Matches the pattern the existing Sign In button uses (confirmed working on live deploy). Sidesteps the render-phase side effect bug entirely.

---

## Goal

Apply `post-audit-landing-login-redirect.patch` to branch `post-audit-landing-login-redirect` on top of current `main`. Verify, open PR, remind the human about Base44 Publish.

---

## Inputs (expected at repo root)

- `POST_AUDIT_LANDING_LOGIN_REDIRECT_PLAN.md` — this file
- `post-audit-landing-login-redirect.patch` — git-formatted patch (1 commit, 1 file, +48/−15)
- `POST_AUDIT_LANDING_LOGIN_REDIRECT_PR.md` — PR body

---

## Preflight

```bash
git rev-parse --git-dir
git diff --quiet && git diff --cached --quiet || {
  echo "ERROR: working tree has uncommitted changes."
  exit 1
}
gh auth status
test -f post-audit-landing-login-redirect.patch && test -f POST_AUDIT_LANDING_LOGIN_REDIRECT_PR.md

# Baseline: revert PR must be merged, landing page must still have
# the Link-based CTAs the patch is replacing.
if ! grep -q 'const publicPaths = \["/", "/partners"\];' src/App.jsx; then
  echo "ERROR: publicPaths not in expected post-revert state."
  echo "Merge the revert PR first."
  exit 1
fi
if ! grep -q 'to="/onboarding?type=tc"' src/pages/LandingPage.jsx; then
  echo "ERROR: Expected to find <Link to=\"/onboarding?type=tc\"> in"
  echo "src/pages/LandingPage.jsx. Either already patched or structure"
  echo "has changed."
  exit 1
fi
if grep -q 'redirectToSignup' src/pages/LandingPage.jsx; then
  echo "ERROR: redirectToSignup helper already exists. Is this already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="post-audit-landing-login-redirect"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
  git reset --hard origin/main
else
  git checkout -b "$BRANCH" origin/main
fi
```

---

## Phase 2 — Apply patch

```bash
git am post-audit-landing-login-redirect.patch
```

Expected: 1 commit, 1 file, +48/−15.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> Landing page: signup CTAs redirect to Base44 login directly
```

---

## Phase 3 — Install + verify

```bash
npm install

npx eslint --no-warn-ignored src/pages/LandingPage.jsx 2>&1 | tee /tmp/lint.out
if grep -qE "[1-9][0-9]* error" /tmp/lint.out; then
  echo "ERROR: patch introduced lint errors"
  exit 1
fi

npm run lint 2>&1 | tee /tmp/full-lint.out
if grep -qE "[1-9][0-9]* error" /tmp/full-lint.out; then
  echo "ERROR: full codebase has lint errors"
  exit 1
fi

npm run build

# Sanity
if ! grep -q 'const redirectToSignup' src/pages/LandingPage.jsx; then
  echo "ERROR: redirectToSignup helper missing"
  exit 1
fi
if grep -q 'to="/onboarding?type=tc"' src/pages/LandingPage.jsx; then
  echo "ERROR: <Link to=\"/onboarding?type=tc\"> still present"
  exit 1
fi
echo "✅ Landing CTAs migrated to redirectToSignup pattern"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin post-audit-landing-login-redirect
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="post-audit-landing-login-redirect"
TITLE="Landing page: signup CTAs redirect to Base44 login directly"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file POST_AUDIT_LANDING_LOGIN_REDIRECT_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file POST_AUDIT_LANDING_LOGIN_REDIRECT_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Critical reminder for the human

```
PR merged. The fix is in GitHub but won't be live until you click
Publish in Base44. Open the Base44 editor, confirm sync pulled the
commit, and click Publish. Then verify in a private browser:

  1. Click 'I'm a TC' on the landing page
  2. Expected: redirects to /login?from_url=<site>/onboarding?type=tc
  3. Base44 login page renders with 'Continue with Google',
     email/password, and 'Need an account? Sign up' link
```

Then:

> "Delete the three plan files from the repo root, or leave for reference?"

---

## Expected completion output

```
✅ Phase 1: Branch ready
✅ Phase 2: Applied 1 commit (1 file, +48/−15)
✅ Phase 3: Lint OK, build OK
            ✅ Landing CTAs migrated to redirectToSignup pattern
✅ Phase 4: Pushed
✅ Phase 5: PR #<N> [created|updated] — <url>
⚠️ Phase 6: Reminder — Base44 Publish required
```

---

## Smoke test after merge AND Base44 publish

Private browser, `alsdfconnect.alsdealflow.com`:

- [ ] **Header "Join Now"** → redirects to `/login?from_url=...onboarding`
- [ ] **Hero "I'm a TC"** → redirects to `/login?from_url=...onboarding?type=tc`
- [ ] **Hero dropdown "I'm an Investor or Lender"**:
  - [ ] "Investor / Agent" row → redirects to `/login?from_url=...onboarding?type=investor`
  - [ ] "Private Money Lender" row → redirects to `/login?from_url=...onboarding?type=pml`
- [ ] **Member cards "Join as TC/Investor/Lender"** → each redirects to `/login` with corresponding `from_url`
- [ ] **Bottom "Join Now"** → redirects to `/login?from_url=...onboarding`
- [ ] **Footer "Join"** → redirects to `/login?from_url=...onboarding`

**Already-working paths unchanged:**
- [ ] Header "Sign In" → login (onClick pattern, was already working)
- [ ] "Login as a Member" bottom button → login (same)
- [ ] Header "Partners" → navigates to partners page
- [ ] Footer "Partners" → navigates to partners page

**Authenticated sanity:**
- [ ] "Go to Dashboard" header button → navigates to /dashboard
- [ ] "Go to Dashboard" hero button → navigates to /dashboard
- [ ] /onboarding accessible to mid-flow authenticated users
- [ ] No regressions in authenticated routes

---

## Patch self-tested against post-revert main via `git apply --check` — applies cleanly.
