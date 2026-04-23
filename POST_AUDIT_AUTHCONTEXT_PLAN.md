# POST_AUDIT_AUTHCONTEXT_PLAN.md — Close the T2.1 Loop

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

Outside-audit cleanup. Closes the T2.1 useCurrentUser migration by refactoring the one place T2.1 intentionally left alone: AuthContext.jsx's bootstrap `base44.auth.me()` call.

---

## Goal

Apply `post-audit-authcontext-refactor.patch` to branch `post-audit-authcontext-refactor` on top of current `main`. Verify and open/update the PR with body from `POST_AUDIT_AUTHCONTEXT_PR.md`.

---

## Inputs (expected at repo root)

- `POST_AUDIT_AUTHCONTEXT_PLAN.md` — this file
- `post-audit-authcontext-refactor.patch` — git-formatted patch (1 commit, 2 files, +91/−104, net -13)
- `POST_AUDIT_AUTHCONTEXT_PR.md` — PR body

---

## Preflight

```bash
git rev-parse --git-dir
git diff --quiet && git diff --cached --quiet || {
  echo "ERROR: working tree has uncommitted changes. Stash or commit first."
  exit 1
}
gh auth status
test -f post-audit-authcontext-refactor.patch && test -f POST_AUDIT_AUTHCONTEXT_PR.md

# Baseline: T2.1 (useCurrentUser) — AuthContext will prime the cache used
# by it.
if ! test -f src/hooks/useCurrentUser.js; then
  echo "ERROR: src/hooks/useCurrentUser.js not found. Is T2.1 merged?"
  exit 1
fi

# Sanity: refactor should NOT already be applied. Check for the new
# cache-priming import.
if grep -q "queryClientInstance" src/lib/AuthContext.jsx 2>/dev/null; then
  echo "ERROR: queryClientInstance already in AuthContext. Is this already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="post-audit-authcontext-refactor"

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
git am post-audit-authcontext-refactor.patch
```

Expected: 1 commit, 2 files, +91/−104.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> AuthContext refactor: remove dead state, warm react-query cache
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors.
npx eslint --no-warn-ignored src/App.jsx 2>&1 | tee /tmp/lint.out

if grep -qE "[1-9][0-9]* error" /tmp/lint.out; then
  echo "ERROR: patch introduced lint errors in App.jsx"
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

# Sanity: cache-priming added, dead state removed
if ! grep -q "setQueryData" src/lib/AuthContext.jsx; then
  echo "ERROR: setQueryData not found in AuthContext — cache priming missing"
  exit 1
fi
if grep -q "const \[user, setUser\]" src/lib/AuthContext.jsx; then
  echo "ERROR: user state still in AuthContext — refactor incomplete"
  exit 1
fi
echo "✅ Cache priming in place, dead state removed"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin post-audit-authcontext-refactor
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="post-audit-authcontext-refactor"
TITLE="AuthContext: remove dead state, prime react-query cache"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file POST_AUDIT_AUTHCONTEXT_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file POST_AUDIT_AUTHCONTEXT_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`POST_AUDIT_AUTHCONTEXT_PLAN.md`, `post-audit-authcontext-refactor.patch`, `POST_AUDIT_AUTHCONTEXT_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Preflight check for `queryClientInstance` catches double-application.

---

## Expected completion output

```
✅ Phase 1: Branch post-audit-authcontext-refactor ready
✅ Phase 2: Applied 1 commit (2 files, +91/-104, net -13 lines)
✅ Phase 3: Scoped lint (0 errors) + Full lint (0 errors) + Build OK
            ✅ Cache priming in place, dead state removed
✅ Phase 4: Pushed to origin/post-audit-authcontext-refactor
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- Smoke test recommended after deploy: open DevTools Network tab, hard refresh the app, count `base44.auth.me()` calls on initial load. Should be ONE (previously two — one from AuthContext, one from App.jsx's useCurrentUser).
- The removed exports (`user`, `isAuthenticated`, `appPublicSettings`, `logout`, `checkAppState`) have been verified via grep to have zero external consumers. If some consumer is added later and imports one of those, it'll fail at build time — easy to catch.
- Public pages (landing, partners) with no token still work — checkAppState returns early before calling checkUserAuth when no token is present, same as before.
