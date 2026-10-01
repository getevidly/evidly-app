/**
 * PortalRecordView — the portal record page, rendered from props.
 *
 * Split out of PortalPage (C16a-1) so the same page can render from:
 *   - PortalPage: the live /portal/:token page (token fetch and actions live there)
 *   - PortalSamplePage: /portal/sample, the HoodOps demo's static sample record
 *     (approved exception to ZERO FAKE DATA — see CLAUDE.md)
 *
 * With sample=true, Download and Send to a Third Party never call their
 * handlers: they only show an inline note. No request, no form, no window.
 */

import { useState } from 'react';

/* Briefing palette — mirrors marketingTokens.ts so the portal and the outreach
 * emails read as one system. Ember replaced gold as the accent in July 2026. */
const NAVY = '#1E2D4D';
const EMBER = '#B24A2E';
const CREAM = '#FAF7F0';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const LINE = '#E5E0D8';
const SEAL_GREEN = '#5DCAA5';
const AMBER = '#EF9F27';

const BODY = "'Inter', Arial, sans-serif";
const MONO_STACK = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

/** Mono caption treatment used across the briefing surfaces. */
const MONO_CAPTION = {
  fontFamily: MONO_STACK,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
};

/* Static, matching the county briefing. The pillar_requirements catalog is
 * per-state and per-location, so querying it here would produce a number that
 * shifts by kitchen and contradicts the briefing that brought the reader in. */
const TOTAL_RECORDS = 39;

/* The shared view is its own small design system — the client page's tokens
 * stay exactly as they are. */
const SHARED_SANS = "'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SHARED_MONO = "'IBM Plex Mono',Consolas,Menlo,monospace";
const SHARED_SEALED = '#2E7D32';
const SHARED_MUTED = '#8A8F99';
const SHARED_BORDER = '#C9CED8';

const SAMPLE_NOTE = 'This is a sample record. On your clients’ records, this button works.';

/** First 8 and last 4 of the digest — full value stays available on hover. */
function shortHash(hash) {
  return hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : hash;
}

