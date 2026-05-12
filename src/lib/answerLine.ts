// answerLine — data-driven copy per category × status
// Uses pre-computed columns from v_documents_enriched view

export interface AnswerLineDoc {
  status: string;
  category: string;
  expiry_date: string | null;
  days_until_expiry: number | null;
  vendor_name: string | null;
  subject_user_name: string | null;
  type: string | null;
  request_stage: string | null;
  requested_at: string | null;
  request_token_days_remaining: number | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function absDays(n: number | null): string {
  if (n == null) return '—';
  return String(Math.abs(n));
}

export function answerLine(doc: AnswerLineDoc): string | null {
  const cat = doc.category;
  const s = doc.status;

  if (cat === 'kitchen') {
    if (s === 'current') return doc.expiry_date ? `Expires ${fmtDate(doc.expiry_date)}` : 'No expiration on file';
    if (s === 'expiring') return `Expires in ${absDays(doc.days_until_expiry)} days`;
    if (s === 'expired') return `Expired ${absDays(doc.days_until_expiry)} days ago`;
    return null;
  }

  if (cat === 'employee') {
    const who = doc.subject_user_name || '';
    if (s === 'current') return doc.expiry_date ? `Expires ${fmtDate(doc.expiry_date)} · ${who}` : who || null;
    if (s === 'expiring') return `Expires in ${absDays(doc.days_until_expiry)} days · ${who}`;
    if (s === 'expired') return `Expired ${absDays(doc.days_until_expiry)} days ago · ${who}`;
    return null;
  }

  if (cat === 'service') {
    const vendor = doc.vendor_name || 'No vendor assigned';
    if (s === 'current') return `Next: ${doc.type || '—'} · ${fmtDate(doc.expiry_date)} · ${vendor}`;
    if (s === 'expiring') return `${doc.type || '—'} due in ${absDays(doc.days_until_expiry)} days · ${vendor}${doc.vendor_name ? ' scheduled' : ''}`;
    if (s === 'expired') return `${doc.type || '—'} ${absDays(doc.days_until_expiry)} days overdue · ${vendor}`;
    if (s === 'pending_review') return `Uploaded ${fmtDate(doc.requested_at)} by ${vendor} · Review now`;
    if (s === 'requested') return `Requested ${fmtDate(doc.requested_at)} · Token expires in ${doc.request_token_days_remaining ?? 0} days · Resend`;
    if (s === 'overdue') return 'Token expired · Resend now';
    return null;
  }

  if (cat === 'business') {
    const vendor = doc.vendor_name || '—';
    if (s === 'current') return doc.expiry_date ? `Expires ${fmtDate(doc.expiry_date)}` : 'No expiration on file';
    if (s === 'expiring') return `Expires in ${absDays(doc.days_until_expiry)} days · ${vendor} to renew`;
    if (s === 'expired') return `Expired ${absDays(doc.days_until_expiry)} days ago · ${vendor}`;
    if (s === 'pending_review') return `Uploaded ${fmtDate(doc.requested_at)} by ${vendor} · Review now`;
    if (s === 'requested') return `Requested ${fmtDate(doc.requested_at)} · Awaiting vendor`;
    return null;
  }

  return null;
}

const STATUS_COLORS: Record<string, string> = {
  current: '#2E7D32',
  expiring: '#B45309',
  expired: '#B91C1C',
  pending_review: '#1D4ED8',
  requested: '#B45309',
  overdue: '#B91C1C',
};

export function answerLineColor(status: string): string {
  return STATUS_COLORS[status] || '#5A6478';
}
