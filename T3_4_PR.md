# T3.4: Paginate admin/Members list

Paginates `admin/Members.jsx` with numbered pages. Fixes the real scaling pain flagged in the audit — the members table was previously unbounded, so admin/members gets slower every week as the platform grows.

**Stats:** 2 files changed · +156 / −16 (net +140) · Build ✅ · Full lint ✅ (0 errors)

---

## What's changed

### `admin/Members.jsx` — paginated list with 25 per page

- Server-side **FETCH_CAP of 500** records (the ceiling, not the page size)
- **25 per page** client-side
- Numbered page buttons with smart ellipsis window
- "Showing X–Y of Z (filtered from M total)" counter
- Pagination footer hidden entirely when filtered list fits on one page
- Auto-reset to page 1 when search or role filter changes
- Approaching-cap banner when member count nears FETCH_CAP

### `AdminDashboard.jsx` — comment update only (no functional change)

Added a code comment explaining why AdminDashboard's `User.list()` is **intentionally not paginated** in this PR. See "Scope decision" below.

---

## Scope decision: why not AdminDashboard?

Going in, I was going to paginate both Members.jsx and AdminDashboard's User.list(). But once I looked at AdminDashboard carefully, I realized the `users` array there is used for:

1. **Role breakdown charts** (counts by role)
2. **Total member counts** (stat cards)
3. **Synthetic-app derivation** — find every pending user across the whole table to build admin-approval queue entries

All three are **aggregation** concerns, not a list-scrolling problem. You can't meaningfully "page #2 of TC count" — you need all records to compute a complete count. Adding pagination would produce wrong numbers on stats and miss pending users on page 2+.

The proper fix is a **server-side stats endpoint** returning just aggregates (counts by role, pending list, etc.), which requires a custom Base44 function — that's multi-day backend work. Tracked as a follow-up.

So this PR delivers the real win (Members.jsx pagination) and leaves AdminDashboard's User.list honestly commented explaining why it's deferred.

---

## Why client-side pagination with a server-side cap

Base44's SDK in this codebase exposes `.list(sort, limit)` but **no offset or cursor primitive**. I checked:

```
grep -rn "offset\|skip" src/ --include="*.jsx" --include="*.js"
```

No Base44-related offset usage anywhere. Without a server-side primitive, true server-side pagination isn't possible without backend work to expose one.

So the current approach:
- **FETCH_CAP = 500** records from the server (down from unbounded)
- Client-side pagination of the returned set, 25 per page
- Banner warns admins when they approach the cap

This is the right move for beta — sub-500 members is the near-term reality, and admins get the UX win now. When member count approaches the cap, we upgrade Base44 to expose offset/cursor and switch to true server-side pagination as a follow-up.

---

## Implementation highlights

### `computePageNumbers(currentPage, totalPages)` — smart window

Pure function. Takes current page + total, returns an array with ellipses for gaps:

```
compute(3, 5)   → [1, 2, 3, 4, 5]                    (all fit, no ellipsis)
compute(1, 7)   → [1, 2, 3, 4, 5, 6, 7]              (7-page threshold)
compute(1, 20)  → [1, 2, '...', 20]                  (at start)
compute(10, 20) → [1, '...', 9, 10, 11, '...', 20]   (middle)
compute(20, 20) → [1, '...', 19, 20]                 (at end)
```

Verified manually with a Node script before committing. Handles the edge cases: `totalPages === 1`, `currentPage === 1`, `currentPage === totalPages`, and the boundary around 7 pages where the ellipsis kicks in.

### Reset to page 1 on filter change

```js
useEffect(() => {
  setPage(1);
}, [search, roleFilter]);
```

Without this, admins would land on page 5 of "TC" and switch the filter to "Investor" which has only 2 pages, and get an empty page. The reset takes them back to page 1 where there's data.

### Clamp current page to total

```js
const currentPage = Math.min(page, totalPages);
```

Covers a subtle case: admin deletes members such that the current page no longer exists. Without clamping, they'd see an empty table and not understand why.

### Memoized `filtered` derivation

```js
const filtered = useMemo(() => {
  return members.filter(...);
}, [members, search, roleFilter]);
```

Previously recomputed on every render. Small perf win; matters more on large lists.

### Custom nav vs. shadcn Pagination primitive

