/**
 * BriefingsTab — one county at a time: what its briefing says, and whether it
 * has gone out.
 *
 * The Outreach tab is the working surface for building the list; this is the
 * reviewing surface for what that list will receive. It therefore owns no
 * actions of its own: approve, send and preview all come from
 * useCountyBriefingActions, the same hook OutreachTab uses, so there is one
 * send path rather than two that have to be kept in agreement.
 *
 * Counties and their recipient counts come from the county-briefing `list`
 * action — the same payload OutreachTab reads, including the slug the public
 * page URL is built from.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useCountyBriefingActions } from './useCountyBriefingActions';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_FAINT, EV_LINE,
  EV_PAPER, EV_CREAM, EV_LIGHT, EV_SUCCESS, EV_WARN, EV_DANGER,
  DISPLAY, BODY,
} from './marketingTokens';

// ── Style helpers (match the console) ────────────────────────────

const BTN = (bg: string, fg: string): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
  fontSize: 12, fontWeight: 700, background: bg, color: fg, fontFamily: BODY,
});

const CARD: React.CSSProperties = {
  border: `1px solid ${EV_LINE}`, borderRadius: 10,
  background: EV_PAPER, padding: 20,
};

const LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: EV_FAINT, marginBottom: 4, fontFamily: BODY,
};

const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 6,
  border: `1px solid ${EV_LINE}`, fontSize: 13, fontFamily: BODY, color: EV_NAVY,
};

// ── Jurisdiction naming — same rule the email renderer uses ───────
// A city jurisdiction is its own authority and is labelled by city; San
// Francisco carries both names because it is a consolidated city-county.

function isCityRow(c: any): boolean {
  return !!c.city && c.city !== c.county;
}

function jurLabel(c: any): string {
  return isCityRow(c) ? `${c.city} (city) · ${c.county} County` : `${c.county} County`;
}

/** The public page slug, derived exactly as the briefing email's button is. */
function pageSlugOf(c: any): string {
  return ((c?.slug) || '').replace(/-ca$/, '');
}

// ── Status ───────────────────────────────────────────────────────
// Mirrors OutreachTab's getCountyStatus, which is not exported. Kept as a
// read-only classification — it performs no writes and gates nothing on the
// server; the send action re-checks approval, lapse and hash itself.

function countyStatus(c: any): 'blocked' | 'lapsed' | 'sent' | 'approved' | 'draft' {
  if (!c.sendable && c.block_reason) return 'blocked';
  if (c.lapsed) return 'lapsed';
  if (c.approved) {
    if ((c.sent || 0) > 0 && (c.queued || 0) === 0) return 'sent';
    return 'approved';
  }
  return 'draft';
}

