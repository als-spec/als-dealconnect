import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

/**
 * Modal for creating a new ServiceRequest. Owns the deal title, party
 * picker search, and notes state. On successful create, calls
 * `onRequestCreated(newRequest)` so the parent can select it and close
 * the modal.
 *
 * Props:
 *   open               - boolean, controls visibility
 *   onClose            - () => void, close without creating
 *   counterparties     - array of User records this user can make a
 *                        request with. Caller is responsible for
 *                        pre-filtering: TCs see investors, investors
 *                        see TCs, admins see all approved members.
 *   currentUser        - for attribution on the new request
 *   onRequestCreated   - (request) => void, fires after successful create
 */
export default function NewRequestModal({
  open,
  onClose,
  counterparties,
  currentUser,
  onRequestCreated,
}) {
  const queryClient = useQueryClient();
  const [dealTitle, setDealTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedParty, setSelectedParty] = useState(null);
  const [saving, setSaving] = useState(false);

  const filteredCounterparties = useMemo(() => {
    const q = userSearch.toLowerCase();
    return counterparties.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  }, [counterparties, userSearch]);

  const reset = () => {
    setDealTitle("");
    setNotes("");
    setUserSearch("");
    setSelectedParty(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!dealTitle.trim() || !selectedParty || !currentUser) return;
    setSaving(true);
    const isTC = currentUser.role === "tc";
    try {
      const req = await base44.entities.ServiceRequest.create({
        deal_title: dealTitle.trim(),
        tc_id: isTC ? currentUser.id : selectedParty.id,
        tc_name: isTC ? currentUser.full_name : selectedParty.full_name,
        investor_id: isTC ? selectedParty.id : currentUser.id,
        investor_name: isTC ? selectedParty.full_name : currentUser.full_name,
        status: "requested",
        requested_at: new Date().toISOString(),
        notes: notes.trim(),
        comments: [],
        documents: [],
      });
      queryClient.invalidateQueries({ queryKey: ['ServiceRequest'] });
      onRequestCreated?.(req);
      reset();
    } catch {
      toast.error("Failed to create request. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const counterpartyLabel = currentUser?.role === "tc"
    ? "Investor / Agent"
    : "Transaction Coordinator";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-navy text-lg">New Service Request</h3>
          <button onClick={handleClose} aria-label="Close">
            <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-navy mb-1.5 block">Deal Title</label>
            <Input
              value={dealTitle}
              onChange={e => setDealTitle(e.target.value)}
              placeholder="e.g. 123 Main St Fix & Flip"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-navy mb-1.5 block">
              {counterpartyLabel}
            </label>
            <Input
              value={userSearch}
              onChange={e => { setUserSearch(e.target.value); setSelectedParty(null); }}
              placeholder="Search by name or email…"
            />
            {userSearch && !selectedParty && (
              <div className="mt-1 border border-border rounded-xl overflow-hidden max-h-36 overflow-y-auto shadow-sm">
                {filteredCounterparties.slice(0, 6).map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedParty(u); setUserSearch(u.full_name); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm flex items-center gap-2.5 border-b border-border/50 last:border-0"
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
                {filteredCounterparties.length === 0 && (
                  <p className="text-sm text-muted-foreground px-3 py-3">No users found</p>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-semibold text-navy mb-1.5 block">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any details about this request…"
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <button
              className="flex-1 gradient-primary text-white font-semibold py-2 rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
              onClick={handleCreate}
              disabled={!dealTitle.trim() || !selectedParty || saving}
            >
              {saving ? "Creating…" : "Create Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
