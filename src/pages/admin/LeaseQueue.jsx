/**
 * LeaseQueue — Admin queue for reviewing + confirming lease responsibility findings.
 * Route: /admin/lease-queue
 *
 * Displays location_safeguard_responsibility rows staged by the AI extraction
 * (confirmed_by IS NULL). A human reviewer Accept / Correct / Confirm-silent /
 * Assign each finding. "Accept all suggestions" per lease is a convenience
 * batch — still human-confirmed.
 *
 * NO auto-confirm. confirmed_by is ONLY set by explicit human action.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, Search, Check, CheckCheck, Edit3, AlertTriangle } from 'lucide-react';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';
import { EmptyState } from '../../components/EmptyState';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function capitalize(s) {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const PARTY_OPTIONS = ['tenant', 'landlord', 'shared', 'unspecified'];

const FINDING_COLORS = {
  allocated:   { bg: '#E8F2F1', fg: '#0F766E' },
  silent:      { bg: '#FBF3E0', fg: '#9A7B2D' },
  ambiguous:   { bg: '#FBF3E0', fg: '#9A7B2D' },
  conflicting: { bg: '#FBEAE5', fg: '#C2553A' },
};

// ── Component ────────────────────────────────────────────────
export default function LeaseQueue() {
  usePageTitle('Admin | Lease Queue');
  const { user } = useAuth();

  const [rows, setRows] = useState([]);
  const [docs, setDocs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState({});

  // Inline-edit state: { [rowId]: { maintenance_party, notification_party } }
  const [editing, setEditing] = useState({});

  // ── Load data ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [rRes, dRes, lRes, sRes] = await Promise.all([
      supabase
        .from('location_safeguard_responsibility')
        .select('*')
        .eq('source', 'lease')
        .order('created_at', { ascending: false }),
      supabase
        .from('compliance_documents')
        .select('id, name, location_id, created_at, status')
        .eq('type', 'lease_agreement'),
      supabase
        .from('locations')
        .select('id, name'),
      supabase
        .from('service_type_definitions')
        .select('code, name, short_name, nfpa_citation')
        .in('code', ['KEC', 'FS', 'FA', 'SP', 'FE']),
    ]);
    if (rRes.data) setRows(rRes.data);
    if (dRes.data) setDocs(dRes.data);
    if (lRes.data) setLocations(lRes.data);
    if (sRes.data) setServiceTypes(sRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Lookup maps ────────────────────────────────────────────
  const docMap = useMemo(() => {
    const m = {};
    for (const d of docs) m[d.id] = d;
    return m;
  }, [docs]);

  const locMap = useMemo(() => {
    const m = {};
    for (const l of locations) m[l.id] = l;
    return m;
  }, [locations]);

  const stMap = useMemo(() => {
    const m = {};
    for (const s of serviceTypes) m[s.code] = s;
    return m;
  }, [serviceTypes]);

  // ── Group by (location_id, lease_document_id) ──────────────
  const leaseGroups = useMemo(() => {
    const groups = {};
    for (const r of rows) {
      const key = `${r.location_id}::${r.lease_document_id}`;
      if (!groups[key]) groups[key] = { location_id: r.location_id, lease_document_id: r.lease_document_id, rows: [] };
      groups[key].rows.push(r);
    }
    // Sort safeguard rows within each group by code order
    const codeOrder = { KEC: 0, FS: 1, FA: 2, SP: 3, FE: 4 };
    for (const g of Object.values(groups)) {
      g.rows.sort((a, b) => (codeOrder[a.service_type_code] ?? 99) - (codeOrder[b.service_type_code] ?? 99));
    }
    return Object.values(groups);
  }, [rows]);

  // ── Filter ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return leaseGroups;
    const q = search.toLowerCase();
    return leaseGroups.filter(g => {
      const loc = locMap[g.location_id];
      const doc = docMap[g.lease_document_id];
      return (loc?.name || '').toLowerCase().includes(q)
        || (doc?.name || '').toLowerCase().includes(q);
    });
  }, [leaseGroups, search, locMap, docMap]);

  // ── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const pending = rows.filter(r => !r.confirmed_by);
    const confirmed = rows.filter(r => r.confirmed_by);
    return {
      leasesPending: new Set(pending.map(r => `${r.location_id}::${r.lease_document_id}`)).size,
      findingsToReview: pending.length,
      silentFindings: pending.filter(r => r.finding_type === 'silent').length,
      confirmedMonth: confirmed.filter(r => r.confirmed_at && new Date(r.confirmed_at) >= monthStart).length,
    };
  }, [rows]);

  // ── Confirm helpers ────────────────────────────────────────
  async function confirmRow(rowId, updates) {
    setSaving(s => ({ ...s, [rowId]: true }));
    const { error } = await supabase
      .from('location_safeguard_responsibility')
      .update({
        ...updates,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', rowId);

    setSaving(s => ({ ...s, [rowId]: false }));
    if (error) {
      toast.error(`Failed to confirm: ${error.message}`);
      return false;
    }
    toast.success('Finding confirmed');
    await loadData();
    return true;
  }

  function handleAccept(row) {
    const ai = row.ai_suggested || {};
    confirmRow(row.id, {
      maintenance_party: ai.maintenance_party || row.maintenance_party,
      notification_party: ai.notification_party || row.notification_party,
      finding_type: 'allocated',
    });
  }

  function handleConfirmSilent(row) {
    confirmRow(row.id, {
      maintenance_party: 'unspecified',
      notification_party: 'unspecified',
      finding_type: 'silent',
    });
  }

  function handleStartCorrect(row) {
    const ai = row.ai_suggested || {};
    setEditing(e => ({
      ...e,
      [row.id]: {
        maintenance_party: ai.maintenance_party || row.maintenance_party || 'unspecified',
        notification_party: ai.notification_party || row.notification_party || 'unspecified',
      },
    }));
  }

  function handleStartAssign(row) {
    setEditing(e => ({
      ...e,
      [row.id]: {
        maintenance_party: 'tenant',
        notification_party: 'tenant',
      },
    }));
  }

  function handleSaveEdit(row) {
    const ed = editing[row.id];
    if (!ed) return;
    confirmRow(row.id, {
      maintenance_party: ed.maintenance_party,
      notification_party: ed.notification_party,
      finding_type: 'allocated',
    });
    setEditing(e => {
      const next = { ...e };
      delete next[row.id];
      return next;
    });
  }

  function handleCancelEdit(rowId) {
    setEditing(e => {
      const next = { ...e };
      delete next[rowId];
      return next;
    });
  }

  async function handleAcceptAll(group) {
    const pending = group.rows.filter(r => !r.confirmed_by && r.finding_type !== 'silent');
    if (pending.length === 0) return;
    const ids = pending.map(r => r.id);
    setSaving(s => {
      const next = { ...s };
      for (const id of ids) next[id] = true;
      return next;
    });

    // Build per-row updates
    let failed = 0;
    for (const row of pending) {
      const ai = row.ai_suggested || {};
      const { error } = await supabase
        .from('location_safeguard_responsibility')
        .update({
          maintenance_party: ai.maintenance_party || row.maintenance_party,
          notification_party: ai.notification_party || row.notification_party,
          finding_type: 'allocated',
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (error) failed++;
    }

    setSaving(s => {
      const next = { ...s };
      for (const id of ids) delete next[id];
      return next;
    });

    if (failed > 0) {
      toast.error(`${failed} finding(s) failed to confirm`);
    } else {
      toast.success(`${pending.length} finding(s) confirmed`);
    }
    await loadData();
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A08C5A]" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="font-['DM_Sans','Inter',sans-serif]">
      <AdminBreadcrumb crumbs={[{ label: 'Lease Queue' }]} />

      <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-1">
        Lease Queue — Responsibility Review
      </h1>
      <p className="text-sm text-[#1E2D4D]/60 mb-6">
        EvidLY reads each uploaded lease, extracts maintenance and notification responsibilities per safeguard, and stages them here for human review. Every finding must be confirmed before it becomes authoritative.
      </p>

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KpiTile label="Leases pending" value={stats.leasesPending} valueColor="navy" />
        <KpiTile label="Findings to review" value={stats.findingsToReview} valueColor="gold" />
        <KpiTile label="Silent findings" value={stats.silentFindings} valueColor="warning" />
        <KpiTile label="Confirmed this month" value={stats.confirmedMonth} valueColor="green" />
      </div>

      {/* ── Search ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1E2D4D]/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search kitchen, lease filename…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#1E2D4D]/10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80 underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Lease cards ─────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No lease findings"
          description={rows.length === 0
            ? 'No leases have been extracted yet. Upload a lease and run the extraction to see findings here.'
            : 'No lease findings match your search.'}
        />
      ) : (
        <div className="space-y-6">
          {filtered.map(group => {
            const loc = locMap[group.location_id];
            const doc = docMap[group.lease_document_id];
            const pendingCount = group.rows.filter(r => !r.confirmed_by).length;
            const confirmedCount = group.rows.filter(r => r.confirmed_by).length;
            const totalCount = group.rows.length;
            const pendingNonSilent = group.rows.filter(r => !r.confirmed_by && r.finding_type !== 'silent').length;

            return (
              <div key={`${group.location_id}::${group.lease_document_id}`}
                className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">

                {/* Card header */}
                <div className="px-5 py-4 border-b border-[#1E2D4D]/10 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[#1E2D4D]">
                      {loc?.name || 'Unknown kitchen'}
                    </h2>
                    <p className="text-xs text-[#1E2D4D]/50 mt-0.5">
                      {doc?.name || 'Unknown lease'} &middot; Read {fmtDate(doc?.created_at)}
                      &middot; {confirmedCount} of {totalCount} confirmed
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {pendingCount > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: '#FBF3E0', color: '#9A7B2D' }}>
                        {pendingCount} need review
                      </span>
                    )}
                    {pendingNonSilent > 0 && (
                      <button
                        onClick={() => handleAcceptAll(group)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-[#0F766E]/30 text-[#0F766E] hover:bg-[#E8F2F1] transition-colors"
                      >
                        <CheckCheck size={13} />
                        Accept all suggestions
                      </button>
                    )}
                  </div>
                </div>

                {/* Safeguard table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#FAF7F0] border-b border-[#1E2D4D]/10">
                      <th className="text-left px-5 py-2.5 font-semibold text-[#1E2D4D]/80 w-[180px]">Safeguard</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#1E2D4D]/80">AI Suggested</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#1E2D4D]/80 w-[100px]">Confidence</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#1E2D4D]/80 w-[100px]">Status</th>
                      <th className="text-right px-5 py-2.5 font-semibold text-[#1E2D4D]/80 w-[200px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map(row => {
                      const st = stMap[row.service_type_code];
                      const ai = row.ai_suggested || {};
                      const isConfirmed = !!row.confirmed_by;
                      const isSilent = row.finding_type === 'silent';
                      const isEditing = !!editing[row.id];
                      const isSaving = !!saving[row.id];
                      const findingColor = FINDING_COLORS[row.finding_type] || FINDING_COLORS.allocated;

                      return (
                        <tr key={row.id} className="border-b border-[#1E2D4D]/5 last:border-b-0">
                          {/* Safeguard name + citation */}
                          <td className="px-5 py-3">
                            <div className="font-medium text-[#1E2D4D]">
                              {st?.short_name || st?.name || row.service_type_code}
                            </div>
                            <div className="text-[10px] text-[#1E2D4D]/40 mt-0.5">
                              {st?.nfpa_citation || ''}
                            </div>
                          </td>

                          {/* AI suggested parties */}
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <div className="flex items-center gap-3">
                                <label className="text-xs text-[#1E2D4D]/60">
                                  Maint:
                                  <select
                                    value={editing[row.id].maintenance_party}
                                    onChange={e => setEditing(ed => ({
                                      ...ed,
                                      [row.id]: { ...ed[row.id], maintenance_party: e.target.value },
                                    }))}
                                    className="ml-1 text-xs border border-[#1E2D4D]/15 rounded px-1.5 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#A08C5A]"
                                  >
                                    {PARTY_OPTIONS.map(p => (
                                      <option key={p} value={p}>{capitalize(p)}</option>
                                    ))}
                                  </select>
                                </label>
                                <label className="text-xs text-[#1E2D4D]/60">
                                  Notif:
                                  <select
                                    value={editing[row.id].notification_party}
                                    onChange={e => setEditing(ed => ({
                                      ...ed,
                                      [row.id]: { ...ed[row.id], notification_party: e.target.value },
                                    }))}
                                    className="ml-1 text-xs border border-[#1E2D4D]/15 rounded px-1.5 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#A08C5A]"
                                  >
                                    {PARTY_OPTIONS.map(p => (
                                      <option key={p} value={p}>{capitalize(p)}</option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            ) : isSilent && !isConfirmed ? (
                              <div className="flex items-center gap-1.5 text-[#9A7B2D]">
                                <AlertTriangle size={13} />
                                <span className="text-xs font-medium">Lease silent — no responsibility stated</span>
                              </div>
                            ) : (
                              <div>
                                <div className="text-[#1E2D4D]">
                                  <span className="text-[#1E2D4D]/50 text-xs">Maint:</span>{' '}
                                  <span className="font-medium">{capitalize(isConfirmed ? row.maintenance_party : (ai.maintenance_party || row.maintenance_party))}</span>
                                  <span className="mx-2 text-[#1E2D4D]/20">|</span>
                                  <span className="text-[#1E2D4D]/50 text-xs">Notif:</span>{' '}
                                  <span className="font-medium">{capitalize(isConfirmed ? row.notification_party : (ai.notification_party || row.notification_party))}</span>
                                </div>
                                {(ai.source_reference || row.source_reference) && (
                                  <div className="text-[10px] text-[#1E2D4D]/40 mt-0.5">
                                    {ai.source_reference || row.source_reference}
                                    {ai.reasoning && <span className="ml-1">— {ai.reasoning}</span>}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Confidence */}
                          <td className="px-4 py-3">
                            {ai.confidence != null ? (
                              <span className="text-xs font-semibold text-[#1E2D4D]/70">
                                {Math.round(ai.confidence * 100)}%
                              </span>
                            ) : (
                              <span className="text-[#1E2D4D]/20 text-xs">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            {isConfirmed ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ background: '#E8F2F1', color: '#0F766E' }}>
                                Confirmed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ background: findingColor.bg, color: findingColor.fg }}>
                                {capitalize(row.finding_type)}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3 text-right">
                            {isSaving ? (
                              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-[#A08C5A]" />
                            ) : isConfirmed ? (
                              <span className="text-[10px] text-[#1E2D4D]/40">
                                by {row.confirmed_by === user?.id ? 'you' : row.confirmed_by?.slice(0, 8)}
                                {' '}&middot; {fmtDate(row.confirmed_at)}
                              </span>
                            ) : isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleSaveEdit(row)}
                                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#0F766E] text-white hover:bg-[#0F766E]/90 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => handleCancelEdit(row.id)}
                                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[#1E2D4D]/15 text-[#1E2D4D]/60 hover:bg-[#FAF7F0] transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : isSilent ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleConfirmSilent(row)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-[#9A7B2D]/30 text-[#9A7B2D] hover:bg-[#FBF3E0] transition-colors"
                                >
                                  <Check size={11} />
                                  Confirm silent
                                </button>
                                <button
                                  onClick={() => handleStartAssign(row)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-[#1E2D4D]/15 text-[#1E2D4D]/60 hover:bg-[#FAF7F0] transition-colors"
                                >
                                  <Edit3 size={11} />
                                  Assign
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleAccept(row)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-[#0F766E]/30 text-[#0F766E] hover:bg-[#E8F2F1] transition-colors"
                                >
                                  <Check size={11} />
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleStartCorrect(row)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-[#1E2D4D]/15 text-[#1E2D4D]/60 hover:bg-[#FAF7F0] transition-colors"
                                >
                                  <Edit3 size={11} />
                                  Correct
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
