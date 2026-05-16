import { Radar, ShieldCheck, FileCheck } from 'lucide-react';
import type { ShiftPRPMetrics } from '../../hooks/useShiftPRPMetrics';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

type PRPVariant = 'handoff' | 'live';

const COPY: Record<PRPVariant, Record<'predict' | 'reduce' | 'prove', (m: ShiftPRPMetrics) => string>> = {
  handoff: {
    predict: (m) => `${m.predict} items coming due in next 14 days`,
    reduce: (m) => `${m.reduce} active corrective actions`,
    prove: (m) =>
      m.prove.total > 0
        ? `${m.prove.pct}% documents current \u00B7 ${m.prove.ready} of ${m.prove.total}`
        : 'No documents tracked yet',
  },
  live: {
    predict: (m) => `${m.predict} task${m.predict !== 1 ? 's' : ''} due in next 4 hours`,
    reduce: (m) => `${m.reduce} overdue item${m.reduce !== 1 ? 's' : ''} right now`,
    prove: (m) =>
      m.prove.total > 0
        ? `${m.prove.pct}% of shift tasks completed \u00B7 ${m.prove.ready} of ${m.prove.total}`
        : 'No tasks scheduled for this shift',
  },
};

const ROWS = [
  { key: 'predict' as const, label: 'Predict', icon: Radar, bg: '#EEEDFE', accent: '#534AB7' },
  { key: 'reduce' as const, label: 'Reduce', icon: ShieldCheck, bg: '#FAEEDA', accent: '#BA7517' },
  { key: 'prove' as const, label: 'Prove', icon: FileCheck, bg: '#E1F5EE', accent: '#0F6E56' },
] as const;

interface ShiftPRPBlockProps {
  metrics: ShiftPRPMetrics;
  loading: boolean;
  variant?: PRPVariant;
}

export function ShiftPRPBlock({ metrics, loading, variant = 'handoff' }: ShiftPRPBlockProps) {
  const copy = COPY[variant];

  return (
    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-[#1E2D4D]/80">Shift outlook</h3>
        <span
          className="px-1.5 py-0.5 text-[11px] font-medium rounded"
          style={{ backgroundColor: `${GOLD}15`, color: GOLD }}
        >
          PRP
        </span>
      </div>

      <div className="space-y-2">
        {ROWS.map(row => {
          const Icon = row.icon;
          return (
            <div
              key={row.key}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ backgroundColor: row.bg }}
            >
              <Icon size={16} style={{ color: row.accent }} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold" style={{ color: row.accent }}>
                  {row.label}
                </span>
                {loading ? (
                  <div className="h-3 w-32 mt-1 rounded bg-[#1E2D4D]/5 animate-pulse" />
                ) : (
                  <p className="text-sm" style={{ color: NAVY }}>
                    {copy[row.key](metrics)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
