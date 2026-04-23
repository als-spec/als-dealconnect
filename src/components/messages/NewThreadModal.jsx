import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Modal for starting a new conversation. Owns the recipient search state,
 * subject text, and create mutation. On successful create, calls
 * `onThreadCreated(newThread)` so the parent can select it and close the
 * modal.
 *
 * Props:
 *   open               - boolean, controls visibility
 *   onClose            - () => void, close without creating
 *   users              - array of User records the current user can message
 *                        (caller is responsible for pre-filtering: approved
 *                         members, excluding self)
 *   currentUser        - for participant attribution on the new thread
 *   onThreadCreated    - (thread) => void, fires after successful create
 */
export default function NewThreadModal({
  open,
  onClose,
  users,
  currentUser,
  onThreadCreated,
}) {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    return users.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const reset = () => {
    setUserSearch("");
    setSelectedRecipient(null);
    setNewSubject("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!selectedRecipient || !newSubject.trim() || !currentUser) return;
    setCreating(true);
    try {
      const thread = await base44.entities.MessageThread.create({
        participants: [currentUser.id, selectedRecipient.id],
        participant_names: [currentUser.full_name, selectedRecipient.full_name],
        subject: newSubject.trim(),
        last_message: "",
        last_message_at: new Date().toISOString(),
        unread_by: [],
      });
      // Invalidate the thread list so the new thread shows up immediately
      // (the realtime subscription will also catch this, but invalidation
      // removes the dependency on that signal).
      queryClient.invalidateQueries({ queryKey: ['MessageThread'] });
      onThreadCreated?.(thread);
      reset();
    } catch {
      toast.error("Failed to start conversation. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-navy text-lg">New Conversation</h3>
          <button onClick={handleClose} aria-label="Close">
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
                  <button
                    key={u.id}
                    onClick={() => { setSelectedRecipient(u); setUserSearch(u.full_name); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors text-sm flex items-center gap-2.5 border-b border-border/50 last:border-0"
                  >
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
            <Input
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              placeholder="What's this about?"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <button
              className="flex-1 gradient-primary text-white font-semibold py-2 rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
              onClick={handleCreate}
              disabled={!selectedRecipient || !newSubject.trim() || creating}
            >
              {creating ? "Starting…" : "Start Conversation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
