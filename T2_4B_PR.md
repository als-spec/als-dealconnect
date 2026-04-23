# T2.4b: Decompose ServiceRequests god-component (closes T2.4)

Second and final half of T2.4 — god-component decomposition. Breaks the 532-line `ServiceRequests.jsx` into a thin orchestrator (130 lines) plus six focused child components and a utilities module. Same pattern as T2.4a applied to the second of the two god-components flagged in the audit.

**Stats:** 8 files changed · +866 / −505 · 7 new files · `ServiceRequests.jsx` 532 → 130 lines (-76%) · Build ✅ · Full lint ✅ (0 errors, 0 warnings on all new files)

**This closes T2.4.**

---

## The split

### Before
One 532-line file mixing: request list rendering, request selection, detail pane, status advancement, comment thread + composer, document upload + validation, new-request creation, counterparty picker, mobile nav state, progress stepper component definition, and the `ServiceRequest` / `User` fetch orchestration.

### After

| File | Lines | Responsibility |
|---|---:|---|
| `src/pages/ServiceRequests.jsx` | 130 | Thin orchestrator — top-level state, two useQuery calls, composes children |
| `src/components/service-requests/RequestList.jsx` | 88 | Sidebar with request list + status badges. Pure presentation. |
| `src/components/service-requests/RequestDetail.jsx` | 160 | Detail pane header + stepper + timestamps + notes. Owns advanceStatus mutation (scalar writes only — no race). Composes Documents + Comments. |
| `src/components/service-requests/DocumentsSection.jsx` | 125 | Documents list + upload button. Owns uploading state. Preserves T2.5 refetch-before-write. |
| `src/components/service-requests/CommentsSection.jsx` | 119 | Comments thread + composer. Owns draft state. Preserves T2.5 refetch-before-write. |
| `src/components/service-requests/ProgressStepper.jsx` | 51 | Horizontal stage indicator, extracted verbatim |
| `src/components/service-requests/NewRequestModal.jsx` | 168 | Party picker + deal title + notes + create mutation |
| `src/lib/serviceRequestUtils.js` | 52 | Pure helpers: STAGES, STATUS_NEXT, STATUS_COLORS, file constants, formatRequestDate, canAdvanceStatus |

**Total lines went up** (505 → 866) because of JSDoc, explicit prop contracts, and ARIA labels — same trade as T2.4a. Median component size is now ~120 lines; each is reviewable in one sitting.

---

## Mirrors the T2.4a pattern

Same split shape as the Messages decomposition:

- **Thin orchestrator** holds top-level coordination state (`selected`, `showMobileDetail`, `showNew`)
- **List component** is pure presentation — data and handlers from props
- **Detail component** owns its own mutation (advanceStatus) and composes sub-sections
- **Sub-sections** (Documents, Comments) own their own fine-grained state and mutations
- **Modal** has its own draft state and invalidates the list query on create
- **Utilities module** for pure helpers and constants
- **Every mutation** invalidates `['ServiceRequest']` to refresh the list

The `onRequestUpdated` callback pattern is new here (didn't need it in Messages) — the detail-pane mutations return an updated record which syncs the parent's `selected` reference immediately, so the detail view reflects changes before the list refetch arrives.

---

## T2.5 race fix preserved

DocumentsSection and CommentsSection both preserve the refetch-before-write pattern from T2.5. Each includes an explicit comment at the call site pointing at T2.5:

```js
// T2.5 quick fix — refetch-before-write to avoid clobbering
// concurrent additions from the other party.
const fresh = (await base44.entities.ServiceRequest.filter({ id: request.id }))[0];
if (!fresh) {
  toast.error("This request could not be found. It may have been deleted.");
  return;
}
const updated = await base44.entities.ServiceRequest.update(request.id, {
  comments: [...(fresh.comments || []), comment],
});
```

`advanceStatus` in RequestDetail does NOT use this pattern — it writes scalar fields only (`status` + one timestamp), so there's no array to merge and no race to fix.

---

## Behavior preserved exactly

Every user-facing behavior in the old implementation:

- Role-scoped request filter: TC/investor see only requests where they're a party; admin sees all
- Role-scoped counterparty picker: TC searches investors, investor searches TCs, admin searches all approved members
- Admins can't create new requests (button hidden)
- advanceStatus only available to TC and admin roles
- Progress stepper animates the current stage's icon
- Timestamps grid shows all four stage timestamps (— when empty)
- Notes section only renders if `request.notes` is non-empty
- Document upload: 25MB cap, MIME whitelist (PDF/image/Word/Excel)
- Comment thread: right-aligned "mine" styling with gradient, left-aligned others
- Enter posts comment, Shift+Enter inserts newline
- Mobile nav: back button returns to list, list hides when detail is open

---

## Behavior improvements riding along

- **Selected request updates immediately after mutation.** The `onRequestUpdated` callback from DocumentsSection/CommentsSection/RequestDetail syncs the parent's selected state — so after posting a comment or uploading a document, the detail pane reflects the change before the list refetch arrives. Previously, there was a brief window where the detail pane could show stale data until `loadRequests()` resolved.
- **ARIA labels on icon-only buttons.** Back (mobile), close modal, upload document, post comment, new-request. Small a11y win — didn't exist before.
- **NewRequestModal reset is now idempotent.** The old code duplicated the reset fields across cancel, close-X, and create-success paths. New code has a single `reset()` function called from all three.

---

## What's NOT in this PR

- **T2.5 proper fix** (split Comment and Document into their own entities) is still pending. This PR preserves the T2.5 quick fix; the proper fix is a separate multi-day refactor.
- **Request deletion UI** — not in the audit, not added here. Admin console only.
- **Realtime subscription** — ServiceRequests never had one (unlike Messages). Not added.
- **Status reversal** — STATUS_NEXT is one-way (no "move back to requested"). Unchanged.

---

## Dependencies

**Hard (must be merged first):**
- ✅ T2.1 (useCurrentUser)
- ✅ T2.2a (directories useQuery) — template established
- ✅ T2.5 (race fix) — this PR preserves the fix; needs it to already be on main

**Soft (not required):**
- T2.8 error boundary — recommended to land first as safety net
- T2.4a Messages decomp — independent but same pattern

---

## Testing checklist

### Basic flow
- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] Open ServiceRequests as a TC. Request list renders. Click a request → detail pane opens.
- [ ] As an investor, repeat. Only your requests show in the list.
- [ ] As an admin, all requests show. "New Request" button is hidden.

