import { TrendingUp } from 'lucide-react';
import { useTrendAnalytics } from '../hooks/useTrendAnalytics';
import { PeriodSelector } from '../components/trends/PeriodSelector';
import { TrendSummaryCard } from '../components/trends/TrendSummaryCard';
import { OverallTrendChart } from '../components/trends/OverallTrendChart';
import { CategoryTrendCard } from '../components/trends/CategoryTrendCard';
import { LocationComparisonChart } from '../components/trends/LocationComparisonChart';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { useDemo } from '../contexts/DemoContext';

const CATEGORY_CONFIGS = [
  { key: 'tempCompliance' as const, label: 'Temperature Compliance', color: '#ef4444', unit: '%' },
  { key: 'checklistCompletion' as const, label: 'Checklist Completion', color: '#3b82f6', unit: '%' },
  { key: 'haccpMonitoring' as const, label: 'HACCP Monitoring', color: '#8b5cf6', unit: '%' },
  { key: 'incidentResolution' as const, label: 'Incident Resolution', color: '#f59e0b', unit: 'h', invertDirection: true },
  { key: 'documentCurrency' as const, label: 'Document Currency', color: '#06b6d4', unit: '%' },
  { key: 'facilitySafetyOps' as const, label: 'Facility Safety Ops', color: '#d4af37', unit: '%' },
] as const;

export function ComplianceTrends() {
  useDemoGuard();
  const { isDemoMode } = useDemo();
  const {
    period,
    setPeriod,
    availablePeriods,
    orgTrend,
    categoryTrends,
    chartData,
    locationChartData,
    loading,
  } = useTrendAnalytics(isDemoMode);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#1e4d6b' }}
          >
            <TrendingUp className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Compliance Trends</h1>
            <p className="text-sm text-gray-500">
              Track compliance trajectory across locations and categories
            </p>
          </div>
        </div>
        <PeriodSelector
          periods={availablePeriods}
          selected={period}
          onChange={setPeriod}
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-gray-300 border-t-[#1e4d6b] rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state — no data for the selected period */}
      {!loading && chartData.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center">
          <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No compliance data for this period</p>
          <p className="text-xs text-gray-500 mt-1">
            Score snapshots will appear here as compliance data is recorded.
          </p>
        </div>
      )}

      {/* Main content — only render when data exists */}
      {!loading && chartData.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TrendSummaryCard label="Food Safety" analysis={orgTrend.foodSafety} color="#22c55e" />
            <TrendSummaryCard label="Facility Safety" analysis={orgTrend.facilitySafety} color="#d4af37" />
          </div>

          {/* Overall Trend Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Compliance Score Trajectory</h3>
            <p className="text-sm text-gray-500 mb-4">
              Overall, Food Safety, and Facility Safety scores over the selected period
            </p>
            <OverallTrendChart data={chartData} />
          </div>

          {/* Category Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Category Breakdown</h3>
            <p className="text-sm text-gray-500 mb-4">
              Per-category trend analysis — click to expand for details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CATEGORY_CONFIGS.map(({ key, label, color, unit, invertDirection }) => (
                <CategoryTrendCard
                  key={key}
                  label={label}
                  analysis={categoryTrends[key]}
                  sparklineData={chartData.map((d) => d[key] as number)}
                  color={color}
                  unit={unit}
                  invertDirection={invertDirection}
                />
              ))}
            </div>
          </div>

          {/* Location Comparison */}
          <LocationComparisonChart locationData={locationChartData} />
        </>
      )}
    </div>
  );
}
