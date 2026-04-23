# Icon modernization: emoji removal, thin strokes, neutral badges

Visual consistency pass. Three coordinated changes:

1. **Landing page emoji → lucide icons in brand tiles.** The user-type cards were rendering 📋 🏗️ 💼 at 36px — actual OS-native emoji, rendered differently on Mac/Windows/Android/iOS.
2. **All lucide icons thinned from 2px → 1.5px stroke.** Apple SF Symbols aesthetic; icons feel quieter.
3. **Rainbow role/status badges → neutral badge + brand-palette dot.** 19+ sites previously used 5 different color families (`bg-purple-50`, `bg-blue-50`, `bg-emerald-50`, `bg-amber-50`, `bg-red-50`) for semantic meaning. Now: neutral background, small colored dot from the brand palette.

**Stats:** 8 files changed · +259 / −87 (net +172) · Build ✅ · Full lint ✅ (0 errors) · Patch self-tested via `git apply --check` against main before delivery

---

## What visitors see first

Before: `📋 Transaction Coordinator` / `🏗️ Investor / Agent` / `💼 Private Money Lender`

After: three `44×44` rounded tiles with subtle teal tint, each containing a thin-stroke lucide icon:
- **ClipboardCheck** for TC (clipboard + verification mark)
- **Building2** for Investor / Agent (real estate focus, not generic "growth arrow")
- **Landmark** for PML (banking-institution silhouette, not briefcase)

Plus a unified teal accent bar across all three cards, replacing the previous per-card gradient stripes (`teal-to-cyan` / `cyan-to-blue-400` / `teal-to-green-400`). Cards now read as siblings; differentiation comes from the icon and role name.

---

## Three foundational files

### `src/components/Icon.jsx`

A thin wrapper around lucide components that sets `strokeWidth={1.5}` by default:

```jsx
<Icon as={Users} className="w-5 h-5 text-navy" />
```

Replaces `<Users className="..." />` at every call site. One-line change per site; compounding visual effect across the whole app.

**Naming collision note:** lucide map-iteration code commonly uses `const Icon = item.icon;` for the role-to-component mapping. This PR renames those locals to `ItemIcon` / `StatIcon` at every site. A future refactor could rename the wrapper itself to `LucideIcon` to avoid the collision; for now, the rename-locals approach keeps the wrapper call sites clean.

### `src/lib/roleStyles.js`

Centralized dot-color maps for roles and statuses. Pulls from the brand palette:

```js
const BRAND = {
  teal:   "#0d7a6a",
  cobalt: "#1d4ed8",
  navy:   "#041a2e",
  gray:   "#94a3b8",
  amber:  "#d97706",
};

export const ROLE_DOT_COLORS = {
  admin:    BRAND.navy,
  tc:       BRAND.teal,
  investor: BRAND.cobalt,
  pml:      BRAND.navy,
  pending:  BRAND.gray,
};

export const STATUS_DOT_COLORS = {
  pending:  BRAND.amber,
  approved: BRAND.teal,
  rejected: BRAND.gray,
};
```

**Notable design call:** `rejected` uses gray, not red. The label "Rejected" carries the semantic weight; a red dot on a rejection row reads like an error toast. Gray is quieter and still visually distinct from the teal "approved" dot.

`REQUEST_STATUS_DOT_COLORS` is also defined for ServiceRequest statuses — ready for the follow-up PR that migrates those surfaces.

### `src/components/DotBadge.jsx`

The replacement for the rainbow badge pattern:

```jsx
<DotBadge color={ROLE_DOT_COLORS[user.role]}>
  {ROLE_LABELS[user.role]}
</DotBadge>
```

Renders as: neutral background (`bg-muted/40`), small colored dot (6px), label text. One badge surface style across the app. Semantic distinction is carried by the dot color, not by shouting background fills.

---

## Five surfaces migrated

