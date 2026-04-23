# T2_4B_PLAN.md — ServiceRequests God-Component Decomposition

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

T2.4b from the app audit — decomposes the 532-line `ServiceRequests.jsx` god-component into a thin orchestrator plus six focused child components and a utilities module. Closes T2.4 entirely.

---

## Goal

Apply `tier2-4b-service-requests-decomp.patch` to branch `tier2-4b-service-requests-decomp` on top of current `main`. Verify and open/update the PR with body from `T2_4B_PR.md`.

---

## Inputs (expected at repo root)

- `T2_4B_PLAN.md` — this file
- `tier2-4b-service-requests-decomp.patch` — git-formatted patch (1 commit, 8 files, +866/−505, 7 new files)
- `T2_4B_PR.md` — PR body

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
test -f tier2-4b-service-requests-decomp.patch && test -f T2_4B_PR.md

# Baselines: T2.1, T2.2a template, and T2.5 race fix (which this PR
# preserves inside the extracted components).
if ! test -f src/hooks/useCurrentUser.js; then
  echo "ERROR: src/hooks/useCurrentUser.js not found. Is T2.1 merged?"
  exit 1
fi

if ! grep -q "useQuery" src/pages/TCDirectory.jsx; then
  echo "ERROR: T2.2a (directories useQuery) not found on main. Merge T2.2a first."
  exit 1
fi

if ! grep -q "Refetch the fresh record before appending" src/pages/ServiceRequests.jsx 2>/dev/null; then
  echo "ERROR: T2.5 race fix not found in ServiceRequests.jsx. Merge T2.5 first."
  exit 1
fi

# Sanity: the new component directory should NOT already exist
if test -d src/components/service-requests; then
  echo "ERROR: src/components/service-requests/ already exists. Is T2.4b already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="tier2-4b-service-requests-decomp"

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
git am tier2-4b-service-requests-decomp.patch
```

Expected: 1 commit, 8 files, +866/−505.
New files: 7 (ProgressStepper, RequestList, RequestDetail, DocumentsSection, CommentsSection, NewRequestModal, serviceRequestUtils).
Rewritten: 1 (src/pages/ServiceRequests.jsx).

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> T2.4b: Decompose ServiceRequests god-component into 6 focused components
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint — expect 0 errors, 0 warnings.
npx eslint --no-warn-ignored \
  src/pages/ServiceRequests.jsx \
  src/components/service-requests/ProgressStepper.jsx \
  src/components/service-requests/RequestList.jsx \
  src/components/service-requests/RequestDetail.jsx \
  src/components/service-requests/DocumentsSection.jsx \
  src/components/service-requests/CommentsSection.jsx \
  src/components/service-requests/NewRequestModal.jsx \
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

# Sanity: T2.5 race fix survived the extraction
if ! grep -q "T2.5 quick fix" src/components/service-requests/CommentsSection.jsx; then
  echo "ERROR: T2.5 race fix comment missing from CommentsSection.jsx"
  exit 1
fi
if ! grep -q "T2.5 quick fix" src/components/service-requests/DocumentsSection.jsx; then
  echo "ERROR: T2.5 race fix comment missing from DocumentsSection.jsx"
  exit 1
fi
echo "✅ T2.5 race fix preserved in both DocumentsSection and CommentsSection"

# Sanity: file sizes
echo "ℹ️  File sizes:"
wc -l src/pages/ServiceRequests.jsx src/components/service-requests/*.jsx src/lib/serviceRequestUtils.js
echo "Expected: ServiceRequests.jsx ~130 lines (down from 532)"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin tier2-4b-service-requests-decomp
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="tier2-4b-service-requests-decomp"
TITLE="T2.4b: Decompose ServiceRequests god-component (closes T2.4)"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file T2_4B_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file T2_4B_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`T2_4B_PLAN.md`, `tier2-4b-service-requests-decomp.patch`, `T2_4B_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Preflight check for `src/components/service-requests/` catches double-application.

---

## Expected completion output

```
✅ Phase 1: Branch tier2-4b-service-requests-decomp ready
✅ Phase 2: Applied 1 commit (8 files, +866/−505, 7 new files)
✅ Phase 3: Scoped lint (0 errors, 0 warnings) + Full lint (0 errors) + Build OK
            ✅ T2.5 race fix preserved in both DocumentsSection and CommentsSection
            ℹ️  File sizes: ServiceRequests.jsx 130 lines (was 532)
✅ Phase 4: Pushed to origin/tier2-4b-service-requests-decomp
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- This closes T2.4 (god-component decomposition). After it lands, the two biggest pages in the app are both properly decomposed.
- T2.5 race fix must survive the extraction. Preflight + post-apply verification both check for the comment anchor.
- No schema changes — ServiceRequest, User entities untouched.
- Smoke test recommended after deploy: create a request, advance status, upload a document, post a comment, verify all work for TC, investor, and admin roles.
