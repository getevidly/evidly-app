/**
 * TasksEmptyState — C17.5
 *
 * Replaces the single "No tasks scheduled for today." <p> when
 * task_instances for today = 0. Day 1 vs Day 90 variant switched
 * by useOrgAge.
 */

import { useOrgAge } from '../../../hooks/useOrgAge';
import { useTodayList } from '../../../hooks/useTodayList';

interface TasksEmptyStateProps {
  variant?: 'day1' | 'day90';
}

/* ── Strap ──────────────────────────────────────────────────────── */

const strapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 14px',
  borderRadius: '8px 8px 0 0',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.4,
  color: '#FFFFFF',
  background: 'linear-gradient(90deg, #0F6E56 0%, #0B5A46 100%)',
};

const pulseDot: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#5CEDB8',
  boxShadow: '0 0 6px rgba(92,237,184,0.6)',
  animation: 'es-pulse 2s ease-in-out infinite',
};

/* ── Card ───────────────────────────────────────────────────────── */

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '0.5px solid var(--line, #E5E2DA)',
  borderRadius: 12,
  overflow: 'hidden',
};

const bodyStyle: React.CSSProperties = {
  padding: '18px 20px',
  fontSize: 13,
  lineHeight: 1.6,
  color: 'var(--navy, #1E2D4D)',
};

const ctaStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  marginTop: 14,
  padding: '8px 16px',
  background: 'transparent',
  border: '0.5px solid var(--line, #E5E2DA)',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--navy, #1E2D4D)',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  padding: '10px 20px',
  borderTop: '0.5px solid var(--line, #E5E2DA)',
  fontSize: 11,
  color: 'var(--muted, #6B6960)',
};

const checkIcon: React.CSSProperties = {
  display: 'inline-block',
  width: 12,
  height: 12,
  borderRadius: '50%',
  background: 'var(--prove-bg, #E1F5EE)',
  color: 'var(--prove, #0F6E56)',
  fontSize: 9,
  lineHeight: '12px',
  textAlign: 'center',
  marginRight: 4,
  flexShrink: 0,
};

/* ── Component ──────────────────────────────────────────────────── */

export function TasksEmptyState({ variant }: TasksEmptyStateProps) {
  const { isDay1Phase } = useOrgAge();
  const { totalToday, doneToday } = useTodayList();
  const resolved = variant ?? (isDay1Phase ? 'day1' : 'day90');

  const laterToday = Math.max(totalToday - doneToday, 0);

  return (
    <>
      <style>{`@keyframes es-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      <div style={cardStyle}>
        {/* Teal pulse strap */}
        <div style={strapStyle}>
          <span style={pulseDot} />
          EvidLY is watching
        </div>

        <div style={bodyStyle}>
          {resolved === 'day1' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 6px' }}>
                <span style={{ fontSize: 16 }}>📋</span>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>
                  Your first day with EvidLY.
                </p>
              </div>
              {/* TODO: append next-occurrence time from task_instances when query available */}
              <p style={{ margin: 0, color: 'var(--muted, #6B6960)' }}>
                EvidLY pre-scheduled controls for tomorrow based on your county's
                inspection cadence.
              </p>
              {/* TODO: wire to /calendar?date=tomorrow when calendar day-view lands */}
              <button type="button" style={ctaStyle}>
                Preview tomorrow
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 6px' }}>
                <span style={{ fontSize: 16 }}>📋</span>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>
                  Today's tasks are on track.
                </p>
              </div>
              <p style={{ margin: 0, color: 'var(--muted, #6B6960)' }}>
                {laterToday > 0
                  ? `${laterToday} control${laterToday === 1 ? '' : 's'} scheduled for later today. Nothing requires your attention.`
                  : 'All controls for today are complete. Nothing requires your attention.'}
              </p>
              {/* TODO: wire to /calendar when schedule view lands */}
              <button type="button" style={ctaStyle}>
                View schedule
              </button>
            </>
          )}
        </div>

        {/* Footer — real counts from useTodayList */}
        {resolved === 'day90' && totalToday > 0 && (
          <div style={footerStyle}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <span style={checkIcon}>&#10003;</span>
              {doneToday} completed
            </span>
            {laterToday > 0 && (
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={checkIcon}>&#8230;</span>
                {laterToday} remaining
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
