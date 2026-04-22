# T2_1_PLAN.md — useCurrentUser Hook Migration

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

This is Tier 2, item 1 from the app audit. Applies a prepared patch to a fresh branch, verifies with lint + build, then creates or updates the PR.

---

## Goal

Apply `tier2-usecurrentuser.patch` to branch `tier2-usecurrentuser` on top of current `main`. Verify and open/update PR with body from `T2_1_PR.md`.

---

## Inputs (expected at repo root)

- `T2_1_PLAN.md` — this file
- `tier2-usecurrentuser.patch` — git-formatted patch (1 commit, 13 files)
- `T2_1_PR.md` — PR body

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
test -f tier2-usecurrentuser.patch && test -f T2_1_PR.md

# Baseline assumption: Tier 1 Quick Wins + lint cleanup PRs are merged.
# Quick sanity check — the useCurrentUser hook file should NOT exist yet.
if test -f src/hooks/useCurrentUser.js; then
  echo "ERROR: src/hooks/useCurrentUser.js already exists. Is T2.1 already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="tier2-usecurrentuser"

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
git am tier2-usecurrentuser.patch
```

Expected: 1 commit, 13 files, +197 / −138, 1 new file (`src/hooks/useCurrentUser.js`).

**On failure:** `git am --abort` and report. Do not hand-apply.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> T2.1: Add useCurrentUser hook, consolidate 16 base44.auth.me() calls

git diff --stat origin/main..HEAD | tail -3
# Should show 13 files changed, 197 insertions, 138 deletions
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint on touched files — expect 0 errors, some pre-existing
# warnings (unused catch 'e' vars, exhaustive-deps flags that are
# tracked as Tier 2.x follow-ups).
npx eslint --no-warn-ignored \
  src/hooks/useCurrentUser.js \
  src/App.jsx \
  src/lib/PageNotFound.jsx \
  src/pages/Dashboard.jsx \
  src/pages/Messages.jsx \
  src/pages/ServiceRequests.jsx \
  src/pages/DealBoard.jsx \
  src/pages/TCProfilePage.jsx \
  src/pages/PMLProfilePage.jsx \
  src/pages/InvestorProfilePage.jsx \
  src/pages/SupportTickets.jsx \
  src/pages/admin/SupportTickets.jsx \
  src/pages/Onboarding.jsx \
  2>&1 | tee /tmp/lint.out

if grep -qE "[1-9][0-9]* error" /tmp/lint.out; then
  echo "ERROR: patch introduced lint errors"
  exit 1
fi

# Full-codebase lint (quiet mode = errors only) — must be zero.
npm run lint 2>&1 | tee /tmp/full-lint.out
if grep -qE "[1-9][0-9]* error" /tmp/full-lint.out; then
  echo "ERROR: full codebase has lint errors"
  exit 1
fi

# Build must succeed.
npm run build

# Sanity grep: confirm migrations actually happened.
REMAINING=$(grep -r "base44\.auth\.me" src/ --include="*.jsx" --include="*.js" | wc -l)
echo "ℹ️  Remaining base44.auth.me() occurrences: $REMAINING (expected: 3 — 2 in useCurrentUser.js + 1 in AuthContext.jsx)"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier2-usecurrentuser
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier2-usecurrentuser"
TITLE="T2.1: useCurrentUser hook — consolidate 16 redundant auth.me() calls"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T2_1_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T2_1_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. The three plan files (`T2_1_PLAN.md`, `tier2-usecurrentuser.patch`, `T2_1_PR.md`) are still in the repo root but should not be committed. Delete them now, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Same as prior plans — idempotent. Phase 1 resets, Phase 2 reapplies, Phase 4 force-pushes with lease, Phase 5 updates the existing PR.

---

## Expected completion output

```
✅ Phase 1: Branch tier2-usecurrentuser ready
✅ Phase 2: Applied 1 commit (13 files, +197/−138)
✅ Phase 3: Scoped lint (0 errors, ~13 warnings) + Full lint (0 errors) + Build OK
            ℹ️  3 base44.auth.me() occurrences remain (expected: 2 in hook + 1 in AuthContext)
✅ Phase 4: Pushed to origin/tier2-usecurrentuser
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- The patch assumes both the Tier 1 Quick Wins PR AND the lint cleanup PR are already merged into `main`. The preflight check for the absence of `src/hooks/useCurrentUser.js` is a weak signal that this plan hasn't run before — but the patch itself depends on post-Tier-1 file contents (e.g., `toast.error` imports, `Message.filter` call shape in Messages.jsx).
- If `git am` fails with conflicts, it most likely means main has moved since this patch was generated — stop and ask the plan author to regenerate.
- Do NOT attempt to merge AuthContext.jsx into this change. That was an explicit scope decision; a separate PR can refactor it later.
