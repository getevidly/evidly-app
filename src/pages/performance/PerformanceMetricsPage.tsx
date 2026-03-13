import { useState } from 'react';
import { Target, AlertTriangle, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import {
  useQuarterlyMetrics,
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
const currentYear = new Date().getFullYear();
const QUARTERS = [
  `${currentYear}-Q1`,
  `${currentYear}-Q2`,
  `${currentYear}-Q3`,
  `${currentYear}-Q4`,
];

function getMetricValue(emp: PerformanceMetrics, key: string): number | null {
  if (key === 'equipmentCare') {
    return emp.equipmentDamageCount + emp.equipmentLossCount;
  }
  return (emp as unknown as Record<string, unknown>)[key] as number | null;
}

function fmtMetricValue(key: string, val: number | null, target: number): string {
  if (val == null) return '--';
  // "target 0" metrics show raw count, "target >= 1 && <= 5" might be rating, otherwise %
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

// ── Metric card ───────────────────────────────────────────────
function MetricCard({
  label,
  value,
  targetLabel,
  met,
}: {
  label: string;
  value: string;
  targetLabel: string;
  met: boolean | null;
}) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        boxShadow: CARD_SHADOW,
        borderRadius: 12,
        padding: '20px 16px',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <Target size={18} color={NAVY} />
      </div>
      <div style={{ fontSize: 13, color: TEXT_TERTIARY, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Target: {targetLabel}</div>
      {met != null && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            background: met ? '#f0fdf4' : '#fef2f2',
            color: met ? '#16a34a' : '#dc2626',
          }}
        >
          {met ? <CheckCircle size={13} /> : <XCircle size={13} />}
          {met ? 'Met' : 'Not Met'}
        </span>
      )}
      {met == null && (
        <span
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            background: '#f8fafc',
            color: TEXT_TERTIARY,
          }}
        >
          No Data
        </span>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export function PerformanceMetricsPage() {
  const [quarter, setQuarter] = useState(getCurrentQuarter());
  const [employeeId, setEmployeeId] = useState<string>('');
  const { data: metrics, isLoading: loading } = useQuarterlyMetrics(employeeId || undefined, quarter);

  const selected: PerformanceMetrics | null = metrics && metrics.length > 0 ? metrics[0] : null;
  const isEmpty = !loading && !selected;

  return (
    <div style={{ ...FONT, padding: '24px 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Header ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Target size={24} color={NAVY} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>Performance Metrics</h1>
      </div>

      {/* ── Selectors ───────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Employee ID or name..."
          value={employeeId}
          onChange={e => setEmployeeId(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${CARD_BORDER}`,
            fontSize: 14,
            color: MUTED,
            background: CARD_BG,
            minWidth: 200,
          }}
        />
        <select
          value={quarter}
          onChange={e => setQuarter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${CARD_BORDER}`,
            fontSize: 14,
            color: MUTED,
            background: CARD_BG,
            cursor: 'pointer',
          }}
        >
          {QUARTERS.map(q => (
            <option key={q} value={q}>{q.replace('-', ' ')}</option>
          ))}
        </select>
      </div>

      {/* ── Loading ─────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: TEXT_TERTIARY, fontSize: 14 }}>
          Loading performance data...
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
            No performance data available. Select an employee and quarter to view metrics.
          </p>
        </div>
      )}

      {/* ── 10 Metric Cards (2x5 grid) ─────────────── */}
      {selected && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 16,
              marginBottom: 32,
            }}
          >
            {BONUS_MULTIPLIER_METRICS.map(m => {
              const val = getMetricValue(selected, m.key);
              return (
                <MetricCard
                  key={m.key}
                  label={m.label}
                  value={fmtMetricValue(m.key, val, m.target)}
                  targetLabel={fmtTargetLabel(m.key, m.target)}
                  met={metricMet(m.key, val, m.target)}
                />
              );
            })}
          </div>

          {/* ── Bonus Calculation Preview ──────────────── */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <TrendingUp size={18} color={NAVY} />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>Bonus Calculation Preview</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: TEXT_TERTIARY, marginBottom: 4 }}>Base Revenue</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: NAVY }}>
                  {fmtCurrency(selected.employeeJobRevenue)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: TEXT_TERTIARY, marginBottom: 4 }}>Multiplier</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: NAVY }}>
                  {selected.bonusMultiplier != null ? `${(selected.bonusMultiplier * 100).toFixed(0)}%` : '--'}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: TEXT_TERTIARY, marginBottom: 4 }}>Final Bonus</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: selected.bonusEligible ? '#16a34a' : '#dc2626' }}>
                  {selected.calculatedBonus != null ? fmtCurrency(selected.calculatedBonus) : '--'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Disqualifier Alerts ─────────────────────── */}
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
              <AlertTriangle size={18} color="#dc2626" />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>Disqualifier Alerts</h2>
            </div>
            <p style={{ fontSize: 13, color: TEXT_TERTIARY, margin: '0 0 16px' }}>
              Any single occurrence automatically disqualifies the employee from bonus eligibility.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {BONUS_KILLERS.map(killer => {
                const count = (selected as unknown as Record<string, unknown>)[killer.key] as number;
                const triggered = typeof count === 'number' && count > 0;
                return (
                  <div
                    key={killer.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: triggered ? '#fef2f2' : '#f0fdf4',
                      border: `1px solid ${triggered ? '#fecaca' : '#bbf7d0'}`,
                    }}
                  >
                    {triggered ? (
                      <XCircle size={18} color="#dc2626" />
                    ) : (
                      <CheckCircle size={18} color="#16a34a" />
                    )}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: triggered ? '#dc2626' : '#16a34a' }}>
                        {killer.label}
                      </div>
                      <div style={{ fontSize: 12, color: MUTED }}>
                        {triggered ? `${count} occurrence${count > 1 ? 's' : ''}` : 'Clear'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
