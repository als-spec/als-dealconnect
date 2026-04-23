# POST_AUDIT_SIGNUP_FLOW_FIX_PLAN.md — Signup flow fix

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

Two small fixes surfaced while smoke-testing icon modernization on the live URL:
1. Add `/onboarding` to `publicPaths` so unauthenticated visitors can reach the signup flow
2. Replace 2 missed emoji in the "I'm an Investor or Lender" dropdown with lucide icons

---

## Goal

Apply `post-audit-signup-flow-fix.patch` to branch `post-audit-signup-flow-fix` on top of current `main`. Verify and open the PR with body from `POST_AUDIT_SIGNUP_FLOW_FIX_PR.md`.

---

## Inputs (expected at repo root)

- `POST_AUDIT_SIGNUP_FLOW_FIX_PLAN.md` — this file
- `post-audit-signup-flow-fix.patch` — git-formatted patch (1 commit, 2 files, +21/−3)
- `POST_AUDIT_SIGNUP_FLOW_FIX_PR.md` — PR body

---

## Preflight

```bash
git rev-parse --git-dir
git diff --quiet && git diff --cached --quiet || {
  echo "ERROR: working tree has uncommitted changes. Stash or commit first."
  exit 1
}
gh auth status
test -f post-audit-signup-flow-fix.patch && test -f POST_AUDIT_SIGNUP_FLOW_FIX_PR.md

# Baseline: icon modernization must be merged. That PR introduced the
# Building2 and Landmark imports that this patch reuses for the dropdown
# items, and introduced the Icon wrapper component.
if ! test -f src/components/Icon.jsx; then
  echo "ERROR: src/components/Icon.jsx not found."
  echo "This patch depends on the icon-modernization PR being merged first."
  exit 1
fi
if ! grep -q 'Landmark' src/pages/LandingPage.jsx; then
  echo "ERROR: Landmark import not found in LandingPage.jsx."
  echo "Icon modernization PR may be only partially merged."
  exit 1
fi

# App.jsx baseline — this patch modifies publicPaths. Confirm the
# current state matches what the patch expects.
if ! grep -q 'const publicPaths = \["/", "/partners"\];' src/App.jsx; then
  echo "ERROR: App.jsx publicPaths does not match expected baseline."
  echo "The patch expects: const publicPaths = [\"/\", \"/partners\"];"
  echo "If your publicPaths has diverged, the patch will fail to apply."
  exit 1
fi

# Sanity: should NOT already be applied
if grep -q '"/onboarding"' src/App.jsx && grep -A2 "publicPaths =" src/App.jsx | grep -q "onboarding"; then
  echo "ERROR: /onboarding already in publicPaths. Is this already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="post-audit-signup-flow-fix"

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
git am post-audit-signup-flow-fix.patch
```

Expected: 1 commit, 2 files, +21/−3.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> Signup flow fix: /onboarding public + dropdown emoji cleanup
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors.
npx eslint --no-warn-ignored src/App.jsx src/pages/LandingPage.jsx 2>&1 | tee /tmp/lint.out

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

# Sanity
if ! grep -q '"/onboarding"' src/App.jsx; then
  echo "ERROR: /onboarding not added to App.jsx"
  exit 1
fi
if grep -q '🏗️\|💼' src/pages/LandingPage.jsx; then
  # Acceptable only inside a comment — check that
  if grep -v '^\s*//\|^\s*\*' src/pages/LandingPage.jsx | grep -q '🏗️\|💼'; then
    echo "ERROR: emoji still in LandingPage UI code"
    exit 1
  fi
fi
echo "✅ Signup flow fix applied"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin post-audit-signup-flow-fix
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="post-audit-signup-flow-fix"
TITLE="Signup flow fix: /onboarding public + dropdown emoji cleanup"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file POST_AUDIT_SIGNUP_FLOW_FIX_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file POST_AUDIT_SIGNUP_FLOW_FIX_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files from the repo root, or leave for reference?"

---

## Rerun semantics

Idempotent. Preflight catches double-application.

---

## Expected completion output

```
✅ Phase 1: Branch post-audit-signup-flow-fix ready
✅ Phase 2: Applied 1 commit (2 files, +21/−3)
✅ Phase 3: Scoped lint (0 errors) + Full lint (0 errors) + Build OK
            ✅ Signup flow fix applied
✅ Phase 4: Pushed to origin/post-audit-signup-flow-fix
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Smoke test after merge and Base44 publish

1. Open `alsdfconnect.alsdealflow.com` in a **private browser window** (so unauthenticated)
2. Click **"I'm a TC"** hero button
3. Expected: URL changes to `/onboarding?type=tc` and the onboarding form renders (starting at the member-type step with TC pre-selected)
4. NOT expected: redirect to Base44 login, blank page, or navigation that fails silently
5. Click back to landing, then click **"I'm an Investor or Lender"** dropdown
6. Expected: dropdown opens, shows Investor / Agent and Private Money Lender items — both with **lucide icons in teal tiles** (not emoji)
7. Click either dropdown item → lands on `/onboarding?type=investor` or `?type=pml`

If any step 3–7 fails, report with console output.

---

## Patch was self-tested

Verified via `git apply --check` against `main` before delivery — applies cleanly.
