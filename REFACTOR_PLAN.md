# REFACTOR_PLAN.md — Tier 1 Quick Wins + Landing Subscription Fixes

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

This is an idempotent, phased task. On rerun, steps should no-op where already applied and only push what changed.

---

## Goal

Apply two commits from a prepared patch file to a fresh branch `tier1-quick-wins`, verify with build + lint, then create or update the corresponding GitHub PR with the body in `PR_DESCRIPTION.md`.

---

## Inputs (expected at repo root)

- `REFACTOR_PLAN.md` — this file
- `tier1-quick-wins.patch` — git-formatted patch containing 2 commits
- `PR_DESCRIPTION.md` — PR body

If any are missing, stop and report.

---

## Preflight checks

Run these and stop on any failure:

```bash
# 1. We're in a git repo
git rev-parse --git-dir

# 2. Working tree is clean
git diff --quiet && git diff --cached --quiet || {
  echo "ERROR: working tree has uncommitted changes. Stash or commit first."
  exit 1
}

# 3. gh CLI is installed and authenticated
gh auth status

# 4. All three input files exist
test -f REFACTOR_PLAN.md && test -f tier1-quick-wins.patch && test -f PR_DESCRIPTION.md

# 5. Node deps installable
test -f package.json
```

---

## Phase 1 — Branch setup (idempotent)

```bash
# Ensure we're up to date with main
git fetch origin main

BRANCH="tier1-quick-wins"

# Create or switch to the branch
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
  # Reset to origin/main to re-apply cleanly (idempotent)
  git reset --hard origin/main
else
  git checkout -b "$BRANCH" origin/main
fi
```

---

## Phase 2 — Apply the patch

```bash
# Apply the 2 commits from the patch file
git am tier1-quick-wins.patch
```

**On failure:** run `git am --abort` and report the conflict. Do NOT try to hand-apply the changes — the patch has been verified to apply against the commit that `origin/main` was at when it was generated. If it no longer applies, main has moved and the plan author should regenerate.

**Expected result:** 2 new commits on the branch, 6 files changed (+84 / −55). Verify with:

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> Landing page: route all three subscription types correctly
#   <sha> Tier 1 quick wins: scoped message fetch, toast errors, cleanup

git diff --stat origin/main..HEAD
# Should show 6 files changed
```

---

## Phase 3 — Install + verify

```bash
# Install (only runs npm install if lockfile changed; fast no-op otherwise)
npm install

# Lint: the whole-codebase `npm run lint` is NOT the right gate here.
# origin/main has 24 pre-existing unused-import errors that are unrelated
# to this patch (documented as out-of-scope; tracked for a separate cleanup PR).
# Instead, lint ONLY the files this patch modifies — expected: 0 errors,
# ~8 warnings (the new react-hooks/exhaustive-deps warnings surface
# pre-existing subscription-closure bugs documented as Tier 2 work).
npx eslint --no-warn-ignored \
  src/pages/Messages.jsx \
  src/pages/ServiceRequests.jsx \
  src/pages/LandingPage.jsx \
  src/components/onboarding/PlanSelectionStep.jsx \
  eslint.config.js \
  2>&1 | tee /tmp/lint.out

# Fail only on errors in the touched files. Warnings are OK.
if grep -qE "[1-9][0-9]* error" /tmp/lint.out; then
  echo "ERROR: patch introduced lint errors in touched files"
  exit 1
fi

# Informational: report the pre-existing error count on the full codebase
# so the human knows there's a known cleanup backlog, but do NOT fail on it.
FULL_ERRORS=$(npm run lint 2>&1 | grep -oE "[0-9]+ errors?" | head -1 | grep -oE "[0-9]+" || echo "0")
echo "ℹ️  Note: full codebase has $FULL_ERRORS pre-existing lint errors (unrelated to this PR)."

# Build: must succeed
npm run build
```

**On any failure in Phase 3:** stop. Do NOT push. Report the failure with the relevant log lines.

---

## Phase 4 — Push

```bash
BRANCH="tier1-quick-wins"

# Push with --force-with-lease to safely update if branch already exists
# on origin (e.g., Phase 1 reset means we're rewriting history locally)
git push --force-with-lease -u origin "$BRANCH"
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier1-quick-wins"
TITLE="Tier 1 Quick Wins + Landing Page Subscription Fixes"

# Check if a PR already exists for this branch
EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  # Update existing PR body (push already happened in Phase 4, so commits
  # are already reflected — this just refreshes the description)
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file PR_DESCRIPTION.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  # Create new PR
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file PR_DESCRIPTION.md
  echo "Created PR"
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompts (ask the human)

After Phase 5 succeeds, ask the human:

> "PR is open. The three plan files (`REFACTOR_PLAN.md`, `tier1-quick-wins.patch`, `PR_DESCRIPTION.md`) are still in the repo root but should not be committed. Should I delete them now, or leave them for reference? They are already in `.gitignore`-safe territory because they were never staged."

Do NOT delete without explicit confirmation.

---

## Rerun semantics

If this plan is executed again (e.g., plan author updates the patch and says "re-run"):

- Phase 1 resets the branch to `origin/main` — safe, destroys only local branch state
- Phase 2 re-applies the patch fresh — deterministic result
- Phase 3 verifies again
- Phase 4 force-pushes with lease — safe because it only rewrites OUR branch
- Phase 5 detects existing PR and updates in place — no duplicate PRs

**Net effect:** running this plan N times converges to the same state. Safe to iterate.

---

## Notes for the executing agent

- **Do not** generate any edits not contained in `tier1-quick-wins.patch`. The patch is the source of truth.
- **Do not** rebase onto a commit other than `origin/main`. The patch was generated against it.
- **Do not** skip Phase 3 verification even if the patch applies cleanly — lint/build catch environment-level issues (node version mismatch, missing peer dep).
- If the human has added commits to `origin/main` that change `src/pages/Messages.jsx`, `src/pages/ServiceRequests.jsx`, `src/pages/LandingPage.jsx`, `src/components/onboarding/PlanSelectionStep.jsx`, `src/components/ProtectedRoute.jsx`, or `eslint.config.js` since the patch was generated, Phase 2 may fail with a conflict. In that case, report the affected files and stop — do not attempt to resolve.

---

## Expected completion output

```
✅ Phase 1: Branch tier1-quick-wins ready
✅ Phase 2: Applied 2 commits (6 files, +84/−55)
✅ Phase 3: Lint (0 errors, 8 warnings in touched files) + Build OK
            ℹ️  Full codebase has 24 pre-existing lint errors (separate cleanup PR)
✅ Phase 4: Pushed to origin/tier1-quick-wins
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```
