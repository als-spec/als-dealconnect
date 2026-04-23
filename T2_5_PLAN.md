# T2_5_PLAN.md — Comment/Document Race Quick Fix

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

T2.5 from the app audit — data-loss bug fix. Refetch-before-write pattern to prevent concurrent comments/documents from overwriting each other in ServiceRequests.

---

## Goal

Apply `tier2-5-comment-race-quickfix.patch` to branch `tier2-5-comment-race-quickfix` on top of current `main`. Verify and open/update the PR with body from `T2_5_PR.md`.

---

## Inputs (expected at repo root)

- `T2_5_PLAN.md` — this file
- `tier2-5-comment-race-quickfix.patch` — git-formatted patch (1 commit, 1 file, +33/−7)
- `T2_5_PR.md` — PR body

---

## Preflight

```bash
git rev-parse --git-dir
git diff --quiet && git diff --cached --quiet || {
  echo "ERROR: working tree has uncommitted changes. Stash or commit first."
  exit 1
}
gh auth status
test -f tier2-5-comment-race-quickfix.patch && test -f T2_5_PR.md

# Baseline: T2.1 (useCurrentUser). ServiceRequests.jsx imports it.
if ! test -f src/hooks/useCurrentUser.js; then
  echo "ERROR: src/hooks/useCurrentUser.js not found. Is T2.1 merged?"
  exit 1
fi

# Sanity: ServiceRequests.jsx should NOT already contain the fix
if grep -q "Refetch the fresh record before appending" src/pages/ServiceRequests.jsx; then
  echo "ERROR: T2.5 quick fix already appears to be applied."
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="tier2-5-comment-race-quickfix"

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
git am tier2-5-comment-race-quickfix.patch
```

Expected: 1 commit, 1 file, +33/−7.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> T2.5 quick fix: refetch-before-write for comments and documents
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors, ~3 pre-existing warnings (unused catch e).
npx eslint --no-warn-ignored src/pages/ServiceRequests.jsx 2>&1 | tee /tmp/lint.out

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

# Sanity: the fix should be present
if ! grep -q "Refetch the fresh record before appending" src/pages/ServiceRequests.jsx; then
  echo "ERROR: patch applied but fix comment not found. Inspect manually."
  exit 1
fi
echo "✅ Fix comments present in ServiceRequests.jsx"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier2-5-comment-race-quickfix
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier2-5-comment-race-quickfix"
TITLE="T2.5 quick fix: prevent comment/document race in ServiceRequests"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T2_5_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T2_5_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`T2_5_PLAN.md`, `tier2-5-comment-race-quickfix.patch`, `T2_5_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Same pattern as prior plans.

---

## Expected completion output

```
✅ Phase 1: Branch tier2-5-comment-race-quickfix ready
✅ Phase 2: Applied 1 commit (1 file, +33/−7)
✅ Phase 3: Scoped lint (0 errors, 3 pre-existing warnings) + Full lint (0 errors) + Build OK
            ✅ Fix comments present in ServiceRequests.jsx
✅ Phase 4: Pushed to origin/tier2-5-comment-race-quickfix
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- This is the QUICK fix, not the proper fix. The proper fix (separate Comment and Document entities keyed by request_id) remains open — multi-day refactor with data migration concerns.
- One extra round-trip per comment/document (the refetch). Noticeable? Yes, by a few tens of ms. Worth it? Yes — currently losing data.
- Two writers hitting inside the same millisecond can still conflict. In practice impossible for a two-party TC/investor flow.
