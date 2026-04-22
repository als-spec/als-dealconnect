# LINT_CLEANUP_PLAN.md — Pre-existing Unused Imports

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

Separate, minimal-risk follow-up to the Tier 1 PR. Can be merged before, after, or alongside it — no dependency either direction.

---

## Goal

Apply `lint-cleanup.patch` to a new branch `lint-cleanup`, verify build, then create or update the corresponding GitHub PR.

---

## Inputs (expected at repo root)

- `LINT_CLEANUP_PLAN.md` — this file
- `lint-cleanup.patch` — git-formatted patch (1 commit, 13 files)
- `LINT_CLEANUP_PR.md` — PR body

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
test -f lint-cleanup.patch && test -f LINT_CLEANUP_PR.md
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="lint-cleanup"

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
git am lint-cleanup.patch
```

Expected: 1 commit, 13 files, +9/−18.

---

## Phase 3 — Verify

```bash
npm install

# This PR's whole reason for existing is to drop the error count to 0.
# Require zero errors on the full codebase.
npm run lint 2>&1 | tee /tmp/lint.out
if grep -qE "[1-9][0-9]* error" /tmp/lint.out; then
  echo "ERROR: lint still has errors after cleanup"
  exit 1
fi

# Build must succeed
npm run build
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin lint-cleanup
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="lint-cleanup"
TITLE="Clean up 24 pre-existing unused-import lint errors"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file LINT_CLEANUP_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file LINT_CLEANUP_PR.md
  gh pr view --web
fi
```

---

## Rerun semantics

Same as the Tier 1 plan — idempotent. Phase 1 resets, Phase 2 reapplies, Phase 4 force-pushes with lease, Phase 5 updates the existing PR in place.

---

## Expected completion output

```
✅ Phase 1: Branch lint-cleanup ready
✅ Phase 2: Applied 1 commit (13 files, +9/−18)
✅ Phase 3: Lint (0 errors, ~0 warnings) + Build OK
✅ Phase 4: Pushed to origin/lint-cleanup
✅ Phase 5: PR #<N> [created|updated] — <url>
```
