# Tier 1 Quick Wins + Landing Page Subscription Fixes

Surgical fixes from the senior-dev audit, grouped into two commits on the same branch so they can be reviewed and merged as one PR — or cherry-picked separately.

**Stats:** 6 files changed · 84 insertions · 55 deletions · Build ✅ · Lint ✅ (0 errors)

---

## Commit 1: Tier 1 Quick Wins (`58bd3d4`)

### 1a. 🔴 Fix global Message fetch

**File:** `src/pages/Messages.jsx`

Before: opening any thread pulled 500 messages from across the entire platform and filtered client-side. Exposed every thread's metadata to any user with devtools.

```diff
- const all = await base44.entities.Message.list('created_date', 500);
- setMessages(all.filter(m => m.thread_id === thread.id));
+ const threadMessages = await base44.entities.Message.filter(
+   { thread_id: thread.id },
+   'created_date',
+   500
+ );
+ setMessages(threadMessages);
```

**Verification before merge:** confirm Base44's Message entity permission rules allow `filter` by `thread_id`. If filters are scoped by participant ownership, this actually improves security automatically.

### 1b. Replace `alert()` with `toast.error()` (7 sites)

**Files:** `src/pages/Messages.jsx`, `src/pages/ServiceRequests.jsx`

Sonner already in use across admin screens. No new deps. Kills the jarring modal alerts.

### 1c. Delete `src/components/ProtectedRoute.jsx`

Exported but never imported anywhere, and destructured two properties from `useAuth()` that `AuthContext` doesn't expose. Silent infinite-fallback trap.

### 1d. Enable `react-hooks/exhaustive-deps` (as `warn`)

**File:** `eslint.config.js`

Set to `warn` so CI doesn't fail. Immediately surfaces 8 pre-existing subscription-closure bugs (Tier 2 work).

---

## Commit 2: Landing Page — Route All Three Subscription Types (`2a7a292`)

Spec requires three distinct member paths (TC, Investor, PML) working from the landing page. Before this commit, only TC and Investor had clean hero paths; PML was either unreachable from the hero or actively misrouted.

### 2a. Hero dropdown for Investor/Lender

**File:** `src/pages/LandingPage.jsx`

The "I'm an Investor or Lender" button was a single link to `?type=investor`, silently routing PMLs to the Investor plan (same price, wrong role and feature set). Replaced with a shadcn `DropdownMenu`:

```
I'm an Investor or Lender ▾
  ├─ 🏗️ Investor / Agent      → /onboarding?type=investor
  └─ 💼 Private Money Lender  → /onboarding?type=pml
```

Visual: button styling unchanged. `ChevronDown` replaces `ArrowRight` to signal dropdown affordance.

### 2b. Fix card CTA labels

**File:** `src/pages/LandingPage.jsx`

Before: `Join as {card.role.split(" ")[0]}` produced "Join as Transaction" and "Join as Private". Replaced with explicit `ctaLabel` field on each card: "Join as TC", "Join as Investor", "Join as Lender".

### 2c. Kill silent Investor-plan fallback

**File:** `src/components/onboarding/PlanSelectionStep.jsx`

```diff
- const plan = PLANS[memberType] || PLANS.investor;
+ const plan = PLANS[memberType];
+ if (!plan) { /* render error state with Back button */ }
```

Previously, a missing `memberType` (URL tamper, partial save, bug in previous step) would silently display the Investor plan and let Stripe charge them. Now surfaces an explicit error and routes back to member-type selection.

---

## End-to-end subscription flow after this PR

| Entry point | TC ($15/mo) | Investor ($29/mo) | PML ($29/mo) |
|---|---|---|---|
| Hero CTA | ✅ "I'm a TC" | ✅ Dropdown → Investor | ✅ Dropdown → PML |
| Member card CTA | ✅ "Join as TC" | ✅ "Join as Investor" | ✅ "Join as Lender" |
| Onboarding preselects | ✅ | ✅ | ✅ |
| Stripe price routed | ✅ TC Basic | ✅ Investor Plan | ✅ PML Plan |
| Missing-type fallback | error + Back | error + Back | error + Back |

---

## Testing checklist

- [ ] Landing page hero: click "I'm an Investor or Lender" → dropdown opens with two choices
- [ ] Click "Private Money Lender" in dropdown → lands on `/onboarding?type=pml` → plan selection shows "Private Money Lender Plan $29/mo"
- [ ] Click "Investor / Agent" in dropdown → lands on `/onboarding?type=investor` → plan selection shows "Investor Plan $29/mo"
- [ ] Hero "I'm a TC" still works → `/onboarding?type=tc` → "TC Basic Plan $15/mo"
- [ ] Lower cards: all three now show full role labels ("Join as TC", "Join as Investor", "Join as Lender")
- [ ] Visit `/onboarding?type=garbage` manually → plan step shows error + Back button (does NOT silently show Investor plan)
- [ ] Messages: open a thread → messages load correctly (only behavioral change in Tier 1)
- [ ] Messages: trigger a file-too-large error → toast appears (no alert)
- [ ] `npm run lint` → 8 warnings (expected — the new exhaustive-deps warnings on old code), 0 errors
- [ ] `npm run build` → succeeds

## Apply

```bash
git checkout -b tier1-quick-wins
git am /path/to/tier1-quick-wins.patch
npm install   # no new deps, but lockfile sanity check
npm run build
```

## What's NOT in this PR (deferred to Tier 2)

- The 8 other places calling `User.list()` — needs server-scoped queries
- The 16 `base44.auth.me()` calls — needs a `useCurrentUser` hook
- The subscription-closure bugs flagged by exhaustive-deps
- Decomposing the 400–500 line god-components in Messages and ServiceRequests
- Stripe webhook `user_id` migration
- Consolidating hardcoded Stripe price IDs into `src/lib/plans.js`

See the full audit report for the Tier 2/3 blueprint.