### 1. `src/pages/LandingPage.jsx`
- Emoji gone. ClipboardCheck / Building2 / Landmark in brand tiles.
- Per-card gradient stripes → unified teal bar.
- Trust row icons wrapped with Icon for thin stroke.

### 2. `src/components/layout/Sidebar.jsx`
All nav icons through the Icon wrapper. Header Menu (collapsed-state) and ChevronLeft (expanded-state) also wrapped. Curated picks:

| Nav item | Before | After |
|---|---|---|
| TC Directory | `Briefcase` | `UserCheck` |
| Investor Directory | `TrendingUp` | `Building2` |
| PML Directory | `DollarSign` | `Landmark` |
| Pipeline | `ClipboardList` | `Layers` |
| My Profile (all 4 roles) | `Briefcase`/`Building2`/`DollarSign` | `User` (unified) |

The `My Profile` unification is a small but meaningful change: the link goes to the same conceptual destination (the user's own profile) regardless of role. No reason to render three different icons.

### 3. `src/pages/admin/Members.jsx`
- `ROLE_COLORS` constant (5 color families) deleted.
- `STATUS_COLORS` constant (3 color families) deleted.
- Role + status Badge → DotBadge.
- All inline icons (Search, Pencil, Users empty state, pagination chevrons) wrapped.
- `Badge` import dropped.

### 4. `src/pages/admin/Applications.jsx`
- Local `STATUS_STYLES` constant (rainbow) deleted.
- Status Badge → DotBadge.
- `NDA ✓` emerald fill → neutral `NDA signed` text. Kept as `Badge` (no dot semantics needed, just an indicator).
- All inline icons (CheckCircle2, XCircle, Eye, Clock, Building2, MapPin) wrapped.

### 5. `src/pages/dashboard/AdminDashboard.jsx`
- Unused `STATUS_STYLES` constant removed (dead code since T2.2f moved AdminDashboard to synthetic-app pattern — the rainbow was never referenced).
- Stat card icons wrapped. The existing `gradient-primary` tile treatment kept as-is; it was already teal-cyan brand gradient with white icon.
- Empty state and inline icons wrapped.

---

## What's NOT in scope (follow-ups)

**ServiceRequest status badges** (`RequestList`, `RequestDetail`, deal-detail status):
- `REQUEST_STATUS_DOT_COLORS` is defined and ready
- Skipped because those pages use their own `STATUS_COLORS` map imported from `serviceRequestUtils.js`, and migrating properly means updating the shared util and every downstream site in one sweep. That's a focused PR of its own.

**Deal stage badges on DealCard** ("Under Contract", "Pre-Close", "Closing Soon"):
- Contextual deal-state rather than member/status. Arguably benefits from urgency-coded color (amber for pre-close, red for closing-soon).
- Left unchanged on purpose.

**Review stars (amber):**
- Universal UX convention; five stars in brand teal would confuse users.
- Kept amber.

**Dashboard status badges in TCDashboard / PMLDashboard:**
- Lower traffic; same DotBadge pattern available when touched next.

**Other emoji in the codebase** (✓ signed, ★ rating):
- A few checkmark emoji still exist in onboarding flows. Low-profile; not the "clip art landing page" problem the user called out. Could be a polishing follow-up.

---

## A note on the patch itself

An earlier version of this patch was generated against a stale Sidebar.jsx and failed to apply during an initial `git am` attempt. The patch was regenerated against the current production baseline (the two-button Logo+title header structure). The plan's preflight now includes a structure check that fails fast with a clear message if the Sidebar has diverged again.

**Lessons baked into the plan for future PRs:**
- Preflight baseline checks now grep for file-unique tokens, not just file existence
- Patches are self-tested via `git apply --check` against main before delivery

---

## Dependencies

**Hard:**
- ✅ T2.2b (admin useQuery) — Members.jsx and Applications.jsx still use their useQuery patterns
- ✅ mutation-toasts — Members.jsx handler depends on that PR's try/catch

**Soft:** none

No conflicts with other pending PRs. New files (`Icon.jsx`, `DotBadge.jsx`, `roleStyles.js`) don't overlap any other work.

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds

- [ ] **Landing page (logged out at `/`):**
  - Three user-type cards show `ClipboardCheck`, `Building2`, `Landmark` icons in teal-tinted rounded tiles
  - No emoji anywhere in the user-type cards
  - All three cards have the same teal accent bar on top (no per-card gradient variation)
  - Icons have a noticeably lighter stroke weight than before
  - Trust row at the top (Licensed Professionals / Proven Track Record / etc) renders with thin-stroke icons in teal

- [ ] **Sidebar (as TC, Investor, PML, admin):**
  - All icons render with lighter stroke
  - TC Directory shows `UserCheck`, Investor Directory shows `Building2`, PML Directory shows `Landmark`
  - "My Profile" shows `User` icon consistently regardless of role (was `Briefcase`/`Building2`/`DollarSign` before)
  - Pipeline shows `Layers` (not `ClipboardList` — that's still Applications)
  - Collapse button: Menu (hamburger) icon renders with thin stroke
  - Expanded state: Logo + "ALS Deal Connect" label intact, ChevronLeft toggle renders with thin stroke

- [ ] **`/admin/members`:**
  - Role column shows compact pills with: small colored dot + "Admin" / "Transaction Coordinator" / etc. NOT rainbow backgrounds
  - Status column shows same pattern: dot + "Pending" / "Approved" / "Rejected"
  - Admin dots are navy, TC teal, Investor cobalt, PML navy, Pending gray
  - Pending-status dot is amber, Approved teal, Rejected gray
  - Search and Edit buttons render with thin-stroke icons
  - Pagination chevrons render with thin stroke

- [ ] **`/admin/applications`:**
  - Status pill on each application row is a DotBadge (neutral bg + dot)
  - NDA indicator says "NDA signed" on a neutral pill, NOT emerald-filled "NDA ✓"
  - Approve (CheckCircle2), Reject (XCircle), Review (Eye) buttons render with thin-stroke icons
  - Empty state Clock icon renders with thin stroke

- [ ] **AdminDashboard:**
  - Four stat cards at the top: Users, ClipboardList, BarChart3, MessageSquare each in a gradient-primary (teal-cyan) tile with white icon, now with thinner stroke
  - Empty approval queue state shows thin-stroke CheckCircle2
  - Any inline Building2, MapPin, CheckCircle2, XCircle in approval queue rows render with thin stroke

- [ ] **Nothing functionally broken:**
  - Role filters on Members page still work
  - Application approve/reject still works
  - All inline stars, empty-state graphics, unchanged surfaces still render

---

## Reviewer notes

- **Why no visual-regression tests?** The codebase doesn't have a test harness; manual smoke tests are the current verification path.
- **Why keep the gradient-primary tile on stat cards?** The AFTER mockup shown during planning had dark navy + teal icon, but the existing gradient-primary (teal-to-cobalt) is already on-brand. No need to churn it. Future refinement could go either way.
- **Why drop the NDA emerald badge?** `NDA ✓` with the checkmark character and emerald fill was visually the loudest thing on an application row, despite being low-priority info. Quieter `NDA signed` on neutral reads as "present but not shouting for attention." The application's status (DotBadge) is what should dominate the row visually.
- **Why `rejected` → gray dot?** A red dot on a list of rejected applications reads as "something is wrong, take action." Nothing is wrong — those are correctly rejected and logged. The label does the semantic work; the dot just needs to be distinct.

---

## Progress

| Item | Status |
|---|---|
| T2.1 through T3.4 | ✅ Merged |
| AuthContext refactor | ✅ Merged |
| Mutation error handling | 🚀 Deploying |
| **Icon modernization** | **⏳ This PR** |

After this lands, remaining work is non-code (T2.7 permission audit) or blocked (Sentry, Base44 aggregation) — see README for full backlog.
