# T2.2e: Migrate 3 profile pages to useQuery

Second slice of the T2.2 react-query fan-out. Applies the template proved out in T2.2a (directories) to the profile pages.

**Stats:** 3 files changed · +82 / −83 (net -1) · Build ✅ · Full lint ✅ (0 errors)

---

## What's migrated

| File | Queries introduced | Mutations touched |
|---|---|---|
| `TCProfilePage.jsx` | 3: TCProfile, Review, User (admin-viewing) | Save + Review-submit refetch |
| `PMLProfilePage.jsx` | 2: PMLProfile, User (admin-viewing) | Save |
| `InvestorProfilePage.jsx` | 2: InvestorProfile, User (admin-viewing) | Save |

All three follow the same pattern with entity names and fetch dependencies as the only variance.

---

## The pattern (expanded from T2.2a)

T2.2a introduced the basic useQuery shape for read-only directories. T2.2e extends it with:

1. **Dependent queries** via `enabled`:
   ```jsx
   const { data: reviews = [] } = useQuery({
     queryKey: ['Review', { tc_profile_id: profile?.id }],
     queryFn: () => base44.entities.Review.filter({ tc_profile_id: profile.id }),
     enabled: !!profile?.id,  // waits for profile to resolve
   });
   ```
   Replaces the manual sequencing in the old `load()` function.

2. **Conditional parallel queries** for the admin-viewing case:
   ```jsx
   const { data: profileUserList = [] } = useQuery({
     queryKey: ['User', { id: targetId }],
     queryFn: () => base44.entities.User.filter({ id: targetId }),
     enabled: !isOwner && !!targetId && !!currentUser,  // only when needed
   });
   const profileUser = isOwner ? currentUser : (profileUserList[0] || null);
   ```

3. **Save → invalidate** replaces the `setProfile(...) + load()` dance:
   ```jsx
   const handleSave = async (formData) => {
     // ... create or update
     queryClient.invalidateQueries({ queryKey: ['TCProfile', { user_id: targetId }] });
     queryClient.invalidateQueries({ queryKey: ['Review'] });  // tc only
   };
   ```
   No more manual state updates after mutation. react-query refetches automatically.

4. **Scoped ReviewForm callback** (TCProfilePage):
   ```jsx
   onSubmitted={() => queryClient.invalidateQueries({
     queryKey: ['Review', { tc_profile_id: profile.id }]
   })}
   ```
   Was `onSubmitted={load}` which refetched everything. Now only reviews refetch when a new review lands.

---

## Bug fix riding along

**`InvestorProfilePage.jsx`**: pre-existing gap where the old code only populated `profileUser` when the viewer was the owner. When an admin viewed another user's investor profile, the name and company fields rendered blank.

The other two pages (TC, PML) already had the `else { await User.filter(...) }` fallback. Applying the uniform pattern in this PR closes the gap — now admins see the full profile header when viewing any member.

Called out in the commit message so it's not an invisible change. If you want a dedicated bug-fix PR for this one, I can split it out, but it seemed natural to fix while applying the consistent pattern.

---

## Behavior changes worth flagging

1. **Faster first render on TCProfilePage.** Previously, `load()` fetched profile → THEN reviews → THEN user sequentially. Now profile and user fetch in parallel (they're independent). Reviews still wait for profile.id because they depend on it.

2. **Instant re-entry via cache.** Navigating between profile pages (e.g., admin clicking through directory → profile → back → another profile) now hits cached data on the first view. staleTime is react-query's default (0), so data revalidates in background but renders immediately.

3. **No regression in save flow.** The save handler still awaits the update/create, toasts success, closes edit mode. The only change is `load()` → `invalidateQueries()` for the refetch, which is semantically equivalent.

4. **No regression in review submission.** Same flow, just scoped invalidation.

---

## What's NOT in this PR

- No changes to the rendering / JSX of any page
- No changes to `handleSave` logic (just `load()` → invalidate)
- No `useMutation` migration — the save handlers still use raw `await`. That's a T2.2 follow-up that applies across all mutation sites and may consolidate with a global error handler refactor.
- No changes to `profileUserId` search-param handling

---

## Dependencies

**Hard (must be merged first):**
- ✅ T2.1 (useCurrentUser hook) — profile pages import `useCurrentUser`
- ✅ T2.2a (directories useQuery) — this PR extends the same pattern; the preflight checks T2.2a's presence on main

**Soft (not required):**
- T2.3, T2.8 — independent. Either order works.

---

## Testing checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] **As a TC** — visit `/tc-profile` (own profile). Own info renders. Click Edit, change a field, Save → profile refetches and shows the updated value.
- [ ] **As an investor** — visit `/investor-profile`. Repeat edit flow.
- [ ] **As a PML** — visit `/pml-profile`. Repeat edit flow.
- [ ] **As an investor viewing a TC** — click into `/tc-profile?id=<some-tc-user-id>` from the TC directory. Profile loads, reviews appear, name/company render correctly.
- [ ] **As an admin viewing another investor** — `/investor-profile?id=<other-user-id>`. Name/company should now render (this was the pre-existing bug).
- [ ] **Review submission flow** — as an investor viewing a TC, click "Leave Review", submit. The reviews list refreshes in place. No full-page reload.
- [ ] **Navigation cache check** — open `/tc-profile?id=A`, then `/tc-profile?id=B`, then back to A. The A view should render instantly on return (cached).
- [ ] **Stale currentUser guard** — log out, visit `/tc-profile`. You should see the login flow, not a broken page. The `enabled: !!targetId` and `enabled: !isOwner && !!currentUser` guards prevent fetches when user isn't resolved.

---

## Reviewer notes

- **Removed dead state**: the old `setProfile(created)` inside the `handleSave` else-branch is gone. It was only there to keep the UI in sync before `load()` ran; now `invalidateQueries` handles both the refetch and the state update.
- **`enabled` chains** are carefully sequenced:
  - Profile: `!!targetId` (waits for currentUser to provide the id)
  - Reviews (TC only): `!!profile?.id` (waits for profile to resolve)
  - User (admin-viewing): `!isOwner && !!targetId && !!currentUser` (all three gates required)
- **`useQueryClient` import added** to all three files for invalidation.
- **Net line count: -1**. The code is slightly more compact because `useState + useEffect + useCallback(load)` is heavier than `useQuery + invalidateQueries`.

---

## Progress on T2.2 fan-out

- ✅ T2.2a — Directory pages (3 files) [landed]
- ✅ T2.2e — Profile pages (3 files) [this PR]
- ⏳ T2.2b — Admin CRUD pages (Members, Applications, Partners, SupportTickets)
- ⏳ T2.2d — Deal board family
- ⏳ T2.2f — Dashboard pages
- ⏳ T2.2g — Public pages (PartnersPage, SupportTickets for members)
- ⚠️ T2.2c — Messaging pages — likely folded into T2.4 god-component decomposition

After this PR, 6 of ~18 page files are on useQuery. The template is well-proven; remaining slices are mechanical.
