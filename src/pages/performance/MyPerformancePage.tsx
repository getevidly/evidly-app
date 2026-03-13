import { TrendingUp, AlertTriangle, CheckCircle, XCircle, Lightbulb, Target } from 'lucide-react';
import {
  useCalculateBonus,
  getCurrentQuarter,
  BONUS_MULTIPLIER_METRICS,
  BONUS_KILLERS,
  type PerformanceMetrics,
} from '../../hooks/api/useBonuses';

// ── Design tokens ─────────────────────────────────────────────
const NAVY = '#163a5f';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#D1D9E6';
const CARD_SHADOW = '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)';
const TEXT_TERTIARY = '#6B7F96';
const MUTED = '#3D5068';
const FONT: React.CSSProperties = { fontFamily: "'Inter', 'DM Sans', sans-serif" };

// ── Helpers ───────────────────────────────────────────────────
function getMetricValue(emp: PerformanceMetrics, key: string): number | null {
  if (key === 'equipmentCare') {
    return emp.equipmentDamageCount + emp.equipmentLossCount;
  }
  return (emp as unknown as Record<string, unknown>)[key] as number | null;
}

function fmtMetricValue(key: string, val: number | null): string {
  if (val == null) return '--';
  if (key === 'averageCustomerRating') return val.toFixed(1);
  if (key === 'equipmentCare' || key === 'safetyIncidents') return String(val);
  if (key === 'inventoryVarianceRate') return `${val.toFixed(1)}%`;
  return `${val.toFixed(0)}%`;
}

function fmtTargetLabel(key: string, target: number): string {
  if (key === 'averageCustomerRating') return `${target}+`;
  if (key === 'equipmentCare' || key === 'safetyIncidents') return `${target} incidents`;
  if (key === 'inventoryVarianceRate') return `<= ${target}%`;
  return `${target}%`;
}

function metricMet(key: string, val: number | null, target: number): boolean | null {
  if (val == null) return null;
  if (key === 'equipmentCare' || key === 'safetyIncidents') return val <= target;
  if (key === 'inventoryVarianceRate') return val <= target;
  return val >= target;
}

