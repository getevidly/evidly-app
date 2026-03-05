/**
 * Event Log — Paginated, filtered, real-time admin event log
 * Route: /admin/event-log
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';

const PAGE_SIZE = 50;
const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  INFO:  { bg: '#F0FFF4', text: '#059669' },
  WARN:  { bg: '#FFFBEB', text: '#D97706' },
  ERROR: { bg: '#FEF2F2', text: '#DC2626' },
  DEBUG: { bg: '#F3F4F6', text: '#6B7280' },
};

const CATEGORIES = ['all', 'crawl', 'auth', 'k2c', 'security', 'emulation', 'backup', 'maintenance', 'system'];

interface EventRow {
  id: string;
  event_time: string;
  level: string;
  category: string | null;
  message: string;
  metadata: any;
}

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FAF7F2', border: '2px dashed #E2D9C8', borderRadius: 12, margin: 16 }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: TEXT_SEC, maxWidth: 360, margin: '0 auto' }}>{subtitle}</div>
  </div>
);

export default function EventLog() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [levelFilter, setLevelFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('admin_event_log')
      .select('*', { count: 'exact' })
      .order('event_time', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (levelFilter !== 'all') query = query.eq('level', levelFilter);
    if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
    if (search) query = query.ilike('message', `%${search}%`);

    const { data, count, error } = await query;
    if (!error) {
      setEvents(data || []);
      setTotalCount(count);
    }
    setLoading(false);
  }, [page, levelFilter, categoryFilter, search]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('event-log-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_event_log' },
        (payload) => {
          if (page === 0 && levelFilter === 'all' && categoryFilter === 'all' && !search) {
            setEvents(prev => [payload.new as EventRow, ...prev].slice(0, PAGE_SIZE));
            setTotalCount(prev => (prev ?? 0) + 1);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [page, levelFilter, categoryFilter, search]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadEvents, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadEvents]);

  const totalPages = totalCount !== null ? Math.ceil(totalCount / PAGE_SIZE) : 0;

  const exportCsv = () => {
    const header = 'Time,Level,Category,Message\n';
    const rows = events.map(e =>
      `"${new Date(e.event_time).toISOString()}","${e.level}","${e.category || ''}","${e.message.replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 12px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 6, color: NAVY, fontSize: 12,
  };

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Event Log' }]} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Event Log</h1>
          <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
            {totalCount !== null ? `${totalCount.toLocaleString()} events` : '—'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT_SEC, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto-refresh (10s)
          </label>
          <button onClick={exportCsv} style={{ padding: '6px 14px', background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT_SEC, fontSize: 12, cursor: 'pointer' }}>Export CSV</button>
          <button onClick={loadEvents} style={{ padding: '6px 14px', background: GOLD, border: 'none', borderRadius: 6, color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Refresh</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <select value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setPage(0); }}
          style={inputStyle}>
          <option value="all">All Levels</option>
          {['INFO', 'WARN', 'ERROR', 'DEBUG'].map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}
          style={inputStyle}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search messages..."
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : events.length === 0 ? (
          <EmptyState icon="📋" title="No events logged yet" subtitle="Events will appear here as the platform runs." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Time', 'Level', 'Category', 'Message'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_SEC, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map(e => {
                const lc = LEVEL_COLORS[e.level] || LEVEL_COLORS.DEBUG;
                const isExpanded = expandedId === e.id;
                return (
                  <tr key={e.id}
                    onClick={() => setExpandedId(isExpanded ? null : e.id)}
                    style={{ borderBottom: `1px solid ${BORDER}`, cursor: e.metadata ? 'pointer' : 'default', transition: 'background 0.15s' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 14px', color: TEXT_SEC, whiteSpace: 'nowrap', fontSize: 12 }}>
                      {new Date(e.event_time).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: lc.bg, color: lc.text }}>
                        {e.level}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{e.category || '—'}</td>
                    <td style={{ padding: '10px 14px', color: NAVY }}>
                      {e.message}
                      {isExpanded && e.metadata && (
                        <pre style={{ marginTop: 8, padding: 12, background: '#F3F4F6', borderRadius: 6, fontSize: 11, color: TEXT_SEC, overflow: 'auto', maxHeight: 200 }}>
                          {JSON.stringify(e.metadata, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 14px', background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 6, color: page === 0 ? TEXT_MUTED : NAVY, fontSize: 12, cursor: page === 0 ? 'default' : 'pointer' }}>
            Previous
          </button>
          <span style={{ padding: '6px 14px', fontSize: 12, color: TEXT_SEC }}>
            Page {page + 1} of {totalPages}
          </span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 14px', background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 6, color: page >= totalPages - 1 ? TEXT_MUTED : NAVY, fontSize: 12, cursor: page >= totalPages - 1 ? 'default' : 'pointer' }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
