import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { LifeBuoy, Loader2, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import moment from "moment";

const STATUS_STYLES = {
  open: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-gray-100 text-gray-500 border-gray-200",
};

const PRIORITY_STYLES = {
  low: "bg-gray-100 text-gray-600 border-gray-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminSupportTickets() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [comment, setComment] = useState("");
  const [commentingId, setCommentingId] = useState(null);
  const [filter, setFilter] = useState("all");

  const { data: tickets = [], isLoading: loading } = useQuery({
    queryKey: ['SupportTicket', 'list', { sort: '-created_date' }],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
  });

  const refreshTickets = () => queryClient.invalidateQueries({ queryKey: ['SupportTicket'] });

  const updateStatus = async (ticket, status) => {
    await base44.entities.SupportTicket.update(ticket.id, { status });
    // Notify member via email
    try {
      await base44.integrations.Core.SendEmail({
        to: ticket.reported_by_user_email || ticket.created_by,
        subject: `Support Ticket Update: ${ticket.subject}`,
        body: `Hi ${ticket.reported_by_user_name},\n\nYour support ticket "${ticket.subject}" has been updated to status: ${status.replace("_", " ")}.\n\nLog in to ALS DealConnect to view the details and any replies.\n\nThe ALS DealConnect Team`,
      });
    } catch (e) {}
    toast.success(`Ticket marked as ${status.replace("_", " ")}`);
    refreshTickets();
  };

  const handleComment = async (ticket) => {
    if (!comment.trim()) return;
    setCommentingId(ticket.id);
    const newComment = {
      author_id: user.id,
      author_name: user.full_name,
      content: comment,
      timestamp: new Date().toISOString(),
    };
    await base44.entities.SupportTicket.update(ticket.id, {
      comments: [...(ticket.comments || []), newComment],
      status: ticket.status === "open" ? "in_progress" : ticket.status,
    });
    // Notify the member
    try {
      await base44.integrations.Core.SendEmail({
        to: ticket.created_by,
        subject: `New Reply on Your Support Ticket: ${ticket.subject}`,
        body: `Hi ${ticket.reported_by_user_name},\n\nAn admin has replied to your support ticket "${ticket.subject}":\n\n"${comment}"\n\nLog in to ALS DealConnect to view the full conversation.\n\nThe ALS DealConnect Team`,
      });
    } catch (e) {}
    setComment("");
    setCommentingId(null);
    toast.success("Reply sent.");
    refreshTickets();
  };

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-navy">Support Tickets</h1>
        <p className="text-muted-foreground mt-1">Manage and respond to member support requests.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "open", "in_progress", "resolved", "closed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all capitalize ${
              filter === s
                ? "gradient-primary text-white border-transparent"
                : "bg-card border-border text-muted-foreground hover:border-teal"
            }`}
          >
            {s === "all" ? `All (${tickets.length})` : `${s.replace("_", " ")} (${tickets.filter(t => t.status === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <LifeBuoy className="w-12 h-12 text-teal/30 mx-auto mb-3" />
          <p className="font-semibold text-navy">No tickets</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <div key={ticket.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              <button
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/20 transition-colors"
                onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-navy">{ticket.subject}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[ticket.status]}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${PRIORITY_STYLES[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    From <span className="font-medium text-navy">{ticket.reported_by_user_name}</span> · {moment(ticket.created_date).fromNow()}
                  </p>
                </div>
                {expandedId === ticket.id ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>

              {expandedId === ticket.id && (
                <div className="px-5 pb-5 border-t border-border space-y-4">
                  <p className="text-sm text-slate-text pt-4">{ticket.description}</p>

                  {/* Status actions */}
                  <div className="flex gap-2 flex-wrap">
                    {ticket.status !== "in_progress" && ticket.status !== "resolved" && ticket.status !== "closed" && (
                      <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs"
                        onClick={() => updateStatus(ticket, "in_progress")}>
                        Mark In Progress
                      </Button>
                    )}
                    {ticket.status !== "resolved" && ticket.status !== "closed" && (
                      <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs"
                        onClick={() => updateStatus(ticket, "resolved")}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Resolved
                      </Button>
                    )}
                    {ticket.status !== "closed" && (
                      <Button size="sm" variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50 text-xs"
                        onClick={() => updateStatus(ticket, "closed")}>
                        Close Ticket
                      </Button>
                    )}
                  </div>

                  {/* Comments */}
                  {(ticket.comments || []).length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conversation</p>
                      {ticket.comments.map((c, i) => (
                        <div key={i} className={`rounded-xl p-3 text-sm ${c.author_id === user.id ? "bg-teal/10 ml-6" : "bg-muted/40 mr-6"}`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-navy text-xs">{c.author_name}</span>
                            <span className="text-xs text-muted-foreground">{moment(c.timestamp).fromNow()}</span>
                          </div>
                          <p className="text-slate-text">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {ticket.status !== "closed" && (
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-teal"
                        placeholder="Reply to member..."
                        value={expandedId === ticket.id ? comment : ""}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleComment(ticket)}
                      />
                      <Button size="sm" onClick={() => handleComment(ticket)} disabled={commentingId === ticket.id} className="gradient-primary text-white border-0">
                        {commentingId === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reply"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}