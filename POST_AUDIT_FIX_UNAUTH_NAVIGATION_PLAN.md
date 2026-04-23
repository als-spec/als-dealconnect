# POST_AUDIT_FIX_UNAUTH_NAVIGATION_PLAN.md — Fix unauth navigation

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

**Urgency: production signup flow still broken.** Even after the revert PR landed, unauthenticated visitors clicking "I'm a TC" / "Join as TC" / etc. do nothing — URL doesn't change, page stays put. This PR fixes that.

---

## Goal

Apply `post-audit-fix-unauth-navigation.patch` to branch `post-audit-fix-unauth-navigation` on top of current `main`. Verify and open PR. Remind the human that Base44 Publish is required post-merge.

---

## Inputs (expected at repo root)

- `POST_AUDIT_FIX_UNAUTH_NAVIGATION_PLAN.md` — this file
- `post-audit-fix-unauth-navigation.patch` — git-formatted patch (1 commit, 1 file, +39/−2)
- `POST_AUDIT_FIX_UNAUTH_NAVIGATION_PR.md` — PR body

---

## Preflight

```bash
git rev-parse --git-dir
git diff --quiet && git diff --cached --quiet || {
  echo "ERROR: working tree has uncommitted changes. Stash or commit first."
  exit 1
}
gh auth status
test -f post-audit-fix-unauth-navigation.patch && test -f POST_AUDIT_FIX_UNAUTH_NAVIGATION_PR.md

# Baseline: the revert PR must be merged. This patch builds on the
# state where publicPaths is back to ["/", "/partners"] only.
if ! grep -q 'const publicPaths = \["/", "/partners"\];' src/App.jsx; then
  echo "ERROR: publicPaths not in expected state."
  echo "This patch expects the revert PR to be merged, leaving"
  echo "publicPaths = [\"/\", \"/partners\"]."
  echo "If publicPaths still contains /onboarding, merge the revert first."
  exit 1
fi

# The specific broken call we're fixing must still be present.
if ! grep -qE '^\s*navigateToLogin\(\);' src/App.jsx; then
  echo "ERROR: The bare 'navigateToLogin();' call this patch is"
  echo "supposed to fix is no longer in src/App.jsx."
  echo ""
  echo "Either this patch was already applied, or App.jsx has been"
  echo "edited further. Inspect App.jsx manually."
  exit 1
fi

# Sanity: the fix component shouldn't already exist
if grep -q 'function RedirectToLogin' src/App.jsx; then
  echo "ERROR: RedirectToLogin component already exists. Is this"
  echo "already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="post-audit-fix-unauth-navigation"

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
git am post-audit-fix-unauth-navigation.patch
```

Expected: 1 commit, 1 file, +39/−2.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> Fix unauth navigation: move navigateToLogin into useEffect
```

---

## Phase 3 — Install + verify

```bash
npm install

npx eslint --no-warn-ignored src/App.jsx 2>&1 | tee /tmp/lint.out
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
if ! grep -q 'function RedirectToLogin' src/App.jsx; then
  echo "ERROR: RedirectToLogin component missing after apply"
  exit 1
fi
if grep -qE '^\s*navigateToLogin\(\);' src/App.jsx; then
  echo "ERROR: bare navigateToLogin() call still present"
  exit 1
fi
echo "✅ Fix applied — RedirectToLogin helper in place"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin post-audit-fix-unauth-navigation
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="post-audit-fix-unauth-navigation"
TITLE="Fix unauth navigation: move navigateToLogin into useEffect"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file POST_AUDIT_FIX_UNAUTH_NAVIGATION_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file POST_AUDIT_FIX_UNAUTH_NAVIGATION_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Critical reminder for the human

After the PR is merged, tell the human:

> "PR merged. The fix is in GitHub but won't be live until you click **Publish** in Base44. Open the Base44 editor, confirm the sync pulled the commit, and click Publish. Then verify in a private browser that clicking 'I'm a TC' on the landing page redirects to the Base44 login page."

Then:

> "Delete the three plan files from the repo root, or leave for reference?"

---

## Expected completion output

```
✅ Phase 1: Branch post-audit-fix-unauth-navigation ready
✅ Phase 2: Applied 1 commit (1 file, +39/−2)
✅ Phase 3: Scoped lint (0 errors) + Full lint (0 errors) + Build OK
            ✅ Fix applied — RedirectToLogin helper in place
✅ Phase 4: Pushed to origin/post-audit-fix-unauth-navigation
✅ Phase 5: PR #<N> [created|updated] — <url>
⚠️ Phase 6: Reminder — Base44 Publish required
```

---

## Smoke test after merge AND Base44 publish

1. Merge PR
2. Base44 editor → confirm GitHub sync
3. **Click Publish**
4. Private browser → `alsdfconnect.alsdealflow.com`
5. Click **"I'm a TC"**
6. Expected: browser navigates to `alsdfconnect.alsdealflow.com/login?from_url=...` and Base44's login page renders (with Google SSO, email/password, and "Need an account? Sign up")
7. Also test: "Join as TC" / "Join as Investor" / "Join as Lender" card CTAs, "Join Now" header button, "I'm an Investor or Lender" dropdown items. All should redirect to login.

---

## Patch self-tested against simulated prod main — applies cleanly.
