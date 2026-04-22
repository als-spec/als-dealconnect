# T2.3: Scope 6 of 8 User.list() calls — scale unblocker

Tier 2, item 3 from the app audit. Originally ranked #3 in the audit's priority queue (above T2.1/T2.2 react-query work). Addresses the biggest remaining scale + privacy issue in the codebase.

**Stats:** 8 files changed · +43 / −12 · Build ✅ · Full lint ✅ (0 errors)

---

## The problem

Before this PR, 8 places in the app loaded the **entire User table** to:
- Build lookup maps for directory pages
- Populate user-search modals in Messages and ServiceRequests
- Power admin approval logic
- Drive admin dashboard stats

Consequences:
- **PII leak.** Any authenticated member could open devtools and read every user's email, phone, company, and member_status — including pending and rejected applicants.
- **Scale cliff.** At ~500+ members, the `User.list()` payload becomes noticeable. At ~5000+, it's unusable. Base44 also enforces unbounded-query limits that would eventually fail this silently.
- **Correctness bug in pickers.** Messages and ServiceRequests user-pickers included pending/rejected users — you could start a thread with someone who hasn't been approved yet.

---

## The fix

### Migrated (6 sites)

| File | Before | After | Why |
|---|---|---|---|
| `InvestorDirectory.jsx` | `User.list()` | `User.filter({ role: "investor" })` | Directory only renders investor profiles |
| `PMLDirectory.jsx` | `User.list()` | `User.filter({ role: "pml" })` | Directory only renders PML profiles |
| `TCDirectory.jsx` | `User.list()` | `User.filter({ role: "tc" })` | Directory only renders TC profiles |
| `Messages.jsx` | `User.list()` | `User.filter({ member_status: "approved" })` | Correctness + scope — excludes pending/rejected from picker |
| `ServiceRequests.jsx` | `User.list()` | Role-scoped by user type | TC picks investor, investor picks TC, admin picks approved |
| `admin/Applications.jsx` | `User.list()` | `User.filter({ member_status: "pending" })` | Only pending users needed; per Onboarding.jsx both conditions the old code OR'd are set together |

### Intentionally retained (2 sites, with TODO comments)

| File | Why kept | Future fix |
|---|---|---|
| `admin/Members.jsx` | Admin legitimately needs full member list | Pagination in T3.4 |
| `dashboard/AdminDashboard.jsx` | Stats genuinely need aggregate user data | Server-side aggregation in T3.4 |

Both sites now have inline comments explaining the rationale.

---

## Correctness improvements (bonus)

1. **Messages picker no longer includes pending/rejected users.** You cannot start a thread with someone who hasn't been approved. Was a soft bug; now a guaranteed invariant.

2. **ServiceRequests counterparty picker is role-scoped.** A TC searching for a counterparty will no longer see other TCs in the dropdown. Same for investors — they don't see each other.

3. **Admin Applications de-dupes simpler.** The old code OR'd `onboarding_step === "pending_approval"` and `member_status === "pending"`. Those are set together in `Onboarding.jsx:handleNonCompeteAccept`, so the single filter is equivalent.

---

## What this does NOT do

This PR is specifically about **server-side query scoping**. It does NOT:
- Convert the fetches to `useQuery` (T2.2 does that — the pattern is now clean to apply)
- Add pagination to the 2 retained admin sites (T3.4)
- Debounced server-side search for the pickers (T2.4 or later)
- Add indexing on Base44 side for new filter fields (operational work if needed)

---

## Base44 compatibility note

This PR assumes Base44's entity filter supports single-key filters on `role` and `member_status`. Both fields are defined on the `User` entity in `base44/entities/User.jsonc`:

```json
"role": { "enum": ["admin","tc","investor","pml","pending"] },
"member_status": { "enum": ["pending","approved","rejected"] }
```

Existing code in the repo already uses `User.filter({ email })`, `User.filter({ id })`, so single-key filter is confirmed to work. If the backend needs an index for these fields and it's missing, the filter call will error at runtime — the page would show empty state and log an error. **Worth spot-checking each directory page after deploy.**

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] Visit `/investor-directory` as a TC — should show investor profiles, user enrichment (names, companies) populates
- [ ] Visit `/pml-directory` as an investor — PML cards render with names
- [ ] Visit `/tc-directory` as an investor — TC cards render with names
- [ ] As an investor, open Messages → "New Thread" → search — should only see approved members, no pending/rejected users
- [ ] As a TC, open Messages → "New Thread" → search — same, approved members only
- [ ] As a TC, open ServiceRequests → "New Request" → user search — should only see investors (not other TCs)
- [ ] As an investor, open ServiceRequests → "New Request" → user search — should only see TCs
- [ ] As admin, visit `/admin/applications` — pending applicants (with and without MemberApplication) still appear correctly
- [ ] As admin, visit `/admin/members` — all members still appear (this was intentionally not scoped)
- [ ] As admin, visit `/dashboard` — stats still populate correctly (this was intentionally not scoped)

---

## Call-site count after this PR

| Query pattern | Before | After |
|---|---|---|
| `User.list()` | 8 | 2 (both documented as intentional) |
| `User.filter({ role: ... })` | 0 | 4 |
| `User.filter({ member_status: ... })` | 0 | 3 |
| Other `User.filter()` (by id, email) | 2 | 2 |

---

## What's next

- **T2.2** (mechanical react-query migration for entity fetches) — now much cleaner because the filter calls have stable, role-scoped query keys
- **T2.4** (decompose Messages/ServiceRequests god-components) — the picker logic is the natural seam for extraction
- **T3.4** (pagination for admin screens) — unblock admin UX past 500 members

See the full audit report for the Tier 2/3 roadmap.
