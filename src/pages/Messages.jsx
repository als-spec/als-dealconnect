import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

import ThreadList from "@/components/messages/ThreadList";
import MessageThreadView from "@/components/messages/MessageThreadView";
import MessageComposer from "@/components/messages/MessageComposer";
import NewThreadModal from "@/components/messages/NewThreadModal";

/**
 * Messages page — thin orchestrator over four focused components:
 *   - ThreadList         (sidebar)
 *   - MessageThreadView  (conversation pane)
 *   - MessageComposer    (input footer, passed as a child of MessageThreadView)
 *   - NewThreadModal     (new conversation modal)
 *
 * This component holds only the top-level coordination state:
 *   - which thread is selected
 *   - whether the mobile conversation pane is showing
 *   - whether the new-thread modal is open
 *
 * Everything else lives in the child components or the hooks they use.
 */
export default function Messages() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState(null);
  const [showMobileConvo, setShowMobileConvo] = useState(false);
  const [showNewThread, setShowNewThread] = useState(false);

  // All threads for the current user. Server returns the newest first;
  // client-side participant filter matches the pre-T2.4 behavior.
  const { data: allThreads = [] } = useQuery({
    queryKey: ['MessageThread', 'list', { sort: '-last_message_at', limit: 200 }],
    queryFn: () => base44.entities.MessageThread.list('-last_message_at', 200),
    enabled: !!user?.id,
  });

  const threads = user
    ? allThreads.filter(t => t.participants?.includes(user.id))
    : [];

  // Users available as recipients for a new thread. Scoped to approved
  // members server-side (from T2.3) and minus the current user.
  const { data: allApprovedUsers = [] } = useQuery({
    queryKey: ['User', { member_status: 'approved' }],
    queryFn: () => base44.entities.User.filter({ member_status: 'approved' }),
    enabled: !!user?.id,
  });

  const recipientCandidates = user
    ? allApprovedUsers.filter(u => u.id !== user.id)
    : [];

  // Realtime thread-list subscription: invalidate the MessageThread query
  // whenever anything changes, so new threads, last-message updates, and
  // unread flags stay fresh without polling.
  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.MessageThread.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['MessageThread'] });
    });
    return unsub;
  }, [user?.id, queryClient]);

  const selectThread = async (thread) => {
    setSelectedThread(thread);
    setShowMobileConvo(true);
    // If this user had the thread marked unread, clear that flag.
    if (thread.unread_by?.includes(user?.id)) {
      try {
        await base44.entities.MessageThread.update(thread.id, {
          unread_by: thread.unread_by.filter(id => id !== user.id),
        });
        queryClient.invalidateQueries({ queryKey: ['MessageThread'] });
      } catch {
        // Non-fatal — the thread still opens even if we couldn't clear
        // the unread flag. User will try again next time they click in.
      }
    }
  };

  const handleThreadCreated = (thread) => {
    setShowNewThread(false);
    selectThread(thread);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
      <ThreadList
        threads={threads}
        currentUserId={user?.id}
        selectedThreadId={selectedThread?.id}
        onSelectThread={selectThread}
        onNewThread={() => setShowNewThread(true)}
        className={cn(
          "w-full md:w-80 lg:w-96 border-r border-border flex-shrink-0",
          showMobileConvo && "hidden md:flex"
        )}
      />

      <div className={cn("flex-1 flex flex-col", !showMobileConvo && "hidden md:flex")}>
        <MessageThreadView
          thread={selectedThread}
          currentUser={user}
          onBackMobile={() => setShowMobileConvo(false)}
          composer={
            selectedThread && (
              <MessageComposer
                thread={selectedThread}
                currentUser={user}
              />
            )
          }
        />
      </div>

      <NewThreadModal
        open={showNewThread}
        onClose={() => setShowNewThread(false)}
        users={recipientCandidates}
        currentUser={user}
        onThreadCreated={handleThreadCreated}
      />
    </div>
  );
}
