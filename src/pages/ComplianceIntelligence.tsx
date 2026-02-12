import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, ArrowUp, ArrowDown,
  Minus, Search, Download, ChevronRight, ExternalLink, Share2,
  Flame, UtensilsCrossed, FileText, BarChart3, Users, Target, Zap,
  Clock, Activity, Eye, Shield, CalendarDays, DollarSign, FileBarChart,
  Radar, Brain, AlertCircle, ClipboardCheck, Info, Send, Plus, CheckCircle,
  Database, Server, CreditCard, Layers, Star,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import {
  aramarkTenant, TOTAL_LOCATIONS, TOTAL_ENROLLED, ORG_SCORE,
  FIRE_SCORE, FOOD_SCORE, DOCS_SCORE, FIRE_TREND, FOOD_TREND, DOCS_TREND,
  DATA_POINTS_THIS_MONTH,
  urgentLocations, expiringThisQuarter, incidentVelocity, complianceMomentum,
  incidentSparkline, weeklyInsights,
  locationLeaderboard, quartileStats,
  platformAgeCohorts, verticalCohorts, sizeCohorts,
  seasonalPatternThisYear, seasonalPatternLastYear,
  regulatoryEvents, fastestImproving, fastestDeclining,
  riskPredictions, riskSummary,
  singleCFPMLocations, equipmentReplacementDue, predictedInspectionFailures, foodborneRiskLocations,
  scoreColor, riskColor, riskBg, riskBorder,
  type LocationRow,
  // Staffing tab
  staffingCorrelationInsight, trainingInsight, cfpmInsight, staffingChecklistInsight,
  managerTenureInsight, cfpmComparison, getScatterData, staffingRiskIndicators,
  // Financial tab
  financialCategories, roiSummary, historicalIncidents,
  // Reports tab
  reportTemplates, reportSections, distributionList,
  // Anomaly tab
  anomalyAlerts, antiGamingFlags, anomalySummary,
  // Platform tab
  enterpriseAggregation, regionAggregations, dataFreshness,
  databaseTables, edgeFunctions, pricingTiers, enterpriseBundles, cSuitePitch,
  type AggregationStats,
} from '../data/intelligenceData';

// ── Helpers ──────────────────────────────────────────────────────

function TrendBadge({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'text-sm font-bold' : 'text-[11px] font-semibold';
  if (Math.abs(value) < 0.2) return <span className={`inline-flex items-center gap-0.5 text-gray-400 ${cls}`}><Minus className="h-3 w-3" /> 0.0</span>;
  if (value > 0) return <span className={`inline-flex items-center gap-0.5 text-green-600 ${cls}`}><ArrowUp className="h-3 w-3" /> +{value.toFixed(1)}</span>;
  return <span className={`inline-flex items-center gap-0.5 text-red-500 ${cls}`}><ArrowDown className="h-3 w-3" /> {value.toFixed(1)}</span>;
}

function MiniSparkline({ data, width = 100, height = 28 }: { data: number[]; width?: number; height?: number }) {
  const min = Math.min(...data) - 2;
  const max = Math.max(...data) + 2;
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="#1e4d6b" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * height} r={2.5} fill="#1e4d6b" />
    </svg>
  );
}

function ScoreCircle({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={3} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="central" className="transform rotate-90 origin-center" style={{ fontSize: size * 0.3, fontWeight: 700, fill: '#1f2937' }}>
        {score}
      </text>
    </svg>
  );
}

type Tab = 'command' | 'compare' | 'trends' | 'risk' | 'staffing' | 'financial' | 'reports' | 'anomalies' | 'platform';

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'command', label: 'Command Center', icon: BarChart3 },
  { id: 'compare', label: 'Compare', icon: Users },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'risk', label: 'Risk', icon: Shield },
  { id: 'staffing', label: 'Staffing', icon: Brain },
  { id: 'financial', label: 'Financial', icon: DollarSign },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'anomalies', label: 'Anomalies', icon: Radar },
  { id: 'platform', label: 'Platform', icon: Layers },
];

// ── Main Page ────────────────────────────────────────────────────

