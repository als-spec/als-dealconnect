# POST_AUDIT_MUTATION_TOASTS_PLAN.md — Mutation Error Handling

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

Outside-audit cleanup. Fixes silent failures in six handlers that call `base44.entities.X.update/create` without try/catch, plus introduces a small shared toast helper.

---

## Goal

Apply `post-audit-mutation-toasts.patch` to branch `post-audit-mutation-toasts` on top of current `main`. Verify and open/update the PR with body from `POST_AUDIT_MUTATION_TOASTS_PR.md`.

---

## Inputs (expected at repo root)

- `POST_AUDIT_MUTATION_TOASTS_PLAN.md` — this file
- `post-audit-mutation-toasts.patch` — git-formatted patch (1 commit, 7 files, +124/−30)
- `POST_AUDIT_MUTATION_TOASTS_PR.md` — PR body

---

## Preflight

```bash
git rev-parse --git-dir
git diff --quiet && git diff --cached --quiet || {
  echo "ERROR: working tree has uncommitted changes. Stash or commit first."
  exit 1
}
gh auth status
test -f post-audit-mutation-toasts.patch && test -f POST_AUDIT_MUTATION_TOASTS_PR.md

# Baselines
if ! test -f src/pages/admin/Members.jsx; then
  echo "ERROR: Members.jsx not found"
  exit 1
fi

# Sanity: refactor should NOT already be applied.
if test -f src/lib/toasts.js; then
  echo "ERROR: src/lib/toasts.js already exists. Is this already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="post-audit-mutation-toasts"

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
git am post-audit-mutation-toasts.patch
```

Expected: 1 commit, 7 files, +124/−30 (one new file, six edits).

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> Mutation error handling: fix silent failures in 6 handlers
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint on touched files — expect 0 errors.
npx eslint --no-warn-ignored \
  src/lib/toasts.js \
  src/pages/dashboard/AdminDashboard.jsx \
  src/pages/admin/Members.jsx \
  src/pages/TCProfilePage.jsx \
  src/pages/InvestorProfilePage.jsx \
  src/pages/PMLProfilePage.jsx \
  src/components/deals/PostDealForm.jsx \
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
if ! grep -q "toastMutationError" src/lib/toasts.js; then
  echo "ERROR: toastMutationError helper missing"
  exit 1
fi
if ! grep -q "toastMutationError" src/pages/admin/Members.jsx; then
  echo "ERROR: Members.jsx not using helper"
  exit 1
fi
echo "✅ All six silent-failure handlers now have error handling"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin post-audit-mutation-toasts
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="post-audit-mutation-toasts"
TITLE="Mutation error handling: fix silent failures in 6 handlers"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file POST_AUDIT_MUTATION_TOASTS_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file POST_AUDIT_MUTATION_TOASTS_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`POST_AUDIT_MUTATION_TOASTS_PLAN.md`, `post-audit-mutation-toasts.patch`, `POST_AUDIT_MUTATION_TOASTS_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Preflight check for `src/lib/toasts.js` catches double-application.

---

## Expected completion output

```
✅ Phase 1: Branch post-audit-mutation-toasts ready
✅ Phase 2: Applied 1 commit (7 files, +124/−30)
✅ Phase 3: Scoped lint (0 errors) + Full lint (0 errors) + Build OK
            ✅ All six silent-failure handlers now have error handling
✅ Phase 4: Pushed to origin/post-audit-mutation-toasts
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- Smoke test recommended after deploy:
    * As admin: pending application with an invalid state → approve → previously: button hangs; now: toast appears, button re-enables
    * As TC/Investor/PML: edit profile → disconnect network → save → previously: spinner forever; now: toast + edit mode restored
    * As Investor: click "Post a Deal" → disconnect network → submit → previously: button hangs, dialog stays open silently; now: toast + button re-enables, dialog stays open (retry-friendly)
- No user-visible copy changes for existing success flows. Only the error paths that previously showed nothing now show a toast.