/* service_date and next_due_date are DATE columns, so they arrive as bare
 * "YYYY-MM-DD". `new Date("2026-09-15")` is parsed as UTC midnight, which
 * formats as Sep 14 anywhere west of UTC — every Pacific viewer saw these a
 * day early. Building the date from its parts pins it to the local calendar
 * day, so the stored day is the displayed day in every timezone. */
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toLocalDate(value) {
  const m = DATE_ONLY_RE.exec(value.trim());
  if (!m) return new Date(value);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "Sep 15, 2026" — the hero card's date treatment. */
function formatShortDate(value) {
  return toLocalDate(value).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/** Whole days from today's local calendar date to the next service date. */
function daysOut(nextDue) {
  if (!nextDue) return null;
  const due = toLocalDate(nextDue);
  if (Number.isNaN(due.getTime())) return null;
  // Both ends normalised to local midnight so the count is whole calendar days.
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((dueMidnight.getTime() - todayMidnight.getTime()) / 86400000));
}

/* Bridge-written names carry a raw ISO timestamp
 * ("… — 2026-09-15T00:00:00+00:00"). Never show that to a client. */
function cleanDocName(name) {
  return name.replace(
    /(\d{4}-\d{2}-\d{2})T[\d:.+-]+/,
    (_m, d) => formatShortDate(d),
  );
}

function SampleNote({ color, style }) {
  return (
    <div role="status" style={{ fontSize: 12.5, lineHeight: 1.55, color, ...style }}>
      {SAMPLE_NOTE}
    </div>
  );
}

function SampleLabel() {
  return (
    <div style={{
      ...MONO_CAPTION, background: '#F3EFE6', color: EMBER,
      textAlign: 'center', padding: '7px 12px', borderBottom: `1px solid ${LINE}`,
    }}>
      Sample Record
    </div>
  );
}

export function PortalRecordView({
  record,
  documents,
  view,
  sample = false,
  downloading = null,
  onDownload,
  shareOpen = false,
  shareEmail = '',
  shareState = 'idle',
  shareError = null,
  sharedTo = null,
  onShareOpen,
  onShareEmailChange,
  onShareSubmit,
  onShareAgain,
}) {
  // Sample mode only: which button's note is showing. Never set on the live page.
  const [sampleNote, setSampleNote] = useState(null);

  const handleDownload = (docId, noteKey) => {
    if (sample) { setSampleNote(noteKey); return; }
    if (onDownload) onDownload(docId);
  };

  const handleShareOpen = () => {
    if (sample) { setSampleNote('hero'); return; }
    if (onShareOpen) onShareOpen();
  };

  const expDateLabel = new Date(record.expires_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  /* ── Shared view — a third party who received a forward ──────────
   * Returns before any of the client page below, so none of it renders. */
  if (view === 'shared') {
    const n = documents.length;
    const first = documents[0];
    const anySealed = documents.some((d) => d.is_sealed);

    const headline = n === 1
      ? (first?.is_sealed
        ? `${record.org_name} shared a sealed ${first.display_name || first.name} with you.`
        : `${record.org_name} shared a ${first?.display_name || first?.name} with you.`)
      : `${record.org_name} shared ${n} records with you.`;

    return (
      <div style={{ minHeight: '100vh', background: CREAM, fontFamily: SHARED_SANS }}>

        {sample && <SampleLabel />}

        {/* Header — unchanged from the client page. */}
        <div style={{ background: NAVY, padding: '22px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em' }}>
            <span style={{ color: EMBER }}>E</span>
            <span style={{ color: '#FFFFFF' }}>vid</span>
            <span style={{ color: EMBER }}>LY</span>
          </div>
          <div style={{ ...MONO_CAPTION, color: '#A8B4C8', marginTop: 6 }}>
            Commercial Kitchen Risk Management
          </div>
        </div>

        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ padding: '28px 32px 0' }}>
            <div style={{ fontSize: 26, lineHeight: '32px', fontWeight: 700, color: NAVY }}>
              {headline}
            </div>

            {documents.map((doc) => (
              <div key={doc.id} style={{
                border: `1px solid ${LINE}`, borderRadius: 8, background: '#FFFFFF',
                padding: '18px 20px', marginTop: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 17, lineHeight: '24px', fontWeight: 700, color: NAVY }}>
                      {doc.display_name || doc.name}
                    </div>
                    {doc.ref_line && (
                      <div style={{
                        fontFamily: SHARED_MONO, fontWeight: 500,
                        fontSize: 11.5, lineHeight: '18px', color: SHARED_MUTED,
                      }}>
                        {doc.ref_line}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, fontSize: 12.5 }}>
                    {doc.is_sealed
                      ? <span style={{ color: SHARED_SEALED, fontWeight: 700 }}>Sealed</span>
                      : <span style={{ color: SHARED_MUTED }}>On file</span>}
                  </div>
                </div>

                {/* flexWrap drops the buttons onto separate lines on narrow screens. */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                  {doc.is_sealed && doc.seal?.cert_number && (
                    <a
                      href={`/verify/${encodeURIComponent(doc.seal.cert_number)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#FFFFFF', color: NAVY, border: `1px solid ${SHARED_BORDER}`,
                        borderRadius: 6, padding: '10px 18px', fontWeight: 700, fontSize: 14,
                        textDecoration: 'none', fontFamily: 'inherit',
                      }}
                    >
                      Verify It Yourself
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownload(doc.id, `shared-${doc.id}`)}
                    disabled={downloading === doc.id}
                    style={{
                      background: EMBER, color: '#FFFFFF', border: 'none', borderRadius: 6,
                      padding: '11px 18px', fontWeight: 700, fontSize: 14,
                      fontFamily: 'inherit', cursor: 'pointer',
                      opacity: downloading === doc.id ? 0.6 : 1,
                    }}
                  >
                    {downloading === doc.id ? 'Loading…' : 'Download'}
                  </button>
                </div>
                {sample && sampleNote === `shared-${doc.id}` && (
                  <SampleNote color={TEXT_SEC} style={{ marginTop: 10 }} />
                )}
              </div>
            ))}

            {anySealed && (
              <div style={{ fontSize: 14, lineHeight: '22px', color: TEXT_SEC, marginTop: 18 }}>
                {n === 1
                  ? 'The record is tamper-evident: it carries a cryptographic seal, so you can confirm it has not been altered since it was filed.'
                  : 'Records marked Sealed are tamper-evident: each carries a cryptographic seal, so you can confirm it has not been altered since it was filed.'}
              </div>
            )}

            <div style={{
              textAlign: 'center', fontSize: 11, lineHeight: '18px',
              color: SHARED_MUTED, paddingTop: 26, paddingBottom: 32,
            }}>
              This link expires {expDateLabel}.
              <div>Powered by EvidLY, a Cleaning Pros Plus, LLC company.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sentDateLabel = new Date(record.sent_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const sealedDoc = documents.find((d) => d.seal) || null;
  const otherDocs = documents.filter((d) => d !== sealedDoc);

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: BODY }}>

      {sample && <SampleLabel />}

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ background: NAVY, padding: '22px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em' }}>
          <span style={{ color: EMBER }}>E</span>
          <span style={{ color: '#FFFFFF' }}>vid</span>
          <span style={{ color: EMBER }}>LY</span>
        </div>
        <div style={{ ...MONO_CAPTION, color: '#A8B4C8', marginTop: 6 }}>
          Commercial Kitchen Risk Management
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '36px 20px 64px' }}>

        {/* ── Intro ────────────────────────────────────────── */}
        <div style={{ ...MONO_CAPTION, color: EMBER, marginBottom: 12 }}>
          {record.org_name}
        </div>
        <h1 style={{
          fontSize: 26, lineHeight: 1.25, fontWeight: 800, color: NAVY,
          margin: '0 0 28px', letterSpacing: '-0.02em',
        }}>
          Your hood cleaning certificate is on file and sealed.
        </h1>

        {record.cover_message && (
          <div style={{
            fontSize: 14, lineHeight: 1.6, color: TEXT_SEC,
            borderLeft: `3px solid ${LINE}`, paddingLeft: 14, margin: '0 0 28px',
          }}>
            {record.cover_message}
          </div>
        )}

        {/* ── Hero cert card ───────────────────────────────── */}
        {sealedDoc && sealedDoc.seal && (
          <div style={{ background: NAVY, borderRadius: 14, padding: '26px 24px', color: '#FFFFFF' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
              <span aria-hidden="true" style={{ color: SEAL_GREEN, fontSize: 13 }}>&#128274;</span>
              {/* Just "Sealed" — the headline above already says "on file and
                  sealed", and repeating it verbatim read as filler. */}
              <span style={{ ...MONO_CAPTION, color: SEAL_GREEN }}>Sealed</span>
            </div>

            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 4 }}>
              Kitchen Exhaust Cleaning Certificate
            </div>
            <div style={{ fontSize: 12.5, color: '#A8B4C8', marginBottom: 20 }}>
              NFPA 96 (2024){sealedDoc.seal.cert_number ? ` · ${sealedDoc.seal.cert_number}` : ''}
            </div>

            {/* Three stats */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 24,
              borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: 16, marginBottom: 18,
            }}>
              {sealedDoc.seal.service_date && (
                <div>
                  <div style={{ ...MONO_CAPTION, color: '#8494AC', marginBottom: 5 }}>Serviced</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{formatShortDate(sealedDoc.seal.service_date)}</div>
                </div>
              )}
              {sealedDoc.seal.next_due_date && (
                <div>
                  <div style={{ ...MONO_CAPTION, color: '#8494AC', marginBottom: 5 }}>Next Service Due</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: AMBER }}>{formatShortDate(sealedDoc.seal.next_due_date)}</div>
                </div>
              )}
              {daysOut(sealedDoc.seal.next_due_date) !== null && (
                <div>
                  <div style={{ ...MONO_CAPTION, color: '#8494AC', marginBottom: 5 }}>EvidLY Is Tracking It</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: SEAL_GREEN }}>
                    {daysOut(sealedDoc.seal.next_due_date)} days out
                  </div>
                </div>
              )}
            </div>

            <div
              title={sealedDoc.seal.hash}
              style={{
                fontFamily: MONO_STACK, fontSize: 11, color: '#8494AC',
                marginBottom: 20, wordBreak: 'break-all',
              }}
            >
              Tamper-evident &#183; {shortHash(sealedDoc.seal.hash)}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <button
                type="button"
                onClick={handleShareOpen}
                style={{
                  padding: '11px 20px', background: EMBER, color: '#FFFFFF', border: 'none',
                  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Send to a Third Party
              </button>
              {sealedDoc.has_file && (
                <button
                  type="button"
                  onClick={() => handleDownload(sealedDoc.id, 'hero')}
                  disabled={downloading === sealedDoc.id}
                  style={{
                    padding: '11px 20px', background: 'transparent', color: '#FFFFFF',
                    border: '1px solid rgba(255,255,255,0.35)', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                    cursor: 'pointer', opacity: downloading === sealedDoc.id ? 0.6 : 1,
                  }}
                >
                  {downloading === sealedDoc.id ? 'Loading…' : 'Download'}
                </button>
              )}
            </div>

            {sample && sampleNote === 'hero' && (
              <SampleNote color={SEAL_GREEN} style={{ marginBottom: 14 }} />
            )}

            {!sample && shareOpen && shareState !== 'sent' && (
              <form onSubmit={onShareSubmit} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => onShareEmailChange && onShareEmailChange(e.target.value)}
                    placeholder="their@email.com"
                    autoComplete="email"
                    disabled={shareState === 'sending'}
                    style={{
                      flex: '1 1 220px', minWidth: 0, padding: '10px 12px',
                      borderRadius: 8, border: '1px solid rgba(255,255,255,0.28)',
                      background: 'rgba(255,255,255,0.06)', color: '#FFFFFF',
                      fontSize: 13, fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={shareState === 'sending'}
                    style={{
                      padding: '10px 20px', background: EMBER, color: '#FFFFFF', border: 'none',
                      borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                      cursor: shareState === 'sending' ? 'default' : 'pointer',
                      opacity: shareState === 'sending' ? 0.6 : 1,
                    }}
                  >
                    {shareState === 'sending' ? 'Sending…' : 'Send'}
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: '#8494AC', marginTop: 8 }}>
                  EvidLY sends it for you — nothing opens on your device.
                </div>
                {shareState === 'error' && shareError && (
                  <div style={{ fontSize: 12, color: '#FFB4A2', marginTop: 8 }}>{shareError}</div>
                )}
              </form>
            )}

            {!sample && shareState === 'sent' && sharedTo && (
              <div style={{ fontSize: 12.5, color: SEAL_GREEN, marginBottom: 14, lineHeight: 1.55 }}>
                Sent to {sharedTo} — they{'’'}ll get a link to this sealed certificate.
                <button
                  type="button"
                  onClick={() => onShareAgain && onShareAgain()}
                  style={{
                    background: 'none', border: 'none', padding: 0, marginLeft: 8,
                    color: '#A8B4C8', fontSize: 12, textDecoration: 'underline',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Send to someone else
                </button>
              </div>
            )}

            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: '#A8B4C8' }}>
              Send the sealed record straight to your insurer, landlord, or fire marshal &mdash;
              they can verify it hasn{'’'}t been altered.
            </div>
          </div>
        )}

        {/* ── Any other documents in this package ──────────── */}
        {otherDocs.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ ...MONO_CAPTION, color: TEXT_SEC, marginBottom: 10 }}>
              Also Included
            </div>
            {otherDocs.map((doc) => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 0', borderTop: `1px solid ${LINE}`,
                flexWrap: sample ? 'wrap' : undefined,
              }}>
                <div style={{ fontSize: 13.5, color: NAVY, minWidth: 0 }}>{cleanDocName(doc.name)}</div>
                {doc.has_file ? (
                  <button
                    type="button"
                    onClick={() => handleDownload(doc.id, `doc-${doc.id}`)}
                    disabled={downloading === doc.id}
                    style={{
                      padding: '7px 14px', background: 'transparent', color: NAVY,
                      border: `1px solid ${LINE}`, borderRadius: 7, fontSize: 12,
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      flexShrink: 0, marginLeft: 12,
                    }}
                  >
                    {downloading === doc.id ? 'Loading…' : 'Download'}
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: TEXT_MUTED, flexShrink: 0, marginLeft: 12 }}>No file</span>
                )}
                {sample && sampleNote === `doc-${doc.id}` && (
                  <SampleNote color={TEXT_SEC} style={{ flexBasis: '100%', marginTop: 8 }} />
                )}
              </div>
            ))}
          </div>
        )}

        {!sealedDoc && documents.length === 0 && (
          <div style={{ padding: '28px 0', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>
            No documents attached to this link.
          </div>
        )}

        {/* ── What comes next ──────────────────────────────── */}
        <div style={{ marginTop: 40, paddingTop: 28, borderTop: `1px solid ${LINE}` }}>
          <div style={{ ...MONO_CAPTION, color: EMBER, marginBottom: 12 }}>What Comes Next</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: NAVY, lineHeight: 1.4, marginBottom: 10 }}>
            One of {TOTAL_RECORDS} records your kitchen keeps current &mdash; sealed, dated, and tracked.
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: TEXT_SEC }}>
            A commercial kitchen maintains {TOTAL_RECORDS} records across fire safety, food safety,
            business, and vendors. We just showed you what one looks like on file.
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────── */}
        <div style={{ marginTop: 32, paddingTop: 26, borderTop: `3px solid ${EMBER}` }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: NAVY, lineHeight: 1.4, marginBottom: 8 }}>
            Having them and having them available are not the same thing.
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: TEXT_SEC, marginBottom: 18 }}>
            See every record for your kitchen, sealed the same way.
          </div>
          {/* No button yet. The full records view lives behind /dashboard,
              which requires a login this visitor does not have, and the
              account-setup step is not wired — so an enabled CTA here would
              either 404 or bounce to a login screen. An honest line beats a
              dead link. */}
          <div style={{
            fontSize: 13, lineHeight: 1.6, color: TEXT_SEC,
            background: '#F3EFE6', border: `1px solid ${LINE}`,
            borderRadius: 8, padding: '12px 14px',
          }}>
            Your full records view is being set up. Whoever sent you this link can
            walk you through it.
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div style={{ marginTop: 40, fontSize: 11, lineHeight: 1.6, color: TEXT_MUTED, textAlign: 'center' }}>
          Shared {sentDateLabel} &#183; This link expires {expDateLabel}
          <div style={{ marginTop: 6 }}>Powered by EvidLY, a Cleaning Pros Plus, LLC company.</div>
        </div>
      </div>
    </div>
  );
}

export default PortalRecordView;
