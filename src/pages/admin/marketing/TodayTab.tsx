/**
 * TodayTab — read-only list of pipeline rows due today or overdue.
 *
 * Queries sales_pipeline for open rows (stage not won/lost/churned)
 * where next_action_at <= today. No writes, no mutations, no forms.
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { STAGE_LABELS, type Stage } from '../../../lib/marketing/gtmReference';
import {
  EV_NAVY, EV_MUTED, EV_LINE, EV_PAPER, EV_LIGHT, EV_FAINT,
  EV_DANGER, EV_WARN, EV_SUCCESS, DISPLAY, BODY,
} from './marketingTokens';
import { ArrowRight } from 'lucide-react';
import ChannelCadences from './ChannelCadences';
import StartToday from './StartToday';

interface PipelineRow {
  id: string;
  org_name: string;
  contact_name: string | null;
  stage: string;
  source: string | null;
  county: string | null;
  call_summary: string | null;
  notes: string | null;
  next_action_at: string;
}

export default function TodayTab() {
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('sales_pipeline')
      .select('id, org_name, contact_name, stage, source, county, call_summary, notes, next_action_at')
      .not('stage', 'in', '(won,lost,churned)')
      .lte('next_action_at', today)
      .order('next_action_at', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRows((data as PipelineRow[]) || []);
        setLoading(false);
      });
  }, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const overdueCount = useMemo(
    () => rows.filter(r => r.next_action_at < today).length,
    [rows, today],
  );
  const dueCount = rows.length;

  if (loading) {
    return <div className="p-10 text-center text-[13px]" style={{ color: EV_MUTED }}>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Start today */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Start today</h3>
        <StartToday today={today} />
      </div>

      {/* Follow up today */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Follow up today</h3>
      </div>
      {error ? (
        <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">{error}</div>
      ) : rows.length === 0 ? (
        <div className="border rounded-lg p-8 text-center" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
          <div className="text-[13px]" style={{ color: EV_MUTED }}>Nothing due today.</div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[12px]" style={{ color: EV_MUTED }}>
            {dueCount} due &middot; {overdueCount} overdue
          </p>

          {/* Table */}
          <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b" style={{ borderColor: EV_LINE }}>
                    {['Organization', 'Contact', 'Stage', 'Source', 'County', 'Notes', 'Status', ''].map(h => (
                      <th key={h} className="py-2 px-4 text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const daysAgo = Math.floor(
                      (new Date(today).getTime() - new Date(r.next_action_at).getTime()) / 86400000,
                    );
                    const isOverdue = daysAgo > 0;
                    const snippet = (r.call_summary || r.notes || '\u2014').slice(0, 80);

                    return (
                      <tr key={r.id} className="border-b last:border-b-0" style={{ borderColor: EV_LINE }}>
                        <td className="py-2.5 px-4 text-[13px] font-semibold" style={{ color: EV_NAVY }}>{r.org_name}</td>
                        <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>{r.contact_name || '\u2014'}</td>
                        <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>
                          {STAGE_LABELS[r.stage as Stage] ?? r.stage}
                        </td>
                        <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>{r.source || '\u2014'}</td>
                        <td className="py-2.5 px-4 text-[13px]" style={{ color: EV_MUTED }}>{r.county || '\u2014'}</td>
                        <td className="py-2.5 px-4 text-[13px] max-w-[200px] truncate" style={{ color: EV_FAINT }}>{snippet}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className="inline-block py-0.5 px-2 text-[11px] font-semibold rounded-full whitespace-nowrap"
                            style={{
                              backgroundColor: isOverdue ? '#fef2f2' : '#f0fdf4',
                              color: isOverdue ? EV_DANGER : EV_SUCCESS,
                            }}
                          >
                            {isOverdue ? `Overdue ${daysAgo} day${daysAgo !== 1 ? 's' : ''}` : 'Due today'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <Link
                            to="/admin/sales"
                            className="inline-flex items-center gap-1 text-[12px] font-semibold no-underline"
                            style={{ color: EV_NAVY }}
                          >
                            Pipeline <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Channel cadences */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Channel cadences</h3>
        <ChannelCadences />
      </div>
    </div>
  );
}
