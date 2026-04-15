import { useState } from 'react';
import { DollarSign, Download, X, Check, AlertTriangle } from 'lucide-react';
import { typography } from '../../lib/designSystem';
import {
  useBonusSummary,
  useQuarterlyMetrics,
  getCurrentQuarter,
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
const FONT: React.CSSProperties = { fontFamily: typography.family.body };

// ── Helpers ───────────────────────────────────────────────────
const currentYear = new Date().getFullYear();
const QUARTERS = [
  `${currentYear}-Q1`,
  `${currentYear}-Q2`,
  `${currentYear}-Q3`,
  `${currentYear}-Q4`,
];

function fmtCurrency(v: number): string {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fmtPct(v: number | null): string {
  if (v == null) return '--';
  return `${(v * 100).toFixed(0)}%`;
}

function hasAnyKiller(m: PerformanceMetrics): boolean {
  return BONUS_KILLERS.some(k => {
    const val = (m as unknown as Record<string, unknown>)[k.key];
    return typeof val === 'number' && val > 0;
  });
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        boxShadow: CARD_SHADOW,
        borderRadius: 12,
        padding: '24px 16px',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: NAVY }}>{value}</div>
      <div style={{ fontSize: 13, color: TEXT_TERTIARY, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export function BonusDashboardPage() {
  const [quarter, setQuarter] = useState(getCurrentQuarter());
  const { data: summary, isLoading: summaryLoading } = useBonusSummary(quarter);
  const { data: metrics, isLoading: metricsLoading } = useQuarterlyMetrics(undefined, quarter);

  const loading = summaryLoading || metricsLoading;
  const employees: PerformanceMetrics[] = summary?.employees ?? (metrics ?? []);
  const isEmpty = !loading && employees.length === 0;

  return (
    <div style={{ ...FONT, padding: '24px 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Header ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DollarSign size={24} color={NAVY} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>Bonus Management</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

          <button
            onClick={() => alert('Export to Payroll will be available when connected to your payroll provider.')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: NAVY,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={16} />
            Export to Payroll
          </button>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard
          icon={<DollarSign size={20} color={NAVY} />}
          label="Gross Revenue"
          value={summary ? fmtCurrency(summary.totalRevenue) : '$0'}
        />
        <StatCard
          icon={<DollarSign size={20} color="#16a34a" />}
          label="Total Bonuses"
          value={summary ? fmtCurrency(summary.totalBonuses) : '$0'}
        />
        <StatCard
          icon={<Check size={20} color="#16a34a" />}
          label="Eligible"
          value={summary ? String(summary.eligibleCount) : '0'}
        />
        <StatCard
          icon={<X size={20} color="#dc2626" />}
          label="Disqualified"
          value={summary ? String(summary.disqualifiedCount) : '0'}
        />
      </div>

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
            No bonus data available for {quarter.replace('-', ' ')}. Employee metrics will appear here once jobs are completed.
          </p>
        </div>
      )}

      {/* ── Employee breakdown table ────────────────── */}
      {!isEmpty && employees.length > 0 && (
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            boxShadow: CARD_SHADOW,
            borderRadius: 12,
            overflow: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                {['Name', 'Role', 'Jobs', 'Revenue', 'Killers', 'Multiplier %', 'Bonus', 'Status'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: h === 'Name' ? 'left' : 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: TEXT_TERTIARY,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const killed = hasAnyKiller(emp);
                return (
                  <tr key={emp.id} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: NAVY }}>
                      {emp.employeeName || emp.employeeId}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: MUTED }}>--</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: MUTED }}>
                      {emp.jobsCompleted}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: MUTED }}>
                      {fmtCurrency(emp.employeeJobRevenue)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {killed ? (
                        <X size={16} color="#dc2626" style={{ display: 'inline-block' }} />
                      ) : (
                        <Check size={16} color="#16a34a" style={{ display: 'inline-block' }} />
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: MUTED }}>
                      {fmtPct(emp.bonusMultiplier)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: NAVY }}>
                      {emp.calculatedBonus != null ? fmtCurrency(emp.calculatedBonus) : '--'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: emp.bonusEligible ? '#f0fdf4' : '#fef2f2',
                          color: emp.bonusEligible ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {emp.bonusEligible ? 'Eligible' : 'Disqualified'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Loading state ───────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: TEXT_TERTIARY, fontSize: 14 }}>
          Loading bonus data...
        </div>
      )}
    </div>
  );
}
