# POST_AUDIT_ICON_MODERNIZATION_PLAN.md — Icon & Badge Modernization

**Intended consumer: Claude Code.** Human ask: "Execute this plan."

Outside-audit visual cleanup. Three coordinated changes: emoji removal on landing page, thin stroke weight for all lucide icons, rainbow-colored badges replaced with neutral + brand-dot indicator.

---

## Goal

Apply `post-audit-icon-modernization.patch` to branch `post-audit-icon-modernization` on top of current `main`. Verify and open/update the PR with body from `POST_AUDIT_ICON_MODERNIZATION_PR.md`.

---

## Inputs (expected at repo root)

- `POST_AUDIT_ICON_MODERNIZATION_PLAN.md` — this file
- `post-audit-icon-modernization.patch` — git-formatted patch (1 commit, 8 files, +258/−86)
- `POST_AUDIT_ICON_MODERNIZATION_PR.md` — PR body

---

## Preflight

```bash
git rev-parse --git-dir
git diff --quiet && git diff --cached --quiet || {
  echo "ERROR: working tree has uncommitted changes. Stash or commit first."
  exit 1
}
gh auth status
test -f post-audit-icon-modernization.patch && test -f POST_AUDIT_ICON_MODERNIZATION_PR.md

# Baselines
if ! test -f src/lib/toasts.js; then
  echo "ERROR: src/lib/toasts.js not found. Is mutation-toasts merged?"
  exit 1
fi
if ! grep -q "MEMBER_ROLES" src/lib/routes.jsx 2>/dev/null; then
  echo "ERROR: T2.6.1 not merged"
  exit 1
fi

# Sanity: should NOT already be applied
if test -f src/components/Icon.jsx; then
  echo "ERROR: src/components/Icon.jsx already exists. Is this already applied?"
  exit 1
fi
```

---

## Phase 1 — Branch setup

```bash
git fetch origin main
BRANCH="post-audit-icon-modernization"

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
git am post-audit-icon-modernization.patch
```

Expected: 1 commit, 8 files, +258/−86.

```bash
git log --oneline origin/main..HEAD
# Should show:
#   <sha> Icon modernization: emoji removal, thin strokes, neutral badges
```

---

## Phase 3 — Install + verify

```bash
npm install

# Scoped lint on touched files — expect 0 errors.
npx eslint --no-warn-ignored \
  src/components/Icon.jsx \
  src/components/DotBadge.jsx \
  src/components/layout/Sidebar.jsx \
  src/pages/LandingPage.jsx \
  src/pages/admin/Members.jsx \
  src/pages/admin/Applications.jsx \
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

# Sanity: expected new files exist, old emoji gone
if ! test -f src/components/Icon.jsx; then
  echo "ERROR: Icon.jsx missing"
  exit 1
fi
if grep -q 'icon: "📋"' src/pages/LandingPage.jsx; then
  echo "ERROR: landing page still has emoji"
  exit 1
fi
if grep -q "ROLE_COLORS\|STATUS_STYLES" src/pages/admin/Members.jsx; then
  echo "ERROR: rainbow constants still in Members.jsx"
  exit 1
fi
echo "✅ All three changes applied: emoji gone, thin stroke wrapper in place, DotBadge migrated"
```

---

## Phase 4 — Push

```bash
git push --force-with-lease -u origin post-audit-icon-modernization
```

---

## Phase 5 — Create or update PR

```bash
BRANCH="post-audit-icon-modernization"
TITLE="Icon modernization: emoji removal, thin strokes, neutral badges"

EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number')

if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file POST_AUDIT_ICON_MODERNIZATION_PR.md
  echo "Updated PR #$EXISTING_PR"
  gh pr view "$EXISTING_PR" --web
else
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "$TITLE" \
    --body-file POST_AUDIT_ICON_MODERNIZATION_PR.md
  gh pr view --web
fi
```

---

## Phase 6 — Cleanup prompt

Ask the human:

> "PR is open. Delete the three plan files (`POST_AUDIT_ICON_MODERNIZATION_PLAN.md`, `post-audit-icon-modernization.patch`, `POST_AUDIT_ICON_MODERNIZATION_PR.md`) from the repo root, or leave for reference?"

Do NOT delete without explicit confirmation.

---

## Rerun semantics

Idempotent. Preflight check for `src/components/Icon.jsx` catches double-application.

---

## Expected completion output

```
✅ Phase 1: Branch post-audit-icon-modernization ready
✅ Phase 2: Applied 1 commit (8 files, +258/−86)
✅ Phase 3: Scoped lint (0 errors) + Full lint (0 errors) + Build OK
            ✅ All three changes applied: emoji gone, thin stroke
            wrapper in place, DotBadge migrated
✅ Phase 4: Pushed to origin/post-audit-icon-modernization
✅ Phase 5: PR #<N> [created|updated] — <url>
⏸  Phase 6: Awaiting cleanup confirmation
```

---

## Notes for the executing agent

- Smoke tests recommended after deploy:
    * Open the landing page (logged out) — the three user-type cards should show ClipboardCheck/Building2/Landmark icons in rounded teal-tinted tiles, NOT emoji
    * Open sidebar as TC, Investor, PML, admin — stroke weight should look noticeably lighter; TC Directory shows UserCheck, Investor Directory shows Building2, PML Directory shows Landmark
    * Open /admin/members — role pills (Admin/TC/Investor/PML/Pending) show as neutral background with small colored dot, NOT rainbow-filled pills
    * Open /admin/applications — status shows as neutral+dot DotBadge; NDA shows as neutral 'NDA signed' text (no more emerald fill)
    * Open AdminDashboard — stat card icons render with lighter stroke
