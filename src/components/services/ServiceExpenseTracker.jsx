/**
 * ServiceExpenseTracker — HOODOPS-SERVICES-01
 *
 * Period-based expense tracking for vendor services at a single location.
 * Shows 4 metric cards + per-type expense rows.
 */
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flame, Fan, Filter, Shield, ShieldAlert, DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import {
  SERVICE_TYPES,
  SERVICE_TYPE_CODES,
  formatFrequency,
  calculatePeriodCost,
  projectAnnualCost,
  getServiceStatus,
  STATUS_COLORS,
} from '../../constants/serviceTypes';
const ICON_MAP = { Flame, Fan, Filter, Shield, ShieldAlert };

const PERIODS = [
  { label: 'Monthly', months: 1 },
  { label: 'Quarterly', months: 3 },
  { label: 'Semi-Annual', months: 6 },
  { label: 'Annual', months: 12 },
];

export function ServiceExpenseTracker() {
  const { isDemoMode } = useDemo();
  const [searchParams] = useSearchParams();
  const locationFilter = searchParams.get('location');
  const [periodIdx, setPeriodIdx] = useState(1); // default Quarterly
  const period = PERIODS[periodIdx];

  // Production: query location_service_schedules from Supabase.
  // No seeded demo data — always empty until real records exist.
  const schedules = useMemo(() => {
    return [];
  }, []);

  const metrics = useMemo(() => {
    let periodTotal = 0;
    let annualTotal = 0;
    let completed = 0;
    let pending = 0;

    for (const s of schedules) {
      periodTotal += calculatePeriodCost(s.price, s.frequency, period.months);
      annualTotal += projectAnnualCost(s.price, s.frequency);
      const status = getServiceStatus(s.next_due_date);
      if (status === 'current') completed++;
      else pending++;
    }
    return { periodTotal, annualTotal, completed, pending };
  }, [schedules, period]);

  const rows = useMemo(() => {
    return SERVICE_TYPE_CODES.map(code => {
      const items = schedules.filter(s => s.service_type_code === code);
      if (items.length === 0) return null;
      const st = SERVICE_TYPES[code];
      const periodCost = items.reduce((sum, i) => sum + calculatePeriodCost(i.price, i.frequency, period.months), 0);
      const annualCost = items.reduce((sum, i) => sum + projectAnnualCost(i.price, i.frequency), 0);
      // worst status
      let worst = 'current';
      for (const i of items) {
        const s = getServiceStatus(i.next_due_date);
        if (s === 'overdue') { worst = 'overdue'; break; }
        if (s === 'due_soon') worst = 'due_soon';
      }
      return { code, st, periodCost, annualCost, status: worst, count: items.length };
    }).filter(Boolean);
  }, [schedules, period]);

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--border, #D1D9E6)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header + period toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid var(--border, #D1D9E6)',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #0B1628)' }}>
            Service Expenses
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary, #6B7F96)', marginTop: 2 }}>
            Cost tracking by service type
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-panel, #EEF1F7)', borderRadius: 8, padding: 3 }}>
          {PERIODS.map((p, idx) => (
            <button
              key={p.label}
              onClick={() => setPeriodIdx(idx)}
              style={{
                padding: '5px 10px', borderRadius: 6, border: 'none',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: idx === periodIdx ? '#fff' : 'transparent',
                color: idx === periodIdx ? 'var(--text-primary, #0B1628)' : 'var(--text-tertiary, #6B7F96)',
                boxShadow: idx === periodIdx ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
        padding: '14px 16px', borderBottom: '1px solid var(--border, #D1D9E6)',
      }}>
        {[
          { label: `${period.label} Total`, value: `$${metrics.periodTotal.toLocaleString()}`, icon: DollarSign, color: '#1e4d6b' },
          { label: 'Annual Projected', value: `$${metrics.annualTotal.toLocaleString()}`, icon: TrendingUp, color: '#166534' },
          { label: 'Completed', value: String(metrics.completed), icon: CheckCircle, color: '#22C55E' },
          { label: 'Pending', value: String(metrics.pending), icon: Clock, color: '#F59E0B' },
        ].map(card => (
          <div key={card.label} style={{ textAlign: 'center' }}>
            <card.icon style={{ width: 18, height: 18, color: card.color, margin: '0 auto 4px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #0B1628)' }}>{card.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary, #6B7F96)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Expense rows */}
      {rows.map(row => {
        const Icon = ICON_MAP[row.st.icon] || Shield;
        const sc = STATUS_COLORS[row.status];
        return (
          <div
            key={row.code}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px', borderBottom: '1px solid var(--border-subtle, #E8EDF5)',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: row.st.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon style={{ width: 14, height: 14, color: row.st.color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #0B1628)' }}>
                {row.st.shortName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary, #6B7F96)' }}>
                {row.count} location{row.count > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #0B1628)', minWidth: 70, textAlign: 'right' }}>
              ${row.periodCost.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary, #6B7F96)', minWidth: 60, textAlign: 'right' }}>
              ${row.annualCost.toLocaleString()}/yr
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: sc.dot, flexShrink: 0,
            }} />
          </div>
        );
      })}

      {rows.length === 0 && (
        <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary, #6B7F96)' }}>
          No expense data available for this period.
        </div>
      )}
    </div>
  );
}
