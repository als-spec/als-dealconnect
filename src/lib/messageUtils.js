import { format } from "date-fns";

/**
 * Format a message timestamp: "h:mm a" if today, "MMM d" otherwise.
 * Returns "" on invalid input.
 */
export function formatMessageTime(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const isToday = d.toDateString() === new Date().toDateString();
    return isToday ? format(d, "h:mm a") : format(d, "MMM d");
  } catch {
    return "";
  }
}

/**
 * Given a thread and the current user, return the other participant's name.
 * Threads are two-party, so this resolves to the name that isn't the
 * current user's.
 */
export function getOtherParticipantName(thread, currentUserId) {
  if (!currentUserId || !thread?.participant_names) return "Unknown";
  const idx = thread.participants?.indexOf(currentUserId);
  return idx === 0
    ? (thread.participant_names[1] || "Unknown")
    : (thread.participant_names[0] || "Unknown");
}

/**
 * Is a thread unread by the given user?
 */
export function isThreadUnread(thread, currentUserId) {
  return !!thread?.unread_by?.includes(currentUserId);
}
