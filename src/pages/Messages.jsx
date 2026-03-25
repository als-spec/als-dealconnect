import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Paperclip, Plus, X, FileText, MessageSquare, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function Messages() {
  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showNewThread, setShowNewThread] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [newSubject, setNewSubject] = useState("");
  const [showMobileConvo, setShowMobileConvo] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentUser = useRef(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const u = await base44.auth.me();
    setUser(u);
    currentUser.current = u;
    const users = await base44.entities.User.list();
    setAllUsers(users.filter(usr => usr.id !== u.id));
    await loadThreads(u);
  };

  const loadThreads = async (u) => {
    const u_ = u || currentUser.current;
    if (!u_) return;
    const all = await base44.entities.MessageThread.list('-last_message_at', 200);
    setThreads(all.filter(t => t.participants?.includes(u_.id)));
  };

  useEffect(() => {
    if (!user) return;
    const unsub = base44.entities.MessageThread.subscribe(() => loadThreads(user));
    return unsub;
  }, [user?.id]);

  const selectThread = async (thread) => {
    setSelectedThread(thread);
    setShowMobileConvo(true);
    const all = await base44.entities.Message.list('created_date', 500);
    setMessages(all.filter(m => m.thread_id === thread.id));
    if (thread.unread_by?.includes(user?.id)) {
      base44.entities.MessageThread.update(thread.id, {
        unread_by: thread.unread_by.filter(id => id !== user.id)
      });
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  useEffect(() => {
    if (!selectedThread) return;
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.thread_id === selectedThread.id) {
        if (event.type === 'create') setMessages(prev => [...prev, event.data]);
        else if (event.type === 'update') setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        else if (event.type === 'delete') setMessages(prev => prev.filter(m => m.id !== event.id));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    });
    return unsub;
  }, [selectedThread?.id]);

  const sendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    setSending(true);
    await base44.entities.Message.create({
      thread_id: selectedThread.id,
      sender_id: user.id,
      sender_name: user.full_name,
      content: newMessage.trim(),
      file_urls: attachments.map(a => a.url),
      file_names: attachments.map(a => a.name),
    });
    const otherParticipants = selectedThread.participants.filter(id => id !== user.id);
    await base44.entities.MessageThread.update(selectedThread.id, {
      last_message: newMessage.trim() || `[${attachments.length} file(s)]`,
      last_message_at: new Date().toISOString(),
      unread_by: otherParticipants,
    });
    setNewMessage("");
    setAttachments([]);
    setSending(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAttachments(prev => [...prev, { name: file.name, url: file_url }]);
    setUploading(false);
    e.target.value = '';
  };

  const createThread = async () => {
    if (!selectedRecipient || !newSubject.trim()) return;
    const thread = await base44.entities.MessageThread.create({
      participants: [user.id, selectedRecipient.id],
      participant_names: [user.full_name, selectedRecipient.full_name],
      subject: newSubject.trim(),
      last_message: "",
      last_message_at: new Date().toISOString(),
      unread_by: [],
    });
    setShowNewThread(false);
    setSelectedRecipient(null);
    setNewSubject("");
    setUserSearch("");
    await loadThreads(user);
    selectThread(thread);
  };

  const filteredUsers = allUsers.filter(u =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const getOtherName = (thread) => {
    if (!user || !thread.participant_names) return "Unknown";
    const idx = thread.participants?.indexOf(user.id);
    return idx === 0 ? (thread.participant_names[1] || "Unknown") : (thread.participant_names[0] || "Unknown");
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const isToday = d.toDateString() === new Date().toDateString();
      return isToday ? format(d, 'h:mm a') : format(d, 'MMM d');
    } catch { return ""; }
  };

  const isUnread = (thread) => thread.unread_by?.includes(user?.id);

  return (
    <div className="h-[calc(100vh-120px)] flex rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
      {/* Thread List */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 border-r border-border flex flex-col flex-shrink-0",
        showMobileConvo && "hidden md:flex"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-navy text-lg">Messages</h2>
          <button
            onClick={() => setShowNewThread(true)}
            className="gradient-primary text-white p-1.5 rounded-lg hover:opacity-90 transition-opacity"
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
          {threads.map(thread => (
            <button
              key={thread.id}
              onClick={() => selectThread(thread)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors",
                selectedThread?.id === thread.id && "bg-teal/5 border-l-2 border-l-teal"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isUnread(thread) && <span className="w-2 h-2 rounded-full bg-teal flex-shrink-0" />}
                    <p className={cn("text-sm truncate", isUnread(thread) ? "font-bold text-navy" : "font-medium text-foreground")}>
                      {getOtherName(thread)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.subject}</p>
                  {thread.last_message && (
                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{thread.last_message}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(thread.last_message_at)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Panel */}
      <div className={cn("flex-1 flex flex-col", !showMobileConvo && "hidden md:flex")}>
        {!selectedThread ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground font-medium">Select a conversation</p>
            <p className="text-sm text-muted-foreground/70 mt-1">or click + to start a new one</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <button onClick={() => setShowMobileConvo(false)} className="md:hidden p-1 rounded text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <p className="font-bold text-navy">{getOtherName(selectedThread)}</p>
                <p className="text-xs text-muted-foreground">{selectedThread.subject}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {messages.map(msg => {
                const isMine = msg.sender_id === user?.id;
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
                            <a key={i} href={url} target="_blank" rel="noreferrer"
                              className={cn("flex items-center gap-1.5 text-xs underline hover:opacity-80", isMine ? "text-navy/80" : "text-teal")}>
                              <FileText className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{msg.file_names?.[i] || "Attachment"}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      <p className={cn("text-xs mt-1 text-right", isMine ? "text-navy/60" : "text-muted-foreground")}>
                        {formatTime(msg.created_date)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {attachments.length > 0 && (
              <div className="px-4 py-2 border-t border-border bg-muted/30 flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 text-xs border border-border">
                    <FileText className="w-3 h-3 text-teal" />
                    <span className="max-w-[100px] truncate">{a.name}</span>
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3 text-muted-foreground hover:text-destructive ml-1" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 border-t border-border flex items-end gap-2 bg-card">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-teal flex-shrink-0"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <Textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message… (Enter to send)"
                className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm"
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={sending || (!newMessage.trim() && attachments.length === 0)}
                className="gradient-primary text-white p-2.5 rounded-xl disabled:opacity-40 flex-shrink-0 hover:opacity-90 transition-opacity"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* New Thread Modal */}
      {showNewThread && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-navy text-lg">New Conversation</h3>
              <button onClick={() => { setShowNewThread(false); setSelectedRecipient(null); setUserSearch(""); setNewSubject(""); }}>
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-navy mb-1.5 block">Recipient</label>
                <Input
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); setSelectedRecipient(null); }}
                  placeholder="Search by name or email…"
                />
                {userSearch && !selectedRecipient && (
                  <div className="mt-1 border border-border rounded-xl overflow-hidden max-h-40 overflow-y-auto shadow-sm">
                    {filteredUsers.slice(0, 8).map(u => (
                      <button key={u.id} onClick={() => { setSelectedRecipient(u); setUserSearch(u.full_name); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors text-sm flex items-center gap-2.5 border-b border-border/50 last:border-0">
                        <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.full_name?.[0] || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-navy leading-tight">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </button>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="text-sm text-muted-foreground px-3 py-3">No users found</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold text-navy mb-1.5 block">Subject</label>
                <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="What's this about?" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => { setShowNewThread(false); setSelectedRecipient(null); setUserSearch(""); setNewSubject(""); }}>
                  Cancel
                </Button>
                <button
                  className="flex-1 gradient-primary text-white font-semibold py-2 rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
                  onClick={createThread}
                  disabled={!selectedRecipient || !newSubject.trim()}
                >
                  Start Conversation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}