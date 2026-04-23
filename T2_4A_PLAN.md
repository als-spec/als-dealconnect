# T2_4A_PLAN.md — Messages God-Component Decomposition

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

T2.4a from the app audit — decomposes the 395-line `Messages.jsx` god-component into a thin orchestrator plus four focused child components and two helpers. Absorbs T2.2c (Messages react-query migration).

---

## Goal

Apply `tier2-4a-messages-decomp.patch` to branch `tier2-4a-messages-decomp` on top of current `main`. Verify and open/update the PR with body from `T2_4A_PR.md`.

---

## Inputs (expected at repo root)

- `T2_4A_PLAN.md` — this file
- `tier2-4a-messages-decomp.patch` — git-formatted patch (1 commit, 7 files, +684/−362, 6 new files)
- `T2_4A_PR.md` — PR body

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
test -f tier2-4a-messages-decomp.patch && test -f T2_4A_PR.md

# Baselines: T2.1 (useCurrentUser) and T2.2a (directories useQuery) — the
# template this decomposition follows.
if ! test -f src/hooks/useCurrentUser.js; then
  echo "ERROR: src/hooks/useCurrentUser.js not found. Is T2.1 merged?"
  exit 1
fi

if ! grep -q "useQuery" src/pages/TCDirectory.jsx; then
  echo "ERROR: T2.2a (directories useQuery) not found on main. Merge T2.2a first."
  exit 1
fi

# Sanity: the new component directory should NOT already exist
if test -d src/components/messages; then
  echo "ERROR: src/components/messages/ already exists. Is T2.4a already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="tier2-4a-messages-decomp"

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
git am tier2-4a-messages-decomp.patch
```

Expected: 1 commit, 7 files, +684/−362.
New files: 6 (ThreadList, MessageThreadView, MessageComposer, NewThreadModal, useThreadMessages, messageUtils).
Rewritten: 1 (src/pages/Messages.jsx).

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> T2.4a: Decompose Messages god-component into 4 focused components
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors, 0 warnings.
npx eslint --no-warn-ignored \
  src/pages/Messages.jsx \
  src/components/messages/ThreadList.jsx \
  src/components/messages/MessageThreadView.jsx \
  src/components/messages/MessageComposer.jsx \
  src/components/messages/NewThreadModal.jsx \
  src/hooks/useThreadMessages.js \
  src/lib/messageUtils.js \
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

# Sanity: file sizes
echo "ℹ️  File sizes:"
wc -l src/pages/Messages.jsx src/components/messages/*.jsx src/hooks/useThreadMessages.js src/lib/messageUtils.js
echo "Expected: Messages.jsx ~129 lines (down from 395)"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier2-4a-messages-decomp
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier2-4a-messages-decomp"
TITLE="T2.4a: Decompose Messages god-component (+ absorbs T2.2c)"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T2_4A_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T2_4A_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`T2_4A_PLAN.md`, `tier2-4a-messages-decomp.patch`, `T2_4A_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Preflight check for `src/components/messages/` catches double-application.

---

## Expected completion output

```
✅ Phase 1: Branch tier2-4a-messages-decomp ready
✅ Phase 2: Applied 1 commit (7 files, +684/−362, 6 new files)
✅ Phase 3: Scoped lint (0 errors, 0 warnings) + Full lint (0 errors) + Build OK
            ℹ️  File sizes: Messages.jsx 129 lines (was 395)
✅ Phase 4: Pushed to origin/tier2-4a-messages-decomp
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- This is the HARDER half of T2.4. T2.4b (ServiceRequests decomposition) follows the same pattern in a separate PR.
- Behavior is preserved exactly. Realtime subscription still fires on create/update/delete. Scroll-to-bottom still works. Mobile nav still works. Unread-flag clearing still works (now wrapped in non-fatal try/catch for resilience).
- No schema changes — Messages, MessageThread, User entities are untouched.
- Smoke test recommended after deploy: send a message, receive one in another tab, start a new thread, verify attachments still work.
