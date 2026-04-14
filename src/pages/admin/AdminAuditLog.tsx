/**
 * AdminAuditLog — SOX-grade platform audit trail viewer
 *
 * Route: /admin/audit-log
 * Access: platform_admin only (AdminShell)
 *
 * Features:
 *  - Query platform_audit_log with filters (date, actor, action, resource, success)
 *  - Expandable rows showing old/new value JSON diffs
 *  - CSV export
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import Button from '../../components/ui/Button';
import { KpiTile } from '../../components/admin/KpiTile';
import { toast } from 'sonner';

interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  actor_ip: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  old_value: any;
  new_value: any;
  metadata: any;
  success: boolean;
  error_message: string | null;
  created_at: string;
}


const ACTION_CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  'auth': { label: 'Auth', color: '#1D4ED8', bg: '#EFF6FF' },
  'admin': { label: 'Admin', color: '#1E2D4D', bg: '#F0F4F8' },
  'security': { label: 'Security', color: '#DC2626', bg: '#FEF2F2' },
  'data': { label: 'Data', color: '#059669', bg: '#ECFDF5' },
  'edge_fn': { label: 'Edge Fn', color: '#7C3AED', bg: '#F5F3FF' },
};

const PAGE_SIZE = 50;

export default function AdminAuditLog() {
  useDemoGuard();
  const { user } = useAuth();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState<'all' | 'true' | 'false'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('platform_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionFilter) {
        query = query.ilike('action', `%${actionFilter}%`);
      }
      if (actorFilter) {
        query = query.ilike('actor_email', `%${actorFilter}%`);
      }
      if (resourceFilter) {
        query = query.or(`resource_type.ilike.%${resourceFilter}%,resource_id.ilike.%${resourceFilter}%`);
      }
      if (successFilter !== 'all') {
        query = query.eq('success', successFilter === 'true');
      }
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());
      }

      const { data, count, error } = await query;
      if (error) throw error;

      setEntries((data || []) as AuditEntry[]);
      setTotal(count || (data || []).length);
    } catch {
      setEntries([]);
      setTotal(0);
    }
    setLoading(false);
  }, [page, actionFilter, actorFilter, resourceFilter, successFilter, dateFrom, dateTo]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── CSV Export ──
  const exportCsv = async () => {
    const headers = ['Timestamp', 'Actor', 'Role', 'IP', 'Action', 'Resource Type', 'Resource ID', 'Success', 'Error', 'Old Value', 'New Value', 'Metadata'];
    const rows = entries.map(e => [
      e.created_at,
      e.actor_email || '',
      e.actor_role || '',
      e.actor_ip || '',
      e.action,
      e.resource_type || '',
      e.resource_id || '',
      String(e.success),
      e.error_message || '',
      e.old_value ? JSON.stringify(e.old_value) : '',
      e.new_value ? JSON.stringify(e.new_value) : '',
      e.metadata ? JSON.stringify(e.metadata) : '',
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit log exported');

    // Log the export itself to the audit trail
    await supabase.from('platform_audit_log').insert({
      action: 'data.audit_log_exported',
      actor_id: user?.id || null,
      actor_email: user?.email || null,
      resource_type: 'audit_log',
      metadata: {
        date_range_start: dateFrom || null,
        date_range_end: dateTo || null,
        row_count: entries.length,
        filters_applied: hasFilters,
      },
      success: true,
    }).catch(() => {}); // non-blocking — audit insert must never break export
  };

  // ── Stats ──
  const totalEvents = total;
  const failedEvents = entries.filter(e => !e.success).length;
  const uniqueActors = new Set(entries.map(e => e.actor_email).filter(Boolean)).size;
  const securityEvents = entries.filter(e => e.action.startsWith('security.')).length;

  const getActionCategory = (action: string) => {
    const prefix = action.split('.')[0];
    return ACTION_CATEGORIES[prefix] || { label: prefix, color: '#9CA3AF', bg: '#F3F4F6' };
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderJson = (obj: any) => {
    if (!obj) return <span className="text-gray-400 italic">null</span>;
    return (
      <pre className="text-xs font-mono bg-slate-50 p-2.5 rounded-md m-0 whitespace-pre-wrap break-all text-navy max-h-[200px] overflow-y-auto">
        {JSON.stringify(obj, null, 2)}
      </pre>
    );
  };

  const clearFilters = () => {
    setActionFilter('');
    setActorFilter('');
    setResourceFilter('');
    setSuccessFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const hasFilters = actionFilter || actorFilter || resourceFilter || successFilter !== 'all' || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Audit Log' }]} />

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">Platform Audit Log</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            SOX-grade immutable audit trail — all admin and security events
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile label="Total Events" value={totalEvents} />
        <KpiTile label="Failed Events" value={failedEvents} valueColor={failedEvents > 0 ? '#DC2626' : undefined} />
        <KpiTile label="Unique Actors" value={uniqueActors} />
        <KpiTile label="Security Events" value={securityEvents} valueColor={securityEvents > 0 ? '#DC2626' : undefined} />
      </div>

      {/* Filters */}
      <div className="flex gap-2.5 flex-wrap items-center">
        <input
          className="py-[7px] px-2.5 text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-[160px]"
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(0); }}
        />
        <input
          className="py-[7px] px-2.5 text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-[180px]"
          placeholder="Filter by actor email..."
          value={actorFilter}
          onChange={e => { setActorFilter(e.target.value); setPage(0); }}
        />
        <input
          className="py-[7px] px-2.5 text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-[160px]"
          placeholder="Filter by resource..."
          value={resourceFilter}
          onChange={e => { setResourceFilter(e.target.value); setPage(0); }}
        />
        <select
          className="py-[7px] px-2.5 text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white"
          value={successFilter}
          onChange={e => { setSuccessFilter(e.target.value as any); setPage(0); }}
        >
          <option value="all">All Results</option>
          <option value="true">Success</option>
          <option value="false">Failed</option>
        </select>
        <input
          type="date"
          className="py-[7px] px-2.5 text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(0); }}
          title="From date"
        />
        <input
          type="date"
          className="py-[7px] px-2.5 text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(0); }}
          title="To date"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Audit table */}
      <div className="bg-white border border-border_ui-warm rounded-[10px] overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-[13px]">Loading audit log...</div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-[13px]">No audit entries match filters</div>
        ) : (
          <>
            {entries.map(entry => {
              const cat = getActionCategory(entry.action);
              const isExpanded = expanded.has(entry.id);
              const hasDetail = entry.old_value || entry.new_value || entry.metadata || entry.error_message;

              return (
                <div key={entry.id} className="border-b border-border_ui-warm">
                  {/* Main row */}
                  <div
                    onClick={() => hasDetail && toggleExpand(entry.id)}
                    className={`grid grid-cols-[140px_180px_1fr_120px_100px_60px] px-4 py-2.5 items-center text-[13px] ${hasDetail ? 'cursor-pointer' : 'cursor-default'} ${isExpanded ? 'bg-[#FAFBFC]' : 'bg-transparent'}`}
                  >
                    {/* Timestamp */}
                    <div className="text-xs text-slate_ui">{formatTime(entry.created_at)}</div>

                    {/* Actor */}
                    <div>
                      <div className="text-xs text-navy font-medium">
                        {entry.actor_email || 'System'}
                      </div>
                      {entry.actor_ip && (
                        <div className="text-[10px] text-gray-400 font-mono">{entry.actor_ip}</div>
                      )}
                    </div>

                    {/* Action + Resource */}
                    <div className="flex gap-2 items-center">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{ background: cat.bg, color: cat.color }}
                      >
                        {cat.label}
                      </span>
                      <span className="text-navy font-medium text-xs">
                        {entry.action.split('.').slice(1).join('.')}
                      </span>
                      {entry.resource_type && (
                        <span className="text-[11px] text-gray-400">
                          on {entry.resource_type}{entry.resource_id ? `:${entry.resource_id.substring(0, 8)}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Role */}
                    <div className="text-[11px] text-gray-400">
                      {entry.actor_role || '\u2014'}
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${entry.success ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-600'}`}>
                        {entry.success ? 'OK' : 'FAIL'}
                      </span>
                    </div>

                    {/* Expand indicator */}
                    <div className="text-right text-gray-400 text-sm">
                      {hasDetail ? (isExpanded ? '\u25B2' : '\u25BC') : ''}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && hasDetail && (
                    <div className="px-4 pt-3 pb-4 bg-[#FAFBFC] border-t border-border_ui-warm">
                      <div className="grid grid-cols-3 gap-4">
                        {entry.old_value && (
                          <div>
                            <div className="text-[11px] font-bold text-gray-400 mb-1 uppercase">
                              Old Value
                            </div>
                            {renderJson(entry.old_value)}
                          </div>
                        )}
                        {entry.new_value && (
                          <div>
                            <div className="text-[11px] font-bold text-gray-400 mb-1 uppercase">
                              New Value
                            </div>
                            {renderJson(entry.new_value)}
                          </div>
                        )}
                        {entry.metadata && (
                          <div>
                            <div className="text-[11px] font-bold text-gray-400 mb-1 uppercase">
                              Metadata
                            </div>
                            {renderJson(entry.metadata)}
                          </div>
                        )}
                      </div>
                      {entry.error_message && (
                        <div className="mt-2.5">
                          <div className="text-[11px] font-bold text-red-600 mb-1 uppercase">
                            Error
                          </div>
                          <div className="text-xs text-red-600 font-mono bg-red-50 p-2 rounded">
                            {entry.error_message}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex justify-between items-center px-4 py-3 border-t border-border_ui-warm">
                <span className="text-xs text-gray-400">
                  Showing {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className={`px-3.5 py-1.5 text-xs font-semibold border-none rounded-md bg-[#F0F4F8] ${page === 0 ? 'text-gray-400 opacity-50 cursor-default' : 'text-navy cursor-pointer'}`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * PAGE_SIZE >= total}
                    className={`px-3.5 py-1.5 text-xs font-semibold border-none rounded-md bg-[#F0F4F8] ${(page + 1) * PAGE_SIZE >= total ? 'text-gray-400 opacity-50 cursor-default' : 'text-navy cursor-pointer'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
