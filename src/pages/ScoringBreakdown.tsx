import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, Zap, Shield, Target, Clock,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { Breadcrumb } from '../components/Breadcrumb';
import { JurisdictionScoreDisplay } from '../components/JurisdictionScoreDisplay';
import {
  locationScores, locations, scoreImpactData, getWeights,
  locationScoresThirtyDaysAgo, getTrend,
  type ScoreImpactItem,
} from '../data/demoData';
import { getScoreTier } from '../lib/complianceScoring';
import { calculateJurisdictionScore, extractCountySlug, getCountyProfile } from '../lib/jurisdictionScoring';
import { findViolationMapping } from '../data/violationMapping';
import { DEMO_LOCATION_JURISDICTIONS } from '../lib/jurisdictions';
import { getStateLabel } from '../lib/stateCodes';

// ── Effort classification for Quick Wins ──────────────────────

function getEffortCategory(item: ScoreImpactItem): 'immediate' | 'schedule' | 'multi-step' {
  const label = item.label.toLowerCase();
  if (label.includes('checklist') || label.includes('temperature') || label.includes('handwash') || label.includes('sanitizer')) return 'immediate';
  if (label.includes('hood') || label.includes('fire') || label.includes('pest') || label.includes('grease')) return 'schedule';
  return 'multi-step';
}

const EFFORT_LABELS: Record<string, { label: string; color: string }> = {
  'immediate': { label: 'Immediate', color: '#22c55e' },
  'schedule': { label: 'Schedule', color: '#3b82f6' },
  'multi-step': { label: 'Multi-step', color: '#f59e0b' },
};

// ── Historical Data (demo) ────────────────────────────────────

const historicalData: Record<string, { date: string; evidly: number; jurisdiction: number }[]> = {
  downtown: [
    { date: '12/1', evidly: 85, jurisdiction: 95 },
    { date: '12/8', evidly: 87, jurisdiction: 96 },
    { date: '12/15', evidly: 86, jurisdiction: 95 },
    { date: '12/22', evidly: 88, jurisdiction: 96 },
    { date: '12/29', evidly: 89, jurisdiction: 97 },
    { date: '1/5', evidly: 90, jurisdiction: 97 },
    { date: '1/12', evidly: 89, jurisdiction: 96 },
    { date: '1/19', evidly: 91, jurisdiction: 97 },
    { date: '1/26', evidly: 90, jurisdiction: 97 },
    { date: '2/2', evidly: 92, jurisdiction: 98 },
    { date: '2/9', evidly: 91, jurisdiction: 97 },
    { date: '2/16', evidly: 92, jurisdiction: 98 },
  ],
  airport: [
    { date: '12/1', evidly: 64, jurisdiction: 82 },
    { date: '12/8', evidly: 65, jurisdiction: 83 },
    { date: '12/15', evidly: 66, jurisdiction: 82 },
    { date: '12/22', evidly: 67, jurisdiction: 84 },
    { date: '12/29', evidly: 66, jurisdiction: 83 },
    { date: '1/5', evidly: 68, jurisdiction: 84 },
    { date: '1/12', evidly: 69, jurisdiction: 85 },
    { date: '1/19', evidly: 68, jurisdiction: 84 },
    { date: '1/26', evidly: 69, jurisdiction: 85 },
    { date: '2/2', evidly: 71, jurisdiction: 86 },
    { date: '2/9', evidly: 70, jurisdiction: 85 },
    { date: '2/16', evidly: 70, jurisdiction: 85 },
  ],
  university: [
    { date: '12/1', evidly: 42, jurisdiction: 52 },
    { date: '12/8', evidly: 44, jurisdiction: 54 },
    { date: '12/15', evidly: 46, jurisdiction: 56 },
    { date: '12/22', evidly: 48, jurisdiction: 58 },
    { date: '12/29', evidly: 47, jurisdiction: 56 },
    { date: '1/5', evidly: 49, jurisdiction: 58 },
    { date: '1/12', evidly: 51, jurisdiction: 60 },
    { date: '1/19', evidly: 50, jurisdiction: 59 },
    { date: '1/26', evidly: 52, jurisdiction: 61 },
    { date: '2/2', evidly: 53, jurisdiction: 62 },
    { date: '2/9', evidly: 53, jurisdiction: 62 },
    { date: '2/16', evidly: 55, jurisdiction: 64 },
  ],
};

