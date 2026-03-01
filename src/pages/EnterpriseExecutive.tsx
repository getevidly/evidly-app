import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// TODO: Replace .overall with independent pillar scores (FIX-WEIGHTS)
import {
  TrendingUp, TrendingDown, MapPin, CheckCircle, AlertTriangle,
  ArrowUp, ArrowDown, Minus, ChevronRight, ExternalLink, X, Loader2, CheckCircle2,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import {
  enterpriseTenant, dataPointsThisMonth,
  businessUnitScorecard, businessUnitTrends, regulatoryOverlays, predictedScores,
  BU_LINE_COLORS, BU_LINE_LABELS,
  enterpriseHierarchy, enterpriseTrendData,
  getEnterpriseAlerts, findNodeById, getAncestorPath, getScoreByCategory, collectNodeCodes,
  type EnterpriseHierarchyNode, type ComplianceCategory,
} from '../data/enterpriseExecutiveData';

// ── Helpers ──────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 90) return '#22c55e';
  if (s >= 80) return '#d4af37';
  if (s >= 70) return '#f59e0b';
  return '#ef4444';
}

function scoreBg(s: number) {
  if (s >= 90) return '#dcfce7';
  if (s >= 80) return '#fef9c3';
  if (s >= 70) return '#fed7aa';
  return '#fecaca';
}

function scoreBorder(s: number) {
  if (s >= 90) return '#bbf7d0';
  if (s >= 80) return '#fde68a';
  if (s >= 70) return '#fdba74';
  return '#fca5a5';
}

