import { useState } from 'react';
import { toast } from 'sonner';
import {
  BarChart3, TrendingUp, TrendingDown, Download, Share2, ArrowRight,
  AlertTriangle, CheckCircle2, Brain, Info, Users, MapPin, Building2,
  FileText, Calendar, Shield, BookOpen, Sparkles, ExternalLink,
  ChevronDown, ChevronRight, Scale, Flame, ThermometerSun,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

// ── Q4 2025 Demo Report Data ──────────────────────────────────────────

const REPORT = {
  quarter: 4,
  year: 2025,
  published: 'January 15, 2026',
  totalLocations: 2340,
  totalOrganizations: 890,
  counties: 14,
  states: 1,
  overallScore: 79,
  prevQuarterScore: 77,
  quarterChange: +2,
  yearAgoScore: 74,
  yearChange: +5,
};

const VERTICAL_SCORES = [
  { vertical: 'Healthcare', score: 84, prev: 83, change: +1, locations: 312 },
  { vertical: 'Senior Living', score: 82, prev: 80, change: +2, locations: 186 },
  { vertical: 'Restaurant', score: 79, prev: 77, change: +2, locations: 891 },
  { vertical: 'Hotel', score: 78, prev: 76, change: +2, locations: 267 },
  { vertical: 'K-12 Education', score: 77, prev: 76, change: +1, locations: 423 },
  { vertical: 'QSR / Fast Food', score: 74, prev: 72, change: +2, locations: 261 },
];

const STATE_SCORES = [
  { state: 'California', score: 79, locations: 2340, counties: 14 },
];

const COUNTY_SCORES = [
  { county: 'San Francisco', score: 84, locations: 342, change: +3 },
  { county: 'Los Angeles', score: 81, locations: 567, change: +2 },
  { county: 'Orange', score: 80, locations: 289, change: +1 },
  { county: 'San Diego', score: 79, locations: 234, change: +2 },
  { county: 'Fresno', score: 78, locations: 178, change: +4 },
  { county: 'Sacramento', score: 77, locations: 156, change: +1 },
  { county: 'Alameda', score: 77, locations: 134, change: +2 },
  { county: 'Santa Clara', score: 76, locations: 112, change: 0 },
  { county: 'Riverside', score: 75, locations: 98, change: -1 },
  { county: 'San Bernardino', score: 74, locations: 72, change: +1 },
  { county: 'Ventura', score: 74, locations: 56, change: +2 },
  { county: 'Kern', score: 73, locations: 42, change: +3 },
  { county: 'Stanislaus', score: 72, locations: 34, change: 0 },
  { county: 'Merced', score: 71, locations: 26, change: -2 },
];

const CATEGORY_SCORES = [
  { category: 'Operational (Food Safety)', score: 79, prev: 77, change: +2, weakest: false },
  { category: 'Equipment (Fire Safety)', score: 76, prev: 74, change: +2, weakest: true },
  { category: 'Documentation & Permits', score: 81, prev: 80, change: +1, weakest: false },
];

const TRENDING_AREAS = {
  improving: [
    { area: 'Temperature monitoring compliance', change: '+6%', detail: 'Driven by adoption of IoT sensors and automated logging across 34% of locations' },
    { area: 'Checklist completion rates', change: '+4%', detail: 'Mobile-first checklists and shift reminders increasing completion by 4 points QoQ' },
    { area: 'Vendor document management', change: '+3%', detail: 'Automated expiration alerts reducing lapsed vendor certifications' },
  ],
  declining: [
    { area: 'Fire suppression inspection currency', change: '-2%', detail: 'Vendor scheduling delays causing 22% of locations to fall behind on hood suppression inspections' },
    { area: 'HACCP plan updates', change: '-1%', detail: 'Menu changes outpacing HACCP plan revisions at 18% of restaurant locations' },
    { area: 'New employee orientation compliance', change: '-1%', detail: 'High turnover in QSR vertical leading to training gaps' },
  ],
};

const TOP_VIOLATIONS = [
  { rank: 1, violation: 'Expired or missing vendor certificates', pct: 38, severity: 'high', detail: '38% of kitchens have at least 1 expired vendor certificate on file' },
  { rank: 2, violation: 'Incomplete cooling logs', pct: 38, severity: 'high', detail: 'Only 62% completion rate industry-wide. Cooling logs are the most commonly skipped documentation' },
  { rank: 3, violation: 'Overdue fire suppression inspection', pct: 22, severity: 'high', detail: '22% of locations are past-due on hood suppression system inspection or cleaning' },
  { rank: 4, violation: 'Expired food handler certifications', pct: 19, severity: 'medium', detail: '19% of kitchens have at least one staff member with expired food handler certification' },
  { rank: 5, violation: 'Missing daily temperature logs', pct: 16, severity: 'medium', detail: '16% of locations have gaps of 2+ days in temperature monitoring within the quarter' },
  { rank: 6, violation: 'Incomplete opening/closing checklists', pct: 14, severity: 'medium', detail: 'Most common in QSR and fast casual segments, particularly on weekend shifts' },
  { rank: 7, violation: 'Out-of-date HACCP plans', pct: 12, severity: 'low', detail: 'HACCP plans not updated within 12 months at 12% of locations' },
  { rank: 8, violation: 'Missing equipment maintenance records', pct: 11, severity: 'low', detail: 'Walk-in cooler and freezer maintenance documentation gaps' },
  { rank: 9, violation: 'Incomplete corrective action documentation', pct: 9, severity: 'low', detail: 'When violations occur, 9% lack written corrective actions within 48 hours' },
  { rank: 10, violation: 'Health permit display compliance', pct: 7, severity: 'low', detail: 'Health permits not displayed in required location or not current' },
];

const SEASONAL_DATA = [
  { quarter: 'Q1 2025', score: 78, note: 'Post-holiday recovery — annual inspection season drives compliance focus' },
  { quarter: 'Q2 2025', score: 79, note: 'Spring improvement — new budget cycles enable equipment upgrades and training' },
  { quarter: 'Q3 2025', score: 77, note: 'Summer dip — staffing challenges, higher turnover, increased volume strain operations' },
  { quarter: 'Q4 2025', score: 79, note: 'Holiday rebound — year-end push to close compliance gaps before annual reviews' },
];

const REGULATORY_IMPACT = [
  {
    law: 'AB 660 — Food Safety Modernization',
    status: 'Effective January 1, 2026',
    impact: 'Pre-compliance adoption already visible: locations aware of AB 660 show 8% higher documentation readiness than unaware peers. Requires digital record-keeping for temperature logs and corrective actions.',
    scoreEffect: '+3 pts for prepared locations',
    preparedness: 67,
  },
  {
    law: 'SB 68 — Commercial Kitchen Equipment Standards',
    status: 'Effective July 1, 2026',
    impact: 'New maintenance documentation requirements for commercial kitchen equipment. Early adopters of equipment tracking systems rank 12 points higher on equipment readiness.',
    scoreEffect: '+5 pts projected for early adopters',
    preparedness: 42,
  },
  {
    law: 'County Health Dept — Digital Inspection Integration',
    status: 'Pilot program (3 counties)',
    impact: 'Los Angeles, San Francisco, and Orange County piloting digital inspection integration. Locations using EvidLY in pilot counties have 15% faster inspection resolution.',
    scoreEffect: '+2 pts in pilot counties',
    preparedness: 23,
  },
];

const PREDICTIONS = [
  { metric: 'Overall Industry Score', current: 79, predicted: 81, direction: 'up', reason: 'AB 660 preparation driving documentation improvements' },
  { metric: 'Equipment Readiness', current: 76, predicted: 78, direction: 'up', reason: 'SB 68 awareness increasing preventive maintenance adoption' },
  { metric: 'Operational Readiness', current: 79, predicted: 80, direction: 'up', reason: 'IoT sensor adoption continuing to improve temperature monitoring' },
  { metric: 'Documentation Readiness', current: 81, predicted: 83, direction: 'up', reason: 'Digital record-keeping mandates accelerating paper-to-digital transition' },
];

const BLOG_IDEAS = [
  { title: 'Top 5 compliance gaps California restaurants need to fix in 2026', type: 'Listicle', targetAudience: 'Restaurant operators' },
  { title: 'Healthcare kitchens outperform restaurants in documentation — here\'s why', type: 'Analysis', targetAudience: 'Cross-vertical operators' },
  { title: 'How AB 660 is already changing readiness levels before it takes effect', type: 'Regulatory', targetAudience: 'Industry leaders, media' },
  { title: 'The summer compliance dip: why Q3 is every kitchen\'s weakest quarter', type: 'Seasonal', targetAudience: 'Operations managers' },
  { title: 'County-by-county: where California kitchens rank on food safety', type: 'Geographic', targetAudience: 'Local media, health depts' },
  { title: '2,340 kitchens, one trend: temperature monitoring is getting better', type: 'Trend', targetAudience: 'Technology buyers' },
];

// ── Helpers ──────────────────────────────────────────────────────────

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-semibold text-gray-800 w-8 text-right">{value}</span>
    </div>
  );
}

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) return <span className="text-xs font-bold text-green-600 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> +{change}</span>;
  if (change < 0) return <span className="text-xs font-bold text-red-500 flex items-center gap-0.5"><TrendingDown className="h-3 w-3" /> {change}</span>;
  return <span className="text-xs font-bold text-gray-400">—</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { bg: string; color: string }> = {
    high: { bg: '#fef2f2', color: '#dc2626' },
    medium: { bg: '#fdf8e8', color: '#d97706' },
    low: { bg: '#f0fdf4', color: '#16a34a' },
  };
  const c = config[severity] || config.low;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ backgroundColor: c.bg, color: c.color }}>{severity}</span>;
}

