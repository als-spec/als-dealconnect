# T2_2F_PLAN.md — Dashboard Pages react-query Migration

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

Fifth slice of Tier 2, item 2. Migrates the four dashboard pages (TC, Investor, PML, Admin) using the template proved in T2.2a through T2.2d.

---

## Goal

Apply `tier2-2f-dashboards-usequery.patch` to branch `tier2-2f-dashboards-usequery` on top of current `main`. Verify and open/update the PR with body from `T2_2F_PR.md`.

---

## Inputs (expected at repo root)

- `T2_2F_PLAN.md` — this file
- `tier2-2f-dashboards-usequery.patch` — git-formatted patch (1 commit, 4 files, +146/−98)
- `T2_2F_PR.md` — PR body

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
test -f tier2-2f-dashboards-usequery.patch && test -f T2_2F_PR.md

# Baselines: T2.1 (useCurrentUser) and T2.2a (directories useQuery).
if ! test -f src/hooks/useCurrentUser.js; then
  echo "ERROR: src/hooks/useCurrentUser.js not found. Is T2.1 merged?"
  exit 1
fi

if ! grep -q "useQuery" src/pages/TCDirectory.jsx; then
  echo "ERROR: T2.2a (directories useQuery) not found on main. Merge T2.2a first."
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="tier2-2f-dashboards-usequery"

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
git am tier2-2f-dashboards-usequery.patch
```

Expected: 1 commit, 4 files, +146/−98.

**On failure:** `git am --abort` and report.

```bash
git log --oneline origin/main..HEAD
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors, ~4 pre-existing warnings (unused vars).
npx eslint --no-warn-ignored \
  src/pages/dashboard/TCDashboard.jsx \
  src/pages/dashboard/InvestorDashboard.jsx \
  src/pages/dashboard/PMLDashboard.jsx \
  src/pages/dashboard/AdminDashboard.jsx \
  2>&1 | tee /tmp/lint.out

if grep -qE "[1-9][0-9]* error" /tmp/lint.out; then
  echo "ERROR: patch introduced lint errors"
  exit 1
fi

# Full codebase — must be zero errors.
npm run lint 2>&1 | tee /tmp/full-lint.out
if grep -qE "[1-9][0-9]* error" /tmp/full-lint.out; then
  echo "ERROR: full codebase has lint errors"
  exit 1
fi

# Build must succeed.
npm run build

# Sanity: no useEffect/useCallback/load() remaining in dashboards.
REMAINING=$(grep -cE "useEffect|useCallback|\bload\(\)" \
  src/pages/dashboard/TCDashboard.jsx \
  src/pages/dashboard/InvestorDashboard.jsx \
  src/pages/dashboard/PMLDashboard.jsx \
  src/pages/dashboard/AdminDashboard.jsx 2>&1 | \
  awk -F: '{sum += $2} END {print sum+0}')
echo "ℹ️  useEffect/useCallback/load() occurrences in dashboards: $REMAINING (expected: 0)"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier2-2f-dashboards-usequery
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier2-2f-dashboards-usequery"
TITLE="T2.2f: Migrate 4 dashboard pages to useQuery"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T2_2F_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T2_2F_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`T2_2F_PLAN.md`, `tier2-2f-dashboards-usequery.patch`, `T2_2F_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Same pattern as prior plans.

---

## Expected completion output

```
✅ Phase 1: Branch tier2-2f-dashboards-usequery ready
✅ Phase 2: Applied 1 commit (4 files, +146/−98)
✅ Phase 3: Scoped lint (0 errors, ~4 pre-existing warnings) + Full lint (0 errors) + Build OK
            ℹ️  useEffect/useCallback/load() occurrences in dashboards: 0
✅ Phase 4: Pushed to origin/tier2-2f-dashboards-usequery
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- Fifth slice of T2.2. Only T2.2g (public member pages) will remain after this.
- Cache sharing: each dashboard uses per-entity queryKeys that match other pages already using useQuery. E.g., `['Deal', { investor_id }]` on InvestorDashboard shares cache with similar investor-scoped queries elsewhere. Navigation between dashboards and DealBoard should hit cache instantly.
