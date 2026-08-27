/**
 * TreatProveStrips — what is being worked, and what is already proven.
 *
 * Treat: corrective actions open by band, the nearest due date, and how many
 * closed and sealed this month. Prove: sealed evidence per pillar, with the
 * write-once terms stated where the counts are, so the number and what it means
 * are never separated.
 *
 * Counts only — no percentages, no score, no blended figure.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { SEVERITY_ASC, SEVERITY_COLORS, fromStoredSeverity, type Severity } from '../../../lib/severityEngine';

const NAVY = '#1E2D4D';
const MUTED = '#6B7F96';
const LINE = 'rgba(30,45,77,0.10)';
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

interface Props {
  /** null = whole portfolio. */
  locationId: string | null;
}

interface StripState {
  openByBand: Record<Severity, number>;
  nearestDue: string | null;
  sealedThisMonth: number;
  sealedFood: number;
  sealedFire: number;
  loading: boolean;
}

const EMPTY: StripState = {
  openByBand: { Critical: 0, High: 0, Medium: 0, Low: 0 },
  nearestDue: null,
  sealedThisMonth: 0,
  sealedFood: 0,
  sealedFire: 0,
  loading: true,
};

function formatDue(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TreatProveStrips({ locationId }: Props) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [state, setState] = useState<StripState>(EMPTY);

  useEffect(() => {
    if (!orgId) { setState({ ...EMPTY, loading: false }); return; }
    let cancelled = false;

    (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartIso = monthStart.toISOString();

      const scoped = <T extends { eq: (c: string, v: string) => T }>(q: T): T =>
        locationId ? q.eq('location_id', locationId) : q;

      const [openRes, caSealRes, incSealRes] = await Promise.all([
        scoped(
          supabase
            .from('corrective_actions')
            .select('severity, due_date')
            .eq('organization_id', orgId)
            .neq('status', 'verified')
            .is('archived_at', null) as never,
        ),
        scoped(
          supabase
            .from('corrective_action_seals')
            .select('id, sealed_at')
            .eq('organization_id', orgId) as never,
        ),
        scoped(
          supabase
            .from('incident_seals')
            .select('id, sealed_at')
            .eq('organization_id', orgId) as never,
        ),
      ]);

      if (cancelled) return;

      const openByBand: Record<Severity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      const dues: string[] = [];
      for (const r of ((openRes as { data?: Record<string, unknown>[] }).data || [])) {
        openByBand[fromStoredSeverity(r.severity as string)] += 1;
        if (r.due_date) dues.push(r.due_date as string);
      }

      const caSeals = ((caSealRes as { data?: Record<string, unknown>[] }).data || []);
      const incSeals = ((incSealRes as { data?: Record<string, unknown>[] }).data || []);
      const sealedThisMonth =
        caSeals.filter(s => String(s.sealed_at) >= monthStartIso).length +
        incSeals.filter(s => String(s.sealed_at) >= monthStartIso).length;

      setState({
        openByBand,
        nearestDue: dues.sort()[0] ?? null,
        sealedThisMonth,
        // Seal tables carry no pillar, so the split is by which record was
        // sealed: incidents on the food side, corrective actions on the fire.
        sealedFood: incSeals.length,
        sealedFire: caSeals.length,
        loading: false,
      });
    })();

    return () => { cancelled = true; };
  }, [orgId, locationId]);

  const bands = [...SEVERITY_ASC].reverse();
  const totalSealed = state.sealedFood + state.sealedFire;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Treat */}
      <div className="bg-white border rounded-xl p-4" style={{ borderColor: LINE }}>
        <p className="text-[13px] font-semibold mb-2" style={{ color: NAVY }}>In treatment</p>
        <div className="flex flex-wrap gap-3 mb-2">
          {bands.map(band =>
            state.openByBand[band] > 0 ? (
              <span key={band} className="text-[11.5px]" style={{ color: MUTED }}>
                <span style={{ fontFamily: MONO, fontWeight: 600, color: SEVERITY_COLORS[band] }}>
                  {state.openByBand[band]}
                </span>{' '}
                {band}
              </span>
            ) : null,
          )}
          {bands.every(b => state.openByBand[b] === 0) && !state.loading && (
            <span className="text-[12px]" style={{ color: MUTED }}>No corrective actions open.</span>
          )}
        </div>
        {state.nearestDue && (
          <p className="text-[11.5px]" style={{ color: MUTED }}>
            Nearest due <span style={{ fontFamily: MONO }}>{formatDue(state.nearestDue)}</span>
          </p>
        )}
        <p className="text-[11.5px] mt-1" style={{ color: MUTED }}>
          <span style={{ fontFamily: MONO, fontWeight: 600, color: NAVY }}>{state.sealedThisMonth}</span>{' '}
          closed and sealed this month
        </p>
        <Link to="/corrective-actions" className="inline-block text-[12px] font-semibold mt-2" style={{ color: NAVY }}>
          Open corrective actions →
        </Link>
      </div>

      {/* Prove */}
      <div className="bg-white border rounded-xl p-4" style={{ borderColor: LINE }}>
        <p className="text-[13px] font-semibold mb-2" style={{ color: NAVY }}>Sealed evidence</p>
        <div className="flex flex-wrap gap-4 mb-2">
          <span className="text-[11.5px]" style={{ color: MUTED }}>
            <span style={{ fontFamily: MONO, fontWeight: 600, color: NAVY }}>{state.sealedFood}</span> Incidents
          </span>
          <span className="text-[11.5px]" style={{ color: MUTED }}>
            <span style={{ fontFamily: MONO, fontWeight: 600, color: NAVY }}>{state.sealedFire}</span> Corrective actions
          </span>
        </div>
        {totalSealed === 0 && !state.loading && (
          <p className="text-[12px] mb-1" style={{ color: MUTED }}>Nothing sealed yet.</p>
        )}
        <p className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
          A sealed record cannot be edited or deleted — a correction issues a superseding
          record; the original stays.
        </p>
      </div>
    </div>
  );
}
