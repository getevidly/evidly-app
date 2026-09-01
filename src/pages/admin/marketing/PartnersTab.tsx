/**
 * PartnersTab — review and publish Trusted Partner Alliance applications.
 *
 * Reads partner-admin, an authenticated admin-only edge function. The
 * caller's session token rides along on supabase.functions.invoke; this is
 * not the anon path the public partner-* endpoints use.
 *
 * Every row is a real partner_applications row. No applications yet renders
 * as an empty state and nothing else — there are no sample rows here.
 *
 * The Publish toggle is the gate on the public directory: partner-listing
 * returns is_published rows only, so flipping it here is what puts a
 * business on getevidly.com/trusted-partner-alliance.
 */
import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  EV_NAVY, EV_EMBER, EV_SLATE, EV_SUCCESS, EV_MUTED, EV_FAINT,
  EV_LINE, EV_PAPER, EV_WARN, EV_DANGER, DISPLAY, BODY,
} from './marketingTokens';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/** Matches the 30-day window partner-expiry-scan already warns on. */
const EXPIRING_WINDOW_DAYS = 30;

const DOC_LABEL: Record<string, string> = {
  business_license: 'Business license',
  professional_license: 'Professional license',
  w9: 'W-9',
  liability_insurance: 'Liability insurance',
  workers_comp: 'Workers comp',
  auto_insurance: 'Auto insurance',
};

interface PartnerDoc {
  doc_type: string;
  status: string;
  uploaded: boolean;
  expiration_date: string | null;
  uploaded_at: string | null;
}

interface PartnerApplication {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  service_type: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  reviews_link: string | null;
  bio: string | null;
  status: string | null;
  is_published: boolean;
  token_expires_at: string | null;
  documents: PartnerDoc[];
  docs_uploaded_count: number;
  docs_total: number;
}

// ── Formatting ───────────────────────────────────────────────────

function stampDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/** expiration_date is a DATE column — parse at local noon so no UTC shift slides it a day. */
function stampDay(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/** Whole days from today to an expiration date; negative once past due. */
function daysUntil(date: string): number {
  const then = new Date(`${date}T12:00:00`).getTime();
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.round((then - now.getTime()) / 86400000);
}

function contactName(a: PartnerApplication): string {
  return [a.first_name, a.last_name].filter(Boolean).join(' ');
}

/** Strips the scheme so a long URL reads as a domain in the cell. */
function linkLabel(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function hrefFor(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// ── Small pieces ─────────────────────────────────────────────────

function Chip({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.08em',
      textTransform: 'uppercase', color, border: `1px solid ${color}`,
      borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap',
    }}>{text}</span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: EV_FAINT, marginBottom: 3,
    }}>{children}</div>
  );
}

/**
 * Out to a partner's own site or reviews page. These leave the app
 * entirely, so an anchor is correct — the react-router rule governs
 * internal navigation.
 */
function OutLink({ url }: { url: string }) {
  return (
    <a
      href={hrefFor(url)}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontFamily: BODY, fontSize: 12, color: EV_SLATE,
        display: 'inline-flex', alignItems: 'center', gap: 4,
        textDecoration: 'none', wordBreak: 'break-all',
      }}
    >
      {linkLabel(url)} <ExternalLink size={10} style={{ flexShrink: 0 }} />
    </a>
  );
}

/** One document line: on file or outstanding, with its expiration state. */
function DocLine({ doc }: { doc: PartnerDoc }) {
  const label = DOC_LABEL[doc.doc_type] ?? doc.doc_type;

  if (!doc.uploaded) {
    return (
      <div style={{ fontFamily: BODY, fontSize: 11.5, color: EV_FAINT, padding: '2px 0' }}>
        {'○'} {label} — not uploaded
      </div>
    );
  }

  let expiry: React.ReactNode = null;
  if (doc.expiration_date) {
    const days = daysUntil(doc.expiration_date);
    const color = days < 0 ? EV_DANGER : days <= EXPIRING_WINDOW_DAYS ? EV_WARN : EV_MUTED;
    const suffix =
      days < 0
        ? ` · expired ${Math.abs(days)}d ago`
        : days <= EXPIRING_WINDOW_DAYS
          ? ` · expires in ${days}d`
          : '';
    expiry = <span style={{ color }}> — exp {stampDay(doc.expiration_date)}{suffix}</span>;
  }

  return (
    <div style={{ fontFamily: BODY, fontSize: 11.5, color: EV_NAVY, padding: '2px 0' }}>
      <span style={{ color: EV_SUCCESS }}>{'●'}</span> {label}{expiry}
    </div>
  );
}

