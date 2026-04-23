# T3_4_PLAN.md — Admin Member-List Pagination

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

T3.4 from the audit — paginates `admin/Members.jsx` with numbered pages. Fixes real scaling pain: admins scrolling through a growing unbounded list will soon hit usability issues.

---

## Goal

Apply `tier3-4-admin-pagination.patch` to branch `tier3-4-admin-pagination` on top of current `main`. Verify and open/update the PR with body from `T3_4_PR.md`.

---

## Inputs (expected at repo root)

- `T3_4_PLAN.md` — this file
- `tier3-4-admin-pagination.patch` — git-formatted patch (1 commit, 2 files, +156/−16)
- `T3_4_PR.md` — PR body

---

## Preflight

```bash
git rev-parse --git-dir
git diff --quiet && git diff --cached --quiet || {
  echo "ERROR: working tree has uncommitted changes. Stash or commit first."
  exit 1
}
gh auth status
test -f tier3-4-admin-pagination.patch && test -f T3_4_PR.md

# Baseline: T2.2b (admin useQuery). Members.jsx was migrated there; this
# PR edits it further.
if ! grep -q "queryKey: \['User', 'list'" src/pages/admin/Members.jsx; then
  echo "ERROR: Members.jsx useQuery not found. Is T2.2b merged?"
  exit 1
fi

# Sanity: T3.4 should NOT already be applied
if grep -q "FETCH_CAP" src/pages/admin/Members.jsx; then
  echo "ERROR: FETCH_CAP already defined. Is T3.4 already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="tier3-4-admin-pagination"

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
git am tier3-4-admin-pagination.patch
```

Expected: 1 commit, 2 files, +156/−16.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> T3.4: Paginate admin/Members.jsx + clarify AdminDashboard scope
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors.
npx eslint --no-warn-ignored \
  src/pages/admin/Members.jsx \
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

# Sanity: expected changes are present
if ! grep -q "computePageNumbers" src/pages/admin/Members.jsx; then
  echo "ERROR: pagination helper missing"
  exit 1
fi
if ! grep -q "FETCH_CAP" src/pages/admin/Members.jsx; then
  echo "ERROR: FETCH_CAP constant missing"
  exit 1
fi
echo "✅ Pagination infrastructure in place"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier3-4-admin-pagination
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier3-4-admin-pagination"
TITLE="T3.4: Paginate admin/Members list"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T3_4_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T3_4_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`T3_4_PLAN.md`, `tier3-4-admin-pagination.patch`, `T3_4_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Preflight check for `FETCH_CAP` catches double-application.

---

## Expected completion output

```
✅ Phase 1: Branch tier3-4-admin-pagination ready
✅ Phase 2: Applied 1 commit (2 files, +156/−16)
✅ Phase 3: Scoped lint (0 errors) + Full lint (0 errors) + Build OK
            ✅ Pagination infrastructure in place
✅ Phase 4: Pushed to origin/tier3-4-admin-pagination
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- Smoke tests recommended after deploy:
    * Log in as admin. Navigate to /admin/members.
    * Verify member table renders, now with "Showing 1-25 of N" counter and page nav at the bottom (only if N > 25).
    * Click page 2, then page 3 → table updates immediately.
    * Type in search box → verify pagination resets to page 1.
    * Change role filter to "Investor" → pagination resets to page 1.
    * Click Prev/Next buttons — they disable at page 1 / last page.
    * Open Edit on a member → update → save → modal closes, table refreshes, pagination position reasonable.
- AdminDashboard is intentionally NOT paginated. Only the comment updated (see PR body for rationale).