### Create flow
- [ ] Click + button. Modal opens.
- [ ] As a TC, search for an investor by name → recipient dropdown shows matches. Select one, enter deal title, submit → request created, modal closes, new request is selected.
- [ ] As an investor, search for a TC → same flow but the label reads "Transaction Coordinator".
- [ ] Cancel from the modal → resets state, modal closes.

### Status advancement
- [ ] As a TC, open a "Requested" request. Click "Mark as accepted" → status changes, accepted_at timestamp populates, progress stepper advances.
- [ ] Click "Mark as in_progress" → advances again.
- [ ] Click "Mark as completed" → advances; button disappears (no next status).
- [ ] As an investor, open a request → no "Mark as" button is visible.

### Documents
- [ ] Upload a PDF → appears in documents list with your name and timestamp.
- [ ] Upload a file over 25MB → toast error, no upload.
- [ ] Upload a .txt file (disallowed MIME) → toast error, no upload.
- [ ] Click a document link → opens in new tab.

### Comments
- [ ] Type a comment, press Enter → posts, textarea clears.
- [ ] Shift+Enter → inserts newline, does not post.
- [ ] Your comments appear right-aligned with gradient; other party's appear left-aligned.

### Race test (the whole point of T2.5 being preserved)
- [ ] Open two tabs as TC and investor on the same request.
- [ ] Both type a comment and click Send within a few seconds of each other.
- [ ] Refresh both tabs → both comments persist. (Without T2.5, one would be lost.)
- [ ] Repeat with one uploading a document and the other posting a comment at the same time → both persist.

### Mobile
- [ ] Resize to narrow viewport. Request list is full-width; selecting a request hides the list and shows detail full-width.
- [ ] Tap the left-arrow back button → returns to list.

### Cache sharing
- [ ] Approve a new member from /admin/applications. Open ServiceRequests, click + → new member shows up in the counterparty picker.
- [ ] Navigate away and back to /service-requests. Request list renders instantly from cache.

---

## Reviewer notes

- **`onRequestUpdated` pattern.** RequestDetail and its children accept an `onUpdated` callback that fires with the updated server response after any mutation. The orchestrator wires it to `setSelected(updatedRequest)`. This keeps the detail pane tight — it doesn't have to wait for the list's refetch to show post-mutation state.
- **`counterpartyFilter` as a query dependency.** The orchestrator's User query key includes the filter object, so role changes (e.g., an admin promotes a user from TC to investor) automatically flip the counterparty cache without manual invalidation.
- **`advanceStatus` stays in RequestDetail, not its own component.** It's simple enough (one button, one mutation) that a separate StatusAdvancement component would be over-decomposition. Same judgment as the "header" in Messages — sometimes a button doesn't need to be a component.
- **`ProgressStepper` is a standalone component** even though it's only used once. The audit flagged that the inline definition made RequestDetail noisier than necessary; extracting improves readability even without reuse.
- **`client-side role filter for requests` is necessary.** Base44's SDK single-key `filter()` can't express `tc_id = X OR investor_id = X`. We fetch newest 200 and filter. Flagged in the orchestrator's comments.

---

## Progress

After T2.4b lands:

| Item | Status |
|---|---|
| T2.1 useCurrentUser | ✅ Merged |
| T2.3 Scope User.list | ✅ Merged |
| T2.8 Error boundaries | ✅ Merged |
| T2.2a/b/d/e/f/g fan-out | ✅ Merged |
| T2.5 race quick fix | ✅ Merged |
| T2.4a Messages decomp | ✅ Merged |
| **T2.4b ServiceRequests decomp** | **⏳ This PR** |
| T2.6 Route table refactor | Next small item |
| T2.7 Permission audit (doc) | Not started |
| T3.4 Admin pagination | Not started |

**T2.4 is complete after this.** The two biggest pages in the app are properly decomposed. Remaining Tier 2: T2.6 (route table — small) and T2.7 (permission audit — doc work).
