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
import {
  ClipboardList,
  Search,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Users,
  DollarSign,
  BarChart3,
} from 'lucide-react';

const NAVY = '#0B1628';
const BRAND = '#1e4d6b';
const GOLD = '#A08C5A';
const TEXT_SEC = '#3D5068';
const TEXT_TERT = '#6B7F96';

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

// ── Demo Data ─────────────────────────────────────────────────────────────────

const DEMO_LEADS: AssessmentLeadRow[] = [
  {
    id: '1', business_name: "Tony's Pizzeria", contact_name: 'Tony Russo', email: 'tony@tonyspizza.com',
    phone: '(213) 555-0101', city: 'Los Angeles', zip_code: '90012', referral_source: 'google',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    overall_grade: 'D', facility_safety_score: 70, food_safety_score: 45, documentation_score: 55,
    revenue_risk: 65, liability_risk: 72, cost_risk: 58, operational_risk: 61,
    total_estimated_exposure_low: 42000, total_estimated_exposure_high: 168000,
    findings_json: [
      { title: 'Hood cleaning overdue', severity: 'high', isPositive: false },
      { title: 'Fire suppression not recently inspected', severity: 'critical', isPositive: false },
      { title: 'Backflow testing overdue', severity: 'critical', isPositive: false },
    ],
  },
  {
    id: '2', business_name: 'Sunrise Café', contact_name: 'Maria Chen', email: 'maria@sunrisecafe.com',
    phone: null, city: 'San Francisco', zip_code: '94110', referral_source: 'referral',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    overall_grade: 'B', facility_safety_score: 25, food_safety_score: 30, documentation_score: 35,
    revenue_risk: 28, liability_risk: 35, cost_risk: 22, operational_risk: 30,
    total_estimated_exposure_low: 8000, total_estimated_exposure_high: 35000,
    findings_json: [
      { title: 'HACCP plan is outdated', severity: 'medium', isPositive: false },
      { title: 'Paper-based food safety tracking', severity: 'medium', isPositive: false },
    ],
  },
  {
    id: '3', business_name: 'Harbor Hotel & Kitchen', contact_name: 'James Park', email: 'jpark@harborhotel.com',
    phone: '(619) 555-0202', city: 'San Diego', zip_code: '92101', referral_source: 'trade_show',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    overall_grade: 'C', facility_safety_score: 55, food_safety_score: 40, documentation_score: 60,
    revenue_risk: 48, liability_risk: 55, cost_risk: 42, operational_risk: 52,
    total_estimated_exposure_low: 85000, total_estimated_exposure_high: 320000,
    findings_json: [
      { title: 'Elevator not recently inspected', severity: 'medium', isPositive: false },
      { title: 'Grease trap pumping overdue', severity: 'high', isPositive: false },
      { title: 'No vendor document tracking', severity: 'high', isPositive: false },
    ],
  },
  {
    id: '4', business_name: "Mama Rosa's Catering", contact_name: 'Rosa Gonzalez', email: 'rosa@mamarosas.com',
    phone: '(323) 555-0303', city: 'Pasadena', zip_code: '91101', referral_source: 'cleaning_pros',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    overall_grade: 'F', facility_safety_score: 85, food_safety_score: 70, documentation_score: 90,
    revenue_risk: 82, liability_risk: 88, cost_risk: 75, operational_risk: 85,
    total_estimated_exposure_low: 120000, total_estimated_exposure_high: 450000,
    findings_json: [
      { title: 'Solid-fuel cooking with shared exhaust — code violation', severity: 'critical', isPositive: false },
      { title: 'No consistent temperature logging', severity: 'critical', isPositive: false },
      { title: 'No formal food safety tracking', severity: 'critical', isPositive: false },
      { title: 'Fire suppression not recently inspected', severity: 'critical', isPositive: false },
    ],
  },
  {
    id: '5', business_name: 'Green Leaf Kitchen', contact_name: 'David Kim', email: 'david@greenleaf.com',
    phone: null, city: 'Oakland', zip_code: '94607', referral_source: 'social_media',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    overall_grade: 'A', facility_safety_score: 10, food_safety_score: 15, documentation_score: 20,
    revenue_risk: 12, liability_risk: 18, cost_risk: 10, operational_risk: 15,
    total_estimated_exposure_low: 2500, total_estimated_exposure_high: 12000,
    findings_json: [
      { title: 'Hood cleaning is current', severity: 'positive', isPositive: true },
      { title: 'Fire suppression system is current', severity: 'positive', isPositive: true },
      { title: 'Backflow testing is current', severity: 'positive', isPositive: true },
    ],
  },
  {
    id: '6', business_name: 'Pacific School District', contact_name: 'Sarah Johnson', email: 'sjohnson@pacificsd.edu',
    phone: '(510) 555-0404', city: 'Berkeley', zip_code: '94703', referral_source: 'flyer',
    created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
    overall_grade: 'C', facility_safety_score: 40, food_safety_score: 50, documentation_score: 55,
    revenue_risk: 45, liability_risk: 52, cost_risk: 38, operational_risk: 48,
    total_estimated_exposure_low: 95000, total_estimated_exposure_high: 380000,
    findings_json: [
      { title: 'No HACCP plan', severity: 'high', isPositive: false },
      { title: 'No grease disposal manifests on file', severity: 'high', isPositive: false },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

function AssessmentLeadsPage() {
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();

  const [leads, setLeads] = useState<AssessmentLeadRow[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLeads(DEMO_LEADS);
      setLoading(false);
      return;
    }

    (async () => {
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
      } catch { /* silent */ }
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
    return <div className="p-8 text-center text-gray-500">Access restricted to admin users.</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="rounded-xl p-6 mb-6" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #162640 100%)` }}>
        <div className="flex items-center gap-3 mb-4">
          <ClipboardList className="h-6 w-6" style={{ color: GOLD }} />
          <h1 className="text-xl font-bold text-white">Assessment Leads</h1>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1"><Users className="h-3.5 w-3.5" />Total</div>
            <p className="text-xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1"><AlertTriangle className="h-3.5 w-3.5" />High Risk</div>
            <p className="text-xl font-bold text-red-400">{stats.highRisk}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1"><TrendingUp className="h-3.5 w-3.5" />Avg Grade</div>
            <p className="text-xl font-bold text-white">
              {stats.total > 0 ? (['A', 'B', 'C', 'D', 'F'] as const).sort((a, b) => (stats.gradeCount[b] || 0) - (stats.gradeCount[a] || 0))[0] : '—'}
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1"><DollarSign className="h-3.5 w-3.5" />Total Exposure</div>
            <p className="text-xl font-bold text-amber-400">{formatDollars(stats.totalExposure)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
        {(['leads', 'analytics'] as const).map(t => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              tab === t ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search leads..." data-demo-allow
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
              data-demo-allow
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="all">All Grades</option>
              {['A', 'B', 'C', 'D', 'F'].map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              data-demo-allow
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="date">Newest First</option>
              <option value="grade">Highest Risk First</option>
              <option value="exposure">Highest Exposure First</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No leads found.</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(lead => (
                <div key={lead.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  {/* Row */}
                  <button
                    onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                    data-demo-allow
                    className="w-full text-left p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
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
                      <p className="font-semibold text-sm truncate" style={{ color: NAVY }}>{lead.business_name}</p>
                      <p className="text-xs text-gray-500 truncate">{lead.contact_name} · {lead.email} · {lead.city}</p>
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
                          <div className="text-[10px] text-gray-400">{r.label}</div>
                          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
                      <p className="text-xs text-gray-400">Exposure</p>
                      <p className="text-sm font-semibold" style={{ color: GOLD }}>
                        {lead.total_estimated_exposure_high ? formatDollars(lead.total_estimated_exposure_high) : '—'}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="text-right flex-shrink-0 hidden lg:block">
                      <p className="text-xs text-gray-400">
                        {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    {expandedId === lead.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>

                  {/* Expanded details */}
                  {expandedId === lead.id && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Contact Info</p>
                          <p className="text-sm" style={{ color: NAVY }}>{lead.contact_name}</p>
                          <p className="text-xs text-gray-500">{lead.email}</p>
                          {lead.phone && <p className="text-xs text-gray-500">{lead.phone}</p>}
                          <p className="text-xs text-gray-500">{lead.city}, {lead.zip_code}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Category Scores</p>
                          {[
                            { label: 'Facility Safety', val: lead.facility_safety_score },
                            { label: 'Food Safety', val: lead.food_safety_score },
                            { label: 'Documentation', val: lead.documentation_score },
                          ].map(s => (
                            <div key={s.label} className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-500 w-24">{s.label}</span>
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
                          <p className="text-xs text-gray-400 mb-1">Referral Source</p>
                          <p className="text-sm capitalize" style={{ color: NAVY }}>
                            {(lead.referral_source || 'Unknown').replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-400 mt-2 mb-1">Exposure Range</p>
                          <p className="text-sm font-semibold" style={{ color: GOLD }}>
                            {formatDollars(lead.total_estimated_exposure_low || 0)} – {formatDollars(lead.total_estimated_exposure_high || 0)}
                          </p>
                        </div>
                      </div>
                      {/* Findings */}
                      {lead.findings_json && lead.findings_json.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">Top Findings</p>
                          <div className="space-y-1">
                            {(lead.findings_json as any[]).filter(f => !f.isPositive).slice(0, 5).map((f: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{
                                  backgroundColor: f.severity === 'critical' ? '#ef4444' : f.severity === 'high' ? '#f97316' : '#eab308',
                                }} />
                                <span style={{ color: TEXT_SEC }}>{f.title}</span>
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: NAVY }}>Grade Distribution</h3>
            <div className="flex items-end gap-3 h-32">
              {['A', 'B', 'C', 'D', 'F'].map(g => {
                const count = stats.gradeCount[g] || 0;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={g} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold" style={{ color: NAVY }}>{count}</span>
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: NAVY }}>Referral Sources</h3>
            <div className="space-y-2">
              {Object.entries(
                leads.reduce((acc, l) => {
                  const src = (l.referral_source || 'unknown').replace('_', ' ');
                  acc[src] = (acc[src] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
                <div key={src} className="flex items-center gap-3">
                  <span className="text-sm capitalize w-32 text-gray-600">{src}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${(count / stats.total) * 100}%`,
                      backgroundColor: BRAND,
                    }} />
                  </div>
                  <span className="text-sm font-medium w-6 text-right" style={{ color: NAVY }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Risk Findings */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: NAVY }}>Most Common Findings</h3>
            <div className="space-y-2">
              {Object.entries(
                leads.flatMap(l => (l.findings_json as any[] || []).filter((f: any) => !f.isPositive).map((f: any) => f.title))
                  .reduce((acc, title) => { acc[title] = (acc[title] || 0) + 1; return acc; }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([title, count]) => (
                <div key={title} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 flex-1 truncate">{title}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100" style={{ color: NAVY }}>
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
