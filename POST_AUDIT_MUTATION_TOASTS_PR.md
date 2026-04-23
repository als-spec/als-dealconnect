# Mutation error handling: fix silent failures in 6 handlers

Outside-audit cleanup. Six `handleSave` / `handleAction` handlers called `base44.entities.X.update/create` **without try/catch**. If those calls failed — network hiccup, validation rejection, permission denied — the user saw a stuck loading spinner forever. This PR gives every one of them proper error handling: try/catch, user-visible toast, loading-state cleanup.

**Stats:** 7 files changed · +124 / −30 (net +94) · Build ✅ · Full lint ✅ (0 errors)

---

## What was happening before

This is a real bug, not a cosmetic cleanup. Concrete example from `AdminDashboard.handleAction` (the admin-approval flow):

```js
// Before
const handleAction = async (appId, action) => {
  setProcessing(appId + action);
  const app = applications.find(a => a.id === appId);
  if (!app._synthetic) {
    await base44.entities.MemberApplication.update(appId, { ... });
  }
  if (app.user_id) {
    await base44.entities.User.update(app.user_id, { ... });
  }
  // ...toast.success + setProcessing(null) below...
};
```

If either `update` throws, the `await` propagates the rejection up. `setProcessing(null)` never runs. The success toast never fires. The approve button stays in its loading state permanently. The admin has no idea anything went wrong unless they open DevTools.

Same pattern in five other handlers. All fixed.

---

## Pattern applied to all six handlers

```js
// After
const handleSave = async (formData) => {
  setSaving(true);
  try {
    await base44.entities.X.update(id, data);
  } catch (e) {
    console.error("...save failed:", e);
    toastMutationError("save profile");
    setSaving(false);
    return;
  }
  toast.success("Profile saved successfully");
  setSaving(false);
  setEditing(false);
  queryClient.invalidateQueries(...);
};
```

Three things happen on failure: console.error (preserves debugging info), toast (tells the user what happened), state cleanup (unlocks the UI for retry).

**Deliberately early-returns from the success path.** Invalidation, success toast, and closing the edit dialog all get skipped on error — the user stays in edit mode with their form data intact so they can retry.

---

## New file: `src/lib/toasts.js`

One helper, one export:

```js
export function toastMutationError(action) {
  toast.error(`Failed to ${action}. Please try again.`);
}
```

Why a helper instead of inline `toast.error("Failed to X. Please try again.")`?

1. **Consistent phrasing.** The existing ~13 mutation error toasts across the app use the same `"Failed to X. Please try again."` pattern. New error toasts we add today should blend in rather than drifting to new phrasing ("Couldn't X", "Error updating X", etc.).
2. **Easy to swap later.** If we ever decide to change the tone ("Couldn't save changes. Try again?") or add a retry button, one file.
3. **Setup for useMutation migration.** The `query-client.js` comment describes a future world where mutations use `useMutation` and `mutationCache.onError` shows the toast centrally. When that migration happens, that callback can call `toastMutationError(mutation.meta.action)` — same helper, just wired in at a different level.

---

## The six handlers fixed

| File | Handler | Mutation |
|---|---|---|
| `src/pages/dashboard/AdminDashboard.jsx` | `handleAction` | MemberApplication.update + User.update |
| `src/pages/admin/Members.jsx` | `handleSave` | User.update |
| `src/pages/TCProfilePage.jsx` | `handleSave` | TCProfile.update or .create |
| `src/pages/InvestorProfilePage.jsx` | `handleSave` | InvestorProfile.update or .create |
| `src/pages/PMLProfilePage.jsx` | `handleSave` | PMLProfile.update or .create |
| `src/components/deals/PostDealForm.jsx` | `handleSubmit` | Deal.update or .create |

### Special handling: AdminDashboard

The handler has two mutation phases:
1. **Critical path** — the member-state updates that make the approve/reject action real
2. **Best-effort email** — the welcome or rejection email

The existing code already wrapped the email in its own try/catch (with an empty catch — silent email failure). This PR keeps that structure: critical path now has proper error handling; email stays best-effort with a `console.error` added so failures are at least logged.

The reasoning: if the DB update succeeded but the email failed, the approval is still valid — the admin shouldn't see an error toast for a partial success. They'd just get confused. The email can be resent manually if needed.

---

## What's NOT in this PR

**Existing `"Failed to X. Please try again."` toasts are NOT migrated to the helper.** They work fine; migrating them would touch ~10 more files for zero user-visible change. The helper is available when someone wants to do that cleanup.

**useMutation migration is NOT attempted.** The `query-client.js` comment describes a future architecture where every mutation uses `useMutation` and toast-on-error centralizes in `mutationCache.onError`. That's a 2-4 hour refactor touching ~10 handlers. Way bigger than what this session's remaining budget allowed.

**Already-handled sites untouched:**
- `DealBoard` — has try/catch with user feedback
- `Messages` — has try/catch with user feedback
- `PartnersPage` — has try/catch with inline `setError`
- `DealDetailModal` — has try/catch with inline `setError`

---

## Dependencies

**Hard:** none — all six target files have been stable for many PRs
**Soft:** none

No conflicts with any pending PRs. `toasts.js` is a net-new file.

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds

- [ ] **Happy paths unchanged** (regression check):
  - Admin approve a pending application → same success toast, same invalidation, same behavior
  - Member saves profile → same success toast, edit mode closes, profile refreshes
  - Investor posts a deal → same behavior, dialog closes on success

- [ ] **Error paths now visible** (the fixes):
  - Admin approve with browser offline → toast "Failed to approve application. Please try again.", button re-enables
  - Member save profile with browser offline → toast "Failed to save profile. Please try again.", edit mode stays open with form data intact
  - Investor post deal with browser offline → toast "Failed to post deal. Please try again.", dialog stays open, button re-enables

- [ ] **Email failure doesn't block approval** (AdminDashboard-specific):
  - Force the email integration to fail (e.g., block the domain)
  - Approve an application → the member state updates succeed, success toast fires, email failure logged to console but NOT surfaced to the admin

---

## Reviewer notes

- **Every catch block logs before toasting.** `console.error(...)` preserves the debugging trail even when the user-facing message is generic. Production error monitoring (once Sentry is wired) will pick these up.
- **Early-return from error path** keeps the success path (invalidation, success toast, closing edit mode) from running partially. Simpler than a nested if/else and less error-prone.
- **`err` instead of `e` in PostDealForm** is just local preference — the surrounding file didn't have an `e` convention to match. Others use `e`.
- **No `finally` blocks.** Early-return covers the state cleanup on both paths; `finally` would force us to split `setSaving(false)` from the error/success branches it naturally belongs to. The patterns are symmetric and easy to read without it.

---

## Progress

| Item | Status |
|---|---|
| T2.1, T2.3, T2.8 | ✅ Merged |
| T2.2a/b/d/e/f/g | ✅ Merged |
| T2.4a/b, T2.5 | ✅ Merged |
| T2.6, T2.6.1, T2.6.2 | ✅ Merged |
| T3.4 pagination | ✅ Merged |
| AuthContext refactor | 🚀 Deploying |
| **Mutation error handling** | **⏳ This PR** |

After this lands, remaining work is either non-code (T2.7 audit doc), blocked (Sentry decision), or requires Base44 backend work (aggregation, filter indexes). The code-quality loop from the original audit is closed.
