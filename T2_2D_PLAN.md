# T2_2D_PLAN.md — DealBoard react-query Migration

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

Fourth slice of Tier 2, item 2 — the mechanical react-query fan-out. Migrates `DealBoard.jsx` using the template proved in T2.2a / T2.2e / T2.2b.

Scope decision: the "deal board family" has three candidate files (DealBoard, DealDetailModal, MatchCard) but only DealBoard has page-level reads. The other two fetch inside mutation handlers and are deliberately left unchanged. See PR body for rationale.

---

## Goal

Apply `tier2-2d-dealboard-usequery.patch` to branch `tier2-2d-dealboard-usequery` on top of current `main`. Verify and open/update the PR with body from `T2_2D_PR.md`.

---

## Inputs (expected at repo root)

- `T2_2D_PLAN.md` — this file
- `tier2-2d-dealboard-usequery.patch` — git-formatted patch (1 commit, 1 file, +69/−41)
- `T2_2D_PR.md` — PR body

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
test -f tier2-2d-dealboard-usequery.patch && test -f T2_2D_PR.md

# Baselines: T2.1 (useCurrentUser) and T2.2a (directories useQuery).
# DealBoard imports useCurrentUser. T2.2a proves the useQuery template
# this patch extends.
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
BRANCH="tier2-2d-dealboard-usequery"

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
git am tier2-2d-dealboard-usequery.patch
```

Expected: 1 commit, 1 file, +69/−41.

**On failure:** `git am --abort` and report. Do not hand-apply.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> T2.2d: Migrate DealBoard to useQuery
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors, 1 pre-existing warning (unused isTC var).
npx eslint --no-warn-ignored src/pages/DealBoard.jsx 2>&1 | tee /tmp/lint.out

if grep -qE "[1-9][0-9]* error" /tmp/lint.out; then
  echo "ERROR: patch introduced lint errors"
  exit 1
fi

# Full codebase (errors only) — must be zero.
npm run lint 2>&1 | tee /tmp/full-lint.out
if grep -qE "[1-9][0-9]* error" /tmp/full-lint.out; then
  echo "ERROR: full codebase has lint errors"
  exit 1
fi

# Build must succeed.
npm run build

# Sanity: no useEffect/useCallback/loadData in DealBoard.jsx
REMAINING=$(grep -E "useEffect|useCallback|loadData" src/pages/DealBoard.jsx 2>/dev/null | wc -l)
echo "ℹ️  useEffect/useCallback/loadData occurrences in DealBoard: $REMAINING (expected: 0)"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier2-2d-dealboard-usequery
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier2-2d-dealboard-usequery"
TITLE="T2.2d: Migrate DealBoard to useQuery"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T2_2D_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T2_2D_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`T2_2D_PLAN.md`, `tier2-2d-dealboard-usequery.patch`, `T2_2D_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Phase 1 resets, Phase 2 reapplies, Phase 4 force-pushes with lease, Phase 5 updates existing PR.

---

## Expected completion output

```
✅ Phase 1: Branch tier2-2d-dealboard-usequery ready
✅ Phase 2: Applied 1 commit (1 file, +69/−41)
✅ Phase 3: Scoped lint (0 errors, 1 pre-existing warning) + Full lint (0 errors) + Build OK
            ℹ️  useEffect/useCallback/loadData occurrences in DealBoard: 0
✅ Phase 4: Pushed to origin/tier2-2d-dealboard-usequery
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- This is the FOURTH slice of T2.2. Previous slices were T2.2a (directories), T2.2e (profiles), T2.2b (admin CRUD).
- Only DealBoard.jsx is migrated. DealDetailModal.jsx and MatchCard.jsx fetch inside mutation handlers and are intentionally left alone (see PR body).
- The investor TCProfile fetch preserves the existing sequential loop inside a single useQuery. Base44's SDK has no batch filter for `id IN [...]`, so this is as good as it gets without adding a new backend endpoint.
