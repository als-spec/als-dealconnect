# POST_AUDIT_REVERT_ONBOARDING_PUBLICPATH_PLAN.md — Revert bad publicPaths change

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

**Urgency: production is broken.** The signup-flow-fix PR was merged + deployed. Unauthenticated visitors clicking landing-page CTAs reach `/onboarding` but the page never renders — they see cascading 403s and are stuck. This PR reverts the App.jsx change that caused that.

---

## Goal

Apply `post-audit-revert-onboarding-publicpath.patch` to branch `post-audit-revert-onboarding-publicpath` on top of current `main`. Verify, open the PR, and alert the human that Base44 needs to re-publish after merge.

---

## Inputs (expected at repo root)

- `POST_AUDIT_REVERT_ONBOARDING_PUBLICPATH_PLAN.md` — this file
- `post-audit-revert-onboarding-publicpath.patch` — git-formatted patch (1 commit, 1 file, +19/−13)
- `POST_AUDIT_REVERT_ONBOARDING_PUBLICPATH_PR.md` — PR body

---

## Preflight

```bash
git rev-parse --git-dir
git diff --quiet && git diff --cached --quiet || {
  echo "ERROR: working tree has uncommitted changes. Stash or commit first."
  exit 1
}
gh auth status
test -f post-audit-revert-onboarding-publicpath.patch && test -f POST_AUDIT_REVERT_ONBOARDING_PUBLICPATH_PR.md

# Baseline check: the bad publicPaths change must currently be present
# on main, otherwise this patch has nothing to revert.
if ! grep -q '"/", "/partners", "/onboarding"' src/App.jsx; then
  echo "ERROR: Expected to find the buggy publicPaths entry in src/App.jsx."
  echo ""
  echo "This patch reverts a change that added /onboarding to publicPaths."
  echo "If that line isn't present, either:"
  echo "  (a) the signup-flow-fix PR was never merged (no revert needed)"
  echo "  (b) something else has already reverted it"
  echo "  (c) App.jsx has diverged further and needs manual inspection"
  exit 1
fi

# The onboarding Route entry in the auth_required branch must also
# be present — that's the other half of what this patch removes.
if ! grep -A 6 'auth_required' src/App.jsx | grep -q '/onboarding'; then
  echo "ERROR: Expected to find /onboarding Route in the auth_required"
  echo "branch of App.jsx. The patch may have been partially reverted"
  echo "already. Inspect App.jsx manually."
  exit 1
fi

# Sanity: not already applied (post-revert state would have original publicPaths)
if grep -q 'const publicPaths = \["/", "/partners"\];' src/App.jsx; then
  echo "ERROR: publicPaths already looks reverted. Is this already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="post-audit-revert-onboarding-publicpath"

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
git am post-audit-revert-onboarding-publicpath.patch
```

Expected: 1 commit, 1 file, +19/−13.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> Revert: remove /onboarding from publicPaths
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint.
npx eslint --no-warn-ignored src/App.jsx 2>&1 | tee /tmp/lint.out
if grep -qE "[1-9][0-9]* error" /tmp/lint.out; then
  echo "ERROR: patch introduced lint errors"
  exit 1
fi

# Full codebase.
npm run lint 2>&1 | tee /tmp/full-lint.out
if grep -qE "[1-9][0-9]* error" /tmp/full-lint.out; then
  echo "ERROR: full codebase has lint errors"
  exit 1
fi

npm run build

# Sanity: publicPaths is back to original
if ! grep -q 'const publicPaths = \["/", "/partners"\];' src/App.jsx; then
  echo "ERROR: publicPaths not reverted"
  exit 1
fi

# Sanity: /onboarding Route is NOT in the auth_required branch
if grep -B 2 -A 8 'auth_required' src/App.jsx | grep -q 'path="/onboarding".*element={<Onboarding'; then
  # The authenticated-branch /onboarding Route is fine — only flag if
  # it's still in the auth_required section.
  if grep -A 8 'publicPaths.includes' src/App.jsx | grep -q 'path="/onboarding".*element={<Onboarding'; then
    echo "ERROR: /onboarding Route still present in auth_required branch"
    exit 1
  fi
fi
echo "✅ Revert applied — publicPaths back to [/, /partners]"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin post-audit-revert-onboarding-publicpath
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="post-audit-revert-onboarding-publicpath"
TITLE="Revert: remove /onboarding from publicPaths (production fix)"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file POST_AUDIT_REVERT_ONBOARDING_PUBLICPATH_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file POST_AUDIT_REVERT_ONBOARDING_PUBLICPATH_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Critical reminder for the human

After the PR is merged, tell the human:

> "PR merged. The production site is still running the broken version until you click **Publish** in Base44 again. Open the Base44 editor, confirm the sync pulled in the revert, and click Publish. Then verify in a private browser that clicking 'I'm a TC' on the landing page now redirects to the Base44 login page (with a Sign up option) instead of getting stuck on /onboarding with 403 errors."

Then ask:

> "Delete the three plan files from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Preflight's `test for publicPaths` check catches both double-application (would abort) and missing-baseline cases.

---

## Expected completion output

```
✅ Phase 1: Branch post-audit-revert-onboarding-publicpath ready
✅ Phase 2: Applied 1 commit (1 file, +19/−13)
✅ Phase 3: Scoped lint (0 errors) + Full lint (0 errors) + Build OK
            ✅ Revert applied — publicPaths back to [/, /partners]
✅ Phase 4: Pushed to origin/post-audit-revert-onboarding-publicpath
✅ Phase 5: PR #<N> [created|updated] — <url>
⚠️ Phase 6: Reminder — Base44 Publish required to update production
```

---

## Smoke test after merge AND Base44 publish

**Must do both — GitHub merge alone won't update the live site.**

1. Merge PR
2. Open Base44 editor, wait for GitHub sync to pull the revert
3. Click **Publish**
4. Open `alsdfconnect.alsdealflow.com` in a **private browser window**
5. Click **"I'm a TC"** on the hero
6. Expected: URL briefly changes to `/onboarding?type=tc`, then browser redirects to `alsdfconnect.alsdealflow.com/login?from_url=...`
7. Expected: Base44 login page renders with "Continue with Google", email/password fields, and "Need an account? **Sign up**" link
8. NOT expected: stuck on `/onboarding` with a blank page and console errors

If step 7 still shows the broken /onboarding page, the Publish didn't propagate — click Publish again and hard-refresh.

---

## Patch self-tested

Verified via `git apply --check` against a simulated production `main` before delivery — applies cleanly.
