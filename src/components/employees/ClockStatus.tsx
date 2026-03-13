import { CLOCK_STATE_CONFIG, type ClockState } from '../../data/employeesDemoData';

interface ClockStatusProps {
  state: ClockState;
  since?: string | null;
  jobLocation?: string | null;
}

export function ClockStatus({ state, since, jobLocation }: ClockStatusProps) {
  const cfg = CLOCK_STATE_CONFIG[state];

  const duration = (() => {
    if (state === 'off' || !since) return null;
    const start = new Date(since);
    const now = new Date();
    const diffMin = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60000));
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h}h ${m}m`;
  })();

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className="w-2 h-2 rounded-full inline-block flex-shrink-0"
        style={{ backgroundColor: cfg.color }}
      />
      <span style={{ color: cfg.color }} className="font-medium">{cfg.label}</span>
      {duration && <span style={{ color: '#6B7F96' }}>({duration})</span>}
      {state === 'on_job' && jobLocation && (
        <span style={{ color: '#6B7F96' }} className="truncate max-w-[140px]">· {jobLocation}</span>
      )}
    </span>
  );
}
