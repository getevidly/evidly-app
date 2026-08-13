/**
 * ShowsTab — INPUT tab for trade shows / events.
 *
 * Shows are stored in marketing_shows. Booth leads are normal
 * sales_pipeline rows with source='show' and show_id pointing
 * at their show. This tab lists shows, counts leads, and
 * provides a form to add new shows.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, ChevronDown, ChevronUp, Calendar, MapPin, Users, Target } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { type AccountRow } from '../../../lib/marketing/useMarketingData';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_LINE, EV_PAPER, EV_LIGHT, EV_FAINT,
  EV_SUCCESS, EV_WARN, EV_DANGER, DISPLAY, BODY,
} from './marketingTokens';
import { KpiMini } from './marketingPrimitives';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────

interface ShowRow {
  id: string;
  name: string;
  organization: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  booth: string | null;
  budget_cents: number;
  leads_goal: number | null;
  status: string;
  staff: string | null;
  collateral: Record<string, boolean>;
  notes: string | null;
  created_at: string;
}

interface ShowsTabProps {
  accounts: AccountRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

// ── Constants ────────────────────────────────────────────────────

const STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'registered', label: 'Registered' },
  { value: 'attended', label: 'Attended' },
  { value: 'following_up', label: 'Following Up' },
  { value: 'closed', label: 'Closed' },
] as const;

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  planned:      { bg: EV_LIGHT, fg: EV_MUTED },
  registered:   { bg: '#E2ECF2', fg: '#2C5570' },
  attended:     { bg: '#E7EDE7', fg: EV_SUCCESS },
  following_up: { bg: '#FFF3E0', fg: EV_WARN },
  closed:       { bg: '#F6E9E3', fg: EV_FAINT },
};

// ── Helpers ──────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return '\u2014';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateRange(start: string | null, end: string | null): string {
  if (!start) return '\u2014';
  const s = new Date(start + 'T00:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!end || end === start) return fmtDate(start);
  const e = new Date(end + 'T00:00:00');
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${fmt(s)}\u2013${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${fmt(s)} \u2013 ${fmt(e)}, ${e.getFullYear()}`;
}

function fmtDollars(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function statusLabel(s: string): string {
  const found = STATUSES.find(x => x.value === s);
  return found ? found.label : s;
}

// ── Add-show form ────────────────────────────────────────────────

function AddShowForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venue, setVenue] = useState('');
  const [budget, setBudget] = useState('');
  const [leadsGoal, setLeadsGoal] = useState('');
  const [status, setStatus] = useState('planned');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const trimName = name.trim();
    if (!trimName) { toast.error('Show name is required'); return; }

    setSaving(true);
    const { error } = await supabase.from('marketing_shows').insert({
      name: trimName,
      organization: organization.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      venue: venue.trim() || null,
      budget_cents: Math.round((parseFloat(budget) || 0) * 100),
      leads_goal: parseInt(leadsGoal) || null,
      status,
    });
    setSaving(false);

    if (error) { toast.error(error.message); return; }
    toast.success(`Added show: ${trimName}`);
    setName(''); setOrganization(''); setStartDate(''); setEndDate('');
    setVenue(''); setBudget(''); setLeadsGoal(''); setStatus('planned');
    onAdded();
  };

  return (
    <div className="border rounded-lg p-4" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
      <h4 className="text-sm font-bold mb-3" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Add a Show</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {/* Name */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>
            Show Name <span style={{ color: EV_DANGER }}>*</span>
          </label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. NRA Show 2026"
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
        </div>
        {/* Organization */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>Organization</label>
          <input type="text" value={organization} onChange={e => setOrganization(e.target.value)}
            placeholder="Host org"
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
        </div>
        {/* Start date */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
        </div>
        {/* End date */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        {/* Venue */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>Venue / City</label>
          <input type="text" value={venue} onChange={e => setVenue(e.target.value)}
            placeholder="Convention center, city"
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
        </div>
        {/* Budget */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>Budget ($)</label>
          <input type="number" min={0} step="1" value={budget} onChange={e => setBudget(e.target.value)}
            placeholder="0"
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
        </div>
        {/* Leads goal */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>Leads Goal</label>
          <input type="number" min={0} value={leadsGoal} onChange={e => setLeadsGoal(e.target.value)}
            placeholder="Target leads"
            className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, fontFamily: BODY }} />
        </div>
        {/* Submit */}
        <button onClick={handleSubmit} disabled={saving}
          className="inline-flex items-center justify-center gap-2 py-[7px] px-4 text-[13px] font-bold rounded-md border-none cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: EV_NAVY, color: '#fff', fontFamily: BODY }}>
          <Plus size={14} /> {saving ? 'Saving...' : 'Add Show'}
        </button>
      </div>
    </div>
  );
}

// ── Show card ────────────────────────────────────────────────────

function ShowCard({ show, leadCount }: { show: ShowRow; leadCount: number }) {
  const [open, setOpen] = useState(false);
  const st = STATUS_STYLE[show.status] ?? STATUS_STYLE.planned;
  const collateralEntries = Object.entries(show.collateral || {});

  return (
    <div className="border rounded-lg" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer bg-transparent border-none"
        style={{ fontFamily: BODY }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold" style={{ color: EV_NAVY }}>{show.name}</span>
            <span
              className="inline-flex items-center text-[10px] font-bold uppercase px-2 py-0.5 rounded"
              style={{ backgroundColor: st.bg, color: st.fg, letterSpacing: '0.1em' }}
            >
              {statusLabel(show.status)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[12px] flex-wrap" style={{ color: EV_MUTED }}>
            {show.start_date && (
              <span className="inline-flex items-center gap-1"><Calendar size={11} /> {fmtDateRange(show.start_date, show.end_date)}</span>
            )}
            {show.venue && (
              <span className="inline-flex items-center gap-1"><MapPin size={11} /> {show.venue}</span>
            )}
            {show.organization && (
              <span className="inline-flex items-center gap-1"><Users size={11} /> {show.organization}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <div className="text-[11px] font-bold" style={{ color: EV_NAVY }}>
              {leadCount}{show.leads_goal ? ` / ${show.leads_goal}` : ''} leads
            </div>
            {show.budget_cents > 0 && (
              <div className="text-[11px]" style={{ color: EV_MUTED }}>{fmtDollars(show.budget_cents)}</div>
            )}
          </div>
          {open
            ? <ChevronUp size={16} style={{ color: EV_MUTED }} />
            : <ChevronDown size={16} style={{ color: EV_MUTED }} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: EV_LINE }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px] mb-3">
            <div>
              <span className="block text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: EV_MUTED }}>Booth</span>
              <span style={{ color: EV_NAVY }}>{show.booth || '\u2014'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: EV_MUTED }}>Budget</span>
              <span style={{ color: EV_NAVY }}>{show.budget_cents ? fmtDollars(show.budget_cents) : '\u2014'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: EV_MUTED }}>Staff</span>
              <span style={{ color: EV_NAVY }}>{show.staff || '\u2014'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: EV_MUTED }}>Cost / Lead</span>
              <span style={{ color: EV_NAVY }}>
                {leadCount > 0 && show.budget_cents > 0 ? fmtDollars(Math.round(show.budget_cents / leadCount)) : '\u2014'}
              </span>
            </div>
          </div>

          {collateralEntries.length > 0 && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: EV_MUTED }}>Collateral</span>
              <div className="flex flex-wrap gap-2">
                {collateralEntries.map(([item, done]) => (
                  <span key={item} className="inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded"
                    style={{ backgroundColor: done ? '#E7EDE7' : EV_LIGHT, color: done ? EV_SUCCESS : EV_MUTED }}>
                    {done ? '\u2713' : '\u25CB'} {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {show.notes && (
            <div className="mt-3 text-[12px]" style={{ color: EV_MUTED }}>
              <span className="font-bold" style={{ color: EV_NAVY }}>Notes:</span> {show.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────

export default function ShowsTab({
  accounts, loading, error, onRefresh,
}: ShowsTabProps) {
  const [shows, setShows] = useState<ShowRow[]>([]);
  const [showsLoading, setShowsLoading] = useState(true);
  const [showsError, setShowsError] = useState<string | null>(null);

  const fetchShows = useCallback(async () => {
    setShowsLoading(true);
    const { data, error: err } = await supabase
      .from('marketing_shows')
      .select('*')
      .order('start_date', { ascending: false });
    if (err) { setShowsError(err.message); setShowsLoading(false); return; }
    setShows(data ?? []);
    setShowsError(null);
    setShowsLoading(false);
  }, []);

  useEffect(() => { fetchShows(); }, [fetchShows]);

  const handleAdded = () => { fetchShows(); onRefresh(); };

  // Pipeline rows tagged as show leads
  const showLeads = useMemo(() => accounts.filter(a => a.source === 'show'), [accounts]);

  // Lead counts per show_id
  const leadsByShow = useMemo(() => {
    const map: Record<string, number> = {};
    for (const lead of showLeads) {
      const sid = (lead as any).show_id as string | null;
      if (sid) map[sid] = (map[sid] || 0) + 1;
    }
    return map;
  }, [showLeads]);

  // ── KPIs ──────────────────────────────────────────────────────
  const showCount = shows.length;

  const nextShow = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = shows
      .filter(s => s.start_date && s.start_date >= today)
      .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    return upcoming[0] ?? null;
  }, [shows]);

  const totalLeads = showLeads.length;
  const totalBudget = shows.reduce((s, x) => s + x.budget_cents, 0);
  const costPerLead = totalLeads > 0 && totalBudget > 0 ? Math.round(totalBudget / totalLeads) : 0;
  const totalMrr = showLeads.reduce((s, a) => s + a.estimated_mrr_cents, 0);

  // ── Render ────────────────────────────────────────────────────
  const isLoading = loading || showsLoading;
  const combinedError = error || showsError;

  if (isLoading) return <div className="p-10 text-center text-[13px]" style={{ color: EV_MUTED }}>Loading...</div>;
  if (combinedError) return <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">{combinedError}</div>;

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiMini l="Shows Booked" v={showCount} />
        <KpiMini l="Next Show" v={nextShow ? fmtDate(nextShow.start_date) : '\u2014'} sub={nextShow?.name} />
        <KpiMini l="Leads Captured" v={totalLeads} sub={costPerLead > 0 ? `${fmtDollars(costPerLead)} / lead` : undefined} />
        <KpiMini l="Pipeline from Shows" v={totalMrr > 0 ? fmtDollars(totalMrr) : '\u2014'}
          sub={totalBudget > 0 ? `${fmtDollars(totalBudget)} spent` : undefined} accent={EV_EMBER} />
      </div>

      {/* Add-show form */}
      <AddShowForm onAdded={handleAdded} />

      {/* Shows list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>Shows</h4>
          <span className="text-[12px] font-semibold" style={{ color: EV_MUTED }}>
            {shows.length} show{shows.length !== 1 ? 's' : ''}
          </span>
        </div>
        {shows.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-[13px]" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER, color: EV_MUTED }}>
            No shows yet. Add one above.
          </div>
        ) : (
          <div className="space-y-2">
            {shows.map(show => (
              <ShowCard key={show.id} show={show} leadCount={leadsByShow[show.id] || 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
