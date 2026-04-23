/**
 * Shared color maps for role and status indicators.
 *
 * Previously, each role and status was represented with a full colored
 * background (bg-amber-50 text-amber-700, bg-purple-50 text-purple-700, etc.)
 * That read as "stock admin template rainbow" and fought with the brand
 * palette (teal / cobalt / navy).
 *
 * New pattern: neutral badge surface + small colored dot carries the
 * semantic meaning. Colors stay within the brand palette plus a muted
 * amber for "attention needed" states. See <DotBadge> for the
 * component that renders this pattern.
 *
 * Color choices are Tailwind hex values that map to the app's brand:
 *   - teal       — active / positive / go
 *   - cobalt     — information / member-facing action
 *   - navy       — primary / admin / structural
 *   - gray       — neutral / inactive / pending
 *   - amber      — attention / caution (used sparingly)
 */

// Exact hex matches the brand palette defined in tailwind config.
const BRAND = {
  teal: "#0d7a6a",
  cobalt: "#1d4ed8",
  navy: "#041a2e",
  gray: "#94a3b8",
  amber: "#d97706",
};

/**
 * Dot color by user role. Used in role badges on Members page, directory
 * cards, and anywhere a role needs a compact identifier.
 */
export const ROLE_DOT_COLORS = {
  admin: BRAND.navy,
  tc: BRAND.teal,
  investor: BRAND.cobalt,
  pml: BRAND.navy,
  pending: BRAND.gray,
};

/**
 * Dot color by member approval status. Used in Members page, Applications
 * admin view, and anywhere member_status is surfaced.
 *
 * Note: 'rejected' uses gray (not red) because rainbow red-on-white reads
 * as an error toast rather than a quiet status indicator. The label
 * 'Rejected' carries the semantic weight; the dot just needs to be
 * visually distinct from 'approved'.
 */
export const STATUS_DOT_COLORS = {
  pending: BRAND.amber,
  approved: BRAND.teal,
  rejected: BRAND.gray,
};

/**
 * Dot color by ServiceRequest status. Kept here for consistency with the
 * member-status pattern. Not yet migrated in components (follow-up).
 */
export const REQUEST_STATUS_DOT_COLORS = {
  requested: BRAND.gray,
  accepted: BRAND.cobalt,
  in_progress: BRAND.teal,
  completed: BRAND.navy,
};
