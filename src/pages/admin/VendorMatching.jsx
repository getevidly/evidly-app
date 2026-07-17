/**
 * VendorMatching — Admin queue for vendor identity resolution.
 * Route: /admin/ops/vendor-matching
 *
 * Displays vendor_match_candidates rows for Arthur to review.
 * Every match must be confirmed, merged, created as new, or rejected.
 * NO auto-resolve. vendor_company_id is ONLY set by explicit human action.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Building2, Search, Check, GitMerge, Plus, X, ChevronRight } from 'lucide-react';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';
import { EmptyState } from '../../components/EmptyState';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

// ── Status colors ──────────────────────────────────────────
const STATUS_COLORS = {
  pending:     { bg: '#FFFBEB', fg: '#D97706' },
  confirmed:   { bg: '#F0FFF4', fg: '#059669' },
  merged:      { bg: '#EFF6FF', fg: '#2563EB' },
  new_company: { bg: '#F0FDF4', fg: '#16A34A' },
  rejected:    { bg: '#FEF2F2', fg: '#DC2626' },
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  merged: 'Merged',
  new_company: 'New Company',
  rejected: 'Rejected',
};

// ── Helpers ────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ScoreBadge({ score }) {
  if (score == null) return <span className="text-[#1E2D4D]/20 text-xs">—</span>;
  const pct = Math.round(score * 100);
  const color = score >= 0.7 ? { bg: '#F0FFF4', fg: '#059669' }
    : score >= 0.4 ? { bg: '#FFFBEB', fg: '#D97706' }
    : { bg: '#F3F4F6', fg: '#6B7280' };
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: color.bg, color: color.fg }}>
      {pct}%
    </span>
  );
}

function ReasonTags({ reasons }) {
  if (!reasons || typeof reasons !== 'object') return null;
  const tags = [];
  if (reasons.name_similarity != null && reasons.name_similarity > 0) {
    tags.push(`Name: ${Math.round(reasons.name_similarity * 100)}%`);
  }
  if (reasons.phone_match) tags.push('Phone: exact');
  if (reasons.email_domain_match) tags.push('Email domain');
  if (reasons.ein_match) tags.push('EIN: exact');
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {tags.map(t => (
        <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1E2D4D]/5 text-[#1E2D4D]/60">
          {t}
        </span>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────
export default function VendorMatching() {
  usePageTitle('Admin | Vendor Matching');
  const { user } = useAuth();

  const [candidates, setCandidates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [saving, setSaving] = useState({});
  const [selected, setSelected] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null); // candidate id for merge modal
  const [mergeCompanyId, setMergeCompanyId] = useState('');

  // ── Load data ──────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [qRes, cRes] = await Promise.all([
      supabase.rpc('get_vendor_match_queue'),
      supabase.from('vendor_companies').select('id, canonical_name').order('canonical_name'),
    ]);
    if (qRes.data) setCandidates(qRes.data);
    if (qRes.error) console.error('[VendorMatching] queue RPC failed:', qRes.error.message);
    if (cRes.data) setCompanies(cRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filter ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = candidates;
    if (statusFilter !== 'all') {
      list = list.filter(c => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.submitted_name || '').toLowerCase().includes(q)
        || (c.candidate_company_name || '').toLowerCase().includes(q)
        || (c.org_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [candidates, statusFilter, search]);

  // ── Stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const pending = candidates.filter(c => c.status === 'pending');
    const confirmedToday = candidates.filter(c =>
      (c.status === 'confirmed' || c.status === 'merged' || c.status === 'new_company')
      && c.resolved_at && c.resolved_at.slice(0, 10) === todayStr
    );
    const totalBlocked = pending.reduce((sum, c) => sum + (c.kitchens_blocked || 0), 0);
    return {
      pending: pending.length,
      confirmedToday: confirmedToday.length,
      kitchensBlocked: totalBlocked,
    };
  }, [candidates]);

  // ── Resolve action ─────────────────────────────────────
  async function handleResolve(candidateId, action, companyId) {
    setSaving(s => ({ ...s, [candidateId]: true }));
    const { error } = await supabase.rpc('resolve_vendor_match', {
      p_candidate_id: candidateId,
      p_action: action,
      p_company_id: companyId || null,
      p_resolver_id: user?.id || null,
    });
    setSaving(s => ({ ...s, [candidateId]: false }));
    if (error) {
      toast.error(`Failed: ${error.message}`);
      return;
    }
    toast.success(
      action === 'confirmed' ? 'Vendor confirmed'
      : action === 'merged' ? 'Vendor merged'
      : action === 'new_company' ? 'New company created'
      : 'Vendor rejected'
    );
    setSelected(null);
    setMergeTarget(null);
    await loadData();
  }

  // ── Loading ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A08C5A]" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="font-['DM_Sans','Inter',sans-serif]">
      <AdminBreadcrumb crumbs={[{ label: 'Vendor Matching' }]} />

      <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-1">
        Vendor Matching
      </h1>
      <p className="text-sm text-[#1E2D4D]/60 mb-6">
        Review and resolve vendor identity matches. Every match must be confirmed before vendor_company_id is set.
      </p>

      {/* ── KPI tiles ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <KpiTile label="Pending" value={stats.pending} valueColor="gold" />
        <KpiTile label="Confirmed today" value={stats.confirmedToday} valueColor="green" />
        <KpiTile label="Kitchens blocked" value={stats.kitchensBlocked} valueColor={stats.kitchensBlocked > 0 ? 'red' : 'navy'} />
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1E2D4D]/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vendor name, candidate, org..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#1E2D4D]/10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-[#1E2D4D]/10 rounded-xl bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="merged">Merged</option>
          <option value="new_company">New Company</option>
          <option value="rejected">Rejected</option>
        </select>
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80 underline">
            Clear
          </button>
        )}
      </div>

      {/* ── Queue table ────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No vendor matches"
          description={candidates.length === 0
            ? 'No vendor match candidates yet. Matches appear here when vendors are designated on LOAs.'
            : 'No matches for the current filter.'}
        />
      ) : (
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAF7F0] border-b border-[#1E2D4D]/10">
                <th className="text-left px-5 py-2.5 font-semibold text-[#1E2D4D]/80">Submitted Name</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[#1E2D4D]/80">Top Candidate</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[#1E2D4D]/80 w-[80px]">Score</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[#1E2D4D]/80">Match Reasons</th>
                <th className="text-center px-4 py-2.5 font-semibold text-[#1E2D4D]/80 w-[80px]">Kitchens</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[#1E2D4D]/80 w-[100px]">Status</th>
                <th className="text-right px-5 py-2.5 font-semibold text-[#1E2D4D]/80 w-[280px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const isPending = c.status === 'pending';
                const isSaving = !!saving[c.id];
                const colors = STATUS_COLORS[c.status] || STATUS_COLORS.pending;

                return (
                  <tr key={c.id}
                    onClick={() => setSelected(c)}
                    className="border-b border-[#1E2D4D]/5 last:border-b-0 cursor-pointer hover:bg-[#FAF7F0]/50">
                    {/* Submitted name + org */}
                    <td className="px-5 py-3">
                      <div className="font-medium text-[#1E2D4D]">{c.submitted_name}</div>
                      {c.org_name && (
                        <div className="text-[10px] text-[#1E2D4D]/40 mt-0.5">{c.org_name}</div>
                      )}
                    </td>

                    {/* Top candidate */}
                    <td className="px-4 py-3">
                      <div className="text-[#1E2D4D]">
                        {c.candidate_company_name || <span className="text-[#1E2D4D]/30">No match</span>}
                      </div>
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3">
                      <ScoreBadge score={c.match_score} />
                    </td>

                    {/* Reasons */}
                    <td className="px-4 py-3">
                      <ReasonTags reasons={c.match_reasons} />
                    </td>

                    {/* Kitchens blocked */}
                    <td className="px-4 py-3 text-center">
                      {c.kitchens_blocked > 0 ? (
                        <span className="text-sm font-bold text-[#DC2626]">{c.kitchens_blocked}</span>
                      ) : (
                        <span className="text-[#1E2D4D]/20">0</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: colors.bg, color: colors.fg }}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                      {isSaving ? (
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-[#A08C5A]" />
                      ) : isPending ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {c.candidate_company_id && (
                            <button
                              onClick={() => handleResolve(c.id, 'confirmed', c.candidate_company_id)}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-[#A08C5A]/40 text-[#A08C5A] hover:bg-[#FBF3E0] transition-colors"
                            >
                              <Check size={11} />
                              Confirm
                            </button>
                          )}
                          <button
                            onClick={() => { setMergeTarget(c.id); setMergeCompanyId(''); }}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-[#1E2D4D]/15 text-[#1E2D4D]/70 hover:bg-[#FAF7F0] transition-colors"
                          >
                            <GitMerge size={11} />
                            Merge
                          </button>
                          <button
                            onClick={() => handleResolve(c.id, 'new_company')}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-[#1E2D4D]/15 text-[#1E2D4D]/70 hover:bg-[#FAF7F0] transition-colors"
                          >
                            <Plus size={11} />
                            New
                          </button>
                          <button
                            onClick={() => handleResolve(c.id, 'rejected')}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-[#DC2626]/15 text-[#DC2626]/60 hover:bg-[#FEF2F2] transition-colors"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#1E2D4D]/40">
                          {fmtDate(c.resolved_at)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail drawer ──────────────────────────────────── */}
      {selected && (
        <div className="fixed top-0 right-0 bottom-0 w-[420px] max-w-[100vw] bg-white z-50 shadow-[-4px_0_24px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#1E2D4D]/10 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: (STATUS_COLORS[selected.status] || STATUS_COLORS.pending).bg,
                         color: (STATUS_COLORS[selected.status] || STATUS_COLORS.pending).fg }}>
                {STATUS_LABELS[selected.status] || selected.status}
              </span>
              <button onClick={() => setSelected(null)} className="text-[#1E2D4D]/40 hover:text-[#1E2D4D]">
                <X size={16} />
              </button>
            </div>
            <h3 className="text-base font-bold text-[#1E2D4D] leading-tight">{selected.submitted_name}</h3>
            {selected.org_name && (
              <p className="text-xs text-[#1E2D4D]/50 mt-0.5">from {selected.org_name}</p>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {/* Submitted details */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-[#1E2D4D]/60 uppercase tracking-wider mb-3">Submitted Details</h4>
              <div className="space-y-2 text-sm">
                <div><span className="text-[#1E2D4D]/50 w-16 inline-block">Name</span> <span className="font-medium text-[#1E2D4D]">{selected.submitted_name}</span></div>
                <div><span className="text-[#1E2D4D]/50 w-16 inline-block">Phone</span> <span className="text-[#1E2D4D]">{selected.submitted_phone || '—'}</span></div>
                <div><span className="text-[#1E2D4D]/50 w-16 inline-block">Email</span> <span className="text-[#1E2D4D]">{selected.submitted_email || '—'}</span></div>
                <div><span className="text-[#1E2D4D]/50 w-16 inline-block">Address</span> <span className="text-[#1E2D4D]">{selected.submitted_address || '—'}</span></div>
              </div>
            </div>

            {/* Top candidate */}
            {selected.candidate_company_name && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-[#1E2D4D]/60 uppercase tracking-wider mb-3">Top Candidate</h4>
                <div className="bg-[#FAF7F0] rounded-lg p-4 border border-[#1E2D4D]/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-[#1E2D4D]">{selected.candidate_company_name}</span>
                    <ScoreBadge score={selected.match_score} />
                  </div>
                  <ReasonTags reasons={selected.match_reasons} />
                </div>
              </div>
            )}

            {/* Kitchens waiting */}
            {selected.kitchens_blocked > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-[#1E2D4D]/60 uppercase tracking-wider mb-3">Kitchens Waiting</h4>
                <div className="bg-[#FEF2F2] rounded-lg p-4 border border-[#DC2626]/10">
                  <span className="text-sm font-bold text-[#DC2626]">{selected.kitchens_blocked}</span>
                  <span className="text-sm text-[#DC2626]/70 ml-1">vendor record{selected.kitchens_blocked !== 1 ? 's' : ''} with no company link</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          {selected.status === 'pending' && (
            <div className="px-5 py-4 border-t border-[#1E2D4D]/10 shrink-0 flex gap-2">
              {selected.candidate_company_id && (
                <button
                  onClick={() => handleResolve(selected.id, 'confirmed', selected.candidate_company_id)}
                  disabled={!!saving[selected.id]}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#A08C5A] text-white hover:bg-[#8F7D4F] transition-colors disabled:opacity-50"
                >
                  <Check size={13} />
                  Confirm Match
                </button>
              )}
              <button
                onClick={() => { setMergeTarget(selected.id); setMergeCompanyId(''); }}
                disabled={!!saving[selected.id]}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#1E2D4D] text-white hover:bg-[#162340] transition-colors disabled:opacity-50"
              >
                <GitMerge size={13} />
                Merge
              </button>
              <button
                onClick={() => handleResolve(selected.id, 'new_company')}
                disabled={!!saving[selected.id]}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#1E2D4D]/20 text-[#1E2D4D] hover:bg-[#FAF7F0] transition-colors disabled:opacity-50"
              >
                <Plus size={13} />
                New Company
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Merge modal ────────────────────────────────────── */}
      {mergeTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl w-[420px] max-w-[95vw]">
            <div className="px-6 py-4 border-b border-[#1E2D4D]/10">
              <h3 className="text-base font-bold text-[#1E2D4D]">Merge into existing company</h3>
              <p className="text-xs text-[#1E2D4D]/50 mt-0.5">
                Select the canonical vendor company to merge this vendor into.
              </p>
            </div>
            <div className="px-6 py-5">
              {companies.length === 0 ? (
                <p className="text-sm text-[#1E2D4D]/50">No vendor companies exist yet. Use "New Company" instead.</p>
              ) : (
                <select
                  value={mergeCompanyId}
                  onChange={e => setMergeCompanyId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#1E2D4D]/10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]"
                >
                  <option value="">Select a company...</option>
                  {companies.map(co => (
                    <option key={co.id} value={co.id}>{co.canonical_name || co.id}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="px-6 py-3 border-t border-[#1E2D4D]/10 flex gap-2 justify-end">
              <button
                onClick={() => setMergeTarget(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-[#1E2D4D]/15 text-[#1E2D4D]/60 hover:bg-[#FAF7F0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!mergeCompanyId) { toast.error('Select a company'); return; }
                  handleResolve(mergeTarget, 'merged', mergeCompanyId);
                }}
                disabled={!mergeCompanyId || !!saving[mergeTarget]}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#1E2D4D] text-white hover:bg-[#162340] transition-colors disabled:opacity-50"
              >
                Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
