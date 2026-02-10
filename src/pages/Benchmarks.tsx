import { useState } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Award, Share2, Download,
  ChevronDown, ChevronRight, ArrowRight, Star, Shield, Crown,
  Diamond, Info, Users, MapPin, Building2, Filter, Brain, Lock,
  Trophy, Target, CheckCircle2, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { locationScores, locations, complianceScores } from '../data/demoData';

// ── Demo benchmark data ──────────────────────────────────────────────

const INDUSTRY_AVG = { overall: 79, operational: 79, equipment: 76, documentation: 81 };
const VERTICAL_AVG = { overall: 82, operational: 82, equipment: 78, documentation: 84 };
const GEOGRAPHIC_AVG = { overall: 81, operational: 80, equipment: 77, documentation: 83 };

function percentile(yourScore: number, avg: number): number {
  const diff = yourScore - avg;
  const base = 50 + (diff * 2.5);
  return Math.max(5, Math.min(99, Math.round(base)));
}

const SUBCATEGORY_DATA = [
  { name: 'Temperature compliance', yours: 96, avg: 81, unit: '%' },
  { name: 'Checklist completion rate', yours: 92, avg: 78, unit: '%' },
  { name: 'Cooling log compliance', yours: 94, avg: 75, unit: '%' },
  { name: 'Hood cleaning timeliness', yours: 88, avg: 72, unit: '%' },
  { name: 'Fire suppression currency', yours: 91, avg: 77, unit: '%' },
  { name: 'Food handler cert currency', yours: 89, avg: 82, unit: '%' },
  { name: 'Vendor document completeness', yours: 87, avg: 84, unit: '%' },
  { name: 'Corrective action response time', yours: 4.2, avg: 8.7, unit: ' hrs' },
];

const LEAD_AREAS = [
  { area: 'Temperature compliance', percentile: 96, detail: 'Your 96% compliance rate puts you ahead of 96% of peers.' },
  { area: 'Cooling log compliance', percentile: 94, detail: 'Consistent cooling log entries exceed most operators in your vertical.' },
  { area: 'Checklist completion rate', percentile: 91, detail: 'Your team completes 92% of checklists, well above the 78% average.' },
];

const LAG_AREAS = [
  {
    area: 'Vendor document completeness',
    percentile: 62,
    detail: 'Your documentation score is in the 62nd percentile. Operators in the top quartile average 98% vendor cert completeness vs your 87%.',
    recommendation: 'Follow up on 3 expired vendor certificates.',
  },
  {
    area: 'Hood cleaning timeliness',
    percentile: 68,
    detail: 'Hood cleaning intervals are longer than 72% of peers in your vertical.',
    recommendation: 'Schedule next hood cleaning within 5 days to improve this metric.',
  },
  {
    area: 'Food handler cert currency',
    percentile: 65,
    detail: '2 food handler certifications are nearing expiration, pulling you below the 82% peer average.',
    recommendation: 'Send renewal reminders to Marcus J. and Lisa P. before month-end.',
  },
];

const TREND_DATA = [
  { month: 'Mar', yours: 86, vertical: 81, industry: 78 },
  { month: 'Apr', yours: 87, vertical: 81, industry: 78 },
  { month: 'May', yours: 88, vertical: 82, industry: 79 },
  { month: 'Jun', yours: 85, vertical: 80, industry: 77 },
  { month: 'Jul', yours: 83, vertical: 79, industry: 76 },
  { month: 'Aug', yours: 84, vertical: 79, industry: 77 },
  { month: 'Sep', yours: 87, vertical: 80, industry: 78 },
  { month: 'Oct', yours: 89, vertical: 81, industry: 79 },
  { month: 'Nov', yours: 90, vertical: 82, industry: 79 },
  { month: 'Dec', yours: 91, vertical: 82, industry: 79 },
  { month: 'Jan', yours: 93, vertical: 83, industry: 80 },
  { month: 'Feb', yours: 94, vertical: 83, industry: 79 },
];

const VERTICALS = ['All EvidLY Customers', 'Restaurant', 'Healthcare', 'Senior Living', 'K-12 Education', 'Hotel', 'QSR / Fast Food'];
const SUB_VERTICALS = ['All Sub-Verticals', 'Fine Dining', 'Casual Dining', 'Fast Casual', 'Food Truck', 'Catering'];
const STATES = ['All States', 'California', 'Texas', 'New York', 'Florida'];
const COUNTIES = ['All Counties', 'Fresno County', 'Los Angeles County', 'San Francisco County', 'Orange County'];
const SIZES = ['All Sizes', 'Single Location', '2-10 Locations', '11-50 Locations', '50+ Locations'];

