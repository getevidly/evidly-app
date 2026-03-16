import React, { useState } from 'react';
import { Kanban, Plus, Filter, DollarSign, Users, TrendingUp, Clock } from 'lucide-react';
import { usePipelineLeads, usePipelineStats } from '@/hooks/api/useLeads';

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiating', 'Won', 'Lost'] as const;
type Stage = typeof STAGES[number];

const STAGE_COLORS: Record<Stage, string> = {
  New: 'border-t-blue-400',
  Contacted: 'border-t-indigo-400',
  Qualified: 'border-t-purple-400',
  'Proposal Sent': 'border-t-amber-400',
  Negotiating: 'border-t-orange-400',
  Won: 'border-t-green-500',
  Lost: 'border-t-red-400',
};

export function SalesPipelinePage() {
  const { data: leads, isLoading } = usePipelineLeads();
  const { data: stats } = usePipelineStats();
  const [sourceFilter, setSourceFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const fmtCurrency = (v: number) => '$' + v.toLocaleString();

  const filteredLeads = (leads ?? []).filter((l: any) => {
    if (sourceFilter && l.source !== sourceFilter) return false;
    if (assignedFilter && l.assignedTo !== assignedFilter) return false;
    return true;
  });

  const getStageLeads = (stage: Stage) => filteredLeads.filter((l: any) => l.stage === stage);
  const getStageValue = (stage: Stage) => getStageLeads(stage).reduce((sum: number, l: any) => sum + (l.estimatedValue ?? 0), 0);

  if (!isLoading && (!leads || leads.length === 0)) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0B1628]">Sales Pipeline</h1>
          <button className="flex items-center gap-2 bg-[#1e4d6b] text-white px-4 py-2 rounded-lg hover:bg-[#163a52]"><Plus className="h-4 w-4" /> New Lead</button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Kanban className="h-12 w-12 text-[#6B7F96] mb-4" />
          <h3 className="text-lg font-semibold text-[#0B1628] mb-2">No Leads Yet</h3>
          <p className="text-[#6B7F96] max-w-md">No leads in the pipeline yet. Create your first lead to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B1628]">Sales Pipeline</h1>
        <button className="flex items-center gap-2 bg-[#1e4d6b] text-white px-4 py-2 rounded-lg hover:bg-[#163a52]"><Plus className="h-4 w-4" /> New Lead</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Total Pipeline Value</p>
          <p className="text-2xl font-bold text-[#0B1628]">{fmtCurrency(stats?.totalPipelineValue ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Leads This Month</p>
          <p className="text-2xl font-bold text-[#0B1628]">{stats?.leadsThisMonth ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Conversion Rate</p>
          <p className="text-2xl font-bold text-[#0B1628]">{(stats?.conversionRate ?? 0) + "%"}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Avg Days to Close</p>
          <p className="text-2xl font-bold text-[#0B1628]">{stats?.avgDaysToClose ?? 0}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Filter className="h-4 w-4 text-[#6B7F96]" />
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="border border-[#D1D9E6] rounded-lg px-3 py-1.5 text-sm text-[#3D5068]">
          <option value="">All Sources</option>
          <option value="referral">Referral</option>
          <option value="cold_call">Cold Call</option>
          <option value="website">Website</option>
          <option value="door_knock">Door Knock</option>
        </select>
        <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} className="border border-[#D1D9E6] rounded-lg px-3 py-1.5 text-sm text-[#3D5068]">
          <option value="">All Reps</option>
        </select>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div key={stage} className={"min-w-[280px] bg-white rounded-xl border border-[#D1D9E6] border-t-4 " + STAGE_COLORS[stage]}>
            <div className="p-3 border-b border-[#D1D9E6]">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#0B1628] text-sm">{stage}</h3>
                <span className="text-xs text-[#6B7F96]">{getStageLeads(stage).length}</span>
              </div>
              <p className="text-xs text-[#6B7F96] mt-1">{fmtCurrency(getStageValue(stage))}</p>
            </div>
            <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
              {getStageLeads(stage).map((lead: any) => (
                <div key={lead.id} className="p-3 bg-[#F4F6FA] rounded-lg border border-[#D1D9E6] hover:shadow-sm cursor-pointer">
                  <p className="text-sm font-medium text-[#0B1628]">{lead.businessName}</p>
                  <p className="text-xs text-[#6B7F96]">{lead.contactName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-medium text-[#1e4d6b]">{fmtCurrency(lead.estimatedValue ?? 0)}</span>
                    <span className="text-xs text-[#6B7F96]">{lead.daysInStage ?? 0}d</span>
                  </div>
                  {lead.source && <span className="inline-block mt-1 text-xs bg-[#1e4d6b]/10 text-[#1e4d6b] px-2 py-0.5 rounded-full">{lead.source}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SalesPipelinePage;