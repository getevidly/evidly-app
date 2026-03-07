/**
 * Sales Pipeline — Kanban board + table view for prospect-to-close tracking
 * Route: /admin/sales
 * Access: platform_admin / @getevidly.com
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { StatCardRow } from '../../components/admin/StatCardRow';
import { toast } from 'sonner';
import {
  BarChart3, DollarSign, TrendingUp, Target, Users,
  ChevronRight, LayoutGrid, Table2, X, Calendar,
  MessageSquare, Award, AlertTriangle,
} from 'lucide-react';

const NAVY = '#1e4d6b';
const GOLD = '#A08C5A';
const DARK = '#1E2D4D';

const PIPELINE_STAGES = ['prospect', 'tour_scheduled', 'tour_completed', 'proposal_sent', 'negotiating', 'won', 'lost'];
const STAGE_LABELS: Record<string, string> = {
  prospect: 'Prospect', tour_scheduled: 'Tour Scheduled', tour_completed: 'Tour Completed',
  proposal_sent: 'Proposal Sent', negotiating: 'Negotiating', won: 'Won', lost: 'Lost', churned: 'Churned',
};
const STAGE_COLORS: Record<string, string> = {
  prospect: '#6b7280', tour_scheduled: '#3b82f6', tour_completed: '#8b5cf6',
  proposal_sent: '#f59e0b', negotiating: '#ef4444', won: '#16a34a', lost: '#9ca3af',
};

function formatCents(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 });
}
function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SalesPipeline() {
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [selectedDeal, setSelectedDeal] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('sales_pipeline').select('*').order('estimated_mrr_cents', { ascending: false });
    if (data) setPipeline(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Summary metrics
  const openDeals = useMemo(() => pipeline.filter(p => !['won', 'lost', 'churned'].includes(p.stage)), [pipeline]);
  const totalPipelineMRR = openDeals.reduce((sum, p) => sum + (p.estimated_mrr_cents || 0), 0);
  const weightedPipelineMRR = openDeals.reduce((sum, p) => sum + ((p.estimated_mrr_cents || 0) * (p.probability_pct || 0) / 100), 0);

  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const wonMTD = pipeline.filter(p => p.stage === 'won' && p.won_date && new Date(p.won_date).getTime() >= thisMonth);
  const wonMTDmrr = wonMTD.reduce((sum, p) => sum + (p.estimated_mrr_cents || 0), 0);
  const lostMTD = pipeline.filter(p => p.stage === 'lost' && p.lost_date && new Date(p.lost_date).getTime() >= thisMonth).length;

  // Lost reasons breakdown — must be above early return to satisfy Rules of Hooks
  const lostReasons = useMemo(() => {
    const reasons: Record<string, number> = {};
    pipeline.filter(p => p.stage === 'lost' && p.lost_reason).forEach(p => {
      reasons[p.lost_reason] = (reasons[p.lost_reason] || 0) + 1;
    });
    return Object.entries(reasons).sort((a, b) => b[1] - a[1]);
  }, [pipeline]);

  const handleStageChange = async (dealId: string, newStage: string) => {
    const updates: any = { stage: newStage, updated_at: new Date().toISOString() };
    const probMap: Record<string, number> = {
      prospect: 10, tour_scheduled: 20, tour_completed: 35, proposal_sent: 50, negotiating: 70, won: 100, lost: 0,
    };
    if (probMap[newStage] !== undefined) updates.probability_pct = probMap[newStage];
    if (newStage === 'won') updates.won_date = new Date().toISOString().split('T')[0];
    if (newStage === 'lost') updates.lost_date = new Date().toISOString().split('T')[0];

    await supabase.from('sales_pipeline').update(updates).eq('id', dealId);

    // Also update linked demo_session
    const deal = pipeline.find(p => p.id === dealId);
    if (deal?.session_id) {
      const sessUpdates: any = { sales_stage: newStage };
      if (newStage === 'won') sessUpdates.converted_at = new Date().toISOString();
      await supabase.from('demo_sessions').update(sessUpdates).eq('id', deal.session_id);
    }

    toast.success(`Moved to ${STAGE_LABELS[newStage]}`);
    loadData();
  };

  const handleUpdateNotes = async (dealId: string) => {
    const note = prompt('Add/update notes:');
    if (note === null) return;
    await supabase.from('sales_pipeline').update({ notes: note, updated_at: new Date().toISOString() }).eq('id', dealId);
    toast.success('Notes updated');
    loadData();
  };

  const handleSetCloseDate = async (dealId: string) => {
    const date = prompt('Expected close date (YYYY-MM-DD):');
    if (!date) return;
    await supabase.from('sales_pipeline').update({ expected_close_date: date, updated_at: new Date().toISOString() }).eq('id', dealId);
    toast.success('Close date set');
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37]" />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <AdminBreadcrumb crumbs={[{ label: 'Sales Pipeline' }]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E2D4D', margin: 0, fontFamily: 'Outfit, sans-serif' }}>Sales Pipeline</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0 0', fontFamily: 'Inter, sans-serif' }}>Track deals from prospect to close</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('kanban')}
            className={`p-2 rounded-lg border ${viewMode === 'kanban' ? 'border-[#1e4d6b] bg-blue-50' : 'border-gray-200'}`}>
            <LayoutGrid className="h-4 w-4" style={{ color: viewMode === 'kanban' ? NAVY : '#9ca3af' }} />
          </button>
          <button onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg border ${viewMode === 'table' ? 'border-[#1e4d6b] bg-blue-50' : 'border-gray-200'}`}>
            <Table2 className="h-4 w-4" style={{ color: viewMode === 'table' ? NAVY : '#9ca3af' }} />
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ marginBottom: 24 }}>
        <StatCardRow cards={[
          { label: 'TOTAL PIPELINE', value: formatCents(totalPipelineMRR) + ' MRR', valueColor: 'gold' },
          { label: 'WEIGHTED PIPELINE', value: formatCents(Math.round(weightedPipelineMRR)) + ' MRR', valueColor: 'gold' },
          { label: 'WON MTD', value: `${wonMTD.length} deals · ${formatCents(wonMTDmrr)}`, valueColor: 'green' },
          { label: 'LOST MTD', value: `${lostMTD} deals`, valueColor: 'red' },
        ]} />
      </div>

      {viewMode === 'kanban' ? (
        <KanbanView pipeline={pipeline} onStageChange={handleStageChange} onSelect={setSelectedDeal}
          onNotes={handleUpdateNotes} onCloseDate={handleSetCloseDate} />
      ) : (
        <TableView pipeline={pipeline} onStageChange={handleStageChange}
          onNotes={handleUpdateNotes} onCloseDate={handleSetCloseDate} />
      )}

      {/* Win/Loss analysis */}
      {lostReasons.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Lost Reasons</h3>
          <div className="space-y-2">
            {lostReasons.map(([reason, count]) => (
              <div key={reason} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-40 truncate">{reason}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div className="h-full rounded-full bg-red-400" style={{ width: `${count / Math.max(...lostReasons.map(([,c]) => c)) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-700 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deal detail panel */}
      {selectedDeal && (
        <DealPanel deal={selectedDeal} onClose={() => setSelectedDeal(null)}
          onStageChange={handleStageChange} onNotes={handleUpdateNotes} onCloseDate={handleSetCloseDate} onRefresh={loadData} />
      )}
    </div>
  );
}

// ── Kanban View ────────────────────────────────────────────

function KanbanView({ pipeline, onStageChange, onSelect, onNotes, onCloseDate }: {
  pipeline: any[]; onStageChange: (id: string, stage: string) => void;
  onSelect: (deal: any) => void; onNotes: (id: string) => void; onCloseDate: (id: string) => void;
}) {
  const columns = PIPELINE_STAGES;

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
      {columns.map(stage => {
        const deals = pipeline.filter(p => p.stage === stage);
        const stageMRR = deals.reduce((sum, p) => sum + (p.estimated_mrr_cents || 0), 0);
        return (
          <div key={stage} className="min-w-[250px] flex-shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] || '#6b7280' }} />
                <span className="text-xs font-bold text-gray-700 uppercase">{STAGE_LABELS[stage]}</span>
              </div>
              <span className="text-[10px] text-gray-400">{deals.length} · {formatCents(stageMRR)}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-2 min-h-[200px] space-y-2">
              {deals.map(deal => (
                <div key={deal.id} onClick={() => onSelect(deal)}
                  className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="font-semibold text-sm text-gray-900 mb-1">{deal.org_name}</div>
                  <div className="text-xs text-gray-500">{deal.contact_name || '—'}{deal.contact_title ? ` · ${deal.contact_title}` : ''}</div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    {deal.location_count && <span>{deal.location_count} loc</span>}
                    {deal.industry && <span>· {deal.industry}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs font-bold" style={{ color: DARK }}>{formatCents(deal.estimated_mrr_cents || 0)}/mo</span>
                    <span className="text-[10px] text-gray-400">{deal.probability_pct || 0}%</span>
                  </div>
                  {/* Quick stage buttons */}
                  <div className="flex gap-1 mt-2">
                    {stage !== 'won' && stage !== 'lost' && (
                      <>
                        {columns.indexOf(stage) < columns.length - 2 && (
                          <button onClick={e => { e.stopPropagation(); onStageChange(deal.id, columns[columns.indexOf(stage) + 1]); }}
                            className="text-[10px] px-2 py-0.5 border border-gray-200 rounded hover:bg-gray-50 flex items-center gap-0.5">
                            <ChevronRight className="h-3 w-3" /> Next
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {deals.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-8">No deals</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Table View ─────────────────────────────────────────────

function TableView({ pipeline, onStageChange, onNotes, onCloseDate }: {
  pipeline: any[]; onStageChange: (id: string, stage: string) => void;
  onNotes: (id: string) => void; onCloseDate: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-semibold text-gray-700">Company</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-700">Contact</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-700">Segment</th>
              <th className="text-center px-3 py-2 font-semibold text-gray-700">Loc</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-700">Est. MRR</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-700">Stage</th>
              <th className="text-center px-3 py-2 font-semibold text-gray-700">Prob</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-700">Close</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pipeline.map(deal => (
              <tr key={deal.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">{deal.org_name}</td>
                <td className="px-3 py-2 text-gray-600 text-xs">{deal.contact_name || '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-500 capitalize">{deal.segment?.replace(/_/g, ' ') || '—'}</td>
                <td className="px-3 py-2 text-center text-gray-500">{deal.location_count || '—'}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCents(deal.estimated_mrr_cents || 0)}</td>
                <td className="px-3 py-2">
                  <select value={deal.stage} onChange={e => onStageChange(deal.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white">
                    {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-center text-xs text-gray-500">{deal.probability_pct || 0}%</td>
                <td className="px-3 py-2 text-xs text-gray-500">{formatDate(deal.expected_close_date)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onCloseDate(deal.id)} className="p-1 hover:bg-gray-100 rounded" title="Set close date"><Calendar className="h-3.5 w-3.5 text-gray-400" /></button>
                    <button onClick={() => onNotes(deal.id)} className="p-1 hover:bg-gray-100 rounded" title="Notes"><MessageSquare className="h-3.5 w-3.5 text-gray-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {pipeline.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No deals in pipeline. Launch a guided tour to create one.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Deal detail panel ──────────────────────────────────────

function DealPanel({ deal, onClose, onStageChange, onNotes, onCloseDate, onRefresh }: {
  deal: any; onClose: () => void;
  onStageChange: (id: string, stage: string) => void;
  onNotes: (id: string) => void; onCloseDate: (id: string) => void;
  onRefresh: () => void;
}) {
  const handleLostReason = async () => {
    const reason = prompt('Lost reason:');
    if (!reason) return;
    await supabase.from('sales_pipeline').update({
      lost_reason: reason, stage: 'lost', lost_date: new Date().toISOString().split('T')[0],
      probability_pct: 0, updated_at: new Date().toISOString(),
    }).eq('id', deal.id);
    toast.success('Marked as lost');
    onClose();
    onRefresh();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{deal.org_name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="space-y-3 text-sm">
          <Row label="Contact" value={deal.contact_name || '—'} />
          <Row label="Title" value={deal.contact_title || '—'} />
          <Row label="Email" value={deal.contact_email || '—'} />
          <Row label="Segment" value={deal.segment?.replace(/_/g, ' ') || '—'} />
          <Row label="Industry" value={deal.industry || '—'} />
          <Row label="Locations" value={deal.location_count?.toString() || '—'} />
          <Row label="Est. MRR" value={formatCents(deal.estimated_mrr_cents || 0) + '/mo'} />
          <Row label="Probability" value={`${deal.probability_pct || 0}%`} />
          <Row label="Expected Close" value={formatDate(deal.expected_close_date)} />
          <Row label="Assigned To" value={deal.assigned_to || '—'} />
          {deal.notes && <Row label="Notes" value={deal.notes} />}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="block text-xs font-medium text-gray-700 mb-1">Update Stage</label>
          <select value={deal.stage} onChange={e => { onStageChange(deal.id, e.target.value); onClose(); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={() => { onNotes(deal.id); onClose(); }}
            className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Add Notes</button>
          <button onClick={() => { onCloseDate(deal.id); onClose(); }}
            className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Set Close Date</button>
          <button onClick={handleLostReason}
            className="px-3 py-2 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-600 font-medium">Mark Lost</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

// SummaryCard removed — using shared KpiTile