function fmtCurrency(v: number): string {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function getQuarterLabel(q: string): string {
  return q.replace('-', ' ');
}

const IMPROVEMENT_TIPS = [
  'Complete pre-job walkthroughs and photo documentation to maintain a 100% Photo Compliance rate.',
  'Submit availability at least 2 weeks in advance to hit the Availability Submitted target.',
  'Double-check timecard entries at the end of each shift to keep Timecard Accuracy at 100%.',
  'Flag and document any deficiencies immediately on-site for full Deficiency Documentation credit.',
  'Request customer feedback proactively -- a quick check-in can lift your average rating.',
];

// ── Main page ─────────────────────────────────────────────────
export function MyPerformancePage() {
  const quarter = getCurrentQuarter();
  const { data: bonus, isLoading: loading } = useCalculateBonus('me', quarter);

  const isEmpty = !loading && !bonus;

  // Compute metrics met count
  const metsMet = bonus
    ? BONUS_MULTIPLIER_METRICS.filter(m => {
        const val = getMetricValue(bonus, m.key);
        return metricMet(m.key, val, m.target) === true;
      }).length
    : 0;
  const metricsTotal = BONUS_MULTIPLIER_METRICS.length;
  const progressPct = metricsTotal > 0 ? (metsMet / metricsTotal) * 100 : 0;

  // Check killers
  const activeKillers = bonus
    ? BONUS_KILLERS.filter(k => {
        const val = (bonus as unknown as Record<string, unknown>)[k.key];
        return typeof val === 'number' && val > 0;
      })
    : [];

  return (
    <div style={{ ...FONT, padding: '24px 24px 48px', maxWidth: 960, margin: '0 auto' }}>
      {/* ── Header ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <TrendingUp size={24} color={NAVY} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>My Performance</h1>
      </div>
      <div style={{ fontSize: 14, color: TEXT_TERTIARY, marginBottom: 28 }}>
        {getQuarterLabel(quarter)}
      </div>

      {/* ── Loading ─────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: TEXT_TERTIARY, fontSize: 14 }}>
          Loading your performance data...
        </div>
      )}

      {/* ── Empty state ─────────────────────────────── */}
      {isEmpty && (
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            boxShadow: CARD_SHADOW,
            borderRadius: 12,
            padding: 48,
            textAlign: 'center',
          }}
        >
          <AlertTriangle size={36} color={TEXT_TERTIARY} style={{ marginBottom: 12, display: 'inline-block' }} />
          <p style={{ color: MUTED, fontSize: 15, margin: 0 }}>
            No performance data available yet for {getQuarterLabel(quarter)}. Complete jobs to start tracking your metrics.
          </p>
        </div>
      )}

      {bonus && (
        <>
          {/* ── Progress Toward Bonus ─────────────────── */}
          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              boxShadow: CARD_SHADOW,
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 16px' }}>
              Progress Toward Bonus
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: MUTED }}>
                {metsMet} of {metricsTotal} metrics met
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: bonus.bonusEligible ? '#16a34a' : NAVY }}>
                {bonus.calculatedBonus != null ? fmtCurrency(bonus.calculatedBonus) : '--'}
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 10, borderRadius: 5, background: '#e5e7eb', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  borderRadius: 5,
                  background: activeKillers.length > 0 ? '#dc2626' : progressPct >= 80 ? '#16a34a' : '#d97706',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: TEXT_TERTIARY }}>0%</span>
              <span style={{ fontSize: 12, color: TEXT_TERTIARY }}>100%</span>
            </div>
            {bonus.bonusMultiplier != null && (
              <div style={{ marginTop: 12, fontSize: 13, color: MUTED }}>
                Multiplier: <strong>{(bonus.bonusMultiplier * 100).toFixed(0)}%</strong>
                {' '} | Base revenue: <strong>{fmtCurrency(bonus.employeeJobRevenue)}</strong>
              </div>
            )}
          </div>

          {/* ── Disqualifier Warnings ─────────────────── */}
          {activeKillers.length > 0 && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <AlertTriangle size={18} color="#dc2626" />
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', margin: 0 }}>
                  Bonus Disqualified
                </h2>
              </div>
              <p style={{ fontSize: 13, color: '#991b1b', margin: '0 0 12px' }}>
                The following disqualifier{activeKillers.length > 1 ? 's have' : ' has'} been triggered this quarter:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {activeKillers.map(k => (
                  <li key={k.key} style={{ fontSize: 14, color: '#991b1b', marginBottom: 4 }}>
                    {k.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Metric Cards ─────────────────────────────── */}
          <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 16px' }}>Your Metrics</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: 14,
              marginBottom: 28,
            }}
          >
            {BONUS_MULTIPLIER_METRICS.map(m => {
              const val = getMetricValue(bonus, m.key);
              const met = metricMet(m.key, val, m.target);
              return (
                <div
                  key={m.key}
                  style={{
                    background: CARD_BG,
                    border: `1px solid ${CARD_BORDER}`,
                    boxShadow: CARD_SHADOW,
                    borderRadius: 10,
                    padding: '16px 12px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                    <Target size={16} color={NAVY} />
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_TERTIARY, marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
                    {fmtMetricValue(m.key, val)}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>
                    Target: {fmtTargetLabel(m.key, m.target)}
                  </div>
                  {met != null ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        background: met ? '#f0fdf4' : '#fef2f2',
                        color: met ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {met ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      {met ? 'Met' : 'Not Met'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: TEXT_TERTIARY }}>No Data</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Tips ─────────────────────────────────────── */}
          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              boxShadow: CARD_SHADOW,
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Lightbulb size={18} color="#d97706" />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>Improvement Tips</h2>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {IMPROVEMENT_TIPS.map((tip, i) => (
                <li key={i} style={{ fontSize: 14, color: MUTED, marginBottom: 10, lineHeight: 1.5 }}>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