const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  blocked:  { bg: '#F6E3DF', fg: EV_DANGER,  label: 'Blocked' },
  lapsed:   { bg: '#FDF3E3', fg: EV_WARN,    label: 'Approval lapsed' },
  sent:     { bg: '#E3ECE1', fg: EV_SUCCESS, label: 'Sent' },
  approved: { bg: '#E3ECE1', fg: EV_SUCCESS, label: 'Approved' },
  draft:    { bg: '#EFEFEF', fg: EV_MUTED,   label: 'Not approved' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_PILL[status] || STATUS_PILL.draft;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
      background: s.bg, color: s.fg, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

/** Coarse grading family, for the tag and the filter. */
function gradingFamily(c: any): 'letter' | 'placard' | 'report' {
  const gt = (c.grading_type || '').toLowerCase();
  if (gt.includes('letter') || gt.includes('grade') || gt.includes('score')) return 'letter';
  if (gt.includes('placard') || gt.includes('color') || gt.includes('colour')) return 'placard';
  return 'report';
}

const FAMILY_LABEL: Record<string, string> = {
  letter: 'Letter / score', placard: 'Placard', report: 'Report only',
};

// ── Component ────────────────────────────────────────────────────

export default function BriefingsTab() {
  const [counties, setCounties] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'prospects' | 'letter' | 'placard' | 'report'>('all');

  // Add-a-prospect form
  const [pOrg, setPOrg] = useState('');
  const [pName, setPName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pJurId, setPJurId] = useState('');
  const [pQueue, setPQueue] = useState(false);
  const [pErr, setPErr] = useState<string | null>(null);
  const [pWarn, setPWarn] = useState<string | null>(null);
  const [pSaving, setPSaving] = useState(false);

  const [viewer, setViewer] = useState<'email' | 'page'>('email');
  const [pageWarm, setPageWarm] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewCounty, setPreviewCounty] = useState<string | null>(null);

  const flash = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [countiesRes, stepsRes] = await Promise.all([
      supabase.functions.invoke('county-briefing', { body: { action: 'list' } }),
      supabase.functions.invoke('county-briefing', { body: { action: 'list-steps' } }),
    ]);
    setCounties(countiesRes.data?.counties || []);
    const masterRow = (stepsRes.data?.steps || []).find((s: any) => s.step_number === 0);
    setPaused(masterRow ? !masterRow.is_active : false);
    setLoading(false);
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // A briefing needs a jurisdiction to address, so the checkbox follows the
  // picker: it self-checks when one is chosen and clears when it is not.
  useEffect(() => { setPQueue(!!pJurId); }, [pJurId]);

  // Stable identity: handlePreview closes over this, and the auto-render
  // effect below depends on handlePreview. An inline arrow here would give it a
  // new identity every render and the effect would re-fire forever.
  const onPreview = useCallback((html: string, county: string) => {
    setPreviewHtml(html);
    setPreviewCounty(county);
  }, []);

  // The one definition of these three actions, shared with OutreachTab.
  const { handlePreview, handleApprove, handleSend } = useCountyBriefingActions({
    paused,
    setActionLoading,
    flash,
    onPreview,
    onDone: loadAll,
  });

  /**
   * Prospect wins. The CRM row is the thing being created; queueing a
   * briefing is a follow-on. If the queue call fails we keep the prospect
   * and say so, rather than rolling back a good record over a mail-list
   * problem. If the prospect insert itself fails, nothing is created.
   */
  const addProspect = async () => {
    setPErr(null); setPWarn(null);
    const org = pOrg.trim(), name = pName.trim(), email = pEmail.trim(), phone = pPhone.trim();
    if (!org || !name || !email || !phone) {
      setPErr('Organization, contact name, email and phone are all required.');
      return;
    }

    const jur = counties.find((c: any) => c.jurisdiction_id === pJurId) || null;
    setPSaving(true);

    const { data: inserted, error: pipeErr } = await supabase
      .from('sales_pipeline')
      .insert({
        org_name: org,
        contact_name: name,
        contact_email: email,
        contact_phone: phone,
        county: jur?.county || null,
        stage: 'prospect',
        source: 'briefing_add',
      })
      .select('id')
      .single();

    if (pipeErr || !inserted?.id) {
      setPSaving(false);
      setPErr(`Could not add the prospect: ${pipeErr?.message || 'Unknown error'}`);
      return;
    }

    let queuedMsg = "";
    if (pQueue && jur) {
      const { data: qData, error: qErr } = await supabase.functions.invoke('county-briefing', {
        body: {
          action: 'add-recipients',
          recipients: [{
            email,
            first_name: name.split(/\s+/)[0] || undefined,
            org_name: org,
            county: jur.county,
            variant: 'warm',
            jurisdiction_id: jur.jurisdiction_id,
            sales_pipeline_id: inserted.id,
          }],
        },
      });
      if (qErr || !qData?.inserted) {
        setPSaving(false);
        setPWarn(`Added ${org} to the CRM, but the briefing queue failed: ${qErr?.message || qData?.error || 'Unknown error'}`);
        setPOrg(''); setPName(''); setPEmail(''); setPPhone(''); setPJurId('');
        loadAll();
        return;
      }
      queuedMsg = ` and queued a warm ${jurLabel(jur)} briefing`;
    }

    setPSaving(false);
    flash(`Added ${org} to the CRM${queuedMsg}`);
    setPOrg(''); setPName(''); setPEmail(''); setPPhone(''); setPJurId('');
    loadAll();
  };

  const selected = useMemo(
    () => counties.find((c: any) => c.jurisdiction_id === selectedId) || null,
    [counties, selectedId],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return counties.filter((c: any) => {
      if (q && !jurLabel(c).toLowerCase().includes(q)) return false;
      if (filter === 'prospects') return (c.queued || 0) + (c.sent || 0) > 0;
      if (filter === 'all') return true;
      return gradingFamily(c) === filter;
    });
  }, [counties, search, filter]);

  const queued = selected?.queued || 0;
  const status = selected ? countyStatus(selected) : 'draft';
  const pageSlug = selected ? pageSlugOf(selected) : '';
  const pageUrl = `https://www.getevidly.com/briefing/california/${pageSlug}`
    + (pageWarm ? '?v=warm' : '');
  const canSend = status === 'approved' && queued > 0 && !paused && !actionLoading;

  // Selecting a county clears a preview belonging to a different one.
  useEffect(() => {
    if (selected && previewCounty && previewCounty !== selected.county) {
      setPreviewHtml(null);
      setPreviewCounty(null);
    }
  }, [selected, previewCounty]);

  // The email renders itself. Reading the briefing is the point of this tab, so
  // it should not be gated behind a button press. Keyed to the jurisdiction so
  // switching counties fetches that county and never shows the previous one's.
  // The ref records the attempt, not the result, so a failed preview reports
  // once rather than retrying on every render.
  const previewAttemptRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selected || viewer !== 'email') return;
    if (previewHtml && previewCounty === selected.county) return;
    if (previewAttemptRef.current === selected.jurisdiction_id) return;
    previewAttemptRef.current = selected.jurisdiction_id;
    void handlePreview(selected.county, undefined, selected.jurisdiction_id);
  }, [selected, viewer, previewHtml, previewCounty, handlePreview]);

  const FILTERS: { id: typeof filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'prospects', label: 'Has prospects' },
    { id: 'letter', label: 'Letter' },
    { id: 'placard', label: 'Placard' },
    { id: 'report', label: 'Report' },
  ];

  return (
    <div style={{ fontFamily: BODY }}>
      {message && (
        <div style={{
          fontSize: 12.5, color: EV_EMBER, border: `1px solid ${EV_EMBER}`,
          borderRadius: 6, padding: '10px 12px', marginBottom: 16,
        }}>{message}</div>
      )}

      {paused && (
        <div style={{
          fontSize: 12.5, color: EV_WARN, background: '#FDF3E3',
          border: `1px solid ${EV_LINE}`, borderRadius: 6,
          padding: '10px 12px', marginBottom: 16, fontWeight: 600,
        }}>Sending is paused — resume it in Briefing send before anything will go out.</div>
      )}

      {/* ── Add a prospect ──────────────────────────────────── */}
      <div style={{ ...CARD, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: EV_NAVY, fontFamily: DISPLAY, margin: 0 }}>
            Add a prospect
          </h3>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: EV_FAINT }}>Bulk import — coming soon</span>
        </div>

        {pErr && (
          <div style={{ fontSize: 12, color: EV_DANGER, background: '#F6E3DF', border: `1px solid ${EV_LINE}`, borderRadius: 6, padding: '8px 10px', marginBottom: 12 }}>{pErr}</div>
        )}
        {pWarn && (
          <div style={{ fontSize: 12, color: EV_WARN, background: '#FDF3E3', border: `1px solid ${EV_LINE}`, borderRadius: 6, padding: '8px 10px', marginBottom: 12 }}>{pWarn}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <div>
            <div style={LABEL}>Organization *</div>
            <input value={pOrg} onChange={e => setPOrg(e.target.value)} style={{ ...INPUT, background: '#FFF' }} />
          </div>
          <div>
            <div style={LABEL}>Contact name *</div>
            <input value={pName} onChange={e => setPName(e.target.value)} style={{ ...INPUT, background: '#FFF' }} />
          </div>
          <div>
            <div style={LABEL}>Email *</div>
            <input type="email" value={pEmail} onChange={e => setPEmail(e.target.value)} style={{ ...INPUT, background: '#FFF' }} />
          </div>
          <div>
            <div style={LABEL}>Phone *</div>
            <input value={pPhone} onChange={e => setPPhone(e.target.value)} style={{ ...INPUT, background: '#FFF' }} />
          </div>
          <div>
            <div style={LABEL}>Jurisdiction</div>
            <select value={pJurId} onChange={e => setPJurId(e.target.value)} style={{ ...INPUT, background: '#FFF' }}>
              <option value="">No jurisdiction</option>
              {counties.map((c: any) => (
                <option key={c.jurisdiction_id} value={c.jurisdiction_id}>{jurLabel(c)}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: pJurId ? EV_NAVY : EV_FAINT, cursor: pJurId ? 'pointer' : 'not-allowed' }}>
            <input
              type="checkbox"
              checked={pQueue}
              disabled={!pJurId}
              onChange={e => setPQueue(e.target.checked)}
            />
            Queue for county briefing (warm)
          </label>
          {!pJurId && (
            <span style={{ fontSize: 11, color: EV_FAINT }}>Pick a jurisdiction to queue a briefing.</span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={addProspect} disabled={pSaving} style={BTN(EV_EMBER, '#FFF')}>
            {pSaving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: jurisdiction list ─────────────────────────── */}
        <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 14, borderBottom: `1px solid ${EV_LINE}` }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jurisdictions"
              style={{ ...INPUT, background: '#FFF' }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  style={{
                    ...BTN(filter === f.id ? EV_NAVY : EV_LIGHT, filter === f.id ? '#FFF' : EV_NAVY),
                    padding: '4px 9px', fontSize: 11,
                  }}
                >{f.label}</button>
              ))}
            </div>
          </div>

          <div style={{ maxHeight: 620, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, fontSize: 12.5, color: EV_MUTED }}>Loading…</div>
            ) : visible.length === 0 ? (
              <div style={{ padding: 20, fontSize: 12.5, color: EV_MUTED }}>No jurisdictions match.</div>
            ) : (
              visible.map((c: any) => {
                const on = c.jurisdiction_id === selectedId;
                const q = c.queued || 0;
                const st = c.sent || 0;
                const recipientLine = q > 0 ? `${q} queued` : st > 0 ? 'Sent' : 'No prospects';
                return (
                  <button
                    key={c.jurisdiction_id}
                    onClick={() => setSelectedId(c.jurisdiction_id)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 14px', border: 'none', cursor: 'pointer',
                      borderBottom: `1px solid ${EV_LINE}`,
                      borderLeft: on ? `3px solid ${EV_EMBER}` : '3px solid transparent',
                      background: on ? EV_CREAM : 'transparent',
                      fontFamily: BODY,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: on ? 700 : 600, color: EV_NAVY }}>
                      {jurLabel(c)}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: EV_FAINT }}>
                        {FAMILY_LABEL[gradingFamily(c)]}
                      </span>
                      <span style={{ fontSize: 10, color: q > 0 ? EV_EMBER : EV_MUTED, fontWeight: q > 0 ? 700 : 500 }}>
                        {recipientLine}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: send strip + viewer ──────────────────────── */}
        <div>
          {!selected ? (
            <div style={{ ...CARD, textAlign: 'center', color: EV_MUTED, fontSize: 13, padding: 40 }}>
              Select a jurisdiction to review its briefing.
            </div>
          ) : (
            <>
              {/* Send strip */}
              <div style={{ ...CARD, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: EV_NAVY, fontFamily: DISPLAY }}>
                      {jurLabel(selected)}
                    </div>
                    <div style={{ fontSize: 12, color: EV_MUTED, marginTop: 2 }}>
                      {queued} prospect{queued === 1 ? '' : 's'} queued
                    </div>
                  </div>
                  <StatusPill status={status} />
                  <div style={{ flex: 1 }} />

                  {status !== 'approved' && status !== 'sent' && (
                    <button
                      onClick={() => handleApprove(selected.county)}
                      disabled={!!actionLoading}
                      style={BTN('#E3ECE1', EV_SUCCESS)}
                    >
                      {actionLoading === `approve-${selected.county}` ? '...' : 'Approve'}
                    </button>
                  )}

                  <button
                    disabled={!canSend}
                    title={
                      status !== 'approved' ? 'Approve first'
                        : paused ? 'Sending is paused'
                        : queued === 0 ? 'No queued prospects'
                        : `Send to ${queued} prospect(s)`
                    }
                    onClick={() => {
                      if (queued === 0) { flash(`No queued prospects for ${selected.county}`); return; }
                      handleSend(selected.county, queued);
                    }}
                    style={{
                      ...BTN(EV_NAVY, '#FFF'),
                      cursor: canSend ? 'pointer' : 'not-allowed',
                      opacity: canSend ? 1 : 0.3,
                    }}
                  >
                    {actionLoading === `send-${selected.county}` ? 'Sending...' : 'Send to prospects'}
                  </button>

                  {/* Renders the briefing as this county's prospects would receive
                      it. A true send-to-my-inbox test is a later stage. */}
                  <button
                    onClick={() => {
                      setViewer('email');
                      handlePreview(selected.county, undefined, selected.jurisdiction_id);
                    }}
                    disabled={!!actionLoading}
                    style={BTN(EV_LIGHT, EV_NAVY)}
                  >
                    {actionLoading === `preview-${selected.jurisdiction_id}` ? '...' : 'Send test to me'}
                  </button>
                </div>

                {status === 'blocked' && selected.block_reason && (
                  <div style={{ fontSize: 11.5, color: EV_DANGER, marginTop: 10 }}>
                    {selected.block_reason}
                  </div>
                )}
                {status === 'lapsed' && selected.lapse_reason && (
                  <div style={{ fontSize: 11.5, color: EV_WARN, marginTop: 10 }}>
                    {selected.lapse_reason}
                  </div>
                )}
              </div>

              {/* Viewer */}
              <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                  padding: '8px 14px', background: EV_CREAM, borderBottom: `1px solid ${EV_LINE}`,
                }}>
                  <button
                    onClick={() => setViewer('email')}
                    style={{ ...BTN(viewer === 'email' ? EV_NAVY : EV_LIGHT, viewer === 'email' ? '#FFF' : EV_NAVY), padding: '4px 10px', fontSize: 11 }}
                  >Email</button>
                  <button
                    onClick={() => setViewer('page')}
                    style={{ ...BTN(viewer === 'page' ? EV_NAVY : EV_LIGHT, viewer === 'page' ? '#FFF' : EV_NAVY), padding: '4px 10px', fontSize: 11 }}
                  >Page</button>

                  {viewer === 'page' && (
                    <>
                      <span style={{ width: 1, height: 18, background: EV_LINE, margin: '0 4px' }} />
                      <button
                        onClick={() => setPageWarm(false)}
                        style={{ ...BTN(pageWarm ? EV_LIGHT : EV_NAVY, pageWarm ? EV_NAVY : '#FFF'), padding: '4px 10px', fontSize: 11 }}
                      >Cold</button>
                      <button
                        onClick={() => setPageWarm(true)}
                        style={{ ...BTN(pageWarm ? EV_NAVY : EV_LIGHT, pageWarm ? '#FFF' : EV_NAVY), padding: '4px 10px', fontSize: 11 }}
                      >Warm</button>
                    </>
                  )}

                  <div style={{ flex: 1 }} />
                  {viewer === 'page' && pageSlug && (
                    <a
                      href={pageUrl}
                      target="_blank"
                      rel="noopener"
                      style={{ fontSize: 12, fontWeight: 700, color: EV_EMBER, textDecoration: 'none' }}
                    >Open live ↗</a>
                  )}
                </div>

                {viewer === 'email' ? (
                  previewHtml && previewCounty === selected.county ? (
                    <div style={{ maxHeight: 640, overflow: 'auto', background: '#FFF' }}>
                      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    </div>
                  ) : actionLoading === `preview-${selected.jurisdiction_id}` ? (
                    <div style={{ padding: 24, fontSize: 13, color: EV_MUTED }}>
                      Loading email…
                    </div>
                  ) : (
                    <div style={{ padding: 24, fontSize: 13, color: EV_MUTED }}>
                      Could not load the email for {jurLabel(selected)} — “Send test to me” retries it.
                    </div>
                  )
                ) : pageSlug ? (
                  <iframe
                    key={pageUrl}
                    title="Briefing page preview"
                    src={pageUrl}
                    style={{ width: '100%', minHeight: 640, border: 'none', overflow: 'auto', display: 'block' }}
                  />
                ) : (
                  <div style={{ padding: 24, fontSize: 13, color: EV_MUTED }}>
                    This jurisdiction has no page slug on file.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
