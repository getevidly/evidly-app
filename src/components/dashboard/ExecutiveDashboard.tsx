import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, FileText, CalendarCheck } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  LOCATIONS_WITH_SCORES,
  DEMO_ORG,
  DEMO_ORG_SCORES,
  DEMO_WEEKLY_ACTIVITY,
  DEMO_ATTENTION_ITEMS,
  DEMO_TREND_DATA,
  DEFAULT_WEIGHTS,
  getLocationScoreColor,
  getLocationStatusLabel,
} from '../../data/demoData';

// ===============================================
// CONSTANTS
// ===============================================

const GOLD = '#C49A2B';
const NAVY_BLUE = '#163a5f';
const FONT: React.CSSProperties = { fontFamily: "'Inter', 'DM Sans', sans-serif" };

// ===============================================
// ANIMATIONS
// ===============================================

const KEYFRAMES = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ringDraw {
  from { stroke-dashoffset: var(--circ); }
  to   { stroke-dashoffset: var(--off); }
}
`;

function stagger(i: number): React.CSSProperties {
  return { animation: `fadeInUp 0.4s ease-out ${i * 0.1}s both` };
}

// ===============================================
// HELPERS
// ===============================================

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function scoreColor(s: number): string {
  return getLocationScoreColor(s);
}

// ===============================================
// SCORE RING — DARK BG (header)
// ===============================================

function ScoreRing({ score, size = 120, stroke = 8, fontSize = 48 }: {
  score: number; size?: number; stroke?: number; fontSize?: number;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const off = C - (score / 100) * C;
  const color = score >= 85 ? GOLD : score >= 70 ? '#d97706' : '#dc2626';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          style={{
            '--circ': `${C}`, '--off': `${off}`,
            strokeDasharray: C, strokeDashoffset: off,
            animation: 'ringDraw 1s ease-out 0.3s both',
          } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-white" style={{ fontSize, letterSpacing: '-1px' }}>{score}</span>
      </div>
    </div>
  );
}

// ===============================================
// SCORE RING — LIGHT BG (location cards)
// ===============================================

function ScoreRingLight({ score, size = 80, stroke = 6, fontSize = 28 }: {
  score: number; size?: number; stroke?: number; fontSize?: number;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const off = C - (score / 100) * C;
  const c = scoreColor(score);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={c} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold" style={{ fontSize, color: c }}>{score}</span>
      </div>
    </div>
  );
}

// ===============================================
// PILLAR BREAKDOWN — inside location card
// ===============================================

function PillarBreakdown({ icon, label, score, ops, docs }: {
  icon: string; label: string; score: number; ops: number; docs: number;
}) {
  const c = scoreColor(score);
  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: '#f8fafc' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-700">{icon} {label}</span>
        <span className="text-sm font-bold" style={{ color: c }}>{score}%</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#e2e8f0' }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: c }} />
      </div>
      <div className="flex gap-4 text-[11px] text-gray-500">
        <span>Ops: <strong className="text-gray-700">{ops}%</strong></span>
        <span>Docs: <strong className="text-gray-700">{docs}%</strong></span>
      </div>
    </div>
  );
}

// ===============================================
// EXECUTIVE DASHBOARD
// ===============================================

export default function ExecutiveDashboard() {
  const navigate = useNavigate();

  const weightLabel = `${Math.round(DEFAULT_WEIGHTS.foodSafetyWeight * 100)}%`;
  const fireWeightLabel = `${Math.round(DEFAULT_WEIGHTS.fireSafetyWeight * 100)}%`;
  const opsDocsLabel = `Ops ${Math.round(DEFAULT_WEIGHTS.opsWeight * 100)}% \u00B7 Docs ${Math.round(DEFAULT_WEIGHTS.docsWeight * 100)}%`;

  // Trend data (memoized since it generates dates)
  const trendData = useMemo(() => DEMO_TREND_DATA, []);

  return (
    <div style={FONT}>
      <style>{KEYFRAMES}</style>

      {/* ================================================================ */}
      {/* DARK NAVY HEADER                                                 */}
      {/* ================================================================ */}
      <div
        className="rounded-none sm:rounded-b-[20px] relative overflow-hidden mb-8"
        style={{
          background: 'linear-gradient(135deg, #0d2847 0%, #1a3d6d 50%, #0d2847 100%)',
          padding: '24px 24px 44px',
          ...stagger(0),
        }}
      >
        {/* Gold radial glow */}
        <div className="absolute pointer-events-none" style={{
          top: -80, right: -40, width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(196,154,43,0.10) 0%, transparent 55%)',
        }} />

        {/* Row 1: Logo | Divider | Greeting | Org */}
        <div className="flex items-start gap-4 mb-8 relative z-10">
          {/* Logo block */}
          <div className="flex-shrink-0">
            <div className="flex items-baseline">
              <span className="text-2xl font-bold" style={{ color: GOLD }}>E</span>
              <span className="text-2xl font-bold text-white">vid</span>
              <span className="text-2xl font-bold" style={{ color: GOLD }}>LY</span>
            </div>
            <p className="text-[9px] uppercase text-white mt-0.5" style={{ opacity: 0.45, letterSpacing: '0.12em' }}>
              Compliance Simplified
            </p>
          </div>

          {/* Vertical divider */}
          <div className="w-px self-stretch" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />

          {/* Greeting + Date */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-base font-medium">{getGreeting()}, James.</p>
            <p className="text-blue-200 text-xs mt-0.5" style={{ opacity: 0.7 }}>{getFormattedDate()}</p>
          </div>

          {/* Org info */}
          <div className="text-right flex-shrink-0">
            <p className="text-white font-semibold text-sm">{DEMO_ORG.name}</p>
            <p className="text-blue-200 text-xs mt-0.5" style={{ opacity: 0.7 }}>
              {DEMO_ORG.locationCount} locations &middot; CA
            </p>
          </div>
        </div>

        {/* Overall Score Ring — centered hero */}
        <div className="flex flex-col items-center mb-8 relative z-10" style={stagger(1)}>
          <ScoreRing score={DEMO_ORG_SCORES.overall} />
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-sm" style={{ color: '#22c55e' }}>&uarr;</span>
            <span className="text-sm text-blue-100">2.3 vs last week</span>
          </div>
          <p className="text-[11px] uppercase text-white mt-1" style={{ letterSpacing: '0.1em', opacity: 0.5 }}>
            Inspection Readiness
          </p>
        </div>

        {/* Two Pillar Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10" style={stagger(2)}>
          {[
            { icon: '\uD83C\uDF7D\uFE0F', label: 'Food Safety', score: DEMO_ORG_SCORES.foodSafety, weight: weightLabel, trend: '+1.2' },
            { icon: '\uD83D\uDD25', label: 'Fire Safety', score: DEMO_ORG_SCORES.fireSafety, weight: fireWeightLabel, trend: '+0.8' },
          ].map(p => (
            <div key={p.label} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-blue-100">{p.icon} {p.label}</span>
                <span className="text-[10px] text-blue-200" style={{ opacity: 0.6 }}>{p.weight}</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-white">{p.score}%</span>
                <span className="text-xs" style={{ color: '#22c55e' }}>&uarr;{p.trend}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden mb-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
                <div className="h-full rounded-full" style={{
                  width: `${p.score}%`,
                  backgroundColor: p.score >= 85 ? '#16a34a' : p.score >= 70 ? '#d97706' : '#dc2626',
                }} />
              </div>
              <p className="text-[10px] text-blue-200" style={{ opacity: 0.5 }}>{opsDocsLabel}</p>
            </div>
          ))}
        </div>

        {/* Gold accent line at bottom of header */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: GOLD }} />
      </div>

      {/* ================================================================ */}
      {/* LOCATION PERFORMANCE                                             */}
      {/* ================================================================ */}
      <div className="px-1" style={stagger(3)}>
        <h3 className="text-[13px] font-semibold uppercase mb-4" style={{ letterSpacing: '0.05em', color: '#64748b' }}>
          Location Performance
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {LOCATIONS_WITH_SCORES.map((loc, idx) => {
            const c = scoreColor(loc.score);
            const statusLabel = getLocationStatusLabel(loc.score);
            const trendSign = loc.trend >= 0 ? '+' : '';

            return (
              <div
                key={loc.id}
                className="bg-white rounded-2xl p-6 cursor-pointer transition-all duration-200"
                style={{
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
                  border: '1px solid #f1f5f9',
                  ...stagger(3 + idx),
                }}
                onClick={() => navigate(`/dashboard?location=${loc.id}`)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.06)';
                  e.currentTarget.style.borderColor = GOLD;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#f1f5f9';
                }}
              >
                {/* Name */}
                <h4 className="text-base font-medium text-gray-900 mb-4">{loc.name}</h4>

                {/* Score ring centered */}
                <div className="flex flex-col items-center mb-4">
                  <ScoreRingLight score={loc.score} />
                  <div className="flex items-center gap-1 mt-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                    <span className="text-xs font-medium" style={{ color: c }}>{statusLabel}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{trendSign}{loc.trend} vs last week</p>
                </div>

                {/* Two pillar breakdowns */}
                <div className="space-y-2 mb-4">
                  <PillarBreakdown
                    icon={'\uD83C\uDF7D\uFE0F'}
                    label="Food Safety"
                    score={loc.foodScore}
                    ops={loc.foodSafety.ops}
                    docs={loc.foodSafety.docs}
                  />
                  <PillarBreakdown
                    icon={'\uD83D\uDD25'}
                    label="Fire Safety"
                    score={loc.fireScore}
                    ops={loc.fireSafety.ops}
                    docs={loc.fireSafety.docs}
                  />
                </div>

                {/* View Details link */}
                <button
                  className="text-sm font-medium w-full text-center py-1"
                  style={{ color: NAVY_BLUE }}
                  onClick={e => { e.stopPropagation(); navigate(`/dashboard?location=${loc.id}`); }}
                >
                  View Details &rarr;
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* TREND + ATTENTION (side by side on desktop)                      */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8 px-1">

        {/* 30-Day Compliance Trend */}
        <div
          className="bg-white rounded-2xl p-6"
          style={{
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #f1f5f9',
            ...stagger(6),
          }}
        >
          <h3 className="text-[13px] font-semibold uppercase mb-4" style={{ letterSpacing: '0.05em', color: '#64748b' }}>
            Compliance Trend
          </h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="goldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  domain={[60, 100]}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(v: number, name: string) => {
                    const labels: Record<string, string> = { overall: 'Overall', foodSafety: 'Food Safety', fireSafety: 'Fire Safety' };
                    return [`${v}%`, labels[name] || name];
                  }}
                />
                <Area type="monotone" dataKey="overall" stroke={GOLD} strokeWidth={2.5} fill="url(#goldAreaGrad)" dot={false} activeDot={{ r: 4, fill: GOLD }} name="overall" />
                <Line type="monotone" dataKey="foodSafety" stroke="#16a34a" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} name="foodSafety" />
                <Line type="monotone" dataKey="fireSafety" stroke="#ea580c" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} name="fireSafety" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-5 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-[2.5px] rounded" style={{ backgroundColor: GOLD }} />
              <span className="text-[10px] text-gray-500">Overall</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-[1.5px] rounded" style={{ backgroundColor: '#16a34a' }} />
              <span className="text-[10px] text-gray-500">Food Safety</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-[1.5px] rounded" style={{ backgroundColor: '#ea580c' }} />
              <span className="text-[10px] text-gray-500">Fire Safety</span>
            </div>
          </div>
        </div>

        {/* Attention Required */}
        <div
          className="bg-white rounded-2xl p-6"
          style={{
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #f1f5f9',
            ...stagger(7),
          }}
        >
          <h3 className="text-[13px] font-semibold uppercase mb-4" style={{ letterSpacing: '0.05em', color: '#64748b' }}>
            Attention Required
          </h3>

          {DEMO_ATTENTION_ITEMS.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-3xl mb-2">&#x2705;</span>
              <p className="text-sm font-medium text-gray-700">All Clear</p>
              <p className="text-xs text-gray-400 mt-1">All {DEMO_ORG.locationCount} locations are above 85%. No immediate action required.</p>
              <p className="text-[10px] text-gray-300 mt-2">Last reviewed: 2 minutes ago</p>
            </div>
          ) : (
            <div className="space-y-3">
              {DEMO_ATTENTION_ITEMS.map(item => {
                const isCritical = item.status === 'critical';
                const borderColor = isCritical ? '#dc2626' : '#d97706';

                return (
                  <div
                    key={item.locationId}
                    className="rounded-xl p-4 relative"
                    style={{
                      borderLeft: `4px solid ${borderColor}`,
                      backgroundColor: isCritical ? '#fef2f2' : '#fffbeb',
                    }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{isCritical ? '\uD83D\uDD34' : '\uD83D\uDFE1'}</span>
                        <span className="text-sm font-semibold text-gray-900">{item.locationName}</span>
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                          style={{ color: borderColor, backgroundColor: borderColor + '15' }}
                        >
                          {item.score}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3 ml-6">
                      {item.summary}
                    </p>
                    <button
                      className="ml-6 text-sm font-medium transition-colors"
                      style={{ color: NAVY_BLUE }}
                      onClick={() => navigate(item.route)}
                    >
                      {item.action} &rarr;
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* THIS WEEK'S ACTIVITY — data-dense strip                          */}
      {/* ================================================================ */}
      <div
        className="rounded-xl p-4 sm:px-6 mb-8 mx-1 flex flex-wrap gap-x-6 gap-y-2 text-sm"
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          color: '#475569',
          ...stagger(8),
        }}
      >
        <span>
          &#x1F4CA; <strong style={{ color: '#1a3d6d' }}>{DEMO_WEEKLY_ACTIVITY.tempChecks.total}</strong> temp checks ({DEMO_WEEKLY_ACTIVITY.tempChecks.onTimePercent}% on time)
        </span>
        <span className="hidden sm:inline text-gray-300">&middot;</span>
        <span>
          &#x1F4CB; <strong style={{ color: '#1a3d6d' }}>{DEMO_WEEKLY_ACTIVITY.checklists.completed}/{DEMO_WEEKLY_ACTIVITY.checklists.required}</strong> checklists ({DEMO_WEEKLY_ACTIVITY.checklists.percent}%)
        </span>
        <span className="hidden sm:inline text-gray-300">&middot;</span>
        <span>
          &#x1F4C4; <strong style={{ color: '#1a3d6d' }}>{DEMO_WEEKLY_ACTIVITY.documents.uploaded}</strong> docs uploaded &middot; {DEMO_WEEKLY_ACTIVITY.documents.expiringSoon} expiring
        </span>
        <span className="hidden sm:inline text-gray-300">&middot;</span>
        <span>
          &#x26A0;&#xFE0F; <strong style={{ color: '#1a3d6d' }}>{DEMO_WEEKLY_ACTIVITY.incidents.total}</strong> incidents ({DEMO_WEEKLY_ACTIVITY.incidents.resolved} resolved)
        </span>
        <span className="hidden sm:inline text-gray-300">&middot;</span>
        <span>
          &#x1F465; <strong style={{ color: '#1a3d6d' }}>{DEMO_WEEKLY_ACTIVITY.activeTeam}</strong> active team
        </span>
      </div>

      {/* ================================================================ */}
      {/* STRATEGIC ACTIONS                                                */}
      {/* ================================================================ */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 px-1" style={stagger(9)}>
        {[
          { icon: BarChart3, label: 'Generate Org Report', route: '/reports' },
          { icon: FileText, label: 'View Benchmarks', route: '/benchmarks' },
          { icon: CalendarCheck, label: 'Schedule Audit', route: '/inspections' },
        ].map(action => (
          <button
            key={action.route}
            onClick={() => navigate(action.route)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-150 w-full sm:w-auto justify-center"
            style={{
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: NAVY_BLUE,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#1e40af';
              e.currentTarget.style.color = '#1e40af';
              e.currentTarget.style.backgroundColor = '#eff6ff';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(30,64,175,0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = NAVY_BLUE;
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <action.icon size={18} />
            {action.label}
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* FOOTER — EvidLY branding                                         */}
      {/* ================================================================ */}
      <div className="text-center pb-6" style={stagger(10)}>
        <div className="flex items-center justify-center gap-1.5">
          <span className="font-bold" style={{ color: GOLD }}>E</span>
          <span className="font-bold" style={{ color: NAVY_BLUE }}>vid</span>
          <span className="font-bold" style={{ color: GOLD }}>LY</span>
          <span className="text-xs text-gray-400 ml-1">Compliance Simplified</span>
        </div>
      </div>
    </div>
  );
}
