// P0-PURGE: No blended "overall" compliance score — pillars are independent
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  BarChart3, TrendingUp, TrendingDown, Award, Share2, Download,
  ChevronDown, ChevronRight, ArrowRight, Star, Crown,
  Diamond, Info, Users, MapPin, Building2, Filter, Brain,
  Trophy, Target, CheckCircle2, AlertTriangle, ExternalLink, Loader2,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { FeatureGate } from '../components/FeatureGate';
import { useBenchmarks } from '../hooks/useBenchmarks';
import {
  VERTICAL_BENCHMARKS,
  GEO_BENCHMARKS,
  SIZE_BENCHMARKS,
  type MonthlyTrend,
} from '../data/benchmarkDemoData';
import { usePageTitle } from '../hooks/usePageTitle';

// ── Badge tiers (UI-only) ──────────────────────────────────────────

const BADGE_TIERS = [
  { tier: 'verified', label: 'EvidLY Verified', icon: EvidlyIcon, color: '#cd7f32', bg: '#fdf4e8', desc: 'Score 80+ for 3 consecutive months', qualified: true },
  { tier: 'excellence', label: 'EvidLY Excellence', icon: Star, color: '#3D5068', bg: '#f1f5f9', desc: 'Score 90+ for 3 consecutive months', qualified: true },
  { tier: 'elite', label: 'EvidLY Elite', icon: Crown, color: '#d4af37', bg: '#fdf8e8', desc: 'Top 10% in vertical for 3 consecutive months', qualified: false },
  { tier: 'platinum', label: 'EvidLY Platinum', icon: Diamond, color: '#818cf8', bg: '#eef2ff', desc: 'Top 5% overall for 6 consecutive months', qualified: false },
];

// ── Filter options (derived from benchmark data) ────────────────────

const VERTICALS = ['All EvidLY Customers', ...VERTICAL_BENCHMARKS.map(v => v.vertical)];
const COUNTIES = ['All Counties', ...GEO_BENCHMARKS.filter(g => g.level === 'county').map(g => g.name)];
const SIZE_OPTIONS = SIZE_BENCHMARKS.map(s => ({ value: s.size, label: s.label }));

// ── Helpers ───────────────────────────────────────────────────────────

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 bg-[#1E2D4D]/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-semibold text-gray-800 w-10 text-right">{value}{max === 100 ? '' : ''}</span>
    </div>
  );
}