// ── Collapsible Section ───────────────────────────────────────

function CollapsibleSection({ title, icon, badge, defaultOpen = false, children }: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 sm:px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-gray-900">{title}</span>
          {badge}
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {isOpen && <div className="px-3 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100">{children}</div>}
    </div>
  );
}

// ── Status Icon ───────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'current': return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />;
    case 'overdue':
    case 'expired':
    case 'missing': return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
    case 'due_soon': return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
    default: return null;
  }
}

// ── Severity Badge ────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    major: 'bg-amber-100 text-amber-700 border-amber-200',
    minor: 'bg-blue-100 text-blue-700 border-blue-200',
    good_practice: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[severity] || colors.minor}`}>
      {severity.replace('_', ' ')}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────

export function ScoringBreakdown() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const locationParam = params.get('location') || 'downtown';
  const [trendRange, setTrendRange] = useState<30 | 60 | 90>(90);

  const selectedLocation = locations.find(l => l.urlId === locationParam) || locations[0];
  const scores = locationScores[locationParam] || locationScores['downtown'];
  const scoresAgo = locationScoresThirtyDaysAgo[locationParam] || locationScoresThirtyDaysAgo['downtown'];
  const overallTrend = getTrend(scores.overall, scoresAgo.overall);
  const tier = getScoreTier(scores.overall);
  const weights = getWeights();

  // Jurisdiction calculation
  const jurisdictionMapping = DEMO_LOCATION_JURISDICTIONS.find(j => j.locationName === selectedLocation.name);
  const countySlug = jurisdictionMapping ? extractCountySlug(jurisdictionMapping.county) : 'generic';
  const countyProfile = getCountyProfile(countySlug);
  const locationItems = scoreImpactData.filter(item => item.locationId === selectedLocation.id);
  const jurisdictionResult = calculateJurisdictionScore(locationItems, countySlug);

  // Group items by pillar
  const pillarGroups = useMemo(() => {
    const groups: Record<string, ScoreImpactItem[]> = { 'Food Safety': [], 'Fire Safety': [], 'Vendor Compliance': [] };
    locationItems.forEach(item => {
      if (groups[item.pillar]) groups[item.pillar].push(item);
    });
    return groups;
  }, [locationParam]);

  // "What Would Hurt Your Grade" — violations sorted by deduction
  const hurtGrade = useMemo(() => {
    return [...jurisdictionResult.violations].sort((a, b) => b.deduction - a.deduction);
  }, [jurisdictionResult]);

  // "Quick Wins" — overdue/expired/missing/due_soon items with violation mapping, sorted by impact
  const quickWins = useMemo(() => {
    return locationItems
      .filter(item => item.status !== 'current')
      .map(item => {
        const mapping = findViolationMapping(item.label);
        const deduction = mapping ? countyProfile.deductions[mapping.defaultSeverity] || 0 : 0;
        return { ...item, mapping, deduction, effort: getEffortCategory(item) };
      })
      .filter(item => item.deduction > 0 || item.status === 'due_soon')
      .sort((a, b) => {
        // Sort by: immediate effort first, then highest deduction
        const effortOrder: Record<string, number> = { immediate: 0, schedule: 1, 'multi-step': 2 };
        const effortDiff = (effortOrder[a.effort] ?? 2) - (effortOrder[b.effort] ?? 2);
        if (effortDiff !== 0) return effortDiff;
        return b.deduction - a.deduction;
      });
  }, [locationParam]);

  // Trend data filtered by range
  const trendData = useMemo(() => {
    const all = historicalData[locationParam] || historicalData['downtown'];
    if (trendRange === 30) return all.slice(-4);
    if (trendRange === 60) return all.slice(-8);
    return all;
  }, [locationParam, trendRange]);

  const pillarMeta: Record<string, { weight: number; score: number; color: string }> = {
    'Food Safety': { weight: Math.round(weights.foodSafety * 100), score: scores.foodSafety, color: '#1e4d6b' },
    'Fire Safety': { weight: Math.round(weights.fireSafety * 100), score: scores.fireSafety, color: '#d4af37' },
    'Vendor Compliance': { weight: Math.round(weights.vendorCompliance * 100), score: scores.vendorCompliance, color: '#6366f1' },
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: selectedLocation.name, href: `/dashboard?location=${locationParam}` },
        { label: 'Score Breakdown' },
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <button
            onClick={() => navigate(`/dashboard?location=${locationParam}`)}
            className="flex items-center gap-1 text-sm font-medium text-[#1e4d6b] hover:text-[#163a52] transition-colors mb-2 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Score Breakdown</h1>
          <p className="text-gray-500 text-sm mt-1">
            {selectedLocation.name}
            {selectedLocation.stateCode && (
              <span className="text-xs text-gray-500 ml-2">{getStateLabel(selectedLocation.stateCode)}</span>
            )}
            {' '} — {jurisdictionMapping?.county || 'California'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* EvidLY Score Badge */}
          <div className="text-center">
            <div className="text-xl sm:text-3xl font-bold" style={{ color: tier.hex }}>{scores.overall}</div>
            <div className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
              tier.color === 'green' ? 'bg-green-100 text-green-800' :
              tier.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
              tier.color === 'amber' ? 'bg-amber-100 text-amber-800' :
              'bg-red-100 text-red-800'
            }`}>{tier.label}</div>
          </div>
          <div className="flex items-center gap-1 text-sm" style={{ color: overallTrend.color }}>
            {overallTrend.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : overallTrend.direction === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
            <span className="font-semibold">{overallTrend.diff}</span>
          </div>
        </div>
      </div>

      {/* ─── Section 1: EvidLY Score Breakdown ─── */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-[#1e4d6b]" />
          EvidLY Score Breakdown
        </h2>

        {(['Food Safety', 'Fire Safety', 'Vendor Compliance'] as const).map(pillar => {
          const meta = pillarMeta[pillar];
          const items = pillarGroups[pillar] || [];
          const pillarTier = getScoreTier(meta.score);
          return (
            <CollapsibleSection
              key={pillar}
              title={`${pillar} (${meta.weight}%)`}
              icon={<div className="w-3 h-3 rounded-full" style={{ backgroundColor: meta.color }} />}
              badge={
                <span className="text-sm font-bold ml-2" style={{ color: pillarTier.hex }}>
                  {meta.score}/100
                </span>
              }
              defaultOpen={pillar === 'Food Safety'}
            >
              <div className="mt-3 space-y-1">
                {items.sort((a, b) => {
                  const order: Record<string, number> = { overdue: 0, expired: 0, missing: 0, due_soon: 1, current: 2 };
                  return (order[a.status] ?? 2) - (order[b.status] ?? 2);
                }).map((item, idx) => {
                  const mapping = findViolationMapping(item.label);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 sm:gap-3 py-2.5 px-2 sm:px-3 rounded-lg hover:bg-gray-50 transition-colors flex-wrap"
                      style={{ borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                    >
                      <StatusIcon status={item.status} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${item.status !== 'current' ? 'font-semibold text-red-600' : 'text-gray-700'}`}>
                          {item.label}
                        </div>
                        {mapping && (
                          <div className="text-xs text-gray-400 mt-0.5">{mapping.calCodeSection} — {mapping.description}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-medium w-20 text-center flex-shrink-0">{item.impact}</div>
                      {item.action && item.actionLink && (
                        <button
                          onClick={() => navigate(item.actionLink!)}
                          className="text-xs font-semibold text-[#1e4d6b] hover:text-[#163a52] flex-shrink-0"
                        >
                          {item.action} &rarr;
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          );
        })}
      </div>

      {/* ─── Section 2: Jurisdiction Score ─── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[#1e4d6b]" />
          Jurisdiction Score — {jurisdictionResult.countyName}
        </h2>

        <div className="flex items-start gap-8 flex-wrap">
          <JurisdictionScoreDisplay result={jurisdictionResult} />

          <div className="flex-1 min-w-0 sm:min-w-[300px]">
            {/* Deduction Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-600">
                Started at <span className="font-bold text-gray-900">100</span> &rarr;
                <span className="font-bold text-red-600 mx-1">-{jurisdictionResult.totalDeductions}</span> pts
                ({jurisdictionResult.violations.length} violation{jurisdictionResult.violations.length !== 1 ? 's' : ''})
                &rarr; Final: <span className="font-bold" style={{ color: jurisdictionResult.grade.color }}>{jurisdictionResult.numericScore}</span>
              </div>
            </div>

            {/* Violation List */}
            {jurisdictionResult.violations.length > 0 ? (
              <div className="space-y-2">
                {jurisdictionResult.violations.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2 sm:gap-3 py-2 px-2 sm:px-3 bg-red-50 rounded-lg border border-red-100 flex-wrap">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">{v.label}</div>
                      <div className="text-xs text-gray-500">{v.calCodeSection}</div>
                    </div>
                    <SeverityBadge severity={v.severity} />
                    <span className="text-sm font-bold text-red-600">-{v.deduction}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">No active violations detected</div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Section 3: What Would Hurt Your Grade ─── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          What Would Hurt Your Grade
        </h2>
        <p className="text-sm text-gray-500 mb-4">Current violations ranked by point impact on your jurisdiction score.</p>

        {hurtGrade.length > 0 ? (
          <div className="space-y-2">
            {hurtGrade.map((v, idx) => {
              // Simulate what score would be without this violation
              const scoreWithout = Math.min(100, jurisdictionResult.numericScore + v.deduction);
              const gradeWithout = countyProfile.getGrade(scoreWithout, false);
              const gradeImproved = gradeWithout.label !== jurisdictionResult.grade.label;
              return (
                <div key={idx} className="flex items-center gap-2 sm:gap-3 py-3 px-3 sm:px-4 rounded-lg border border-gray-100 hover:bg-gray-50 flex-wrap">
                  <div className="text-lg font-bold text-gray-300 w-6 text-center">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{v.label}</div>
                    <div className="text-xs text-gray-500">{v.calCodeSection}</div>
                  </div>
                  <SeverityBadge severity={v.severity} />
                  <span className="text-sm font-bold text-red-600 w-12 text-right">-{v.deduction} pts</span>
                  {gradeImproved && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      {jurisdictionResult.grade.label} &rarr; {gradeWithout.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-green-600 text-sm font-medium">No active violations — your grade is clean!</div>
        )}
      </div>

      {/* ─── Section 4: Quick Wins ─── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#d4af37]" />
          Quick Wins
        </h2>
        <p className="text-sm text-gray-500 mb-4">Easiest improvements ranked by effort level and point impact.</p>

        {quickWins.length > 0 ? (
          <div className="space-y-2">
            {quickWins.map((item, idx) => {
              const effortInfo = EFFORT_LABELS[item.effort];
              return (
                <div key={idx} className="flex items-center gap-2 sm:gap-3 py-3 px-3 sm:px-4 rounded-lg border border-gray-100 hover:bg-gray-50 flex-wrap">
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{item.label}</div>
                    {item.mapping && (
                      <div className="text-xs text-gray-500">{item.mapping.calCodeSection}</div>
                    )}
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                    style={{ color: effortInfo.color, borderColor: effortInfo.color, backgroundColor: effortInfo.color + '15' }}
                  >
                    {effortInfo.label}
                  </span>
                  {item.deduction > 0 && (
                    <span className="text-sm font-bold text-green-600">+{item.deduction} pts</span>
                  )}
                  {item.status === 'due_soon' && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                      <Clock className="w-3 h-3" />
                      Prevent
                    </span>
                  )}
                  {item.action && item.actionLink && (
                    <button
                      onClick={() => navigate(item.actionLink!)}
                      className="text-xs font-semibold text-[#1e4d6b] hover:text-[#163a52]"
                    >
                      {item.action} &rarr;
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-green-600 text-sm font-medium">All items are in good standing!</div>
        )}
      </div>

      {/* ─── Section 5: Historical Trend ─── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#1e4d6b]" />
            Score Trend
          </h2>
          <div className="flex gap-1">
            {([30, 60, 90] as const).map(range => (
              <button
                key={range}
                onClick={() => setTrendRange(range)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  trendRange === range
                    ? 'bg-[#1e4d6b] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range}d
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '90', position: 'right', fontSize: 11 }} />
              <ReferenceLine y={75} stroke="#eab308" strokeDasharray="3 3" label={{ value: '75', position: 'right', fontSize: 11 }} />
              <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '60', position: 'right', fontSize: 11 }} />
              <Line type="monotone" dataKey="evidly" stroke="#1e4d6b" strokeWidth={2.5} dot={{ r: 3 }} name="EvidLY Score" />
              <Line type="monotone" dataKey="jurisdiction" stroke="#d4af37" strokeWidth={2} dot={{ r: 3 }} name="Inspector Grade" strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
