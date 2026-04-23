import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import {
  STAGES,
  STATUS_NEXT,
  STATUS_COLORS,
  formatRequestDate,
  canAdvanceStatus,
} from "@/lib/serviceRequestUtils";
import ProgressStepper from "./ProgressStepper";
import DocumentsSection from "./DocumentsSection";
import CommentsSection from "./CommentsSection";

/**
 * Detail pane for a single ServiceRequest. Header, progress stepper,
 * timestamps grid, notes, documents, comments. Owns the advanceStatus
 * mutation (scalar write — no race).
 *
 * Props:
 *   request         - currently-selected ServiceRequest, or null for empty state
 *   currentUser     - current user (for role-gated UI and attribution)
 *   onBackMobile    - () => void, mobile back button handler
 *   onRequestUpdated - (updatedRequest) => void, called after any successful
 *                      mutation on this request so the parent can sync its
 *                      selected reference (keeps the detail pane in sync
 *                      without a round-trip through the list refetch)
 */
export default function RequestDetail({
  request,
  currentUser,
  onBackMobile,
  onRequestUpdated,
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  if (!request) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <FileText className="w-16 h-16 text-muted-foreground/20 mb-4" />
        <p className="text-muted-foreground font-medium">Select a request to view details</p>
      </div>
    );
  }

  const canAdvance = canAdvanceStatus(currentUser?.role);
  const nextStatus = STATUS_NEXT[request.status];

  const handleAdvance = async () => {
    if (!nextStatus) return;
    const now = new Date().toISOString();
    const timestamps = {
      accepted: { accepted_at: now },
      in_progress: { in_progress_at: now },
      completed: { completed_at: now },
    };
    setSaving(true);
    try {
      // advanceStatus writes only scalar fields (status + one timestamp).
      // No read-modify-write on arrays, so no race — doesn't need the
      // refetch-before-write pattern used by DocumentsSection/CommentsSection.
      const updated = await base44.entities.ServiceRequest.update(request.id, {
        status: nextStatus,
        ...timestamps[nextStatus],
      });
      onRequestUpdated?.(updated);
      queryClient.invalidateQueries({ queryKey: ['ServiceRequest'] });
    } catch {
      toast.error("Failed to update status. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-4 pb-2 border-b border-border sticky top-0 bg-card z-10">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBackMobile}
            className="md:hidden p-1 rounded text-muted-foreground hover:text-foreground"
            aria-label="Back to request list"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-bold text-navy text-lg flex-1">
            {request.deal_title || "Untitled Request"}
          </h3>
          <span className={cn(
            "text-xs font-semibold px-3 py-1 rounded-full capitalize",
            STATUS_COLORS[request.status]
          )}>
            {request.status?.replace("_", " ")}
          </span>
        </div>
        <div className="text-xs text-muted-foreground flex gap-4 mb-2">
          <span>TC: <span className="font-medium text-navy">{request.tc_name}</span></span>
          <span>Investor: <span className="font-medium text-navy">{request.investor_name}</span></span>
        </div>
        <ProgressStepper status={request.status} />
        {canAdvance && nextStatus && (
          <div className="pb-3">
            <button
              onClick={handleAdvance}
              disabled={saving}
              className="gradient-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Updating…" : `Mark as ${nextStatus?.replace("_", " ")}`}
            </button>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Timestamps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STAGES.map(stage => {
            const tsField = `${stage.key}_at`;
            const ts = stage.key === "requested" ? request.requested_at : request[tsField];
            return (
              <div key={stage.key} className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground font-medium">{stage.label}</p>
                <p className="text-xs text-navy font-semibold mt-1">
                  {ts ? formatRequestDate(ts) : "—"}
                </p>
              </div>
            );
          })}
        </div>

        {/* Notes */}
        {request.notes && (
          <div>
            <h4 className="font-bold text-navy mb-2 text-sm">Notes</h4>
            <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-4">
              {request.notes}
            </p>
          </div>
        )}

        <DocumentsSection
          request={request}
          currentUser={currentUser}
          onUpdated={onRequestUpdated}
        />

        <CommentsSection
          request={request}
          currentUser={currentUser}
          onUpdated={onRequestUpdated}
        />
      </div>
    </div>
  );
}
