/**
 * ForecastTab — INPUT tab for the Marketing console.
 *
 * The only genuinely-typed forecast surface: period (month), channel,
 * forecast demos, forecast spend.  Saves upsert on (period, channel).
 * Actuals are REAL — pulled from marketing_channel_actuals (same source
 * Channels uses).  Variance is computed (actual minus forecast).
 * Never invented — if no actual exists the cell shows "—".
 *
 * Table columns: Period, Channel, Fcst Demos, Fcst Spend, Act Demos,
 * Act Spend, Var Demos, Var Spend.  Column sort + filters (month range,
 * channel).
 *
 * Writes to: campaign_forecast table.
 * REAL DATA ONLY — no hardcoded rows.
 */
import { useState, useMemo } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import {
  useForecastData,
  type UpsertForecastInput,
} from '../../../lib/marketing/useForecastData';
import {
  EV_NAVY, EV_MUTED, EV_FAINT,
  EV_LINE, EV_LIGHT, EV_PAPER,
  EV_SUCCESS, EV_DANGER,
  DISPLAY, BODY,
} from './marketingTokens';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────────

/** Format cents as $X,XXX */
function fmtDollars(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString();
}

/** Show signed variance: +12 or -8 */
function fmtVar(v: number): string {
  return v >= 0 ? '+' + v.toLocaleString() : v.toLocaleString();
}

/** YYYY-MM-DD to YYYY-MM for display */
function periodLabel(d: string): string {
  return d.slice(0, 7);
}

// ── Types ────────────────────────────────────────────────────────

interface DisplayRow {
  id: string;
  period: string;
  channel: string;
  f_demos: number;
  f_spend: number;
  a_demos: number | null;
  a_spend: number | null;
  v_demos: number | null;
  v_spend: number | null;
}

type SortKey =
  | 'period' | 'channel'
  | 'f_demos' | 'f_spend'
  | 'a_demos' | 'a_spend'
  | 'v_demos' | 'v_spend';

type SortDir = 'asc' | 'desc';

const EMPTY_FORM = {
  period: '',
  channel: '',
  forecast_demos: '',
  forecast_spend: '',
};

// ── Component ────────────────────────────────────────────────────

