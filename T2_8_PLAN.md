# T2_8_PLAN.md — Error Boundaries + Global Error Handlers

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

Tier 2, item 8 from the app audit. Safety net for runtime failures before the bigger T2.2/T2.4 refactors land.

---

## Goal

Apply `tier2-error-boundaries.patch` to branch `tier2-error-boundaries` on top of current `main`. Verify and open/update the PR with body from `T2_8_PR.md`.

---

## Inputs (expected at repo root)

- `T2_8_PLAN.md` — this file
- `tier2-error-boundaries.patch` — git-formatted patch (1 commit, 4 files, +161/−3, 1 new file)
- `T2_8_PR.md` — PR body

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
test -f tier2-error-boundaries.patch && test -f T2_8_PR.md

# Baseline: T2.1 must be merged (the patch assumes useCurrentUser pattern).
# T2.3 merge is NOT strictly required but is the documented baseline.
if ! test -f src/hooks/useCurrentUser.js; then
  echo "ERROR: src/hooks/useCurrentUser.js not found. Is T2.1 merged?"
  exit 1
fi

# Sanity: ErrorBoundary must not already exist
if test -f src/components/ErrorBoundary.jsx; then
  echo "ERROR: src/components/ErrorBoundary.jsx already exists. Is T2.8 already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="tier2-error-boundaries"

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
git am tier2-error-boundaries.patch
```

Expected: 1 commit, 4 files, +161/−3, new file `src/components/ErrorBoundary.jsx`.

**On failure:** `git am --abort` and report. Do not hand-apply.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> T2.8: Error boundaries + global error handlers
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors, 0 warnings (all touched files are new or
# cleanly migrated; there's no pre-existing debt in these files).
npx eslint --no-warn-ignored \
  src/components/ErrorBoundary.jsx \
  src/lib/query-client.js \
  src/App.jsx \
  src/main.jsx \
  2>&1 | tee /tmp/lint.out

if grep -qE "[1-9][0-9]* error" /tmp/lint.out; then
  echo "ERROR: patch introduced lint errors"
  exit 1
fi

# Full codebase (quiet = errors only) — must be zero.
npm run lint 2>&1 | tee /tmp/full-lint.out
if grep -qE "[1-9][0-9]* error" /tmp/full-lint.out; then
  echo "ERROR: full codebase has lint errors"
  exit 1
fi

# Build must succeed.
npm run build

# Sanity: the new file exists
test -f src/components/ErrorBoundary.jsx && echo "✅ ErrorBoundary.jsx created"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier2-error-boundaries
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier2-error-boundaries"
TITLE="T2.8: Error boundaries + global error handlers (safety net)"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T2_8_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T2_8_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`T2_8_PLAN.md`, `tier2-error-boundaries.patch`, `T2_8_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Phase 1 resets, Phase 2 reapplies, Phase 4 force-pushes with lease, Phase 5 updates existing PR.

---

## Expected completion output

```
✅ Phase 1: Branch tier2-error-boundaries ready
✅ Phase 2: Applied 1 commit (4 files, +161/−3, 1 new file)
✅ Phase 3: Scoped lint (0 errors, 0 warnings) + Full lint (0 errors) + Build OK
            ✅ ErrorBoundary.jsx created
✅ Phase 4: Pushed to origin/tier2-error-boundaries
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- The patch depends on T2.1 being merged (for the `useCurrentUser` import that was added to App.jsx in T2.1). The preflight check catches this.
- No new dependencies — `@tanstack/react-query`, `sonner`, and `lucide-react` are already in package.json.
- Bundle size impact is minor (~2KB gzipped).