Shadcn's `Pagination` component uses `<a>` tags meant for server-side routing. For client-side page changes, `<button>` is the semantically correct element — it signals "triggers an action on this page" rather than "navigates away." I built a minimal custom nav (~30 lines) using actual `<button>` elements with `aria-label`, `aria-current="page"` on the active button, and `aria-label="Pagination"` on the `<nav>` wrapper.

Screen reader traversal is clean. Keyboard users get proper focus management (tab through buttons, Enter activates).

### UI polish

- **Pagination footer appears inside the table card** (below the `<tbody>`) so it feels structurally attached to the table, not floating separately
- **Ellipsis is rendered as `…`** with `aria-hidden="true"` (decorative)
- **"Filtered from N total" hint** only appears when a filter is active (`filtered.length !== members.length`) — no visual noise otherwise
- **Prev/Next labels hide on mobile** (chevron only) to preserve space

---

## Dependencies

**Hard:**
- ✅ T2.2b (admin useQuery migration) — this PR edits the useQuery added there

**Soft:** none

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds

- [ ] **As admin, basic pagination:**
  - Navigate to `/admin/members`
  - If you have more than 25 members: counter shows "Showing 1–25 of N"; pagination buttons render
  - If you have ≤ 25 members: no pagination bar (clean fallback)
  - Click page 2 → rows 26–50 render, counter updates, button 2 is highlighted
  - Click the Prev button → goes to page 1
  - At page 1: Prev button is disabled
  - At last page: Next button is disabled

- [ ] **Filter + pagination interaction:**
  - On page 3 of all members, type a search query → snaps to page 1 of filtered results
  - Switch role filter from "All" to "Investor" → snaps to page 1
  - Counter shows "Showing X–Y of Z (filtered from M total)" only when Z ≠ M
  - Clear the filter → returns to showing the full list (but still on page 1 since the filter change reset it)

- [ ] **Edit flow:**
  - On page 2, click Edit on a member → modal opens
  - Change their role → save → modal closes, table refreshes (useQuery invalidation from T2.2b)
  - Pagination position is preserved (still on page 2)

- [ ] **Empty states:**
  - Search for a nonsense string like "xyzqrstpdq" → "No members found" message (pagination bar hidden)
  - Clear search → full list returns

- [ ] **Pagination buttons — accessibility:**
  - Tab through the pagination nav: focuses each button
  - Active page button has `aria-current="page"` (inspect with dev tools)
  - Ellipsis is announced as nothing by screen readers (`aria-hidden="true"`)

- [ ] **Smart window at scale** (if you can simulate, or once you have N > 100 members):
  - On page 10 of 20: should see `1 ... 9 10 11 ... 20`
  - On page 1 of 20: should see `1 2 '...' 20`
  - On page 20 of 20: should see `1 '...' 19 20`

- [ ] **Approaching-cap banner:**
  - Won't trigger until member count is ≥ 480 (FETCH_CAP - 20). When it does, a yellow banner renders above the filter row warning about the cap.

---

## Reviewer notes

- **FETCH_CAP = 500** is a deliberate soft ceiling for the beta. At the current member count (<100), this has zero impact. If member count grows into the hundreds, the beta is probably ready for server-side pagination anyway — worth making that coincide with the cap being hit.
- **AdminDashboard is intentionally untouched beyond a comment.** The comment explains why (aggregation, not list-scrolling) so future devs don't try to apply the same pattern there.
- **No new dependencies added.** Uses existing `lucide-react` icons (ChevronLeft, ChevronRight) and the shadcn `Button` component.
- **`computePageNumbers` could be unit-tested**, but the codebase doesn't have a test harness set up. The manual Node verification in the commit message is a reasonable substitute for now. If a test harness lands later, this helper is a good first candidate — it's a pure function with clear edge cases.

---

## Progress

| Item | Status |
|---|---|
| T2.1, T2.3, T2.8 | ✅ Merged |
| T2.2a/b/d/e/f/g | ✅ Merged |
| T2.4a/b, T2.5 | ✅ Merged |
| T2.6, T2.6.1, T2.6.2 | ✅ Merged |
| **T3.4 admin pagination** | **⏳ This PR** |
| T2.7 permission audit (doc) | Remaining Tier 2 item |
| AdminDashboard server-side aggregation | Follow-up (requires Base44 function) |
| AuthContext refactor | Outside-audit cleanup |
| Mutation toast consolidation | Outside-audit cleanup |
| Observability wiring | Blocked on Sentry setup decision |
