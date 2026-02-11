import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, ArrowUp, ArrowDown,
  Minus, Search, Download, ChevronRight, ExternalLink, Share2,
  Flame, UtensilsCrossed, FileText, BarChart3, Users, Target, Zap,
  Clock, Activity, Eye, Shield, CalendarDays,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
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

type Tab = 'command' | 'compare' | 'trends' | 'risk';

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'command', label: 'Command Center', icon: BarChart3 },
  { id: 'compare', label: 'Compare', icon: Users },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'risk', label: 'Risk Intelligence', icon: Shield },
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
            { label: 'Documentation', score: DOCS_SCORE, trend: DOCS_TREND, icon: FileText, status: DOCS_SCORE >= 90 ? 'green' : DOCS_SCORE >= 80 ? 'yellow' : 'red' },
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
        <button onClick={() => alert('View urgent locations — coming soon')} className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
            <h3 className="text-xs font-semibold text-gray-900">Urgent Attention</h3>
          </div>
          <p className="text-2xl font-bold text-red-600">{urgentLocations.belowThreshold}</p>
          <p className="text-[11px] text-gray-500 mt-1">locations below {urgentLocations.threshold} — <span className="text-red-600 font-semibold">{urgentLocations.critical} critical (&lt;60)</span></p>
          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><ChevronRight className="h-3 w-3" /> View sorted by score</p>
        </button>

        {/* Card 2 — Expiring This Quarter */}
        <button onClick={() => alert('View expiration calendar — coming soon')} className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-shadow cursor-pointer">
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
        <button onClick={() => alert('View incident analytics — coming soon')} className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-shadow cursor-pointer">
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
        <button onClick={() => alert('View location movement analysis — coming soon')} className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-shadow cursor-pointer">
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
            <Line type="monotone" dataKey="docs" name="Documentation" stroke="#6b21a8" strokeWidth={1.5} dot={false} />
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
                    <button onClick={() => alert(insight.drillDownLabel + ' — coming soon')} className="text-[10px] font-medium text-[#1e4d6b] hover:underline cursor-pointer flex items-center gap-0.5">
                      <ChevronRight className="h-3 w-3" />{insight.drillDownLabel}
                    </button>
                    <button onClick={() => alert('Share insight — coming soon')} className="text-[10px] font-medium text-gray-400 hover:text-gray-600 cursor-pointer flex items-center gap-0.5">
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
              <button onClick={() => alert('Export to Excel — coming soon')} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                    <tr key={loc.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => alert(`View ${loc.name} — coming soon`)}>
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
                      <button onClick={() => alert('Assign mitigation plan — coming soon')} className="px-3 py-1.5 text-[10px] font-medium rounded-md cursor-pointer text-white" style={{ backgroundColor: '#1e4d6b' }}>Assign Plan</button>
                      <button onClick={() => alert('Export mitigation plan — coming soon')} className="px-3 py-1.5 text-[10px] font-medium rounded-md border border-gray-200 text-gray-600 cursor-pointer hover:bg-gray-50">Export PDF</button>
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
