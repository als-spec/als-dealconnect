import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { formatRequestDate } from "@/lib/serviceRequestUtils";

/**
 * Comments thread + composer for a ServiceRequest.
 * Owns its own draft comment state.
 *
 * PRESERVES T2.5 QUICK FIX: before appending to the comments array, we
 * refetch the fresh ServiceRequest record and append to THAT. Without this,
 * a concurrent comment or document from the other party would be silently
 * overwritten. See src/lib/serviceRequestUtils.js and T2.5 in the audit.
 *
 * Props:
 *   request       - current ServiceRequest record
 *   currentUser   - current user (for author attribution and "mine" styling)
 *   onUpdated     - (updatedRequest) => void, called after successful post
 *                   so the parent can sync its selected-request reference
 */
export default function CommentsSection({ request, currentUser, onUpdated }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!newComment.trim() || !request || !currentUser) return;
    setPosting(true);
    const comment = {
      author_id: currentUser.id,
      author_name: currentUser.full_name,
      content: newComment.trim(),
      timestamp: new Date().toISOString(),
    };
    try {
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
      onUpdated?.(updated);
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ['ServiceRequest'] });
    } catch {
      toast.error("Failed to post comment. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const comments = request?.comments || [];
  // Admin is oversight-only (T2.6.2): can read the conversation but
  // doesn't post comments. TC/investor are the conversation participants.
  const canPost = currentUser?.role && currentUser.role !== "admin";

  return (
    <div>
      <h4 className="font-bold text-navy text-sm mb-3">Comments</h4>
      <div className="space-y-3 mb-4">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}
        {comments.map((c, i) => {
          const isMine = c.author_id === currentUser?.id;
          return (
            <div key={i} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5",
                isMine
                  ? "gradient-primary text-navy"
                  : "bg-muted/60 text-foreground border border-border"
              )}>
                {!isMine && (
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{c.author_name}</p>
                )}
                <p className="text-sm">{c.content}</p>
                <p className={cn(
                  "text-xs mt-1 text-right",
                  isMine ? "text-navy/60" : "text-muted-foreground"
                )}>
                  {formatRequestDate(c.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {canPost && (
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePost();
              }
            }}
            placeholder="Add a comment…"
            className="flex-1 min-h-[40px] max-h-[100px] resize-none text-sm"
            rows={1}
          />
          <button
            onClick={handlePost}
            disabled={!newComment.trim() || posting}
            className="gradient-primary text-white p-2.5 rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
            aria-label="Post comment"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
