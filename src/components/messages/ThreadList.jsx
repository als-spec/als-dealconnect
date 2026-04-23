import { Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatMessageTime,
  getOtherParticipantName,
  isThreadUnread,
} from "@/lib/messageUtils";

/**
 * Sidebar list of message threads. Pure presentation — all data and
 * handlers come from props.
 *
 * Props:
 *   threads            - array of MessageThread records, already filtered to the
 *                        current user's participation
 *   currentUserId      - for unread detection and other-participant name
 *   selectedThreadId   - id of the currently-open thread (for highlight)
 *   onSelectThread     - (thread) => void
 *   onNewThread        - () => void, opens the new-thread modal
 *   className          - optional extra classes for the root element
 */
export default function ThreadList({
  threads,
  currentUserId,
  selectedThreadId,
  onSelectThread,
  onNewThread,
  className,
}) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-bold text-navy text-lg">Messages</h2>
        <button
          onClick={onNewThread}
          className="gradient-primary text-white p-1.5 rounded-lg hover:opacity-90 transition-opacity"
          aria-label="Start a new conversation"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click + to start one</p>
          </div>
        )}

        {threads.map(thread => {
          const unread = isThreadUnread(thread, currentUserId);
          const otherName = getOtherParticipantName(thread, currentUserId);
          return (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors",
                selectedThreadId === thread.id && "bg-teal/5 border-l-2 border-l-teal"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {unread && <span className="w-2 h-2 rounded-full bg-teal flex-shrink-0" />}
                    <p className={cn(
                      "text-sm truncate",
                      unread ? "font-bold text-navy" : "font-medium text-foreground"
                    )}>
                      {otherName}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.subject}</p>
                  {thread.last_message && (
                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{thread.last_message}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatMessageTime(thread.last_message_at)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
