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
import { FeatureGate } from '../../components/feature-flags/FeatureGate';
import { KpiTile } from '../../components/admin/KpiTile';
import Button from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

// -- Types --

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

// -- Constants --

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

// -- Helpers --

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div className="bg-gray-200 rounded-md animate-pulse" style={{ width: w, height: h }} />
);

// -- Component --

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

  // -- Derived data --

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

  // -- Actions --

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

  // -- Render --

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Failed to load data</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <FeatureGate flagKey="violation_outreach">
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Violation Outreach' }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Violation Outreach</h1>
        <p className="mt-1 text-sm text-gray-400">
          Identify prospects from health inspection violations and generate personalized outreach.
        </p>
      </div>

      {/* -- KPIs -- */}
      {loading ? (
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i}><Skeleton h={80} /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          <KpiTile label="New Today" value={newToday} valueColor="navy" />
          <KpiTile label="Queued" value={queued} valueColor="warning" />
          <KpiTile label="Letters This Week" value={lettersSentWeek} valueColor="gold" />
          <KpiTile label="Calls Due Today" value={callsDueToday} valueColor="red" />
          <KpiTile label="Conversion Rate" value={`${conversionRate}%`} valueColor="green" />
        </div>
      )}

      {/* -- Tabs -- */}
      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-[3px] w-fit">
        {([
          { key: 'prospects' as const, label: `Prospect Queue (${filtered.length})` },
          { key: 'followups' as const, label: `Follow-ups Due (${followups.length})` },
        ]).map(t => (
          <Button key={t.key} onClick={() => setTab(t.key)}
            variant={tab === t.key ? 'secondary' : 'ghost'}
            size="sm"
            className={tab === t.key ? 'shadow-sm' : ''}>
            {t.label}
          </Button>
        ))}
      </div>

      {/* -- Filters (prospects tab only) -- */}
      {tab === 'prospects' && (
        <div className="flex gap-2.5 flex-wrap items-center">
          <select value={countyFilter} onChange={e => setCountyFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer">
            {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer">
            {STATUS_FILTER.map(s => (
              <option key={s} value={s}>{s === 'All Statuses' ? s : (STATUS_LABELS[s]?.label ?? s)}</option>
            ))}
          </select>
          <select value={offeringFilter} onChange={e => setOfferingFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-xs cursor-pointer">
            <option value="all">All Offerings</option>
            <option value="evidly">EvidLY</option>
            <option value="cpp_hood_cleaning">CPP Hood Cleaning</option>
            <option value="filta_fryer">Filta Fryer</option>
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate_ui">Min Relevance:</span>
            <input type="range" min={0} max={100} value={minRelevance}
              onChange={e => setMinRelevance(Number(e.target.value))}
              className="w-20" />
            <span className="text-[11px] text-navy font-semibold">{minRelevance}</span>
          </div>
        </div>
      )}

      {/* -- Prospect Queue Table -- */}
      {tab === 'prospects' && (
        <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={32} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-[60px] px-5 bg-cream-warm border-2 border-dashed border-border_ui-warm rounded-xl m-4">
              <div className="text-[40px] mb-4">{'🔍'}</div>
              <div className="text-base font-bold text-navy mb-2">No prospects found</div>
              <div className="text-[13px] text-slate_ui max-w-[400px] mx-auto">
                Run the violation crawl to populate prospects, or adjust your filters.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs min-w-[1000px]">
                <thead>
                  <tr className="border-b border-border_ui-warm">
                    {['Business', 'City / County', 'Violations', 'Crit', 'Relevance', 'Offerings', 'Status', 'Last Touch', 'Next Follow-up', 'Actions'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-slate_ui font-semibold text-[10px] uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const sl = STATUS_LABELS[p.outreach_status] ?? STATUS_LABELS.new;
                    return (
                      <tr key={p.id} className="border-b border-border_ui-warm hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-navy font-semibold max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">
                          {p.business_name}
                        </td>
                        <td className="px-3 py-2.5 text-slate_ui whitespace-nowrap">
                          {p.city ?? '—'}{p.county ? `, ${p.county}` : ''}
                        </td>
                        <td className="px-3 py-2.5 text-navy font-semibold text-center">{p.violation_count}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`${p.critical_violation_count > 0 ? 'text-red-600 font-bold' : 'text-slate_ui font-normal'}`}>
                            {p.critical_violation_count}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block min-w-[32px] px-1.5 py-0.5 rounded text-[10px] font-bold text-center ${
                            (p.relevance_score ?? 0) >= 70
                              ? 'bg-green-100 text-green-800'
                              : (p.relevance_score ?? 0) >= 40
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-gray-100 text-gray-500'
                          }`}>
                            {p.relevance_score ?? 0}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 flex-wrap">
                            {(p.relevant_offerings ?? []).map(o => (
                              <span key={o} className="text-[9px] font-semibold px-1.5 py-[1px] rounded-sm bg-[#F0F4FF] text-blue-500">
                                {OFFERING_LABELS[o] ?? o}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-[10px]" style={{ background: sl.bg, color: sl.color }}>
                            {sl.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate_ui text-[11px] whitespace-nowrap">
                          {p.last_outreach_at ? new Date(p.last_outreach_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate_ui text-[11px] whitespace-nowrap">
                          {p.next_followup_at ? new Date(p.next_followup_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              onClick={() => generateOutreach(p.id, 'letter')}
                              disabled={generating === `${p.id}-letter`}
                              variant="primary"
                              size="sm">
                              {generating === `${p.id}-letter` ? '...' : 'Letter'}
                            </Button>
                            <Button
                              onClick={() => generateOutreach(p.id, 'call')}
                              disabled={generating === `${p.id}-call`}
                              variant="gold"
                              size="sm">
                              {generating === `${p.id}-call` ? '...' : 'Call'}
                            </Button>
                            <Button
                              onClick={() => generateOutreach(p.id, 'email')}
                              disabled={generating === `${p.id}-email`}
                              variant="primary"
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700">
                              {generating === `${p.id}-email` ? '...' : 'Email'}
                            </Button>
                            <Button onClick={() => viewTouchHistory(p)}
                              variant="ghost"
                              size="sm"
                              className="text-gold" title="View touch history">
                              {'📋'}
                            </Button>
                            {!['do_not_contact', 'converted'].includes(p.outreach_status) && (
                              <select
                                value=""
                                onChange={e => { if (e.target.value) updateStatus(p.id, e.target.value); }}
                                className="px-1 py-0.5 bg-gray-50 border border-gray-300 rounded-md text-navy text-[10px] w-7 cursor-pointer"
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

      {/* -- Follow-ups Due -- */}
      {tab === 'followups' && (
        <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
          {followups.length === 0 ? (
            <div className="text-center py-[60px] px-5 bg-cream-warm border-2 border-dashed border-border_ui-warm rounded-xl m-4">
              <div className="text-[40px] mb-4">{'✅'}</div>
              <div className="text-base font-bold text-navy mb-2">All caught up</div>
              <div className="text-[13px] text-slate_ui">No follow-ups are due right now.</div>
            </div>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border_ui-warm">
                  {['Business', 'City / County', 'Follow-up Due', 'Outreach Count', 'Last Touch', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-slate_ui font-semibold text-[10px] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {followups.map(p => {
                  const sl = STATUS_LABELS[p.outreach_status] ?? STATUS_LABELS.new;
                  return (
                    <tr key={p.id} className="border-b border-border_ui-warm hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-navy font-semibold">{p.business_name}</td>
                      <td className="px-3 py-2.5 text-slate_ui">{p.city ?? '—'}{p.county ? `, ${p.county}` : ''}</td>
                      <td className="px-3 py-2.5 text-red-600 font-semibold text-[11px]">
                        {p.next_followup_at ? new Date(p.next_followup_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-navy text-center">{p.outreach_count}</td>
                      <td className="px-3 py-2.5 text-slate_ui text-[11px]">
                        {p.last_outreach_at ? new Date(p.last_outreach_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-[10px]" style={{ background: sl.bg, color: sl.color }}>
                          {sl.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <Button onClick={() => generateOutreach(p.id, 'call')}
                            variant="gold" size="sm">Call Script</Button>
                          <Button onClick={() => generateOutreach(p.id, 'email')}
                            variant="primary" size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700">Email</Button>
                          <Button onClick={() => viewTouchHistory(p)}
                            variant="ghost" size="sm"
                            className="text-gold">{'📋'}</Button>
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

      {/* -- Outreach Content Modal -- */}
      <Modal isOpen={!!modalContent} onClose={() => setModalContent(null)} size="lg">
        {modalContent && (
          <>
            <div className="px-6 py-4 border-b border-border_ui-warm flex items-center justify-between">
              <div>
                <div className="text-[15px] font-bold text-navy">{modalContent.title}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">AI-generated outreach content</div>
              </div>
              <Button onClick={() => setModalContent(null)} variant="ghost" size="sm" className="text-xl text-gray-400">
                {'✕'}
              </Button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <pre className="whitespace-pre-wrap break-words font-['DM_Sans',sans-serif] text-[13px] leading-relaxed text-gray-800 m-0">
                {modalContent.body}
              </pre>
            </div>
            <div className="px-6 py-3 border-t border-border_ui-warm flex gap-2 justify-end">
              <Button onClick={() => copyToClipboard(modalContent.body)}
                variant="secondary" size="sm">
                Copy
              </Button>
              <Button onClick={() => window.print()}
                variant="secondary" size="sm">
                Print
              </Button>
              <Button onClick={() => setModalContent(null)}
                variant="primary" size="sm">
                Done
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* -- Touch History Modal -- */}
      <Modal isOpen={!!touchHistory} onClose={() => setTouchHistory(null)} size="lg">
        {touchHistory && (
          <>
            <div className="px-6 py-4 border-b border-border_ui-warm flex items-center justify-between">
              <div>
                <div className="text-[15px] font-bold text-navy">Touch History</div>
                <div className="text-xs text-slate_ui mt-0.5">{touchHistory.prospectName}</div>
              </div>
              <Button onClick={() => setTouchHistory(null)} variant="ghost" size="sm" className="text-xl text-gray-400">
                {'✕'}
              </Button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {touchHistory.items.length === 0 ? (
                <p className="text-gray-400 text-[13px] text-center p-5">No outreach touches yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {touchHistory.items.map(t => (
                    <div key={t.id} className="p-3 bg-gray-50 rounded-lg border border-border_ui-warm">
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs font-bold text-navy capitalize">{t.touch_type}</span>
                        <span className="text-[11px] text-slate_ui">{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                      {t.outcome && (
                        <span className="text-[10px] px-1.5 py-[1px] rounded-sm bg-blue-50 text-blue-600 font-semibold">
                          {t.outcome}
                        </span>
                      )}
                      {t.body && (
                        <details className="mt-2">
                          <summary className="text-[11px] text-gold cursor-pointer font-semibold">View content</summary>
                          <pre className="whitespace-pre-wrap text-[11px] text-gray-700 mt-1.5 leading-relaxed">{t.body}</pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-border_ui-warm flex justify-end">
              <Button onClick={() => setTouchHistory(null)}
                variant="primary" size="sm">Close</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
    </FeatureGate>
  );
}
