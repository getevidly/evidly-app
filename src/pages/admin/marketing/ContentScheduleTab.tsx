/**
 * ContentScheduleTab — INPUT tab for the Marketing console.
 *
 * Month-calendar primary view with list toggle.
 * Entry form: title, channel, date, owner, status, notes.
 * Supports add + edit through the same form.
 * Date-adjustment panel: slice filtering, set start / shift / cadence.
 * Scheduled-items list with column sort and filters (channel, owner, date range, status).
 * Writes to: content_schedule table.
 * REAL DATA ONLY — no hardcoded posts.
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, CalendarDays, List,
  SlidersHorizontal, Wand2, Search,
  Image as ImageIcon, Video, Paperclip,
} from 'lucide-react';
import {
  useContentScheduleData,
  type ContentPostRow,
  type AddPostInput,
  type BaselineInfo,
} from '../../../lib/marketing/useContentScheduleData';
import { useChannelsData } from '../../../lib/marketing/useChannelsData';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_FAINT,
  EV_LINE, EV_LIGHT, EV_PAPER,
  DISPLAY, BODY,
} from './marketingTokens';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';

// ── Constants ────────────────────────────────────────────────────

const STATUS_OPTIONS = ['planned', 'drafted', 'scheduled', 'published'] as const;

const STATUS_DOT: Record<string, string> = {
  planned:   '#94A3B8',
  drafted:   '#F59E0B',
  scheduled: '#3B82F6',
  published: '#22C55E',
};

// Derived display statuses - computed at render time only, never stored.
const OVERDUE_DOT = '#DC2626';

const DISPLAY_STATUS_OPTIONS = ['planned', 'drafted', 'scheduled', 'published', 'overdue'] as const;

const DISPLAY_STATUS_DOT: Record<string, string> = {
  ...STATUS_DOT,
  overdue: OVERDUE_DOT,
};

const DISPLAY_STATUS_LABEL: Record<string, string> = {
  planned:   'Planned',
  drafted:   'Drafted',
  scheduled: 'Scheduled',
  published: 'Published',
  overdue:   'Overdue',
};

const CHANNEL_DOT: Record<string, string> = {
  Articles:  '#6366F1',
  Blog:      '#10B981',
  Email:     '#F97316',
  Facebook:  '#1877F2',
  Instagram: '#E1306C',
  LinkedIn:  '#0A66C2',
  TikTok:    '#06B6D4',
  X:         '#14171A',
  YouTube:   '#FF0000',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BATCH_DRAFT_CAP = 25;

type SortKey = 'title' | 'channel_label' | 'scheduled_date' | 'owner' | 'status';
type SortDir = 'asc' | 'desc';

const EMPTY_FORM: AddPostInput = {
  title: '',
  channel_label: '',
  scheduled_date: '',
  status: 'planned',
  owner: '',
  notes: '',
  body: '',
  cta: '',
  post_type: '',
  media_type: 'none',
  media_url: '',
  scheduled_time: '',
};

// ── Calendar helpers ─────────────────────────────────────────────

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfWeek(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function pad2(n: number) { return String(n).padStart(2, '0'); }
function fmtDate(y: number, m: number, d: number) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }

/** Format a Postgres time string ("HH:MM" or "HH:MM:SS") as "h:mm AM/PM". */
function fmtTime12(time: string): string {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${suffix}`;
}

// ── Display-status helper (read-only label transform) ───────────

/** Derive a display label + colors from stored status + scheduled datetime.
 *  The row's real status is never mutated — this is render-only. */
/** Derived status key for a row - render-only, never written back to the database.
 *  Past + 'scheduled'            -> 'published'
 *  Past + 'planned' | 'drafted'  -> 'overdue'
 *  Otherwise                     -> the stored status, unchanged. */
function derivedStatusKey(row: ContentPostRow): string {
  const time = row.scheduled_time || '23:59';
  const postDt = new Date(`${row.scheduled_date}T${time}`);
  const isPast = postDt < new Date();

  if (isPast && row.status === 'scheduled') return 'published';
  if (isPast && (row.status === 'planned' || row.status === 'drafted')) return 'overdue';
  return row.status;
}

function displayStatus(row: ContentPostRow): { label: string; dotColor: string; labelColor: string } {
  const key = derivedStatusKey(row);
  return {
    label: DISPLAY_STATUS_LABEL[key] || key,
    dotColor: DISPLAY_STATUS_DOT[key] || DISPLAY_STATUS_DOT.planned,
    labelColor:
      key === 'published' ? '#16A34A'
      : key === 'overdue' ? OVERDUE_DOT
      : EV_MUTED,
  };
}

/** True when the row renders as "Published" — already went out, must not be date-shifted.
 *  Uses the same datetime logic as displayStatus:
 *    datetime = scheduled_date + (scheduled_time || '23:59')
 *  Returns true when (past && status === 'scheduled') OR status === 'published'.
 *  Overdue rows (past but planned/drafted) return false — they stay eligible. */
function isAlreadyPosted(row: ContentPostRow): boolean {
  if (row.status === 'published') return true;
  const time = row.scheduled_time || '23:59';
  const postDt = new Date(`${row.scheduled_date}T${time}`);
  return postDt < new Date() && row.status === 'scheduled';
}

// ── Date-adjustment helpers ──────────────────────────────────────

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function addDaysToDate(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T12:00:00Z');
  const db = new Date(b + 'T12:00:00Z');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function nextWeekday(dateStr: string, dir: 1 | -1 = 1): string {
  let d = dateStr;
  while (true) {
    const day = new Date(d + 'T12:00:00Z').getUTCDay(); // 0 Sun … 6 Sat
    if (day !== 0 && day !== 6) return d;
    d = addDaysToDate(d, dir);
  }
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
function weekdayName(dateStr: string): string {
  return WEEKDAY_SHORT[new Date(dateStr + 'T12:00:00Z').getUTCDay()];
}

type AdjOp = 'start' | 'shift' | 'cadence';
type AdjWeekend = 'skip_fwd' | 'skip_back' | 'allow';

// ── Adjustment filter select (module-scope for stable React reconciliation) ──

function AdjSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div>
      <label
        className="text-[10px] font-bold tracking-wider block mb-1"
        style={{ color: EV_MUTED }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="py-[5px] px-[6px] text-[11px] border rounded-md outline-none"
        style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff', minWidth: 100 }}
      >
        <option value="">All</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────

export default function ContentScheduleTab() {
  const { posts, loading, error, refresh, addPost, updatePost, deletePost, bulkUpdateDates, bulkUpdatePostAs, saveBaseline, restoreBaseline, fetchBaselineInfo } = useContentScheduleData();
  const { channels: mktChannels } = useChannelsData();

  const formRef = useRef<HTMLDivElement>(null);

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
  const [drafting, setDrafting] = useState(false);

  // Sort state (list view)
  const [sortKey, setSortKey] = useState<SortKey>('scheduled_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Filter state (view filters)
  const [fChannel, setFChannel] = useState('');
  const [fOwner, setFOwner] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo, setFDateTo] = useState('');
  const [fSearch, setFSearch] = useState('');
  const [fBrand, setFBrand] = useState('');

  // Date-adjustment panel state
  const [showAdjustPanel, setShowAdjustPanel] = useState(false);
  const [adjBrand, setAdjBrand] = useState('');
  const [adjChannel, setAdjChannel] = useState('');
  const [adjPostType, setAdjPostType] = useState('');
  const [adjStatus, setAdjStatus] = useState('');
  const [adjWeekFrom, setAdjWeekFrom] = useState('');
  const [adjWeekTo, setAdjWeekTo] = useState('');
  const [adjDateFrom, setAdjDateFrom] = useState('');
  const [adjDateTo, setAdjDateTo] = useState('');
  const [adjPostAs, setAdjPostAs] = useState('');
  const [adjOp, setAdjOp] = useState<AdjOp>('start');
  const [adjStartDate, setAdjStartDate] = useState('');
  const [adjShiftDays, setAdjShiftDays] = useState(0);
  const [adjCadenceDays, setAdjCadenceDays] = useState(1);
  const [adjWeekend, setAdjWeekend] = useState<AdjWeekend>('skip_fwd');
  const [applying, setApplying] = useState(false);

  // Baseline state
  const [baselineInfo, setBaselineInfo] = useState<BaselineInfo | null>(null);
  const [baselineLoading, setBaselineLoading] = useState(false);

  // ── Load baseline info on mount ──────────────────────────────

  const refreshBaselineInfo = useCallback(async () => {
    try {
      const info = await fetchBaselineInfo();
      setBaselineInfo(info);
    } catch { /* silent */ }
  }, [fetchBaselineInfo]);

  useEffect(() => { refreshBaselineInfo(); }, [refreshBaselineInfo]);

  // ── Baseline handlers ───────────────────────────────────────

  const handleSaveBaseline = async () => {
    if (!confirm('Save the current dates as the baseline? This replaces the last saved version.')) return;
    setBaselineLoading(true);
    try {
      const { count } = await saveBaseline();
      toast.success(`Baseline saved (${count} posts)`);
      await refreshBaselineInfo();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast.error(msg);
    }
    setBaselineLoading(false);
  };

  const handleRestoreBaseline = async () => {
    if (!confirm('Restore every post to the last saved baseline? This overwrites current dates.')) return;
    setBaselineLoading(true);
    try {
      const { count } = await restoreBaseline();
      toast.success(`Restored ${count} posts to baseline`);
      await refreshBaselineInfo();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Restore failed';
      toast.error(msg);
    }
    setBaselineLoading(false);
  };

  // ── Scroll form into view when it opens ────────────────────────

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showForm]);

  // ── Unique values for filter dropdowns ─────────────────────────

  const ownerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) if (p.owner) set.add(p.owner);
    return Array.from(set).sort();
  }, [posts]);

  const channelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) if (p.channel_label) set.add(p.channel_label);
    return Array.from(set).sort();
  }, [posts]);

  const formChannelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const ch of mktChannels) set.add(ch.label);
    for (const p of posts) if (p.channel_label) set.add(p.channel_label);
    return Array.from(set).sort();
  }, [mktChannels, posts]);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) if (p.brand) set.add(p.brand);
    return Array.from(set).sort();
  }, [posts]);

  const postTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) if (p.post_type) set.add(p.post_type);
    return Array.from(set).sort();
  }, [posts]);

  const weekOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) set.add(isoWeek(p.scheduled_date));
    return Array.from(set).sort();
  }, [posts]);

  // ── Base-filtered set (everything except status — for pill counts) ──

  const baseFiltered = useMemo(() => {
    let list = [...posts];
    if (fChannel) list = list.filter(p => p.channel_label === fChannel);
    if (fBrand) list = list.filter(p => p.brand === fBrand);
    if (fOwner) list = list.filter(p => p.owner === fOwner);
    if (fDateFrom) list = list.filter(p => p.scheduled_date >= fDateFrom);
    if (fDateTo) list = list.filter(p => p.scheduled_date <= fDateTo);
    if (fSearch) {
      const q = fSearch.toLowerCase();
      list = list.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.body || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [posts, fChannel, fBrand, fOwner, fDateFrom, fDateTo, fSearch]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of baseFiltered) {
      const key = derivedStatusKey(p);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [baseFiltered]);

  // ── Filtered + sorted list (all filters including status) ─────

  const displayed = useMemo(() => {
    let list = [...baseFiltered];
    if (fStatus) list = list.filter(p => derivedStatusKey(p) === fStatus);

    list.sort((a, b) => {
      const av = (a[sortKey] || '') as string;
      const bv = (b[sortKey] || '') as string;
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [baseFiltered, fStatus, sortKey, sortDir]);

  // ── Posts grouped by date (for calendar) ────────────────────────

  const postsByDate = useMemo(() => {
    const map: Record<string, ContentPostRow[]> = {};
    for (const p of displayed) {
      if (!map[p.scheduled_date]) map[p.scheduled_date] = [];
      map[p.scheduled_date].push(p);
    }
    return map;
  }, [displayed]);

  // ── Adjustment slice (panel filters) ────────────────────────────

  const adjSlice = useMemo(() => {
    let list = [...posts];
    if (adjBrand)    list = list.filter(p => p.brand === adjBrand);
    if (adjChannel)  list = list.filter(p => p.channel_label === adjChannel);
    if (adjPostType) list = list.filter(p => p.post_type === adjPostType);
    if (adjStatus)   list = list.filter(p => p.status === adjStatus);
    if (adjPostAs)   list = list.filter(p => p.post_as === adjPostAs);
    if (adjWeekFrom) list = list.filter(p => isoWeek(p.scheduled_date) >= adjWeekFrom);
    if (adjWeekTo)   list = list.filter(p => isoWeek(p.scheduled_date) <= adjWeekTo);
    if (adjDateFrom) list = list.filter(p => p.scheduled_date >= adjDateFrom);
    if (adjDateTo)   list = list.filter(p => p.scheduled_date <= adjDateTo);
    return list.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }, [posts, adjBrand, adjChannel, adjPostType, adjStatus, adjPostAs, adjWeekFrom, adjWeekTo, adjDateFrom, adjDateTo]);

  // ── Eligible subset (adjSlice minus already-posted rows) ────────

  const adjEligible = useMemo(
    () => adjSlice.filter(p => !isAlreadyPosted(p)),
    [adjSlice],
  );
  const adjPostedCount = adjSlice.length - adjEligible.length;

  // ── Adjustment preview (operates on eligible rows only) ────────

  const adjPreview = useMemo(() => {
    if (adjEligible.length === 0) return null;

    const sorted = [...adjEligible];
    let updates: { id: string; oldDate: string; newDate: string }[] = [];

    const applyWeekend = (d: string) =>
      adjWeekend === 'skip_fwd'  ? nextWeekday(d, 1) :
      adjWeekend === 'skip_back' ? nextWeekday(d, -1) : d;

    if (adjOp === 'start' && adjStartDate) {
      const earliest = sorted[0].scheduled_date;
      const delta = daysBetween(earliest, adjStartDate);
      updates = sorted.map(p => ({
        id: p.id,
        oldDate: p.scheduled_date,
        newDate: applyWeekend(addDaysToDate(p.scheduled_date, delta)),
      }));
    } else if (adjOp === 'shift' && adjShiftDays !== 0) {
      updates = sorted.map(p => ({
        id: p.id,
        oldDate: p.scheduled_date,
        newDate: applyWeekend(addDaysToDate(p.scheduled_date, adjShiftDays)),
      }));
    } else if (adjOp === 'cadence' && adjCadenceDays >= 1) {
      const baseDate = sorted[0].scheduled_date;
      updates = sorted.map((p, i) => ({
        id: p.id,
        oldDate: p.scheduled_date,
        newDate: applyWeekend(addDaysToDate(baseDate, i * adjCadenceDays)),
      }));
    }

    if (updates.length === 0) return null;
    return {
      count: updates.length,
      first: updates[0],
      last: updates[updates.length - 1],
      updates,
    };
  }, [adjEligible, adjOp, adjStartDate, adjShiftDays, adjCadenceDays, adjWeekend]);

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
      body: post.body || '',
      cta: post.cta || '',
      post_type: post.post_type || '',
      media_type: post.media_type || 'none',
      media_url: post.media_url || '',
      scheduled_time: post.scheduled_time || '',
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

  // ── Editing row lookup (for brief access) ───────────────────

  const editingRow = useMemo(
    () => (editingId ? posts.find(p => p.id === editingId) ?? null : null),
    [editingId, posts],
  );

  // ── Draft from brief ───────────────────────────────────────

  const handleDraft = async () => {
    if (!editingId || !editingRow?.brief) return;
    setDrafting(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('ai-content-draft', {
        body: { rowId: editingId },
      });
      if (fnErr) {
        toast.error(`Draft failed: ${fnErr.message}`);
        setDrafting(false);
        return;
      }
      if (data?.error) {
        toast.error(`Draft failed: ${data.error}`);
        setDrafting(false);
        return;
      }
      // Refresh from DB, then re-populate form from the updated row
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Draft request failed';
      toast.error(msg);
    }
    setDrafting(false);
  };

  // Re-populate form when posts refresh while editing (e.g. after draft)
  useEffect(() => {
    if (editingId && posts.length > 0) {
      const updated = posts.find(p => p.id === editingId);
      if (updated) {
        setForm({
          title: updated.title,
          channel_label: updated.channel_label,
          scheduled_date: updated.scheduled_date,
          status: updated.status,
          owner: updated.owner || '',
          notes: updated.notes || '',
          body: updated.body || '',
          cta: updated.cta || '',
          post_type: updated.post_type || '',
          media_type: updated.media_type || 'none',
          media_url: updated.media_url || '',
          scheduled_time: updated.scheduled_time || '',
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  // ── Batch draft eligible rows ──────────────────────────────────

  const [batchDrafting, setBatchDrafting] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');

  const batchEligible = useMemo(
    () => displayed.filter(
      p => p.brief && p.brief.trim() !== '' && (p.notes || '').includes('[copy_state: To write]'),
    ),
    [displayed],
  );

  const handleBatchDraft = async () => {
    const total = Math.min(batchEligible.length, BATCH_DRAFT_CAP);
    if (total === 0) return;

    const cappedNote = batchEligible.length > BATCH_DRAFT_CAP
      ? ` (capped at ${BATCH_DRAFT_CAP} of ${batchEligible.length} eligible)`
      : '';
    if (!confirm(`Draft ${total} unwritten post${total !== 1 ? 's' : ''} in the current view${cappedNote}? Each is a Claude call.`)) return;

    const queue = batchEligible.slice(0, BATCH_DRAFT_CAP);
    setBatchDrafting(true);
    let drafted = 0;
    let failed = 0;

    // Process with concurrency of 3
    const concurrency = 3;
    let cursor = 0;

    const next = async (): Promise<void> => {
      while (cursor < queue.length) {
        const idx = cursor++;
        const row = queue[idx];
        setBatchProgress(`Drafting ${idx + 1} of ${queue.length}\u2026`);
        try {
          const { data, error: fnErr } = await supabase.functions.invoke('ai-content-draft', {
            body: { rowId: row.id },
          });
          if (fnErr || data?.error) {
            failed++;
          } else {
            drafted++;
          }
        } catch {
          failed++;
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => next()));

    await refresh();
    setBatchDrafting(false);
    setBatchProgress('');

    const parts = [`${drafted} drafted`];
    if (failed > 0) parts.push(`${failed} failed`);
    toast.success(`Batch complete: ${parts.join(', ')}`);
  };

  // ── Apply date adjustment ─────────────────────────────────────

  const handleApply = async () => {
    if (!adjPreview || adjPreview.count === 0) return;
    setApplying(true);
    const { error: err } = await bulkUpdateDates(
      adjPreview.updates.map(u => ({ id: u.id, scheduled_date: u.newDate })),
    );
    setApplying(false);
    if (err) { toast.error(`Update failed: ${err}`); return; }
    toast.success(`${adjPreview.count} post${adjPreview.count !== 1 ? 's' : ''} updated`);
    setShowAdjustPanel(false);
  };

  // ── Sort header helper ────────────────────────────────────────

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      onClick={() => toggleSort(col)}
      className="py-2 px-3 text-[10px] font-bold tracking-wider cursor-pointer select-none"
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
      {/* ── Three-row header ──────────────────────────────────────── */}
      <div className="mb-5 space-y-2">
        {/* ROW 1 — View toggle + Status pills + Action buttons */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
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

            <div className="flex items-center gap-1">
              <button
                onClick={() => setFStatus('')}
                className="py-[4px] px-3 text-[11px] font-semibold rounded-full cursor-pointer border"
                style={{
                  borderColor: !fStatus ? EV_NAVY : EV_LINE,
                  backgroundColor: !fStatus ? EV_NAVY : '#fff',
                  color: !fStatus ? '#fff' : EV_MUTED,
                }}
              >
                All ({baseFiltered.length})
              </button>
              {DISPLAY_STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setFStatus(fStatus === s ? '' : s)}
                  className="inline-flex items-center gap-1.5 py-[4px] px-3 text-[11px] font-semibold rounded-full cursor-pointer border"
                  style={{
                    borderColor: fStatus === s ? DISPLAY_STATUS_DOT[s] : EV_LINE,
                    backgroundColor: fStatus === s ? `${DISPLAY_STATUS_DOT[s]}18` : '#fff',
                    color: fStatus === s ? DISPLAY_STATUS_DOT[s] : EV_MUTED,
                  }}
                >
                  <span
                    className="inline-block w-[6px] h-[6px] rounded-full"
                    style={{ backgroundColor: DISPLAY_STATUS_DOT[s] }}
                  />
                  {DISPLAY_STATUS_LABEL[s]} ({statusCounts[s] || 0})
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdjustPanel(v => !v)}
              className="inline-flex items-center gap-1.5 py-[7px] px-4 text-[12px] font-semibold rounded-md cursor-pointer border"
              style={{
                borderColor: showAdjustPanel ? EV_NAVY : EV_LINE,
                backgroundColor: showAdjustPanel ? EV_NAVY : '#fff',
                color: showAdjustPanel ? '#fff' : EV_NAVY,
                fontFamily: BODY,
              }}
            >
              <SlidersHorizontal size={14} /> Adjust Dates
            </button>
            <button
              onClick={handleBatchDraft}
              disabled={batchEligible.length === 0 || batchDrafting}
              className="inline-flex items-center gap-1.5 py-[7px] px-4 text-[12px] font-semibold rounded-md cursor-pointer border"
              style={{
                borderColor: batchEligible.length === 0 || batchDrafting ? EV_LINE : '#93C5FD',
                backgroundColor: batchDrafting ? EV_LIGHT : batchEligible.length === 0 ? '#fff' : '#DBEAFE',
                color: batchEligible.length === 0 || batchDrafting ? EV_MUTED : '#1D4ED8',
                fontFamily: BODY,
              }}
            >
              <Wand2 size={14} />
              {batchDrafting ? batchProgress || 'Drafting\u2026' : `Draft filtered from brief${batchEligible.length > 0 ? ` (${batchEligible.length})` : ''}`}
            </button>
            <button
              onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); setShowForm(!showForm); }}
              className="inline-flex items-center gap-1.5 py-[7px] px-4 text-[12px] font-semibold rounded-md cursor-pointer border-none"
              style={{ backgroundColor: EV_NAVY, color: '#fff', fontFamily: BODY }}
            >
              <Plus size={14} /> Add Post
            </button>
          </div>
        </div>

        {/* ROW 2 — Channel legend + status key */}
        <div className="flex items-center gap-2 flex-wrap">
          {channelOptions.map(ch => (
            <button
              key={ch}
              onClick={() => setFChannel(fChannel === ch ? '' : ch)}
              className="inline-flex items-center gap-1.5 py-[3px] px-2.5 text-[11px] font-medium rounded-md cursor-pointer border"
              style={{
                borderColor: fChannel === ch ? (CHANNEL_DOT[ch] || EV_MUTED) : 'transparent',
                backgroundColor: fChannel === ch ? `${CHANNEL_DOT[ch] || EV_MUTED}14` : 'transparent',
                color: fChannel === ch ? (CHANNEL_DOT[ch] || EV_MUTED) : EV_MUTED,
              }}
            >
              <span
                className="inline-block w-[7px] h-[7px] rounded-full"
                style={{ backgroundColor: CHANNEL_DOT[ch] || EV_MUTED }}
              />
              {ch}
            </button>
          ))}

          <span className="mx-1 text-[10px]" style={{ color: EV_LINE }}>|</span>

          {DISPLAY_STATUS_OPTIONS.map(s => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-[10px]"
              style={{ color: EV_MUTED }}
            >
              <span
                className="inline-block w-[3px] h-[10px] rounded-sm"
                style={{ backgroundColor: DISPLAY_STATUS_DOT[s] }}
              />
              {DISPLAY_STATUS_LABEL[s]}
            </span>
          ))}
        </div>

        {/* ROW 3 — Search, dates, brand, owner, post count */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: EV_MUTED }}
            />
            <input
              type="text"
              value={fSearch}
              onChange={e => setFSearch(e.target.value)}
              placeholder="Search title or body…"
              className="py-[6px] pl-8 pr-3 text-[12px] border rounded-md outline-none"
              style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff', minWidth: 200 }}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-wider block mb-0.5" style={{ color: EV_MUTED }}>
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
          <div>
            <label className="text-[10px] font-bold tracking-wider block mb-0.5" style={{ color: EV_MUTED }}>
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
          <div>
            <label className="text-[10px] font-bold tracking-wider block mb-0.5" style={{ color: EV_MUTED }}>
              Brand
            </label>
            <select
              value={fBrand}
              onChange={e => setFBrand(e.target.value)}
              className="py-[6px] px-[8px] text-[12px] border rounded-md outline-none"
              style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff', minWidth: 140 }}
            >
              <option value="">All brands</option>
              {brandOptions.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-wider block mb-0.5" style={{ color: EV_MUTED }}>
              Owner
            </label>
            <select
              value={fOwner}
              onChange={e => setFOwner(e.target.value)}
              className="py-[6px] px-[8px] text-[12px] border rounded-md outline-none"
              style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff', minWidth: 110 }}
            >
              <option value="">All owners</option>
              {ownerOptions.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          {(fChannel || fStatus || fDateFrom || fDateTo || fSearch || fBrand || fOwner) && (
            <button
              onClick={() => { setFChannel(''); setFStatus(''); setFDateFrom(''); setFDateTo(''); setFSearch(''); setFBrand(''); setFOwner(''); }}
              className="py-[6px] px-3 text-[11px] font-semibold rounded-md cursor-pointer border-none"
              style={{ backgroundColor: EV_LIGHT, color: EV_MUTED }}
            >
              Clear all
            </button>
          )}
          <p className="ml-auto text-[11px] font-medium" style={{ color: EV_MUTED }}>
            {displayed.length} post{displayed.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
      </div>

      {/* ── Add/Edit form (collapsible) ────────────────────────────── */}
      {showForm && (
        <div
          ref={formRef}
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
                {formChannelOptions.map(ch => (
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

            {/* Time */}
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                Time
              </label>
              <input
                type="time"
                value={form.scheduled_time}
                onChange={e => setForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
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

            {/* Brief (read-only) */}
            {editingId && editingRow?.brief && (
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                  Brief
                </label>
                <pre
                  className="w-full py-[7px] px-[10px] text-[12px] border rounded-md whitespace-pre-wrap"
                  style={{
                    borderColor: EV_LINE,
                    color: EV_MUTED,
                    backgroundColor: EV_LIGHT,
                    fontFamily: BODY,
                    maxHeight: 160,
                    overflowY: 'auto',
                    margin: 0,
                  }}
                >
                  {editingRow.brief}
                </pre>
              </div>
            )}

            {/* Body */}
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold" style={{ color: EV_MUTED }}>
                  Body
                </label>
                {editingId && editingRow?.brief && (
                  <button
                    onClick={handleDraft}
                    disabled={drafting}
                    type="button"
                    className="py-[4px] px-3 text-[11px] font-semibold rounded-md cursor-pointer border-none"
                    style={{
                      backgroundColor: drafting ? EV_LIGHT : '#DBEAFE',
                      color: drafting ? EV_MUTED : '#1D4ED8',
                    }}
                  >
                    {drafting ? 'Drafting\u2026' : 'Draft from brief'}
                  </button>
                )}
              </div>
              <textarea
                value={form.body}
                onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                rows={6}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none resize-y"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                placeholder="Full post or email content…"
              />
            </div>

            {/* CTA */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                CTA
              </label>
              <input
                value={form.cta}
                onChange={e => setForm(prev => ({ ...prev, cta: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                placeholder="e.g. CLAIM YOUR SEAT"
              />
            </div>

            {/* Post type */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                Post type
              </label>
              <input
                value={form.post_type}
                onChange={e => setForm(prev => ({ ...prev, post_type: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                placeholder="e.g. Email"
              />
            </div>

            {/* Media type */}
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                Media
              </label>
              <select
                value={form.media_type}
                onChange={e => setForm(prev => ({ ...prev, media_type: e.target.value }))}
                className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
              >
                <option value="none">None</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="file">File</option>
              </select>
            </div>

            {/* Media URL */}
            {form.media_type !== 'none' && (
              <div className="sm:col-span-3">
                <label className="text-[11px] font-semibold block mb-1" style={{ color: EV_MUTED }}>
                  Link or filename
                </label>
                <input
                  value={form.media_url}
                  onChange={e => setForm(prev => ({ ...prev, media_url: e.target.value }))}
                  className="w-full py-[7px] px-[10px] text-[13px] border rounded-md outline-none"
                  style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                  placeholder="Drive/Dropbox link or file name"
                />
              </div>
            )}
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

      {/* ── Date Adjustment panel (collapsible) ──────────────────────── */}
      {showAdjustPanel && (
        <div
          className="border rounded-lg p-5 mb-5"
          style={{ borderColor: '#93C5FD', backgroundColor: '#F0F7FF' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: EV_NAVY, fontFamily: DISPLAY }}>
            Date Adjustment
          </h3>

          {/* ── Baseline ──────────────────────────────────────────── */}
          <p
            className="text-[10px] font-bold tracking-wider mb-2"
            style={{ color: EV_MUTED }}
          >
            Baseline
          </p>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={handleSaveBaseline}
              disabled={applying || baselineLoading || posts.length === 0}
              className="py-[7px] px-4 text-[12px] font-semibold rounded-md cursor-pointer border"
              style={{
                borderColor: (applying || baselineLoading || posts.length === 0) ? EV_LINE : EV_LINE,
                backgroundColor: (applying || baselineLoading || posts.length === 0) ? EV_LIGHT : '#fff',
                color: (applying || baselineLoading || posts.length === 0) ? EV_MUTED : EV_NAVY,
                fontFamily: BODY,
              }}
            >
              {baselineLoading ? 'Working\u2026' : 'Save as baseline'}
            </button>
            <button
              onClick={handleRestoreBaseline}
              disabled={applying || baselineLoading || !baselineInfo}
              className="py-[7px] px-4 text-[12px] font-semibold rounded-md cursor-pointer border"
              style={{
                borderColor: (applying || baselineLoading || !baselineInfo) ? EV_LINE : EV_LINE,
                backgroundColor: (applying || baselineLoading || !baselineInfo) ? EV_LIGHT : '#fff',
                color: (applying || baselineLoading || !baselineInfo) ? EV_MUTED : EV_NAVY,
                fontFamily: BODY,
              }}
            >
              {baselineLoading ? 'Working\u2026' : 'Restore baseline'}
            </button>
          </div>
          <p className="text-[11px] mb-4" style={{ color: EV_MUTED }}>
            {baselineInfo
              ? `Last saved: ${baselineInfo.name} \u00b7 ${new Date(baselineInfo.savedAt).toLocaleDateString()} \u00b7 ${baselineInfo.count} posts`
              : 'No baseline saved yet'}
          </p>

          {/* ── Select a slice ───────────────────────────────────────── */}
          <p
            className="text-[10px] font-bold tracking-wider mb-2"
            style={{ color: EV_MUTED }}
          >
            Select a slice
          </p>
          <div className="flex items-end gap-3 flex-wrap mb-3">
            <AdjSelect label="Brand" value={adjBrand} onChange={setAdjBrand} options={brandOptions} />
            <AdjSelect label="Channel" value={adjChannel} onChange={setAdjChannel} options={channelOptions} />
            <AdjSelect label="Type" value={adjPostType} onChange={setAdjPostType} options={postTypeOptions} />
            <AdjSelect label="Status" value={adjStatus} onChange={setAdjStatus} options={STATUS_OPTIONS} />
            <div>
              <label
                className="text-[10px] font-bold tracking-wider block mb-1"
                style={{ color: EV_MUTED }}
              >
                Post as
              </label>
              <select
                value={adjPostAs}
                onChange={e => setAdjPostAs(e.target.value)}
                className="py-[5px] px-[6px] text-[11px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff', minWidth: 100 }}
              >
                <option value="">All</option>
                <option value="personal">You</option>
                <option value="company">Company</option>
              </select>
            </div>
            <AdjSelect label="Week from" value={adjWeekFrom} onChange={setAdjWeekFrom} options={weekOptions} />
            <AdjSelect label="Week to" value={adjWeekTo} onChange={setAdjWeekTo} options={weekOptions} />
            <div>
              <label
                className="text-[10px] font-bold tracking-wider block mb-1"
                style={{ color: EV_MUTED }}
              >
                From
              </label>
              <input
                type="date"
                value={adjDateFrom}
                onChange={e => setAdjDateFrom(e.target.value)}
                className="py-[5px] px-[6px] text-[11px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
              />
            </div>
            <div>
              <label
                className="text-[10px] font-bold tracking-wider block mb-1"
                style={{ color: EV_MUTED }}
              >
                To
              </label>
              <input
                type="date"
                value={adjDateTo}
                onChange={e => setAdjDateTo(e.target.value)}
                className="py-[5px] px-[6px] text-[11px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
              />
            </div>
          </div>
          <p className="text-[12px] font-semibold mb-2" style={{ color: EV_NAVY }}>
            {adjSlice.length} match
            {adjPostedCount > 0 && (
              <span style={{ color: EV_MUTED }}> · {adjPostedCount} already posted (won't move)</span>
            )}
            {' · '}{adjEligible.length} will move
          </p>

          {/* ── Set Post as for matched slice ─────────────────────── */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold tracking-wider" style={{ color: EV_MUTED }}>
              Set Post as:
            </span>
            <button
              onClick={async () => {
                if (adjSlice.length === 0) return;
                setApplying(true);
                const { error: err } = await bulkUpdatePostAs(adjSlice.map(p => p.id), 'personal');
                setApplying(false);
                if (err) { toast.error(`Update failed: ${err}`); return; }
                toast.success(`${adjSlice.length} post${adjSlice.length !== 1 ? 's' : ''} set to You`);
              }}
              disabled={applying || adjSlice.length === 0}
              className="py-[5px] px-3 text-[11px] font-semibold rounded-md cursor-pointer border"
              style={{
                borderColor: EV_LINE,
                backgroundColor: (applying || adjSlice.length === 0) ? EV_LIGHT : '#fff',
                color: (applying || adjSlice.length === 0) ? EV_MUTED : EV_NAVY,
              }}
            >
              {'\u2192'} You
            </button>
            <button
              onClick={async () => {
                if (adjSlice.length === 0) return;
                setApplying(true);
                const { error: err } = await bulkUpdatePostAs(adjSlice.map(p => p.id), 'company');
                setApplying(false);
                if (err) { toast.error(`Update failed: ${err}`); return; }
                toast.success(`${adjSlice.length} post${adjSlice.length !== 1 ? 's' : ''} set to Company`);
              }}
              disabled={applying || adjSlice.length === 0}
              className="py-[5px] px-3 text-[11px] font-semibold rounded-md cursor-pointer border"
              style={{
                borderColor: EV_LINE,
                backgroundColor: (applying || adjSlice.length === 0) ? EV_LIGHT : '#fff',
                color: (applying || adjSlice.length === 0) ? EV_MUTED : EV_NAVY,
              }}
            >
              {'\u2192'} Company
            </button>
          </div>

          {/* ── Operation ─────────────────────────────────────────── */}
          <p
            className="text-[10px] font-bold tracking-wider mb-2"
            style={{ color: EV_MUTED }}
          >
            Operation
          </p>
          <div className="flex items-center gap-4 mb-3">
            {([
              ['start', 'Set start date'],
              ['shift', 'Shift \u00b1N days'],
              ['cadence', 'Set cadence'],
            ] as [AdjOp, string][]).map(([op, lbl]) => (
              <label
                key={op}
                className="inline-flex items-center gap-1.5 text-[12px] cursor-pointer"
                style={{ color: EV_NAVY }}
              >
                <input
                  type="radio"
                  name="adjOp"
                  checked={adjOp === op}
                  onChange={() => setAdjOp(op)}
                />
                {lbl}
              </label>
            ))}
          </div>

          <div className="mb-4">
            {adjOp === 'start' && (
              <div>
                <label
                  className="text-[10px] font-bold tracking-wider block mb-1"
                  style={{ color: EV_MUTED }}
                >
                  New start date
                </label>
                <input
                  type="date"
                  value={adjStartDate}
                  onChange={e => setAdjStartDate(e.target.value)}
                  className="py-[5px] px-[8px] text-[12px] border rounded-md outline-none"
                  style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                />
              </div>
            )}
            {adjOp === 'shift' && (
              <div>
                <label
                  className="text-[10px] font-bold tracking-wider block mb-1"
                  style={{ color: EV_MUTED }}
                >
                  Days to shift (negative = earlier)
                </label>
                <input
                  type="number"
                  value={adjShiftDays}
                  onChange={e => setAdjShiftDays(parseInt(e.target.value) || 0)}
                  className="py-[5px] px-[8px] text-[12px] border rounded-md outline-none w-24"
                  style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                />
              </div>
            )}
            {adjOp === 'cadence' && (
              <div>
                <label
                  className="text-[10px] font-bold tracking-wider block mb-1"
                  style={{ color: EV_MUTED }}
                >
                  Days between posts
                </label>
                <input
                  type="number"
                  min={1}
                  value={adjCadenceDays}
                  onChange={e => setAdjCadenceDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="py-[5px] px-[8px] text-[12px] border rounded-md outline-none w-24"
                  style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                />
              </div>
            )}
            <div className="mt-3">
              <label
                className="text-[10px] font-bold tracking-wider block mb-1"
                style={{ color: EV_MUTED }}
              >
                Weekends
              </label>
              <select
                value={adjWeekend}
                onChange={e => setAdjWeekend(e.target.value as AdjWeekend)}
                className="py-[5px] px-[8px] text-[12px] border rounded-md outline-none"
                style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
              >
                <option value="skip_fwd">Skip to next weekday</option>
                <option value="skip_back">Skip to previous weekday</option>
                <option value="allow">Allow weekend dates</option>
              </select>
            </div>
          </div>

          {/* ── Preview ───────────────────────────────────────────── */}
          {adjPreview && (
            <div
              className="rounded-md p-3 mb-4"
              style={{ backgroundColor: '#DBEAFE' }}
            >
              <p
                className="text-[10px] font-bold tracking-wider mb-1"
                style={{ color: EV_MUTED }}
              >
                Preview
              </p>
              <p className="text-[12px] font-semibold mb-1" style={{ color: EV_NAVY }}>
                {adjPreview.count} post{adjPreview.count !== 1 ? 's' : ''} will be updated
              </p>
              <p className="text-[11px]" style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}>
                First: {adjPreview.first.oldDate} &rarr; {adjPreview.first.newDate} ({weekdayName(adjPreview.first.newDate)})
              </p>
              <p className="text-[11px]" style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}>
                Last: {adjPreview.last.oldDate} &rarr; {adjPreview.last.newDate} ({weekdayName(adjPreview.last.newDate)})
              </p>
            </div>
          )}

          {/* ── Actions ───────────────────────────────────────────── */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowAdjustPanel(false)}
              className="py-[7px] px-4 text-[12px] font-semibold rounded-md cursor-pointer border-none"
              style={{ backgroundColor: EV_LIGHT, color: EV_MUTED }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!adjPreview || applying}
              className="py-[7px] px-5 text-[12px] font-semibold rounded-md cursor-pointer border-none"
              style={{
                backgroundColor: (!adjPreview || applying) ? EV_LIGHT : EV_NAVY,
                color: (!adjPreview || applying) ? EV_MUTED : '#fff',
              }}
            >
              {applying ? 'Applying\u2026' : 'Apply'}
            </button>
          </div>
        </div>
      )}

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
                className="py-2 text-center text-[10px] font-bold tracking-wider"
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
                        style={{ backgroundColor: EV_LIGHT, borderLeft: `3px solid ${DISPLAY_STATUS_DOT[derivedStatusKey(p)] || '#94A3B8'}` }}
                        title={`${p.title} (${p.channel_label})`}
                      >
                        <span
                          className="inline-block w-[5px] h-[5px] rounded-full flex-shrink-0"
                          style={{ backgroundColor: CHANNEL_DOT[p.channel_label] || '#94A3B8' }}
                        />
                        <span
                          className="text-[10px] font-medium truncate"
                          style={{ color: EV_NAVY, maxWidth: 'calc(100% - 12px)' }}
                        >
                          {p.title}
                        </span>
                        {p.scheduled_time && (
                          <span
                            className="text-[9px] flex-shrink-0"
                            style={{ color: EV_MUTED }}
                          >
                            {fmtTime12(p.scheduled_time)}
                          </span>
                        )}
                        {p.media_type !== 'none' && (
                          <span
                            className="flex-shrink-0"
                            title={p.media_url || p.media_type}
                            style={{ color: EV_MUTED, lineHeight: 0 }}
                          >
                            {p.media_type === 'image' && <ImageIcon size={8} />}
                            {p.media_type === 'video' && <Video size={8} />}
                            {p.media_type === 'file' && <Paperclip size={8} />}
                          </span>
                        )}
                        <span
                          className="ml-auto flex-shrink-0 text-[8px] font-bold leading-none rounded-sm px-[3px] py-[1px]"
                          style={{
                            color: p.post_as === 'personal' ? EV_EMBER : EV_MUTED,
                            backgroundColor: p.post_as === 'personal' ? '#F8E8E3' : '#EEECEA',
                          }}
                          title={p.post_as === 'personal' ? 'You' : 'Company'}
                        >
                          {p.post_as === 'personal' ? 'You' : 'Co'}
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
                      className="py-2 px-3 text-[10px] font-bold tracking-wider"
                      style={{ color: EV_MUTED }}
                    >
                      Post as
                    </th>
                    <th
                      className="py-2 px-3 text-[10px] font-bold tracking-wider"
                      style={{ color: EV_MUTED }}
                    >
                      Media
                    </th>
                    <th
                      className="py-2 px-3 text-[10px] font-bold tracking-wider"
                      style={{ color: EV_MUTED }}
                    >
                      Notes
                    </th>
                    <th className="py-2 px-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(p => {
                    const ds = displayStatus(p);
                    return (
                      <tr
                        key={p.id}
                        className="group cursor-pointer"
                        style={{ borderBottom: `1px solid ${EV_LINE}`, borderLeft: `3px solid ${ds.dotColor}` }}
                        onClick={() => openFormForPost(p)}
                      >
                        <td
                          className="py-2.5 px-3 text-[13px] font-semibold"
                          style={{ color: EV_NAVY }}
                        >
                          {p.title}
                        </td>
                        <td className="py-2.5 px-3 text-[12px]" style={{ color: EV_MUTED }}>
                          {p.channel_label || '\u2014'}
                        </td>
                        <td
                          className="py-2.5 px-3 text-[12px]"
                          style={{ color: EV_MUTED, fontFamily: 'ui-monospace, monospace' }}
                        >
                          <div>{p.scheduled_date}</div>
                          {p.scheduled_time && (
                            <div className="text-[11px]" style={{ fontFamily: BODY }}>
                              {fmtTime12(p.scheduled_time)}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[12px]" style={{ color: EV_MUTED }}>
                          {p.owner || '\u2014'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
                            style={{ color: ds.labelColor }}
                          >
                            <span
                              className="inline-block w-[7px] h-[7px] rounded-full flex-shrink-0"
                              style={{ backgroundColor: CHANNEL_DOT[p.channel_label] || '#94A3B8' }}
                            />
                            {ds.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                          <select
                            value={p.post_as}
                            onChange={async (e) => {
                              const val = e.target.value as 'personal' | 'company';
                              const { error: err } = await bulkUpdatePostAs([p.id], val);
                              if (err) toast.error(`Update failed: ${err}`);
                            }}
                            disabled={applying || loading}
                            className="py-[3px] px-[5px] text-[11px] font-medium border rounded outline-none cursor-pointer"
                            style={{ borderColor: EV_LINE, color: EV_NAVY, backgroundColor: '#fff' }}
                          >
                            <option value="personal">You</option>
                            <option value="company">Company</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-[11px]" style={{ color: EV_MUTED }}>
                          {p.media_type !== 'none' ? (
                            <span className="inline-flex items-center gap-1">
                              {p.media_type === 'image' && <ImageIcon size={12} />}
                              {p.media_type === 'video' && <Video size={12} />}
                              {p.media_type === 'file' && <Paperclip size={12} />}
                              {p.media_url ? (
                                p.media_url.startsWith('http') ? (
                                  <a
                                    href={p.media_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-[11px] underline truncate max-w-[120px]"
                                    style={{ color: '#1D4ED8' }}
                                    title={p.media_url}
                                  >
                                    Link
                                  </a>
                                ) : (
                                  <span className="truncate max-w-[120px]" title={p.media_url}>
                                    {p.media_url}
                                  </span>
                                )
                              ) : null}
                            </span>
                          ) : (
                            '\u2014'
                          )}
                        </td>
                        <td
                          className="py-2.5 px-3 text-[11px] max-w-[200px] truncate"
                          style={{ color: EV_FAINT }}
                          title={p.notes || ''}
                        >
                          {p.notes || '\u2014'}
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

    </div>
  );
}