function MiniTrendChart({ data }: { data: MonthlyTrend[] }) {
  const allValues = data.flatMap(d => [d.yourScore, d.verticalAvg, d.industryAvg]);
  const min = Math.min(...allValues) - 5;
  const max = Math.max(...allValues) + 5;
  const h = 180;
  const w = 600;
  const pad = 40;

  const toX = (i: number) => pad + (i / (data.length - 1)) * (w - 2 * pad);
  const toY = (v: number) => h - pad - ((v - min) / (max - min)) * (h - 2 * pad);

  const line = (key: 'yourScore' | 'verticalAvg' | 'industryAvg') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d[key])}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Y-axis labels */}
      {[min, min + (max - min) / 2, max].map((v, i) => (
        <text key={i} x={pad - 8} y={toY(Math.round(v)) + 4} textAnchor="end" className="text-xs fill-gray-400">{Math.round(v)}</text>
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
      <path d={line('industryAvg')} fill="none" stroke="#3D5068" strokeWidth={1.5} strokeDasharray="4 3" />
      <path d={line('verticalAvg')} fill="none" stroke="#60a5fa" strokeWidth={1.5} />
      <path d={line('yourScore')} fill="none" stroke="#d4af37" strokeWidth={2.5} />
      {/* Dots on your line */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.yourScore)} r={3} fill="#d4af37" />
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
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  usePageTitle('Benchmarks');
  const reportRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Engine-computed benchmarks (replaces hardcoded constants)
  const {
    benchmark, pillarBenchmarks, subcategoryBenchmarks, leadLag,
    jurisdictionDifficulty, trendData, locationRankings,
    filters, setFilters, peerGroupLabel, loading,
  } = useBenchmarks('all', isDemoMode);

  const yourScore = benchmark.industryComparison.yourScore;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleDownloadPDF = async () => {
    guardAction('download', 'benchmark reports', async () => {
      if (!reportRef.current) return;
      setPdfLoading(true);
      try {
        const html2canvas = (await import('html2canvas')).default;
        const jsPDFModule = await import('jspdf');
        const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;

        const canvas = await html2canvas(reportRef.current, {
          scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageW = 210;
        const pageH = 297;
        const margin = 8;
        const hdrH = 10;
        const ftrH = 8;
        const usableH = pageH - hdrH - ftrH;
        const imgW = pageW - 2 * margin;
        const imgH = (canvas.height * imgW) / canvas.width;

        let heightLeft = imgH;
        let pageIdx = 0;

        while (heightLeft > 0 || pageIdx === 0) {
          if (pageIdx > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, hdrH - pageIdx * usableH, imgW, imgH);
          heightLeft -= usableH;
          pageIdx++;
        }

        const total = pdf.getNumberOfPages();
        const quarter = `Q1 2026`;
        for (let i = 1; i <= total; i++) {
          pdf.setPage(i);
          pdf.setFillColor(30, 77, 107);
          pdf.rect(0, 0, pageW, hdrH, 'F');
          pdf.setFontSize(7);
          pdf.setTextColor(255, 255, 255);
          pdf.text('EvidLY — Compliance Benchmark Report', margin, 6.5);
          pdf.setTextColor(212, 175, 55);
          pdf.text(quarter, pageW - margin, 6.5, { align: 'right' });
          pdf.setFontSize(6);
          pdf.setTextColor(160, 160, 160);
          pdf.text(`Generated ${new Date().toLocaleDateString()}`, margin, pageH - 3);
          pdf.text(`Page ${i} of ${total}`, pageW - margin, pageH - 3, { align: 'right' });
        }

        pdf.save(`EvidLY-Benchmark-Report-${quarter.replace(' ', '-')}.pdf`);
        toast.success('Benchmark report PDF downloaded');
      } catch {
        toast.error('PDF generation failed');
      } finally {
        setPdfLoading(false);
      }
    });
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Benchmarks' }]} />

      <div ref={reportRef} className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D] flex items-center gap-2">
              <BarChart3 className="h-7 w-7" style={{ color: '#1E2D4D' }} />
              Compliance Benchmarks
            </h1>
            <p className="text-sm text-[#1E2D4D]/70 mt-1">See how you compare against {benchmark.industryComparison.sampleSize.toLocaleString()}+ commercial kitchens on EvidLY</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-[#1E2D4D]/15 hover:bg-gray-50 min-h-[44px]"
            >
              <Filter className="h-4 w-4" /> Filters {showFilters ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-white min-h-[44px] disabled:opacity-60"
              style={{ backgroundColor: '#1E2D4D' }}
            >
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {pdfLoading ? 'Generating...' : 'Export PDF'}
            </button>
          </div>
        </div>

        {/* ── Empty state for non-demo users ── */}
        {!isDemoMode && (
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-2">Benchmarks Coming Soon</h2>
            <p className="text-sm text-[#1E2D4D]/50 max-w-md mx-auto">
              As more kitchens join EvidLY, your compliance benchmarks will become available.
              Continue logging your operations to be ready when benchmarks launch.
            </p>
          </div>
        )}

        {isDemoMode && (<>
        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#1E2D4D]/50 mb-1">Vertical</label>
                <select value={filters.vertical} onChange={e => setFilters({ vertical: e.target.value })} className="w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm">
                  {VERTICALS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1E2D4D]/50 mb-1">County</label>
                <select value={filters.county} onChange={e => setFilters({ county: e.target.value })} className="w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm">
                  {COUNTIES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1E2D4D]/50 mb-1">Organization Size</label>
                <select value={filters.size} onChange={e => setFilters({ size: e.target.value })} className="w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm">
                  {SIZE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-[#1E2D4D]/50">
              <Info className="h-3.5 w-3.5" />
              <span>Benchmarks only display when 10+ peers exist in the comparison group (privacy protection). Current group: <strong>{peerGroupLabel}</strong> ({benchmark.geoComparison.sampleSize.toLocaleString()} locations).</span>
            </div>
          </div>
        )}

        {/* ── Section 1: Overall Ranking ── */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('overall')}>
            <h2 className="text-lg font-bold text-[#1E2D4D] flex items-center gap-2">
              <Trophy className="h-5 w-5" style={{ color: '#d4af37' }} />
              Overall Ranking
            </h2>
            {expandedSection === 'overall' ? <ChevronDown className="h-5 w-5 text-[#1E2D4D]/30" /> : <ChevronRight className="h-5 w-5 text-[#1E2D4D]/30" />}
          </div>
          <div className={expandedSection === 'overall' ? '' : 'max-h-0 overflow-hidden'} style={expandedSection !== 'overall' ? {} : undefined}>
            {/* Always show summary row */}
          </div>
          <div className="p-4 sm:p-6">
            {/* Jurisdiction difficulty context */}
            {jurisdictionDifficulty.difficultyIndex > 0.5 && (
              <div className="mb-4 p-3 rounded-lg text-xs flex items-start gap-2" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: '#1E2D4D' }} />
                <span className="text-[#1E2D4D]/80">
                  <strong>{jurisdictionDifficulty.countyName}</strong>: {jurisdictionDifficulty.explanation}{' '}
                  Your adjusted percentile accounts for this (+{jurisdictionDifficulty.adjustedPercentile - jurisdictionDifficulty.rawPercentile} pts).
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* vs Industry */}
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
                <div className="text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider mb-2">vs Industry Average</div>
                <div className="flex items-end justify-center gap-3">
                  <div>
                    <div className="text-xl sm:text-3xl font-bold tracking-tight" style={{ color: '#1E2D4D' }}>{yourScore}</div>
                    <div className="text-xs text-[#1E2D4D]/50">Your Score</div>
                  </div>
                  <div className="text-gray-300 text-lg pb-1">vs</div>
                  <div>
                    <div className="text-xl sm:text-3xl font-bold tracking-tight text-[#1E2D4D]/30">{benchmark.industryComparison.peerMean}</div>
                    <div className="text-xs text-[#1E2D4D]/50">Industry</div>
                  </div>
                </div>
                <div className="mt-3"><PercentileBadge pct={benchmark.industryComparison.percentile} /></div>
              </div>
              {/* vs Vertical */}
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
                <div className="text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider mb-2">vs {filters.vertical} Average</div>
                <div className="flex items-end justify-center gap-3">
                  <div>
                    <div className="text-xl sm:text-3xl font-bold tracking-tight" style={{ color: '#1E2D4D' }}>{yourScore}</div>
                    <div className="text-xs text-[#1E2D4D]/50">Your Score</div>
                  </div>
                  <div className="text-gray-300 text-lg pb-1">vs</div>
                  <div>
                    <div className="text-xl sm:text-3xl font-bold tracking-tight text-[#1E2D4D]/30">{benchmark.verticalComparison.peerMean}</div>
                    <div className="text-xs text-[#1E2D4D]/50">{filters.vertical}</div>
                  </div>
                </div>
                <div className="mt-3"><PercentileBadge pct={benchmark.verticalComparison.percentile} /></div>
              </div>
              {/* vs Geographic */}
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
                <div className="text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider mb-2">vs {filters.county} Peers</div>
                <div className="flex items-end justify-center gap-3">
                  <div>
                    <div className="text-xl sm:text-3xl font-bold tracking-tight" style={{ color: '#1E2D4D' }}>{yourScore}</div>
                    <div className="text-xs text-[#1E2D4D]/50">Your Score</div>
                  </div>
                  <div className="text-gray-300 text-lg pb-1">vs</div>
                  <div>
                    <div className="text-xl sm:text-3xl font-bold tracking-tight text-[#1E2D4D]/30">{benchmark.geoComparison.peerMean}</div>
                    <div className="text-xs text-[#1E2D4D]/50">Geographic</div>
                  </div>
                </div>
                <div className="mt-3"><PercentileBadge pct={benchmark.geoComparison.percentile} /></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Category Breakdown ── */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-[#1E2D4D] flex items-center gap-2">
              <BarChart3 className="h-5 w-5" style={{ color: '#1E2D4D' }} />
              Category Breakdown
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1E2D4D]/10 hover:bg-[#1E2D4D]/[0.02] transition-colors">
                    <th className="text-left text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wider pb-3 pr-4">Category</th>
                    <th className="text-center text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wider pb-3 px-2">Your Score</th>
                    <th className="text-center text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wider pb-3 px-2 hidden sm:table-cell">Peer Avg</th>
                    <th className="text-center text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wider pb-3 px-2">Percentile</th>
                    <th className="text-left text-xs font-semibold text-[#1E2D4D]/50 uppercase tracking-wider pb-3 pl-4 w-40 hidden sm:table-cell">vs Peers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2D4D]/5">
                  {pillarBenchmarks.map((pb) => (
                    <tr key={pb.pillar}>
                      <td className="py-3 pr-4 text-sm text-gray-900">{pb.pillar}</td>
                      <td className="py-3 px-2 text-center text-sm font-bold" style={{ color: '#1E2D4D' }}>{pb.yourScore}</td>
                      <td className="py-3 px-2 text-center text-sm text-[#1E2D4D]/70 hidden sm:table-cell">{pb.peerMean}</td>
                      <td className="py-3 px-2 text-center"><PercentileBadge pct={pb.percentile} /></td>
                      <td className="py-3 pl-4 hidden sm:table-cell">
                        <ScoreBar value={pb.yourScore} color={pb.percentile >= 80 ? '#22c55e' : pb.percentile >= 50 ? '#d4af37' : '#ef4444'} />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#FAF7F0] font-semibold">
                    <td className="py-3 pr-4 text-sm text-gray-900">Overall</td>
                    <td className="py-3 px-2 text-center text-sm font-bold" style={{ color: '#1E2D4D' }}>{yourScore}</td>
                    <td className="py-3 px-2 text-center text-sm text-[#1E2D4D]/70 hidden sm:table-cell">{benchmark.verticalComparison.peerMean}</td>
                    <td className="py-3 px-2 text-center"><PercentileBadge pct={benchmark.verticalComparison.percentile} /></td>
                    <td className="py-3 pl-4 hidden sm:table-cell">
                      <ScoreBar value={yourScore} color={benchmark.verticalComparison.percentile >= 80 ? '#22c55e' : benchmark.verticalComparison.percentile >= 50 ? '#d4af37' : '#ef4444'} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Section 3: Subcategory Deep Dive ── */}
        <FeatureGate flagKey="industry-benchmarks">
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#1E2D4D] flex items-center gap-2">
                <Target className="h-5 w-5" style={{ color: '#1E2D4D' }} />
                Subcategory Deep Dive
              </h2>
            </div>
            <div className="p-4 sm:p-6 overflow-x-auto">
              <div className="space-y-3 min-w-[400px]">
                {subcategoryBenchmarks.map((item) => (
                  <div key={item.key} className="flex items-center gap-4">
                    <div className="w-52 text-sm text-[#1E2D4D]/80">{item.label}</div>
                    <ScoreBar value={item.yourScore} color="#1E2D4D" />
                    <div className="w-20 text-xs text-[#1E2D4D]/50 text-right">Avg: {item.peerMean}%</div>
                    <PercentileBadge pct={item.percentile} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FeatureGate>

        {/* ── Section 4: Where You Lead / Where You Lag ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Lead */}
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100" style={{ backgroundColor: '#f0fdf4' }}>
              <h2 className="text-lg font-bold text-[#1E2D4D] flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Where You Lead
              </h2>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {leadLag.leads.map((item) => (
                <div key={item.key} className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-[#1E2D4D]">{item.label}</span>
                      <PercentileBadge pct={item.percentile} />
                    </div>
                    <p className="text-xs text-[#1E2D4D]/70">
                      Your {item.yourScore}% score is {item.delta > 0 ? `${item.delta} points above` : 'at'} the peer average of {item.peerMean}%.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lag */}
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100" style={{ backgroundColor: '#fef2f2' }}>
              <h2 className="text-lg font-bold text-[#1E2D4D] flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Where You Lag
              </h2>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {leadLag.lags.map((item) => (
                <div key={item.key} className="p-3 rounded-lg bg-red-50/50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-[#1E2D4D]">{item.label}</span>
                        <PercentileBadge pct={item.percentile} />
                      </div>
                      <p className="text-xs text-[#1E2D4D]/70 mb-2">
                        Your {item.yourScore}% score is {Math.abs(item.delta)} points {item.delta < 0 ? 'below' : 'above'} the peer average of {item.peerMean}%.
                      </p>
                      {leadLag.recommendations[item.key] && (
                        <div className="flex items-start gap-2 p-2 rounded-md" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
                          <Brain className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: '#1E2D4D' }} />
                          <p className="text-xs font-medium" style={{ color: '#1E2D4D' }}>{leadLag.recommendations[item.key]}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 5: Trend Analysis ── */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-[#1E2D4D] flex items-center gap-2">
              <TrendingUp className="h-5 w-5" style={{ color: '#1E2D4D' }} />
              12-Month Trend Analysis
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-6 mb-4 text-xs flex-wrap">
              <div className="flex items-center gap-2"><span className="w-6 h-0.5 rounded-full" style={{ backgroundColor: '#d4af37', display: 'inline-block' }} /><span className="text-[#1E2D4D]/70 font-medium">Your Score</span></div>
              <div className="flex items-center gap-2"><span className="w-6 h-0.5 rounded-full" style={{ backgroundColor: '#60a5fa', display: 'inline-block' }} /><span className="text-[#1E2D4D]/70 font-medium">{filters.vertical} Average</span></div>
              <div className="flex items-center gap-2"><span className="w-6 h-0.5 rounded-full border-dashed border-t-2 border-gray-400" style={{ display: 'inline-block' }} /><span className="text-[#1E2D4D]/70 font-medium">Industry Average</span></div>
            </div>
            <MiniTrendChart data={trendData} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-3 rounded-lg bg-[#FAF7F0] text-center">
                <div className="text-xs text-[#1E2D4D]/50 mb-1">Q4 vs Q3 Change</div>
                <div className="text-lg font-bold text-green-600">
                  {(() => {
                    if (trendData.length < 6) return '+0 pts';
                    const q4 = Math.round((trendData[trendData.length - 1].yourScore + trendData[trendData.length - 2].yourScore + trendData[trendData.length - 3].yourScore) / 3);
                    const q3 = Math.round((trendData[trendData.length - 4].yourScore + trendData[trendData.length - 5].yourScore + trendData[trendData.length - 6].yourScore) / 3);
                    const diff = q4 - q3;
                    return `${diff >= 0 ? '+' : ''}${diff} pts`;
                  })()}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF7F0] text-center">
                <div className="text-xs text-[#1E2D4D]/50 mb-1">Current Rank</div>
                <div className="text-sm font-semibold text-gray-800">#{benchmark.industryComparison.rank} of {benchmark.industryComparison.totalPeers.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF7F0] text-center">
                <div className="text-xs text-[#1E2D4D]/50 mb-1">Size Comparison</div>
                <div className="text-lg font-bold" style={{ color: '#1E2D4D' }}>{benchmark.sizeComparison.percentile}th <span className="text-xs font-normal text-[#1E2D4D]/50">percentile ({SIZE_BENCHMARKS.find(s => s.size === filters.size)?.label ?? filters.size})</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Multi-Location Internal Leaderboard ── */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-[#1E2D4D] flex items-center gap-2">
              <Building2 className="h-5 w-5" style={{ color: '#1E2D4D' }} />
              Multi-Location Leaderboard
            </h2>
            <p className="text-xs text-[#1E2D4D]/50 mt-1">Rank your locations against each other and industry peers</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1E2D4D]/10 hover:bg-[#1E2D4D]/[0.02] transition-colors">
                    <th className="text-left text-xs font-semibold text-[#1E2D4D]/50 uppercase pb-3">#</th>
                    <th className="text-left text-xs font-semibold text-[#1E2D4D]/50 uppercase pb-3">Location</th>
                    <th className="text-center text-xs font-semibold text-[#1E2D4D]/50 uppercase pb-3">Food Safety</th>
                    <th className="text-center text-xs font-semibold text-[#1E2D4D]/50 uppercase pb-3">Facility Safety</th>
                    <th className="text-center text-xs font-semibold text-[#1E2D4D]/50 uppercase pb-3">Industry Pct</th>
                    <th className="text-center text-xs font-semibold text-[#1E2D4D]/50 uppercase pb-3 hidden sm:table-cell">Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2D4D]/5">
                  {locationRankings.map((loc, i) => (
                    <tr key={loc.locationId} className={i === 0 ? 'bg-green-50/30' : i === locationRankings.length - 1 ? 'bg-red-50/30' : ''}>
                      <td className="py-3 text-sm font-bold text-[#1E2D4D]/50">{i + 1}</td>
                      <td className="py-3 text-sm font-semibold text-[#1E2D4D] flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-[#1E2D4D]/30" />
                        {loc.name}
                        {i === 0 && <span className="text-xs text-green-600 font-medium">Best</span>}
                        {i === locationRankings.length - 1 && <span className="text-xs text-red-500 font-medium">Needs Attention</span>}
                      </td>
                      <td className="py-3 text-center text-sm font-bold" style={{ color: '#1E2D4D' }}>{loc.foodSafety}</td>
                      <td className="py-3 text-center text-sm text-[#1E2D4D]/70">{loc.facilitySafety}</td>
                      <td className="py-3 text-center"><PercentileBadge pct={loc.industryPercentile} /></td>
                      <td className="py-3 text-center hidden sm:table-cell">
                        {loc.badgeTier ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#f1f5f9', color: '#3D5068' }}>
                            <Star className="h-3 w-3" /> {loc.badgeTier}
                          </span>
                        ) : (
                          <span className="text-xs text-[#1E2D4D]/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cross-Location Patterns */}
            {locationRankings.length > 1 && (
              <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
                <h3 className="text-sm font-bold text-[#1E2D4D] mb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4" style={{ color: '#1E2D4D' }} />
                  Cross-Location Patterns
                </h3>
                <div className="space-y-2 text-xs text-[#1E2D4D]/80">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>{locationRankings[0]?.name}</strong> leads with a food safety score of {locationRankings[0]?.foodSafety} — consistent management practices are the key differentiator.</span>
                  </div>
                  {locationRankings.length > 2 && (
                    <div className="flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span><strong>{locationRankings[locationRankings.length - 1]?.name}</strong> scores {locationRankings[0].foodSafety - locationRankings[locationRankings.length - 1].foodSafety} points below the top location — focus on {leadLag.lags[0]?.label?.toLowerCase() ?? 'improvement areas'} to close the gap.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Shareable Badges & Certificates ── */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-[#1E2D4D] flex items-center gap-2">
              <Award className="h-5 w-5" style={{ color: '#d4af37' }} />
              Shareable Badges & Certificates
            </h2>
            <p className="text-xs text-[#1E2D4D]/50 mt-1">Earn and share compliance badges with customers, insurers, and franchise partners</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {BADGE_TIERS.map((badge) => (
                <div
                  key={badge.tier}
                  className="relative rounded-xl p-4 sm:p-5 text-center border-2 transition-all"
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
                  <h3 className="text-sm font-bold text-[#1E2D4D] mb-1">{badge.label}</h3>
                  <p className="text-xs text-[#1E2D4D]/50 mb-3">{badge.desc}</p>
                  {badge.qualified ? (
                    <div className="space-y-2">
                      <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">Qualified</span>
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => guardAction('download', 'benchmark badges', () => toast.success('Badge image downloaded'))} className="p-1.5 rounded-lg hover:bg-white/50" title="Download">
                          <Download className="h-3.5 w-3.5 text-[#1E2D4D]/50" />
                        </button>
                        <button onClick={() => toast.success('Share link copied to clipboard')} className="p-1.5 rounded-lg hover:bg-white/50" title="Share">
                          <Share2 className="h-3.5 w-3.5 text-[#1E2D4D]/50" />
                        </button>
                        <button onClick={() => navigate(`/verify/DWN-2024-EXCL`)} className="p-1.5 rounded-lg hover:bg-white/50" title="View public page">
                          <ExternalLink className="h-3.5 w-3.5 text-[#1E2D4D]/50" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-[#1E2D4D]/50 text-xs font-bold rounded-full">Not Yet Qualified</span>
                  )}
                </div>
              ))}
            </div>

            {/* Share CTA */}
            <div className="mt-6 p-4 rounded-lg border border-[#1E2D4D]/10 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#1E2D4D]">Share your achievements</h3>
                <p className="text-xs text-[#1E2D4D]/50 mt-0.5">Pre-written posts for LinkedIn, Facebook, and more. Include in insurance apps, franchise evaluations, and RFPs.</p>
              </div>
              <div className="flex items-center gap-2">
                {['LinkedIn', 'Facebook', 'X'].map(platform => (
                  <button
                    key={platform}
                    onClick={() => toast.info(`Share to ${platform} (Demo)`)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#1E2D4D]/15 hover:bg-gray-50"
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── EvidLY Compliance Index (Quarterly Public Report) ── */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100" style={{ backgroundColor: '#fdf8e8' }}>
            <h2 className="text-lg font-bold text-[#1E2D4D] flex items-center gap-2">
              <BarChart3 className="h-5 w-5" style={{ color: '#d4af37' }} />
              EvidLY Compliance Index — Q4 2025
            </h2>
            <p className="text-xs text-[#1E2D4D]/70 mt-1">Quarterly public report based on anonymized data from {benchmark.industryComparison.sampleSize.toLocaleString()}+ commercial kitchens</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-[#FAF7F0]">
                <div className="text-2xl font-bold tracking-tight text-gray-800">{benchmark.industryComparison.peerMean}</div>
                <div className="text-xs text-[#1E2D4D]/50">Industry Avg Score</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-[#FAF7F0]">
                <div className="text-2xl font-bold tracking-tight text-green-600">+2</div>
                <div className="text-xs text-[#1E2D4D]/50">vs Q3 2025</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-[#FAF7F0]">
                <div className="text-2xl font-bold tracking-tight text-gray-800">{benchmark.industryComparison.sampleSize.toLocaleString()}</div>
                <div className="text-xs text-[#1E2D4D]/50">Kitchens Sampled</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-[#FAF7F0]">
                <div className="text-2xl font-bold tracking-tight text-gray-800">14</div>
                <div className="text-xs text-[#1E2D4D]/50">Counties Covered</div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-bold text-[#1E2D4D]">Score by Vertical</h3>
              {VERTICAL_BENCHMARKS.map((v) => (
                <div key={v.vertical} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-[#1E2D4D]/70">{v.vertical}</div>
                  <ScoreBar value={v.avgScore} color="#1E2D4D" />
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-6">
              <h3 className="text-sm font-bold text-[#1E2D4D]">Top Compliance Gaps (Industry-Wide)</h3>
              {[
                'Vendor document expiration management (38% of kitchens have at least 1 expired vendor cert)',
                'Cooling log completion (only 62% completion rate industry-wide)',
                'Fire suppression system inspection currency (22% overdue)',
                'Food handler certification tracking (19% have expired certs on staff)',
              ].map((gap, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#1E2D4D]/80">
                  <span className="font-bold text-[#1E2D4D]/30 mt-px">{i + 1}.</span>
                  <span>{gap}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-[#1E2D4D]/10 bg-[#FAF7F0] flex-wrap gap-2">
              <div className="text-sm">
                <span className="font-semibold text-[#1E2D4D]">Full Q4 2025 Report</span>
                <span className="text-[#1E2D4D]/50 ml-2 text-xs">Published Jan 15, 2026 — 10 sections, all 14 counties</span>
              </div>
              <button onClick={() => navigate('/compliance-index')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg text-white min-h-[44px]" style={{ backgroundColor: '#1E2D4D' }}>
                <ArrowRight className="h-3.5 w-3.5" /> View Full Report
              </button>
            </div>
          </div>
        </div>

        {/* Network Effect CTA */}
        <div className="rounded-xl p-4 sm:p-6 text-center" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
          <Users className="h-8 w-8 mx-auto mb-2" style={{ color: '#1E2D4D' }} />
          <h3 className="text-lg font-bold text-[#1E2D4D] mb-1">Based on data from {benchmark.industryComparison.sampleSize.toLocaleString()}+ commercial kitchens</h3>
          <p className="text-sm text-[#1E2D4D]/70 mb-3">The more kitchens on EvidLY, the more accurate your benchmarks become. Share with peers to strengthen the network.</p>
          <button onClick={() => toast.success('Referral link copied')} className="px-4 py-2 rounded-lg text-sm font-bold text-white min-h-[44px]" style={{ backgroundColor: '#1E2D4D' }}>
            Invite a Peer Kitchen
          </button>
        </div>
        </>)}
      </div>

      {isDemoMode && (
        <DemoUpgradePrompt
          isOpen={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          action={upgradeAction}
          feature={upgradeFeature}
        />
      )}
    </>
  );
}
