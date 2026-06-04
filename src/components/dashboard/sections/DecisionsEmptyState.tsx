/**
 * DecisionsEmptyState — C17.5
 *
 * Replaces "No decisions awaiting your call. EvidLY is watching."
 * Day 1 = cream card with purple learning strap + baseline progress bar
 * Day 90 = navy card with teal pulse strap + auto-resolved events list
 */

import { useEffect, useState } from 'react';
import { useOrgAge } from '../../../hooks/useOrgAge';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface DecisionsEmptyStateProps {
  variant?: 'day1' | 'day90';
}

/* ── Resolved event row type ────────────────────────────────────── */

interface ResolvedEvent {
  id: string;
  title: string;
  resolved_at: string;
}

/* ── Shared styles ──────────────────────────────────────────────── */

const pulseDot: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#5CEDB8',
  boxShadow: '0 0 6px rgba(92,237,184,0.6)',
  animation: 'es-pulse 2s ease-in-out infinite',
};

/* ── Day 1 styles ───────────────────────────────────────────────── */

const day1Card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '0.5px solid var(--line, #E5E2DA)',
  borderRadius: 12,
  overflow: 'hidden',
};

const purpleStrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 14px',
  borderRadius: '8px 8px 0 0',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.4,
  color: '#FFFFFF',
  background: 'linear-gradient(90deg, var(--predict, #534AB7) 0%, #4238A0 100%)',
};

const progressBarOuter: React.CSSProperties = {
  width: '100%',
  height: 6,
  borderRadius: 3,
  background: 'rgba(83,74,183,0.15)',
  marginTop: 12,
  overflow: 'hidden',
};

/* ── Day 90 styles ──────────────────────────────────────────────── */

const day90Card: React.CSSProperties = {
  background: 'var(--navy, #1E2D4D)',
  borderRadius: 12,
  overflow: 'hidden',
  color: 'var(--cream, #FAF7F0)',
};

const tealStrap: React.CSSProperties = {
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

const eventRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  borderRadius: 6,
  background: 'rgba(250,247,240,0.06)',
  fontSize: 12,
};

const streakFooter: React.CSSProperties = {
  padding: '10px 20px',
  borderTop: '0.5px solid rgba(250,247,240,0.1)',
  fontSize: 11,
  color: 'rgba(250,247,240,0.5)',
};

/* ── Time-ago helper ────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── Hook: fetch recently resolved decisions ────────────────────── */

function useResolvedDecisions(limit: number) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [events, setEvents] = useState<ResolvedEvent[]>([]);
  const [resolvedWeekCount, setResolvedWeekCount] = useState(0);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    async function load() {
      try {
        // Recent 3 resolved
        const { data } = await supabase
          .from('owner_decisions')
          .select('id, title, updated_at')
          .eq('org_id', orgId)
          .eq('status', 'resolved')
          .order('updated_at', { ascending: false })
          .limit(limit);

        if (cancelled) return;

        setEvents(
          (data || []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            title: r.title as string,
            resolved_at: r.updated_at as string,
          })),
        );

        // Week count
        const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const { count } = await supabase
          .from('owner_decisions')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('status', 'resolved')
          .gte('updated_at', weekAgo);

        if (!cancelled) setResolvedWeekCount(count ?? 0);
      } catch {
        // Non-critical; list stays empty
      }
    }

    load();
    return () => { cancelled = true; };
  }, [orgId, limit]);

  return { events, resolvedWeekCount };
}

/* ── Component ──────────────────────────────────────────────────── */

export function DecisionsEmptyState({ variant }: DecisionsEmptyStateProps) {
  const { daysSinceCreate, isDay1Phase, baselineProgress, baselineDaysRemaining } = useOrgAge();
  const resolved = variant ?? (isDay1Phase ? 'day1' : 'day90');

  const { events, resolvedWeekCount } = useResolvedDecisions(resolved === 'day90' ? 3 : 0);

  const dayX = Math.min(daysSinceCreate, 30);

  if (resolved === 'day1') {
    return (
      <div style={day1Card}>
        {/* Purple strap */}
        <div style={purpleStrap}>
          EvidLY is learning your kitchen &middot; day {dayX} of 30
        </div>

        <div style={{ padding: '18px 20px', fontSize: 13, lineHeight: 1.6, color: 'var(--navy, #1E2D4D)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 6px' }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>
              EvidLY is still getting to know your kitchen.
            </p>
          </div>
          <p style={{ margin: 0, color: 'var(--muted, #6B6960)' }}>
            For the next {baselineDaysRemaining > 0 ? baselineDaysRemaining : 'few'} days,
            EvidLY is building a baseline from your daily readings. Predictions
            and decisions will start appearing here once that's complete.
          </p>

          {/* Progress bar */}
          <div style={progressBarOuter}>
            <div
              style={{
                width: `${Math.round(baselineProgress * 100)}%`,
                height: '100%',
                borderRadius: 3,
                background: 'var(--predict, #534AB7)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--muted, #6B6960)' }}>
            {dayX} of 30 days
          </p>
        </div>
      </div>
    );
  }

  /* ── Day 90 — navy card ───────────────────────────────────────── */

  const hasEvents = events.length > 0;

  return (
    <>
      <style>{`@keyframes es-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      <div style={day90Card}>
        {/* Teal strap */}
        <div style={tealStrap}>
          <span style={pulseDot} />
          EvidLY is watching &middot; no decisions needed right now
        </div>

        <div style={{ padding: '18px 20px', fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 6px' }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 14, color: 'var(--cream, #FAF7F0)' }}>
              EvidLY handled the routine — nothing needs your call.
            </p>
          </div>

          {hasEvents ? (
            <>
              <p style={{ margin: '0 0 12px', color: 'rgba(250,247,240,0.65)' }}>
                In the past week, EvidLY resolved{' '}
                <span style={{ color: 'var(--gold-light, #C4AE7A)', fontWeight: 500 }}>
                  {resolvedWeekCount}
                </span>{' '}
                routine item{resolvedWeekCount === 1 ? '' : 's'} without escalating.
                You're only called in when judgment is needed.
              </p>

              {/* Recent auto-resolved list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {events.map(evt => (
                  <div key={evt.id} style={eventRow}>
                    <span style={{ color: 'var(--cream, #FAF7F0)', fontSize: 12 }}>
                      {evt.title}
                    </span>
                    <span style={{ color: 'rgba(250,247,240,0.4)', fontSize: 11, flexShrink: 0, marginLeft: 12 }}>
                      {timeAgo(evt.resolved_at)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: 'rgba(250,247,240,0.65)' }}>
              EvidLY hasn't needed to escalate anything in the past 90 days.
            </p>
          )}
        </div>

        {/* Streak footer */}
        <div style={streakFooter}>
          {daysSinceCreate} days watched without an inspector-facing issue
        </div>
      </div>
    </>
  );
}
