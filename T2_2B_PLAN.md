# T2_2B_PLAN.md — Admin CRUD Pages react-query Migration

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

Third slice of Tier 2, item 2 — the mechanical react-query fan-out. Migrates the four admin CRUD pages (Members, Applications, Partners, admin SupportTickets) using the template proved in T2.2a and extended in T2.2e.

---

## Goal

Apply `tier2-2b-admin-usequery.patch` to branch `tier2-2b-admin-usequery` on top of current `main`. Verify and open/update the PR with body from `T2_2B_PR.md`.

---

## Inputs (expected at repo root)

- `T2_2B_PLAN.md` — this file
- `tier2-2b-admin-usequery.patch` — git-formatted patch (1 commit, 4 files, +75/−63)
- `T2_2B_PR.md` — PR body

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
test -f tier2-2b-admin-usequery.patch && test -f T2_2B_PR.md

# Baselines:
#  - T2.1 (useCurrentUser) — admin/SupportTickets imports it
#  - T2.3 (scoped User.list) — Applications.jsx expects the scoped
#    User.filter({ member_status: 'pending' }) call shape
#  - T2.2a (directories useQuery) — same template extended here
# All three should be merged. The most reliable signal is T2.2a
# because it's the most recent strict dependency.

if ! test -f src/hooks/useCurrentUser.js; then
  echo "ERROR: src/hooks/useCurrentUser.js not found. Is T2.1 merged?"
  exit 1
fi

if ! grep -q "useQuery" src/pages/TCDirectory.jsx; then
  echo "ERROR: T2.2a (directories useQuery) not found on main. Merge T2.2a first."
  exit 1
fi

if ! grep -q 'User.filter({ member_status:' src/pages/admin/Applications.jsx; then
  echo "ERROR: T2.3 not found in Applications.jsx. Merge T2.3 first."
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="tier2-2b-admin-usequery"

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
git am tier2-2b-admin-usequery.patch
```

Expected: 1 commit, 4 files, +75/−63.

**On failure:** `git am --abort` and report. Do not hand-apply.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> T2.2b: Migrate 4 admin pages to useQuery
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors, ~10 pre-existing warnings (unused catch 'e' vars).
npx eslint --no-warn-ignored \
  src/pages/admin/Members.jsx \
  src/pages/admin/Applications.jsx \
  src/pages/admin/Partners.jsx \
  src/pages/admin/SupportTickets.jsx \
  2>&1 | tee /tmp/lint.out

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

# Sanity: no useEffect/useCallback remain in the four admin files
EFFECT_COUNT=$(grep -E "useEffect|useCallback" \
  src/pages/admin/Members.jsx \
  src/pages/admin/Applications.jsx \
  src/pages/admin/Partners.jsx \
  src/pages/admin/SupportTickets.jsx 2>/dev/null | wc -l)
echo "ℹ️  useEffect/useCallback occurrences in admin pages: $EFFECT_COUNT (expected: 0)"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier2-2b-admin-usequery
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier2-2b-admin-usequery"
TITLE="T2.2b: Migrate 4 admin pages to useQuery"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T2_2B_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T2_2B_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`T2_2B_PLAN.md`, `tier2-2b-admin-usequery.patch`, `T2_2B_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Phase 1 resets, Phase 2 reapplies, Phase 4 force-pushes with lease, Phase 5 updates existing PR.

---

## Expected completion output

```
✅ Phase 1: Branch tier2-2b-admin-usequery ready
✅ Phase 2: Applied 1 commit (4 files, +75/−63)
✅ Phase 3: Scoped lint (0 errors, ~10 pre-existing warnings) + Full lint (0 errors) + Build OK
            ℹ️  useEffect/useCallback occurrences in admin pages: 0
✅ Phase 4: Pushed to origin/tier2-2b-admin-usequery
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- This is the THIRD slice of T2.2. First was T2.2a (directories), second was T2.2e (profiles).
- The 10 pre-existing warnings on `unused catch 'e' vars` are from existing try/catch blocks in the email-notification paths. They're flagged but not fixed here to keep the PR focused on the useQuery migration.
- NO `useMutation` migration is included. The admin pages have meaningful per-handler logic (email side effects, partial-success paths, confirm dialogs) that stays clearer as try/catch + await. If you later decide to consolidate, that's a separate PR.