export default function ForecastTab() {
  const {
    forecasts, channels, actuals,
    loading, error,
    upsertForecast, deleteForecast,
  } = useForecastData();

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>('period');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Filter state
  const [fChannel, setFChannel] = useState('');
  const [fPeriodFrom, setFPeriodFrom] = useState('');
  const [fPeriodTo, setFPeriodTo] = useState('');

  // ── Build label-to-id map for actuals matching ──────────────────

  const labelToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const ch of channels) m.set(ch.label, ch.id);
    return m;
  }, [channels]);

  // ── Build display rows (forecast + matched actuals) ─────────────

  const rows: DisplayRow[] = useMemo(() => {
    return forecasts.map(f => {
      const chId = labelToId.get(f.channel);
      const periodDate = f.period.slice(0, 10);
      const match = chId
        ? actuals.find(
            a => a.channel_id === chId && a.period_month.slice(0, 10) === periodDate,
          )
        : undefined;

      const a_demos = match != null ? match.demos : null;
      const a_spend = match != null ? match.spend_cents : null;

      return {
        id: f.id,
        period: periodDate,
        channel: f.channel,
        f_demos: f.forecast_demos,
        f_spend: f.forecast_spend_cents,
        a_demos,
        a_spend,
        v_demos: a_demos != null ? a_demos - f.forecast_demos : null,
        v_spend: a_spend != null ? a_spend - f.forecast_spend_cents : null,
      };
    });
  }, [forecasts, actuals, labelToId]);

  // ── Unique channels for filter dropdown ─────────────────────────

  const channelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.channel);
    return Array.from(set).sort();
  }, [rows]);

  // ── Filtered + sorted ──────────────────────────────────────────

  const displayed = useMemo(() => {
    let list = [...rows];

    if (fChannel) list = list.filter(r => r.channel === fChannel);
    if (fPeriodFrom) list = list.filter(r => r.period >= fPeriodFrom);
    if (fPeriodTo)   list = list.filter(r => r.period <= fPeriodTo + '-31');

    list.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      let cmp: number;
      if (typeof av === 'string' && typeof bv === 'string') {
        cmp = av.localeCompare(bv);
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [rows, fChannel, fPeriodFrom, fPeriodTo, sortKey, sortDir]);

  // ── Sort toggle ─────────────────────────────────────────────────

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ── Submit ──────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.period)  { toast.error('Period is required');  return; }
    if (!form.channel) { toast.error('Channel is required'); return; }

    const demos = parseInt(form.forecast_demos, 10);
    const spend = Math.round(parseFloat(form.forecast_spend) * 100);

    if (isNaN(demos) || demos < 0) { toast.error('Forecast demos must be a non-negative integer'); return; }
    if (isNaN(spend) || spend < 0) { toast.error('Forecast spend must be a non-negative dollar amount'); return; }

    const input: UpsertForecastInput = {
      period: form.period + '-01',
      channel: form.channel,
      forecast_demos: demos,
      forecast_spend_cents: spend,
    };

    setSaving(true);
    const { error: err } = await upsertForecast(input);
    setSaving(false);
    if (err) { toast.error('Failed: ' + err); return; }
    toast.success('Forecast saved');
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
  };

  // ── Delete ──────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    const { error: err } = await deleteForecast(id);
    if (err) toast.error('Delete failed: ' + err);
  };

  // ── Sort header helper ──────────────────────────────────────────

  const SortHeader = ({ label, col, align }: { label: string; col: SortKey; align?: 'right' }) => (
    <th
      onClick={() => toggleSort(col)}
      className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none"
      style={{ color: EV_MUTED, textAlign: align || 'left' }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === col ? (
          sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
        ) : (
          <ChevronDown size={10} style={{ opacity: 0.3 }} />
        )}
      </span>
    </th>
  );

  // ── Variance color ──────────────────────────────────────────────

  const varColor = (v: number | null) => {
    if (v == null) return EV_MUTED;
    if (v > 0) return EV_SUCCESS;
    if (v < 0) return EV_DANGER;
    return EV_MUTED;
  };

  // ── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: EV_MUTED, fontFamily: BODY }}>
        Loading forecast data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">
        {error}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: BODY }}>
      {/* ── Header + Add button ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] font-medium" style={{ color: EV_MUTED }}>
          {/* INPUT — this is the only genuinely-typed forecast surface;
              actuals are real (from marketing_channel_actuals),
              variance is computed (actual minus forecast). */}
          {forecasts.length} forecast row{forecasts.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 py-[7px] px-4 text-[12px] font-semibold rounded-md cursor-pointer border-none"
          style={{ backgroundColor: EV_NAVY, color: '#fff', fontFamily: BODY }}
        >
          <Plus size={14} /> Add Forecast
        </button>
      </div>

      {/* ── Add-forecast form (collapsible) ────────────────────────── */}
      {showForm && (
        <div
          className="border rounded-lg p-5 mb-5"
          style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
            Add / Edit Forecast
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Period (month) */}
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                Period *
              </label>
              <input
                type="month"
                value={form.period}
                onChange={e => setForm(prev => ({ ...prev, period: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
              />
            </div>

            {/* Channel */}
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                Channel *
              </label>
              <select
                value={form.channel}
                onChange={e => setForm(prev => ({ ...prev, channel: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
              >
                <option value="">Select channel</option>
                {channels.map(ch => (
                  <option key={ch.id} value={ch.label}>{ch.label}</option>
                ))}
              </select>
            </div>

            {/* Forecast Demos */}
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                Forecast Demos *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.forecast_demos}
                onChange={e => setForm(prev => ({ ...prev, forecast_demos: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                placeholder="0"
              />
            </div>

            {/* Forecast Spend ($) */}
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                Forecast Spend ($) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.forecast_spend}
                onChange={e => setForm(prev => ({ ...prev, forecast_spend: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Form actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }}
              className="py-[7px] px-4 text-[12px] font-semibold rounded-md cursor-pointer border-none"
              style={{ backgroundColor: EV_LIGHT, color: EV_MUTED }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="py-[7px] px-5 text-[12px] font-semibold rounded-md cursor-pointer border-none"
              style={{
                backgroundColor: saving ? EV_LIGHT : EV_NAVY,
                color: saving ? EV_MUTED : '#fff',
              }}
            >
              {saving ? 'Saving...' : 'Save Forecast'}
            </button>
          </div>
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="flex items-end gap-3 flex-wrap mb-4">
        {/* Channel filter */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: EV_MUTED }}>
            Channel
          </label>
          <select
            value={fChannel}
            onChange={e => setFChannel(e.target.value)}
            className="py-[6px] px-[8px] text-[12px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff', minWidth: 140 }}
          >
            <option value="">All</option>
            {channelOptions.map(ch => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </div>

        {/* Period from */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: EV_MUTED }}>
            From
          </label>
          <input
            type="month"
            value={fPeriodFrom}
            onChange={e => setFPeriodFrom(e.target.value)}
            className="py-[6px] px-[8px] text-[12px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
          />
        </div>

        {/* Period to */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: EV_MUTED }}>
            To
          </label>
          <input
            type="month"
            value={fPeriodTo}
            onChange={e => setFPeriodTo(e.target.value)}
            className="py-[6px] px-[8px] text-[12px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
          />
        </div>

        {/* Clear filters */}
        {(fChannel || fPeriodFrom || fPeriodTo) && (
          <button
            onClick={() => { setFChannel(''); setFPeriodFrom(''); setFPeriodTo(''); }}
            className="py-[6px] px-3 text-[11px] font-semibold rounded-md cursor-pointer border-none"
            style={{ backgroundColor: EV_LIGHT, color: EV_MUTED }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Forecast table ─────────────────────────────────────────── */}
      {displayed.length === 0 ? (
        <div
          className="text-center py-10 border rounded-lg"
          style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}
        >
          <p className="text-[13px] font-medium mb-3" style={{ color: EV_MUTED }}>
            {forecasts.length === 0
              ? 'No forecast rows yet — add one.'
              : 'No rows match the current filters.'}
          </p>
          {forecasts.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 py-2 px-4 text-[12px] font-semibold rounded-md cursor-pointer border-none"
              style={{ backgroundColor: EV_NAVY, color: '#fff' }}
            >
              <Plus size={14} /> Add Forecast
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: `1px solid ${EV_LINE}` }}>
                <SortHeader label="Period" col="period" />
                <SortHeader label="Channel" col="channel" />
                <SortHeader label="Fcst Demos" col="f_demos" align="right" />
                <SortHeader label="Fcst Spend" col="f_spend" align="right" />
                <SortHeader label="Act Demos" col="a_demos" align="right" />
                <SortHeader label="Act Spend" col="a_spend" align="right" />
                <SortHeader label="Var Demos" col="v_demos" align="right" />
                <SortHeader label="Var Spend" col="v_spend" align="right" />
                <th className="py-2 px-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {displayed.map(r => (
                <tr
                  key={r.id}
                  className="group"
                  style={{ borderBottom: `1px solid ${EV_LINE}` }}
                >
                  <td
                    className="py-2.5 px-3 text-[13px] font-semibold"
                    style={{ color: EV_NAVY, fontFamily: 'ui-monospace, monospace' }}
                  >
                    {periodLabel(r.period)}
                  </td>
                  <td className="py-2.5 px-3 text-[12px] font-semibold" style={{ color: EV_NAVY }}>
                    {r.channel}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[12px] text-right"
                    style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}
                  >
                    {r.f_demos.toLocaleString()}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[12px] text-right"
                    style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}
                  >
                    {fmtDollars(r.f_spend)}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[12px] text-right"
                    style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}
                  >
                    {r.a_demos != null ? r.a_demos.toLocaleString() : '\u2014'}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[12px] text-right"
                    style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}
                  >
                    {r.a_spend != null ? fmtDollars(r.a_spend) : '\u2014'}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[12px] text-right font-semibold"
                    style={{ color: varColor(r.v_demos), fontFamily: 'ui-monospace, monospace' }}
                  >
                    {r.v_demos != null ? fmtVar(r.v_demos) : '\u2014'}
                  </td>
                  <td
                    className="py-2.5 px-3 text-[12px] text-right font-semibold"
                    style={{ color: varColor(r.v_spend), fontFamily: 'ui-monospace, monospace' }}
                  >
                    {r.v_spend != null ? fmtVar(Math.round(r.v_spend / 100)) : '\u2014'}
                  </td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="hidden group-hover:block cursor-pointer bg-transparent border-none p-0"
                      title="Delete forecast row"
                    >
                      <Trash2 size={13} style={{ color: EV_FAINT }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