// ── Row ──────────────────────────────────────────────────────────

function ApplicationRow({ app, onTogglePublish }: {
  app: PartnerApplication;
  onTogglePublish: (app: PartnerApplication, next: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);

  const name = contactName(app);
  const bio = app.bio ?? '';
  const bioIsLong = bio.length > 220;
  const tokenExpired = app.token_expires_at
    ? new Date(app.token_expires_at).getTime() < Date.now()
    : false;

  async function handleToggle() {
    setSaving(true);
    setWriteError(null);
    try {
      await onTogglePublish(app, !app.is_published);
    } catch (e) {
      setWriteError(e instanceof Error ? e.message : 'Could not update publish state.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      borderBottom: `1px solid ${EV_LINE}`,
      // A published row is marked down its edge — readable while scanning.
      borderLeft: app.is_published ? `3px solid ${EV_SUCCESS}` : '3px solid transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Collapse application' : 'Expand application'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2, color: EV_MUTED }}
        >
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 600, color: EV_NAVY }}>
            {app.business_name || 'Unnamed business'}
          </div>
          <div style={{ fontFamily: BODY, fontSize: 12, color: EV_MUTED, marginTop: 2 }}>
            {[app.service_type, name].filter(Boolean).join(' · ')}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {app.is_published
              ? <Chip text="Published" color={EV_SUCCESS} />
              : <Chip text="Not published" color={EV_FAINT} />}
            <Chip
              text={`${app.docs_uploaded_count} of ${app.docs_total} docs`}
              color={app.docs_uploaded_count === app.docs_total ? EV_SUCCESS : EV_WARN}
            />
            <Chip
              text={tokenExpired ? 'Upload link expired' : 'Upload link active'}
              color={tokenExpired ? EV_DANGER : EV_SLATE}
            />
            {app.status && <Chip text={app.status} color={EV_MUTED} />}
            <Chip text={`Submitted ${stampDate(app.created_at)}`} color={EV_MUTED} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <button
            onClick={handleToggle}
            disabled={saving}
            style={{
              fontFamily: BODY, fontSize: 12, fontWeight: 600,
              color: app.is_published ? EV_MUTED : '#FFFFFF',
              background: saving ? EV_FAINT : app.is_published ? 'none' : EV_EMBER,
              border: app.is_published ? `1px solid ${EV_LINE}` : 'none',
              borderRadius: 4, padding: '7px 12px',
              cursor: saving ? 'default' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {saving ? 'Saving…' : app.is_published ? 'Unpublish' : 'Publish'}
          </button>
          {writeError && (
            <div style={{
              fontFamily: BODY, fontSize: 11, color: EV_DANGER,
              maxWidth: 180, textAlign: 'right',
            }}>{writeError}</div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px 16px 43px' }}>
        {/* Contact and links stay on the collapsed row — they are what the
            reviewer reaches for first. */}
        <div style={{
          display: 'grid', gap: 12, marginBottom: bio ? 10 : 0,
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        }}>
          <div>
            <FieldLabel>Contact</FieldLabel>
            <div style={{ fontFamily: BODY, fontSize: 12, color: EV_NAVY }}>
              {app.email || <span style={{ color: EV_FAINT }}>No email</span>}
            </div>
            <div style={{ fontFamily: BODY, fontSize: 12, color: EV_MUTED }}>
              {app.phone || '—'}
            </div>
          </div>
          <div>
            <FieldLabel>Website</FieldLabel>
            {app.website
              ? <OutLink url={app.website} />
              : <span style={{ fontFamily: BODY, fontSize: 12, color: EV_FAINT }}>—</span>}
          </div>
          <div>
            <FieldLabel>Reviews</FieldLabel>
            {app.reviews_link
              ? <OutLink url={app.reviews_link} />
              : <span style={{ fontFamily: BODY, fontSize: 12, color: EV_FAINT }}>—</span>}
          </div>
          <div>
            <FieldLabel>Upload link</FieldLabel>
            <div style={{
              fontFamily: BODY, fontSize: 12,
              color: tokenExpired ? EV_DANGER : EV_NAVY,
            }}>
              {app.token_expires_at
                ? `${tokenExpired ? 'Expired' : 'Active'} · ${stampDate(app.token_expires_at)}`
                : 'No link issued'}
            </div>
          </div>
        </div>

        {bio && (
          <div style={{ marginBottom: 10 }}>
            <FieldLabel>Bio</FieldLabel>
            <div style={{
              fontFamily: BODY, fontSize: 12.5, color: EV_NAVY, lineHeight: 1.5,
              ...(bioIsLong && !open
                ? {
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                  }
                : {}),
            }}>{bio}</div>
            {bioIsLong && !open && (
              <button
                onClick={() => setOpen(true)}
                style={{
                  fontFamily: BODY, fontSize: 11.5, color: EV_SLATE,
                  background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer',
                }}
              >Show more</button>
            )}
          </div>
        )}

        {open && (
          <div>
            <FieldLabel>Documents on file</FieldLabel>
            {app.documents.map(d => <DocLine key={d.doc_type} doc={d} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab ──────────────────────────────────────────────────────────

export default function PartnersTab() {
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invErr } = await supabase.functions.invoke('partner-admin', {
        body: { action: 'list' },
      });
      if (invErr) throw invErr;
      if (!data?.ok) {
        throw new Error(
          data?.reason === 'forbidden'
            ? 'Admin access required.'
            : data?.error ?? 'Could not load partner applications.',
        );
      }
      setApplications((data.applications ?? []) as PartnerApplication[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load partner applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /**
   * Writes, then takes is_published from the row the function returns —
   * never from the value we sent. A failure throws back to the row, which
   * shows it inline; the toggle never reports a success that didn't happen.
   */
  const togglePublish = useCallback(async (app: PartnerApplication, next: boolean) => {
    const { data, error: invErr } = await supabase.functions.invoke('partner-admin', {
      body: { action: 'set_published', application_id: app.id, is_published: next },
    });
    if (invErr) throw invErr;
    if (!data?.ok) {
      throw new Error(
        data?.reason === 'forbidden'
          ? 'Admin access required.'
          : data?.error ?? 'Could not update publish state.',
      );
    }
    const updated = data.application as Partial<PartnerApplication>;
    setApplications(prev => prev.map(a =>
      a.id === app.id ? { ...a, is_published: updated.is_published ?? a.is_published } : a,
    ));
  }, []);

  const publishedCount = applications.filter(a => a.is_published).length;

  return (
    <div style={{ fontFamily: BODY }}>
      {error && (
        <div style={{
          fontFamily: BODY, fontSize: 12.5, color: EV_EMBER,
          border: `1px solid ${EV_EMBER}`, borderRadius: 4,
          padding: '10px 12px', marginBottom: 16,
        }}>{error}</div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: EV_FAINT,
        }}>
          Partner applications
        </div>
        {!loading && applications.length > 0 && (
          <div style={{ fontFamily: BODY, fontSize: 11.5, color: EV_MUTED }}>
            {publishedCount} of {applications.length} published to the directory
          </div>
        )}
      </div>

      <div style={{ border: `1px solid ${EV_LINE}`, borderRadius: 6, background: EV_PAPER }}>
        {loading ? (
          <div style={{ padding: 20, fontSize: 12.5, color: EV_MUTED }}>Loading…</div>
        ) : applications.length === 0 ? (
          <div style={{ padding: 20, fontSize: 12.5, color: EV_MUTED }}>
            No partner applications yet.
          </div>
        ) : (
          applications.map(a => (
            <ApplicationRow key={a.id} app={a} onTogglePublish={togglePublish} />
          ))
        )}
      </div>
    </div>
  );
}
