# T2_2E_PLAN.md — Profile Pages react-query Migration

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

Second slice of Tier 2, item 2 — the mechanical react-query fan-out. Migrates the three profile pages (TCProfilePage, PMLProfilePage, InvestorProfilePage) using the template proved out in T2.2a.

---

## Goal

Apply `tier2-2e-profiles-usequery.patch` to branch `tier2-2e-profiles-usequery` on top of current `main`. Verify and open/update the PR with body from `T2_2E_PR.md`.

---

## Inputs (expected at repo root)

- `T2_2E_PLAN.md` — this file
- `tier2-2e-profiles-usequery.patch` — git-formatted patch (1 commit, 3 files, +82/−83)
- `T2_2E_PR.md` — PR body

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
test -f tier2-2e-profiles-usequery.patch && test -f T2_2E_PR.md

# Baselines: T2.1 (useCurrentUser hook) and T2.2a (directories useQuery).
# The profile pages import useCurrentUser (from T2.1) and mirror the
# useQuery pattern proved in T2.2a.
if ! test -f src/hooks/useCurrentUser.js; then
  echo "ERROR: src/hooks/useCurrentUser.js not found. Is T2.1 merged?"
  exit 1
fi

if ! grep -q "useQuery" src/pages/TCDirectory.jsx; then
  echo "ERROR: T2.2a (directories useQuery) not found on main. Merge T2.2a first."
  exit 1
fi

# T2.3 (scoped User.list) is NOT strictly required for T2.2e — the profile
# pages already used scoped User.filter({ id: ... }) before T2.3. But if
# main is post-T2.3, this patch still applies cleanly.
# T2.8 (error boundaries) is NOT a dependency.
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="tier2-2e-profiles-usequery"

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
git am tier2-2e-profiles-usequery.patch
```

Expected: 1 commit, 3 files, +82/−83 (net -1).

**On failure:** `git am --abort` and report. Do not hand-apply.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> T2.2e: Migrate 3 profile pages to useQuery
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors, at most 1 pre-existing warning
# (PMLProfilePage has an unused 'Icon' destructured arg in a render helper,
# not introduced by this PR).
npx eslint --no-warn-ignored \
  src/pages/TCProfilePage.jsx \
  src/pages/PMLProfilePage.jsx \
  src/pages/InvestorProfilePage.jsx \
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

# Sanity: no useEffect/useCallback remains in the three profile files
EFFECT_COUNT=$(grep -E "useEffect|useCallback" src/pages/TCProfilePage.jsx src/pages/PMLProfilePage.jsx src/pages/InvestorProfilePage.jsx 2>/dev/null | wc -l)
echo "ℹ️  useEffect/useCallback occurrences in profile pages: $EFFECT_COUNT (expected: 0)"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier2-2e-profiles-usequery
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier2-2e-profiles-usequery"
TITLE="T2.2e: Migrate 3 profile pages to useQuery"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T2_2E_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T2_2E_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`T2_2E_PLAN.md`, `tier2-2e-profiles-usequery.patch`, `T2_2E_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Phase 1 resets, Phase 2 reapplies, Phase 4 force-pushes with lease, Phase 5 updates existing PR.

---

## Expected completion output

```
✅ Phase 1: Branch tier2-2e-profiles-usequery ready
✅ Phase 2: Applied 1 commit (3 files, +82/−83)
✅ Phase 3: Scoped lint (0 errors, 1 pre-existing warning) + Full lint (0 errors) + Build OK
            ℹ️  useEffect/useCallback occurrences in profile pages: 0
✅ Phase 4: Pushed to origin/tier2-2e-profiles-usequery
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- This is the SECOND slice of T2.2. First slice was T2.2a (directories). Future slices apply the same template to admin pages, deal board, dashboards, etc.
- One bug fix rides along: InvestorProfilePage now shows name/company when an admin views another user's profile. Previously the `profileUser` state stayed null in that case. Called out in the PR body so reviewers don't miss it.
- The TCProfilePage migration uses three parallel useQuery calls (profile → reviews, profile → user). Reviews waits for profile.id via `enabled: !!profile?.id` — react-query's natural cascade replaces manual sequencing.
