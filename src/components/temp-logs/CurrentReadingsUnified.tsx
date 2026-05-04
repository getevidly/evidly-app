/**
 * CurrentReadingsUnified.tsx
 *
 * Unified summary view for the Current Readings tab. Shows page-level summary
 * pills + per-variant sections (Hot, Cold, Cooldown, Receiving) with one row
 * per equipment unit. Default state only — failure pinning (FU1.5), pre-seed
 * empty styling (FU1.6), and variant tab drill-downs land in later slices.
 */

import { useUnifiedCurrentReadings, type UnifiedReadingRow } from '../../hooks/useUnifiedCurrentReadings';
import { useCurrentReadingsSummary } from '../../hooks/useCurrentReadingsSummary';
import { Loader2 } from 'lucide-react';
import { colors } from '../../lib/designSystem';

const VARIANT_DOT_COLOR: Record<string, string> = {
  hot: '#EA580C',
  cold: '#2563EB',
  cooldown: '#06B6D4',
  receiving: '#8B5CF6',
};

const VARIANT_LABELS: Record<string, string> = {
  hot: 'Hot Holding',
  cold: 'Cold Holding',
  cooldown: 'Cooldown',
  receiving: 'Receiving',
};

const STATUS_COLOR: Record<string, string> = {
  pass: colors.success,
  fail: colors.danger,
  overdue: colors.warning,
  awaiting: colors.textMuted,
};

function formatTimeSince(minutes: number | null): string {
  if (minutes === null) return 'no readings yet';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${Math.floor(minutes % 60)}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function tempPercent(temp: number | null, isHot: boolean): number | null {
  if (temp == null) return null;
  const barMin = isHot ? 100 : 20;
  const barMax = isHot ? 180 : 60;
  return Math.max(2, Math.min(98, ((temp - barMin) / (barMax - barMin)) * 100));
}

function RangeBar({ row }: { row: UnifiedReadingRow }) {
  const isHot = row.variant === 'hot';
  const percent = tempPercent(row.temperature_value, isHot);
  return (
    <div className="relative w-20 h-2 rounded-full overflow-hidden flex flex-shrink-0">
      <div style={{ backgroundColor: isHot ? '#F09595' : '#C0DD97', flex: isHot ? '0 0 35%' : '1' }} />
      <div style={{ backgroundColor: isHot ? '#C0DD97' : '#F09595', flex: isHot ? '1' : '0 0 35%' }} />
      {percent != null && (
        <div
          className="absolute w-3 h-3 rounded-full bg-white"
          style={{ top: '-2px', left: `${percent}%`, transform: 'translateX(-50%)', border: `1.5px solid ${colors.textPrimary}` }}
        />
      )}
    </div>
  );
}

function VariantSection({ variant, rows }: { variant: string; rows: UnifiedReadingRow[] }) {
  if (rows.length === 0) return null;
  const passing = rows.filter(r => r.status === 'pass').length;
  const total = rows.length;
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider flex-1" style={{ color: colors.textSecondary }}>
          {VARIANT_LABELS[variant]}
        </span>
        <span className="text-[10px]" style={{ color: colors.textTertiary }}>
          {passing}/{total} in range
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map(row => {
          const tempStr = row.temperature_value != null ? `${row.temperature_value}\u00B0F` : '--';
          const subParts: string[] = [row.equipment_type.replace(/_/g, ' ')];
          if (row.held_food_count > 0) {
            subParts.push(`${row.held_food_count} food held`);
          }
          return (
            <div
              key={row.equipment_id}
              className="rounded-lg flex items-center gap-3 px-3 py-2"
              style={{
                backgroundColor: colors.white,
                border: row.status === 'fail' ? `0.5px solid ${colors.danger}` : `0.5px solid ${colors.border}`,
              }}
            >
              <span
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: VARIANT_DOT_COLOR[variant] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: colors.textPrimary }}>
                  {row.equipment_name}
                </p>
                <p className="text-[11px] truncate" style={{ color: colors.textSecondary }}>
                  {subParts.join(' \u00B7 ')}
                </p>
              </div>
              <RangeBar row={row} />
              <span
                className="text-sm font-medium whitespace-nowrap"
                style={{ color: STATUS_COLOR[row.status], minWidth: '48px', textAlign: 'right' }}
              >
                {tempStr}
              </span>
              <span className="text-[10px] whitespace-nowrap" style={{ color: colors.textMuted, minWidth: '70px', textAlign: 'right' }}>
                {formatTimeSince(row.age_minutes)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CurrentReadingsUnified() {
  const { summary, loading: summaryLoading } = useCurrentReadingsSummary();
  const { rows, loading: rowsLoading } = useUnifiedCurrentReadings();

  if (summaryLoading || rowsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: colors.textMuted }} />
      </div>
    );
  }

  return (
    <div className="rounded-xl" style={{ backgroundColor: colors.white, border: `0.5px solid ${colors.border}` }}>
      <div className="flex flex-wrap gap-2 px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        {summary.failing > 0 && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ backgroundColor: colors.dangerSoft, color: colors.danger }}>
            ● {summary.failing} failing
          </span>
        )}
        {summary.overdue > 0 && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ backgroundColor: colors.warningSoft, color: colors.warning }}>
            ● {summary.overdue} overdue
          </span>
        )}
        {summary.inRange > 0 && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ backgroundColor: colors.successSoft, color: colors.success }}>
            ● {summary.inRange} in range
          </span>
        )}
        {summary.awaitingReading > 0 && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ backgroundColor: colors.bgPanel, color: colors.textSecondary }}>
            ● {summary.awaitingReading} awaiting first reading
          </span>
        )}
        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium ml-auto" style={{ backgroundColor: colors.bgPanel, color: colors.textSecondary }}>
          {summary.totalUnits} units · {summary.totalFoodHeld} food items held
        </span>
      </div>
      <VariantSection variant="hot" rows={rows.hot} />
      <VariantSection variant="cold" rows={rows.cold} />
      <VariantSection variant="cooldown" rows={rows.cooldown} />
      <VariantSection variant="receiving" rows={rows.receiving} />
    </div>
  );
}

export default CurrentReadingsUnified;
