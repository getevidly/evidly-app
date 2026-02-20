import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Network, KeyRound, Users, Palette, FileText,
  LogOut, ChevronRight, ChevronDown, Award,
  TrendingUp, TrendingDown, MapPin, Clock, Settings, Eye, Copy, RefreshCw,
  UserPlus, Download, Upload, Search, Filter, Globe, Lock,
  BarChart3, Zap, ExternalLink, CheckCircle, XCircle, AlertTriangle,
  Layers, Monitor, Paintbrush, ArrowUp, ArrowDown, Minus,
  Thermometer, ClipboardCheck, Wrench, FileWarning, Loader2, CheckCircle2,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import {
  enterpriseTenants, enterpriseHierarchy, enterpriseUsers,
  enterpriseReportTemplates, enterpriseAuditLog,
  enterpriseAlerts, enterpriseIntegrations,
  enterpriseOnboardingPCDining, enterpriseOnboardingSodexo,
  enterpriseTrendData, enterpriseBulkOps, enterprisePricingTiers,
  type EnterpriseTenant, type EnterpriseHierarchyNode,
  type EnterpriseUser, type EnterpriseReportTemplate,
  type EnterpriseAuditEntry, type EnterpriseAlert,
  type EnterpriseIntegration, type EnterpriseOnboardingPhase,
  type EnterpriseTrendPoint, type EnterpriseBulkOp,
} from '../data/demoData';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────
type Tab = 'overview' | 'tenants' | 'hierarchy' | 'sso' | 'users' | 'branding' | 'reports' | 'integrations' | 'bulk_ops' | 'onboarding';

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview',      label: 'Corporate View',      icon: LayoutDashboard },
  { id: 'tenants',       label: 'Tenants',              icon: Building2 },
  { id: 'hierarchy',     label: 'Hierarchy',            icon: Network },
  { id: 'sso',           label: 'SSO',                  icon: KeyRound },
  { id: 'users',         label: 'Users',                icon: Users },
  { id: 'branding',      label: 'Branding',             icon: Palette },
  { id: 'reports',       label: 'Reporting',             icon: FileText },
  { id: 'integrations',  label: 'Integrations',         icon: Zap },
  { id: 'bulk_ops',      label: 'Bulk Ops',             icon: Layers },
  { id: 'onboarding',    label: 'Onboarding',           icon: Award },
];

