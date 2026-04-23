# T2_6_PLAN.md — Route Table Refactor

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

T2.6 from the app audit — extracts App.jsx's role-gated routes from four duplicated JSX blocks into a declarative data table. Small, self-contained, behavior-preserving.

---

## Goal

Apply `tier2-6-route-table.patch` to branch `tier2-6-route-table` on top of current `main`. Verify and open/update the PR with body from `T2_6_PR.md`.

---

## Inputs (expected at repo root)

- `T2_6_PLAN.md` — this file
- `tier2-6-route-table.patch` — git-formatted patch (1 commit, 2 files, +115/−84, 1 new file)
- `T2_6_PR.md` — PR body

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
test -f tier2-6-route-table.patch && test -f T2_6_PR.md

# Baseline: T2.1 (useCurrentUser). App.jsx depends on it.
if ! test -f src/hooks/useCurrentUser.js; then
  echo "ERROR: src/hooks/useCurrentUser.js not found. Is T2.1 merged?"
  exit 1
fi

# Sanity: src/lib/routes.jsx should NOT already exist
if test -f src/lib/routes.jsx; then
  echo "ERROR: src/lib/routes.jsx already exists. Is T2.6 already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="tier2-6-route-table"

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
git am tier2-6-route-table.patch
```

Expected: 1 commit, 2 files, +115/−84.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> T2.6: Extract route table into declarative data module
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors. (routes.jsx is in src/lib/ which is
# not included in the eslint config; intentional, matches existing
# modules like query-client.js.)
npx eslint --no-warn-ignored src/App.jsx 2>&1 | tee /tmp/lint.out

if grep -qE "[1-9][0-9]* error" /tmp/lint.out; then
  echo "ERROR: patch introduced lint errors in App.jsx"
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

# Sanity: file sizes
echo "ℹ️  File sizes:"
wc -l src/App.jsx src/lib/routes.jsx
echo "Expected: App.jsx ~107 lines (down from 180)"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier2-6-route-table
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier2-6-route-table"
TITLE="T2.6: Extract route table into declarative data module"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T2_6_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T2_6_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`T2_6_PLAN.md`, `tier2-6-route-table.patch`, `T2_6_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Preflight check for `src/lib/routes.jsx` catches double-application.

---

## Expected completion output

```
✅ Phase 1: Branch tier2-6-route-table ready
✅ Phase 2: Applied 1 commit (2 files, +115/−84)
✅ Phase 3: Scoped lint (0 errors) + Full lint (0 errors) + Build OK
            ℹ️  File sizes: App.jsx 107 lines (was 180), routes.jsx 105 lines
✅ Phase 4: Pushed to origin/tier2-6-route-table
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- This is the SMALL Tier 2 item. Pure refactor, zero runtime behavior change.
- Before committing locally, I verified routeforRole() returns the same paths for each role that the old per-role JSX blocks declared. All four roles (admin, tc, investor, pml) match exactly.
- Smoke test recommended after deploy: log in as each role, verify each route the role should have still loads and returns the correct page. Verify routes for the OTHER roles 404 (PageNotFound catch-all should still work).
