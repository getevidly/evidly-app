/**
 * Shared invite-status helper.
 *
 * Derives display label + colors from the invite's DB state:
 *   pending + no viewed_at  → "Invited"  (blue)
 *   pending + viewed_at set → "Viewed"   (amber)
 *   accepted                → "Accepted" (green)
 *   expired                 → "Expired"  (gray)
 *   revoked                 → "Revoked"  (red)
 *
 * Every invite list surface (AdminUsers, Team, ClientInviteForm)
 * should use this instead of local logic so the labels stay in sync.
 */

export interface InviteStatusResult {
  label: string;
  bg: string;
  fg: string;
  twBg: string;
  twText: string;
}

export function getInviteStatus(
  status: string,
  viewedAt?: string | null,
): InviteStatusResult {
  if (status === 'accepted') {
    return { label: 'Accepted', bg: '#E1F5EE', fg: '#0F6E56', twBg: 'bg-emerald-50', twText: 'text-emerald-600' };
  }
  if (status === 'expired') {
    return { label: 'Expired', bg: '#F1EFE8', fg: '#5F5E5A', twBg: 'bg-gray-100', twText: 'text-gray-500' };
  }
  if (status === 'revoked') {
    return { label: 'Revoked', bg: '#FCEBEB', fg: '#A32D2D', twBg: 'bg-red-50', twText: 'text-red-600' };
  }
  // pending — check if viewed
  if (viewedAt) {
    return { label: 'Viewed', bg: '#FEF3C7', fg: '#92400E', twBg: 'bg-amber-100', twText: 'text-amber-800' };
  }
  return { label: 'Invited', bg: '#E0EDFA', fg: '#1A5296', twBg: 'bg-blue-50', twText: 'text-blue-600' };
}

/**
 * Format a date for invite list display.
 * Returns e.g. "Jul 22, 2026"
 */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
