/**
 * relativeTime — standard timestamp display for EvidLY
 *
 * ≤ 30 days ago → relative ("3 days ago", "just now")
 * > 30 days ago → absolute ("Jan 15, 2026")
 * Future dates  → absolute ("Mar 1, 2026")
 * null/invalid  → dash "—"
 */

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '\u2014';

  const now = Date.now();
  const diff = now - d.getTime();

  // Future dates → absolute
  if (diff < 0) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ≤ 30 days → relative
  if (diff < 30 * DAY) {
    if (diff < MINUTE) return 'just now';
    if (diff < HOUR) {
      const m = Math.floor(diff / MINUTE);
      return `${m}m ago`;
    }
    if (diff < DAY) {
      const h = Math.floor(diff / HOUR);
      return `${h}h ago`;
    }
    const days = Math.floor(diff / DAY);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }

  // > 30 days → absolute
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Format expiry: includes "in X days" for soon, "X days overdue" for past */
export function expiryLabel(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '\u2014';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - now.getTime()) / DAY);

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return abs === 1 ? '1 day overdue' : `${abs} days overdue`;
  }
  if (diffDays === 0) return 'Expires today';
  if (diffDays <= 30) return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
