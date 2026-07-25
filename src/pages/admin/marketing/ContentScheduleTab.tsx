/**
 * ContentScheduleTab — Month calendar with add-post form for the Marketing console.
 *
 * Posts render on their scheduled_date as chips colored by channel category.
 * Channel dropdown pulls LIVE from marketing_channels (is_active=true).
 * REAL DATA ONLY — shows only rows from content_schedule.
 */
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
import {
  useContentScheduleData,
  type ContentPostRow,
  type AddPostInput,
} from '../../../lib/marketing/useContentScheduleData';
import { BandPill } from './marketingPrimitives';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_FAINT,
  EV_LINE, EV_LIGHT, EV_PAPER,
  DISPLAY, BODY,
} from './marketingTokens';
import { toast } from 'sonner';

// ── Category colors (same as ChannelsTab) ────────────────────────

const CAT_COLORS: Record<string, string> = {
  'Inbound / SEO':      '#5B8C6F',
  'Owned / Nurture':    '#4A7B94',
  'Social':             '#7B6BA4',
  'Paid':               EV_EMBER,
  'Outbound':           '#8A6412',
  'Partner / Referral': '#2C5570',
  'PR / Earned':        '#6B7280',
};

// ── Status dot colors ────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  planned:   '#94A3B8',
  drafted:   '#F59E0B',
  scheduled: '#3B82F6',
  published: '#22C55E',
};

const STATUS_OPTIONS = ['planned', 'drafted', 'scheduled', 'published'] as const;
const PRP_OPTIONS = ['PREDICT', 'REDUCE', 'PROVE'] as const;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Helpers ──────────────────────────────────────────────────────

