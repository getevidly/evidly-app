/**
 * AdherenceCards — four read-only metric cards for the Today tab.
 *
 * 1. Origination adherence (this week)
 * 2. Follow-up adherence (this week)
 * 3. Nos logged this week
 * 4. Open records with no next action
 *
 * No writes, no mutations, no forms.
 */
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { countContentPublished } from '../../../lib/marketing/countContentPublished';
import {
  EV_NAVY, EV_MUTED, EV_LINE, EV_PAPER, EV_SUCCESS, DISPLAY, BODY,
} from './marketingTokens';

export default function AdherenceCards({ today }: { today: string }) {
  const [loading, setLoading] = useState(true);

  // Card 1
  const [origPct, setOrigPct] = useState<number | null>(null);
  const [origActual, setOrigActual] = useState(0);
  const [origTarget, setOrigTarget] = useState(0);
  const [cadencesMissing, setCadencesMissing] = useState(false);

  // Card 2
  const [fuDone, setFuDone] = useState(0);
  const [fuTotal, setFuTotal] = useState(0);
  const [fuPct, setFuPct] = useState<number | null>(null);
  const [touchesMissing, setTouchesMissing] = useState(false);

  // Card 3
  const [nosCount, setNosCount] = useState(0);
  const [nosTouchMissing, setNosTouchMissing] = useState(false);

  // Card 4
  const [noNextAction, setNoNextAction] = useState(0);

  const { mondayStr, nextMondayStr, weekdaysElapsed } = useMemo(() => {
    const d = new Date(today + 'T12:00:00Z');
    const dayOfWeek = d.getUTCDay(); // 0=Sun, 6=Sat

    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setUTCDate(monday.getUTCDate() + mondayOffset);
    const nextMonday = new Date(monday);
    nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);

    // Weekdays elapsed: Mon=1 through today, capped at 5
    let elapsed = 0;
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      elapsed = dayOfWeek; // Mon=1, Tue=2, ..., Fri=5
    } else if (dayOfWeek === 6) {
      elapsed = 5; // Saturday → full week of weekdays
    } else {
      elapsed = 5; // Sunday → full week of weekdays
    }

    return {
      mondayStr: monday.toISOString().slice(0, 10),
      nextMondayStr: nextMonday.toISOString().slice(0, 10),
      weekdaysElapsed: elapsed,
    };
  }, [today]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // ── Card 1: Origination adherence ──────────────────────────
      let c1Missing = false;
      let sumCapped = 0;
      let sumTargets = 0;
      let sumRawActual = 0;

      const { data: cadences, error: cadErr } = await supabase
        .from('channel_cadences')
        .select('*')
        .eq('is_active', true);

      if (cadErr) {
        if (cadErr.code === '42P01' || cadErr.message?.includes('does not exist')) {
          c1Missing = true;
        }
      }

      if (!c1Missing && !cancelled) {
        const rows = (cadences || []) as {
          source_value: string | null;
          content_channel: string | null;
          cadence_type: string;
          target_count: number | null;
        }[];

        for (const c of rows) {
          if (c.cadence_type === 'none' || !c.target_count) continue;
          // Must have either source_value or content_channel to be trackable
          if (!c.source_value && !c.content_channel) continue;

          let target = 0;
          if (c.cadence_type === 'per_weekday') {
            target = c.target_count * weekdaysElapsed;
          } else if (c.cadence_type === 'per_week') {
            target = c.target_count;
          }
          if (target === 0) continue;

          let actual = 0;
          if (c.content_channel) {
            actual = await countContentPublished(c.content_channel, mondayStr, nextMondayStr);
          } else {
            const { count } = await supabase
              .from('sales_pipeline')
              .select('id', { count: 'exact', head: true })
              .eq('source', c.source_value!)
              .gte('created_at', `${mondayStr}T00:00:00Z`)
              .lt('created_at', `${nextMondayStr}T00:00:00Z`);
            actual = count ?? 0;
          }
          if (cancelled) return;

          sumRawActual += actual;
          sumCapped += Math.min(actual, target);
          sumTargets += target;
        }
      }

      if (!cancelled) {
        setCadencesMissing(c1Missing);
        setOrigActual(sumRawActual);
        setOrigTarget(sumTargets);
        setOrigPct(sumTargets > 0 ? Math.round((sumCapped / sumTargets) * 100) : null);
      }

      // ── Card 2: Follow-up adherence ────────────────────────────
      let c2TouchMissing = false;
      let done = 0;
      let stillDue = 0;

      const { count: touchedCount, error: touchErr } = await supabase
        .from('pipeline_touches')
        .select('pipeline_id', { count: 'exact', head: true })
        .gte('touch_date', mondayStr)
        .lt('touch_date', nextMondayStr)
        .not('was_due_on', 'is', null)
        .lte('was_due_on', today);

      if (touchErr) {
        if (touchErr.code === '42P01' || touchErr.message?.includes('does not exist')) {
          c2TouchMissing = true;
        }
      }

      if (!c2TouchMissing && !cancelled) {
        done = touchedCount ?? 0;

        // still_due: open records due on or before today with NO touch this week
        // We get all open records due, then subtract those that have a touch this week
        const { data: dueRows } = await supabase
          .from('sales_pipeline')
          .select('id')
          .not('stage', 'in', '(won,lost,churned)')
          .lte('next_action_at', today);
        if (cancelled) return;

        const dueIds = (dueRows || []).map((r: { id: string }) => r.id);

        if (dueIds.length > 0) {
          // Find which of these have a touch this week
          const { data: touchedRows } = await supabase
            .from('pipeline_touches')
            .select('pipeline_id')
            .gte('touch_date', mondayStr)
            .lt('touch_date', nextMondayStr)
            .in('pipeline_id', dueIds);
          if (cancelled) return;

          const touchedSet = new Set((touchedRows || []).map((r: { pipeline_id: string }) => r.pipeline_id));
          stillDue = dueIds.filter(id => !touchedSet.has(id)).length;
        }
      }

      if (!cancelled) {
        setTouchesMissing(c2TouchMissing);
        setFuDone(done);
        setFuTotal(done + stillDue);
        setFuPct(done + stillDue > 0 ? Math.round((done / (done + stillDue)) * 100) : null);
      }

      // ── Card 3: Nos logged this week ───────────────────────────
      let c3Missing = false;
      let nos = 0;

      const { count: nosRaw, error: nosErr } = await supabase
        .from('pipeline_touches')
        .select('id', { count: 'exact', head: true })
        .gte('touch_date', mondayStr)
        .lt('touch_date', nextMondayStr)
        .in('outcome', ['not_now', 'not_a_fit']);

      if (nosErr) {
        if (nosErr.code === '42P01' || nosErr.message?.includes('does not exist')) {
          c3Missing = true;
        }
      } else {
        nos = nosRaw ?? 0;
      }

      if (!cancelled) {
        setNosTouchMissing(c3Missing);
        setNosCount(nos);
      }

      // ── Card 4: Open records with no next action ───────────────
      const { count: noNa } = await supabase
        .from('sales_pipeline')
        .select('id', { count: 'exact', head: true })
        .not('stage', 'in', '(won,lost,churned)')
        .is('next_action_at', null);
      if (cancelled) return;

      if (!cancelled) {
        setNoNextAction(noNa ?? 0);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [today, mondayStr, nextMondayStr, weekdaysElapsed]);

  if (loading) {
    return <div className="p-6 text-center text-[13px]" style={{ color: EV_MUTED }}>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1 — Origination adherence */}
      <div className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="text-[11px] font-semibold mb-2" style={{ color: EV_MUTED }}>
          Origination adherence, this week
        </div>
        {cadencesMissing ? (
          <div className="text-[13px]" style={{ color: EV_MUTED }}>Table not yet created.</div>
        ) : origPct === null ? (
          <div className="text-[13px]" style={{ color: EV_MUTED }}>No cadences set.</div>
        ) : (
          <>
            <div className="text-2xl font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>{origPct}%</div>
            <div className="w-full h-1.5 rounded-full mt-2" style={{ backgroundColor: EV_LINE }}>
              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(origPct, 100)}%`, backgroundColor: EV_SUCCESS }} />
            </div>
            <div className="text-[11px] mt-1" style={{ color: EV_MUTED }}>{origActual} of {origTarget}</div>
          </>
        )}
      </div>

      {/* Card 2 — Follow-up adherence */}
      <div className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="text-[11px] font-semibold mb-2" style={{ color: EV_MUTED }}>
          Follow-up adherence, this week
        </div>
        {touchesMissing ? (
          <div className="text-[13px]" style={{ color: EV_MUTED }}>Table not yet created.</div>
        ) : fuPct === null ? (
          <>
            <div className="text-2xl font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>&mdash;</div>
            <div className="text-[11px] mt-1" style={{ color: EV_MUTED }}>Nothing was due.</div>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>{fuPct}%</div>
            <div className="w-full h-1.5 rounded-full mt-2" style={{ backgroundColor: EV_LINE }}>
              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(fuPct, 100)}%`, backgroundColor: EV_SUCCESS }} />
            </div>
            <div className="text-[11px] mt-1" style={{ color: EV_MUTED }}>{fuDone} of {fuTotal}</div>
          </>
        )}
      </div>

      {/* Card 3 — Nos logged */}
      <div className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="text-[11px] font-semibold mb-2" style={{ color: EV_MUTED }}>
          Nos logged this week
        </div>
        {nosTouchMissing ? (
          <div className="text-[13px]" style={{ color: EV_MUTED }}>Table not yet created.</div>
        ) : (
          <>
            <div className="text-2xl font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>{nosCount}</div>
            <div className="text-[11px] mt-1" style={{ color: EV_MUTED }}>Resolved, not lost.</div>
          </>
        )}
      </div>

      {/* Card 4 — Open records with no next action */}
      <div className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="text-[11px] font-semibold mb-2" style={{ color: EV_MUTED }}>
          Open records with no next action
        </div>
        <div className="text-2xl font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>{noNextAction}</div>
        <div className="text-[11px] mt-1" style={{ color: EV_MUTED }}>This should stay at zero.</div>
      </div>
    </div>
  );
}