const BADGE_TIERS = [
  { tier: 'verified', label: 'EvidLY Verified', icon: Shield, color: '#cd7f32', bg: '#fdf4e8', desc: 'Score 80+ for 3 consecutive months', qualified: true },
  { tier: 'excellence', label: 'EvidLY Excellence', icon: Star, color: '#94a3b8', bg: '#f1f5f9', desc: 'Score 90+ for 3 consecutive months', qualified: true },
  { tier: 'elite', label: 'EvidLY Elite', icon: Crown, color: '#d4af37', bg: '#fdf8e8', desc: 'Top 10% in vertical for 3 consecutive months', qualified: false },
  { tier: 'platinum', label: 'EvidLY Platinum', icon: Diamond, color: '#818cf8', bg: '#eef2ff', desc: 'Top 5% overall for 6 consecutive months', qualified: false },
];

const LOCATION_RANKS = [
  { name: 'Downtown Kitchen', score: 92, industryPct: 89, operational: 94, equipment: 88, documentation: 91, badge: 'excellence' },
  { name: 'Airport Cafe', score: 70, industryPct: 43, operational: 72, equipment: 62, documentation: 74, badge: null },
  { name: 'University Dining', score: 55, industryPct: 22, operational: 62, equipment: 55, documentation: 42, badge: null },
];

// ── Helpers ───────────────────────────────────────────────────────────

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-semibold text-gray-800 w-10 text-right">{value}{max === 100 ? '' : ''}</span>
    </div>
  );
}

function MiniTrendChart({ data }: { data: typeof TREND_DATA }) {
  const allValues = data.flatMap(d => [d.yours, d.vertical, d.industry]);
  const min = Math.min(...allValues) - 5;
  const max = Math.max(...allValues) + 5;
  const h = 180;
  const w = 600;
  const pad = 40;

  const toX = (i: number) => pad + (i / (data.length - 1)) * (w - 2 * pad);
  const toY = (v: number) => h - pad - ((v - min) / (max - min)) * (h - 2 * pad);

  const line = (key: 'yours' | 'vertical' | 'industry') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d[key])}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Y-axis labels */}
      {[min, min + (max - min) / 2, max].map((v, i) => (
        <text key={i} x={pad - 8} y={toY(Math.round(v)) + 4} textAnchor="end" className="text-[10px] fill-gray-400">{Math.round(v)}</text>
      ))}
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={h - pad - f * (h - 2 * pad)} y2={h - pad - f * (h - 2 * pad)} stroke="#f1f5f9" strokeWidth={1} />
      ))}
      {/* Month labels */}
      {data.map((d, i) => (
        <text key={i} x={toX(i)} y={h - 12} textAnchor="middle" className="text-[9px] fill-gray-400">{d.month}</text>
      ))}
      {/* Lines */}
      <path d={line('industry')} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" />
      <path d={line('vertical')} fill="none" stroke="#60a5fa" strokeWidth={1.5} />
      <path d={line('yours')} fill="none" stroke="#d4af37" strokeWidth={2.5} />
      {/* Dots on your line */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.yours)} r={3} fill="#d4af37" />
      ))}
    </svg>
  );
}

function PercentileBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#d4af37' : '#ef4444';
  const bg = pct >= 80 ? '#f0fdf4' : pct >= 50 ? '#fdf8e8' : '#fef2f2';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: bg, color }}>
      {pct >= 80 ? <TrendingUp className="h-3 w-3" /> : pct < 50 ? <TrendingDown className="h-3 w-3" /> : null}
      {pct}th
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export function Benchmarks() {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { isDemoMode } = useDemo();
  const isPremium = false; // Standard tier demo

  const [vertical, setVertical] = useState('Restaurant');
  const [subVertical, setSubVertical] = useState('All Sub-Verticals');
  const [state, setState] = useState('California');
  const [county, setCounty] = useState('Fresno County');
  const [size, setSize] = useState('2-10 Locations');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const yourScore = complianceScores.overall;
  const industryPct = percentile(yourScore, INDUSTRY_AVG.overall);
  const verticalPct = percentile(yourScore, VERTICAL_AVG.overall);
  const geoPct = percentile(yourScore, GEOGRAPHIC_AVG.overall);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Benchmarks' }]} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-7 w-7" style={{ color: '#1e4d6b' }} />
              Compliance Benchmarks
            </h1>
            <p className="text-sm text-gray-600 mt-1">See how you compare against 2,340+ commercial kitchens on EvidLY</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" /> Filters {showFilters ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            <button
              onClick={() => alert('Report download coming in Premium tier.')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-white"
              style={{ backgroundColor: '#1e4d6b' }}
            >
              <Download className="h-4 w-4" /> Export PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Vertical</label>
                <select value={vertical} onChange={e => setVertical(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {VERTICALS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sub-Vertical</label>
                <select value={subVertical} onChange={e => setSubVertical(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {SUB_VERTICALS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
                <select value={state} onChange={e => setState(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {STATES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">County</label>
                <select value={county} onChange={e => setCounty(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {COUNTIES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Organization Size</label>
                <select value={size} onChange={e => setSize(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {SIZES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
              <Info className="h-3.5 w-3.5" />
              <span>Benchmarks only display when 10+ peers exist in the comparison group (privacy protection). Current group: <strong>187 locations</strong>.</span>
            </div>
          </div>
        )}

        {/* ── Section 1: Overall Ranking ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('overall')}>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="h-5 w-5" style={{ color: '#d4af37' }} />
              Overall Ranking
            </h2>
            {expandedSection === 'overall' ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
          </div>
          <div className={expandedSection === 'overall' ? '' : 'max-h-0 overflow-hidden'} style={expandedSection !== 'overall' ? {} : undefined}>
            {/* Always show summary row */}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* vs Industry */}
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">vs Industry Average</div>
                <div className="flex items-end justify-center gap-3">
                  <div>
                    <div className="text-3xl font-bold" style={{ color: '#1e4d6b' }}>{yourScore}</div>
                    <div className="text-xs text-gray-500">Your Score</div>
                  </div>
                  <div className="text-gray-300 text-lg pb-1">vs</div>
                  <div>
                    <div className="text-3xl font-bold text-gray-400">{INDUSTRY_AVG.overall}</div>
                    <div className="text-xs text-gray-500">Industry</div>
                  </div>
                </div>
                <div className="mt-3"><PercentileBadge pct={industryPct} /></div>
              </div>
              {/* vs Vertical */}
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">vs {vertical} Average</div>
                <div className="flex items-end justify-center gap-3">
                  <div>
                    <div className="text-3xl font-bold" style={{ color: '#1e4d6b' }}>{yourScore}</div>
                    <div className="text-xs text-gray-500">Your Score</div>
                  </div>
                  <div className="text-gray-300 text-lg pb-1">vs</div>
                  <div>
                    <div className="text-3xl font-bold text-gray-400">{VERTICAL_AVG.overall}</div>
                    <div className="text-xs text-gray-500">{vertical}</div>
                  </div>
                </div>
                <div className="mt-3"><PercentileBadge pct={verticalPct} /></div>
              </div>
              {/* vs Geographic */}
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">vs {county} Peers</div>
                <div className="flex items-end justify-center gap-3">
                  <div>
                    <div className="text-3xl font-bold" style={{ color: '#1e4d6b' }}>{yourScore}</div>
                    <div className="text-xs text-gray-500">Your Score</div>
                  </div>
                  <div className="text-gray-300 text-lg pb-1">vs</div>
                  <div>
                    <div className="text-3xl font-bold text-gray-400">{GEOGRAPHIC_AVG.overall}</div>
                    <div className="text-xs text-gray-500">Geographic</div>
                  </div>
                </div>
                <div className="mt-3"><PercentileBadge pct={geoPct} /></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Category Breakdown ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" style={{ color: '#1e4d6b' }} />
              Category Breakdown
            </h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">Category</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 px-2">Your Score</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 px-2">{vertical} Avg</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 px-2">Industry Avg</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 px-2">Percentile</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pl-4 w-40">vs Industry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { cat: 'Operational (Food Safety)', yours: complianceScores.operational, vert: VERTICAL_AVG.operational, ind: INDUSTRY_AVG.operational },
                    { cat: 'Equipment (Fire Safety)', yours: complianceScores.equipment, vert: VERTICAL_AVG.equipment, ind: INDUSTRY_AVG.equipment },
                    { cat: 'Documentation (Vendor/Certs)', yours: complianceScores.documentation, vert: VERTICAL_AVG.documentation, ind: INDUSTRY_AVG.documentation },
                    { cat: 'Overall', yours: complianceScores.overall, vert: VERTICAL_AVG.overall, ind: INDUSTRY_AVG.overall },
                  ].map((row) => {
                    const pct = percentile(row.yours, row.ind);
                    return (
                      <tr key={row.cat} className={row.cat === 'Overall' ? 'bg-gray-50 font-semibold' : ''}>
                        <td className="py-3 pr-4 text-sm text-gray-900">{row.cat}</td>
                        <td className="py-3 px-2 text-center text-sm font-bold" style={{ color: '#1e4d6b' }}>{row.yours}</td>
                        <td className="py-3 px-2 text-center text-sm text-gray-600">{row.vert}</td>
                        <td className="py-3 px-2 text-center text-sm text-gray-600">{row.ind}</td>
                        <td className="py-3 px-2 text-center"><PercentileBadge pct={pct} /></td>
                        <td className="py-3 pl-4">
                          <ScoreBar value={row.yours} color={pct >= 80 ? '#22c55e' : pct >= 50 ? '#d4af37' : '#ef4444'} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Section 3: Subcategory Deep Dive ── */}
        {!isPremium ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden relative">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                Subcategory Deep Dive
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Premium
                </span>
              </h2>
            </div>
            <div className="p-6 relative">
              <div className="filter blur-sm pointer-events-none">
                <div className="space-y-3">
                  {SUBCATEGORY_DATA.slice(0, 4).map((item) => (
                    <div key={item.name} className="flex items-center gap-4">
                      <div className="w-52 text-sm text-gray-700">{item.name}</div>
                      <ScoreBar value={typeof item.yours === 'number' ? Math.round(item.yours) : 0} color="#1e4d6b" />
                      <div className="w-16 text-xs text-gray-500 text-right">Avg: {item.avg}{item.unit}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                <div className="text-center">
                  <Lock className="h-8 w-8 mx-auto mb-2" style={{ color: '#d4af37' }} />
                  <p className="text-sm font-semibold text-gray-900 mb-1">Subcategory breakdowns are a Premium feature</p>
                  <p className="text-xs text-gray-500 mb-3">Drill into 8 specific compliance metrics vs your peers</p>
                  <button onClick={() => navigate('/settings?tab=billing')} className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: '#d4af37' }}>
                    Upgrade to Premium
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                Subcategory Deep Dive
              </h2>
            </div>
            <div className="p-6 space-y-3">
              {SUBCATEGORY_DATA.map((item) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-52 text-sm text-gray-700">{item.name}</div>
                  <ScoreBar value={typeof item.yours === 'number' ? Math.round(item.yours) : 0} color="#1e4d6b" />
                  <div className="w-20 text-xs text-gray-500 text-right">Avg: {item.avg}{item.unit}</div>
                  <PercentileBadge pct={percentile(typeof item.yours === 'number' ? Math.round(item.yours) : 0, typeof item.avg === 'number' ? Math.round(item.avg) : 0)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 4: Where You Lead / Where You Lag ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100" style={{ backgroundColor: '#f0fdf4' }}>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Where You Lead
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {LEAD_AREAS.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900">{item.area}</span>
                      <PercentileBadge pct={item.percentile} />
                    </div>
                    <p className="text-xs text-gray-600">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lag */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100" style={{ backgroundColor: '#fef2f2' }}>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Where You Lag
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {LAG_AREAS.map((item, i) => (
                <div key={i} className="p-3 rounded-lg bg-red-50/50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-gray-900">{item.area}</span>
                        <PercentileBadge pct={item.percentile} />
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{item.detail}</p>
                      <div className="flex items-start gap-2 p-2 rounded-md" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
                        <Brain className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: '#1e4d6b' }} />
                        <p className="text-xs font-medium" style={{ color: '#1e4d6b' }}>{item.recommendation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 5: Trend Analysis ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" style={{ color: '#1e4d6b' }} />
              12-Month Trend Analysis
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-6 mb-4 text-xs">
              <div className="flex items-center gap-2"><span className="w-6 h-0.5 rounded-full" style={{ backgroundColor: '#d4af37', display: 'inline-block' }} /><span className="text-gray-600 font-medium">Your Score</span></div>
              <div className="flex items-center gap-2"><span className="w-6 h-0.5 rounded-full" style={{ backgroundColor: '#60a5fa', display: 'inline-block' }} /><span className="text-gray-600 font-medium">{vertical} Average</span></div>
              <div className="flex items-center gap-2"><span className="w-6 h-0.5 rounded-full border-dashed border-t-2 border-gray-400" style={{ display: 'inline-block' }} /><span className="text-gray-600 font-medium">Industry Average</span></div>
            </div>
            <MiniTrendChart data={TREND_DATA} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-3 rounded-lg bg-gray-50 text-center">
                <div className="text-xs text-gray-500 mb-1">Q4 vs Q3 Change</div>
                <div className="text-lg font-bold text-green-600">+4 pts</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 text-center">
                <div className="text-xs text-gray-500 mb-1">Seasonal Pattern</div>
                <div className="text-sm font-semibold text-gray-800">Summer dip in Jul (-4 pts), recovery by Sep</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 text-center">
                <div className="text-xs text-gray-500 mb-1">Predicted Next Quarter</div>
                <div className="text-lg font-bold" style={{ color: '#1e4d6b' }}>95 <span className="text-xs font-normal text-gray-500">(+1 projected)</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Multi-Location Internal Leaderboard ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5" style={{ color: '#1e4d6b' }} />
              Multi-Location Leaderboard
            </h2>
            <p className="text-xs text-gray-500 mt-1">Rank your locations against each other and industry peers</p>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">#</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Location</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3">Score</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3">Industry Pct</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3">Operational</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3">Equipment</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3">Documentation</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3">Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {LOCATION_RANKS.map((loc, i) => (
                    <tr key={i} className={i === 0 ? 'bg-green-50/30' : i === LOCATION_RANKS.length - 1 ? 'bg-red-50/30' : ''}>
                      <td className="py-3 text-sm font-bold text-gray-500">{i + 1}</td>
                      <td className="py-3 text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {loc.name}
                        {i === 0 && <span className="text-xs text-green-600 font-medium">Best</span>}
                        {i === LOCATION_RANKS.length - 1 && <span className="text-xs text-red-500 font-medium">Needs Attention</span>}
                      </td>
                      <td className="py-3 text-center text-sm font-bold" style={{ color: '#1e4d6b' }}>{loc.score}</td>
                      <td className="py-3 text-center"><PercentileBadge pct={loc.industryPct} /></td>
                      <td className="py-3 text-center text-sm text-gray-600">{loc.operational}</td>
                      <td className="py-3 text-center text-sm text-gray-600">{loc.equipment}</td>
                      <td className="py-3 text-center text-sm text-gray-600">{loc.documentation}</td>
                      <td className="py-3 text-center">
                        {loc.badge ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                            <Star className="h-3 w-3" /> {loc.badge}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cross-Location Patterns */}
            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4" style={{ color: '#1e4d6b' }} />
                Cross-Location Patterns
              </h3>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Downtown Kitchen</strong> leads in all 3 categories — consistent management practices are the key differentiator.</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Documentation</strong> is the weakest category across all locations (systemic issue) — vendor cert follow-up process needs standardization.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span><strong>University Dining</strong> has declined 8 points in Equipment over 3 months — correlates with manager vacancy Aug-Oct.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Shareable Badges & Certificates ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Award className="h-5 w-5" style={{ color: '#d4af37' }} />
              Shareable Badges & Certificates
            </h2>
            <p className="text-xs text-gray-500 mt-1">Earn and share compliance badges with customers, insurers, and franchise partners</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {BADGE_TIERS.map((badge) => (
                <div
                  key={badge.tier}
                  className="relative rounded-xl p-5 text-center border-2 transition-all"
                  style={{
                    backgroundColor: badge.bg,
                    borderColor: badge.qualified ? badge.color : '#e5e7eb',
                    opacity: badge.qualified ? 1 : 0.7,
                  }}
                >
                  {badge.qualified && (
                    <div className="absolute -top-2 -right-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 bg-white rounded-full" />
                    </div>
                  )}
                  <badge.icon className="h-10 w-10 mx-auto mb-3" style={{ color: badge.color }} />
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{badge.label}</h3>
                  <p className="text-xs text-gray-500 mb-3">{badge.desc}</p>
                  {badge.qualified ? (
                    <div className="space-y-2">
                      <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Qualified</span>
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => alert('Badge image downloaded!')} className="p-1.5 rounded-lg hover:bg-white/50" title="Download">
                          <Download className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                        <button onClick={() => alert('Share link copied to clipboard!')} className="p-1.5 rounded-lg hover:bg-white/50" title="Share">
                          <Share2 className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                        <button onClick={() => navigate(`/verify/DWN-2024-EXCL`)} className="p-1.5 rounded-lg hover:bg-white/50" title="View public page">
                          <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">Not Yet Qualified</span>
                  )}
                </div>
              ))}
            </div>

            {/* Share CTA */}
            <div className="mt-6 p-4 rounded-lg border border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Share your achievements</h3>
                <p className="text-xs text-gray-500 mt-0.5">Pre-written posts for LinkedIn, Facebook, and more. Include in insurance apps, franchise evaluations, and RFPs.</p>
              </div>
              <div className="flex items-center gap-2">
                {['LinkedIn', 'Facebook', 'X'].map(platform => (
                  <button
                    key={platform}
                    onClick={() => alert(`Share to ${platform} — coming soon!`)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── EvidLY Compliance Index (Quarterly Public Report) ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100" style={{ backgroundColor: '#fdf8e8' }}>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" style={{ color: '#d4af37' }} />
              EvidLY Compliance Index — Q4 2025
            </h2>
            <p className="text-xs text-gray-600 mt-1">Quarterly public report based on anonymized data from 2,340+ commercial kitchens</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <div className="text-2xl font-bold text-gray-800">79</div>
                <div className="text-xs text-gray-500">Industry Avg Score</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <div className="text-2xl font-bold text-green-600">+2</div>
                <div className="text-xs text-gray-500">vs Q3 2025</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <div className="text-2xl font-bold text-gray-800">2,340</div>
                <div className="text-xs text-gray-500">Kitchens Sampled</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <div className="text-2xl font-bold text-gray-800">14</div>
                <div className="text-xs text-gray-500">Counties Covered</div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-bold text-gray-900">Score by Vertical</h3>
              {[
                { vertical: 'Healthcare', score: 84 },
                { vertical: 'Senior Living', score: 82 },
                { vertical: 'Restaurant', score: 79 },
                { vertical: 'Hotel', score: 78 },
                { vertical: 'K-12 Education', score: 77 },
                { vertical: 'QSR / Fast Food', score: 74 },
              ].map((v) => (
                <div key={v.vertical} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-gray-600">{v.vertical}</div>
                  <ScoreBar value={v.score} color="#1e4d6b" />
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-6">
              <h3 className="text-sm font-bold text-gray-900">Top Compliance Gaps (Industry-Wide)</h3>
              {[
                'Vendor document expiration management (38% of kitchens have at least 1 expired vendor cert)',
                'Cooling log completion (only 62% completion rate industry-wide)',
                'Fire suppression system inspection currency (22% overdue)',
                'Food handler certification tracking (19% have expired certs on staff)',
              ].map((gap, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <span className="font-bold text-gray-400 mt-px">{i + 1}.</span>
                  <span>{gap}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
              <div className="text-sm">
                <span className="font-semibold text-gray-900">Full Q4 2025 Report</span>
                <span className="text-gray-500 ml-2 text-xs">Published Jan 15, 2026 — 24 pages</span>
              </div>
              <button onClick={() => alert('PDF download coming soon — public report will be available at evidly.com/index')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg text-white" style={{ backgroundColor: '#1e4d6b' }}>
                <Download className="h-3.5 w-3.5" /> Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Network Effect CTA */}
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
          <Users className="h-8 w-8 mx-auto mb-2" style={{ color: '#1e4d6b' }} />
          <h3 className="text-lg font-bold text-gray-900 mb-1">Based on data from 2,340+ commercial kitchens</h3>
          <p className="text-sm text-gray-600 mb-3">The more kitchens on EvidLY, the more accurate your benchmarks become. Share with peers to strengthen the network.</p>
          <button onClick={() => alert('Referral link copied!')} className="px-4 py-2 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: '#1e4d6b' }}>
            Invite a Peer Kitchen
          </button>
        </div>
      </div>
    </>
  );
}
