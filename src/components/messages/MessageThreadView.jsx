import { useEffect, useRef } from "react";
import { MessageSquare, ChevronLeft, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatMessageTime,
  getOtherParticipantName,
} from "@/lib/messageUtils";
import { useThreadMessages } from "@/hooks/useThreadMessages";

/**
 * Conversation pane: header + message list + scroll behavior + optional
 * back button for mobile. The composer (textarea/send button) is rendered
 * via the `composer` prop — kept separate so the parent can wire the
 * composer's state (attachments, sending flag) without this component
 * knowing anything about it.
 *
 * Props:
 *   thread         - currently-selected MessageThread, or null for empty state
 *   currentUser    - current user object (for isMine comparison)
 *   onBackMobile   - () => void, called when user taps the mobile back button
 *   composer       - ReactNode to render below the message list
 */
export default function MessageThreadView({
  thread,
  currentUser,
  onBackMobile,
  composer,
}) {
  const messagesEndRef = useRef(null);
  const { messages, isLoading } = useThreadMessages(thread?.id ?? null);

  // Scroll to bottom on thread change and when new messages arrive.
  useEffect(() => {
    if (!thread?.id) return;
    const t = setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
      50
    );
    return () => clearTimeout(t);
  }, [thread?.id, messages.length]);

  if (!thread) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <MessageSquare className="w-16 h-16 text-muted-foreground/20 mb-4" />
        <p className="text-muted-foreground font-medium">Select a conversation</p>
        <p className="text-sm text-muted-foreground/70 mt-1">or click + to start a new one</p>
      </div>
    );
  }

  const otherName = getOtherParticipantName(thread, currentUser?.id);

  return (
    <>
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <button
          onClick={onBackMobile}
          className="md:hidden p-1 rounded text-muted-foreground hover:text-foreground"
          aria-label="Back to thread list"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="font-bold text-navy">{otherName}</p>
          <p className="text-xs text-muted-foreground">{thread.subject}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-4 border-muted border-t-teal rounded-full animate-spin" />
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                  isMine
                    ? "gradient-primary text-navy"
                    : "bg-white border border-border text-slate-700"
                )}>
                  {!isMine && (
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{msg.sender_name}</p>
                  )}
                  {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
                  {msg.file_urls?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.file_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            "flex items-center gap-1.5 text-xs underline hover:opacity-80",
                            isMine ? "text-navy/80" : "text-teal"
                          )}
                        >
                          <FileText className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{msg.file_names?.[i] || "Attachment"}</span>
                        </a>
                      ))}
                    </div>
                  )}
                  <p className={cn(
                    "text-xs mt-1 text-right",
                    isMine ? "text-navy/60" : "text-muted-foreground"
                  )}>
                    {formatMessageTime(msg.created_date)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {composer}
    </>
  );
}
