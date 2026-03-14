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
import { KpiTile } from '../../components/admin/KpiTile';
import { toast } from 'sonner';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';
const GREEN = '#10B981';
const RED = '#DC2626';

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
  'admin': { label: 'Admin', color: NAVY, bg: '#F0F4F8' },
  'security': { label: 'Security', color: RED, bg: '#FEF2F2' },
  'data': { label: 'Data', color: '#059669', bg: '#ECFDF5' },
  'edge_fn': { label: 'Edge Fn', color: '#7C3AED', bg: '#F5F3FF' },
};

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', fontSize: 13, border: `1px solid ${BORDER}`,
  borderRadius: 6, outline: 'none', color: NAVY, background: '#fff',
};

const btnStyle = (bg: string, fg: string): React.CSSProperties => ({
  padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none',
  borderRadius: 6, cursor: 'pointer', background: bg, color: fg,
});

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
    return ACTION_CATEGORIES[prefix] || { label: prefix, color: TEXT_MUTED, bg: '#F3F4F6' };
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
    if (!obj) return <span style={{ color: TEXT_MUTED, fontStyle: 'italic' }}>null</span>;
    return (
      <pre style={{
        fontSize: 12, fontFamily: 'monospace', background: '#F8FAFC',
        padding: 10, borderRadius: 6, margin: 0, whiteSpace: 'pre-wrap',
        wordBreak: 'break-all', color: NAVY, maxHeight: 200, overflowY: 'auto',
      }}>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Platform Audit Log</h1>
          <p style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>
            SOX-grade immutable audit trail — all admin and security events
          </p>
        </div>
        <button onClick={exportCsv} style={btnStyle(GOLD, '#fff')}>
          Export CSV
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiTile label="Total Events" value={totalEvents} />
        <KpiTile label="Failed Events" value={failedEvents} valueColor={failedEvents > 0 ? RED : undefined} />
        <KpiTile label="Unique Actors" value={uniqueActors} />
        <KpiTile label="Security Events" value={securityEvents} valueColor={securityEvents > 0 ? RED : undefined} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...inputStyle, width: 160 }}
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(0); }}
        />
        <input
          style={{ ...inputStyle, width: 180 }}
          placeholder="Filter by actor email..."
          value={actorFilter}
          onChange={e => { setActorFilter(e.target.value); setPage(0); }}
        />
        <input
          style={{ ...inputStyle, width: 160 }}
          placeholder="Filter by resource..."
          value={resourceFilter}
          onChange={e => { setResourceFilter(e.target.value); setPage(0); }}
        />
        <select
          style={inputStyle}
          value={successFilter}
          onChange={e => { setSuccessFilter(e.target.value as any); setPage(0); }}
        >
          <option value="all">All Results</option>
          <option value="true">Success</option>
          <option value="false">Failed</option>
        </select>
        <input
          type="date"
          style={inputStyle}
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(0); }}
          title="From date"
        />
        <input
          type="date"
          style={inputStyle}
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(0); }}
          title="To date"
        />
        {hasFilters && (
          <button onClick={clearFilters} style={{ ...btnStyle('#F0F4F8', TEXT_SEC), fontSize: 11 }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Audit table */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>Loading audit log...</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No audit entries match filters</div>
        ) : (
          <>
            {entries.map(entry => {
              const cat = getActionCategory(entry.action);
              const isExpanded = expanded.has(entry.id);
              const hasDetail = entry.old_value || entry.new_value || entry.metadata || entry.error_message;

              return (
                <div key={entry.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {/* Main row */}
                  <div
                    onClick={() => hasDetail && toggleExpand(entry.id)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 180px 1fr 120px 100px 60px',
                      padding: '10px 16px',
                      alignItems: 'center',
                      fontSize: 13,
                      cursor: hasDetail ? 'pointer' : 'default',
                      background: isExpanded ? '#FAFBFC' : 'transparent',
                    }}
                  >
                    {/* Timestamp */}
                    <div style={{ fontSize: 12, color: TEXT_SEC }}>{formatTime(entry.created_at)}</div>

                    {/* Actor */}
                    <div>
                      <div style={{ fontSize: 12, color: NAVY, fontWeight: 500 }}>
                        {entry.actor_email || 'System'}
                      </div>
                      {entry.actor_ip && (
                        <div style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: 'monospace' }}>{entry.actor_ip}</div>
                      )}
                    </div>

                    {/* Action + Resource */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 6px', borderRadius: 4,
                        fontSize: 10, fontWeight: 700, background: cat.bg, color: cat.color,
                        textTransform: 'uppercase',
                      }}>
                        {cat.label}
                      </span>
                      <span style={{ color: NAVY, fontWeight: 500, fontSize: 12 }}>
                        {entry.action.split('.').slice(1).join('.')}
                      </span>
                      {entry.resource_type && (
                        <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                          on {entry.resource_type}{entry.resource_id ? `:${entry.resource_id.substring(0, 8)}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Role */}
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                      {entry.actor_role || '—'}
                    </div>

                    {/* Status */}
                    <div>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                        fontSize: 10, fontWeight: 600,
                        background: entry.success ? '#ECFDF5' : '#FEF2F2',
                        color: entry.success ? GREEN : RED,
                      }}>
                        {entry.success ? 'OK' : 'FAIL'}
                      </span>
                    </div>

                    {/* Expand indicator */}
                    <div style={{ textAlign: 'right', color: TEXT_MUTED, fontSize: 14 }}>
                      {hasDetail ? (isExpanded ? '\u25B2' : '\u25BC') : ''}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && hasDetail && (
                    <div style={{
                      padding: '12px 16px 16px', background: '#FAFBFC',
                      borderTop: `1px solid ${BORDER}`,
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        {entry.old_value && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, marginBottom: 4, textTransform: 'uppercase' }}>
                              Old Value
                            </div>
                            {renderJson(entry.old_value)}
                          </div>
                        )}
                        {entry.new_value && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, marginBottom: 4, textTransform: 'uppercase' }}>
                              New Value
                            </div>
                            {renderJson(entry.new_value)}
                          </div>
                        )}
                        {entry.metadata && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, marginBottom: 4, textTransform: 'uppercase' }}>
                              Metadata
                            </div>
                            {renderJson(entry.metadata)}
                          </div>
                        )}
                      </div>
                      {entry.error_message && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: RED, marginBottom: 4, textTransform: 'uppercase' }}>
                            Error
                          </div>
                          <div style={{ fontSize: 12, color: RED, fontFamily: 'monospace', background: '#FEF2F2', padding: 8, borderRadius: 4 }}>
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
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderTop: `1px solid ${BORDER}`,
              }}>
                <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    style={{ ...btnStyle('#F0F4F8', page === 0 ? TEXT_MUTED : NAVY), opacity: page === 0 ? 0.5 : 1 }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * PAGE_SIZE >= total}
                    style={{ ...btnStyle('#F0F4F8', (page + 1) * PAGE_SIZE >= total ? TEXT_MUTED : NAVY), opacity: (page + 1) * PAGE_SIZE >= total ? 0.5 : 1 }}
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
