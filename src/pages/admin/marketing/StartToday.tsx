/**
 * StartToday — read-only progress view for active channel cadences.
 *
 * Shows per-channel progress against cadence targets by counting
 * matching sales_pipeline rows. No writes, no mutations, no forms.
 */
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  EV_NAVY, EV_MUTED, EV_LINE, EV_PAPER,
  EV_SUCCESS, DISPLAY, BODY,
} from './marketingTokens';

interface CadenceRow {
  id: string;
  channel_key: string;
  label: string;
  source_value: string | null;
  stage: string;
  cadence_type: string;
  target_count: number | null;
  is_active: boolean;
}

interface ChannelProgress {
  cadence: CadenceRow;
  actual: number | null; // null = not tracked
  target: number;
  displayText: string;
}

const STAGE_PILL: Record<string, { bg: string; color: string }> = {
  live:        { bg: '#f0fdf4', color: EV_SUCCESS },
  outreach:    { bg: '#eff6ff', color: '#2563eb' },
  development: { bg: '#f5f3ff', color: '#7c3aed' },
};

const STAGE_LABEL: Record<string, string> = {
  live: 'Live', outreach: 'Outreach', development: 'Development',
};

export default function StartToday({ today }: { today: string }) {
  const [channels, setChannels] = useState<ChannelProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotFound, setTableNotFound] = useState(false);

  // Derive date ranges from the same `today` TodayTab uses
  const { tomorrowStr, mondayStr, nextMondayStr, isWeekend } = useMemo(() => {
    const d = new Date(today + 'T12:00:00Z');
    const dayOfWeek = d.getUTCDay(); // 0=Sun, 6=Sat

    const tomorrow = new Date(d);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setUTCDate(monday.getUTCDate() + mondayOffset);
    const nextMonday = new Date(monday);
    nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);

    return {
      tomorrowStr: tomorrow.toISOString().slice(0, 10),
      mondayStr: monday.toISOString().slice(0, 10),
      nextMondayStr: nextMonday.toISOString().slice(0, 10),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    };
  }, [today]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: cadences, error } = await supabase
        .from('channel_cadences')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setTableNotFound(true);
        }
        setLoading(false);
        return;
      }
      if (cancelled) return;

      const rows = (cadences as CadenceRow[]) || [];
      const results: ChannelProgress[] = [];

      for (const c of rows) {
        if (c.cadence_type === 'none' || !c.target_count) {
          results.push({ cadence: c, actual: null, target: 0, displayText: 'Not set' });
          continue;
        }

        if (!c.source_value) {
          results.push({ cadence: c, actual: null, target: c.target_count, displayText: 'Not tracked' });
          continue;
        }

        if (c.cadence_type === 'per_weekday') {
          if (isWeekend) {
            results.push({ cadence: c, actual: 0, target: 0, displayText: '0 of 0 today' });
            continue;
          }
          const { count } = await supabase
            .from('sales_pipeline')
            .select('id', { count: 'exact', head: true })
            .eq('source', c.source_value)
            .gte('created_at', `${today}T00:00:00Z`)
            .lt('created_at', `${tomorrowStr}T00:00:00Z`);
          if (cancelled) return;
          const actual = count ?? 0;
          results.push({
            cadence: c, actual, target: c.target_count,
            displayText: `${actual} of ${c.target_count} today`,
          });
        } else if (c.cadence_type === 'per_week') {
          const { count } = await supabase
            .from('sales_pipeline')
            .select('id', { count: 'exact', head: true })
            .eq('source', c.source_value)
            .gte('created_at', `${mondayStr}T00:00:00Z`)
            .lt('created_at', `${nextMondayStr}T00:00:00Z`);
          if (cancelled) return;
          const actual = count ?? 0;
          results.push({
            cadence: c, actual, target: c.target_count,
            displayText: `${actual} of ${c.target_count} this week`,
          });
        }
      }

      setChannels(results);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [today, tomorrowStr, mondayStr, nextMondayStr, isWeekend]);

  // Header sum: only per_weekday channels with a source_value
  const { sumActual, sumTarget } = useMemo(() => {
    let a = 0, t = 0;
    for (const ch of channels) {
      if (ch.cadence.cadence_type === 'per_weekday' && ch.cadence.source_value && ch.actual !== null) {
        a += ch.actual;
        t += ch.target;
      }
    }
    return { sumActual: a, sumTarget: t };
  }, [channels]);

  if (loading) {
    return <div className="p-6 text-center text-[13px]" style={{ color: EV_MUTED }}>Loading...</div>;
  }

  if (tableNotFound) {
    return (
      <div className="border rounded-lg p-8 text-center" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="text-[13px]" style={{ color: EV_MUTED }}>Cadence table not yet created.</div>
      </div>
    );
  }

  const hasCadence = channels.some(
    c => c.cadence.cadence_type !== 'none' && c.cadence.target_count,
  );

  if (!hasCadence) {
    return (
      <div className="border rounded-lg p-8 text-center" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="text-[13px]" style={{ color: EV_MUTED }}>No cadences set.</div>
        <div className="text-[12px] mt-1" style={{ color: EV_MUTED }}>Set them below.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px]" style={{ color: EV_MUTED }}>
        {sumActual} of {sumTarget} done today
      </p>

      <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: EV_LINE }}>
                {['Channel', 'Stage', 'Progress'].map(h => (
                  <th key={h} className="py-2 px-4 text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.map(ch => {
                const met = ch.actual !== null && ch.target > 0 && ch.actual >= ch.target;
                const pill = STAGE_PILL[ch.cadence.stage] || STAGE_PILL.development;
                return (
                  <tr key={ch.cadence.id} className="border-b last:border-b-0" style={{ borderColor: EV_LINE }}>
                    <td className="py-2.5 px-4 text-[13px] font-semibold" style={{ color: EV_NAVY }}>{ch.cadence.label}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className="inline-block py-0.5 px-2 text-[11px] font-semibold rounded-full whitespace-nowrap"
                        style={{ backgroundColor: pill.bg, color: pill.color }}
                      >
                        {STAGE_LABEL[ch.cadence.stage] || ch.cadence.stage}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[13px] font-semibold" style={{ color: met ? EV_SUCCESS : EV_MUTED }}>
                      {ch.displayText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
