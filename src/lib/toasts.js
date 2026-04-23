import { toast } from "sonner";

/**
 * Shared toast helpers for consistent copy across mutation failure paths.
 *
 * Why these exist:
 *   - Before this file, handlers that wrapped base44.entities.X.update/create
 *     calls had slightly varied error phrasing ("Failed to save", "Upload
 *     failed", "Error updating", etc.), and a meaningful fraction of
 *     handlers had NO catch block at all — mutations could silently fail
 *     with the user seeing only a stuck loading spinner.
 *
 *   - Using a single helper gives us one phrasing to maintain, and makes
 *     it obvious in code review when a mutation site is missing its
 *     error path (no `toastMutationError` import = red flag).
 *
 * Intentionally small: just two helpers. If this file grows past ~100
 * lines of toast utilities, split it up.
 */

/**
 * Show a standardized error toast for a failed mutation.
 * Use inside catch blocks wrapping base44.entities.X.update/create/delete
 * calls, or any other write path where the user expected their action
 * to succeed.
 *
 * The `action` parameter should be a lowercase verb phrase describing
 * what was being attempted from the user's perspective.
 *
 * @example
 *   try {
 *     await base44.entities.User.update(id, updates);
 *     toast.success("Member updated");
 *   } catch (e) {
 *     toastMutationError("update member");
 *   }
 *
 * Resulting toast: "Failed to update member. Please try again."
 */
export function toastMutationError(action) {
  toast.error(`Failed to ${action}. Please try again.`);
}