function calendarDays(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Empty form ───────────────────────────────────────────────────

const EMPTY_FORM: AddPostInput = {
  title: '',
  channel_id: null,
  channel_label: '',
  scheduled_date: '',
  status: 'planned',
  prp_band: null,
  notes: '',
};

// ── Component ────────────────────────────────────────────────────

export default function ContentScheduleTab() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const { posts, channels, loading, error, addPost, deletePost } =
    useContentScheduleData(viewYear, viewMonth);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddPostInput>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Channel lookup for category color
  const channelMap = useMemo(() => {
    const m = new Map<string, { label: string; category: string; prp_band: string }>();
    for (const ch of channels) m.set(ch.id, ch);
    return m;
  }, [channels]);

  // Group posts by date string
  const postsByDate = useMemo(() => {
    const m = new Map<string, ContentPostRow[]>();
    for (const p of posts) {
      const d = p.scheduled_date;
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(p);
    }
    return m;
  }, [posts]);

  const cells = calendarDays(viewYear, viewMonth);
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());

  // ── Navigation ─────────────────────────────────────────────────

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // ── Channel select handler ─────────────────────────────────────

  const onChannelChange = (channelId: string) => {
    const ch = channelMap.get(channelId);
    setForm(prev => ({
      ...prev,
      channel_id: channelId || null,
      channel_label: ch?.label || '',
      prp_band: ch?.prp_band || prev.prp_band,
    }));
  };

  // ── Submit ─────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.scheduled_date) { toast.error('Date is required'); return; }
    if (!form.channel_label) { toast.error('Channel is required'); return; }
    setSaving(true);
    const { error: err } = await addPost(form);
    setSaving(false);
    if (err) { toast.error(`Failed: ${err}`); return; }
    toast.success('Post added');
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
  };

  // ── Delete ─────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    const { error: err } = await deletePost(id);
    if (err) toast.error(`Delete failed: ${err}`);
  };

  // ── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: EV_MUTED, fontFamily: BODY }}>
        Loading content schedule…
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
      {/* ── Month header + nav ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded cursor-pointer border bg-transparent"
            style={{ borderColor: EV_LINE, color: EV_MUTED }}
          >
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-lg font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded cursor-pointer border bg-transparent"
            style={{ borderColor: EV_LINE, color: EV_MUTED }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={() => {
            setForm({
              ...EMPTY_FORM,
              scheduled_date: dateKey(viewYear, viewMonth, Math.min(now.getDate(), new Date(viewYear, viewMonth + 1, 0).getDate())),
            });
            setShowForm(true);
          }}
          className="inline-flex items-center gap-1.5 py-[7px] px-4 text-[12px] font-semibold rounded-md cursor-pointer border-none"
          style={{ backgroundColor: EV_NAVY, color: '#fff', fontFamily: BODY }}
        >
          <Plus size={14} /> Add Post
        </button>
      </div>

      {/* ── Calendar grid ──────────────────────────────────────── */}
      <div className="border rounded-lg overflow-hidden" style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}>
        {/* Day-of-week header */}
        <div className="grid grid-cols-7">
          {DAY_HEADERS.map(d => (
            <div
              key={d}
              className="text-center py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: EV_MUTED, borderBottom: `1px solid ${EV_LINE}` }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dk = day ? dateKey(viewYear, viewMonth, day) : '';
            const dayPosts = dk ? (postsByDate.get(dk) || []) : [];
            const isToday = dk === todayKey;

            return (
              <div
                key={i}
                className="min-h-[100px] p-1.5 border-r border-b"
                style={{
                  borderColor: EV_LINE,
                  backgroundColor: day ? (isToday ? '#FEF9EF' : EV_PAPER) : EV_LIGHT,
                  borderRight: (i + 1) % 7 === 0 ? 'none' : undefined,
                }}
              >
                {day && (
                  <>
                    <div
                      className="text-[11px] font-semibold mb-1"
                      style={{
                        color: isToday ? EV_EMBER : EV_MUTED,
                        fontWeight: isToday ? 800 : 600,
                      }}
                    >
                      {day}
                    </div>
                    {dayPosts.map(p => {
                      const ch = p.channel_id ? channelMap.get(p.channel_id) : null;
                      const catColor = ch ? (CAT_COLORS[ch.category] || EV_MUTED) : EV_MUTED;
                      const dotColor = STATUS_DOT[p.status] || STATUS_DOT.planned;

                      return (
                        <div
                          key={p.id}
                          className="group flex items-start gap-1 mb-1 px-1.5 py-1 rounded text-[10px] leading-tight"
                          style={{ backgroundColor: `${catColor}18`, color: catColor }}
                        >
                          {/* Status dot */}
                          <span
                            className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0 mt-[3px]"
                            style={{ backgroundColor: dotColor }}
                          />
                          <span className="flex-1 font-semibold truncate" title={p.title}>
                            {p.title}
                          </span>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="hidden group-hover:block flex-shrink-0 cursor-pointer bg-transparent border-none p-0"
                            title="Delete post"
                          >
                            <Trash2 size={10} style={{ color: EV_FAINT }} />
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Empty state ────────────────────────────────────────── */}
      {posts.length === 0 && (
        <div
          className="text-center py-10 mt-4 border rounded-lg"
          style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}
        >
          <p className="text-[13px] font-medium mb-3" style={{ color: EV_MUTED }}>
            No posts scheduled for {MONTH_NAMES[viewMonth]} — add one.
          </p>
          <button
            onClick={() => {
              setForm({
                ...EMPTY_FORM,
                scheduled_date: dateKey(viewYear, viewMonth, 1),
              });
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 py-2 px-4 text-[12px] font-semibold rounded-md cursor-pointer border-none"
            style={{ backgroundColor: EV_NAVY, color: '#fff' }}
          >
            <Plus size={14} /> Add Post
          </button>
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap mt-4">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: EV_MUTED }}>
          Status:
        </span>
        {STATUS_OPTIONS.map(s => (
          <span key={s} className="inline-flex items-center gap-1 text-[11px]" style={{ color: EV_MUTED }}>
            <span
              className="inline-block w-[7px] h-[7px] rounded-full"
              style={{ backgroundColor: STATUS_DOT[s] }}
            />
            {s}
          </span>
        ))}
      </div>

      {/* ── Add-post slide-over ─────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div
            className="w-full max-w-md h-full overflow-y-auto shadow-xl"
            style={{ backgroundColor: EV_PAPER }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
                  Add Post
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="w-8 h-8 flex items-center justify-center rounded cursor-pointer border bg-transparent"
                  style={{ borderColor: EV_LINE, color: EV_MUTED }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                    Title *
                  </label>
                  <input
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                    style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                    placeholder="e.g. Blog: Kitchen Compliance 101"
                  />
                </div>

                {/* Channel (live dropdown) */}
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                    Channel *
                  </label>
                  <select
                    value={form.channel_id || ''}
                    onChange={e => onChannelChange(e.target.value)}
                    className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                    style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                  >
                    <option value="">Select channel</option>
                    {channels.map(ch => (
                      <option key={ch.id} value={ch.id}>{ch.label}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                    Scheduled Date *
                  </label>
                  <input
                    type="date"
                    value={form.scheduled_date}
                    onChange={e => setForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                    style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                    Status
                  </label>
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, status: s }))}
                        className="flex-1 py-[7px] text-[11px] font-semibold rounded-md border cursor-pointer transition-colors capitalize"
                        style={{
                          backgroundColor: form.status === s ? EV_NAVY : '#fff',
                          color: form.status === s ? '#fff' : EV_MUTED,
                          borderColor: form.status === s ? EV_NAVY : EV_LINE,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PRP Band */}
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                    PRP Band
                  </label>
                  <div className="flex gap-2">
                    {PRP_OPTIONS.map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, prp_band: prev.prp_band === b ? null : b }))}
                        className="flex-1 py-[7px] text-[10px] font-bold uppercase tracking-wider rounded-md border cursor-pointer transition-colors"
                        style={{
                          backgroundColor: form.prp_band === b ? EV_NAVY : '#fff',
                          color: form.prp_band === b ? '#fff' : EV_MUTED,
                          borderColor: form.prp_band === b ? EV_NAVY : EV_LINE,
                        }}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none resize-y"
                    style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                    placeholder="Content brief, link, or context…"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }}
                  className="py-2 px-4 text-[13px] font-semibold rounded-md cursor-pointer border-none"
                  style={{ backgroundColor: EV_LIGHT, color: EV_MUTED }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="py-2 px-5 text-[13px] font-semibold rounded-md cursor-pointer border-none"
                  style={{
                    backgroundColor: saving ? EV_LIGHT : EV_NAVY,
                    color: saving ? EV_MUTED : '#fff',
                  }}
                >
                  {saving ? 'Adding…' : 'Add Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