// ── Helpers ────────────────────────────────────────────────────
function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatCurrency(n: number) {
  return '$' + (n / 1_000_000).toFixed(1) + 'M';
}
function formatTime(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function scoreColor(s: number) {
  if (s >= 90) return '#22c55e';
  if (s >= 80) return '#d4af37';
  if (s >= 70) return '#f59e0b';
  return '#ef4444';
}
function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    onboarding: 'bg-blue-50 text-blue-700 border-blue-200',
    pilot: 'bg-amber-50 text-amber-700 border-amber-200',
    suspended: 'bg-red-50 text-red-700 border-red-200',
    passed: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    untested: 'bg-gray-100 text-gray-500 border-gray-200',
    enterprise: 'bg-blue-50 text-blue-700 border-blue-200',
    enterprise_plus: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${map[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {label}
    </span>
  );
}
function ssoStatusBadge(st: 'active' | 'pending' | 'disabled') {
  const m = { active: 'bg-green-50 text-green-700', pending: 'bg-amber-50 text-amber-700', disabled: 'bg-gray-100 text-gray-500' };
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${m[st]}`}>{st.charAt(0).toUpperCase() + st.slice(1)}</span>;
}

function ScoreCircle({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={3} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="central" className="transform rotate-90 origin-center" style={{ fontSize: size * 0.28, fontWeight: 700, fill: '#1f2937' }}>
        {score}
      </text>
    </svg>
  );
}

// ── SVG Sparkline for trend data ───────────────────────────────
function TrendSparkline({ data, width = 280, height = 80 }: { data: EnterpriseTrendPoint[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const scores = data.map(d => d.overall);
  const min = Math.min(...scores) - 2;
  const max = Math.max(...scores) + 2;
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.overall - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e4d6b" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#1e4d6b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#trendGrad)" />
      <polyline points={points} fill="none" stroke="#1e4d6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d.overall - min) / range) * height;
        return <circle key={i} cx={x} cy={y} r={i === data.length - 1 ? 4 : 2} fill={i === data.length - 1 ? '#1e4d6b' : '#1e4d6b80'} />;
      })}
    </svg>
  );
}

// Find worst location recursively
function findWorstLocation(node: EnterpriseHierarchyNode): EnterpriseHierarchyNode | null {
  if (node.level === 'location') return node;
  if (!node.children || node.children.length === 0) return null;
  let worst: EnterpriseHierarchyNode | null = null;
  for (const child of node.children) {
    const w = findWorstLocation(child);
    if (w && (!worst || w.complianceScore < worst.complianceScore)) worst = w;
  }
  return worst;
}

// Count critical items for a division
function countCriticalItems(node: EnterpriseHierarchyNode): number {
  if (!node.children) return 0;
  let count = 0;
  for (const child of node.children) {
    if (child.complianceScore < 75) count++;
    if (child.children) count += countCriticalItems(child);
  }
  return count;
}

// Regulatory overlay markers for trend chart
const REGULATORY_MARKERS = [
  { month: 'Jul 25', label: 'AB 660 (CA)', color: '#d4af37' },
  { month: 'Nov 25', label: 'FDA Update', color: '#6b21a8' },
];

// ── Corporate View (Overview Tab) ─────────────────────────────
function OverviewTab({ showToast }: { showToast: (msg: string) => void }) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [loading, setLoading] = useState(false);
  const [liveTenants, setLiveTenants] = useState<any[]>([]);
  const [liveAuditLog, setLiveAuditLog] = useState<any[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [liveRollupScores, setLiveRollupScores] = useState<any[]>([]);

  // ── Live mode: fetch enterprise data ────────────────────────
  useEffect(() => {
    if (isDemoMode || !profile?.organization_id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [tenantsRes, auditRes, rollupRes] = await Promise.all([
          supabase.from('enterprise_tenants').select('*').limit(20),
          supabase.from('enterprise_audit_log').select('*').order('created_at', { ascending: false }).limit(10),
          supabase.from('enterprise_rollup_scores').select('*').order('period_date', { ascending: false }).limit(50),
        ]);
        if (!cancelled) {
          if (tenantsRes.data) setLiveTenants(tenantsRes.data);
          if (auditRes.data) setLiveAuditLog(auditRes.data);
          if (rollupRes.data) setLiveRollupScores(rollupRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch enterprise overview:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isDemoMode, profile?.organization_id]);

  // Use live or demo data
  const tenants = !isDemoMode && liveTenants.length > 0 ? liveTenants : enterpriseTenants;
  const alerts = !isDemoMode && liveAlerts.length > 0 ? liveAlerts : enterpriseAlerts;
  const auditLog = !isDemoMode && liveAuditLog.length > 0 ? liveAuditLog : enterpriseAuditLog;
  const trendData = enterpriseTrendData; // always demo for trend charts

  const totalLocations = enterpriseTenants.reduce((s, t) => s + t.stats.totalLocations, 0);
  const totalUsers = enterpriseTenants.reduce((s, t) => s + t.stats.activeUsers, 0);
  const avgScore = +(enterpriseTenants.reduce((s, t) => s + t.stats.avgComplianceScore, 0) / enterpriseTenants.length).toFixed(1);
  const totalARR = enterpriseTenants.reduce((s, t) => s + t.contract.annualValue, 0);
  const ssoEnabled = enterpriseTenants.filter(t => t.ssoConfig.enabled).length;
  const criticalAlerts = alerts.filter((a: any) => a.severity === 'critical' && !a.acknowledged).length;
  const latestTrend = trendData[trendData.length - 1];
  const prevTrend = trendData[trendData.length - 2];
  const threeMonthAgo = trendData[trendData.length - 4];
  const trendDelta = +(latestTrend.overall - prevTrend.overall).toFixed(1);
  const trend3mDelta = +(latestTrend.overall - threeMonthAgo.overall).toFixed(1);
  // Division scorecard from hierarchy
  const divisions = enterpriseHierarchy.children || [];
  // Location risk breakdown
  const locationsCompliant = Math.round(totalLocations * 0.82); // score 80+
  const locationsAtRisk = Math.round(totalLocations * 0.14); // score 60-79
  const locationsCritical = totalLocations - locationsCompliant - locationsAtRisk; // <60
  // Data points counter
  const dataPointsThisMonth = 1_284_720;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1e4d6b' }} />
        <span className="ml-3 text-sm text-gray-500">Loading enterprise data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <EvidlyIcon size={20} />
          <h2 className="text-base font-bold text-gray-900">Executive Summary</h2>
          <button
            onClick={() => navigate('/enterprise/dashboard')}
            className="ml-auto flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-md cursor-pointer transition-colors"
            style={{ backgroundColor: '#1e4d6b', color: 'white' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#163a52')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
          >
            <Eye className="h-3 w-3" />
            View Executive Dashboard
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Overall Score', value: avgScore + '%', icon: EvidlyIcon as any, highlight: true },
            { label: 'vs Last Mo', value: (trendDelta >= 0 ? '+' : '') + trendDelta + '%', icon: trendDelta >= 0 ? TrendingUp : TrendingDown },
            { label: 'vs 3Mo Ago', value: (trend3mDelta >= 0 ? '+' : '') + trend3mDelta + '%', icon: trend3mDelta >= 0 ? TrendingUp : TrendingDown },
            { label: 'Locations', value: `${totalLocations.toLocaleString()} total`, icon: MapPin },
            { label: 'Compliant', value: `${locationsCompliant.toLocaleString()} (80+)`, icon: CheckCircle, highlight: true },
            { label: 'At Risk', value: `${locationsAtRisk} (60-79)`, icon: AlertTriangle },
            { label: 'Critical', value: `${locationsCritical} (<60)`, icon: AlertTriangle, alert: locationsCritical > 0 },
            { label: 'Alerts', value: String(criticalAlerts), icon: AlertTriangle, alert: criticalAlerts > 0 },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-3 ${(s as any).alert ? 'border-red-200 bg-red-50' : (s as any).highlight ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon className="h-3.5 w-3.5" style={{ color: (s as any).alert ? '#ef4444' : '#1e4d6b' }} />
                <span className="text-[10px] text-gray-500">{s.label}</span>
              </div>
              <p className={`text-lg font-bold ${(s as any).alert ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hierarchy Scorecard Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Organization Scorecard — Pacific Coast Dining</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Business Unit</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Locations</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Avg Score</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">Trend</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">Worst Location</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {divisions.map(div => {
                  const worst = findWorstLocation(div);
                  const critItems = countCriticalItems(div);
                  const trend = nodeTrend(div.id);
                  return (
                    <tr key={div.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => showToast(`Drill down to ${div.name} — coming soon`)}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: LEVEL_COLORS.division }} />
                          <span className="font-medium text-gray-900">{div.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{div.locationCount.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-bold" style={{ color: scoreColor(div.complianceScore) }}>{div.complianceScore}%</span>
                      </td>
                      <td className="px-3 py-2.5 text-center hidden sm:table-cell"><TrendBadge value={trend} /></td>
                      <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell">{worst && worst.complianceScore < 80 ? `${worst.name} (${worst.complianceScore})` : '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        {critItems > 0 ? (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-50 text-red-700 border border-red-200">{critItems} critical</span>
                        ) : div.complianceScore < 89 ? (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">Review</span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-50 text-green-700 border border-green-200">On Track</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-3 py-2.5 text-gray-900">Corporate Total</td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{enterpriseHierarchy.locationCount.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-bold" style={{ color: scoreColor(enterpriseHierarchy.complianceScore) }}>{enterpriseHierarchy.complianceScore}%</span>
                  </td>
                  <td className="px-3 py-2.5 text-center hidden sm:table-cell"><TrendBadge value={nodeTrend(enterpriseHierarchy.id)} /></td>
                  <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell">—</td>
                  <td className="px-3 py-2.5" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Critical Alerts</h3>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
              {alerts.filter((a: any) => !a.acknowledged).length} active
            </span>
          </div>
          <div className="space-y-2 max-h-[340px] overflow-y-auto">
            {alerts.filter((a: any) => !a.acknowledged).map((a: any) => (
              <div key={a.id} className={`p-3 rounded-lg border ${a.severity === 'critical' ? 'border-red-200 bg-red-50/50' : a.severity === 'warning' ? 'border-amber-200 bg-amber-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${a.severity === 'critical' ? 'text-red-500' : a.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-semibold ${a.severity === 'critical' ? 'text-red-700' : a.severity === 'warning' ? 'text-amber-700' : 'text-blue-700'}`}>
                        {a.severity.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-gray-400">· {a.category}</span>
                    </div>
                    <p className="text-xs text-gray-700">{a.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{a.nodeName} ({a.nodeCode}) · {formatTime(a.detectedAt)}</p>
                  </div>
                  <button onClick={() => showToast('Alert acknowledged')} className="text-[10px] font-medium px-2 py-0.5 rounded border border-gray-200 hover:bg-white cursor-pointer text-gray-500">
                    Ack
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Analytics + Tenant Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 12-Month Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">12-Month Compliance Trend</h3>
          <p className="text-[10px] text-gray-400 mb-4">Pacific Coast Dining — Overall Score · Predict next quarter: {(latestTrend.overall + trend3mDelta / 3).toFixed(1)}%</p>
          <div className="flex items-end gap-6 flex-wrap">
            <div className="relative overflow-x-auto">
              <TrendSparkline data={trendData} width={320} height={100} />
              {/* Regulatory overlay markers */}
              {REGULATORY_MARKERS.map(marker => {
                const idx = trendData.findIndex(d => d.month === marker.month);
                if (idx < 0) return null;
                const x = (idx / (trendData.length - 1)) * 320;
                return (
                  <div key={marker.label} className="absolute" style={{ left: x - 1, top: 0, height: 100 }}>
                    <div className="w-0.5 h-full opacity-40" style={{ backgroundColor: marker.color }} />
                    <span className="absolute text-[8px] font-medium whitespace-nowrap" style={{ top: -14, left: -10, color: marker.color }}>{marker.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 flex-shrink-0">
              {[
                { label: 'Current', value: latestTrend.overall, color: '#1e4d6b' },
                { label: 'Food Safety', value: latestTrend.foodSafety, color: '#22c55e' },
                { label: 'Fire Safety', value: latestTrend.fireSafety, color: '#d4af37' },
              ].map(m => (
                <div key={m.label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-[10px] text-gray-500 w-20">{m.label}</span>
                  <span className="text-xs font-bold text-gray-900">{m.value}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            {trendData.filter((_, i) => i % 3 === 0 || i === trendData.length - 1).map(d => (
              <span key={d.month} className="text-[9px] text-gray-400">{d.month}</span>
            ))}
          </div>
        </div>

        {/* Tenant Status + Audit */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Tenant Status</h3>
            <div className="space-y-2">
              {enterpriseTenants.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: t.branding.primaryColor }}>
                    {t.logoPlaceholder}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-900">{t.displayName}</span>
                      {statusBadge(t.status)}
                    </div>
                    <p className="text-[10px] text-gray-500">{t.stats.totalLocations.toLocaleString()} loc · {t.stats.avgComplianceScore}%</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: '#1e4d6b' }}>{formatCurrency(t.contract.annualValue)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
            <div className="space-y-1.5">
              {auditLog.slice(0, 4).map((e: any) => (
                <div key={e.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: e.action.includes('provision') || e.action.includes('created') ? '#22c55e' : e.action.includes('deactivated') ? '#ef4444' : '#1e4d6b' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-700 truncate">{e.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                    <p className="text-[10px] text-gray-400">{e.tenantName} · {formatTime(e.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Provision Tenant', icon: Building2 },
            { label: 'Run SCIM Sync', icon: RefreshCw },
            { label: 'Generate Reports', icon: FileText },
            { label: 'Bulk Import', icon: Upload },
            { label: 'Export Inspection Log', icon: Download },
            { label: 'View All Alerts', icon: AlertTriangle },
          ].map(a => (
            <button key={a.label} onClick={() => showToast(`${a.label} — coming soon`)} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer text-left">
              <a.icon className="h-4 w-4" style={{ color: '#1e4d6b' }} />
              <span className="text-xs font-medium text-gray-700">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tenant Management Tab ──────────────────────────────────────
function TenantManagementTab({ showToast }: { showToast: (msg: string) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-900">All Tenants ({enterpriseTenants.length})</h3>
        <button onClick={() => showToast('Provision New Tenant — coming soon')} className="px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer min-h-[44px]" style={{ backgroundColor: '#1e4d6b' }}>
          + New Tenant
        </button>
      </div>

      {enterpriseTenants.map(t => (
        <div key={t.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setExpanded(expanded === t.id ? null : t.id)}
            className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: t.branding.primaryColor }}>
              {t.logoPlaceholder}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-900">{t.displayName}</span>
                {statusBadge(t.status)}
                {statusBadge(t.contract.tier)}
                {t.ssoConfig.enabled && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                    <Lock className="h-2.5 w-2.5" /> SSO
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{t.domain} · {t.stats.totalLocations.toLocaleString()} locations · CSM: {t.contract.dedicatedCSM}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold" style={{ color: '#1e4d6b' }}>{formatCurrency(t.contract.annualValue)}/yr</p>
              <p className="text-[10px] text-gray-400">{formatDate(t.contract.startDate)} — {formatDate(t.contract.endDate)}</p>
            </div>
            {expanded === t.id ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
          </button>

          {/* Expanded Details */}
          {expanded === t.id && (
            <div className="border-t border-gray-100 px-4 sm:px-5 pb-4 sm:pb-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {/* Branding */}
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Branding</p>
                  <div className="flex items-center gap-2 mb-2">
                    {[t.branding.primaryColor, t.branding.secondaryColor, t.branding.accentColor].map((c, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded border border-gray-300" style={{ backgroundColor: c }} />
                        <span className="text-[10px] text-gray-500">{c}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500">Sidebar: {t.branding.sidebarBg} · Powered by: {t.showPoweredBy ? 'Shown' : 'Hidden'}</p>
                </div>

                {/* SSO */}
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700 mb-2">SSO Config</p>
                  {t.ssoConfig.providerType !== 'none' ? (
                    <>
                      <p className="text-xs text-gray-600">{t.ssoConfig.providerType.toUpperCase()} via {t.ssoConfig.providerName}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-gray-500">Test:</span>
                        {statusBadge(t.ssoConfig.testStatus)}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">SCIM: {t.scimEnabled ? 'Enabled' : 'Disabled'}</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Not configured</p>
                  )}
                </div>

                {/* Features */}
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Features</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(t.features).map(([k, v]) => (
                      <span key={k} className={`px-1.5 py-0.5 text-[10px] rounded-full ${v ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {k.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hierarchy Config */}
              <div className="mt-3 p-3 rounded-lg bg-gray-50">
                <p className="text-xs font-semibold text-gray-700 mb-2">Hierarchy Levels</p>
                <div className="flex items-center gap-1">
                  {t.hierarchy.map((h, i) => (
                    <span key={h.key} className="flex items-center gap-1">
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>
                        {h.label}
                      </span>
                      {i < t.hierarchy.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {['Edit Config', 'View Users', 'Test SSO', 'Export Data'].map(label => (
                  <button key={label} onClick={() => showToast(`${label} for ${t.displayName} — coming soon`)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer min-h-[44px]">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Hierarchy & Rollups Tab ──────────────────────────────────────

// Deterministic pseudo-random trend from node id
function nodeTrend(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return ((h % 31) - 12) / 10; // -1.2 to +1.8
}

// Common issues by hierarchy level
const COMMON_ISSUES: Record<string, { icon: typeof Thermometer; label: string; pct: number }[]> = {
  corporate: [
    { icon: Thermometer, label: 'Temperature logging gaps', pct: 12 },
    { icon: ClipboardCheck, label: 'Checklist completion below 95%', pct: 8 },
    { icon: Wrench, label: 'Overdue equipment maintenance', pct: 6 },
    { icon: FileWarning, label: 'Expired vendor documentation', pct: 5 },
  ],
  division: [
    { icon: Thermometer, label: 'Temperature excursions', pct: 10 },
    { icon: ClipboardCheck, label: 'Incomplete daily checklists', pct: 9 },
    { icon: FileWarning, label: 'Missing HACCP documentation', pct: 4 },
  ],
  region: [
    { icon: Wrench, label: 'Hood cleaning overdue', pct: 14 },
    { icon: Thermometer, label: 'Cold holding violations', pct: 7 },
    { icon: ClipboardCheck, label: 'Opening checklist skipped', pct: 6 },
  ],
  district: [
    { icon: Thermometer, label: 'Walk-in cooler temp drift', pct: 11 },
    { icon: Wrench, label: 'Grease trap service overdue', pct: 8 },
    { icon: FileWarning, label: 'Fire suppression cert expired', pct: 5 },
  ],
  location: [
    { icon: Thermometer, label: 'Missed temp check windows', pct: 15 },
    { icon: ClipboardCheck, label: 'Closing checklist incomplete', pct: 10 },
  ],
};

const LEVEL_COLORS: Record<string, string> = {
  corporate: '#6b21a8', division: '#1e4d6b', region: '#0e7490', district: '#d4af37', location: '#22c55e',
};

function TrendBadge({ value }: { value: number }) {
  if (Math.abs(value) < 0.2) return <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400"><Minus className="h-2.5 w-2.5" /> 0.0</span>;
  if (value > 0) return <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600"><ArrowUp className="h-2.5 w-2.5" /> +{value.toFixed(1)}</span>;
  return <span className="inline-flex items-center gap-0.5 text-[10px] text-red-500"><ArrowDown className="h-2.5 w-2.5" /> {value.toFixed(1)}</span>;
}

function HierarchyNode({ node, depth = 0, selectedId, onSelect }: { node: EnterpriseHierarchyNode; depth?: number; selectedId: string | null; onSelect: (n: EnterpriseHierarchyNode) => void }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const trend = nodeTrend(node.id);

  return (
    <div>
      <button
        onClick={() => { onSelect(node); if (hasChildren) setOpen(!open); }}
        className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}
        style={{ marginLeft: depth * 20 }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <div className="w-3.5 flex-shrink-0" />
        )}
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: LEVEL_COLORS[node.level] || '#6b7280' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-900 truncate">{node.name}</span>
            <span className="text-[10px] text-gray-400">{node.code}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <TrendBadge value={trend} />
          <span className="text-[10px] text-gray-500">{node.locationCount} loc</span>
          <ScoreCircle score={node.complianceScore} size={32} />
        </div>
      </button>
      {open && hasChildren && (
        <div>
          {node.children!.map(child => (
            <HierarchyNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}


function HierarchyTab({ showToast }: { showToast: (msg: string) => void }) {
  const [selectedTenant, setSelectedTenant] = useState('ent-pcdining');
  const [selectedNode, setSelectedNode] = useState<EnterpriseHierarchyNode | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const tenant = enterpriseTenants.find(t => t.id === selectedTenant)!;

  // Rollup rule config (demo state)
  const [rollupWeight, setRollupWeight] = useState<'equal' | 'by_size'>('by_size');

  // Best/worst children
  const sortedChildren = useMemo(() => {
    if (!selectedNode?.children || selectedNode.children.length === 0) return { best: null, worst: null };
    const sorted = [...selectedNode.children].sort((a, b) => b.complianceScore - a.complianceScore);
    return { best: sorted[0], worst: sorted[sorted.length - 1] };
  }, [selectedNode]);

  // Issues for the selected node's level
  const issues = selectedNode ? (COMMON_ISSUES[selectedNode.level] || COMMON_ISSUES.location) : [];

  return (
    <div className="space-y-4">
      {/* Tenant selector + config toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-gray-600">Tenant:</span>
        <div className="flex items-center gap-2">
          {enterpriseTenants.map(t => (
            <button
              key={t.id}
              onClick={() => { setSelectedTenant(t.id); setSelectedNode(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${selectedTenant === t.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: t.branding.primaryColor }}>
                {t.logoPlaceholder}
              </div>
              {t.displayName.split(' ')[0]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${showConfig ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          <Settings className="h-3.5 w-3.5" />
          Hierarchy Config
        </button>
      </div>

      {/* Hierarchy Configuration Panel */}
      {showConfig && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Network className="h-4 w-4" style={{ color: '#1e4d6b' }} />
            <h3 className="text-sm font-semibold text-gray-900">Hierarchy Configuration — {tenant.displayName}</h3>
          </div>

          {/* Levels */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Hierarchy Levels ({tenant.hierarchy.length} of 6)</p>
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {tenant.hierarchy.map((h, i) => (
                <span key={h.key} className="flex items-center gap-1">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-gray-200 bg-white">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: LEVEL_COLORS[h.key] || '#6b7280' }} />
                    <span className="text-xs font-medium text-gray-900">{h.label}</span>
                    {h.key === 'location' && (
                      <MapPin className="h-3 w-3 text-green-500" />
                    )}
                  </span>
                  {i < tenant.hierarchy.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-gray-400">
              <MapPin className="h-2.5 w-2.5 inline text-green-500" /> = locations can be attached at this level
            </p>
          </div>

          {/* Rollup Rules */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Score Rollup Method</p>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="rollup" checked={rollupWeight === 'by_size'} onChange={() => setRollupWeight('by_size')} className="accent-[#1e4d6b]" />
                <span className="text-xs text-gray-600">Weighted by location count</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="rollup" checked={rollupWeight === 'equal'} onChange={() => setRollupWeight('equal')} className="accent-[#1e4d6b]" />
                <span className="text-xs text-gray-600">Equal weight</span>
              </label>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {rollupWeight === 'by_size'
                ? 'Scores at each level = weighted average of children (weighted by number of locations underneath)'
                : 'Scores at each level = simple average of direct children scores'}
            </p>
          </div>

          {/* Rollup flow diagram */}
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Rollup Flow</p>
            <div className="flex items-center gap-1 flex-wrap">
              {[...tenant.hierarchy].reverse().map((h, i) => (
                <span key={h.key} className="flex items-center gap-1">
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded" style={{ backgroundColor: LEVEL_COLORS[h.key] + '20', color: LEVEL_COLORS[h.key], border: `1px solid ${LEVEL_COLORS[h.key]}40` }}>
                    {h.label} score{h.key === 'location' ? ' (actual)' : ` = ${rollupWeight === 'by_size' ? 'weighted' : 'simple'} avg`}
                  </span>
                  {i < tenant.hierarchy.length - 1 && <ArrowUp className="h-3 w-3 text-gray-400" />}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => showToast('Hierarchy configuration saved')} className="px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer min-h-[44px]" style={{ backgroundColor: '#1e4d6b' }}>Save Config</button>
            <button onClick={() => showToast('Add hierarchy level — coming soon')} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer min-h-[44px]">+ Add Level</button>
            <button onClick={() => showToast('Reset to default — coming soon')} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer min-h-[44px]">Reset</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Tree View */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Organization Hierarchy</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(LEVEL_COLORS).filter(([k]) => tenant.hierarchy.some(h => h.key === k)).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                  <span className="text-[9px] text-gray-400">{tenant.hierarchy.find(h => h.key === k)?.label}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-0.5">
            <HierarchyNode node={enterpriseHierarchy} selectedId={selectedNode?.id || null} onSelect={setSelectedNode} />
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            {selectedNode ? (
              <>
                {/* Header with trend */}
                <div className="flex items-center gap-3 mb-4">
                  <ScoreCircle score={selectedNode.complianceScore} size={56} />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-900">{selectedNode.name}</h3>
                    <p className="text-[10px] text-gray-400">{selectedNode.code} · {tenant.hierarchy.find(h => h.key === selectedNode.level)?.label || selectedNode.level}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{selectedNode.locationCount} location{selectedNode.locationCount !== 1 ? 's' : ''}</span>
                      <TrendBadge value={nodeTrend(selectedNode.id)} />
                      <span className="text-[10px] text-gray-400">vs last month</span>
                    </div>
                  </div>
                </div>

                {/* Pillar Breakdown */}
                <div className="space-y-3 mb-4">
                  <h4 className="text-xs font-semibold text-gray-700">Pillar Breakdown</h4>
                  {[
                    { label: 'Food Safety', value: selectedNode.foodSafety, trend: nodeTrend(selectedNode.id + '-op') },
                    { label: 'Fire Safety', value: selectedNode.fireSafety, trend: nodeTrend(selectedNode.id + '-eq') },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <TrendBadge value={item.trend} />
                          <span className="text-xs font-bold" style={{ color: scoreColor(item.value) }}>{item.value}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${item.value}%`, backgroundColor: scoreColor(item.value) }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rollup explanation */}
                {selectedNode.children && selectedNode.children.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-gray-50 mb-4">
                    <p className="text-[10px] text-gray-500">
                      <span className="font-semibold text-gray-700">{selectedNode.complianceScore}%</span> = {rollupWeight === 'by_size' ? 'weighted' : 'simple'} average of {selectedNode.children.length} {tenant.hierarchy.find(h => {
                        const idx = tenant.hierarchy.findIndex(x => x.key === selectedNode.level);
                        return tenant.hierarchy[idx + 1]?.key === h.key;
                      })?.label?.toLowerCase() || 'sub-unit'}s
                      {rollupWeight === 'by_size' && ' (weighted by location count)'}
                    </p>
                  </div>
                )}

                {/* Best / Worst children */}
                {selectedNode.children && selectedNode.children.length > 1 && sortedChildren.best && sortedChildren.worst && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button onClick={() => setSelectedNode(sortedChildren.best!)} className="p-2.5 rounded-lg border border-green-200 bg-green-50/50 text-left cursor-pointer hover:bg-green-50 transition-colors">
                      <p className="text-[10px] font-semibold text-green-700 mb-1">Best Performing</p>
                      <p className="text-xs font-bold text-gray-900">{sortedChildren.best.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-sm font-bold text-green-700">{sortedChildren.best.complianceScore}%</span>
                        <TrendBadge value={nodeTrend(sortedChildren.best.id)} />
                      </div>
                    </button>
                    <button onClick={() => setSelectedNode(sortedChildren.worst!)} className="p-2.5 rounded-lg border border-red-200 bg-red-50/50 text-left cursor-pointer hover:bg-red-50 transition-colors">
                      <p className="text-[10px] font-semibold text-red-700 mb-1">Needs Attention</p>
                      <p className="text-xs font-bold text-gray-900">{sortedChildren.worst.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-sm font-bold text-red-600">{sortedChildren.worst.complianceScore}%</span>
                        <TrendBadge value={nodeTrend(sortedChildren.worst.id)} />
                      </div>
                    </button>
                  </div>
                )}

                {/* Children list */}
                {selectedNode.children && selectedNode.children.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Sub-units ({selectedNode.children.length})</h4>
                    <div className="space-y-1.5">
                      {[...selectedNode.children].sort((a, b) => b.complianceScore - a.complianceScore).map(c => (
                        <button key={c.id} onClick={() => setSelectedNode(c)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-left">
                          <span className="text-xs text-gray-700">{c.name}</span>
                          <div className="flex items-center gap-2">
                            <TrendBadge value={nodeTrend(c.id)} />
                            <span className="text-[10px] text-gray-400">{c.locationCount} loc</span>
                            <span className="text-xs font-bold" style={{ color: scoreColor(c.complianceScore) }}>{c.complianceScore}%</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common Issues */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Common Issues</h4>
                  <div className="space-y-1.5">
                    {issues.map((issue, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                        <issue.icon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        <span className="text-xs text-gray-700 flex-1">{issue.label}</span>
                        <span className="text-[10px] font-medium text-amber-600">{issue.pct}% of locations</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Network className="h-8 w-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">Select a node to view details</p>
                <p className="text-xs text-gray-400 mt-1">Click any item in the hierarchy tree</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── SSO Configuration Tab ──────────────────────────────────────
function SSOTab({ showToast }: { showToast: (msg: string) => void }) {
  const [selectedTenant, setSelectedTenant] = useState('ent-pcdining');
  const tenant = enterpriseTenants.find(t => t.id === selectedTenant)!;
  const [ssoType, setSsoType] = useState<'saml' | 'oidc'>(tenant.ssoConfig.providerType === 'oidc' ? 'oidc' : 'saml');

  return (
    <div className="space-y-4">
      {/* Tenant Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-gray-600">Tenant:</span>
        <div className="flex items-center gap-2 flex-wrap">
          {enterpriseTenants.map(t => (
            <button
              key={t.id}
              onClick={() => { setSelectedTenant(t.id); setSsoType(t.ssoConfig.providerType === 'oidc' ? 'oidc' : 'saml'); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${selectedTenant === t.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: t.branding.primaryColor }}>
                {t.logoPlaceholder}
              </div>
              {t.displayName.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SAML / OIDC Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setSsoType('saml')} className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${ssoType === 'saml' ? 'text-white' : 'text-gray-600 bg-gray-100'}`} style={ssoType === 'saml' ? { backgroundColor: '#1e4d6b' } : {}}>
              SAML 2.0
            </button>
            <button onClick={() => setSsoType('oidc')} className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${ssoType === 'oidc' ? 'text-white' : 'text-gray-600 bg-gray-100'}`} style={ssoType === 'oidc' ? { backgroundColor: '#1e4d6b' } : {}}>
              OIDC
            </button>
          </div>

          {ssoType === 'saml' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Metadata URL</label>
                <input type="text" readOnly value={tenant.ssoConfig.metadataUrl || ''} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Entity ID</label>
                <input type="text" readOnly value={tenant.ssoConfig.entityId} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">ACS URL (Assertion Consumer Service)</label>
                <input type="text" readOnly value={tenant.ssoConfig.acsUrl} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">X.509 Certificate</label>
                <textarea readOnly rows={3} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 font-mono" value={tenant.ssoConfig.enabled ? '-----BEGIN CERTIFICATE-----\nMIIDpzCCAo+gAwIBAgIGAXxxxxxxxxxxxxxx...\n-----END CERTIFICATE-----' : ''} />
              </div>

              {/* Attribute Mapping */}
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Attribute Mapping</label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-1.5 text-gray-600 font-medium">EvidLY Field</th>
                        <th className="text-left px-3 py-1.5 text-gray-600 font-medium">IdP Attribute</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(tenant.ssoConfig.attributeMapping).map(([k, v]) => (
                        <tr key={k} className="border-t border-gray-100">
                          <td className="px-3 py-1.5 text-gray-700">{k}</td>
                          <td className="px-3 py-1.5 text-gray-500 font-mono">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Discovery URL</label>
                <input type="text" readOnly value={tenant.ssoConfig.metadataUrl || ''} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Client ID</label>
                <input type="text" readOnly value={tenant.ssoConfig.entityId} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Redirect URI</label>
                <input type="text" readOnly value={tenant.ssoConfig.acsUrl} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Client Secret</label>
                <input type="password" readOnly value="●●●●●●●●●●●●●●●●" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button onClick={() => showToast('SSO test initiated — connection passed!')} className="px-4 py-2 rounded-lg text-white text-xs font-medium cursor-pointer min-h-[44px]" style={{ backgroundColor: '#1e4d6b' }}>
              Test Connection
            </button>
            <button onClick={() => showToast('SSO configuration saved')} className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer min-h-[44px]">
              Save Config
            </button>
          </div>
        </div>

        {/* SCIM Provisioning */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">SSO Status</h3>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              {tenant.ssoConfig.enabled ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="text-xs font-medium text-gray-900">
                  {tenant.ssoConfig.enabled ? `${tenant.ssoConfig.providerType.toUpperCase()} via ${tenant.ssoConfig.providerName}` : 'Not configured'}
                </p>
                <p className="text-[10px] text-gray-500">
                  {tenant.ssoConfig.lastTestAt ? `Last tested: ${formatTime(tenant.ssoConfig.lastTestAt)}` : 'No test run yet'}
                </p>
              </div>
              <div className="ml-auto">{statusBadge(tenant.ssoConfig.testStatus)}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">SCIM 2.0 Provisioning</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">SCIM Endpoint</label>
                <div className="flex items-center gap-2">
                  <input type="text" readOnly value={tenant.scimEndpoint} className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 font-mono" />
                  <button onClick={() => { navigator.clipboard.writeText(tenant.scimEndpoint); showToast('Copied!'); }} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <Copy className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Bearer Token</label>
                <div className="flex items-center gap-2">
                  <input type="password" readOnly value="●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●" className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 font-mono" />
                  <button onClick={() => showToast('Token regenerated — copy the new token before closing')} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: tenant.scimEnabled ? '#f0fdf4' : '#fef3c7' }}>
                {tenant.scimEnabled ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                <span className="text-xs font-medium" style={{ color: tenant.scimEnabled ? '#166534' : '#92400e' }}>
                  {tenant.scimEnabled ? 'SCIM provisioning active — syncing user lifecycle events' : 'SCIM not enabled — manual user management required'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── User Directory Tab ─────────────────────────────────────────
function UserDirectoryTab({ showToast }: { showToast: (msg: string) => void }) {
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let users = enterpriseUsers;
    if (tenantFilter !== 'all') users = users.filter(u => u.tenantId === tenantFilter);
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
    }
    return users;
  }, [tenantFilter, search]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={tenantFilter}
            onChange={e => setTenantFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white cursor-pointer"
          >
            <option value="all">All Tenants</option>
            {enterpriseTenants.map(t => (
              <option key={t.id} value={t.id}>{t.displayName.split(' ')[0]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => showToast('Provision user — coming soon')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer min-h-[44px]" style={{ backgroundColor: '#1e4d6b' }}>
            <UserPlus className="h-3.5 w-3.5" /> Provision
          </button>
          <button onClick={() => showToast('Export user list — coming soon')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer min-h-[44px]">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => showToast('SCIM sync triggered')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer min-h-[44px]">
            <RefreshCw className="h-3.5 w-3.5" /> Sync
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Tenant</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Location</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">SSO</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">SCIM</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{
                      backgroundColor: enterpriseTenants.find(t => t.id === u.tenantId)?.branding.primaryColor + '15',
                      color: enterpriseTenants.find(t => t.id === u.tenantId)?.branding.primaryColor,
                    }}>
                      {u.tenantName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{u.role}</td>
                  <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{u.location}</td>
                  <td className="px-4 py-2.5 text-center hidden sm:table-cell">{ssoStatusBadge(u.ssoStatus)}</td>
                  <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                    {u.scimManaged ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-700">
                        <RefreshCw className="h-2.5 w-2.5" /> SCIM
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">Manual</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{u.lastLogin ? formatTime(u.lastLogin) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-[10px] text-gray-500">{filtered.length} of {enterpriseUsers.length} users</p>
          <button onClick={() => showToast('Bulk actions — coming soon')} className="text-[10px] font-medium cursor-pointer" style={{ color: '#1e4d6b' }}>Bulk Actions</button>
        </div>
      </div>
    </div>
  );
}

// ── Branding & Theming Tab ─────────────────────────────────────
function BrandingTab({ showToast }: { showToast: (msg: string) => void }) {
  const [selectedTenant, setSelectedTenant] = useState('ent-pcdining');
  const tenant = enterpriseTenants.find(t => t.id === selectedTenant)!;
  const [colors, setColors] = useState({ ...tenant.branding });
  const [showPowered, setShowPowered] = useState(tenant.showPoweredBy);
  const [platformName, setPlatformName] = useState(tenant.branding.logoText);

  const handleTenantChange = (id: string) => {
    const t = enterpriseTenants.find(x => x.id === id)!;
    setSelectedTenant(id);
    setColors({ ...t.branding });
    setShowPowered(t.showPoweredBy);
    setPlatformName(t.branding.logoText);
  };

  return (
    <div className="space-y-4">
      {/* Tenant Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-gray-600">Tenant:</span>
        <div className="flex items-center gap-2 flex-wrap">
          {enterpriseTenants.map(t => (
            <button
              key={t.id}
              onClick={() => handleTenantChange(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${selectedTenant === t.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: t.branding.primaryColor }}>
                {t.logoPlaceholder}
              </div>
              {t.displayName.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Color Inputs */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Brand Colors</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'primaryColor' as const, label: 'Primary' },
              { key: 'secondaryColor' as const, label: 'Secondary' },
              { key: 'accentColor' as const, label: 'Accent' },
              { key: 'sidebarBg' as const, label: 'Sidebar BG' },
              { key: 'sidebarText' as const, label: 'Sidebar Text' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">{f.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[f.key]}
                    onChange={e => setColors({ ...colors, [f.key]: e.target.value })}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={colors[f.key]}
                    onChange={e => setColors({ ...colors, [f.key]: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg font-mono"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Platform Name</label>
              <input type="text" value={platformName} onChange={e => setPlatformName(e.target.value)} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Custom Domain</label>
              <input type="text" readOnly value={tenant.domain} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={showPowered} onChange={e => setShowPowered(e.target.checked)} className="rounded border-gray-300 cursor-pointer" id="powered-by" />
              <label htmlFor="powered-by" className="text-xs text-gray-600 cursor-pointer">Show "Powered by EvidLY" badge</label>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Logo Upload</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                <p className="text-[11px] text-gray-500">Drag logo here or click to upload</p>
                <p className="text-[10px] text-gray-400">SVG, PNG, or JPG — max 2MB</p>
              </div>
            </div>
          </div>

          <button onClick={() => showToast('Branding saved!')} className="mt-4 px-4 py-2 rounded-lg text-white text-xs font-medium cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>
            Save Branding
          </button>
        </div>

        {/* Live Preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Live Preview</h3>

          {/* Mini Sidebar + Content Preview */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex" style={{ height: 320 }}>
              {/* Mini Sidebar */}
              <div className="w-40 flex-shrink-0 p-3" style={{ backgroundColor: colors.sidebarBg }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.primaryColor }}>
                    <EvidlyIcon size={16} />
                  </div>
                  <span className="text-[10px] font-bold truncate" style={{ color: colors.sidebarText }}>{platformName}</span>
                </div>
                <div className="space-y-1">
                  {['Dashboard', 'Temp Logs', 'Checklists', 'Vendors', 'Reports'].map((item, i) => (
                    <div key={item} className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={i === 0 ? { backgroundColor: colors.primaryColor + '40' } : {}}>
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.sidebarText + '40' }} />
                      <span className="text-[10px]" style={{ color: i === 0 ? colors.sidebarText : colors.sidebarText + '99' }}>{item}</span>
                    </div>
                  ))}
                </div>
                {showPowered && (
                  <p className="text-[8px] mt-auto pt-6" style={{ color: colors.sidebarText + '66' }}>Powered by EvidLY</p>
                )}
              </div>

              {/* Mini Content */}
              <div className="flex-1 p-4 bg-gray-50">
                <div className="h-3 w-24 rounded mb-3" style={{ backgroundColor: colors.primaryColor }} />
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-2">
                      <div className="h-2 w-10 rounded mb-1" style={{ backgroundColor: colors.accentColor }} />
                      <div className="h-2 w-14 rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-2">
                  <div className="h-2 w-20 rounded mb-2" style={{ backgroundColor: colors.secondaryColor }} />
                  <div className="space-y-1">
                    {[1, 2, 3].map(i => <div key={i} className="h-1.5 rounded bg-gray-100" style={{ width: `${90 - i * 15}%` }} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mini Login Preview */}
          <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden p-6 text-center" style={{ backgroundColor: colors.sidebarBg }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: colors.primaryColor }}>
              <EvidlyIcon size={24} />
            </div>
            <p className="text-sm font-bold mb-3" style={{ color: colors.sidebarText }}>{platformName}</p>
            <div className="max-w-xs mx-auto space-y-2">
              <div className="h-8 rounded-xl bg-white/10 border" style={{ borderColor: colors.sidebarText + '33' }} />
              <div className="h-8 rounded-xl bg-white/10 border" style={{ borderColor: colors.sidebarText + '33' }} />
              <div className="h-8 rounded-lg" style={{ backgroundColor: colors.primaryColor }}>
                <span className="text-xs font-medium leading-8" style={{ color: colors.sidebarText }}>Sign In</span>
              </div>
            </div>
            {showPowered && (
              <p className="text-[9px] mt-4" style={{ color: colors.sidebarText + '55' }}>Powered by EvidLY</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reports & Templates Tab ────────────────────────────────────
function ReportsTab({ showToast }: { showToast: (msg: string) => void }) {
  const [selectedTemplate, setSelectedTemplate] = useState<EnterpriseReportTemplate | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderSections, setBuilderSections] = useState<string[]>(['Compliance Overview', 'Score Trends']);

  const typeColors: Record<string, string> = {
    executive_summary: 'bg-purple-50 text-purple-700 border-purple-200',
    regional_rollup: 'bg-blue-50 text-blue-700 border-blue-200',
    location_detail: 'bg-green-50 text-green-700 border-green-200',
    audit_package: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const availableSections = [
    'Compliance Overview', 'Score Trends', 'Risk Categories', 'Action Items',
    'Vendor Status', 'Temperature Analysis', 'Inspection Results', 'Corrective Actions',
    'Equipment Status', 'Certification Tracking', 'Financial Impact', 'Recommendations',
    'Regional Comparison', 'Employee Training', 'Regulatory Summary',
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Report Templates ({enterpriseReportTemplates.length})</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowBuilder(!showBuilder)} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${showBuilder ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {showBuilder ? 'Close Builder' : 'Custom Report Builder'}
          </button>
          <button onClick={() => showToast('Create template — coming soon')} className="px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>
            + New Template
          </button>
        </div>
      </div>

      {/* Custom Report Builder */}
      {showBuilder && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Custom Report Builder</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Available Sections (click to add)</p>
              <div className="flex flex-wrap gap-1.5">
                {availableSections.filter(s => !builderSections.includes(s)).map(s => (
                  <button key={s} onClick={() => setBuilderSections([...builderSections, s])} className="px-2.5 py-1 text-[11px] rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer">
                    + {s}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Report Name</label>
                  <input type="text" placeholder="Q1 2026 Custom Report" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Tenant</label>
                    <select className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg">
                      {enterpriseTenants.map(t => <option key={t.id}>{t.displayName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Export Format</label>
                    <select className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg">
                      <option>PDF</option><option>Excel</option><option>CSV</option><option>PowerPoint</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Schedule</label>
                    <select className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg">
                      <option>One-time</option><option>Weekly</option><option>Monthly</option><option>Quarterly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Email Distribution</label>
                    <input type="text" placeholder="team@company.com" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Report Sections (drag to reorder)</p>
              <div className="space-y-1.5 min-h-[120px] p-3 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                {builderSections.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-gray-200">
                    <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-gray-400 bg-gray-50">{i + 1}</span>
                    <span className="text-xs text-gray-700 flex-1">{s}</span>
                    <button onClick={() => setBuilderSections(builderSections.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 cursor-pointer">
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {builderSections.length === 0 && (
                  <p className="text-[11px] text-gray-400 text-center py-4">Click sections on the left to add them</p>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button onClick={() => showToast('Custom report generated!')} className="px-4 py-2 rounded-lg text-white text-xs font-medium cursor-pointer min-h-[44px]" style={{ backgroundColor: '#1e4d6b' }}>
                  Generate Report
                </button>
                <button onClick={() => showToast('Template saved!')} className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer min-h-[44px]">
                  Save as Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Template List */}
        <div className="lg:col-span-3 space-y-3">
          {enterpriseReportTemplates.map(t => {
            const tenantObj = enterpriseTenants.find(x => x.id === t.tenantId);
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t)}
                className={`w-full text-left bg-white rounded-xl border p-4 transition-colors cursor-pointer ${selectedTemplate?.id === t.id ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tenantObj?.branding.primaryColor + '15' }}>
                    <FileText className="h-5 w-5" style={{ color: tenantObj?.branding.primaryColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{t.name}</span>
                      {t.isDefault && <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500">Default</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${typeColors[t.templateType] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {t.templateType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      <span className="text-[10px] text-gray-400">{t.tenantName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {t.exportFormats.map(fmt => (
                      <span key={fmt} className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 text-gray-500 font-medium">{fmt}</span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          {selectedTemplate ? (
            <>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{selectedTemplate.name}</h3>
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${typeColors[selectedTemplate.templateType] || ''}`}>
                  {selectedTemplate.templateType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span className="text-[10px] text-gray-400">{selectedTemplate.tenantName}</span>
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Report Sections</h4>
                <div className="space-y-1.5">
                  {selectedTemplate.sections.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                      <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-gray-400 bg-white border border-gray-200">{i + 1}</span>
                      <span className="text-xs text-gray-700">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Options</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Brand watermark: {selectedTemplate.brandWatermark ? 'Enabled' : 'Disabled'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Download className="h-3.5 w-3.5 text-gray-400" />
                    Formats: {selectedTemplate.exportFormats.join(', ')}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    {selectedTemplate.isDefault ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-gray-300" />}
                    Default template: {selectedTemplate.isDefault ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => showToast(`Generating ${selectedTemplate.name}...`)} className="px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer min-h-[44px]" style={{ backgroundColor: '#1e4d6b' }}>
                  Generate Report
                </button>
                <button onClick={() => showToast('Edit template — coming soon')} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer min-h-[44px]">
                  Edit
                </button>
                <button onClick={() => showToast('Template duplicated')} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer min-h-[44px]">
                  Duplicate
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Select a template to preview</p>
              <p className="text-xs text-gray-400 mt-1">Click any template card on the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Integrations Tab ──────────────────────────────────────────
function IntegrationsTab({ showToast }: { showToast: (msg: string) => void }) {
  const [tenantFilter, setTenantFilter] = useState<string>('all');

  const filtered = tenantFilter === 'all'
    ? enterpriseIntegrations
    : enterpriseIntegrations.filter(i => i.tenantId === tenantFilter);

  const typeLabels: Record<string, string> = {
    temperature_monitoring: 'Temperature Monitoring',
    erp: 'ERP System',
    bi_tool: 'BI / Analytics',
    communication: 'Communication',
    existing_platform: 'Existing Platform',
  };

  const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: 'bg-green-50', text: 'text-green-700', dot: '#22c55e' },
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: '#f59e0b' },
    error: { bg: 'bg-red-50', text: 'text-red-700', dot: '#ef4444' },
    disabled: { bg: 'bg-gray-100', text: 'text-gray-500', dot: '#9ca3af' },
  };

  // Group by type
  const grouped = filtered.reduce((acc, i) => {
    const key = i.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(i);
    return acc;
  }, {} as Record<string, EnterpriseIntegration[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600">Tenant:</span>
          <select value={tenantFilter} onChange={e => setTenantFilter(e.target.value)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white cursor-pointer">
            <option value="all">All Tenants</option>
            {enterpriseTenants.map(t => <option key={t.id} value={t.id}>{t.displayName.split(' ')[0]}</option>)}
          </select>
        </div>
        <button onClick={() => showToast('Add integration — coming soon')} className="px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer min-h-[44px]" style={{ backgroundColor: '#1e4d6b' }}>
          + Add Integration
        </button>
      </div>

      {/* Integration summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active', count: filtered.filter(i => i.status === 'active').length, color: '#22c55e' },
          { label: 'Pending', count: filtered.filter(i => i.status === 'pending').length, color: '#f59e0b' },
          { label: 'Error', count: filtered.filter(i => i.status === 'error').length, color: '#ef4444' },
          { label: 'Data Points', count: filtered.reduce((s, i) => s + i.dataPoints, 0).toLocaleString(), color: '#1e4d6b' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-lg font-bold" style={{ color: s.color }}>{s.count}</p>
            <p className="text-[10px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Integration cards grouped by type */}
      {Object.entries(grouped).map(([type, integrations]) => (
        <div key={type}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{typeLabels[type] || type}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {integrations.map(intg => {
              const st = statusStyles[intg.status] || statusStyles.disabled;
              return (
                <div key={intg.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#1e4d6b' }}>
                      {intg.providerLogo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{intg.providerName}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${st.bg} ${st.text}`}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
                          {intg.status.charAt(0).toUpperCase() + intg.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{intg.tenantName} · {intg.syncFrequency}</p>
                      <p className="text-xs text-gray-600 mt-1">{intg.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        {intg.lastSync && (
                          <span className="text-[10px] text-gray-400">Last sync: {formatTime(intg.lastSync)}</span>
                        )}
                        {intg.dataPoints > 0 && (
                          <span className="text-[10px] text-gray-400">{intg.dataPoints.toLocaleString()} data points</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => showToast(`Configure ${intg.providerName} — coming soon`)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer flex-shrink-0">
                      <Settings className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Bulk Operations Tab ────────────────────────────────────────
function BulkOpsTab({ showToast }: { showToast: (msg: string) => void }) {
  const typeLabels: Record<string, string> = {
    location_import: 'Location Import',
    template_deploy: 'Template Deploy',
    vendor_assign: 'Vendor Assignment',
    user_provision: 'User Provisioning',
    compliance_action: 'Compliance Action',
  };

  const statusStyles: Record<string, string> = {
    completed: 'bg-green-50 text-green-700 border-green-200',
    running: 'bg-blue-50 text-blue-700 border-blue-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-gray-100 text-gray-500 border-gray-200',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Bulk Operations ({enterpriseBulkOps.length})</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'Import Locations', icon: Upload },
            { label: 'Deploy Templates', icon: FileText },
            { label: 'Assign Vendors', icon: Users },
            { label: 'Provision Users', icon: UserPlus },
          ].map(a => (
            <button key={a.label} onClick={() => showToast(`${a.label} — coming soon`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer min-h-[44px]">
              <a.icon className="h-3.5 w-3.5" />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Completed', count: enterpriseBulkOps.filter(o => o.status === 'completed').length, color: '#22c55e' },
          { label: 'Running', count: enterpriseBulkOps.filter(o => o.status === 'running').length, color: '#3b82f6' },
          { label: 'Pending', count: enterpriseBulkOps.filter(o => o.status === 'pending').length, color: '#9ca3af' },
          { label: 'Total Items', count: enterpriseBulkOps.reduce((s, o) => s + o.totalItems, 0).toLocaleString(), color: '#1e4d6b' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-lg font-bold" style={{ color: s.color }}>{s.count}</p>
            <p className="text-[10px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Operations list */}
      <div className="space-y-3">
        {enterpriseBulkOps.map(op => {
          const pct = op.totalItems > 0 ? Math.round((op.processedItems / op.totalItems) * 100) : 0;
          return (
            <div key={op.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{op.description}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${statusStyles[op.status]}`}>
                      {op.status.charAt(0).toUpperCase() + op.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-2">
                    <span>{typeLabels[op.type]}</span>
                    <span>{op.tenantName}</span>
                    <span>By {op.initiatedBy}</span>
                    {op.startedAt && <span>{formatTime(op.startedAt)}</span>}
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: op.status === 'failed' ? '#ef4444' : op.status === 'completed' ? '#22c55e' : '#3b82f6',
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-12 text-right">{pct}%</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-[10px] text-gray-500">{op.processedItems.toLocaleString()} / {op.totalItems.toLocaleString()} processed</span>
                    {op.failedItems > 0 && (
                      <span className="text-[10px] text-red-500">{op.failedItems} failed</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {op.status === 'running' && (
                    <button onClick={() => showToast('Operation paused')} className="px-2.5 py-1 rounded-lg border border-gray-200 text-[10px] font-medium text-gray-500 hover:bg-gray-50 cursor-pointer">
                      Pause
                    </button>
                  )}
                  {op.status === 'pending' && (
                    <button onClick={() => showToast('Operation started')} className="px-2.5 py-1 rounded-lg text-white text-[10px] font-medium cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>
                      Start
                    </button>
                  )}
                  <button onClick={() => showToast('Operation details')} className="px-2.5 py-1 rounded-lg border border-gray-200 text-[10px] font-medium text-gray-500 hover:bg-gray-50 cursor-pointer">
                    Details
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Onboarding Tab ─────────────────────────────────────────────
function OnboardingTab({ showToast }: { showToast: (msg: string) => void }) {
  const [selectedTenant, setSelectedTenant] = useState('ent-pcdining');
  const phases = selectedTenant === 'ent-pcdining' ? enterpriseOnboardingPCDining
    : selectedTenant === 'ent-sodexo' ? enterpriseOnboardingSodexo
    : enterpriseOnboardingPCDining; // Compass uses Pacific Coast Dining-like completed phases

  const phaseStatusColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    completed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: '#22c55e' },
    in_progress: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: '#3b82f6' },
    upcoming: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', dot: '#9ca3af' },
  };

  const overallProgress = Math.round(phases.reduce((s, p) => s + p.progress, 0) / phases.length);

  return (
    <div className="space-y-4">
      {/* Tenant selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-gray-600">Tenant:</span>
        <div className="flex items-center gap-2 flex-wrap">
          {enterpriseTenants.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTenant(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${selectedTenant === t.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: t.branding.primaryColor }}>
                {t.logoPlaceholder}
              </div>
              {t.displayName.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Enterprise Onboarding — 60-90 Day Implementation</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">{enterpriseTenants.find(t => t.id === selectedTenant)?.displayName}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: '#1e4d6b' }}>{overallProgress}%</p>
            <p className="text-[10px] text-gray-400">Overall Progress</p>
          </div>
        </div>
        {/* Phase timeline */}
        <div className="flex items-center gap-0 mb-6">
          {phases.map((p, i) => {
            const st = phaseStatusColors[p.status];
            return (
              <div key={p.id} className="flex-1 flex items-center">
                <div className={`flex-1 h-2 rounded-full ${i === 0 ? 'rounded-l-full' : ''} ${i === phases.length - 1 ? 'rounded-r-full' : ''}`} style={{ backgroundColor: '#e5e7eb' }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${p.progress}%`,
                      backgroundColor: st.dot,
                    }}
                  />
                </div>
                {i < phases.length - 1 && <div className="w-1" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {phases.map(p => {
          const st = phaseStatusColors[p.status];
          const doneTasks = p.tasks.filter(t => t.done).length;
          return (
            <div key={p.id} className={`bg-white rounded-xl border ${st.border} p-4 sm:p-5`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: st.dot }}>
                  {p.phase}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-900">{p.name}</h4>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${st.bg} ${st.text}`}>
                      {p.status === 'in_progress' ? 'In Progress' : p.status === 'completed' ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">{p.duration}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: st.dot }}>{p.progress}%</p>
                  <p className="text-[10px] text-gray-400">{doneTasks}/{p.tasks.length} tasks</p>
                </div>
              </div>
              {/* Task list */}
              <div className="space-y-1.5">
                {p.tasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg">
                    {task.done ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    ) : p.status === 'upcoming' ? (
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 flex-shrink-0" />
                    )}
                    <span className={`text-xs ${task.done ? 'text-gray-500 line-through' : 'text-gray-700'}`}>{task.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pricing tiers */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Enterprise Pricing Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {enterprisePricingTiers.map(tier => (
            <div key={tier.name} className={`rounded-xl border p-4 sm:p-5 ${tier.highlighted ? 'border-2 shadow-sm' : 'border-gray-200'}`} style={tier.highlighted ? { borderColor: '#1e4d6b' } : {}}>
              {tier.highlighted && (
                <span className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-semibold rounded-full text-white mb-3" style={{ backgroundColor: '#1e4d6b' }}>
                  Most Popular
                </span>
              )}
              <h4 className="text-lg font-bold text-gray-900">{tier.name}</h4>
              <p className="text-2xl font-bold mt-1" style={{ color: '#1e4d6b' }}>{tier.priceLabel}</p>
              <div className="mt-4 space-y-2">
                {tier.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-600">{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => showToast(`Contact sales for ${tier.name} tier`)} className="w-full mt-4 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer" style={tier.highlighted ? { backgroundColor: '#1e4d6b', color: 'white' } : { border: '1px solid #e5e7eb', color: '#374151' }}>
                {tier.highlighted ? 'Contact Sales' : 'Learn More'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export function EnterpriseDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  return (
    <div className="min-h-screen bg-[#faf8f3]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Toast */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, backgroundColor: '#065f46', color: 'white', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'DM Sans', sans-serif" }}>
          <CheckCircle2 className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1e4d6b' }}>
              <EvidlyIcon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-gray-900">Evid</span>
                <span className="text-lg font-bold" style={{ color: '#d4af37' }}>LY</span>
                <span className="text-xs font-medium text-gray-400 ml-1">Enterprise Admin</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Exit Admin
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto -mb-px">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={activeTab === tab.id ? { borderBottomColor: '#1e4d6b' } : {}}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && <OverviewTab showToast={showToast} />}
        {activeTab === 'tenants' && <TenantManagementTab showToast={showToast} />}
        {activeTab === 'hierarchy' && <HierarchyTab showToast={showToast} />}
        {activeTab === 'sso' && <SSOTab showToast={showToast} />}
        {activeTab === 'users' && <UserDirectoryTab showToast={showToast} />}
        {activeTab === 'branding' && <BrandingTab showToast={showToast} />}
        {activeTab === 'reports' && <ReportsTab showToast={showToast} />}
        {activeTab === 'integrations' && <IntegrationsTab showToast={showToast} />}
        {activeTab === 'bulk_ops' && <BulkOpsTab showToast={showToast} />}
        {activeTab === 'onboarding' && <OnboardingTab showToast={showToast} />}
      </div>
    </div>
  );
}

export default EnterpriseDashboard;
