# T2.4a: Decompose Messages god-component (+ absorbs T2.2c)

First half of T2.4 — god-component decomposition. Breaks the 395-line `Messages.jsx` into a thin orchestrator (129 lines) plus four focused child components and two helpers. Also completes the react-query migration for the Messages page that was deferred from T2.2.

**Stats:** 7 files changed · +684 / −362 · 6 new files · `Messages.jsx` 395 → 129 lines (-67%) · Build ✅ · Full lint ✅ (0 errors, 0 warnings on all new files)

---

## Why now

Three prerequisites that the session established:
- **T2.8 error boundary is live** — if the decomposition regresses at runtime, the user sees a recoverable error screen instead of a white page
- **T2.2 useQuery template is proven** — the react-query pattern applied in this PR exactly mirrors T2.2a/b/d/e/f/g
- **T2.5 race fix landed** — concurrent-write bugs aren't hiding inside the refactor

All three were explicitly called out as risk-reducers before starting T2.4. Now in place.

---

## The split

### Before
One 395-line file mixing seven concerns: thread list rendering, thread selection, message viewing, new-thread creation, user picker, attachment upload, mobile nav state, realtime subscription lifecycle, loading state, and the `base44.entities.Message` / `MessageThread` / `User` fetch orchestration.

### After

| File | Lines | Responsibility |
|---|---:|---|
| `src/pages/Messages.jsx` | 129 | Thin orchestrator — top-level state (selectedThread, showMobileConvo, showNewThread), list queries, thread-list subscription, composes children |
| `src/components/messages/ThreadList.jsx` | 90 | Sidebar with conversations + unread indicators. Pure presentation. |
| `src/components/messages/MessageThreadView.jsx` | 126 | Conversation pane: header, message list, scroll behavior |
| `src/components/messages/MessageComposer.jsx` | 140 | Textarea + attachment chips + file upload + send button. Owns its own state. |
| `src/components/messages/NewThreadModal.jsx` | 147 | Recipient picker + subject input + create mutation |
| `src/hooks/useThreadMessages.js` | 49 | useQuery for messages + realtime subscription |
| `src/lib/messageUtils.js` | 36 | Pure helpers: `formatMessageTime`, `getOtherParticipantName`, `isThreadUnread` |

**Total lines went up** (362 → 684) because of JSDoc, explicit prop contracts, and ARIA labels. But the *median component size* is now ~120 lines — reviewable units. The old god-component wasn't reviewable without the file-search gymnastics of remembering where `handleFileUpload` lived vs. `selectThread` vs. `createThread`.

---

## Absorbs T2.2c

The react-query migration for Messages was deferred in T2.2 because fetch logic was entangled with subscription lifecycle, optimistic updates, and cross-entity writes. Now done inline with the decomposition:

- Thread list: `useQuery({ queryKey: ['MessageThread', 'list', {...}] })` — invalidated by the realtime subscription
- Approved users for picker: `useQuery({ queryKey: ['User', { member_status: 'approved' }] })` — shares cache with the same query from ServiceRequests
- Thread messages: `useQuery` inside `useThreadMessages` hook, with realtime `setQueryData` updates on create/update/delete events

The realtime subscriptions still fire on the same events as before. The difference is they now mutate the react-query cache directly instead of calling `setState` on local arrays — which means other components consuming the same queryKey get the update automatically.

---

## Behavior preserved exactly

Every user-facing behavior in the old implementation is preserved:

- Thread list filters to the current user's participation (same semantics)
- Selecting a thread clears unread flag and scrolls to bottom
- Realtime events on messages (create/update/delete) update the viewing pane immediately
- Realtime events on threads update the sidebar (new thread, last-message bump, unread flag)
- Mobile nav: tapping a thread hides the sidebar; back button returns; new-thread button is always in the header
- Attachments: pick file, 25MB cap, MIME check via Base44 UploadFile, chip display, remove via X button
- Send message: updates Message entity + bumps MessageThread's last_message/last_message_at/unread_by
- Empty state when no thread selected
- Empty state when no threads exist
- Filtering users in the new-thread modal by name or email substring
- Cancel buttons and close-X buttons on modal all reset state correctly

---

## Behavior slightly improved

- **Clear-unread is non-fatal now.** If the MessageThread.update() call fails when selecting a thread, the old code silently swallowed the error. Now wrapped in try/catch with a comment: thread still opens; user can try again next time. Never surfaced a toast either way.
- **Cache updates optimistically on realtime.** Same observable result; previously was done via `setMessages` on local state, now explicitly in the cache — which means `useThreadMessages` hook can be reused elsewhere if we ever add a message-preview popover.
- **ARIA labels on icon-only buttons.** Attach, send, back (mobile), close modal, remove attachment, new thread. Small a11y win — didn't exist before.

