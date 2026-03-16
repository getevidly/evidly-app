import React from 'react';
import { DollarSign, Target, UserPlus, TrendingUp, BarChart3, Clock, AlertTriangle, Briefcase } from 'lucide-react';
import { usePipelineStats, useRecentActivity, useTopLeads, useOverdueFollowups } from '@/hooks/api/useLeads';

export function SalesDashboardPage() {
  const { data: stats, isLoading: statsLoading } = usePipelineStats();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity();
  const { data: topLeads, isLoading: leadsLoading } = useTopLeads();
  const { data: overdueFollowups, isLoading: overdueLoading } = useOverdueFollowups();
  const hasData = stats && (stats.revenueThisMonth > 0 || stats.newLeads > 0);
  const fmtCurrency = (v: number) => '$' + v.toLocaleString();

  if (!hasData && !statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0B1628]">Sales Dashboard</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="h-12 w-12 text-[#6B7F96] mb-4" />
          <h3 className="text-lg font-semibold text-[#0B1628] mb-2">Welcome to Sales</h3>
          <p className="text-[#6B7F96] max-w-md">Start adding leads to track your pipeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B1628]">Sales Dashboard</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <div className="flex justify-center mb-2"><DollarSign className="h-5 w-5 text-[#1e4d6b]" /></div>
          <p className="text-sm text-[#6B7F96]">Revenue This Month</p>
          <p className="text-2xl font-bold text-[#0B1628]">{statsLoading ? "--" : fmtCurrency(stats?.revenueThisMonth ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <div className="flex justify-center mb-2"><Target className="h-5 w-5 text-[#1e4d6b]" /></div>
          <p className="text-sm text-[#6B7F96]">Goal Progress</p>
          <p className="text-2xl font-bold text-[#0B1628]">{statsLoading ? "--" : (stats?.goalProgress ?? 0) + "%"}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <div className="flex justify-center mb-2"><UserPlus className="h-5 w-5 text-[#1e4d6b]" /></div>
          <p className="text-sm text-[#6B7F96]">New Leads</p>
          <p className="text-2xl font-bold text-[#0B1628]">{statsLoading ? "--" : (stats?.newLeads ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <div className="flex justify-center mb-2"><TrendingUp className="h-5 w-5 text-[#1e4d6b]" /></div>
          <p className="text-sm text-[#6B7F96]">Conversion Rate</p>
          <p className="text-2xl font-bold text-[#0B1628]">{statsLoading ? "--" : (stats?.conversionRate ?? 0) + "%"}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
          <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[#1e4d6b]" /> Pipeline Summary</h2>
          {statsLoading ? (<p className="text-[#6B7F96]">Loading...</p>) : (
            <div className="space-y-3">{(stats?.pipelineSummary ?? []).map((stage: { name: string; count: number; value: number }) => (
              <div key={stage.name} className="flex items-center justify-between">
                <span className="text-sm text-[#3D5068]">{stage.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#0B1628]">{stage.count} leads</span>
                  <span className="text-sm text-[#6B7F96]">{fmtCurrency(stage.value)}</span>
                </div>
              </div>
            ))}</div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
          <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5 text-[#1e4d6b]" /> Revenue by Source</h2>
          {statsLoading ? (<p className="text-[#6B7F96]">Loading...</p>) : (
            <div className="space-y-3">{(stats?.revenueBySource ?? []).map((src: { name: string; value: number }) => (
              <div key={src.name} className="flex items-center justify-between">
                <span className="text-sm text-[#3D5068]">{src.name}</span>
                <span className="text-sm font-medium text-[#0B1628]">{fmtCurrency(src.value)}</span>
              </div>
            ))}</div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
          <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-[#1e4d6b]" /> Recent Activity</h2>
          {activityLoading ? (<p className="text-[#6B7F96]">Loading...</p>) : (recentActivity ?? []).length === 0 ? (
            <p className="text-[#6B7F96] text-sm">No recent activity.</p>
          ) : (<div className="space-y-3">{(recentActivity ?? []).map((act: { id: string; description: string; timestamp: string }) => (
              <div key={act.id} className="flex items-start gap-3 py-2 border-b border-[#D1D9E6] last:border-0">
                <div className="w-2 h-2 rounded-full bg-[#1e4d6b] mt-2 flex-shrink-0" />
                <div><p className="text-sm text-[#0B1628]">{act.description}</p><p className="text-xs text-[#6B7F96]">{act.timestamp}</p></div>
              </div>))}</div>)}
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
          <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-[#1e4d6b]" /> Top Leads</h2>
          {leadsLoading ? (<p className="text-[#6B7F96]">Loading...</p>) : (topLeads ?? []).length === 0 ? (
            <p className="text-[#6B7F96] text-sm">No leads yet.</p>
          ) : (<div className="space-y-3">{(topLeads ?? []).map((lead: { id: string; businessName: string; contactName: string; estimatedValue: number }) => (
              <div key={lead.id} className="flex items-center justify-between py-2 border-b border-[#D1D9E6] last:border-0">
                <div><p className="text-sm font-medium text-[#0B1628]">{lead.businessName}</p><p className="text-xs text-[#6B7F96]">{lead.contactName}</p></div>
                <span className="text-sm font-semibold text-[#1e4d6b]">{fmtCurrency(lead.estimatedValue)}</span>
              </div>))}</div>)}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Overdue Followups</h2>
        {overdueLoading ? (<p className="text-[#6B7F96]">Loading...</p>) : (overdueFollowups ?? []).length === 0 ? (
          <p className="text-[#6B7F96] text-sm">No overdue followups. You are all caught up!</p>
        ) : (<div className="space-y-3">{(overdueFollowups ?? []).map((item: { id: string; businessName: string; dueDate: string; daysOverdue: number }) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-[#D1D9E6] last:border-0">
              <div><p className="text-sm font-medium text-[#0B1628]">{item.businessName}</p><p className="text-xs text-[#6B7F96]">Due: {item.dueDate}</p></div>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">{item.daysOverdue}d overdue</span>
            </div>))}</div>)}
      </div>
    </div>
  );
}

export default SalesDashboardPage;