export function ComplianceIntelligence() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('command');
  const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa', ...F }}>
      {/* Header */}
      <header className="px-4 sm:px-6 py-3" style={{ backgroundColor: '#002855' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#C8102E' }}>AR</div>
            <div>
              <h1 className="text-white font-bold text-base">Compliance Intelligence</h1>
              <p className="text-white/60 text-[10px]">Aramark Corporation — Enterprise Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/enterprise/dashboard')} className="text-white/70 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"><Eye className="h-3 w-3" /> Executive View</button>
            <button onClick={() => navigate('/enterprise/admin')} className="text-white/70 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"><ExternalLink className="h-3 w-3" /> Admin</button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#1e4d6b] text-[#1e4d6b]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'command' && <CommandCenterTab />}
        {activeTab === 'compare' && <CompareTab />}
        {activeTab === 'trends' && <TrendsTab />}
        {activeTab === 'risk' && <RiskTab />}
        {activeTab === 'staffing' && <StaffingTab />}
        {activeTab === 'financial' && <FinancialTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'anomalies' && <AnomalyTab />}
        {activeTab === 'platform' && <PlatformTab />}
      </div>

      {/* Powered By */}
      {aramarkTenant.showPoweredBy && (
        <footer className="text-center py-4 border-t border-gray-100 bg-white mt-6">
          <p className="text-xs text-gray-400">Powered by <span style={{ color: '#d4af37', fontWeight: 600 }}>EvidLY</span></p>
        </footer>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB 1 — EXECUTIVE COMMAND CENTER
// ══════════════════════════════════════════════════════════════════

function CommandCenterTab() {
  return (
    <div className="space-y-6">
      {/* Organization Pulse Banner */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" style={{ color: '#1e4d6b' }} />
            <h2 className="text-base font-bold text-gray-900">Organization Pulse</h2>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <span>Aramark Corporation</span>
            <span>·</span>
            <span>{TOTAL_LOCATIONS}/{TOTAL_ENROLLED} locations reporting</span>
            <span>·</span>
            <span>Updated 4 min ago</span>
            <span>·</span>
            <span>{DATA_POINTS_THIS_MONTH.toLocaleString()} data points</span>
          </div>
        </div>
        <div className="flex items-center gap-8 flex-wrap">
          <div className="flex items-center gap-3">
            <ScoreCircle score={ORG_SCORE} size={72} />
            <div>
              <p className="text-2xl font-bold text-gray-900">{ORG_SCORE}%</p>
              <p className="text-[10px] text-gray-500">Overall Compliance</p>
            </div>
          </div>
          <div className="h-12 w-px bg-gray-200 hidden md:block" />
          {[
            { label: 'Fire Safety', score: FIRE_SCORE, trend: FIRE_TREND, icon: Flame, status: FIRE_SCORE >= 90 ? 'green' : FIRE_SCORE >= 80 ? 'yellow' : 'red' },
            { label: 'Food Safety', score: FOOD_SCORE, trend: FOOD_TREND, icon: UtensilsCrossed, status: FOOD_SCORE >= 90 ? 'green' : FOOD_SCORE >= 80 ? 'yellow' : 'red' },
            { label: 'Vendor Compliance', score: DOCS_SCORE, trend: DOCS_TREND, icon: FileText, status: DOCS_SCORE >= 90 ? 'green' : DOCS_SCORE >= 80 ? 'yellow' : 'red' },
          ].map(cat => (
            <div key={cat.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${cat.status === 'green' ? 'bg-green-500' : cat.status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold" style={{ color: scoreColor(cat.score) }}>{cat.score}</span>
                  <TrendBadge value={cat.trend} />
                </div>
                <p className="text-[10px] text-gray-500">{cat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 1 — Critical Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Urgent Attention */}
        <button onClick={() => toast.info('View urgent locations coming soon')} className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
            <h3 className="text-xs font-semibold text-gray-900">Urgent Attention</h3>
          </div>
          <p className="text-2xl font-bold text-red-600">{urgentLocations.belowThreshold}</p>
          <p className="text-[11px] text-gray-500 mt-1">locations below {urgentLocations.threshold} — <span className="text-red-600 font-semibold">{urgentLocations.critical} critical (&lt;60)</span></p>
          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><ChevronRight className="h-3 w-3" /> View sorted by score</p>
        </button>

        {/* Card 2 — Expiring This Quarter */}
        <button onClick={() => toast.info('View expiration calendar coming soon')} className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50"><CalendarDays className="h-4 w-4 text-amber-500" /></div>
            <h3 className="text-xs font-semibold text-gray-900">Expiring This Quarter</h3>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-600">Fire suppression</span>
              <span className="text-sm font-bold text-amber-600">{expiringThisQuarter.fireSuppression}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-600">Food handler certs</span>
              <span className="text-sm font-bold text-amber-600">{expiringThisQuarter.foodHandlerCerts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-600">Vendor documents</span>
              <span className="text-sm font-bold text-amber-600">{expiringThisQuarter.vendorDocs}</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><ChevronRight className="h-3 w-3" /> Expiration calendar</p>
        </button>

        {/* Card 3 — Incident Velocity */}
        <button onClick={() => toast.info('View incident analytics coming soon')} className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50"><Activity className="h-4 w-4 text-green-600" /></div>
            <h3 className="text-xs font-semibold text-gray-900">Incident Velocity</h3>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-2xl font-bold text-green-600">{incidentVelocity.changePct}%</p>
              <p className="text-[11px] text-gray-500">vs last quarter ({incidentVelocity.previous} → {incidentVelocity.current})</p>
            </div>
            <MiniSparkline data={incidentSparkline} />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><ChevronRight className="h-3 w-3" /> Incident analytics</p>
        </button>

        {/* Card 4 — Compliance Momentum */}
        <button onClick={() => toast.info('View location movement analysis coming soon')} className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50"><TrendingUp className="h-4 w-4 text-blue-600" /></div>
            <h3 className="text-xs font-semibold text-gray-900">Compliance Momentum</h3>
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'Improving', pct: complianceMomentum.improving, color: '#22c55e' },
              { label: 'Declining', pct: complianceMomentum.declining, color: '#ef4444' },
              { label: 'Stable', pct: complianceMomentum.stable, color: '#9ca3af' },
            ].map(m => (
              <div key={m.label}>
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span className="text-gray-600">{m.label}</span>
                  <span className="font-bold" style={{ color: m.color }}>{m.pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><ChevronRight className="h-3 w-3" /> Movement analysis</p>
        </button>
      </div>

      {/* Row 2 — Trend Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Organization Trend — 12 Months</h3>
        <p className="text-[10px] text-gray-400 mb-4">Overall compliance with category breakdown · Dashed lines = regulatory events</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={seasonalPatternThisYear} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis domain={[75, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <ReferenceLine x="Jul" stroke="#d4af37" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: 'AB 660', position: 'top', style: { fontSize: 9, fill: '#d4af37', fontWeight: 600 } }} />
            <ReferenceLine x="Nov" stroke="#6b21a8" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: 'FDA Update', position: 'top', style: { fontSize: 9, fill: '#6b21a8', fontWeight: 600 } }} />
            <Line type="monotone" dataKey="overall" name="Overall" stroke="#1e4d6b" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="fire" name="Fire Safety" stroke="#ef4444" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="food" name="Food Safety" stroke="#22c55e" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="docs" name="Vendor Compliance" stroke="#6b21a8" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3 — AI Intelligence Insights */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4" style={{ color: '#d4af37' }} />
          <h3 className="text-sm font-semibold text-gray-900">This Week's Intelligence Briefing</h3>
          <span className="text-[10px] text-gray-400 ml-auto">{weeklyInsights.length} insights</span>
        </div>
        <div className="space-y-3">
          {weeklyInsights.map(insight => (
            <div key={insight.id} className={`p-4 rounded-lg border ${
              insight.severity === 'critical' ? 'border-red-200 bg-red-50/50' :
              insight.severity === 'advisory' ? 'border-amber-200 bg-amber-50/50' :
              'border-blue-200 bg-blue-50/50'
            }`}>
              <div className="flex items-start gap-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0 ${
                  insight.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  insight.severity === 'advisory' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{insight.severity.toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 leading-relaxed">{insight.text}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] text-gray-400"><Target className="h-3 w-3 inline mr-0.5" />{insight.scope}</span>
                    <span className="text-[10px] text-gray-400"><Zap className="h-3 w-3 inline mr-0.5" />{insight.action}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => toast.info(insight.drillDownLabel + ' — coming soon')} className="text-[10px] font-medium text-[#1e4d6b] hover:underline cursor-pointer flex items-center gap-0.5">
                      <ChevronRight className="h-3 w-3" />{insight.drillDownLabel}
                    </button>
                    <button onClick={() => toast.info('Share insight coming soon')} className="text-[10px] font-medium text-gray-400 hover:text-gray-600 cursor-pointer flex items-center gap-0.5">
                      <Share2 className="h-3 w-3" />Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB 2 — CROSS-LOCATION COMPARISON
// ══════════════════════════════════════════════════════════════════

function CompareTab() {
  const [sortCol, setSortCol] = useState<keyof LocationRow>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [verticalFilter, setVerticalFilter] = useState('all');
  const [showQuartile, setShowQuartile] = useState(false);

  const regions = useMemo(() => [...new Set(locationLeaderboard.map(l => l.region))].sort(), []);
  const verticals = useMemo(() => [...new Set(locationLeaderboard.map(l => l.vertical))].sort(), []);

  const filtered = useMemo(() => {
    let data = locationLeaderboard;
    if (searchQuery) data = data.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (regionFilter !== 'all') data = data.filter(l => l.region === regionFilter);
    if (verticalFilter !== 'all') data = data.filter(l => l.vertical === verticalFilter);
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return sorted;
  }, [sortCol, sortDir, searchQuery, regionFilter, verticalFilter]);

  function handleSort(col: keyof LocationRow) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir(col === 'rank' ? 'asc' : 'desc'); }
  }

  const SortArrow = ({ col }: { col: keyof LocationRow }) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? <ArrowUp className="h-2.5 w-2.5 inline ml-0.5" /> : <ArrowDown className="h-2.5 w-2.5 inline ml-0.5" />;
  };

  return (
    <div className="space-y-6">
      {/* Toggle: Leaderboard vs Quartile */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowQuartile(false)} className={`px-4 py-1.5 text-xs font-medium rounded-full border cursor-pointer ${!showQuartile ? 'bg-[#1e4d6b] text-white border-[#1e4d6b]' : 'bg-white text-gray-600 border-gray-200'}`}>Location Leaderboard</button>
        <button onClick={() => setShowQuartile(true)} className={`px-4 py-1.5 text-xs font-medium rounded-full border cursor-pointer ${showQuartile ? 'bg-[#1e4d6b] text-white border-[#1e4d6b]' : 'bg-white text-gray-600 border-gray-200'}`}>Quartile Analysis</button>
      </div>

      {!showQuartile ? (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e4d6b]"
                />
              </div>
              <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2">
                <option value="all">All Regions</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={verticalFilter} onChange={e => setVerticalFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2">
                <option value="all">All Verticals</option>
                {verticals.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <button onClick={() => toast.info('Export to Excel coming soon')} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <span className="text-[10px] text-gray-400">{filtered.length} of {TOTAL_LOCATIONS} locations</span>
            </div>
          </div>

          {/* Location Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-center px-2 py-2 font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('rank')}>Rank<SortArrow col="rank" /></th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('name')}>Location<SortArrow col="name" /></th>
                    <th className="text-left px-2 py-2 font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('region')}>Region<SortArrow col="region" /></th>
                    <th className="text-center px-2 py-2 font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('overall')}>Overall<SortArrow col="overall" /></th>
                    <th className="text-center px-2 py-2 font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('fire')}>Fire<SortArrow col="fire" /></th>
                    <th className="text-center px-2 py-2 font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('food')}>Food<SortArrow col="food" /></th>
                    <th className="text-center px-2 py-2 font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('docs')}>Docs<SortArrow col="docs" /></th>
                    <th className="text-center px-2 py-2 font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('trend')}>Trend<SortArrow col="trend" /></th>
                    <th className="text-center px-2 py-2 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map(loc => (
                    <tr key={loc.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => toast.info(`View ${loc.name} coming soon`)}>
                      <td className="px-2 py-2 text-center text-gray-400 font-mono">{loc.rank}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{loc.name}</td>
                      <td className="px-2 py-2 text-gray-500">{loc.region}</td>
                      <td className="px-2 py-2 text-center"><span className="font-bold" style={{ color: scoreColor(loc.overall) }}>{loc.overall}</span></td>
                      <td className="px-2 py-2 text-center" style={{ color: scoreColor(loc.fire) }}>{loc.fire}</td>
                      <td className="px-2 py-2 text-center" style={{ color: scoreColor(loc.food) }}>{loc.food}</td>
                      <td className="px-2 py-2 text-center" style={{ color: scoreColor(loc.docs) }}>{loc.docs}</td>
                      <td className="px-2 py-2 text-center"><TrendBadge value={loc.trend} /></td>
                      <td className="px-2 py-2 text-center">
                        {loc.actionItems > 0 ? (
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${loc.actionItems >= 5 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                            {loc.actionItems >= 5 ? '🔴' : '⚠️'} {loc.actionItems}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 100 && (
              <div className="text-center py-3 text-[10px] text-gray-400 border-t border-gray-100">
                Showing top 100 of {filtered.length} locations · Export for full list
              </div>
            )}
          </div>
        </>
      ) : (
        /* Quartile Analysis */
        <div className="space-y-6">
          {/* Quartile Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quartileStats.map((q, i) => (
              <div key={q.quartile} className={`bg-white rounded-xl border p-5 ${
                i === 0 ? 'border-green-200' : i === 1 ? 'border-blue-200' : i === 2 ? 'border-amber-200' : 'border-red-200'
              }`}>
                <h4 className="text-xs font-semibold text-gray-900 mb-1">{q.quartile}</h4>
                <p className="text-[10px] text-gray-400 mb-3">{q.count} locations · Score range: {q.range}</p>
                <div className="space-y-2">
                  {[
                    { label: 'Avg Score', value: q.avgScore + '%', color: scoreColor(q.avgScore) },
                    { label: 'Checklist Completion', value: q.avgChecklist + '%' },
                    { label: 'Temp Compliance', value: q.avgTempCompliance + '%' },
                    { label: 'Avg Turnover', value: q.avgTurnover + '%', bad: q.avgTurnover > 30 },
                    { label: 'Training Complete', value: q.avgTraining + '%' },
                    { label: 'Has CFPM', value: Math.round(q.hasCFPM / q.count * 100) + '%' },
                    { label: 'Vendor On-Time', value: q.vendorOnTime + '%' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">{row.label}</span>
                      <span className={`font-semibold ${(row as any).bad ? 'text-red-600' : ''}`} style={(row as any).color ? { color: (row as any).color } : undefined}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quartile Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quartile Comparison</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={quartileStats} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="quartile" tick={{ fontSize: 9, fill: '#9ca3af' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="avgScore" name="Avg Score" fill="#1e4d6b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgChecklist" name="Checklist %" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgTraining" name="Training %" fill="#d4af37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quartile Narrative */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4" style={{ color: '#d4af37' }} />
              <h3 className="text-sm font-semibold text-gray-900">What Separates Top from Bottom?</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <h4 className="text-xs font-semibold text-green-800 mb-2">Top Quartile Characteristics</h4>
                <ul className="space-y-1.5 text-[11px] text-green-700">
                  <li>• {quartileStats[0].avgChecklist}% checklist completion (vs {quartileStats[3].avgChecklist}% bottom)</li>
                  <li>• {Math.round(quartileStats[0].hasCFPM / quartileStats[0].count * 100)}% have dedicated CFPM on staff</li>
                  <li>• {quartileStats[0].vendorOnTime}% vendor services on schedule</li>
                  <li>• Average staff turnover: {quartileStats[0].avgTurnover}%</li>
                  <li>• {quartileStats[0].avgTraining}% training completion rate</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <h4 className="text-xs font-semibold text-red-800 mb-2">Bottom Quartile Characteristics</h4>
                <ul className="space-y-1.5 text-[11px] text-red-700">
                  <li>• Only {quartileStats[3].avgChecklist}% checklist completion</li>
                  <li>• Only {Math.round(quartileStats[3].hasCFPM / quartileStats[3].count * 100)}% have CFPM (non-compliant gap)</li>
                  <li>• {quartileStats[3].vendorOnTime}% vendor on-time rate (39% overdue)</li>
                  <li>• {quartileStats[3].avgTurnover}% average turnover — 2x top quartile</li>
                  <li>• {quartileStats[3].avgTraining}% training — significant gap</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB 3 — TREND INTELLIGENCE
// ══════════════════════════════════════════════════════════════════

function TrendsTab() {
  const [cohortType, setCohortType] = useState<'platform' | 'vertical' | 'size'>('platform');
  const activeCohorts = cohortType === 'platform' ? platformAgeCohorts : cohortType === 'vertical' ? verticalCohorts : sizeCohorts;

  return (
    <div className="space-y-6">
      {/* Seasonal Pattern: This Year vs Last Year */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Seasonal Pattern Analysis</h3>
        <p className="text-[10px] text-gray-400 mb-4">This year vs last year — identify recurring compliance dips</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} allowDuplicatedCategory={false} />
            <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line data={seasonalPatternThisYear} type="monotone" dataKey="overall" name="This Year — Overall" stroke="#1e4d6b" strokeWidth={2.5} dot={false} />
            <Line data={seasonalPatternThisYear} type="monotone" dataKey="food" name="This Year — Food" stroke="#22c55e" strokeWidth={1.5} dot={false} />
            <Line data={seasonalPatternLastYear} type="monotone" dataKey="overall" name="Last Year — Overall" stroke="#1e4d6b" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
            <Line data={seasonalPatternLastYear} type="monotone" dataKey="food" name="Last Year — Food" stroke="#22c55e" strokeWidth={1} strokeDasharray="5 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-[11px] text-amber-800"><Zap className="h-3 w-3 inline mr-1" /><strong>Insight:</strong> Food safety scores dip 4-6 points during June-August across your organization. Cooling log failures account for 72% of summer decline. Consider deploying summer-specific cooling protocol.</p>
        </div>
      </div>

      {/* Cohort Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Cohort Analysis</h3>
          <div className="flex gap-1">
            {[
              { key: 'platform' as const, label: 'By Platform Age' },
              { key: 'vertical' as const, label: 'By Vertical' },
              { key: 'size' as const, label: 'By Size' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setCohortType(opt.key)}
                className={`px-3 py-1 text-[11px] font-medium rounded-full border cursor-pointer ${
                  cohortType === opt.key ? 'bg-[#1e4d6b] text-white border-[#1e4d6b]' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >{opt.label}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={activeCohorts} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="cohort" tick={{ fontSize: 9, fill: '#9ca3af' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="avgScore" name="Avg Score" fill="#1e4d6b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="avgImprovement" name="Avg Improvement" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {cohortType === 'platform' && (
          <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-[11px] text-blue-800"><Zap className="h-3 w-3 inline mr-1" /><strong>Insight:</strong> Locations in their first 3 months on EvidLY average a 14.2-point compliance score improvement. ROI accelerates most in months 1-6.</p>
          </div>
        )}
      </div>

      {/* Regulatory Impact */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Regulatory Impact Analysis</h3>
        <div className="space-y-3">
          {regulatoryEvents.map(evt => (
            <div key={evt.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700">{evt.date}</span>
                  <span className="text-xs font-semibold text-gray-900">{evt.label}</span>
                </div>
                <span className="text-[10px] text-gray-400">{evt.affectedLocations} locations affected</span>
              </div>
              <p className="text-[11px] text-gray-600 mb-3">{evt.description}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] text-gray-400">Before</p>
                  <p className="text-sm font-bold" style={{ color: scoreColor(evt.beforeScore) }}>{evt.beforeScore}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">After</p>
                  <p className="text-sm font-bold" style={{ color: scoreColor(evt.afterScore) }}>{evt.afterScore}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Adapted</p>
                  <p className="text-sm font-bold text-green-600">{evt.adaptedPct}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Still Pending</p>
                  <p className="text-sm font-bold text-amber-600">{evt.pendingLocations} locations</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rate of Change */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-green-700 mb-3">🚀 Fastest Improving</h3>
          <div className="space-y-2">
            {fastestImproving.slice(0, 7).map((loc, i) => (
              <div key={loc.id} className="flex items-center gap-3 p-2 rounded-lg bg-green-50/50">
                <span className="text-[10px] text-gray-400 w-4 text-right">{i + 1}</span>
                <span className="text-xs font-medium text-gray-900 flex-1 truncate">{loc.name}</span>
                <span className="text-[10px] text-gray-400">{loc.region}</span>
                <TrendBadge value={loc.trend} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-red-600 mb-3">⚠️ Fastest Declining</h3>
          <div className="space-y-2">
            {fastestDeclining.slice(0, 7).map((loc, i) => (
              <div key={loc.id} className="flex items-center gap-3 p-2 rounded-lg bg-red-50/50">
                <span className="text-[10px] text-gray-400 w-4 text-right">{i + 1}</span>
                <span className="text-xs font-medium text-gray-900 flex-1 truncate">{loc.name}</span>
                <span className="text-[10px] text-gray-400">{loc.region}</span>
                <TrendBadge value={loc.trend} />
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-200">
            <p className="text-[10px] text-red-700"><AlertTriangle className="h-3 w-3 inline mr-0.5" /> {fastestDeclining[0]?.name} has declined {Math.abs(fastestDeclining[0]?.trend || 0)} pts/month for 3 consecutive months. At current trajectory, score breaches 70 threshold in ~6 weeks.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB 4 — PREDICTIVE RISK INTELLIGENCE
// ══════════════════════════════════════════════════════════════════

function RiskTab() {
  const [expandedRisk, setExpandedRisk] = useState<string | null>(riskPredictions[0]?.id || null);

  return (
    <div className="space-y-6">
      {/* Risk Summary Dashboard */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Predictive Risk Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Low Risk', count: riskSummary.low, color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', desc: 'No predicted issues next 90 days' },
            { label: 'Moderate Risk', count: riskSummary.moderate, color: '#d4af37', bg: '#fefce8', border: '#fde68a', desc: '1-2 predicted issues' },
            { label: 'High Risk', count: riskSummary.high, color: '#f59e0b', bg: '#fff7ed', border: '#fdba74', desc: '3+ predicted issues' },
            { label: 'Critical Risk', count: riskSummary.critical, color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', desc: 'Intervention recommended' },
          ].map(r => (
            <div key={r.label} className="rounded-xl border p-4 text-center" style={{ backgroundColor: r.bg, borderColor: r.border }}>
              <p className="text-3xl font-bold" style={{ color: r.color }}>{r.count}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: r.color }}>{r.label}</p>
              <p className="text-[10px] text-gray-500 mt-1">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Factor Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Fire Lapse Risk', value: expiringThisQuarter.fireSuppression, icon: Flame, desc: 'locations with >70% lapse probability', color: '#ef4444' },
          { label: 'Inspection Failure', value: predictedInspectionFailures, icon: ClipboardCheck, desc: 'predicted B or lower grade', color: '#f59e0b' },
          { label: 'Single-CFPM Risk', value: singleCFPMLocations, icon: Users, desc: 'locations — 1 departure = non-compliant', color: '#d4af37' },
          { label: 'Equipment Aging', value: equipmentReplacementDue, icon: Clock, desc: 'approaching replacement cycle', color: '#6b21a8' },
        ].map(f => (
          <div key={f.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <f.icon className="h-4 w-4" style={{ color: f.color }} />
              <span className="text-[11px] font-semibold text-gray-700">{f.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: f.color }}>{f.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Risk Predictions Detail */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">High & Critical Risk Locations — Mitigation Plans</h3>
        <div className="space-y-3">
          {riskPredictions.map(pred => (
            <div key={pred.id} className="rounded-lg border" style={{ borderColor: riskBorder(pred.riskLevel), backgroundColor: expandedRisk === pred.id ? riskBg(pred.riskLevel) : 'white' }}>
              <button
                onClick={() => setExpandedRisk(expandedRisk === pred.id ? null : pred.id)}
                className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: riskBg(pred.riskLevel) }}>
                  <span className="text-sm font-bold" style={{ color: riskColor(pred.riskLevel) }}>{pred.overallRiskScore}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900">{pred.locationName}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full`} style={{ backgroundColor: riskBg(pred.riskLevel), color: riskColor(pred.riskLevel), border: `1px solid ${riskBorder(pred.riskLevel)}` }}>
                      {pred.riskLevel.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{pred.region} · {pred.factors.length} risk factors identified</p>
                </div>
                <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${expandedRisk === pred.id ? 'rotate-90' : ''}`} />
              </button>

              {expandedRisk === pred.id && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: riskBorder(pred.riskLevel) }}>
                  {/* Risk Factors */}
                  <div className="mt-3 mb-4">
                    <h4 className="text-[11px] font-semibold text-gray-700 mb-2">Risk Factors</h4>
                    <div className="space-y-2">
                      {pred.factors.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 text-[11px]">
                          <div className="w-16">
                            <div className="h-1.5 bg-gray-200 rounded-full">
                              <div className="h-full rounded-full" style={{ width: `${f.probability}%`, backgroundColor: f.severity === 'high' ? '#ef4444' : f.severity === 'medium' ? '#f59e0b' : '#d4af37' }} />
                            </div>
                          </div>
                          <span className="text-gray-400 w-8 text-right font-mono">{f.probability}%</span>
                          <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                            f.severity === 'high' ? 'bg-red-100 text-red-700' : f.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>{f.severity.toUpperCase()}</span>
                          <span className="text-gray-700 flex-1">{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mitigation Plan */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-gray-700 mb-2">Mitigation Plan</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-1.5 pr-3 font-medium text-gray-500">#</th>
                            <th className="text-left py-1.5 pr-3 font-medium text-gray-500">Action</th>
                            <th className="text-left py-1.5 pr-3 font-medium text-gray-500">Effort</th>
                            <th className="text-left py-1.5 pr-3 font-medium text-gray-500">Impact</th>
                            <th className="text-left py-1.5 font-medium text-gray-500">Assignee</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pred.mitigationSteps.map((step, j) => (
                            <tr key={j} className="border-b border-gray-100">
                              <td className="py-1.5 pr-3 text-gray-400">{j + 1}</td>
                              <td className="py-1.5 pr-3 text-gray-800 font-medium">{step.action}</td>
                              <td className="py-1.5 pr-3 text-gray-500">{step.effort}</td>
                              <td className="py-1.5 pr-3">
                                <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                                  step.impact === 'Critical' ? 'bg-red-100 text-red-700' : step.impact === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                }`}>{step.impact}</span>
                              </td>
                              <td className="py-1.5 text-gray-500">{step.assignee}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => toast.info('Assign mitigation plan coming soon')} className="px-3 py-1.5 text-[10px] font-medium rounded-md cursor-pointer text-white" style={{ backgroundColor: '#1e4d6b' }}>Assign Plan</button>
                      <button onClick={() => toast.info('Export mitigation plan coming soon')} className="px-3 py-1.5 text-[10px] font-medium rounded-md border border-gray-200 text-gray-600 cursor-pointer hover:bg-gray-50">Export PDF</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB 5 — STAFFING CORRELATION ANALYSIS
// ══════════════════════════════════════════════════════════════════

function InsightCallout({ text }: { text: string }) {
  return (
    <div className="mt-2 p-2.5 rounded-lg border border-[#d4af37]/30 bg-[#fefce8]">
      <p className="text-[11px] text-amber-800"><Zap className="h-3 w-3 inline mr-1 text-[#d4af37]" />{text}</p>
    </div>
  );
}

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-200 text-[11px]">
      <p className="font-semibold text-gray-900">{d?.name}</p>
      <p className="text-gray-500">X: {d?.x} · Y: {d?.y}</p>
    </div>
  );
};

function StaffingTab() {
  const turnoverData = useMemo(() => getScatterData('turnover', 'overall'), []);
  const trainingData = useMemo(() => getScatterData('trainingPct', 'overall'), []);
  const checklistData = useMemo(() => getScatterData('headcount', 'checklistPct'), []);
  const tenureData = useMemo(() => getScatterData('monthsOnPlatform', 'overall'), []);

  const riskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    staffingRiskIndicators.forEach(r => { counts[r.riskType] = (counts[r.riskType] || 0) + 1; });
    return counts;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          <h2 className="text-base font-bold text-gray-900">Staffing Correlation Analysis</h2>
        </div>
        <p className="text-[11px] text-gray-500">Connects HR data to compliance outcomes — insight no other platform provides because nobody else has both datasets in one system.</p>
      </div>

      {/* Chart Grid — 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1 — Turnover vs Compliance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Turnover Rate vs Compliance Score</h3>
          <p className="text-[10px] text-gray-400 mb-3">Each dot = one location · Expected: negative correlation</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="x" type="number" name="Turnover %" tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'Turnover %', position: 'bottom', style: { fontSize: 10, fill: '#9ca3af' } }} />
              <YAxis dataKey="y" type="number" name="Score" domain={[40, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9ca3af' } }} />
              <ZAxis range={[20, 20]} />
              <Tooltip content={<CustomScatterTooltip />} />
              <Scatter data={turnoverData} fill="#1e4d6b" fillOpacity={0.5} />
              <ReferenceLine stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5} segment={[{ x: 10, y: 95 }, { x: 60, y: 74 }]} />
            </ScatterChart>
          </ResponsiveContainer>
          <InsightCallout text={staffingCorrelationInsight} />
        </div>

        {/* Chart 2 — Training vs Compliance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Training Completion vs Compliance Score</h3>
          <p className="text-[10px] text-gray-400 mb-3">Food handler certs + EvidLY training · Strong positive correlation</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="x" type="number" name="Training %" domain={[50, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'Training %', position: 'bottom', style: { fontSize: 10, fill: '#9ca3af' } }} />
              <YAxis dataKey="y" type="number" name="Score" domain={[40, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9ca3af' } }} />
              <ZAxis range={[20, 20]} />
              <Tooltip content={<CustomScatterTooltip />} />
              <Scatter data={trainingData} fill="#22c55e" fillOpacity={0.5} />
              <ReferenceLine stroke="#22c55e" strokeDasharray="6 3" strokeWidth={1.5} segment={[{ x: 55, y: 62 }, { x: 100, y: 96 }]} />
            </ScatterChart>
          </ResponsiveContainer>
          <InsightCallout text={trainingInsight} />
        </div>

        {/* Chart 3 — CFPM Coverage (BarChart simulating box plot) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">CFPM Coverage vs Food Safety Score</h3>
          <p className="text-[10px] text-gray-400 mb-3">Single CFPM vs 2+ CFPMs · Median + interquartile range</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[
              { group: 'Single CFPM', avg: cfpmComparison.singleCfpm.avgFoodScore, q1: cfpmComparison.singleCfpm.q1, q3: cfpmComparison.singleCfpm.q3 },
              { group: '2+ CFPMs', avg: cfpmComparison.multiCfpm.avgFoodScore, q1: cfpmComparison.multiCfpm.q1, q3: cfpmComparison.multiCfpm.q3 },
            ]} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="group" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="avg" name="Avg Food Safety" fill="#1e4d6b" radius={[4, 4, 0, 0]} barSize={60} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-8 mt-2 text-[10px] text-gray-500">
            <span>Single CFPM: <strong className="text-red-600">{cfpmComparison.singleCfpm.count} locations</strong> · Avg {cfpmComparison.singleCfpm.avgFoodScore}%</span>
            <span>2+ CFPMs: <strong className="text-green-600">{cfpmComparison.multiCfpm.count} locations</strong> · Avg {cfpmComparison.multiCfpm.avgFoodScore}%</span>
          </div>
          <InsightCallout text={cfpmInsight} />
        </div>

        {/* Chart 4 — Staffing Level vs Checklist Completion */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Staffing Level vs Checklist Completion</h3>
          <p className="text-[10px] text-gray-400 mb-3">Headcount as staffing proxy · Do understaffed locations complete fewer checklists?</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="x" type="number" name="Headcount" tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'Headcount', position: 'bottom', style: { fontSize: 10, fill: '#9ca3af' } }} />
              <YAxis dataKey="y" type="number" name="Checklist %" domain={[40, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'Checklist %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9ca3af' } }} />
              <ZAxis range={[20, 20]} />
              <Tooltip content={<CustomScatterTooltip />} />
              <Scatter data={checklistData} fill="#d4af37" fillOpacity={0.5} />
            </ScatterChart>
          </ResponsiveContainer>
          <InsightCallout text={staffingChecklistInsight} />
        </div>
      </div>

      {/* Chart 5 — Manager Tenure vs Score (full width) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Manager Tenure vs Location Score</h3>
        <p className="text-[10px] text-gray-400 mb-3">Months on platform as tenure proxy · Longer tenure correlates with higher scores</p>
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="x" type="number" name="Months" tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'Months on Platform', position: 'bottom', style: { fontSize: 10, fill: '#9ca3af' } }} />
            <YAxis dataKey="y" type="number" name="Score" domain={[40, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9ca3af' } }} />
            <ZAxis range={[20, 20]} />
            <Tooltip content={<CustomScatterTooltip />} />
            <Scatter data={tenureData} fill="#6b21a8" fillOpacity={0.5} />
            <ReferenceLine stroke="#6b21a8" strokeDasharray="6 3" strokeWidth={1.5} segment={[{ x: 0, y: 76 }, { x: 24, y: 94 }]} />
          </ScatterChart>
        </ResponsiveContainer>
        <InsightCallout text={managerTenureInsight} />
      </div>

      {/* Staffing Risk Indicators */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Staffing Risk Indicators</h3>
        <p className="text-[10px] text-gray-400 mb-4">Locations where staffing patterns predict compliance decline</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[
            { type: 'high-turnover' as const, label: 'High Turnover', icon: TrendingDown, color: '#ef4444' },
            { type: 'cfpm-departure' as const, label: 'CFPM Departure', icon: Users, color: '#f59e0b' },
            { type: 'new-hires-untrained' as const, label: 'Untrained New Hires', icon: AlertCircle, color: '#d4af37' },
            { type: 'manager-vacancy' as const, label: 'Manager Vacancy', icon: AlertTriangle, color: '#ef4444' },
          ].map(rt => (
            <div key={rt.type} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <rt.icon className="h-4 w-4" style={{ color: rt.color }} />
                <span className="text-[11px] font-semibold text-gray-700">{rt.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: rt.color }}>{riskCounts[rt.type] || 0}</p>
              <p className="text-[10px] text-gray-500">locations flagged</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {staffingRiskIndicators.map((ind, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${
              ind.severity === 'critical' ? 'border-red-200 bg-red-50/50' :
              ind.severity === 'high' ? 'border-amber-200 bg-amber-50/50' :
              'border-gray-200 bg-gray-50/50'
            }`}>
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full flex-shrink-0 ${
                ind.severity === 'critical' ? 'bg-red-100 text-red-700' :
                ind.severity === 'high' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }`}>{ind.severity.toUpperCase()}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-900">{ind.locationName}</span>
                <span className="text-[10px] text-gray-400 ml-2">{ind.region} · {ind.district}</span>
                <p className="text-[11px] text-gray-600 mt-0.5">{ind.description}</p>
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0">{ind.detectedDate}</span>
              <button onClick={() => toast.info(`Investigate ${ind.locationName} coming soon`)} className="px-2.5 py-1 text-[10px] font-medium rounded-md border border-gray-200 text-gray-600 cursor-pointer hover:bg-gray-50 flex-shrink-0">Investigate</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB 6 — FINANCIAL IMPACT ANALYSIS
// ══════════════════════════════════════════════════════════════════

function formatDollars(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function FinancialTab() {
  const categoryIcons: Record<string, typeof Flame> = {
    gavel: AlertTriangle,
    shield: Shield,
    alert: Activity,
    revenue: DollarSign,
    'trending-up': TrendingUp,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          <h2 className="text-base font-bold text-gray-900">Financial Impact Analysis</h2>
        </div>
        <p className="text-[11px] text-gray-500">Translates compliance data into dollar figures for the CFO. All estimates based on industry benchmarks and your organization's data.</p>
      </div>

      {/* Cost Categories */}
      <div className="space-y-4">
        {financialCategories.map(cat => {
          const Icon = categoryIcons[cat.icon] || AlertTriangle;
          const borderColor = cat.color === 'red' ? 'border-red-200' : cat.color === 'amber' ? 'border-amber-200' : 'border-green-200';
          const bgColor = cat.color === 'red' ? 'bg-red-50/50' : cat.color === 'amber' ? 'bg-amber-50/50' : 'bg-green-50/50';
          const textColor = cat.color === 'red' ? 'text-red-700' : cat.color === 'amber' ? 'text-amber-700' : 'text-green-700';
          return (
            <div key={cat.id} className={`bg-white rounded-xl border ${borderColor} p-5`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                  <Icon className={`h-5 w-5 ${textColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{cat.category}</h3>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${textColor}`}>
                        {formatDollars(cat.lowEstimate)} – {formatDollars(cat.highEstimate)}
                      </p>
                      <p className="text-[10px] text-gray-400">{cat.color === 'green' ? 'estimated risk reduction' : 'estimated exposure'}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-2">{cat.description}</p>
                  <ul className="mt-2 space-y-1">
                    {cat.details.map((d, i) => (
                      <li key={i} className="text-[10px] text-gray-500 flex items-start gap-1.5">
                        <span className="text-gray-300 mt-0.5">•</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Executive ROI Summary */}
      <div className="bg-white rounded-xl border-2 border-[#d4af37]/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5" style={{ color: '#d4af37' }} />
          <h3 className="text-base font-bold text-gray-900">Executive ROI Summary</h3>
          <span className="text-[10px] text-gray-400 ml-auto">Board-ready view</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left — Investment */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Annual Compliance Investment</h4>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-2xl font-bold text-gray-900">{formatDollars(roiSummary.annualInvestment)}<span className="text-sm font-normal text-gray-400">/year</span></p>
              <p className="text-[10px] text-gray-500 mt-1">EvidLY platform subscription (487 locations)</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs font-semibold text-red-700 mb-1">Without EvidLY — Estimated Annual Exposure</p>
              <p className="text-xl font-bold text-red-600">{formatDollars(roiSummary.riskReductionLow)} – {formatDollars(roiSummary.riskReductionHigh)}</p>
              <p className="text-[10px] text-red-500 mt-1">penalties + incidents + closures + premium impact</p>
            </div>
          </div>
          {/* Right — Returns */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Realized & Projected Savings</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                <span className="text-[11px] text-green-700">Insurance Premium Savings</span>
                <span className="text-sm font-bold text-green-700">{formatDollars(roiSummary.insuranceSavings)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                <span className="text-[11px] text-green-700">Revenue Protected (closures avoided)</span>
                <span className="text-sm font-bold text-green-700">{formatDollars(roiSummary.revenueProtected)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                <span className="text-[11px] text-green-700">Risk Reduction Value</span>
                <span className="text-sm font-bold text-green-700">{formatDollars(roiSummary.riskReductionLow)} – {formatDollars(roiSummary.riskReductionHigh)}</span>
              </div>
            </div>
            <div className="p-4 rounded-lg border-2 border-[#d4af37] bg-[#fefce8] text-center">
              <p className="text-xs text-gray-600 mb-1">Net ROI</p>
              <p className="text-3xl font-bold" style={{ color: '#d4af37' }}>{roiSummary.roiLow}x – {roiSummary.roiHigh}x</p>
              <p className="text-[10px] text-gray-500 mt-1">return on compliance investment</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 italic">Estimates based on industry averages and your organization's compliance data. Actual results may vary.</p>
          <button onClick={() => toast.info('Generate Board Report coming soon')} className="px-4 py-2 text-[11px] font-semibold rounded-lg text-white cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>Generate Board Report</button>
        </div>
      </div>

      {/* Historical Incidents */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Historical Incidents — Last 12 Months</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-3 font-medium text-gray-500">Type</th>
                <th className="text-left py-2 pr-3 font-medium text-gray-500">Location</th>
                <th className="text-left py-2 pr-3 font-medium text-gray-500">Date</th>
                <th className="text-right py-2 pr-3 font-medium text-gray-500">Cost</th>
                <th className="text-left py-2 font-medium text-gray-500">Resolution</th>
              </tr>
            </thead>
            <tbody>
              {historicalIncidents.map((inc, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-medium text-gray-800">{inc.type}</td>
                  <td className="py-2 pr-3 text-gray-600">{inc.location}</td>
                  <td className="py-2 pr-3 text-gray-500">{inc.date}</td>
                  <td className="py-2 pr-3 text-right font-semibold text-red-600">${inc.cost.toLocaleString()}</td>
                  <td className="py-2 text-gray-500">{inc.resolution}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300">
                <td colSpan={3} className="py-2 font-semibold text-gray-900">Total Incident Cost (12 months)</td>
                <td className="py-2 pr-3 text-right font-bold text-red-700">${historicalIncidents.reduce((s, i) => s + i.cost, 0).toLocaleString()}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB 7 — EXECUTIVE REPORT GENERATOR
// ══════════════════════════════════════════════════════════════════

function ReportsTab() {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['Executive Summary', 'Organization Scorecard', 'Risk & Exposure']);
  const [dateRange, setDateRange] = useState('last-30');
  const [scope, setScope] = useState('organization');

  function toggleMetric(m: string) {
    setSelectedMetrics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <FileBarChart className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          <h2 className="text-base font-bold text-gray-900">Executive Report Generator</h2>
        </div>
        <p className="text-[11px] text-gray-500">Automated C-suite-ready reports with enterprise branding. PDF, PowerPoint, and interactive web formats.</p>
      </div>

      {/* Report Templates */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Report Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTemplates.map(rpt => (
            <div key={rpt.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-900">{rpt.title}</h4>
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                  rpt.type === 'monthly' ? 'bg-blue-100 text-blue-700' :
                  rpt.type === 'quarterly' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{rpt.type.charAt(0).toUpperCase() + rpt.type.slice(1)}</span>
              </div>
              <p className="text-[10px] text-gray-400 mb-2">{rpt.pages} pages · Last generated: {rpt.lastGenerated}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {rpt.sections.map(s => (
                  <span key={s} className="px-1.5 py-0.5 text-[9px] rounded bg-gray-100 text-gray-500">{s}</span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {rpt.status === 'scheduled' ? (
                  <span className="text-[10px] text-amber-600 flex items-center gap-1"><Clock className="h-3 w-3" /> Scheduled</span>
                ) : (
                  <span className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Ready</span>
                )}
                <div className="flex-1" />
                <button onClick={() => toast.info(`Generating ${rpt.title}`)} className="px-2.5 py-1 text-[10px] font-medium rounded-md text-white cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>Generate</button>
                <button onClick={() => toast.info(`Schedule ${rpt.title} coming soon`)} className="px-2.5 py-1 text-[10px] font-medium rounded-md border border-gray-200 text-gray-600 cursor-pointer hover:bg-gray-50">Schedule</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ad-Hoc Report Builder */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Ad-Hoc Report Builder</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Metrics */}
          <div>
            <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide block mb-2">Select Metrics</label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {reportSections.map(s => (
                <label key={s} className="flex items-center gap-2 text-[11px] text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={selectedMetrics.includes(s)} onChange={() => toggleMetric(s)} className="rounded border-gray-300" />
                  {s}
                </label>
              ))}
            </div>
          </div>
          {/* Date Range + Scope */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide block mb-2">Date Range</label>
              <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2">
                <option value="last-30">Last 30 Days</option>
                <option value="last-90">Last 90 Days</option>
                <option value="ytd">Year to Date</option>
                <option value="last-year">Last 12 Months</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide block mb-2">Scope</label>
              <select value={scope} onChange={e => setScope(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2">
                <option value="organization">Entire Organization</option>
                <option value="west">West Region</option>
                <option value="midwest">Midwest Region</option>
                <option value="northeast">Northeast Region</option>
                <option value="southeast">Southeast Region</option>
                <option value="southwest">Southwest Region</option>
              </select>
            </div>
          </div>
          {/* Export Options */}
          <div>
            <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide block mb-2">Export Format</label>
            <div className="space-y-2">
              {[
                { label: 'PDF Report', desc: 'Print-ready with branding' },
                { label: 'PowerPoint', desc: 'Editable slide deck' },
                { label: 'Interactive Web Link', desc: 'Shareable dashboard link' },
              ].map(fmt => (
                <button key={fmt.label} onClick={() => toast.info(`Building ${fmt.label} report`)} className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer text-left">
                  <Download className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-[11px] font-medium text-gray-800">{fmt.label}</p>
                    <p className="text-[10px] text-gray-400">{fmt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400">{selectedMetrics.length} sections selected</p>
          <button onClick={() => toast.info('Building custom report')} className="px-4 py-2 text-[11px] font-semibold rounded-lg text-white cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>Build Report</button>
        </div>
      </div>

      {/* Distribution List */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Distribution List</h3>
          <button onClick={() => toast.info('Add recipient coming soon')} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium rounded-md border border-gray-200 text-gray-600 cursor-pointer hover:bg-gray-50">
            <Plus className="h-3 w-3" /> Add Recipient
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-3 font-medium text-gray-500">Name</th>
                <th className="text-left py-2 pr-3 font-medium text-gray-500">Role</th>
                <th className="text-left py-2 pr-3 font-medium text-gray-500">Email</th>
                <th className="text-left py-2 pr-3 font-medium text-gray-500">Delivery</th>
                <th className="text-center py-2 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {distributionList.map((rec, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-medium text-gray-800">{rec.name}</td>
                  <td className="py-2 pr-3 text-gray-600">{rec.role}</td>
                  <td className="py-2 pr-3 text-gray-500">{rec.email}</td>
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full ${
                      rec.deliveryMethod === 'email' ? 'bg-blue-100 text-blue-700' :
                      rec.deliveryMethod === 'teams' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>{rec.deliveryMethod.charAt(0).toUpperCase() + rec.deliveryMethod.slice(1)}</span>
                  </td>
                  <td className="py-2 text-center">
                    <button onClick={() => toast.info(`Send report to ${rec.name} coming soon`)} className="text-[10px] text-[#1e4d6b] hover:underline cursor-pointer"><Send className="h-3 w-3 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => toast.info('Send to all recipients coming soon')} className="px-4 py-2 text-[11px] font-semibold rounded-lg text-white cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>Send Now</button>
          <button onClick={() => toast.info('Schedule distribution coming soon')} className="px-4 py-2 text-[11px] font-semibold rounded-lg border border-gray-200 text-gray-600 cursor-pointer hover:bg-gray-50">Schedule Delivery</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB 8 — ANOMALY DETECTION ENGINE
// ══════════════════════════════════════════════════════════════════

function AnomalyTab() {
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const confidenceOrder = { high: 0, medium: 1, low: 2 };
  const sortedAlerts = useMemo(() =>
    [...anomalyAlerts].sort((a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] || confidenceOrder[a.confidence] - confidenceOrder[b.confidence]
    ), []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Radar className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          <h2 className="text-base font-bold text-gray-900">Anomaly Detection Engine</h2>
        </div>
        <p className="text-[11px] text-gray-500">Real-time statistical anomaly detection surfaces unusual patterns automatically. Detection runs hourly against rolling 30-day baseline.</p>
      </div>

      {/* Anomaly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { type: 'Score Anomalies', data: anomalySummary.score, icon: TrendingDown, color: '#ef4444', desc: 'Unusual score drops or divergence from peer group' },
          { type: 'Behavioral Anomalies', data: anomalySummary.behavioral, icon: Eye, color: '#f59e0b', desc: 'Unusual data entry patterns or workflow changes' },
          { type: 'Volume Anomalies', data: anomalySummary.volume, icon: Activity, color: '#6b21a8', desc: 'Unexpected spikes or drops in data volume' },
        ].map(cat => (
          <div key={cat.type} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
              <h3 className="text-xs font-semibold text-gray-900">{cat.type}</h3>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-3xl font-bold" style={{ color: cat.color }}>{cat.data.total}</p>
              {cat.data.critical > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700">{cat.data.critical} critical</span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">{cat.desc}</p>
          </div>
        ))}
      </div>

      {/* Active Anomaly Alerts */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Active Anomaly Alerts</h3>
          <span className="text-[10px] text-gray-400">{sortedAlerts.length} anomalies detected</span>
        </div>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {sortedAlerts.map(a => (
            <div key={a.id} className={`p-4 rounded-lg border ${
              a.severity === 'critical' ? 'border-red-200 bg-red-50/50' :
              a.severity === 'warning' ? 'border-amber-200 bg-amber-50/50' :
              'border-gray-200 bg-gray-50/50'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full text-center ${
                    a.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    a.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{a.severity.toUpperCase()}</span>
                  <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full text-center ${
                    a.type === 'score' ? 'bg-red-50 text-red-600' :
                    a.type === 'behavioral' ? 'bg-amber-50 text-amber-600' :
                    'bg-purple-50 text-purple-600'
                  }`}>{a.type}</span>
                  <span className={`px-2 py-0.5 text-[9px] rounded-full text-center ${
                    a.confidence === 'high' ? 'bg-green-50 text-green-700' :
                    a.confidence === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>{a.confidence} conf.</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-900">{a.location}</span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${
                      a.status === 'new' ? 'bg-blue-100 text-blue-700' :
                      a.status === 'investigating' ? 'bg-amber-100 text-amber-700' :
                      a.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{a.status}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">{a.detectedAt}</span>
                  </div>
                  <p className="text-[11px] text-gray-700 mt-1">{a.description}</p>
                  <p className="text-[10px] text-gray-500 mt-1"><strong>Context:</strong> {a.context}</p>
                  <p className="text-[10px] text-gray-500 mt-1"><strong>Suggested:</strong> {a.suggestedAction}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => toast.info(`Investigating ${a.location}`)} className="px-2.5 py-1 text-[10px] font-medium rounded-md text-white cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>Investigate</button>
                    <button onClick={() => toast.success(`Status updated for ${a.location}`)} className="px-2.5 py-1 text-[10px] font-medium rounded-md border border-gray-200 text-gray-600 cursor-pointer hover:bg-gray-50">Update Status</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Anti-Gaming Detection */}
      <div className="bg-white rounded-xl border border-amber-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Info className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">Data Quality Review</h3>
        </div>
        <p className="text-[10px] text-gray-400 mb-4">These flags indicate data patterns that may warrant review — not accusations of misconduct. Enterprise analytics must be trustworthy.</p>
        <div className="space-y-3">
          {antiGamingFlags.map(flag => (
            <div key={flag.id} className="p-4 rounded-lg border border-amber-100 bg-amber-50/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-900">{flag.location}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full ${
                    flag.confidence === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{flag.confidence} confidence</span>
                  <span className="text-[10px] text-gray-400">{flag.detectedAt}</span>
                </div>
              </div>
              <p className="text-[11px] font-medium text-amber-800 mb-1">{flag.pattern}</p>
              <p className="text-[11px] text-gray-600">{flag.description}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-amber-100">
          <p className="text-[10px] text-amber-700 italic">Recommend on-site data quality audit for flagged locations.</p>
          <button onClick={() => toast.info('Schedule on-site audit coming soon')} className="px-4 py-2 text-[11px] font-semibold rounded-lg border border-amber-300 text-amber-700 cursor-pointer hover:bg-amber-50">Schedule Audit</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAB 9 — PLATFORM (Aggregation, Freshness, Schema, Pricing)
// ══════════════════════════════════════════════════════════════════

function StatRow({ label, stats }: { label: string; stats: AggregationStats }) {
  return (
    <tr className="border-b border-gray-50">
      <td className="py-2 text-xs font-semibold text-gray-900 pr-4">{label}</td>
      <td className="py-2 text-xs text-gray-600 text-center">{stats.mean}</td>
      <td className="py-2 text-xs text-gray-600 text-center">{stats.median}</td>
      <td className="py-2 text-xs text-gray-600 text-center">{stats.stdDev}</td>
      <td className="py-2 text-xs text-gray-600 text-center">{stats.min}</td>
      <td className="py-2 text-xs text-gray-600 text-center">{stats.max}</td>
      <td className="py-2 text-xs text-gray-600 text-center">{stats.p25}</td>
      <td className="py-2 text-xs text-gray-600 text-center">{stats.p50}</td>
      <td className="py-2 text-xs text-gray-600 text-center">{stats.p75}</td>
      <td className="py-2 text-xs text-gray-600 text-center">{stats.p90}</td>
      <td className="py-2 text-xs text-gray-600 text-center">{stats.p95}</td>
    </tr>
  );
}

function PlatformTab() {
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('enterprise');

  const activeAgg = selectedRegion === 'enterprise'
    ? enterpriseAggregation
    : regionAggregations.find(r => r.entityName === selectedRegion) || enterpriseAggregation;

  return (
    <div className="space-y-6">
      {/* C-Suite Pitch Banner */}
      <div className="rounded-xl p-6" style={{ background: 'linear-gradient(135deg, #002855 0%, #1e4d6b 100%)' }}>
        <div className="max-w-3xl">
          <h2 className="text-xl font-bold text-white mb-1">{cSuitePitch.headline}</h2>
          <p className="text-white/70 text-sm mb-4">{cSuitePitch.subheadline}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cSuitePitch.valueProps.map((prop, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-[#d4af37] flex-shrink-0 mt-0.5" />
                <span className="text-white/90 text-xs">{prop}</span>
              </div>
            ))}
          </div>
          <p className="text-[#d4af37] text-xs font-semibold mt-4 italic">{cSuitePitch.closingLine}</p>
        </div>
      </div>

      {/* Section A: Aggregation Statistics */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" style={{ color: '#1e4d6b' }} />
            <h3 className="text-sm font-bold text-gray-900">Statistical Aggregation Engine</h3>
          </div>
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700"
          >
            <option value="enterprise">Enterprise (All {enterpriseAggregation.overall.count} locations)</option>
            {regionAggregations.map(r => (
              <option key={r.entityName} value={r.entityName}>{r.entityName} ({r.overall.count} locations)</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2 pr-4">Metric</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">Mean</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">Median</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">Std Dev</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">Min</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">Max</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">P25</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">P50</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">P75</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">P90</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">P95</th>
              </tr>
            </thead>
            <tbody>
              <StatRow label="Overall Compliance" stats={activeAgg.overall} />
              <StatRow label="Food Safety" stats={activeAgg.foodSafety} />
              <StatRow label="Workplace Safety" stats={activeAgg.workplace} />
              <StatRow label="Regulatory" stats={activeAgg.regulatory} />
            </tbody>
          </table>
        </div>

        {/* Period-over-Period Changes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-100">
          {Object.entries(activeAgg.periodChanges).map(([key, change]) => (
            <div key={key} className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-[10px] text-gray-500 mb-1">{change.label}</p>
              <div className="flex items-center justify-center gap-1">
                {change.direction === 'up' ? (
                  <ArrowUp className="h-4 w-4 text-green-600" />
                ) : change.direction === 'down' ? (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                ) : (
                  <Minus className="h-4 w-4 text-gray-400" />
                )}
                <span className={`text-lg font-bold ${
                  change.direction === 'up' ? 'text-green-600' : change.direction === 'down' ? 'text-red-500' : 'text-gray-500'
                }`}>{change.direction === 'up' ? '+' : ''}{change.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section B: Data Freshness */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          <h3 className="text-sm font-bold text-gray-900">Data Freshness</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dataFreshness.map(d => (
            <div key={d.metric} className="p-3 rounded-lg border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-900">{d.metric}</span>
                <span className={`w-2 h-2 rounded-full ${
                  d.status === 'live' ? 'bg-green-500' : d.status === 'recent' ? 'bg-yellow-400' : 'bg-red-500'
                }`} />
              </div>
              <p className="text-[10px] text-gray-500">{d.interval}</p>
              <p className="text-[10px] text-gray-400 mt-1">Last: {d.lastUpdated}</p>
              <p className="text-[10px] text-gray-400">Next: {d.nextUpdate}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section C: Database Schema */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          <h3 className="text-sm font-bold text-gray-900">Database Schema — {databaseTables.length} Tables</h3>
        </div>
        <div className="space-y-2">
          {databaseTables.map(table => (
            <div key={table.name} className="border border-gray-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedTable(expandedTable === table.name ? null : table.name)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <code className="text-xs font-mono font-bold text-[#1e4d6b]">{table.name}</code>
                  <span className="text-[10px] text-gray-400">{table.rowEstimate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400">{table.columns.length} columns</span>
                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${expandedTable === table.name ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {expandedTable === table.name && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  <p className="text-[11px] text-gray-600 mb-2">{table.description}</p>
                  <p className="text-[10px] text-gray-400 mb-3">Refresh: {table.refreshSchedule}</p>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left text-[9px] uppercase text-gray-500 font-semibold pb-1">Column</th>
                        <th className="text-left text-[9px] uppercase text-gray-500 font-semibold pb-1">Type</th>
                        <th className="text-left text-[9px] uppercase text-gray-500 font-semibold pb-1">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.columns.map(col => (
                        <tr key={col.name} className="border-b border-gray-50">
                          <td className="py-1.5 text-[11px] font-mono text-gray-800">{col.name}</td>
                          <td className="py-1.5 text-[11px] font-mono text-purple-600">{col.type}</td>
                          <td className="py-1.5 text-[11px] text-gray-500">{col.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {table.indexes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="text-[9px] uppercase text-gray-500 font-semibold">Indexes: </span>
                      <span className="text-[10px] font-mono text-gray-600">{table.indexes.join(' · ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section D: Edge Functions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Server className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          <h3 className="text-sm font-bold text-gray-900">Edge Functions — {edgeFunctions.length} Functions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">Function</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">Schedule</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">Avg Runtime</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">Last Run</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">Status</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold pb-2">Dependencies</th>
              </tr>
            </thead>
            <tbody>
              {edgeFunctions.map(fn => (
                <tr key={fn.name} className="border-b border-gray-50">
                  <td className="py-2.5">
                    <code className="text-xs font-mono font-semibold text-[#1e4d6b]">{fn.name}</code>
                    <p className="text-[10px] text-gray-400 mt-0.5">{fn.description}</p>
                  </td>
                  <td className="py-2.5 text-xs text-gray-600">{fn.schedule}</td>
                  <td className="py-2.5 text-xs text-gray-600">{fn.avgRuntime}</td>
                  <td className="py-2.5 text-[11px] text-gray-500">{fn.lastRun}</td>
                  <td className="py-2.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      fn.status === 'healthy' ? 'bg-green-100 text-green-700' :
                      fn.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        fn.status === 'healthy' ? 'bg-green-500' :
                        fn.status === 'warning' ? 'bg-amber-500' :
                        'bg-red-500'
                      }`} />
                      {fn.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-[10px] font-mono text-gray-400">{fn.dependencies.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section E: Pricing Tiers */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          <h3 className="text-sm font-bold text-gray-900">Intelligence Platform Pricing</h3>
        </div>
        <p className="text-[11px] text-gray-400 mb-5">Add-on to EvidLY core platform. Volume discounts available for 500+ locations.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pricingTiers.map(tier => (
            <div
              key={tier.id}
              className={`rounded-xl p-5 border-2 ${
                tier.highlighted
                  ? 'border-[#d4af37] shadow-lg relative'
                  : 'border-gray-200'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: '#d4af37' }}>
                  <Star className="h-3 w-3" /> MOST POPULAR
                </div>
              )}
              <h4 className="text-base font-bold text-gray-900">{tier.name}</h4>
              <p className="text-[11px] text-gray-500 mb-3">{tier.description}</p>
              <p className="text-3xl font-bold mb-1" style={{ color: '#1e4d6b' }}>{tier.priceLabel}</p>
              <p className="text-[10px] text-gray-400 mb-4">{tier.locationLimit}</p>
              <ul className="space-y-2">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => toast.info(`Contact sales for ${tier.name} tier`)}
                className={`w-full mt-5 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  tier.highlighted
                    ? 'text-white hover:opacity-90'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                style={tier.highlighted ? { backgroundColor: '#1e4d6b' } : undefined}
              >
                {tier.highlighted ? 'Get Started' : 'Contact Sales'}
              </button>
            </div>
          ))}
        </div>

        {/* Enterprise Bundles */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-900 mb-3">Enterprise Bundles</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {enterpriseBundles.map((bundle, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div>
                  <p className="text-xs font-semibold text-gray-800">{bundle.name}</p>
                  <p className="text-[10px] text-gray-500">{bundle.description}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: '#d4af37' }}>Save {bundle.saving}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
