import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Plus, X, FileText, Upload, CheckCircle2, Clock, Loader2, Award, ChevronLeft, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

const STAGES = [
  { key: "requested", label: "Requested", icon: Clock },
  { key: "accepted", label: "Accepted", icon: CheckCircle2 },
  { key: "in_progress", label: "In Progress", icon: Loader2 },
  { key: "completed", label: "Completed", icon: Award },
];

const STATUS_NEXT = {
  requested: "accepted",
  accepted: "in_progress",
  in_progress: "completed",
};

const STATUS_COLORS = {
  requested: "text-amber-600 bg-amber-50",
  accepted: "text-teal bg-teal/10",
  in_progress: "text-cyan bg-cyan/10",
  completed: "text-green-600 bg-green-50",
};

function ProgressStepper({ status }) {
  const currentIdx = STAGES.findIndex(s => s.key === status);
  return (
    <div className="flex items-center w-full py-4">
      {STAGES.map((stage, i) => {
        const Icon = stage.icon;
        const done = i <= currentIdx;
        const current = i === currentIdx;
        return (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all",
                done
                  ? "border-transparent text-white"
                  : "border-border text-muted-foreground bg-background"
              )}
                style={done ? { background: "linear-gradient(135deg, hsl(168 100% 45%), hsl(196 100% 50%))" } : {}}
              >
                <Icon className={cn("w-4 h-4", current && !done && "animate-spin")} />
              </div>
              <span className={cn("text-xs mt-1 font-medium whitespace-nowrap", done ? "text-teal" : "text-muted-foreground")}>
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 rounded-full"
                style={i < currentIdx
                  ? { background: "linear-gradient(90deg, hsl(168 100% 45%), hsl(196 100% 50%))" }
                  : { background: "hsl(var(--border))" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ServiceRequests() {
  const { data: user } = useCurrentUser();
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedParty, setSelectedParty] = useState(null);
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newComment, setNewComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Load dependents once the user resolves.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const users = await base44.entities.User.list();
      setAllUsers(users.filter(usr => usr.id !== user.id));
      await loadRequests(user);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadRequests = async (u) => {
    const u_ = u || user;
    if (!u_) return;
    const all = await base44.entities.ServiceRequest.list('-created_date', 200);
    const mine = u_.role === "admin"
      ? all
      : all.filter(r => r.tc_id === u_.id || r.investor_id === u_.id);
    setRequests(mine);
  };

  const advanceStatus = async () => {
    if (!selected || !STATUS_NEXT[selected.status]) return;
    const nextStatus = STATUS_NEXT[selected.status];
    const now = new Date().toISOString();
    const timestamps = {
      accepted: { accepted_at: now },
      in_progress: { in_progress_at: now },
      completed: { completed_at: now },
    };
    setSaving(true);
    try {
      const updated = await base44.entities.ServiceRequest.update(selected.id, {
        status: nextStatus,
        ...timestamps[nextStatus],
      });
      setSelected(updated);
      await loadRequests();
    } catch (e) {
      toast.error("Failed to update status. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !selected) return;
    const comment = {
      author_id: user.id,
      author_name: user.full_name,
      content: newComment.trim(),
      timestamp: new Date().toISOString(),
    };
    const updated = await base44.entities.ServiceRequest.update(selected.id, {
      comments: [...(selected.comments || []), comment],
    });
    setSelected(updated);
    setNewComment("");
    await loadRequests();
  };

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/gif", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

  const uploadDocument = async (e) => {
    const file = e.target.files[0];
    if (!file || !selected) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Maximum size is 25 MB.");
      e.target.value = '';
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("File type not allowed. Please upload a PDF, image, Word, or Excel file.");
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const doc = {
        name: file.name,
        url: file_url,
        uploaded_by: user.full_name,
        uploaded_at: new Date().toISOString(),
      };
      const updated = await base44.entities.ServiceRequest.update(selected.id, {
        documents: [...(selected.documents || []), doc],
      });
      setSelected(updated);
      await loadRequests();
    } catch (e) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const createRequest = async () => {
    if (!newDealTitle.trim() || !selectedParty) return;
    setSaving(true);
    const isTC = user?.role === "tc";
    const req = await base44.entities.ServiceRequest.create({
      deal_title: newDealTitle.trim(),
      tc_id: isTC ? user.id : selectedParty.id,
      tc_name: isTC ? user.full_name : selectedParty.full_name,
      investor_id: isTC ? selectedParty.id : user.id,
      investor_name: isTC ? selectedParty.full_name : user.full_name,
      status: "requested",
      requested_at: new Date().toISOString(),
      notes: newNotes.trim(),
      comments: [],
      documents: [],
    });
    setShowNew(false);
    setNewDealTitle("");
    setNewNotes("");
    setSelectedParty(null);
    setUserSearch("");
    await loadRequests();
    setSelected(req);
    setShowMobileDetail(true);
    setSaving(false);
  };

  const filteredUsers = allUsers.filter(u =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const formatDate = (d) => {
    if (!d) return "";
    try { return format(new Date(d), 'MMM d, h:mm a'); } catch { return ""; }
  };

  const canAdvance = user?.role === "tc" || user?.role === "admin";

  return (
    <div className="h-[calc(100vh-120px)] flex rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
      {/* List Panel */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 border-r border-border flex flex-col flex-shrink-0",
        showMobileDetail && "hidden md:flex"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-navy text-lg">Service Requests</h2>
          {user?.role !== "admin" && (
            <button
              onClick={() => setShowNew(true)}
              className="gradient-primary text-white p-1.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {requests.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No service requests yet</p>
              {user?.role !== "admin" && (
                <p className="text-xs text-muted-foreground mt-1">Click + to create one</p>
              )}
            </div>
          )}
          {requests.map(req => (
            <button
              key={req.id}
              onClick={() => { setSelected(req); setShowMobileDetail(true); }}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors",
                selected?.id === req.id && "bg-teal/5 border-l-2 border-l-teal"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{req.deal_title || "Untitled Request"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    TC: {req.tc_name} · Investor: {req.investor_name}
                  </p>
                  <span className={cn("inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1.5 capitalize", STATUS_COLORS[req.status])}>
                    {req.status?.replace("_", " ")}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(req.created_date)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      <div className={cn("flex-1 flex flex-col overflow-hidden", !showMobileDetail && "hidden md:flex")}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground font-medium">Select a request to view details</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="px-6 pt-4 pb-2 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setShowMobileDetail(false)} className="md:hidden p-1 rounded text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-navy text-lg flex-1">{selected.deal_title || "Untitled Request"}</h3>
                <span className={cn("text-xs font-semibold px-3 py-1 rounded-full capitalize", STATUS_COLORS[selected.status])}>
                  {selected.status?.replace("_", " ")}
                </span>
              </div>
              <div className="text-xs text-muted-foreground flex gap-4 mb-2">
                <span>TC: <span className="font-medium text-navy">{selected.tc_name}</span></span>
                <span>Investor: <span className="font-medium text-navy">{selected.investor_name}</span></span>
              </div>
              <ProgressStepper status={selected.status} />
              {canAdvance && STATUS_NEXT[selected.status] && (
                <div className="pb-3">
                  <button
                    onClick={advanceStatus}
                    disabled={saving}
                    className="gradient-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? "Updating…" : `Mark as ${STATUS_NEXT[selected.status]?.replace("_", " ")}`}
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              {/* Timestamps */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {STAGES.map(stage => {
                  const tsField = `${stage.key}_at`;
                  const ts = stage.key === "requested" ? selected.requested_at : selected[tsField];
                  return (
                    <div key={stage.key} className="bg-muted/40 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground font-medium">{stage.label}</p>
                      <p className="text-xs text-navy font-semibold mt-1">{ts ? formatDate(ts) : "—"}</p>
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              {selected.notes && (
                <div>
                  <h4 className="font-bold text-navy mb-2 text-sm">Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-4">{selected.notes}</p>
                </div>
              )}

              {/* Documents */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-navy text-sm">Documents</h4>
                  <div>
                    <input type="file" ref={fileInputRef} onChange={uploadDocument} className="hidden" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 text-xs text-teal font-semibold hover:opacity-80 transition-opacity"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploading ? "Uploading…" : "Upload"}
                    </button>
                  </div>
                </div>
                {(!selected.documents || selected.documents.length === 0) ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.documents.map((doc, i) => (
                      <a key={i} href={doc.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-teal/40 hover:bg-teal/5 transition-all group">
                        <FileText className="w-4 h-4 text-teal flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">by {doc.uploaded_by} · {formatDate(doc.uploaded_at)}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div>
                <h4 className="font-bold text-navy text-sm mb-3">Comments</h4>
                <div className="space-y-3 mb-4">
                  {(!selected.comments || selected.comments.length === 0) && (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  )}
                  {(selected.comments || []).map((c, i) => (
                    <div key={i} className={cn("flex", c.author_id === user?.id ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5",
                        c.author_id === user?.id ? "gradient-primary text-navy" : "bg-muted/60 text-foreground border border-border"
                      )}>
                        {c.author_id !== user?.id && (
                          <p className="text-xs font-semibold text-muted-foreground mb-1">{c.author_name}</p>
                        )}
                        <p className="text-sm">{c.content}</p>
                        <p className={cn("text-xs mt-1 text-right", c.author_id === user?.id ? "text-navy/60" : "text-muted-foreground")}>
                          {formatDate(c.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                    placeholder="Add a comment…"
                    className="flex-1 min-h-[40px] max-h-[100px] resize-none text-sm"
                    rows={1}
                  />
                  <button
                    onClick={addComment}
                    disabled={!newComment.trim()}
                    className="gradient-primary text-white p-2.5 rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-navy text-lg">New Service Request</h3>
              <button onClick={() => { setShowNew(false); setSelectedParty(null); setUserSearch(""); setNewDealTitle(""); setNewNotes(""); }}>
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-navy mb-1.5 block">Deal Title</label>
                <Input value={newDealTitle} onChange={e => setNewDealTitle(e.target.value)} placeholder="e.g. 123 Main St Fix & Flip" />
              </div>
              <div>
                <label className="text-sm font-semibold text-navy mb-1.5 block">
                  {user?.role === "tc" ? "Investor / Agent" : "Transaction Coordinator"}
                </label>
                <Input
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); setSelectedParty(null); }}
                  placeholder="Search by name or email…"
                />
                {userSearch && !selectedParty && (
                  <div className="mt-1 border border-border rounded-xl overflow-hidden max-h-36 overflow-y-auto shadow-sm">
                    {filteredUsers.slice(0, 6).map(u => (
                      <button key={u.id} onClick={() => { setSelectedParty(u); setUserSearch(u.full_name); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm flex items-center gap-2.5 border-b border-border/50 last:border-0">
                        <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.full_name?.[0] || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-navy leading-tight">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </button>
                    ))}
                    {filteredUsers.length === 0 && <p className="text-sm text-muted-foreground px-3 py-3">No users found</p>}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold text-navy mb-1.5 block">Notes (optional)</label>
                <Textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Any details about this request…" rows={3} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => { setShowNew(false); setSelectedParty(null); setUserSearch(""); setNewDealTitle(""); setNewNotes(""); }}>
                  Cancel
                </Button>
                <button
                  className="flex-1 gradient-primary text-white font-semibold py-2 rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
                  onClick={createRequest}
                  disabled={!newDealTitle.trim() || !selectedParty || saving}
                >
                  {saving ? "Creating…" : "Create Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}