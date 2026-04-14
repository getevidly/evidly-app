/**
 * Event Log — Paginated, filtered, real-time admin event log
 * Route: /admin/event-log
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { useDemoGuard } from '../../hooks/useDemoGuard';

const PAGE_SIZE = 50;

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
  <div className="rounded-md animate-pulse bg-[#E5E7EB]" style={{ width: w, height: h }} />
);

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="text-center py-[60px] px-5 bg-[#FAF7F2] border-2 border-dashed border-[#E2D9C8] rounded-xl m-4">
    <div className="text-[40px] mb-4">{icon}</div>
    <div className="text-base font-bold text-navy mb-2">{title}</div>
    <div className="text-[13px] text-[#6B7F96] max-w-[360px] mx-auto">{subtitle}</div>
  </div>
);

export default function EventLog() {
  useDemoGuard();
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

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Event Log' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Event Log</h1>
          <p className="text-[13px] text-[#6B7F96] mt-1">
            {totalCount !== null ? `${totalCount.toLocaleString()} events` : '—'}
          </p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-xs text-[#6B7F96] cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto-refresh (10s)
          </label>
          <button onClick={exportCsv} className="py-1.5 px-3.5 bg-white border border-[#E2D9C8] rounded-md text-[#6B7F96] text-xs cursor-pointer">Export CSV</button>
          <button onClick={loadEvents} className="py-1.5 px-3.5 bg-gold border-none rounded-md text-white text-xs font-bold cursor-pointer">Refresh</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setPage(0); }}
          className="py-1.5 px-3 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-xs">
          <option value="all">All Levels</option>
          {['INFO', 'WARN', 'ERROR', 'DEBUG'].map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}
          className="py-1.5 px-3 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-xs">
          {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search messages..."
          className="py-1.5 px-3 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-xs flex-1 min-w-[200px]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E2D9C8] overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : events.length === 0 ? (
          <EmptyState icon="📋" title="No events logged yet" subtitle="Events will appear here as EvidLY runs." />
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#E2D9C8]">
                {['Time', 'Level', 'Category', 'Message'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3.5 text-[#6B7F96] font-semibold text-[11px] uppercase tracking-wide">{h}</th>
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
                    className={`border-b border-[#E2D9C8] transition-colors hover:bg-[#F9FAFB] ${e.metadata ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <td className="py-2.5 px-3.5 text-[#6B7F96] whitespace-nowrap text-xs">
                      {new Date(e.event_time).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="inline-block py-0.5 px-2 rounded text-[10px] font-bold" style={{ background: lc.bg, color: lc.text }}>
                        {e.level}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-[#6B7F96] text-xs">{e.category || '—'}</td>
                    <td className="py-2.5 px-3.5 text-navy">
                      {e.message}
                      {isExpanded && e.metadata && (
                        <pre className="mt-2 p-3 bg-[#F3F4F6] rounded-md text-[11px] text-[#6B7F96] overflow-auto max-h-[200px]">
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
        <div className="flex justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className={`py-1.5 px-3.5 bg-white border border-[#E2D9C8] rounded-md text-xs ${page === 0 ? 'text-[#9CA3AF] cursor-default' : 'text-navy cursor-pointer'}`}>
            Previous
          </button>
          <span className="py-1.5 px-3.5 text-xs text-[#6B7F96]">
            Page {page + 1} of {totalPages}
          </span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            className={`py-1.5 px-3.5 bg-white border border-[#E2D9C8] rounded-md text-xs ${page >= totalPages - 1 ? 'text-[#9CA3AF] cursor-default' : 'text-navy cursor-pointer'}`}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