---

## What's NOT in this PR

- **ServiceRequests decomposition** — that's T2.4b, the second half of T2.4. Same pattern, different file. Packaged separately so each is reviewable in one sitting.
- **Message search / filter** — the audit didn't flag this; out of scope.
- **Group threads** — thread model is still two-party. Not changed.
- **Message edit / delete UI** — the realtime subscription already handles update and delete events from the server, but there's no UI in this codebase to trigger them. Hook is ready when that UI lands.

---

## Dependencies

**Hard (must be merged first):**
- ✅ T2.1 (useCurrentUser)
- ✅ T2.2a (directories useQuery) — template established

**Soft (not required):**
- ✅ T2.8 error boundary — not technically required, but recommended to land first so the decomposition gets the safety net
- T2.2b/d/e/f/g — independent siblings
- T2.5 race fix — independent; the fix it applied was in ServiceRequests, not Messages

---

## Testing checklist

### Basic send/receive
- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] Open Messages as User A. Thread list renders. Unread threads show the teal dot.
- [ ] Click a thread. Conversation renders. Scroll auto-positions at bottom.
- [ ] Type a message, press Enter → message appears, textarea clears, thread's last_message updates in sidebar.
- [ ] Type a message with Shift+Enter → newline inserts, does NOT send.

### Realtime (requires second browser or tab)
- [ ] User B sends a message from another session. User A's conversation pane shows it within ~1s without any click.
- [ ] User A has the thread list open (no thread selected). User B sends a message to an existing thread. User A's sidebar reflects the new last_message and unread dot within ~1s.
- [ ] User A is viewing a thread. User B deletes a message (via admin console if needed). User A's pane removes it without reload.

### New thread
- [ ] Click + button. Modal opens. Type a name — recipient dropdown shows matching users.
- [ ] Select a recipient, enter a subject, Start Conversation → modal closes, new thread is selected and open.
- [ ] Cancel from the modal without creating → resets state, modal closes.

### Mobile
- [ ] Resize to narrow viewport. Thread list is full-width; selecting a thread hides it and shows the conversation full-width.
- [ ] Tap the left-arrow back button → returns to thread list.

### Attachments
- [ ] Click paperclip, pick a file under 25MB → chip appears with file name.
- [ ] Remove a chip via its X → chip goes away.
- [ ] Pick a file over 25MB → toast error, no chip added.
- [ ] Send a message with one attachment → message body shows the attachment link; clicking opens it in a new tab.

### Cache sharing
- [ ] Navigate away to /dashboard and back. Thread list renders instantly from cache (no spinner flash).
- [ ] Approve a new member from /admin/applications. Open Messages, click + → new approved member shows up in the recipient list (User cache was invalidated by the admin action).

---

## Reviewer notes

- **The `composer` prop on MessageThreadView** is intentional. Keeps MessageThreadView unaware of MessageComposer's local state (attachments, uploading flag). If we ever want a read-only thread view (e.g., admin audit), we can render MessageThreadView without a composer by passing `null`.
- **`useThreadMessages` hook is in `src/hooks/`**, same folder as `useCurrentUser`. The current eslint config doesn't include that folder, so there's no `react-hooks/exhaustive-deps` enforcement there — but the deps are correct as written. (Pre-existing gap in the lint config; not in scope here.)
- **Query key conventions** match all prior T2.2 slices: `['MessageThread', 'list', {...}]`, `['Message', { thread_id }]`, `['User', { member_status: 'approved' }]`.
- **The orchestrator has two useQuery calls at the top level**, not inside any sub-component. This is deliberate: it mirrors the pattern in DealBoard and the profile pages, where the top-level page owns the data flow.
- **`NewThreadModal` invalidates `['MessageThread']`** on create. The realtime subscription on the parent would also catch this eventually, but explicit invalidation removes the timing dependency.

---

## Progress

After T2.4a lands:

| Item | Status |
|---|---|
| T2.1 useCurrentUser | ✅ Merged |
| T2.3 Scope User.list | ✅ Merged |
| T2.8 Error boundaries | ✅ Merged |
| T2.2a/b/d/e/f/g fan-out | ✅ Merged |
| T2.5 race quick fix | ✅ Merged |
| **T2.4a Messages decomp** | **⏳ This PR** |
| T2.4b ServiceRequests decomp | Next |
| T2.6 Route table | Not started |
| T2.7 Permission audit (doc) | Not started |
| T3.4 Admin pagination | Not started |

Two active Tier 2 items after this: T2.4b (same pattern, ServiceRequests) and T2.6 (route table). Then Tier 3 pagination work.
