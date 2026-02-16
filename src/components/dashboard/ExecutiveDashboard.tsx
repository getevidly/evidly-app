import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, BarChart3, CalendarCheck, AlertTriangle, ClipboardCheck, Thermometer, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  locationScores,
  locationScoresThirtyDaysAgo,
  complianceScores,
  getTrend,
  getLocationScoreColor,
  getLocationStatus,
  DEMO_LOCATIONS,
  DEMO_ORG,
  DEMO_WEEKLY_ACTIVITY,
  DEMO_TREND_30DAY,
  EXEC_ATTENTION_ITEMS,
} from '../../data/demoData';
import {
  calculateInspectionReadiness,
  calculateOrgReadiness,
} from '../../utils/inspectionReadiness';

// ===============================================
// STYLES
// ===============================================

const FONT: React.CSSProperties = { fontFamily: "'Inter', 'DM Sans', sans-serif" };

const ANIM_KEYFRAMES = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ringDraw {
  from { stroke-dashoffset: var(--ring-circumference); }
  to   { stroke-dashoffset: var(--ring-offset); }
}
`;

function animDelay(i: number): React.CSSProperties {
  return {
    animation: `fadeSlideUp 0.5s ease-out ${i * 0.1}s both`,
  };
}

// ===============================================
// SCORE RING COMPONENT
// ===============================================

function ScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
  fontSize = 48,
  color,
  animate = true,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  fontSize?: number;
  color?: string;
  animate?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const ringColor = color || (score >= 85 ? '#d4af37' : score >= 70 ? '#d97706' : '#dc2626');

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          style={animate ? {
            '--ring-circumference': `${circumference}`,
            '--ring-offset': `${offset}`,
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            animation: `ringDraw 1.2s ease-out 0.3s both`,
          } as React.CSSProperties : {
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-white" style={{ fontSize }}>{score}</span>
      </div>
    </div>
  );
}

function ScoreRingLight({
  score,
  size = 80,
  strokeWidth = 6,
  fontSize = 28,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  fontSize?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getLocationScoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold" style={{ fontSize, color }}>{score}</span>
      </div>
    </div>
  );
}

// ===============================================
// PILLAR BAR COMPONENT
// ===============================================

function PillarBar({ label, score }: { label: string; score: number }) {
  const color = getLocationScoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold w-8 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

// ===============================================
// EXECUTIVE DASHBOARD
// ===============================================

export default function ExecutiveDashboard() {
  const navigate = useNavigate();

  // Compute inspection readiness scores from shared data
  const locationReadiness = useMemo(() => {
    return DEMO_LOCATIONS.map(loc => ({
      locationId: loc.id,
      locationName: loc.name,
      score: calculateInspectionReadiness(loc.foodOps, loc.foodDocs, loc.fireOps, loc.fireDocs),
    }));
  }, []);

  const orgResult = useMemo(() => calculateOrgReadiness(locationReadiness), [locationReadiness]);
  const orgTrend = getTrend(complianceScores.overall, 76); // 30 days ago org was ~76

  return (
    <div style={FONT}>
      <style>{ANIM_KEYFRAMES}</style>

      {/* ─── DARK NAVY HEADER ─── */}
      <div
        className="rounded-2xl p-6 sm:p-8 mb-6"
        style={{
          background: 'linear-gradient(135deg, #0d2847 0%, #1a3d6d 100%)',
          ...animDelay(0),
        }}
      >
        {/* Branding */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#d4af37' }}>
            <span className="text-sm font-bold text-white">E</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-lg font-bold" style={{ color: '#d4af37' }}>E</span>
            <span className="text-lg font-bold text-white">vid</span>
            <span className="text-lg font-bold" style={{ color: '#d4af37' }}>LY</span>
          </div>
          <span className="text-xs text-blue-200 opacity-60 ml-1">Compliance Simplified</span>
        </div>

        {/* Score Ring + Org Info */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          <ScoreRing score={complianceScores.overall} />
          <div className="text-center sm:text-left">
            <p className="text-sm text-blue-200 mb-1">Organization Score</p>
            <p className="text-2xl font-bold text-white">{DEMO_ORG.name}</p>
            <p className="text-sm text-blue-300 mt-1">{DEMO_ORG.locationCount} Locations</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-sm" style={{ color: orgTrend.color }}>{orgTrend.icon}</span>
              <span className="text-sm text-blue-200">{orgTrend.diff} pts vs 30 days ago</span>
            </div>
          </div>
        </div>

        {/* Pillar Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Food Safety', score: complianceScores.foodSafety, weight: '45%' },
            { label: 'Fire Safety', score: complianceScores.fireSafety, weight: '35%' },
            { label: 'Vendor Compliance', score: complianceScores.vendorCompliance, weight: '20%' },
          ].map((pillar) => (
            <div
              key={pillar.label}
              className="rounded-xl p-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-blue-200">{pillar.label}</span>
                <span className="text-[10px] text-blue-300 opacity-60">{pillar.weight}</span>
              </div>
              <p className="text-2xl font-bold text-white">{pillar.score}</p>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pillar.score}%`,
                    backgroundColor: pillar.score >= 85 ? '#16a34a' : pillar.score >= 70 ? '#d97706' : '#dc2626',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── LOCATION PERFORMANCE ─── */}
      <div style={animDelay(1)}>
        <h3
          className="text-xs font-semibold uppercase mb-4"
          style={{ letterSpacing: '0.1em', color: '#6b7280' }}
        >
          Location Performance
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {DEMO_LOCATIONS.map((loc) => {
            const scores = locationScores[loc.id];
            const prevScores = locationScoresThirtyDaysAgo[loc.id];
            const trend = getTrend(scores.overall, prevScores?.overall || scores.overall);
            const status = getLocationStatus(scores.overall);
            const statusColor = getLocationScoreColor(scores.overall);
            const readiness = locationReadiness.find(l => l.locationId === loc.id);

            return (
              <div
                key={loc.id}
                className="bg-white rounded-xl p-5 border border-gray-100 cursor-pointer transition-all duration-200"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                onClick={() => navigate(`/dashboard?location=${loc.id}`)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <ScoreRingLight score={scores.overall} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{loc.name}</h4>
                    <span
                      className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1"
                      style={{
                        color: statusColor,
                        backgroundColor: statusColor + '15',
                      }}
                    >
                      {status}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs" style={{ color: trend.color }}>{trend.icon} {trend.diff}</span>
                      <span className="text-[10px] text-gray-400">30d</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <PillarBar label="Food Safety" score={scores.foodSafety} />
                  <PillarBar label="Fire Safety" score={scores.fireSafety} />
                  <PillarBar label="Vendor" score={scores.vendorCompliance} />
                </div>
                {readiness && (
                  <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2 text-[10px] text-gray-400">
                    <span>Food Ops: {readiness.score.foodSafety.ops}</span>
                    <span>Food Docs: {readiness.score.foodSafety.docs}</span>
                    <span>Fire Ops: {readiness.score.fireSafety.ops}</span>
                    <span>Fire Docs: {readiness.score.fireSafety.docs}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 30-DAY TREND ─── */}
      <div
        className="bg-white rounded-xl p-5 border border-gray-100 mb-6"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', ...animDelay(2) }}
      >
        <h3
          className="text-xs font-semibold uppercase mb-4"
          style={{ letterSpacing: '0.1em', color: '#6b7280' }}
        >
          30-Day Trend
        </h3>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={DEMO_TREND_30DAY} margin={{ top: 4, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Day', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#9ca3af' }}
              />
              <YAxis
                domain={[60, 100]}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = { overall: 'Overall', foodSafety: 'Food Safety', fireSafety: 'Fire Safety' };
                  return [`${value}%`, labels[name] || name];
                }}
              />
              <Line type="monotone" dataKey="overall" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 2, fill: '#1e4d6b' }} activeDot={{ r: 4 }} name="overall" />
              <Line type="monotone" dataKey="foodSafety" stroke="#16a34a" strokeWidth={1.5} dot={{ r: 2, fill: '#16a34a' }} strokeDasharray="4 2" name="foodSafety" />
              <Line type="monotone" dataKey="fireSafety" stroke="#d97706" strokeWidth={1.5} dot={{ r: 2, fill: '#d97706' }} strokeDasharray="4 2" name="fireSafety" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#1e4d6b' }} />
            <span className="text-[10px] text-gray-500">Overall</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#16a34a' }} />
            <span className="text-[10px] text-gray-500">Food Safety</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#d97706' }} />
            <span className="text-[10px] text-gray-500">Fire Safety</span>
          </div>
        </div>
      </div>

      {/* ─── ATTENTION REQUIRED ─── */}
      <div
        className="bg-white rounded-xl p-5 border border-gray-100 mb-6"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', ...animDelay(3) }}
      >
        <div className="flex items-center gap-2 mb-4">
          <h3
            className="text-xs font-semibold uppercase"
            style={{ letterSpacing: '0.1em', color: '#6b7280' }}
          >
            Attention Required
          </h3>
          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
            {EXEC_ATTENTION_ITEMS.length}
          </span>
        </div>
        <div className="space-y-2">
          {EXEC_ATTENTION_ITEMS.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{
                borderLeft: `4px solid ${item.severity === 'critical' ? '#dc2626' : '#d97706'}`,
                backgroundColor: item.severity === 'critical' ? '#fef2f2' : '#fffbeb',
              }}
            >
              {item.severity === 'critical' ? (
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {item.location}: {item.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
              </div>
              <button
                onClick={() => navigate(item.actionRoute)}
                className="text-xs font-medium shrink-0 px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1e4d6b' }}
              >
                {item.actionLabel} &rarr;
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ─── ACTIVITY STRIP ─── */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        style={animDelay(4)}
      >
        {[
          { icon: ClipboardCheck, label: 'Inspections', value: DEMO_WEEKLY_ACTIVITY.inspections, color: '#1e4d6b' },
          { icon: FileText, label: 'Checklists', value: DEMO_WEEKLY_ACTIVITY.checklists, color: '#16a34a' },
          { icon: Thermometer, label: 'Temps Logged', value: DEMO_WEEKLY_ACTIVITY.tempsLogged, color: '#d97706' },
          { icon: AlertTriangle, label: 'Incidents', value: DEMO_WEEKLY_ACTIVITY.incidents, color: '#dc2626' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-4 border border-gray-100 text-center"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          >
            <stat.icon size={20} className="mx-auto mb-2" style={{ color: stat.color }} />
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{stat.label} this week</p>
          </div>
        ))}
      </div>

      {/* ─── STRATEGIC ACTIONS ─── */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8"
        style={animDelay(5)}
      >
        {[
          { icon: BarChart3, label: 'Generate Org Report', route: '/reports' },
          { icon: FileText, label: 'Benchmarks', route: '/benchmarks' },
          { icon: CalendarCheck, label: 'Schedule Audit', route: '/inspections' },
        ].map((action) => (
          <button
            key={action.route}
            onClick={() => navigate(action.route)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200"
            style={{ borderColor: '#1e4d6b', color: '#1e4d6b' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1e4d6b'; e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#1e4d6b'; }}
          >
            <action.icon size={18} />
            {action.label}
          </button>
        ))}
      </div>

      {/* ─── FOOTER ─── */}
      <div className="text-center pb-4" style={animDelay(6)}>
        <p className="text-[11px] text-gray-400">
          Powered by{' '}
          <span className="font-semibold" style={{ color: '#1e4d6b' }}>Evid</span>
          <span className="font-semibold" style={{ color: '#d4af37' }}>LY</span>
          {' '}&mdash; Compliance Simplified
        </p>
      </div>
    </div>
  );
}
