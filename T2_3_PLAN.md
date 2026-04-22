# T2_3_PLAN.md — Scope User.list() Calls

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

Tier 2, item 3 from the app audit — the scale unblocker originally ranked #3 in the audit's priority queue. Applies a prepared patch, verifies, then creates/updates the PR.

---

## Goal

Apply `tier2-scope-user-list.patch` to branch `tier2-scope-user-list` on top of current `main`. Verify and open/update the PR with body from `T2_3_PR.md`.

---

## Inputs (expected at repo root)

- `T2_3_PLAN.md` — this file
- `tier2-scope-user-list.patch` — git-formatted patch (1 commit, 8 files)
- `T2_3_PR.md` — PR body

If any are missing, stop and report.

---

## Preflight

```bash
git rev-parse --git-dir
git diff --quiet && git diff --cached --quiet || {
  echo "ERROR: working tree has uncommitted changes. Stash or commit first."
  exit 1
}
gh auth status
test -f tier2-scope-user-list.patch && test -f T2_3_PR.md

# Baseline assumption: Tier 1 Quick Wins, lint cleanup, and T2.1 are all
# merged. Quick sanity check — the useCurrentUser hook should exist.
if ! test -f src/hooks/useCurrentUser.js; then
  echo "ERROR: src/hooks/useCurrentUser.js not found. Is T2.1 merged?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="tier2-scope-user-list"

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
git am tier2-scope-user-list.patch
```

Expected: 1 commit, 8 files, +43/−12.

**On failure:** `git am --abort` and report. Do not hand-apply.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> T2.3: Scope 6 of 8 User.list() calls with server-side filters
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint on touched files.
npx eslint --no-warn-ignored \
  src/pages/InvestorDirectory.jsx \
  src/pages/PMLDirectory.jsx \
  src/pages/TCDirectory.jsx \
  src/pages/Messages.jsx \
  src/pages/ServiceRequests.jsx \
  src/pages/admin/Applications.jsx \
  src/pages/admin/Members.jsx \
  src/pages/dashboard/AdminDashboard.jsx \
  2>&1 | tee /tmp/lint.out

if grep -qE "[1-9][0-9]* error" /tmp/lint.out; then
  echo "ERROR: patch introduced lint errors"
  exit 1
fi

# Full-codebase lint (errors only) — must be zero.
npm run lint 2>&1 | tee /tmp/full-lint.out
if grep -qE "[1-9][0-9]* error" /tmp/full-lint.out; then
  echo "ERROR: full codebase has lint errors"
  exit 1
fi

# Build must succeed.
npm run build

# Sanity grep: verify migration landed.
LIST_COUNT=$(grep -rn "base44\.entities\.User\.list" src/ --include="*.jsx" --include="*.js" | wc -l)
FILTER_COUNT=$(grep -rn "base44\.entities\.User\.filter" src/ --include="*.jsx" --include="*.js" | wc -l)
echo "ℹ️  User.list() remaining: $LIST_COUNT (expected: 2 — both admin-only, documented)"
echo "ℹ️  User.filter() total:    $FILTER_COUNT (expected: 9)"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier2-scope-user-list
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier2-scope-user-list"
TITLE="T2.3: Scope 6 of 8 User.list() calls — scale unblocker"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T2_3_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T2_3_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`T2_3_PLAN.md`, `tier2-scope-user-list.patch`, `T2_3_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Phase 1 resets, Phase 2 reapplies, Phase 4 force-pushes with lease, Phase 5 updates the existing PR.

---

## Expected completion output

```
✅ Phase 1: Branch tier2-scope-user-list ready
✅ Phase 2: Applied 1 commit (8 files, +43/−12)
✅ Phase 3: Scoped lint (0 errors) + Full lint (0 errors) + Build OK
            ℹ️  User.list() remaining: 2 (admin only, documented)
            ℹ️  User.filter() total:    9
✅ Phase 4: Pushed to origin/tier2-scope-user-list
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- This patch assumes Tier 1, lint-cleanup, AND T2.1 are merged. The preflight will catch the T2.1 dependency. Tier 1 / lint-cleanup are implicit via file content assumptions.
- If `git am` fails with conflicts, main has likely moved — stop and ask for a regenerated patch.
- The 2 retained `User.list()` sites (admin/Members.jsx, AdminDashboard.jsx) are intentional; do NOT remove them.
- **Base44 backend caveat:** the patch uses single-key `User.filter({ role: ... })` and `User.filter({ member_status: ... })`. Those keys are defined on the User entity per `base44/entities/User.jsonc`, so the filter should be supported. If the Base44 SDK reports that a field isn't filterable at runtime, that's a Base44 configuration issue (missing index), not a code issue — in that case the filter call would error and the page would show empty state. This is the one thing worth spot-checking after deploy.
