/**
 * PortfolioExpenseSummary — HOODOPS-SERVICES-01
 *
 * Org-wide aggregate expense view by service type across all locations.
 * Visible to owner_operator and executive roles only.
 */
import { useState, useMemo } from 'react';
import { Flame, Fan, Filter, Shield, ShieldAlert, DollarSign, MapPin, TrendingUp } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import {
  SERVICE_TYPES,
  SERVICE_TYPE_CODES,
  calculatePeriodCost,
  projectAnnualCost,
} from '../../constants/serviceTypes';
const ICON_MAP = { Flame, Fan, Filter, Shield, ShieldAlert };

const PERIODS = [
  { label: 'Monthly', months: 1 },
  { label: 'Quarterly', months: 3 },
  { label: 'Semi-Annual', months: 6 },
  { label: 'Annual', months: 12 },
];

export function PortfolioExpenseSummary() {
  const { isDemoMode } = useDemo();
  const [periodIdx, setPeriodIdx] = useState(3); // default Annual

  // Production: query location_service_schedules from Supabase.
  // No seeded demo data — always empty until real records exist.
  const schedules = [];
  const period = PERIODS[periodIdx];

  const { rows, totals } = useMemo(() => {
    const r = SERVICE_TYPE_CODES.map(code => {
      const items = schedules.filter(s => s.service_type_code === code);
      if (items.length === 0) return null;
      const st = SERVICE_TYPES[code];
      const periodCost = items.reduce((sum, i) => sum + calculatePeriodCost(i.price, i.frequency, period.months), 0);
      const annualCost = items.reduce((sum, i) => sum + projectAnnualCost(i.price, i.frequency), 0);
      const locations = new Set(items.map(i => i.location_id)).size;
      return { code, st, periodCost, annualCost, locations };
    }).filter(Boolean);

    const t = {
      periodTotal: r.reduce((s, row) => s + row.periodCost, 0),
      annualTotal: r.reduce((s, row) => s + row.annualCost, 0),
      locationCount: new Set(schedules.map(s => s.location_id)).size,
    };
    return { rows: r, totals: t };
  }, [schedules, period]);

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--border, #D1D9E6)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid var(--border, #D1D9E6)',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #0B1628)' }}>
            Portfolio Service Spend
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary, #6B7F96)', marginTop: 2 }}>
            All locations combined
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

      {/* Summary cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
        padding: '14px 16px', borderBottom: '1px solid var(--border, #D1D9E6)',
      }}>
        {[
          { label: `${period.label} Total`, value: `$${totals.periodTotal.toLocaleString()}`, icon: DollarSign, color: '#1e4d6b' },
          { label: 'Annual Projected', value: `$${totals.annualTotal.toLocaleString()}`, icon: TrendingUp, color: '#166534' },
          { label: 'Locations', value: String(totals.locationCount), icon: MapPin, color: '#d4af37' },
        ].map(card => (
          <div key={card.label} style={{ textAlign: 'center' }}>
            <card.icon style={{ width: 18, height: 18, color: card.color, margin: '0 auto 4px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #0B1628)' }}>{card.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary, #6B7F96)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Rows */}
      {rows.map(row => {
        const Icon = ICON_MAP[row.st.icon] || Shield;
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
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #0B1628)' }}>{row.st.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary, #6B7F96)' }}>{row.locations} location{row.locations > 1 ? 's' : ''}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #0B1628)', minWidth: 80, textAlign: 'right' }}>
              ${row.periodCost.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary, #6B7F96)', minWidth: 70, textAlign: 'right' }}>
              ${row.annualCost.toLocaleString()}/yr
            </div>
          </div>
        );
      })}
    </div>
  );
}
