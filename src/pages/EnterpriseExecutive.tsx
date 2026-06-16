// P0-PURGE: No manufactured score rollups — counts/distribution only
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, CheckCircle, AlertTriangle,
  ChevronRight, ExternalLink, X, CheckCircle2,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import {
  enterpriseTenant, dataPointsThisMonth,
  enterpriseHierarchy,
  getEnterpriseAlerts, findNodeById, getAncestorPath, collectNodeCodes,
  type EnterpriseHierarchyNode,
} from '../data/enterpriseExecutiveData';

// ── Helpers ──────────────────────────────────────────────────────

function formatTime(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ── Demo data: counts/distribution, NOT scores ──────────────────
// "passing" = jurisdiction pass_fail === 'pass' AND zero open violations AND zero overdue-cadence items
// "at-risk" = jurisdiction pass_fail !== 'pass' OR any open violations OR any overdue fire/food cadence
interface BUStatusRow {
  id: string;
  name: string;
  locationCount: number;
  passing: number;
  atRisk: number;
  openViolations: number;
  foodOverdue: number;
  fireOverdue: number;
}

const DEMO_BU_STATUS: BUStatusRow[] = [
  { id: 'h-higher-ed', name: 'Higher Education', locationCount: 847, passing: 694, atRisk: 153, openViolations: 12, foodOverdue: 5, fireOverdue: 8 },
  { id: 'h-healthcare', name: 'Healthcare', locationCount: 312, passing: 289, atRisk: 23, openViolations: 3, foodOverdue: 1, fireOverdue: 2 },
  { id: 'h-destinations', name: 'Destinations', locationCount: 89, passing: 68, atRisk: 21, openViolations: 7, foodOverdue: 4, fireOverdue: 6 },
  { id: 'h-corrections', name: 'Corrections', locationCount: 156, passing: 118, atRisk: 38, openViolations: 9, foodOverdue: 3, fireOverdue: 11 },
  { id: 'h-sports', name: 'Sports & Entertainment', locationCount: 443, passing: 361, atRisk: 82, openViolations: 14, foodOverdue: 6, fireOverdue: 9 },
];

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

  // Totals from demo status data (counts, not scores)
  const buRows = DEMO_BU_STATUS;
  const totalLocations = buRows.reduce((s, r) => s + r.locationCount, 0);
  const totalPassing = buRows.reduce((s, r) => s + r.passing, 0);
  const totalAtRisk = buRows.reduce((s, r) => s + r.atRisk, 0);
  const totalOpenViolations = buRows.reduce((s, r) => s + r.openViolations, 0);
  const totalFireOverdue = buRows.reduce((s, r) => s + r.fireOverdue, 0);
  const totalFoodOverdue = buRows.reduce((s, r) => s + r.foodOverdue, 0);

  function handleDrill(nodeId: string) {
    const node = findNodeById(enterpriseHierarchy, nodeId);
    if (node && node.children && node.children.length > 0) {
      setDrillDownNodeId(nodeId);
    } else {
      showToast(`View ${node?.name || 'location'}`);
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
              <p className="text-white/60 text-xs">Enterprise Compliance Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-white text-xs font-medium">Jennifer Martinez</p>
              <p className="text-white/60 text-xs">VP Operations</p>
            </div>
            <button
              onClick={() => navigate('/enterprise/admin')}
              className="flex items-center gap-1 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
            >
              Admin Portal <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── B. Drill-Down Breadcrumb ──────────────────────── */}
        {drillDownNodeId && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs bg-white rounded-xl px-4 py-2 border border-[#1E2D4D]/5 flex-wrap">
            <button onClick={() => setDrillDownNodeId(null)} className="text-[#1E2D4D]/30 hover:text-[#1E2D4D]/80 font-medium cursor-pointer">Corporate</button>
            {breadcrumb.slice(1).map((node, i) => (
              <span key={node.id} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-[#1E2D4D]/30" />
                <button
                  onClick={() => i < breadcrumb.length - 2 ? setDrillDownNodeId(node.id) : undefined}
                  className={`font-medium cursor-pointer ${i === breadcrumb.length - 2 ? 'text-[#1E2D4D]' : 'text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80'}`}
                >
                  {node.name}
                </button>
              </span>
            ))}
            <button onClick={() => setDrillDownNodeId(null)} className="ml-auto flex items-center gap-1 text-[#1E2D4D]/30 hover:text-red-500 cursor-pointer">
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
        )}

        {/* ── C. Executive Summary — Counts/Distribution Only ──── */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <EvidlyIcon size={20} />
            <h2 className="text-base font-bold text-[#1E2D4D]">Executive Summary</h2>
            <span className="text-xs text-[#1E2D4D]/30 ml-auto">Powered by {dataPointsThisMonth.toLocaleString()} compliance data points this month</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Locations', value: totalLocations.toLocaleString(), icon: MapPin, highlight: true },
              { label: 'Passing', value: totalPassing.toLocaleString(), icon: CheckCircle, highlight: true },
              { label: 'At Risk', value: totalAtRisk.toLocaleString(), icon: AlertTriangle, alert: totalAtRisk > 0 },
              { label: 'Open Violations', value: String(totalOpenViolations), icon: AlertTriangle, alert: totalOpenViolations > 0 },
              { label: 'Food Cadence Overdue', value: String(totalFoodOverdue), icon: AlertTriangle, alert: totalFoodOverdue > 0 },
              { label: 'Fire Cadence Overdue', value: String(totalFireOverdue), icon: AlertTriangle, alert: totalFireOverdue > 0 },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border p-3 text-center ${(s as any).alert ? 'border-red-200 bg-red-50' : (s as any).highlight ? 'border-blue-200 bg-blue-50/50' : 'border-[#1E2D4D]/10 bg-[#FAF7F0]'}`}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <s.icon className="h-3.5 w-3.5" style={{ color: (s as any).alert ? '#ef4444' : '#1E2D4D' }} />
                  <span className="text-xs text-[#1E2D4D]/50">{s.label}</span>
                </div>
                <p className={`text-lg font-bold ${(s as any).alert ? 'text-red-600' : 'text-[#1E2D4D]'}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#1E2D4D]/30 mt-3 pt-2 border-t border-[#1E2D4D]/5">
            Passing = jurisdiction pass/fail is "pass" with zero open violations and zero overdue cadence items.
            At Risk = jurisdiction fail, open violations, or overdue fire/food cadence.
          </p>
        </div>

        {/* ── D. Critical Alerts ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#1E2D4D]">Critical Alerts</h3>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
                {alerts.filter(a => !a.acknowledged).length} active
              </span>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {alerts.filter(a => !a.acknowledged).map(a => (
                <div key={a.id} className={`p-3 rounded-xl border ${a.severity === 'critical' ? 'border-red-200 bg-red-50/50' : a.severity === 'warning' ? 'border-amber-200 bg-amber-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${a.severity === 'critical' ? 'text-red-500' : a.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-xs font-semibold ${a.severity === 'critical' ? 'text-red-700' : a.severity === 'warning' ? 'text-amber-700' : 'text-blue-700'}`}>
                          {a.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-[#1E2D4D]/30">{a.category}</span>
                      </div>
                      <p className="text-xs text-[#1E2D4D]/80">{a.message}</p>
                      <p className="text-xs text-[#1E2D4D]/30 mt-1">{a.nodeName} ({a.nodeCode}) · {formatTime(a.detectedAt)}</p>
                    </div>
                    <button onClick={() => showToast('Alert acknowledged')} className="text-xs font-medium px-2 py-0.5 rounded border border-[#1E2D4D]/10 hover:bg-white cursor-pointer text-[#1E2D4D]/50">
                      Ack
                    </button>
                  </div>
                </div>
              ))}
              {alerts.filter(a => !a.acknowledged).length === 0 && (
                <p className="text-center text-xs text-[#1E2D4D]/30 py-6">No active alerts</p>
              )}
            </div>
          </div>
        </div>

        {/* ── E. Business Unit Status Table — Counts, Not Scores ──── */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-[#1E2D4D]">
              {drillDownNodeId ? `${activeNode.name} — Status` : 'Organization Status — EvidLY Demo Org'}
            </h3>
            {drillDownNodeId && (
              <button onClick={() => setDrillDownNodeId(null)} className="text-xs text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80 cursor-pointer">
                View All Business Units
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#FAF7F0] border-b border-[#1E2D4D]/10">
                  <th className="text-left px-3 py-2 font-medium text-[#1E2D4D]/70">Business Unit</th>
                  <th className="text-center px-3 py-2 font-medium text-[#1E2D4D]/70">Locations</th>
                  <th className="text-center px-3 py-2 font-medium text-[#1E2D4D]/70">Passing</th>
                  <th className="text-center px-3 py-2 font-medium text-[#1E2D4D]/70">At Risk</th>
                  <th className="text-center px-3 py-2 font-medium text-[#1E2D4D]/70">Open Violations</th>
                  <th className="text-center px-3 py-2 font-medium text-[#1E2D4D]/70 hidden sm:table-cell">Food Overdue</th>
                  <th className="text-center px-3 py-2 font-medium text-[#1E2D4D]/70 hidden sm:table-cell">Fire Overdue</th>
                </tr>
              </thead>
              <tbody>
                {buRows.map(row => (
                  <tr key={row.id} className="border-b border-[#1E2D4D]/5 hover:bg-[#FAF7F0] cursor-pointer" onClick={() => handleDrill(row.id)}>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-[#1E2D4D]">{row.name}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-[#1E2D4D]/70">{row.locationCount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="font-bold text-green-700">{row.passing}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-bold ${row.atRisk > 0 ? 'text-red-600' : 'text-green-700'}`}>{row.atRisk}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-bold ${row.openViolations > 0 ? 'text-red-600' : 'text-green-700'}`}>{row.openViolations}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                      <span className={`font-bold ${row.foodOverdue > 0 ? 'text-amber-600' : 'text-green-700'}`}>{row.foodOverdue}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                      <span className={`font-bold ${row.fireOverdue > 0 ? 'text-amber-600' : 'text-green-700'}`}>{row.fireOverdue}</span>
                    </td>
                  </tr>
                ))}
                {/* Corporate total footer */}
                <tr className="bg-[#FAF7F0] font-semibold">
                  <td className="px-3 py-2.5 text-[#1E2D4D]">Corporate Total</td>
                  <td className="px-3 py-2.5 text-center text-[#1E2D4D]/80">{totalLocations.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-center text-green-700">{totalPassing}</td>
                  <td className="px-3 py-2.5 text-center text-red-600">{totalAtRisk}</td>
                  <td className="px-3 py-2.5 text-center text-red-600">{totalOpenViolations}</td>
                  <td className="px-3 py-2.5 text-center text-amber-600 hidden sm:table-cell">{totalFoodOverdue}</td>
                  <td className="px-3 py-2.5 text-center text-amber-600 hidden sm:table-cell">{totalFireOverdue}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── F. Fire Cadence Overdue by BU ──────────────────────── */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-[#1E2D4D] mb-3">Fire Cadence Overdue by Business Unit</h3>
          <p className="text-xs text-[#1E2D4D]/30 mb-4">Locations with next_due_date in the past per location_service_schedules</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {buRows.map(row => (
              <div key={row.id} className={`rounded-xl border p-3 text-center ${row.fireOverdue > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                <p className="text-xs text-[#1E2D4D]/50 truncate mb-1">{row.name}</p>
                <p className={`text-xl font-bold ${row.fireOverdue > 0 ? 'text-red-600' : 'text-green-700'}`}>{row.fireOverdue}</p>
                <p className="text-xs text-[#1E2D4D]/30">overdue</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── G. Detailed Enterprise Rollup Placeholder ──────────── */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 text-center">
          <p className="text-sm text-[#1E2D4D]/50">Detailed enterprise rollup coming soon</p>
          <p className="text-xs text-[#1E2D4D]/30 mt-1">Food status and fire status shown independently per business unit above. No blended scores.</p>
        </div>
      </div>

      {/* ── H. Powered By Footer ──────────────────────────── */}
      {tenant.showPoweredBy && (
        <footer className="text-center py-4 border-t border-[#1E2D4D]/5 bg-white mt-6">
          <p className="text-xs text-[#1E2D4D]/30">
            {tenant.poweredByText.replace('EvidLY', '').trim()}{' '}
            <span style={{ color: '#A08C5A', fontWeight: 600 }}>EvidLY</span>
          </p>
          <p className="text-xs text-[#1E2D4D]/30 mt-0.5">
            compliance.cleaningprosplus.com — EvidLY Demo Org
          </p>
        </footer>
      )}
    </div>
  );
}
