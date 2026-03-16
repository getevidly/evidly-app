import React from 'react';
import { BarChart3, TrendingUp, Target, DollarSign, Clock, LineChart } from 'lucide-react';
import { usePipelineStats, useSalesAnalytics } from '@/hooks/api/useLeads';

export function SalesAnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = usePipelineStats();
  const { data: analytics, isLoading: analyticsLoading } = useSalesAnalytics();
  const fmtCurrency = (v: number) => '$' + v.toLocaleString();

  const isLoading = statsLoading || analyticsLoading;
  const hasData = stats && analytics;

  if (!hasData && !isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0B1628]">Sales Analytics</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-12 w-12 text-[#6B7F96] mb-4" />
          <h3 className="text-lg font-semibold text-[#0B1628] mb-2">No Analytics Data</h3>
          <p className="text-[#6B7F96] max-w-md">Not enough data for analytics yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B1628]">Sales Analytics</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Total Revenue</p>
          <p className="text-2xl font-bold text-[#0B1628]">{isLoading ? "--" : fmtCurrency(stats?.totalRevenue ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Win Rate</p>
          <p className="text-2xl font-bold text-[#0B1628]">{isLoading ? "--" : (analytics?.winRate ?? 0) + "%"}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Avg Deal Size</p>
          <p className="text-2xl font-bold text-[#0B1628]">{isLoading ? "--" : fmtCurrency(analytics?.avgDealSize ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
          <p className="text-sm text-[#6B7F96]">Sales Cycle</p>
          <p className="text-2xl font-bold text-[#0B1628]">{isLoading ? "--" : (analytics?.avgSalesCycle ?? 0) + " days"}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
          <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[#1e4d6b]" /> Revenue by Month</h2>
          <div className="h-48 bg-[#F4F6FA] rounded-lg flex items-center justify-center border border-dashed border-[#D1D9E6]">
            <p className="text-sm text-[#6B7F96]">Bar chart placeholder</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
          <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-[#1e4d6b]" /> Pipeline Value Trend</h2>
          <div className="h-48 bg-[#F4F6FA] rounded-lg flex items-center justify-center border border-dashed border-[#D1D9E6]">
            <p className="text-sm text-[#6B7F96]">Trend line placeholder</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
          <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-[#1e4d6b]" /> Win / Loss Rate</h2>
          <div className="h-48 bg-[#F4F6FA] rounded-lg flex items-center justify-center border border-dashed border-[#D1D9E6]">
            <p className="text-sm text-[#6B7F96]">Win/loss chart placeholder</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
          <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5 text-[#1e4d6b]" /> Average Deal Size</h2>
          <div className="h-48 bg-[#F4F6FA] rounded-lg flex items-center justify-center border border-dashed border-[#D1D9E6]">
            <p className="text-sm text-[#6B7F96]">Deal size chart placeholder</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
          <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-[#1e4d6b]" /> Sales Cycle Length</h2>
          <div className="h-48 bg-[#F4F6FA] rounded-lg flex items-center justify-center border border-dashed border-[#D1D9E6]">
            <p className="text-sm text-[#6B7F96]">Cycle length chart placeholder</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
          <h2 className="text-lg font-semibold text-[#0B1628] mb-4 flex items-center gap-2"><LineChart className="h-5 w-5 text-[#1e4d6b]" /> Revenue Forecast</h2>
          <div className="h-48 bg-[#F4F6FA] rounded-lg flex items-center justify-center border border-dashed border-[#D1D9E6]">
            <p className="text-sm text-[#6B7F96]">Forecast chart placeholder</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesAnalyticsPage;