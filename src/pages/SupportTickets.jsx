import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, LifeBuoy, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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

export default function SupportTickets() {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");
  const [commentingId, setCommentingId] = useState(null);
  const [form, setForm] = useState({ subject: "", description: "", priority: "medium" });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const u = await base44.auth.me();
    setUser(u);
    const all = await base44.entities.SupportTicket.filter({ reported_by_user_id: u.id }, "-created_date");
    setTickets(all);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error("Please fill in subject and description.");
      return;
    }
    setSubmitting(true);
    await base44.entities.SupportTicket.create({
      ...form,
      reported_by_user_id: user.id,
      reported_by_user_name: user.full_name,
      status: "open",
    });
    toast.success("Ticket submitted! Our team will respond shortly.");
    setForm({ subject: "", description: "", priority: "medium" });
    setShowForm(false);
    setSubmitting(false);
    load();
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
    });
    setComment("");
    setCommentingId(null);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy">Support</h1>
          <p className="text-muted-foreground mt-1">Submit and track your support requests.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gradient-primary text-white border-0 gap-2">
          <Plus className="w-4 h-4" /> New Ticket
        </Button>
      </div>

      {/* New Ticket Form */}
      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-bold text-navy">Submit a Support Ticket</h2>
          <div>
            <label className="text-sm font-medium text-navy block mb-1">Subject</label>
            <input
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-teal"
              placeholder="Brief description of the issue"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-navy block mb-1">Description</label>
            <textarea
              rows={4}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-teal resize-none"
              placeholder="Please describe your issue in detail..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-navy block mb-1">Priority</label>
            <select
              className="border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-teal"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={submitting} className="gradient-primary text-white border-0">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Ticket"}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Ticket List */}
      {tickets.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <LifeBuoy className="w-12 h-12 text-teal/30 mx-auto mb-3" />
          <p className="font-semibold text-navy">No tickets yet</p>
          <p className="text-sm text-muted-foreground mt-1">Submit a ticket if you need help with anything.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
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
                  <p className="text-xs text-muted-foreground mt-1">{moment(ticket.created_date).fromNow()}</p>
                </div>
                {expandedId === ticket.id ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>

              {expandedId === ticket.id && (
                <div className="px-5 pb-5 border-t border-border space-y-4">
                  <p className="text-sm text-slate-text pt-4">{ticket.description}</p>

                  {/* Comments */}
                  {(ticket.comments || []).length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Replies</p>
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

                  {ticket.status !== "closed" && ticket.status !== "resolved" && (
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-teal"
                        placeholder="Add a reply..."
                        value={expandedId === ticket.id ? comment : ""}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleComment(ticket)}
                      />
                      <Button size="sm" onClick={() => handleComment(ticket)} disabled={commentingId === ticket.id} className="gradient-primary text-white border-0">
                        {commentingId === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
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