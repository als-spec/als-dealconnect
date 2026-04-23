import { format } from "date-fns";
import { Clock, CheckCircle2, Loader2, Award } from "lucide-react";

export const STAGES = [
  { key: "requested", label: "Requested", icon: Clock },
  { key: "accepted", label: "Accepted", icon: CheckCircle2 },
  { key: "in_progress", label: "In Progress", icon: Loader2 },
  { key: "completed", label: "Completed", icon: Award },
];

export const STATUS_NEXT = {
  requested: "accepted",
  accepted: "in_progress",
  in_progress: "completed",
};

export const STATUS_COLORS = {
  requested: "text-amber-600 bg-amber-50",
  accepted: "text-teal bg-teal/10",
  in_progress: "text-cyan bg-cyan/10",
  completed: "text-green-600 bg-green-50",
};

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/**
 * Format a ServiceRequest timestamp: "MMM d, h:mm a". Returns "" on invalid input.
 */
export function formatRequestDate(d) {
  if (!d) return "";
  try { return format(new Date(d), "MMM d, h:mm a"); } catch { return ""; }
}

/**
 * Can this user advance the status of a ServiceRequest?
 *
 * Only TCs can advance status — they are the workflow owners for the
 * transaction. Investors are read-only on the stepper (they wait for
 * the TC to move things forward). Admin is oversight-only (T2.6.2) —
 * admin can see the stepper but doesn't push transactions through it.
 * PMLs don't participate in the TC/investor ServiceRequest flow.
 */
export function canAdvanceStatus(userRole) {
  return userRole === "tc";
}
