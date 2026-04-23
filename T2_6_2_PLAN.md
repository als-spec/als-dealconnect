# T2_6_2_PLAN.md — Admin Mutation-Gating

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

T2.6.2 — follow-up to T2.6.1. Hides mutation affordances for admin on the pages T2.6.1 gave them access to, per the spec "admins should only need to see the pages, not engage as a network member."

---

## Goal

Apply `tier2-6-2-admin-mutation-gating.patch` to branch `tier2-6-2-admin-mutation-gating` on top of current `main`. Verify and open/update the PR with body from `T2_6_2_PR.md`.

---

## Inputs (expected at repo root)

- `T2_6_2_PLAN.md` — this file
- `tier2-6-2-admin-mutation-gating.patch` — git-formatted patch (1 commit, 3 files, +58/−43)
- `T2_6_2_PR.md` — PR body

---

## Preflight

```bash
git rev-parse --git-dir
git diff --quiet && git diff --cached --quiet || {
  echo "ERROR: working tree has uncommitted changes. Stash or commit first."
  exit 1
}
gh auth status
test -f tier2-6-2-admin-mutation-gating.patch && test -f T2_6_2_PR.md

# Baselines: T2.6.1 (access expansion) and T2.4b (ServiceRequests decomp)
# must both be merged — this PR edits files created by T2.4b that were
# only made visible to admin by T2.6.1.

if ! test -f src/lib/routes.jsx; then
  echo "ERROR: src/lib/routes.jsx not found. Is T2.6 merged?"
  exit 1
fi

if ! grep -q "MEMBER_ROLES" src/lib/routes.jsx; then
  echo "ERROR: MEMBER_ROLES not found in routes.jsx. Is T2.6.1 merged?"
  exit 1
fi

if ! test -f src/components/service-requests/DocumentsSection.jsx; then
  echo "ERROR: DocumentsSection.jsx not found. Is T2.4b merged?"
  exit 1
fi

# Sanity: T2.6.2 should NOT already be applied
if grep -q "canUpload" src/components/service-requests/DocumentsSection.jsx; then
  echo "ERROR: canUpload already defined. Is T2.6.2 already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="tier2-6-2-admin-mutation-gating"

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
git am tier2-6-2-admin-mutation-gating.patch
```

Expected: 1 commit, 3 files, +58/−43.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> T2.6.2: Hide mutation affordances for admin (oversight-only)
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors.
npx eslint --no-warn-ignored \
  src/components/service-requests/DocumentsSection.jsx \
  src/components/service-requests/CommentsSection.jsx \
  src/components/service-requests/RequestDetail.jsx \
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
if ! grep -q "canUpload = currentUser?.role" src/components/service-requests/DocumentsSection.jsx; then
  echo "ERROR: canUpload check missing from DocumentsSection"
  exit 1
fi
if ! grep -q "canPost = currentUser?.role" src/components/service-requests/CommentsSection.jsx; then
  echo "ERROR: canPost check missing from CommentsSection"
  exit 1
fi
if grep -q 'userRole === "admin"' src/lib/serviceRequestUtils.js; then
  echo "ERROR: canAdvanceStatus still allows admin"
  exit 1
fi
echo "✅ All three gating changes present"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier2-6-2-admin-mutation-gating
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier2-6-2-admin-mutation-gating"
TITLE="T2.6.2: Hide mutation affordances for admin (oversight-only)"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T2_6_2_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T2_6_2_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`T2_6_2_PLAN.md`, `tier2-6-2-admin-mutation-gating.patch`, `T2_6_2_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Preflight check for `canUpload` catches double-application.

---

## Expected completion output

```
✅ Phase 1: Branch tier2-6-2-admin-mutation-gating ready
✅ Phase 2: Applied 1 commit (3 files, +58/−43)
✅ Phase 3: Scoped lint (0 errors) + Full lint (0 errors) + Build OK
            ✅ All three gating changes present
✅ Phase 4: Pushed to origin/tier2-6-2-admin-mutation-gating
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- This PR's scope is smaller than initially estimated. During reconnaissance, most mutation surfaces were found to be ALREADY correctly gated by existing role checks that didn't include admin (isInvestor for Post Deal, userRole === 'tc' for Apply, currentUserRole !== 'admin' for New Request, isOwner for Edit Profile). Only three places needed actual changes.
- Smoke test recommended after deploy:
    * Log in as admin. Navigate to /service-requests. Click a request.
    * Verify the "Mark as <next>" button is GONE at the top of the detail pane
    * Verify the "Upload" button is GONE in the Documents section
    * Verify the comment composer (textarea + send button) is GONE at the bottom
    * Verify existing comments and documents still render for reading
    * Log in as TC on same request — all three affordances should be visible and functional
