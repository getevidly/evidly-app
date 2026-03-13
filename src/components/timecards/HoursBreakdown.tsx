interface HoursBreakdownProps {
  regular: number;
  ot: number;
  dt: number;
  total: number;
}

export function HoursBreakdown({ regular, ot, dt, total }: HoursBreakdownProps) {
  if (total === 0) return <p className="text-sm" style={{ color: '#6B7F96' }}>No hours</p>;

  const regPct = (regular / total) * 100;
  const otPct = (ot / total) * 100;
  const dtPct = (dt / total) * 100;

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#EEF1F7' }}>
        {regular > 0 && (
          <div style={{ width: `${regPct}%`, backgroundColor: '#94a3b8' }} title={`Regular: ${regular.toFixed(1)}h`} />
        )}
        {ot > 0 && (
          <div style={{ width: `${otPct}%`, backgroundColor: '#f59e0b' }} title={`OT: ${ot.toFixed(1)}h`} />
        )}
        {dt > 0 && (
          <div style={{ width: `${dtPct}%`, backgroundColor: '#ea580c' }} title={`DT: ${dt.toFixed(1)}h`} />
        )}
      </div>

      {/* Labels */}
      <div className="flex items-center gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#94a3b8' }} />
          <span style={{ color: '#3D5068' }}>Reg {regular.toFixed(1)}h</span>
        </span>
        {ot > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#f59e0b' }} />
            <span style={{ color: '#854d0e' }}>OT {ot.toFixed(1)}h</span>
          </span>
        )}
        {dt > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#ea580c' }} />
            <span style={{ color: '#9a3412' }}>DT {dt.toFixed(1)}h</span>
          </span>
        )}
        <span className="ml-auto font-semibold" style={{ color: '#0B1628' }}>{total.toFixed(1)}h total</span>
      </div>
    </div>
  );
}
