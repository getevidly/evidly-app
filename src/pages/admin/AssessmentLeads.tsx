/**
 * ASSESS-TOOL-1 — Assessment Leads Dashboard
 *
 * Admin dashboard to view and analyze compliance assessment leads.
 * Route: /admin/assessments
 * Access: platform_admin, owner_operator, executive
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useRole } from '../../contexts/RoleContext';
import { supabase } from '../../lib/supabase';
import { gradeColor, formatDollars } from '../../lib/assessmentScoring';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { StatCardRow } from '../../components/admin/StatCardRow';
import Button from '../../components/ui/Button';
import {
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { usePageTitle } from '../../hooks/usePageTitle';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssessmentLeadRow {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  city: string;
  zip_code: string;
  referral_source: string | null;
  created_at: string;
  overall_grade?: string;
  facility_safety_score?: number;
  food_safety_score?: number;
  documentation_score?: number;
  revenue_risk?: number;
  liability_risk?: number;
  cost_risk?: number;
  operational_risk?: number;
  total_estimated_exposure_low?: number;
  total_estimated_exposure_high?: number;
  findings_json?: any[];
}

// ── Component ─────────────────────────────────────────────────────────────────

function AssessmentLeadsPage() {
  useDemoGuard();
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();
  usePageTitle('Admin | Assessment Leads');

  const [leads, setLeads] = useState<AssessmentLeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<'leads' | 'analytics'>('leads');
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'grade' | 'exposure'>('date');

  // ── Access guard ──────────────────────────────────────────
  const allowed = isDemoMode
    ? ['platform_admin', 'owner_operator', 'executive'].includes(userRole)
    : isEvidlyAdmin;

  // ── Load data ─────────────────────────────────────────────
  useEffect(() => {
    if (!allowed) return;

    if (isDemoMode) {
      setLeads([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoadError(false);
      try {
        const { data } = await supabase
          .from('assessment_leads')
          .select(`
            *,
            assessment_results (
              overall_grade, facility_safety_score, food_safety_score, documentation_score,
              revenue_risk, liability_risk, cost_risk, operational_risk,
              total_estimated_exposure_low, total_estimated_exposure_high, findings_json
            )
          `)
          .order('created_at', { ascending: false });

        if (data) {
          setLeads(data.map((d: any) => ({
            ...d,
            ...(d.assessment_results?.[0] || {}),
          })));
        }
      } catch {
        setLoadError(true);
      }
      setLoading(false);
    })();
  }, [allowed, isDemoMode]);

  // ── Filtered + sorted ─────────────────────────────────────
  const filtered = useMemo(() => {
    let result = leads;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(l =>
        l.business_name.toLowerCase().includes(s) ||
        l.contact_name.toLowerCase().includes(s) ||
        l.email.toLowerCase().includes(s) ||
        l.city.toLowerCase().includes(s)
      );
    }
    if (gradeFilter !== 'all') {
      result = result.filter(l => l.overall_grade === gradeFilter);
    }
    // Sort
    if (sortBy === 'grade') {
      const order = { F: 0, D: 1, C: 2, B: 3, A: 4 };
      result = [...result].sort((a, b) => (order[a.overall_grade as keyof typeof order] ?? 5) - (order[b.overall_grade as keyof typeof order] ?? 5));
    } else if (sortBy === 'exposure') {
      result = [...result].sort((a, b) => (b.total_estimated_exposure_high || 0) - (a.total_estimated_exposure_high || 0));
    } else {
      result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [leads, search, gradeFilter, sortBy]);

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = leads.length;
    const gradeCount: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    let totalExposure = 0;
    let highRisk = 0;

    for (const l of leads) {
      if (l.overall_grade) gradeCount[l.overall_grade] = (gradeCount[l.overall_grade] || 0) + 1;
      totalExposure += (l.total_estimated_exposure_high || 0);
      if (l.overall_grade === 'D' || l.overall_grade === 'F') highRisk++;
    }

    return { total, gradeCount, totalExposure, highRisk };
  }, [leads]);

  if (!allowed) {
    return <div className="p-8 text-center text-navy/50">Access restricted to admin users.</div>;
  }

  return (
    <div>
      <AdminBreadcrumb crumbs={[{ label: 'Leads' }]} />
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-navy m-0 font-['Outfit',sans-serif]">Leads</h1>
        <p className="text-[13px] text-gray-500 mt-1 mb-0 font-['Inter',sans-serif]">Kitchen Checkup submissions and inbound lead pipeline</p>
      </div>

      <div className="mb-6">
        <StatCardRow cards={[
          { label: 'TOTAL LEADS', value: stats.total },
          { label: 'HIGH RISK', value: stats.highRisk, valueColor: 'red' },
          { label: 'AVG GRADE', value: stats.total > 0 ? (['A', 'B', 'C', 'D', 'F'] as const).sort((a, b) => (stats.gradeCount[b] || 0) - (stats.gradeCount[a] || 0))[0] : '—' },
          { label: 'TOTAL EXPOSURE', value: formatDollars(stats.totalExposure), valueColor: 'gold' },
        ]} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 border border-navy/10">
        {(['leads', 'analytics'] as const).map(t => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              tab === t ? 'bg-navy/5 text-navy' : 'text-navy/50 hover:text-navy/80'
            }`}
          >
            {t === 'leads' ? 'Leads' : 'Analytics'}
          </button>
        ))}
      </div>

      {/* ── LEADS TAB ──────────────────────────────────────── */}
      {tab === 'leads' && (
        <div>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4" data-demo-allow>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy/30" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search leads..." data-demo-allow
                className="w-full pl-9 pr-3 py-2 border border-navy/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2"
              />
            </div>
            <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
              data-demo-allow
              className="px-3 py-2 border border-navy/15 rounded-xl text-sm bg-white">
              <option value="all">All Grades</option>
              {['A', 'B', 'C', 'D', 'F'].map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              data-demo-allow
              className="px-3 py-2 border border-navy/15 rounded-xl text-sm bg-white">
              <option value="date">Newest First</option>
              <option value="grade">Highest Risk First</option>
              <option value="exposure">Highest Exposure First</option>
            </select>
          </div>

          {loadError ? (
            <div className="text-center py-12">
              <p className="text-slate_ui">Failed to load data.</p>
              <Button onClick={() => { setLoading(true); setLoadError(false); }} variant="gold" size="sm" className="mt-3">
                Try again
              </Button>
            </div>
          ) : loading ? (
            <div className="text-center py-12 text-navy/50">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-navy/50">No leads found.</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(lead => (
                <div key={lead.id} className="bg-white rounded-xl border border-navy/10 overflow-hidden">
                  {/* Row */}
                  <button
                    onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                    data-demo-allow
                    className="w-full text-left p-4 flex items-center gap-4 hover:bg-cream transition-colors"
                  >
                    {/* Grade badge */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: gradeColor(lead.overall_grade || 'C') }}
                    >
                      {lead.overall_grade || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate text-navy-deeper">{lead.business_name}</p>
                      <p className="text-xs text-navy/50 truncate">{lead.contact_name} · {lead.email} · {lead.city}</p>
                    </div>

                    {/* Risk mini bars (desktop) */}
                    <div className="hidden md:flex items-center gap-3">
                      {[
                        { label: 'Rev', val: lead.revenue_risk },
                        { label: 'Liab', val: lead.liability_risk },
                        { label: 'Cost', val: lead.cost_risk },
                        { label: 'Ops', val: lead.operational_risk },
                      ].map(r => (
                        <div key={r.label} className="text-center">
                          <div className="text-xs text-navy/30">{r.label}</div>
                          <div className="w-12 h-1.5 bg-navy/[0.08] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${r.val || 0}%`,
                              backgroundColor: r.val && r.val > 60 ? '#ef4444' : r.val && r.val > 40 ? '#f59e0b' : '#22c55e',
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Exposure */}
                    <div className="hidden sm:block text-right flex-shrink-0">
                      <p className="text-xs text-navy/30">Exposure</p>
                      <p className="text-sm font-semibold text-gold">
                        {lead.total_estimated_exposure_high ? formatDollars(lead.total_estimated_exposure_high) : '—'}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="text-right flex-shrink-0 hidden lg:block">
                      <p className="text-xs text-navy/30">
                        {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    {expandedId === lead.id ? <ChevronUp className="h-4 w-4 text-navy/30" /> : <ChevronDown className="h-4 w-4 text-navy/30" />}
                  </button>

                  {/* Expanded details */}
                  {expandedId === lead.id && (
                    <div className="px-4 pb-4 border-t border-navy/5 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-navy/30 mb-1">Contact Info</p>
                          <p className="text-sm text-navy-deeper">{lead.contact_name}</p>
                          <p className="text-xs text-navy/50">{lead.email}</p>
                          {lead.phone && <p className="text-xs text-navy/50">{lead.phone}</p>}
                          <p className="text-xs text-navy/50">{lead.city}, {lead.zip_code}</p>
                        </div>
                        <div>
                          <p className="text-xs text-navy/30 mb-1">Category Scores</p>
                          {[
                            { label: 'Fire Safety', val: lead.facility_safety_score },
                            { label: 'Food Safety', val: lead.food_safety_score },
                            { label: 'Documentation', val: lead.documentation_score },
                          ].map(s => (
                            <div key={s.label} className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-navy/50 w-24">{s.label}</span>
                              <div className="flex-1 h-1.5 bg-navy/[0.08] rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{
                                  width: `${s.val || 0}%`,
                                  backgroundColor: s.val && s.val > 60 ? '#ef4444' : s.val && s.val > 40 ? '#f59e0b' : '#22c55e',
                                }} />
                              </div>
                              <span className="text-xs font-medium w-6 text-right">{s.val ?? '—'}</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs text-navy/30 mb-1">Referral Source</p>
                          <p className="text-sm capitalize text-navy-deeper">
                            {(lead.referral_source || 'Unknown').replace('_', ' ')}
                          </p>
                          <p className="text-xs text-navy/30 mt-2 mb-1">Exposure Range</p>
                          <p className="text-sm font-semibold text-gold">
                            {formatDollars(lead.total_estimated_exposure_low || 0)} – {formatDollars(lead.total_estimated_exposure_high || 0)}
                          </p>
                        </div>
                      </div>
                      {/* Findings */}
                      {lead.findings_json && lead.findings_json.length > 0 && (
                        <div>
                          <p className="text-xs text-navy/30 mb-1.5">Top Findings</p>
                          <div className="space-y-1">
                            {(lead.findings_json as any[]).filter(f => !f.isPositive).slice(0, 5).map((f: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{
                                  backgroundColor: f.severity === 'critical' ? '#ef4444' : f.severity === 'high' ? '#f97316' : '#eab308',
                                }} />
                                <span className="text-navy-mid">{f.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS TAB ──────────────────────────────────── */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          {/* Grade Distribution */}
          <div className="bg-white rounded-xl border border-navy/10 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-navy-deeper">Grade Distribution</h3>
            <div className="flex items-end gap-3 h-32">
              {['A', 'B', 'C', 'D', 'F'].map(g => {
                const count = stats.gradeCount[g] || 0;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={g} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold text-navy-deeper">{count}</span>
                    <div className="w-full rounded-t-lg" style={{
                      height: `${Math.max(4, pct)}%`,
                      backgroundColor: gradeColor(g),
                      minHeight: 4,
                    }} />
                    <span className="text-xs font-bold" style={{ color: gradeColor(g) }}>{g}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Referral Sources */}
          <div className="bg-white rounded-xl border border-navy/10 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-navy-deeper">Referral Sources</h3>
            <div className="space-y-2">
              {Object.entries(
                leads.reduce((acc, l) => {
                  const src = (l.referral_source || 'unknown').replace('_', ' ');
                  acc[src] = (acc[src] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
                <div key={src} className="flex items-center gap-3">
                  <span className="text-sm capitalize w-32 text-navy/70">{src}</span>
                  <div className="flex-1 h-2 bg-navy/[0.08] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-navy" style={{
                      width: `${(count / stats.total) * 100}%`,
                    }} />
                  </div>
                  <span className="text-sm font-medium w-6 text-right text-navy-deeper">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Risk Findings */}
          <div className="bg-white rounded-xl border border-navy/10 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-navy-deeper">Most Common Findings</h3>
            <div className="space-y-2">
              {Object.entries(
                leads.flatMap(l => (l.findings_json as any[] || []).filter((f: any) => !f.isPositive).map((f: any) => f.title))
                  .reduce((acc, title) => { acc[title] = (acc[title] || 0) + 1; return acc; }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([title, count]) => (
                <div key={title} className="flex items-center gap-3">
                  <span className="text-xs text-navy/70 flex-1 truncate">{title}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-navy/5 text-navy-deeper">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssessmentLeadsPage;
