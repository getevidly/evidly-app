/**
 * ViolationOutreach — Violation-triggered prospect outreach dashboard
 *
 * Route: /admin/violation-outreach
 * Access: platform_admin only (AdminShell)
 *
 * Crawls public health inspection databases for violations,
 * scores relevance, generates personalized outreach (letter/email/call).
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';

// ── Types ──────────────────────────────────────────────────────────

interface Prospect {
  id: string;
  business_name: string;
  address: string | null;
  city: string | null;
  county: string | null;
  phone: string | null;
  inspection_date: string | null;
  violation_count: number;
  critical_violation_count: number;
  violation_summary: string | null;
  violation_types: string[] | null;
  relevant_offerings: string[] | null;
  relevance_score: number | null;
  outreach_status: string;
  last_outreach_at: string | null;
  next_followup_at: string | null;
  outreach_count: number;
  notes: string | null;
  created_at: string;
}

interface Touch {
  id: string;
  prospect_id: string;
  touch_type: string;
  touch_date: string;
  outcome: string | null;
  subject: string | null;
  body: string | null;
  generated_by: string | null;
  followup_due_at: string | null;
  followup_type: string | null;
  notes: string | null;
  created_at: string;
}

// ── Constants ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  new:              { label: 'New',              bg: '#EFF6FF', color: '#2563EB' },
  queued:           { label: 'Queued',           bg: '#FFFBEB', color: '#D97706' },
  letter_sent:      { label: 'Letter Sent',      bg: '#F0FDF4', color: '#16A34A' },
  called:           { label: 'Called',           bg: '#F0FDF4', color: '#16A34A' },
  emailed:          { label: 'Emailed',          bg: '#F0FDF4', color: '#16A34A' },
  contacted:        { label: 'Contacted',        bg: '#F0FDF4', color: '#059669' },
  interested:       { label: 'Interested',       bg: '#ECFDF5', color: '#047857' },
  converted:        { label: 'Converted',        bg: '#DCFCE7', color: '#166534' },
  not_interested:   { label: 'Not Interested',   bg: '#FEF2F2', color: '#DC2626' },
  do_not_contact:   { label: 'Do Not Contact',   bg: '#FEF2F2', color: '#991B1B' },
  inactive:         { label: 'Inactive',         bg: '#F3F4F6', color: '#6B7280' },
};

const OFFERING_LABELS: Record<string, string> = {
  evidly: 'EvidLY',
  cpp_hood_cleaning: 'CPP Hood',
  filta_fryer: 'Filta',
};

const COUNTIES = [
  'All Counties',
  'Los Angeles', 'San Diego', 'Fresno', 'Stanislaus', 'Merced',
  'Sacramento', 'Alameda', 'Santa Clara', 'Riverside', 'San Bernardino',
];

const STATUS_FILTER = [
  'All Statuses', 'new', 'queued', 'letter_sent', 'called', 'emailed',
  'contacted', 'interested', 'converted', 'not_interested', 'do_not_contact',
];

// ── Helpers ────────────────────────────────────────────────────────

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const selectStyle: React.CSSProperties = {
  padding: '6px 10px', background: '#F9FAFB', border: '1px solid #D1D5DB',
  borderRadius: 6, color: NAVY, fontSize: 12, cursor: 'pointer',
};

const btnStyle = (bg: string, color: string): React.CSSProperties => ({
  padding: '4px 10px', background: bg, color, border: 'none',
  borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer',
});

// ── Component ──────────────────────────────────────────────────────

export default function ViolationOutreach() {
  useDemoGuard();

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [touches, setTouches] = useState<Touch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'prospects' | 'followups'>('prospects');

  // Filters
  const [countyFilter, setCountyFilter] = useState('All Counties');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [offeringFilter, setOfferingFilter] = useState('all');
  const [minRelevance, setMinRelevance] = useState(0);

  // Modal
  const [modalContent, setModalContent] = useState<{ title: string; body: string; type: string } | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  // Touch history
  const [touchHistory, setTouchHistory] = useState<{ prospectName: string; items: Touch[] } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, tRes] = await Promise.all([
        supabase.from('violation_prospects').select('*').order('relevance_score', { ascending: false }),
        supabase.from('outreach_touches').select('*').order('created_at', { ascending: false }).limit(200),
      ]);
      if (pRes.error) throw new Error(pRes.error.message);
      if (tRes.error) throw new Error(tRes.error.message);
      setProspects(pRes.data ?? []);
      setTouches(tRes.data ?? []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived data ──

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const newToday = prospects.filter(p => p.outreach_status === 'new' && p.created_at?.startsWith(today)).length;
  const queued = prospects.filter(p => p.outreach_status === 'queued').length;
  const lettersSentWeek = touches.filter(t => t.touch_type === 'letter' && t.created_at >= weekAgo).length;
  const callsDueToday = prospects.filter(p => p.next_followup_at && p.next_followup_at.startsWith(today)).length;
  const converted = prospects.filter(p => p.outreach_status === 'converted').length;
  const contacted = prospects.filter(p => ['contacted', 'interested', 'converted', 'not_interested'].includes(p.outreach_status)).length;
  const conversionRate = contacted > 0 ? ((converted / contacted) * 100).toFixed(0) : '0';

  // Filter prospects
  const filtered = prospects.filter(p => {
    if (countyFilter !== 'All Counties' && p.county !== countyFilter) return false;
    if (statusFilter !== 'All Statuses' && p.outreach_status !== statusFilter) return false;
    if (offeringFilter !== 'all' && !(p.relevant_offerings ?? []).includes(offeringFilter)) return false;
    if ((p.relevance_score ?? 0) < minRelevance) return false;
    return true;
  });

  // Follow-up queue
  const followups = prospects.filter(p =>
    p.next_followup_at && p.next_followup_at <= new Date().toISOString()
  );

  // ── Actions ──

  const generateOutreach = async (prospectId: string, touchType: string) => {
    setGenerating(`${prospectId}-${touchType}`);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-outreach', {
        body: { prospect_id: prospectId, touch_type: touchType },
      });
      if (fnErr) throw fnErr;
      if (data?.content) {
        setModalContent({
          title: `${touchType.charAt(0).toUpperCase() + touchType.slice(1)} — ${prospects.find(p => p.id === prospectId)?.business_name ?? ''}`,
          body: data.content,
          type: touchType,
        });
        await loadData();
      }
    } catch (err: any) {
      alert(`Failed to generate: ${err?.message || 'Unknown error'}`);
    }
    setGenerating(null);
  };

  const updateStatus = async (prospectId: string, status: string) => {
    await supabase.from('violation_prospects')
      .update({ outreach_status: status, updated_at: new Date().toISOString() })
      .eq('id', prospectId);
    setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, outreach_status: status } : p));
  };

  const viewTouchHistory = (prospect: Prospect) => {
    const items = touches.filter(t => t.prospect_id === prospect.id);
    setTouchHistory({ prospectName: prospect.business_name, items });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  // ── Render ──

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Failed to load data</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-[#1E2D4D] text-white rounded text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Violation Outreach' }]} />
      <div>
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Violation Outreach</h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>
          Identify prospects from health inspection violations and generate personalized outreach.
        </p>
      </div>

      {/* ── KPIs ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i}><Skeleton h={80} /></div>)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <KpiTile label="New Today" value={newToday} valueColor="navy" />
          <KpiTile label="Queued" value={queued} valueColor="warning" />
          <KpiTile label="Letters This Week" value={lettersSentWeek} valueColor="gold" />
          <KpiTile label="Calls Due Today" value={callsDueToday} valueColor="red" />
          <KpiTile label="Conversion Rate" value={`${conversionRate}%`} valueColor="green" />
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 2, background: '#F3F4F6', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {([
          { key: 'prospects' as const, label: `Prospect Queue (${filtered.length})` },
          { key: 'followups' as const, label: `Follow-ups Due (${followups.length})` },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: tab === t.key ? '#FFFFFF' : 'transparent', color: tab === t.key ? NAVY : TEXT_MUTED,
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Filters (prospects tab only) ── */}
      {tab === 'prospects' && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={countyFilter} onChange={e => setCountyFilter(e.target.value)} style={selectStyle}>
            {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            {STATUS_FILTER.map(s => (
              <option key={s} value={s}>{s === 'All Statuses' ? s : (STATUS_LABELS[s]?.label ?? s)}</option>
            ))}
          </select>
          <select value={offeringFilter} onChange={e => setOfferingFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Offerings</option>
            <option value="evidly">EvidLY</option>
            <option value="cpp_hood_cleaning">CPP Hood Cleaning</option>
            <option value="filta_fryer">Filta Fryer</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: TEXT_SEC }}>Min Relevance:</span>
            <input type="range" min={0} max={100} value={minRelevance}
              onChange={e => setMinRelevance(Number(e.target.value))}
              style={{ width: 80 }} />
            <span style={{ fontSize: 11, color: NAVY, fontWeight: 600 }}>{minRelevance}</span>
          </div>
        </div>
      )}

      {/* ── Prospect Queue Table ── */}
      {tab === 'prospects' && (
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FAF7F2', border: '2px dashed #E2D9C8', borderRadius: 12, margin: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{'🔍'}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>No prospects found</div>
              <div style={{ fontSize: 13, color: TEXT_SEC, maxWidth: 400, margin: '0 auto' }}>
                Run the violation crawl to populate prospects, or adjust your filters.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1000 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Business', 'City / County', 'Violations', 'Crit', 'Relevance', 'Offerings', 'Status', 'Last Touch', 'Next Follow-up', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: TEXT_SEC, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const sl = STATUS_LABELS[p.outreach_status] ?? STATUS_LABELS.new;
                    return (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '10px 12px', color: NAVY, fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.business_name}
                        </td>
                        <td style={{ padding: '10px 12px', color: TEXT_SEC, whiteSpace: 'nowrap' }}>
                          {p.city ?? '—'}{p.county ? `, ${p.county}` : ''}
                        </td>
                        <td style={{ padding: '10px 12px', color: NAVY, fontWeight: 600, textAlign: 'center' }}>{p.violation_count}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ color: p.critical_violation_count > 0 ? '#DC2626' : TEXT_SEC, fontWeight: p.critical_violation_count > 0 ? 700 : 400 }}>
                            {p.critical_violation_count}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', minWidth: 32, padding: '2px 6px', borderRadius: 4,
                            fontSize: 10, fontWeight: 700, textAlign: 'center',
                            background: (p.relevance_score ?? 0) >= 70 ? '#DCFCE7' : (p.relevance_score ?? 0) >= 40 ? '#FFFBEB' : '#F3F4F6',
                            color: (p.relevance_score ?? 0) >= 70 ? '#166534' : (p.relevance_score ?? 0) >= 40 ? '#92400E' : '#6B7280',
                          }}>
                            {p.relevance_score ?? 0}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {(p.relevant_offerings ?? []).map(o => (
                              <span key={o} style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: '#F0F4FF', color: '#3B82F6' }}>
                                {OFFERING_LABELS[o] ?? o}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: sl.bg, color: sl.color }}>
                            {sl.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: TEXT_SEC, fontSize: 11, whiteSpace: 'nowrap' }}>
                          {p.last_outreach_at ? new Date(p.last_outreach_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: TEXT_SEC, fontSize: 11, whiteSpace: 'nowrap' }}>
                          {p.next_followup_at ? new Date(p.next_followup_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => generateOutreach(p.id, 'letter')}
                              disabled={generating === `${p.id}-letter`}
                              style={btnStyle(generating === `${p.id}-letter` ? '#E5E7EB' : NAVY, '#fff')}>
                              {generating === `${p.id}-letter` ? '...' : 'Letter'}
                            </button>
                            <button
                              onClick={() => generateOutreach(p.id, 'call')}
                              disabled={generating === `${p.id}-call`}
                              style={btnStyle(generating === `${p.id}-call` ? '#E5E7EB' : GOLD, '#fff')}>
                              {generating === `${p.id}-call` ? '...' : 'Call'}
                            </button>
                            <button
                              onClick={() => generateOutreach(p.id, 'email')}
                              disabled={generating === `${p.id}-email`}
                              style={btnStyle(generating === `${p.id}-email` ? '#E5E7EB' : '#059669', '#fff')}>
                              {generating === `${p.id}-email` ? '...' : 'Email'}
                            </button>
                            <button onClick={() => viewTouchHistory(p)} style={btnStyle('transparent', GOLD)} title="View touch history">
                              {'📋'}
                            </button>
                            {!['do_not_contact', 'converted'].includes(p.outreach_status) && (
                              <select
                                value=""
                                onChange={e => { if (e.target.value) updateStatus(p.id, e.target.value); }}
                                style={{ ...selectStyle, padding: '2px 4px', fontSize: 10, width: 28 }}
                                title="Change status"
                              >
                                <option value="">{'⋯'}</option>
                                <option value="queued">Queue</option>
                                <option value="interested">Interested</option>
                                <option value="converted">Converted</option>
                                <option value="not_interested">Not Interested</option>
                                <option value="do_not_contact">Do Not Contact</option>
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Follow-ups Due ── */}
      {tab === 'followups' && (
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {followups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FAF7F2', border: '2px dashed #E2D9C8', borderRadius: 12, margin: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{'✅'}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>All caught up</div>
              <div style={{ fontSize: 13, color: TEXT_SEC }}>No follow-ups are due right now.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Business', 'City / County', 'Follow-up Due', 'Outreach Count', 'Last Touch', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: TEXT_SEC, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {followups.map(p => {
                  const sl = STATUS_LABELS[p.outreach_status] ?? STATUS_LABELS.new;
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${BORDER}` }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 12px', color: NAVY, fontWeight: 600 }}>{p.business_name}</td>
                      <td style={{ padding: '10px 12px', color: TEXT_SEC }}>{p.city ?? '—'}{p.county ? `, ${p.county}` : ''}</td>
                      <td style={{ padding: '10px 12px', color: '#DC2626', fontWeight: 600, fontSize: 11 }}>
                        {p.next_followup_at ? new Date(p.next_followup_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: NAVY, textAlign: 'center' }}>{p.outreach_count}</td>
                      <td style={{ padding: '10px 12px', color: TEXT_SEC, fontSize: 11 }}>
                        {p.last_outreach_at ? new Date(p.last_outreach_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: sl.bg, color: sl.color }}>
                          {sl.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => generateOutreach(p.id, 'call')} style={btnStyle(GOLD, '#fff')}>Call Script</button>
                          <button onClick={() => generateOutreach(p.id, 'email')} style={btnStyle('#059669', '#fff')}>Email</button>
                          <button onClick={() => viewTouchHistory(p)} style={btnStyle('transparent', GOLD)}>{'📋'}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Outreach Content Modal ── */}
      {modalContent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setModalContent(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, maxWidth: 640, width: '100%',
            maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '16px 24px', borderBottom: `1px solid ${BORDER}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{modalContent.title}</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>AI-generated outreach content</div>
              </div>
              <button onClick={() => setModalContent(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: TEXT_MUTED, cursor: 'pointer' }}>
                {'✕'}
              </button>
            </div>
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <pre style={{
                whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, lineHeight: 1.7, color: '#1F2937', margin: 0,
              }}>
                {modalContent.body}
              </pre>
            </div>
            <div style={{
              padding: '12px 24px', borderTop: `1px solid ${BORDER}`,
              display: 'flex', gap: 8, justifyContent: 'flex-end',
            }}>
              <button onClick={() => copyToClipboard(modalContent.body)}
                style={{ ...btnStyle('#F3F4F6', NAVY), padding: '6px 14px', fontSize: 11 }}>
                Copy
              </button>
              <button onClick={() => window.print()}
                style={{ ...btnStyle('#F3F4F6', NAVY), padding: '6px 14px', fontSize: 11 }}>
                Print
              </button>
              <button onClick={() => setModalContent(null)}
                style={{ ...btnStyle(NAVY, '#fff'), padding: '6px 14px', fontSize: 11 }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Touch History Modal ── */}
      {touchHistory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setTouchHistory(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, maxWidth: 560, width: '100%',
            maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '16px 24px', borderBottom: `1px solid ${BORDER}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Touch History</div>
                <div style={{ fontSize: 12, color: TEXT_SEC, marginTop: 2 }}>{touchHistory.prospectName}</div>
              </div>
              <button onClick={() => setTouchHistory(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: TEXT_MUTED, cursor: 'pointer' }}>
                {'✕'}
              </button>
            </div>
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {touchHistory.items.length === 0 ? (
                <p style={{ color: TEXT_MUTED, fontSize: 13, textAlign: 'center', padding: 20 }}>No outreach touches yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {touchHistory.items.map(t => (
                    <div key={t.id} style={{ padding: 12, background: '#F9FAFB', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'capitalize' }}>{t.touch_type}</span>
                        <span style={{ fontSize: 11, color: TEXT_SEC }}>{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                      {t.outcome && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#EFF6FF', color: '#2563EB', fontWeight: 600 }}>
                          {t.outcome}
                        </span>
                      )}
                      {t.body && (
                        <details style={{ marginTop: 8 }}>
                          <summary style={{ fontSize: 11, color: GOLD, cursor: 'pointer', fontWeight: 600 }}>View content</summary>
                          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#374151', marginTop: 6, lineHeight: 1.6 }}>{t.body}</pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setTouchHistory(null)} style={{ ...btnStyle(NAVY, '#fff'), padding: '6px 14px', fontSize: 11 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
