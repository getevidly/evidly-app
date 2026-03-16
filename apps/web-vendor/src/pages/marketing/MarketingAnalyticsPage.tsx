import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Megaphone,
  LineChart,
} from 'lucide-react';
import { useMarketingAnalytics } from '@/hooks/api/useMarketing';

export function MarketingAnalyticsPage() {
  const { data, isLoading, error } = useMarketingAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart3 className="h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-[#0B1628] mb-2">Failed to load analytics</h3>
        <p className="text-[#6B7F96] max-w-md">Something went wrong. Please try again later.</p>
      </div>
    );
  }

  const stats = data?.stats ?? {
    totalLeads: 0,
    totalSpend: 0,
    avgCostPerLead: 0,
    overallConversion: 0,
    leadsChange: 0,
    spendChange: 0,
    costChange: 0,
    conversionChange: 0,
  };

  const statCards = [
    {
      label: 'Total Leads',
      value: stats.totalLeads.toLocaleString(),
      change: stats.leadsChange,
      icon: Users,
      color: 'text-[#1e4d6b]',
    },
    {
      label: 'Total Spend',
      value: `$${stats.totalSpend.toLocaleString()}`,
      change: stats.spendChange,
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      label: 'Avg Cost per Lead',
      value: `$${stats.avgCostPerLead.toFixed(2)}`,
      change: stats.costChange,
      icon: Target,
      color: 'text-purple-600',
      invertChange: true,
    },
    {
      label: 'Overall Conversion',
      value: `${stats.overallConversion}%`,
      change: stats.conversionChange,
      icon: TrendingUp,
      color: 'text-blue-600',
    },
  ];

  const chartCards = [
    { title: 'Lead Source Breakdown', description: 'Where your leads are coming from', icon: PieChart, color: 'text-[#1e4d6b]' },
    { title: 'Cost per Lead', description: 'Acquisition cost trends over time', icon: DollarSign, color: 'text-green-600' },
    { title: 'Conversion Rate', description: 'Lead-to-customer conversion over time', icon: TrendingUp, color: 'text-blue-600' },
    { title: 'Campaign ROI', description: 'Return on investment by campaign', icon: BarChart3, color: 'text-purple-600' },
    { title: 'Best Campaigns', description: 'Top performing campaigns by leads generated', icon: Megaphone, color: 'text-amber-600' },
    { title: 'Monthly Trends', description: 'Leads, spend, and conversions month over month', icon: LineChart, color: 'text-cyan-600' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0B1628]">Marketing Analytics</h1>
        <p className="text-[#6B7F96] mt-1">Track performance across all marketing channels</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const isPositive = stat.invertChange ? stat.change < 0 : stat.change > 0;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-[#D1D9E6] p-4 text-center">
              <stat.icon className={`h-6 w-6 ${stat.color} mx-auto mb-2`} />
              <p className="text-2xl font-bold text-[#0B1628]">{stat.value}</p>
              <p className="text-sm text-[#6B7F96] mt-1">{stat.label}</p>
              {stat.change !== 0 && (
                <div className={`flex items-center justify-center gap-1 mt-2 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(stat.change)}% vs last month
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chartCards.map((chart) => (
          <div key={chart.title} className="bg-white rounded-xl border border-[#D1D9E6] p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[#F4F6FA]">
                <chart.icon className={`h-5 w-5 ${chart.color}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0B1628]">{chart.title}</h3>
                <p className="text-xs text-[#6B7F96]">{chart.description}</p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center min-h-[200px] bg-[#F4F6FA] rounded-lg border border-dashed border-[#D1D9E6]">
              <div className="text-center">
                <Activity className="h-8 w-8 text-[#D1D9E6] mx-auto mb-2" />
                <p className="text-sm text-[#6B7F96]">Chart visualization</p>
                <p className="text-xs text-[#D1D9E6] mt-1">Connect data to populate</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MarketingAnalyticsPage;
