import { Plus, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUS_COLORS,
  formatRequestDate,
} from "@/lib/serviceRequestUtils";

/**
 * Sidebar list of ServiceRequests. Pure presentation — all data and
 * handlers come from props.
 *
 * Props:
 *   requests            - array of ServiceRequest records, already filtered
 *                         for the current user
 *   currentUserRole     - "tc" | "investor" | "admin" (controls "new" button
 *                         visibility — admins don't create requests)
 *   selectedRequestId   - id of the currently-open request (for highlight)
 *   onSelectRequest     - (request) => void
 *   onNewRequest        - () => void, opens the new-request modal
 *   className           - optional extra classes for the root element
 */
export default function RequestList({
  requests,
  currentUserRole,
  selectedRequestId,
  onSelectRequest,
  onNewRequest,
  className,
}) {
  const canCreate = currentUserRole && currentUserRole !== "admin";

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-bold text-navy text-lg">Service Requests</h2>
        {canCreate && (
          <button
            onClick={onNewRequest}
            className="gradient-primary text-white p-1.5 rounded-lg hover:opacity-90 transition-opacity"
            aria-label="Create a new service request"
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
            {canCreate && (
              <p className="text-xs text-muted-foreground mt-1">Click + to create one</p>
            )}
          </div>
        )}
        {requests.map(req => (
          <button
            key={req.id}
            onClick={() => onSelectRequest(req)}
            className={cn(
              "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors",
              selectedRequestId === req.id && "bg-teal/5 border-l-2 border-l-teal"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy truncate">{req.deal_title || "Untitled Request"}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  TC: {req.tc_name} · Investor: {req.investor_name}
                </p>
                <span className={cn(
                  "inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1.5 capitalize",
                  STATUS_COLORS[req.status]
                )}>
                  {req.status?.replace("_", " ")}
                </span>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatRequestDate(req.created_date)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
