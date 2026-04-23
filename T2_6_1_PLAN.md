# T2_6_1_PLAN.md — Role Access Expansion

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

T2.6.1 — intentional behavior change following T2.6 (route table refactor). Per product spec, expands member access to the full networking core and restricts admin to oversight.

---

## Goal

Apply `tier2-6-1-access-expansion.patch` to branch `tier2-6-1-access-expansion` on top of current `main`. Verify and open/update the PR with body from `T2_6_1_PR.md`.

---

## Inputs (expected at repo root)

- `T2_6_1_PLAN.md` — this file
- `tier2-6-1-access-expansion.patch` — git-formatted patch (1 commit, 2 files, +78/−32)
- `T2_6_1_PR.md` — PR body

---

## Preflight

```bash
git rev-parse --git-dir
git diff --quiet && git diff --cached --quiet || {
  echo "ERROR: working tree has uncommitted changes. Stash or commit first."
  exit 1
}
gh auth status
test -f tier2-6-1-access-expansion.patch && test -f T2_6_1_PR.md

# Baseline: T2.6 (route table). This PR edits that file.
if ! test -f src/lib/routes.jsx; then
  echo "ERROR: src/lib/routes.jsx not found. Is T2.6 merged?"
  exit 1
fi

# Sanity: T2.6.1 should NOT already be applied
if grep -q "MEMBER_ROLES" src/lib/routes.jsx; then
  echo "ERROR: MEMBER_ROLES already defined. Is T2.6.1 already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="tier2-6-1-access-expansion"

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
git am tier2-6-1-access-expansion.patch
```

Expected: 1 commit, 2 files, +78/−32.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> T2.6.1: Expand role access for networking (routes + sidebar nav)
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors (1 pre-existing warning in Sidebar ok).
npx eslint --no-warn-ignored src/components/layout/Sidebar.jsx 2>&1 | tee /tmp/lint.out

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

# Sanity: the new constants exist
if ! grep -q "export const MEMBER_ROLES" src/lib/routes.jsx; then
  echo "ERROR: MEMBER_ROLES not defined in routes.jsx after patch"
  exit 1
fi
if ! grep -q "profile/investor" src/lib/routes.jsx; then
  echo "ERROR: /profile/investor route missing in routes.jsx"
  exit 1
fi
echo "✅ Route table + sidebar updated"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier2-6-1-access-expansion
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier2-6-1-access-expansion"
TITLE="T2.6.1: Expand role access for networking"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T2_6_1_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T2_6_1_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`T2_6_1_PLAN.md`, `tier2-6-1-access-expansion.patch`, `T2_6_1_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Preflight check for `MEMBER_ROLES` catches double-application.

---

## Expected completion output

```
✅ Phase 1: Branch tier2-6-1-access-expansion ready
✅ Phase 2: Applied 1 commit (2 files, +78/−32)
✅ Phase 3: Scoped lint (0 errors) + Full lint (0 errors) + Build OK
            ✅ Route table + sidebar updated
✅ Phase 4: Pushed to origin/tier2-6-1-access-expansion
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- This is a DELIBERATE behavior change. Unlike T2.6 (pure refactor), this PR grants new access for members and restricts some access for admin.
- Admin currently sees 'Post Deal' / 'Create Request' / 'Apply' buttons on the newly-accessible pages — that's INTENTIONAL for this PR. T2.6.2 follows up to hide those mutation affordances. Admins can click them in the meantime and the records will be created as admin, which is not ideal but not dangerous.
- Smoke test recommended after deploy:
    * Log in as a TC — verify Pipeline and Analytics sidebar links are now present
    * Log in as an Investor — verify Pipeline and Analytics sidebar links are present
    * Log in as a PML — verify Deal Board and Service Requests sidebar links are present
    * Log in as admin — verify Service Requests link is present; no Deal Board, Pipeline, or own-profile
    * Click an investor card's "View Profile" button — should now load (was 404 before)
