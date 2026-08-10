/**
 * ContentScheduleTab — INPUT tab for the Marketing console.
 *
 * Month-calendar primary view with list toggle.
 * Entry form: title, channel, date, owner, status, notes.
 * Supports add + edit through the same form.
 * Scheduled-items list with column sort and filters (channel, owner, date range, status).
 * Writes to: content_schedule table.
 * REAL DATA ONLY — no hardcoded posts.
 */
import { useState, useMemo } from 'react';
import {
  Plus, Trash2, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, CalendarDays, List,
} from 'lucide-react';
import {
  useContentScheduleData,
  type ContentPostRow,
  type AddPostInput,
} from '../../../lib/marketing/useContentScheduleData';
import {
  EV_NAVY, EV_MUTED, EV_FAINT,
  EV_LINE, EV_LIGHT, EV_PAPER,
  DISPLAY, BODY,
} from './marketingTokens';
import { toast } from 'sonner';

// ── Constants ────────────────────────────────────────────────────

const CHANNELS = ['Email', 'LinkedIn', 'Instagram', 'Facebook', 'Other'] as const;
const STATUS_OPTIONS = ['planned', 'drafted', 'scheduled', 'published'] as const;

const STATUS_DOT: Record<string, string> = {
  planned:   '#94A3B8',
  drafted:   '#F59E0B',
  scheduled: '#3B82F6',
  published: '#22C55E',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type SortKey = 'title' | 'channel_label' | 'scheduled_date' | 'owner' | 'status';
type SortDir = 'asc' | 'desc';

const EMPTY_FORM: AddPostInput = {
  title: '',
  channel_label: '',
  scheduled_date: '',
  status: 'planned',
  owner: '',
  notes: '',
};

// ── Calendar helpers ─────────────────────────────────────────────

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfWeek(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function pad2(n: number) { return String(n).padStart(2, '0'); }
function fmtDate(y: number, m: number, d: number) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }

// ── Component ────────────────────────────────────────────────────

export default function ContentScheduleTab() {
  const { posts, loading, error, addPost, updatePost, deletePost } = useContentScheduleData();

  // View mode
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Calendar month
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddPostInput>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Sort state (list view)
  const [sortKey, setSortKey] = useState<SortKey>('scheduled_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Filter state
  const [fChannel, setFChannel] = useState('');
  const [fOwner, setFOwner] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo, setFDateTo] = useState('');

  // ── Unique owners for filter dropdown ─────────────────────────

  const ownerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) if (p.owner) set.add(p.owner);
    return Array.from(set).sort();
  }, [posts]);

  // ── Unique channels for filter dropdown ───────────────────────

  const channelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) if (p.channel_label) set.add(p.channel_label);
    return Array.from(set).sort();
  }, [posts]);

  // ── Filtered + sorted list ────────────────────────────────────

  const displayed = useMemo(() => {
    let list = [...posts];

    if (fChannel) list = list.filter(p => p.channel_label === fChannel);
    if (fOwner)   list = list.filter(p => p.owner === fOwner);
    if (fStatus)  list = list.filter(p => p.status === fStatus);
    if (fDateFrom) list = list.filter(p => p.scheduled_date >= fDateFrom);
    if (fDateTo)   list = list.filter(p => p.scheduled_date <= fDateTo);

    list.sort((a, b) => {
      const av = (a[sortKey] || '') as string;
      const bv = (b[sortKey] || '') as string;
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [posts, fChannel, fOwner, fStatus, fDateFrom, fDateTo, sortKey, sortDir]);

  // ── Posts grouped by date (for calendar) ──────────────────────

  const postsByDate = useMemo(() => {
    const map: Record<string, ContentPostRow[]> = {};
    for (const p of displayed) {
      if (!map[p.scheduled_date]) map[p.scheduled_date] = [];
      map[p.scheduled_date].push(p);
    }
    return map;
  }, [displayed]);

  // ── Sort toggle ───────────────────────────────────────────────

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ── Calendar navigation ───────────────────────────────────────

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };
  const goToToday = () => {
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
  };

  // ── Open form for new post on a date ──────────────────────────

  const openFormForDate = (date: string) => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, scheduled_date: date });
    setShowForm(true);
  };

  // ── Open form to edit existing post ───────────────────────────

  const openFormForPost = (post: ContentPostRow) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      channel_label: post.channel_label,
      scheduled_date: post.scheduled_date,
      status: post.status,
      owner: post.owner || '',
      notes: post.notes || '',
    });
    setShowForm(true);
  };

  // ── Submit (add or update) ────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.title.trim())      { toast.error('Title is required');   return; }
    if (!form.channel_label)     { toast.error('Channel is required'); return; }
    if (!form.scheduled_date)    { toast.error('Date is required');    return; }
    setSaving(true);
    if (editingId) {
      const { error: err } = await updatePost(editingId, form);
      setSaving(false);
      if (err) { toast.error(`Failed: ${err}`); return; }
      toast.success('Post updated');
    } else {
      const { error: err } = await addPost(form);
      setSaving(false);
      if (err) { toast.error(`Failed: ${err}`); return; }
      toast.success('Post added');
    }
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(false);
  };

  // ── Delete ────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    const { error: err } = await deletePost(id);
    if (err) { toast.error(`Delete failed: ${err}`); return; }
    if (editingId === id) {
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
    }
  };

  // ── Close form ────────────────────────────────────────────────

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  // ── Sort header helper ────────────────────────────────────────

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      onClick={() => toggleSort(col)}
      className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none"
      style={{ color: EV_MUTED }}
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

  // ── Calendar grid data ────────────────────────────────────────

  const totalDays = daysInMonth(calYear, calMonth);
  const startDay = firstDayOfWeek(calYear, calMonth);
  const calCells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) calCells.push(null);
  for (let d = 1; d <= totalDays; d++) calCells.push(d);
  while (calCells.length % 7 !== 0) calCells.push(null);

  const todayStr = (() => {
    const d = new Date();
    return fmtDate(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  // ── Render ────────────────────────────────────────────────────

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
      {/* ── Header + View toggle + Add button ──────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-medium" style={{ color: EV_MUTED }}>
            {posts.length} post{posts.length !== 1 ? 's' : ''} scheduled
          </p>
          <div
            className="inline-flex rounded-md overflow-hidden border"
            style={{ borderColor: EV_LINE }}
          >
            <button
              onClick={() => setViewMode('calendar')}
              className="inline-flex items-center gap-1 py-[5px] px-3 text-[11px] font-semibold cursor-pointer border-none"
              style={{
                backgroundColor: viewMode === 'calendar' ? EV_NAVY : '#fff',
                color: viewMode === 'calendar' ? '#fff' : EV_MUTED,
              }}
            >
              <CalendarDays size={12} /> Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="inline-flex items-center gap-1 py-[5px] px-3 text-[11px] font-semibold cursor-pointer border-none"
              style={{
                backgroundColor: viewMode === 'list' ? EV_NAVY : '#fff',
                color: viewMode === 'list' ? '#fff' : EV_MUTED,
                borderLeft: `1px solid ${EV_LINE}`,
              }}
            >
              <List size={12} /> List
            </button>
          </div>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); setShowForm(!showForm); }}
          className="inline-flex items-center gap-1.5 py-[7px] px-4 text-[12px] font-semibold rounded-md cursor-pointer border-none"
          style={{ backgroundColor: EV_NAVY, color: '#fff', fontFamily: BODY }}
        >
          <Plus size={14} /> Add Post
        </button>
      </div>

      {/* ── Add/Edit form (collapsible) ────────────────────────────── */}
      {showForm && (
        <div
          className="border rounded-lg p-5 mb-5"
          style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
            {editingId ? 'Edit Post' : 'Add Post'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Title */}
            <div className="sm:col-span-2">
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

            {/* Channel */}
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                Channel *
              </label>
              <select
                value={form.channel_label}
                onChange={e => setForm(prev => ({ ...prev, channel_label: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
              >
                <option value="">Select channel</option>
                {CHANNELS.map(ch => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                Date *
              </label>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={e => setForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
              />
            </div>

            {/* Owner */}
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                Owner
              </label>
              <input
                value={form.owner}
                onChange={e => setForm(prev => ({ ...prev, owner: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                placeholder="e.g. Arthur"
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                Status
              </label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                Notes
              </label>
              <input
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                placeholder="Content brief or link…"
              />
            </div>
          </div>

          {/* Form actions */}
          <div className="flex gap-2 justify-end">
            {editingId && (
              <button
                onClick={() => handleDelete(editingId)}
                className="py-[7px] px-4 text-[12px] font-semibold rounded-md cursor-pointer border-none mr-auto"
                style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
              >
                Delete
              </button>
            )}
            <button
              onClick={closeForm}
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
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Post'}
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
            style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff', minWidth: 120 }}
          >
            <option value="">All</option>
            {channelOptions.map(ch => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </div>

        {/* Owner filter */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: EV_MUTED }}>
            Owner
          </label>
          <select
            value={fOwner}
            onChange={e => setFOwner(e.target.value)}
            className="py-[6px] px-[8px] text-[12px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff', minWidth: 120 }}
          >
            <option value="">All</option>
            {ownerOptions.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: EV_MUTED }}>
            Status
          </label>
          <select
            value={fStatus}
            onChange={e => setFStatus(e.target.value)}
            className="py-[6px] px-[8px] text-[12px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff', minWidth: 120 }}
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: EV_MUTED }}>
            From
          </label>
          <input
            type="date"
            value={fDateFrom}
            onChange={e => setFDateFrom(e.target.value)}
            className="py-[6px] px-[8px] text-[12px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
          />
        </div>

        {/* Date to */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: EV_MUTED }}>
            To
          </label>
          <input
            type="date"
            value={fDateTo}
            onChange={e => setFDateTo(e.target.value)}
            className="py-[6px] px-[8px] text-[12px] border rounded-md outline-none"
            style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
          />
        </div>

        {/* Clear filters */}
        {(fChannel || fOwner || fStatus || fDateFrom || fDateTo) && (
          <button
            onClick={() => { setFChannel(''); setFOwner(''); setFStatus(''); setFDateFrom(''); setFDateTo(''); }}
            className="py-[6px] px-3 text-[11px] font-semibold rounded-md cursor-pointer border-none"
            style={{ backgroundColor: EV_LIGHT, color: EV_MUTED }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Calendar view ──────────────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <div
          className="border rounded-lg overflow-hidden mb-4"
          style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}
        >
          {/* Month navigation */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: EV_LINE }}
          >
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-md cursor-pointer border-none"
              style={{ backgroundColor: EV_LIGHT, color: EV_NAVY }}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-3">
              <h4
                className="text-sm font-bold"
                style={{ color: EV_NAVY, fontFamily: DISPLAY }}
              >
                {MONTH_NAMES[calMonth]} {calYear}
              </h4>
              <button
                onClick={goToToday}
                className="py-[3px] px-2.5 text-[10px] font-semibold rounded cursor-pointer border-none"
                style={{ backgroundColor: EV_LIGHT, color: EV_MUTED }}
              >
                Today
              </button>
            </div>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-md cursor-pointer border-none"
              style={{ backgroundColor: EV_LIGHT, color: EV_NAVY }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div
            className="grid grid-cols-7 border-b"
            style={{ borderColor: EV_LINE }}
          >
            {WEEKDAYS.map(d => (
              <div
                key={d}
                className="py-2 text-center text-[10px] font-bold uppercase tracking-wider"
                style={{ color: EV_MUTED }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {calCells.map((day, i) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[90px] border-b border-r"
                    style={{
                      borderColor: EV_LINE,
                      backgroundColor: EV_LIGHT,
                      borderRight: (i + 1) % 7 === 0 ? 'none' : undefined,
                      borderBottom: i >= calCells.length - 7 ? 'none' : undefined,
                    }}
                  />
                );
              }

              const dk = fmtDate(calYear, calMonth, day);
              const dayPosts = postsByDate[dk] || [];
              const isToday = dk === todayStr;

              return (
                <div
                  key={dk}
                  onClick={() => openFormForDate(dk)}
                  className="min-h-[90px] border-b border-r p-1 cursor-pointer"
                  style={{
                    borderColor: EV_LINE,
                    backgroundColor: isToday ? '#EFF6FF' : '#fff',
                    borderRight: (i + 1) % 7 === 0 ? 'none' : undefined,
                    borderBottom: i >= calCells.length - 7 ? 'none' : undefined,
                  }}
                >
                  {/* Day number */}
                  <div className="flex justify-end mb-0.5">
                    <span
                      className="text-[11px] font-semibold leading-none"
                      style={{
                        color: isToday ? '#1D4ED8' : EV_MUTED,
                        ...(isToday ? {
                          backgroundColor: '#DBEAFE',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        } : {}),
                      }}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Posts on this day */}
                  <div className="space-y-0.5">
                    {dayPosts.map(p => (
                      <div
                        key={p.id}
                        onClick={(e) => { e.stopPropagation(); openFormForPost(p); }}
                        className="flex items-center gap-1 px-1 py-[2px] rounded cursor-pointer"
                        style={{ backgroundColor: EV_LIGHT }}
                        title={`${p.title} (${p.channel_label})`}
                      >
                        <span
                          className="inline-block w-[5px] h-[5px] rounded-full flex-shrink-0"
                          style={{ backgroundColor: STATUS_DOT[p.status] || STATUS_DOT.planned }}
                        />
                        <span
                          className="text-[10px] font-medium truncate"
                          style={{ color: EV_NAVY, maxWidth: 'calc(100% - 12px)' }}
                        >
                          {p.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── List view ──────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <>
          {displayed.length === 0 ? (
            <div
              className="text-center py-10 border rounded-lg"
              style={{ borderColor: EV_LINE, backgroundColor: EV_PAPER }}
            >
              <p className="text-[13px] font-medium mb-3" style={{ color: EV_MUTED }}>
                {posts.length === 0
                  ? 'No posts scheduled yet — add one.'
                  : 'No posts match the current filters.'}
              </p>
              {posts.length === 0 && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-1.5 py-2 px-4 text-[12px] font-semibold rounded-md cursor-pointer border-none"
                  style={{ backgroundColor: EV_NAVY, color: '#fff' }}
                >
                  <Plus size={14} /> Add Post
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${EV_LINE}` }}>
                    <SortHeader label="Title" col="title" />
                    <SortHeader label="Channel" col="channel_label" />
                    <SortHeader label="Date" col="scheduled_date" />
                    <SortHeader label="Owner" col="owner" />
                    <SortHeader label="Status" col="status" />
                    <th
                      className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: EV_MUTED }}
                    >
                      Notes
                    </th>
                    <th className="py-2 px-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(p => {
                    const dotColor = STATUS_DOT[p.status] || STATUS_DOT.planned;
                    return (
                      <tr
                        key={p.id}
                        className="group cursor-pointer"
                        style={{ borderBottom: `1px solid ${EV_LINE}` }}
                        onClick={() => openFormForPost(p)}
                      >
                        <td
                          className="py-2.5 px-3 text-[13px] font-semibold"
                          style={{ color: EV_NAVY }}
                        >
                          {p.title}
                        </td>
                        <td className="py-2.5 px-3 text-[12px]" style={{ color: EV_MUTED }}>
                          {p.channel_label || '—'}
                        </td>
                        <td
                          className="py-2.5 px-3 text-[12px]"
                          style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}
                        >
                          {p.scheduled_date}
                        </td>
                        <td className="py-2.5 px-3 text-[12px]" style={{ color: EV_MUTED }}>
                          {p.owner || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold capitalize"
                            style={{ color: EV_MUTED }}
                          >
                            <span
                              className="inline-block w-[7px] h-[7px] rounded-full flex-shrink-0"
                              style={{ backgroundColor: dotColor }}
                            />
                            {p.status}
                          </span>
                        </td>
                        <td
                          className="py-2.5 px-3 text-[11px] max-w-[200px] truncate"
                          style={{ color: EV_FAINT }}
                          title={p.notes || ''}
                        >
                          {p.notes || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                            className="hidden group-hover:block cursor-pointer bg-transparent border-none p-0"
                            title="Delete post"
                          >
                            <Trash2 size={13} style={{ color: EV_FAINT }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Status legend ────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap mt-4">
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: EV_MUTED }}
        >
          Status:
        </span>
        {STATUS_OPTIONS.map(s => (
          <span
            key={s}
            className="inline-flex items-center gap-1 text-[11px]"
            style={{ color: EV_MUTED }}
          >
            <span
              className="inline-block w-[7px] h-[7px] rounded-full"
              style={{ backgroundColor: STATUS_DOT[s] }}
            />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
