import { useState } from 'react';
import { RotateCcw, Plus, AlertTriangle, Phone, CheckCircle, Clock } from 'lucide-react';
import {
  useCallbacks,
  getCurrentQuarter,
  type JobCallback,
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
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function computeStats(callbacks: JobCallback[], quarter: string) {
  const total = callbacks.length;

  // Parse quarter to get date range
  const [yearStr, qStr] = quarter.split('-Q');
  const year = parseInt(yearStr, 10);
  const q = parseInt(qStr, 10);
  const startMonth = (q - 1) * 3;
  const qStart = new Date(year, startMonth, 1);
  const qEnd = new Date(year, startMonth + 3, 0, 23, 59, 59);

  const thisQuarter = callbacks.filter(cb => {
    const d = new Date(cb.createdAt);
    return d >= qStart && d <= qEnd;
  }).length;

  const customerReported = callbacks.filter(cb => cb.customerReported).length;
  const resolved = callbacks.filter(cb => cb.resolvedAt != null).length;

  return { total, thisQuarter, customerReported, resolved };
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
export function CallbacksPage() {
  const quarter = getCurrentQuarter();
  const [filterQuarter] = useState(quarter);
  const { data: rawCallbacks, isLoading: loading } = useCallbacks(filterQuarter);
  const callbacks: JobCallback[] = rawCallbacks ?? [];

  const stats = computeStats(callbacks, quarter);
  const isEmpty = !loading && callbacks.length === 0;

  return (
    <div style={{ ...FONT, padding: '24px 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Header ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RotateCcw size={24} color={NAVY} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>Callbacks</h1>
        </div>

        <button
          onClick={() => alert('Log Callback will be available once connected to your job management system.')}
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
          <Plus size={16} />
          Log Callback
        </button>
      </div>

      {/* ── Stats row ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard
          icon={<RotateCcw size={20} color={NAVY} />}
          label="Total Callbacks"
          value={String(stats.total)}
        />
        <StatCard
          icon={<Clock size={20} color="#d97706" />}
          label="This Quarter"
          value={String(stats.thisQuarter)}
        />
        <StatCard
          icon={<Phone size={20} color="#dc2626" />}
          label="Customer Reported"
          value={String(stats.customerReported)}
        />
        <StatCard
          icon={<CheckCircle size={20} color="#16a34a" />}
          label="Resolved"
          value={String(stats.resolved)}
        />
      </div>

      {/* ── Loading ─────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: TEXT_TERTIARY, fontSize: 14 }}>
          Loading callbacks...
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
            No callbacks recorded. Callbacks will appear here when jobs require follow-up service.
          </p>
        </div>
      )}

      {/* ── Callbacks table ─────────────────────────── */}
      {!isEmpty && callbacks.length > 0 && (
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
                {['Date', 'Original Job', 'Technician', 'Reason', 'Customer Reported', 'Status'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: h === 'Date' || h === 'Reason' ? 'left' : 'center',
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
              {callbacks.map(cb => {
                const resolved = cb.resolvedAt != null;
                return (
                  <tr key={cb.id} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                    <td style={{ padding: '12px 16px', color: MUTED }}>
                      {fmtDate(cb.createdAt)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: NAVY }}>
                      {cb.originalJobId}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: MUTED }}>
                      {cb.employeeName || cb.employeeId}
                    </td>
                    <td style={{ padding: '12px 16px', color: MUTED }}>
                      {cb.reason}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {cb.customerReported ? (
                        <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>Yes</span>
                      ) : (
                        <span style={{ color: TEXT_TERTIARY, fontSize: 13 }}>No</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: resolved ? '#f0fdf4' : '#fefce8',
                          color: resolved ? '#16a34a' : '#d97706',
                        }}
                      >
                        {resolved ? 'Resolved' : 'Open'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