function formatTime(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Deterministic pseudo-random trend from node id
function nodeTrend(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return ((h % 31) - 12) / 10;
}

// ── Inline Components ────────────────────────────────────────────

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

function TrendBadge({ value }: { value: number }) {
  if (Math.abs(value) < 0.2) return <span className="inline-flex items-center gap-0.5 text-xs text-gray-400"><Minus className="h-3 w-3" /> 0.0</span>;
  if (value > 0) return <span className="inline-flex items-center gap-0.5 text-xs text-green-600 font-semibold"><ArrowUp className="h-3 w-3" /> +{value.toFixed(1)}</span>;
  return <span className="inline-flex items-center gap-0.5 text-xs text-red-500 font-semibold"><ArrowDown className="h-3 w-3" /> {value.toFixed(1)}</span>;
}

// ── Main Page ────────────────────────────────────────────────────

export function EnterpriseExecutive() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const tenant = enterpriseTenant;
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // State
  const [drillDownNodeId, setDrillDownNodeId] = useState<string | null>(null);
  const [selectedTrendUnits, setSelectedTrendUnits] = useState<string[]>(['overall']);

  // Derived data
  const activeNode = useMemo(() => {
    if (!drillDownNodeId) return enterpriseHierarchy;
    return findNodeById(enterpriseHierarchy, drillDownNodeId) || enterpriseHierarchy;
  }, [drillDownNodeId]);

  const breadcrumb = useMemo(() => {
    if (!drillDownNodeId) return [];
    return getAncestorPath(drillDownNodeId);
  }, [drillDownNodeId]);

  const alerts = useMemo(() => {
    const all = getEnterpriseAlerts();
    if (!drillDownNodeId) return all;
    const codes = collectNodeCodes(activeNode);
    return all.filter(a => codes.has(a.nodeCode));
  }, [drillDownNodeId, activeNode]);


  // Trend data: latest, previous, 3 months ago
  const latestTrend = enterpriseTrendData[enterpriseTrendData.length - 1];
  const prevTrend = enterpriseTrendData[enterpriseTrendData.length - 2];
  const threeMonthAgo = enterpriseTrendData[enterpriseTrendData.length - 4];
  const trendDelta = +(latestTrend.overall - prevTrend.overall).toFixed(1);
  const trend3mDelta = +(latestTrend.overall - threeMonthAgo.overall).toFixed(1);

  // Location breakdown
  const totalLocations = drillDownNodeId ? activeNode.locationCount : tenant.stats.totalLocations;
  const locationsCompliant = Math.round(totalLocations * 0.82);
  const locationsAtRisk = Math.round(totalLocations * 0.14);
  const locationsCritical = totalLocations - locationsCompliant - locationsAtRisk;
  const overallScore = drillDownNodeId ? activeNode.complianceScore : tenant.stats.avgComplianceScore;

  // Scorecard rows — BU scorecard at root, or node children when drilled
  const scorecardRows = useMemo(() => {
    if (!drillDownNodeId) return businessUnitScorecard;
    const children = activeNode.children || [];
    return children.map(c => ({
      id: c.id,
      name: c.name,
      locationCount: c.locationCount,
      avgScore: c.complianceScore,
      trend: nodeTrend(c.id),
      worstLocation: findWorstInSubtree(c),
      criticalItems: countCriticalBelow(c, 75),
      foodSafety: c.foodSafety,
      facilitySafety: c.facilitySafety,
    }));
  }, [drillDownNodeId, activeNode]);

  // Trend chart data with prediction
  const trendChartData = useMemo(() => {
    const base = businessUnitTrends.map(d => ({ ...d }));
    // Add 2 prediction points
    const last = base[base.length - 1];
    const overallPred = predictedScores.reduce((s, p) => s + p.predictedNextQuarter, 0) / predictedScores.length;
    base.push({
      month: 'Mar 26',
      overall: +(overallPred * 0.5 + last.overall * 0.5).toFixed(1),
      higherEd: +(91.2 * 0.5 + 92.8 * 0.5).toFixed(1),
      healthcare: +(94.7 * 0.5 + 95.1 * 0.5).toFixed(1),
      destinations: +(88.4 * 0.5 + 89.6 * 0.5).toFixed(1),
      corrections: +(86.1 * 0.5 + 88.5 * 0.5).toFixed(1),
      sports: +(88.0 * 0.5 + 89.2 * 0.5).toFixed(1),
    });
    base.push({
      month: 'Apr 26',
      overall: +overallPred.toFixed(1),
      higherEd: 92.8,
      healthcare: 95.1,
      destinations: 89.6,
      corrections: 88.5,
      sports: 89.2,
    });
    return base;
  }, []);

  function toggleTrendUnit(key: string) {
    setSelectedTrendUnits(prev => {
      if (key === 'overall') return prev; // always shown
      return prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
    });
  }

  function handleDrill(nodeId: string) {
    const node = findNodeById(enterpriseHierarchy, nodeId);
    if (node && node.children && node.children.length > 0) {
      setDrillDownNodeId(nodeId);
    } else {
      showToast(`View ${node?.name || 'location'} (Demo)`);
    }
  }

  const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa', ...F }}>
      {/* Toast */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, backgroundColor: '#065f46', color: 'white', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px', ...F }}>
          <CheckCircle2 className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

      {/* ── A. Enterprise Branded Header ────────────────────────── */}
      <header className="px-4 sm:px-6 py-3" style={{ backgroundColor: tenant.branding.secondaryColor }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: tenant.branding.primaryColor }}>
              {tenant.logoPlaceholder}
            </div>
            <div>
              <h1 className="text-white font-bold text-base">{tenant.branding.logoText}</h1>
              <p className="text-white/60 text-[10px]">Enterprise Compliance Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-white text-xs font-medium">Jennifer Martinez</p>
              <p className="text-white/60 text-[10px]">VP Operations</p>
            </div>
            <button
              onClick={() => navigate('/enterprise/admin')}
              className="flex items-center gap-1 text-white/70 hover:text-white text-[11px] transition-colors cursor-pointer"
            >
              Admin Portal <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── B. Drill-Down Breadcrumb ──────────────────────── */}
        {drillDownNodeId && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-100 flex-wrap">
            <button onClick={() => setDrillDownNodeId(null)} className="text-gray-400 hover:text-gray-700 font-medium cursor-pointer">Corporate</button>
            {breadcrumb.slice(1).map((node, i) => (
              <span key={node.id} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-gray-300" />
                <button
                  onClick={() => i < breadcrumb.length - 2 ? setDrillDownNodeId(node.id) : undefined}
                  className={`font-medium cursor-pointer ${i === breadcrumb.length - 2 ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {node.name}
                </button>
              </span>
            ))}
            <button onClick={() => setDrillDownNodeId(null)} className="ml-auto flex items-center gap-1 text-gray-400 hover:text-red-500 cursor-pointer">
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
        )}

        {/* ── C. Executive Summary Panel ────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <EvidlyIcon size={20} />
            <h2 className="text-base font-bold text-gray-900">Executive Summary</h2>
            <span className="text-[10px] text-gray-400 ml-auto">Powered by {dataPointsThisMonth.toLocaleString()} compliance data points this month</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Overall Score', value: overallScore + '%', icon: EvidlyIcon as any, highlight: true },
              { label: 'vs Last Mo', value: (trendDelta >= 0 ? '+' : '') + trendDelta + '%', icon: trendDelta >= 0 ? TrendingUp : TrendingDown },
              { label: 'vs 3Mo Ago', value: (trend3mDelta >= 0 ? '+' : '') + trend3mDelta + '%', icon: trend3mDelta >= 0 ? TrendingUp : TrendingDown },
              { label: 'Locations', value: `${totalLocations.toLocaleString()} total`, icon: MapPin },
              { label: 'Compliant', value: `${locationsCompliant.toLocaleString()} (80+)`, icon: CheckCircle, highlight: true },
              { label: 'At Risk', value: `${locationsAtRisk} (60-79)`, icon: AlertTriangle },
              { label: 'Critical', value: `${locationsCritical} (<60)`, icon: AlertTriangle, alert: locationsCritical > 0 },
              { label: 'Alerts', value: String(alerts.filter(a => !a.acknowledged).length), icon: AlertTriangle, alert: alerts.filter(a => !a.acknowledged && a.severity === 'critical').length > 0 },
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
          <div className="flex items-center gap-4 sm:gap-6 mt-4 pt-3 border-t border-gray-100 flex-wrap">
            <div className="flex items-center gap-2">
              <ScoreCircle score={overallScore} size={52} />
              <div>
                <p className="text-xs font-semibold text-gray-900">{drillDownNodeId ? activeNode.name : 'EvidLY Demo Org'}</p>
                <p className="text-[10px] text-gray-500">Organization Score</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm font-bold" style={{ color: scoreColor(drillDownNodeId ? activeNode.foodSafety : latestTrend.foodSafety) }}>
                  {drillDownNodeId ? activeNode.foodSafety : latestTrend.foodSafety}%
                </p>
                <p className="text-[10px] text-gray-400">Food Safety</p>
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: scoreColor(drillDownNodeId ? activeNode.facilitySafety : latestTrend.facilitySafety) }}>
                  {drillDownNodeId ? activeNode.facilitySafety : latestTrend.facilitySafety}%
                </p>
                <p className="text-[10px] text-gray-400">Facility Safety</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── D. Critical Alerts ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Critical Alerts */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Critical Alerts</h3>
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
                {alerts.filter(a => !a.acknowledged).length} active
              </span>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {alerts.filter(a => !a.acknowledged).map(a => (
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
              {alerts.filter(a => !a.acknowledged).length === 0 && (
                <p className="text-center text-xs text-gray-400 py-6">No active alerts</p>
              )}
            </div>
          </div>
        </div>

        {/* ── E. Hierarchy Scorecard Table ──────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {drillDownNodeId ? `${activeNode.name} — Scorecard` : 'Organization Scorecard — EvidLY Demo Org'}
            </h3>
            {drillDownNodeId && (
              <button onClick={() => setDrillDownNodeId(null)} className="text-[11px] text-gray-500 hover:text-gray-700 cursor-pointer">
                View All Business Units
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">{drillDownNodeId ? 'Unit' : 'Business Unit'}</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Locations</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Avg Score</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Trend</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">Worst Location</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">Action</th>
                </tr>
              </thead>
              <tbody>
                {scorecardRows.map(row => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => handleDrill(row.id)}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: scoreColor(row.avgScore) }} />
                        <span className="font-medium text-gray-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{row.locationCount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="font-bold" style={{ color: scoreColor(row.avgScore) }}>{row.avgScore}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-center"><TrendBadge value={row.trend} /></td>
                    <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell">
                      {row.worstLocation && row.worstLocation.score < 80
                        ? `${row.worstLocation.name} (${row.worstLocation.score})`
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                      {row.criticalItems > 0 ? (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-50 text-red-700 border border-red-200">{row.criticalItems} critical</span>
                      ) : row.avgScore < 89 ? (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">Review</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-50 text-green-700 border border-green-200">On Track</span>
                      )}
                    </td>
                  </tr>
                ))}
                {/* Corporate total footer */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-3 py-2.5 text-gray-900">{drillDownNodeId ? activeNode.name + ' Total' : 'Corporate Total'}</td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{totalLocations.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-bold" style={{ color: scoreColor(overallScore) }}>{overallScore}%</span>
                  </td>
                  <td className="px-3 py-2.5 text-center"><TrendBadge value={trendDelta} /></td>
                  <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell">—</td>
                  <td className="px-3 py-2.5 hidden sm:table-cell" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── F. Trend Analytics ────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-900">12-Month Compliance Trend</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                Predict Q2: {(predictedScores.reduce((s, p) => s + p.predictedNextQuarter, 0) / predictedScores.length).toFixed(1)}%
              </span>
              <span className="text-[10px] text-gray-400">
                ({predictedScores.every(p => p.confidence === 'high') ? 'high' : 'medium'} confidence)
              </span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mb-4">
            {drillDownNodeId ? activeNode.name : 'EvidLY Demo Org'} — Toggle business units to compare
            {regulatoryOverlays.length > 0 && ' · Dashed lines = regulatory changes'}
          </p>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendChartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {/* Regulatory overlays */}
              {regulatoryOverlays.map(r => (
                <ReferenceLine
                  key={r.label}
                  x={r.month}
                  stroke={r.color}
                  strokeDasharray="4 2"
                  strokeWidth={1.5}
                  label={{ value: r.label, position: 'top', style: { fontSize: 9, fill: r.color, fontWeight: 600 } }}
                />
              ))}
              {/* Overall line — always shown */}
              <Line type="monotone" dataKey="overall" name="Overall" stroke={BU_LINE_COLORS.overall} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              {/* BU lines — togglable */}
              {selectedTrendUnits.includes('higherEd') && (
                <Line type="monotone" dataKey="higherEd" name="Higher Ed" stroke={BU_LINE_COLORS.higherEd} strokeWidth={1.5} dot={false} />
              )}
              {selectedTrendUnits.includes('healthcare') && (
                <Line type="monotone" dataKey="healthcare" name="Healthcare" stroke={BU_LINE_COLORS.healthcare} strokeWidth={1.5} dot={false} />
              )}
              {selectedTrendUnits.includes('destinations') && (
                <Line type="monotone" dataKey="destinations" name="Destinations" stroke={BU_LINE_COLORS.destinations} strokeWidth={1.5} dot={false} />
              )}
              {selectedTrendUnits.includes('corrections') && (
                <Line type="monotone" dataKey="corrections" name="Corrections" stroke={BU_LINE_COLORS.corrections} strokeWidth={1.5} dot={false} />
              )}
              {selectedTrendUnits.includes('sports') && (
                <Line type="monotone" dataKey="sports" name="Sports & Ent." stroke={BU_LINE_COLORS.sports} strokeWidth={1.5} dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>

          {/* BU Toggle checkboxes */}
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100">
            <span className="text-[10px] text-gray-400 font-medium">Compare:</span>
            {Object.entries(BU_LINE_LABELS).filter(([k]) => k !== 'overall').map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTrendUnits.includes(key)}
                  onChange={() => toggleTrendUnit(key)}
                  className="w-3 h-3 rounded"
                  style={{ accentColor: BU_LINE_COLORS[key] }}
                />
                <span className="text-[10px] text-gray-600">{label}</span>
                <div className="w-3 h-0.5 rounded" style={{ backgroundColor: BU_LINE_COLORS[key] }} />
              </label>
            ))}
          </div>

          {/* Regulatory events legend */}
          {regulatoryOverlays.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <span className="text-[10px] text-gray-400 font-medium">Regulatory:</span>
              {regulatoryOverlays.map(r => (
                <div key={r.label} className="flex items-center gap-1.5" title={r.description}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="text-[10px] text-gray-500">{r.month}: {r.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Predicted scores table */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <h4 className="text-[11px] font-semibold text-gray-700 mb-2">Next Quarter Predictions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
              {predictedScores.map(p => (
                <div key={p.businessUnit} className="rounded-lg border border-gray-100 p-2 bg-gray-50">
                  <p className="text-[10px] text-gray-500 truncate">{p.businessUnit}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold" style={{ color: scoreColor(p.predictedNextQuarter) }}>
                      {p.predictedNextQuarter}%
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${p.confidence === 'high' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                      {p.confidence}
                    </span>
                  </div>
                  <TrendBadge value={+(p.predictedNextQuarter - p.currentScore).toFixed(1)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── G. Powered By Footer ──────────────────────────── */}
      {tenant.showPoweredBy && (
        <footer className="text-center py-4 border-t border-gray-100 bg-white mt-6">
          <p className="text-xs text-gray-400">
            {tenant.poweredByText.replace('EvidLY', '').trim()}{' '}
            <span style={{ color: '#d4af37', fontWeight: 600 }}>EvidLY</span>
          </p>
          <p className="text-[10px] text-gray-300 mt-0.5">
            compliance.cleaningprosplus.com — EvidLY Demo Org
          </p>
        </footer>
      )}
    </div>
  );
}

// ── Tree utility helpers ─────────────────────────────────────────

function findWorstInSubtree(node: EnterpriseHierarchyNode): { name: string; score: number } | null {
  if (node.level === 'location') return { name: node.name, score: node.complianceScore };
  if (!node.children || node.children.length === 0) return null;
  let worst: { name: string; score: number } | null = null;
  for (const child of node.children) {
    const w = findWorstInSubtree(child);
    if (w && (!worst || w.score < worst.score)) worst = w;
  }
  return worst;
}

function countCriticalBelow(node: EnterpriseHierarchyNode, threshold: number): number {
  if (!node.children) return 0;
  let count = 0;
  for (const child of node.children) {
    if (child.complianceScore < threshold) count++;
    if (child.children) count += countCriticalBelow(child, threshold);
  }
  return count;
}