function SectionHeader({ icon: Icon, title, number, children }: { icon: any; title: string; number: number; children?: React.ReactNode }) {
  return (
    <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#1e4d6b' }}>{number}</span>
        <Icon className="h-5 w-5" style={{ color: '#1e4d6b' }} />
        {title}
      </h2>
      {children}
    </div>
  );
}

function QuarterlyTrendChart({ data }: { data: typeof SEASONAL_DATA }) {
  const h = 140;
  const w = 500;
  const pad = 40;
  const scores = data.map(d => d.score);
  const min = Math.min(...scores) - 3;
  const max = Math.max(...scores) + 3;

  const toX = (i: number) => pad + (i / (data.length - 1)) * (w - 2 * pad);
  const toY = (v: number) => h - pad - ((v - min) / (max - min)) * (h - 2 * pad);

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.score)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 160 }}>
      {[0, 0.5, 1].map((f, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={h - pad - f * (h - 2 * pad)} y2={h - pad - f * (h - 2 * pad)} stroke="#f1f5f9" strokeWidth={1} />
      ))}
      {data.map((d, i) => (
        <text key={i} x={toX(i)} y={h - 10} textAnchor="middle" className="text-[10px] fill-gray-500" fontWeight={600}>{d.quarter}</text>
      ))}
      {[min, (min + max) / 2, max].map((v, i) => (
        <text key={i} x={pad - 8} y={toY(Math.round(v)) + 4} textAnchor="end" className="text-[9px] fill-gray-400">{Math.round(v)}</text>
      ))}
      <path d={line} fill="none" stroke="#1e4d6b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.score)} r={5} fill="white" stroke="#1e4d6b" strokeWidth={2} />
          <text x={toX(i)} y={toY(d.score) - 10} textAnchor="middle" className="text-[11px] fill-gray-800" fontWeight={700}>{d.score}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function ComplianceIndex() {
  const navigate = useNavigate();
  const [expandedViolation, setExpandedViolation] = useState<number | null>(null);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Benchmarks', href: '/benchmarks' }, { label: 'Compliance Index' }]} />

      <div className="space-y-6">
        {/* Report Header */}
        <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-xl p-4 sm:p-8 text-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Shield className="h-10 w-10" style={{ color: '#d4af37' }} />
                <div>
                  <h1 className="text-2xl font-bold">EvidLY Compliance Index</h1>
                  <p className="text-sm text-gray-200">Q{REPORT.quarter} {REPORT.year} — California Commercial Kitchens</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 max-w-xl">
                The definitive quarterly benchmark of commercial kitchen compliance across California.
                Based on anonymized, aggregated data from {REPORT.totalLocations.toLocaleString()} locations
                across {REPORT.counties} counties.
              </p>
              <p className="text-xs text-gray-400 mt-2">Published {REPORT.published} | All data fully anonymized | Minimum 50 data points per segment</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => guardAction('download', 'compliance reports', () => toast.info('PDF download coming soon'))}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
                style={{ backgroundColor: '#d4af37', color: '#1e4d6b' }}
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
              <button
                onClick={() => guardAction('export', 'compliance reports', () => toast.success('Report link copied'))}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/30 text-white hover:bg-white/10"
              >
                <Share2 className="h-4 w-4" /> Share Report
              </button>
            </div>
          </div>

          {/* Key stats row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-xl sm:text-3xl font-bold">{REPORT.overallScore}</div>
              <div className="text-xs text-gray-300">Industry Index</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">+{REPORT.quarterChange}</div>
              <div className="text-xs text-gray-300">vs Q{REPORT.quarter - 1 || 4} {REPORT.quarter === 1 ? REPORT.year - 1 : REPORT.year}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">+{REPORT.yearChange}</div>
              <div className="text-xs text-gray-300">vs Q{REPORT.quarter} {REPORT.year - 1}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{REPORT.totalLocations.toLocaleString()}</div>
              <div className="text-xs text-gray-300">Kitchens Sampled</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{REPORT.counties}</div>
              <div className="text-xs text-gray-300">Counties Covered</div>
            </div>
          </div>
        </div>

        {/* ── 1. Executive Summary ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <SectionHeader icon={FileText} title="Executive Summary" number={1} />
          <div className="p-4 sm:p-6">
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-gray-700 leading-relaxed">
                California's commercial kitchen compliance landscape continued its upward trajectory in Q4 2025,
                with the industry readiness index reaching <strong>79 points</strong> — up 2 points from Q3 and
                5 points higher than the same period last year. This marks the third consecutive quarter of improvement,
                driven primarily by advances in <strong>temperature monitoring technology</strong> and increased adoption
                of <strong>digital compliance platforms</strong>.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed mt-3">
                The healthcare vertical continues to lead at <strong>84 points</strong>, while QSR/Fast Food remains
                the lowest-scoring segment at <strong>74 points</strong>, though both improved quarter-over-quarter.
                Notably, the gap between the top and bottom verticals narrowed from 14 points to 10 points over the
                past year — suggesting that compliance best practices are spreading across the industry.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed mt-3">
                Looking ahead, <strong>AB 660</strong> (Food Safety Modernization, effective January 2026) is already
                influencing behavior — locations aware of the upcoming mandate show 8% higher documentation readiness.
                We project the industry average will reach <strong>81 by Q1 2026</strong> as compliance efforts
                accelerate ahead of the new regulatory requirements.
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. Overall Industry Score ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <SectionHeader icon={BarChart3} title="Overall Industry Score" number={2} />
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-4 sm:gap-8 mb-6 flex-wrap">
              <div className="text-center">
                <div className="text-3xl sm:text-5xl font-bold" style={{ color: '#1e4d6b' }}>{REPORT.overallScore}</div>
                <div className="text-sm text-gray-500 mt-1">Q{REPORT.quarter} {REPORT.year}</div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-bold text-green-600">+{REPORT.quarterChange} pts from Q{REPORT.quarter - 1 || 4}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-bold text-green-600">+{REPORT.yearChange} pts year-over-year</span>
                  </div>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${REPORT.overallScore}%`, backgroundColor: '#1e4d6b' }} />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                  <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 text-sm text-gray-600">
              <strong>Methodology:</strong> The overall industry score is a weighted average across three compliance domains
              (Operational 50%, Equipment 25%, Documentation 25%) calculated from {REPORT.totalLocations.toLocaleString()} active
              locations on the EvidLY platform. All data is anonymized before aggregation.
            </div>
          </div>
        </div>

        {/* ── 3. Score by Vertical ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <SectionHeader icon={Building2} title="Score by Vertical" number={3} />
          <div className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Vertical</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3">Q4 Score</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3 hidden sm:table-cell">Q3 Score</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3">Change</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3 hidden sm:table-cell">Locations</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3 pl-4 w-48 hidden sm:table-cell">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {VERTICAL_SCORES.map((v) => (
                    <tr key={v.vertical}>
                      <td className="py-3 text-sm font-medium text-gray-900">{v.vertical}</td>
                      <td className="py-3 text-center text-sm font-bold" style={{ color: '#1e4d6b' }}>{v.score}</td>
                      <td className="py-3 text-center text-sm text-gray-500 hidden sm:table-cell">{v.prev}</td>
                      <td className="py-3 text-center"><ChangeIndicator change={v.change} /></td>
                      <td className="py-3 text-center text-sm text-gray-500 hidden sm:table-cell">{v.locations.toLocaleString()}</td>
                      <td className="py-3 pl-4 hidden sm:table-cell"><ScoreBar value={v.score} color={v.score >= 80 ? '#22c55e' : v.score >= 75 ? '#d4af37' : '#ef4444'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
              <Brain className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#1e4d6b' }} />
              <p className="text-xs" style={{ color: '#1e4d6b' }}>
                <strong>Key insight:</strong> Healthcare leads due to existing regulatory infrastructure (Joint Commission, CMS).
                The vertical gap is narrowing — QSR improved by 8 points year-over-year, the fastest improvement of any vertical.
              </p>
            </div>
          </div>
        </div>

        {/* ── 4. Score by State & County ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <SectionHeader icon={MapPin} title="Score by State — California County Breakdown" number={4} />
          <div className="p-4 sm:p-6">
            <p className="text-sm text-gray-600 mb-4">
              EvidLY currently operates across {REPORT.counties} California counties. County-level data requires minimum 20 locations per county.
              Geographic expansion to additional states is planned for 2026.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">County</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3">Score</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3">QoQ Change</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3 hidden sm:table-cell">Locations</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3 pl-4 w-40 hidden sm:table-cell">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {COUNTY_SCORES.map((c) => (
                    <tr key={c.county}>
                      <td className="py-2.5 text-sm text-gray-900 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        {c.county} County
                      </td>
                      <td className="py-2.5 text-center text-sm font-bold" style={{ color: '#1e4d6b' }}>{c.score}</td>
                      <td className="py-2.5 text-center"><ChangeIndicator change={c.change} /></td>
                      <td className="py-2.5 text-center text-xs text-gray-500 hidden sm:table-cell">{c.locations}</td>
                      <td className="py-2.5 pl-4 hidden sm:table-cell"><ScoreBar value={c.score} color={c.score >= 80 ? '#22c55e' : c.score >= 75 ? '#d4af37' : '#ef4444'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
              <Brain className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#1e4d6b' }} />
              <p className="text-xs" style={{ color: '#1e4d6b' }}>
                <strong>Key insight:</strong> San Francisco leads at 84, likely due to stricter local health department enforcement.
                Fresno County showed the largest improvement (+4 pts) — correlating with a county health department initiative
                promoting digital compliance tracking.
              </p>
            </div>
          </div>
        </div>

        {/* ── 5. Score by Category ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <SectionHeader icon={BarChart3} title="Score by Category" number={5} />
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {CATEGORY_SCORES.map((c) => (
                <div key={c.category} className={`p-4 rounded-xl border ${c.weakest ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{c.category}</div>
                  <div className="flex items-end gap-2">
                    <span className="text-xl sm:text-3xl font-bold" style={{ color: '#1e4d6b' }}>{c.score}</span>
                    <ChangeIndicator change={c.change} />
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.score}%`, backgroundColor: c.weakest ? '#ef4444' : '#1e4d6b' }} />
                  </div>
                  {c.weakest && (
                    <div className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Weakest category industry-wide
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600">
              <strong>Equipment readiness</strong> remains the weakest domain at 76 index points, primarily driven by overdue fire suppression
              inspections and deferred maintenance scheduling. Documentation leads at 81 index points, benefiting from the industry's shift
              toward digital record-keeping platforms.
            </p>
          </div>
        </div>

        {/* ── 6. Trending Up/Down ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <SectionHeader icon={TrendingUp} title="Trending Up / Down" number={6} />
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Improving */}
              <div>
                <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Improving Areas
                </h3>
                <div className="space-y-3">
                  {TRENDING_AREAS.improving.map((item, i) => (
                    <div key={i} className="p-3 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-900">{item.area}</span>
                        <span className="text-xs font-bold text-green-600">{item.change}</span>
                      </div>
                      <p className="text-xs text-gray-600">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Declining */}
              <div>
                <h3 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-1.5">
                  <TrendingDown className="h-4 w-4" /> Declining Areas
                </h3>
                <div className="space-y-3">
                  {TRENDING_AREAS.declining.map((item, i) => (
                    <div key={i} className="p-3 rounded-lg bg-red-50 border border-red-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-900">{item.area}</span>
                        <span className="text-xs font-bold text-red-500">{item.change}</span>
                      </div>
                      <p className="text-xs text-gray-600">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 7. Top Violations ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <SectionHeader icon={AlertTriangle} title="Top 10 Compliance Gaps" number={7} />
          <div className="p-4 sm:p-6">
            <p className="text-sm text-gray-600 mb-4">
              Most common compliance gaps across all {REPORT.totalLocations.toLocaleString()} sampled kitchens, ranked by prevalence.
            </p>
            <div className="space-y-2">
              {TOP_VIOLATIONS.map((v) => (
                <div
                  key={v.rank}
                  className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-gray-300 transition-colors"
                  onClick={() => setExpandedViolation(expandedViolation === v.rank ? null : v.rank)}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1e4d6b' }}>
                      {v.rank}
                    </span>
                    <span className="flex-1 text-sm font-medium text-gray-900">{v.violation}</span>
                    <SeverityBadge severity={v.severity} />
                    <span className="text-sm font-bold" style={{ color: '#1e4d6b' }}>{v.pct}%</span>
                    {expandedViolation === v.rank ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </div>
                  {expandedViolation === v.rank && (
                    <div className="px-4 pb-3 border-t border-gray-100 pt-2">
                      <p className="text-xs text-gray-600">{v.detail}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 8. Seasonal Insights ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <SectionHeader icon={Calendar} title="Seasonal Insights" number={8} />
          <div className="p-4 sm:p-6">
            <QuarterlyTrendChart data={SEASONAL_DATA} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
              {SEASONAL_DATA.map((s) => (
                <div key={s.quarter} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="w-16 flex-shrink-0">
                    <div className="text-lg font-bold" style={{ color: '#1e4d6b' }}>{s.score}</div>
                    <div className="text-[10px] text-gray-500 font-medium">{s.quarter}</div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{s.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
              <Brain className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#1e4d6b' }} />
              <p className="text-xs" style={{ color: '#1e4d6b' }}>
                <strong>Pattern:</strong> Q3 consistently shows a compliance dip due to summer staffing challenges and increased volume.
                Operators who implement seasonal compliance checklists and temp-staff training programs mitigate this effect by 60%.
              </p>
            </div>
          </div>
        </div>

        {/* ── 9. Regulatory Impact ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <SectionHeader icon={Scale} title="Regulatory Impact" number={9} />
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 mb-2">
              How new and upcoming legislation is affecting compliance behavior and scores.
            </p>
            {REGULATORY_IMPACT.map((reg, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{reg.law}</h3>
                    <span className="text-xs font-medium text-amber-600">{reg.status}</span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>
                    {reg.scoreEffect}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-3">{reg.impact}</p>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 font-medium uppercase">Industry Preparedness</span>
                    <span className="text-xs font-bold text-gray-700">{reg.preparedness}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${reg.preparedness}%`,
                        backgroundColor: reg.preparedness >= 60 ? '#22c55e' : reg.preparedness >= 40 ? '#d4af37' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 10. Predictions ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <SectionHeader icon={Sparkles} title="Q1 2026 Predictions" number={10} />
          <div className="p-4 sm:p-6">
            <p className="text-sm text-gray-600 mb-4">
              Projections based on current trajectories, regulatory calendar, and seasonal patterns.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Metric</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3">Current</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3">Predicted Q1</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase pb-3">Change</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3 pl-4 hidden sm:table-cell">Reasoning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {PREDICTIONS.map((p) => (
                    <tr key={p.metric}>
                      <td className="py-3 text-sm font-medium text-gray-900">{p.metric}</td>
                      <td className="py-3 text-center text-sm text-gray-600">{p.current}</td>
                      <td className="py-3 text-center text-sm font-bold" style={{ color: '#1e4d6b' }}>{p.predicted}</td>
                      <td className="py-3 text-center">
                        <span className="text-xs font-bold text-green-600 flex items-center justify-center gap-0.5">
                          <TrendingUp className="h-3 w-3" /> +{p.predicted - p.current}
                        </span>
                      </td>
                      <td className="py-3 pl-4 text-xs text-gray-600 hidden sm:table-cell">{p.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 rounded-lg border border-amber-200 bg-amber-50">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>Disclaimer:</strong> Predictions are based on historical patterns, current trends, and known regulatory changes.
                  Actual results may vary based on individual operator actions, unforeseen regulatory changes, and economic conditions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Blog Content Ideas ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100" style={{ backgroundColor: '#fdf8e8' }}>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5" style={{ color: '#d4af37' }} />
              Content Ideas from This Report
            </h2>
            <p className="text-xs text-gray-600 mt-1">Auto-generated topics for blogs, press releases, and social campaigns</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BLOG_IDEAS.map((idea, i) => (
                <div key={i} className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#eef4f8' }}>
                      <FileText className="h-3.5 w-3.5" style={{ color: '#1e4d6b' }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 leading-tight">{idea.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{idea.type}</span>
                        <span className="text-[10px] text-gray-400">{idea.targetAudience}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Data Integrity & Anonymization ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5" style={{ color: '#1e4d6b' }} />
              Data Integrity & Anonymization
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Anonymization Pipeline</h3>
                {[
                  'All PII stripped before aggregation: no names, addresses, permit numbers, employee info',
                  'Anonymous location IDs assigned for internal tracking only',
                  'Minimum group size of 50 data points required before publishing any segment',
                  'Organization IDs hashed — even EvidLY staff cannot reverse-identify',
                  'CCPA compliant: customers can opt out of benchmarking entirely',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Data We Never Share</h3>
                {[
                  'Business names or physical addresses',
                  'Employee names, roles, or personal information',
                  'Specific violation details or inspection reports',
                  'Permit numbers or license information',
                  'Vendor names, contracts, or financial data',
                  'Individual location scores (only aggregated/anonymized)',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Shield className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-gray-50 text-xs text-gray-500">
              All data reviewed by EvidLY team before publication. Geographic data aggregated to county level minimum.
              Individual organizations may opt out via Settings &gt; Privacy at any time.
            </div>
          </div>
        </div>

        {/* ── Distribution & Network Effect ── */}
        <div className="rounded-xl p-4 sm:p-8 text-center" style={{ background: 'linear-gradient(135deg, #1e4d6b 0%, #2c5f7f 100%)' }}>
          <Users className="h-10 w-10 mx-auto mb-3 text-white" />
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
            Based on data from {REPORT.totalLocations.toLocaleString()}+ commercial kitchens
          </h3>
          <p className="text-sm text-gray-300 max-w-lg mx-auto mb-4">
            The EvidLY Compliance Index grows more accurate with every kitchen that joins.
            As our network expands, benchmarks become the industry standard.
          </p>
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-white/10 rounded-lg px-4 py-2 text-white">
              <div className="text-2xl font-bold">{REPORT.totalOrganizations}</div>
              <div className="text-[10px] text-gray-300">Organizations</div>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-2 text-white">
              <div className="text-2xl font-bold">{REPORT.totalLocations.toLocaleString()}</div>
              <div className="text-[10px] text-gray-300">Locations</div>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-2 text-white">
              <div className="text-2xl font-bold">{REPORT.counties}</div>
              <div className="text-[10px] text-gray-300">Counties</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => guardAction('export', 'compliance reports', () => toast.success('Report link copied'))}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold"
              style={{ backgroundColor: '#d4af37', color: '#1e4d6b' }}
            >
              <Share2 className="h-4 w-4" /> Share This Report
            </button>
            <button
              onClick={() => navigate('/benchmarks')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-white/30 text-white hover:bg-white/10"
            >
              See Your Benchmarks <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-400">
            Available for media to reference and cite. Contact press@evidly.com for interviews and data requests.
          </div>
        </div>
      </div>

      <DemoUpgradePrompt
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        action={upgradeAction}
        feature={upgradeFeature}
      />
    </>
  );
}
