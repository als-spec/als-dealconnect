# Clean up 24 pre-existing unused-import lint errors

Pure cleanup — zero behavioral change. Discovered while running the Tier 1 Quick Wins PR through `npm run lint`: the full codebase had 24 pre-existing `unused-imports/no-unused-imports` errors unrelated to that work.

All 24 were auto-fixable. This PR runs `npm run lint:fix` (which is `eslint . --fix` under the hood) and commits the result.

**Stats:** 13 files changed · +9 / −18 · Build ✅ · Lint ✅ (0 errors)

---

## Files touched

```
src/components/deals/DealCard.jsx
src/components/deals/DealDetailModal.jsx
src/components/profile/InvestorProfileEditForm.jsx
src/components/profile/PMLProfileEditForm.jsx
src/components/profile/TCProfileEditForm.jsx
src/pages/InvestorProfilePage.jsx
src/pages/Onboarding.jsx
src/pages/SupportTickets.jsx
src/pages/TCDirectory.jsx
src/pages/admin/Applications.jsx
src/pages/dashboard/AdminDashboard.jsx
src/pages/dashboard/InvestorDashboard.jsx
src/pages/dashboard/TCDashboard.jsx
```

## What was removed

Dead `lucide-react` icon imports (`Badge`, `Building2`, `Phone`, `MapPin`, `Clock`, `CheckCircle2`, `Eye`, `X`, `Plus`, `Tag`, `Layers`, `MessageSquare`, `ChevronRight`, `SlidersHorizontal`), and unused utility imports (`cn`, `TagPill`, `RegistrationStep`).

No runtime imports removed — only symbols that were imported and never referenced. The React tree is unchanged.

## Why this PR exists separately

Keeping it out of the Tier 1 PR preserves review clarity: Tier 1 is feature work with testable behavior, this is pure codebase hygiene. They have zero dependency on each other and can merge in either order.

## Testing

- [ ] `npm run lint` → 0 errors (was 24)
- [ ] `npm run build` → succeeds
- [ ] Spot-check any of the 13 files to confirm they still render (they will — no runtime changes)

## Follow-up

After this lands, the Tier 1 PR's `REFACTOR_PLAN.md` Phase 3 can be tightened back to a full-codebase `npm run lint` gate with `--max-warnings` of 8 (the exhaustive-deps warnings the Tier 1 config change surfaces on pre-existing subscription-closure bugs). Not required, just an option.
