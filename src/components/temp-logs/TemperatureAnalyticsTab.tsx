import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Download, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import { TemperatureAnalyticsDateSelector } from './TemperatureAnalyticsDateSelector';
import { TemperatureAIPatternInsights } from './TemperatureAIPatternInsights';
import { useTemperatureAnalyticsStats, type TrendDirection } from '../../hooks/temperatures/useTemperatureAnalyticsStats';
import { useTemperaturePatternAnalysis } from '../../hooks/temperatures/useTemperaturePatternAnalysis';
import { useTemperatureAnalyticsCharts } from '../../hooks/temperatures/useTemperatureAnalyticsCharts';
import type { TempCheckCompletion, TemperatureEquipment } from '../../pages/TempLogs';

interface TemperatureAnalyticsTabProps {
  history: TempCheckCompletion[];
  equipment: TemperatureEquipment[];
  isDemoMode: boolean;
  guardAction: (action: string, feature: string, cb: () => void) => void;
}

const TREND_ICONS: Record<string, { arrow: string; color: string }> = {
  up: { arrow: '\u2191', color: '#2f7a4d' },
  down: { arrow: '\u2193', color: '#DC2626' },
  flat: { arrow: '\u2014', color: '#6B7F96' },
};

function TrendIndicator({ trend, invertColor }: { trend: TrendDirection; invertColor?: boolean }) {
  if (trend === 'no_comparison') {
    return (
      <span className="text-[9px] italic ml-1" style={{ color: '#8A93A6' }}>
        first period
      </span>
    );
  }
  const cfg = TREND_ICONS[trend];
  let color = cfg.color;
  if (invertColor) {
    if (trend === 'up') color = '#DC2626';
    else if (trend === 'down') color = '#2f7a4d';
  }
  return (
    <span className="text-xs font-bold ml-1" style={{ color }}>
      {cfg.arrow}
    </span>
  );
}

export function TemperatureAnalyticsTab({
  history,
  equipment,
  isDemoMode,
  guardAction,
}: TemperatureAnalyticsTabProps) {
  const [windowDays, setWindowDays] = useState(30);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const stats = useTemperatureAnalyticsStats(history, equipment, windowDays);
  const analysis = useTemperaturePatternAnalysis(windowDays, isDemoMode);
  const charts = useTemperatureAnalyticsCharts(history, equipment, windowDays);

  // Close export dropdown on outside click
  const handleExportBlur = () => {
    setTimeout(() => {
      if (exportRef.current && !exportRef.current.contains(document.activeElement)) {
        setExportOpen(false);
      }
    }, 150);
  };

  const exportCSV = () => {
    const now = new Date();
    const windowStart = windowDays === 0
      ? new Date(0)
      : new Date(now.getTime() - windowDays * 86_400_000);

    const filtered = history.filter(h => new Date(h.created_at) >= windowStart);
    const headers = ['Date & Time', 'Equipment', 'Temperature', 'Status', 'Method', 'Shift', 'Recorded By'];
    const rows = filtered.map(log => [
      format(new Date(log.created_at), 'MMM d, yyyy h:mm a'),
      log.equipment_name,
      `${log.temperature_value}\u00b0F`,
      log.is_within_range ? 'Pass' : 'Fail',
      log.input_method || 'manual',
      log.shift || '',
      log.recorded_by_name,
    ]);

    const escape = (v: string) => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    const csv = [headers.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `temperature-analytics-${format(now, 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const complianceColor = stats.complianceRate >= 95 ? '#2f7a4d'
    : stats.complianceRate >= 90 ? '#c2731a'
    : '#DC2626';

  return (
    <div className="space-y-4">
      {/* Top bar: date selector + export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <TemperatureAnalyticsDateSelector value={windowDays} onChange={setWindowDays} />

        <div className="relative" ref={exportRef} onBlur={handleExportBlur}>
          <button
            type="button"
            onClick={() => setExportOpen(!exportOpen)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
          >
            <Download className="w-4 h-4" />
            Export Analytics
            <ChevronDown className="w-3 h-3" />
          </button>
          {exportOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-52 rounded-lg shadow-lg border overflow-hidden z-20"
              style={{ backgroundColor: '#fff', borderColor: '#E2DDD4' }}
            >
              <button
                type="button"
                onClick={() => guardAction('export', 'analytics CSV', exportCSV)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#FAF7F0] transition-colors"
                style={{ color: '#1E2D4D' }}
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => { toast.info('PDF export coming soon.'); setExportOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#FAF7F0] transition-colors"
                style={{ color: '#1E2D4D' }}
              >
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => { toast.info('Inspection packet generation coming soon.'); setExportOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#FAF7F0] transition-colors"
                style={{ color: '#1E2D4D' }}
              >
                Add to Inspection Packet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5 Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#E2DDD4', borderTopWidth: 3, borderTopColor: '#1E2D4D' }}>
          <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: '#8A93A6' }}>Total Readings</p>
          <div className="flex items-baseline mt-1">
            <p className="text-2xl font-bold" style={{ color: '#1E2D4D' }}>{stats.totalReadings.toLocaleString()}</p>
            <TrendIndicator trend={stats.totalReadingsTrend} />
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#E2DDD4', borderTopWidth: 3, borderTopColor: complianceColor }}>
          <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: '#8A93A6' }}>Compliance Rate</p>
          <div className="flex items-baseline mt-1">
            <p className="text-2xl font-bold" style={{ color: complianceColor }}>
              {stats.totalReadings > 0 ? `${stats.complianceRate}%` : '\u2014'}
            </p>
            {stats.totalReadings > 0 && <TrendIndicator trend={stats.complianceRateTrend} />}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#E2DDD4', borderTopWidth: 3, borderTopColor: '#6B7F96' }}>
          <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: '#8A93A6' }}>Manual</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#1E2D4D' }}>{stats.manualCount}</p>
          <p className="text-[10px]" style={{ color: '#6B7F96' }}>{stats.manualPct}% of total</p>
        </div>

        <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#E2DDD4', borderTopWidth: 3, borderTopColor: '#059669' }}>
          <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: '#8A93A6' }}>Sensor</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#059669' }}>{stats.sensorCount}</p>
          <p className="text-[10px]" style={{ color: '#6B7F96' }}>{stats.sensorPct}% of total</p>
        </div>

        <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#E2DDD4', borderTopWidth: 3, borderTopColor: stats.gapCount > 0 ? '#c2731a' : '#2f7a4d' }}>
          <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: '#8A93A6' }}>Coverage Gaps</p>
          <div className="flex items-baseline mt-1">
            <p className="text-2xl font-bold" style={{ color: stats.gapCount > 0 ? '#c2731a' : '#2f7a4d' }}>{stats.gapCount}</p>
            <TrendIndicator trend={stats.gapCountTrend} invertColor />
          </div>
        </div>
      </div>

      {/* AI Pattern Insights */}
      <TemperatureAIPatternInsights analysis={analysis} windowDays={windowDays} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Method Breakdown */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
          <h3 className="text-sm font-semibold text-[#1E2D4D] mb-4">Input Method Breakdown</h3>
          {charts.methodSingleMethod ? (
            <div
              className="rounded-lg px-4 py-6 text-center text-xs leading-relaxed"
              style={{ backgroundColor: '#FAF7F0', color: '#6B7F96' }}
            >
              All {stats.totalReadings} readings via <span className="font-semibold" style={{ color: '#1E2D4D' }}>{charts.methodSingleMethod}</span>.
              Connect a sensor to see breakdown.
            </div>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.methodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {charts.methodData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {charts.methodData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Weekly Compliance Trend */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
          <h3 className="text-sm font-semibold text-[#1E2D4D] mb-4">Compliance Rate by Week</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <ReferenceLine y={95} stroke="#A08C5A" strokeDasharray="5 5" label={{ value: 'Target 95%', fill: '#A08C5A', fontSize: 10 }} />
                <Line type="monotone" dataKey="rate" stroke="#1E2D4D" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Equipment Compliance */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
          <h3 className="text-sm font-semibold text-[#1E2D4D] mb-4">Equipment Compliance</h3>
          {charts.equipmentInsufficient ? (
            <div
              className="rounded-lg px-4 py-6 text-center text-xs leading-relaxed"
              style={{ backgroundColor: '#FAF7F0', color: '#6B7F96' }}
            >
              Need readings across at least 2 units to compare. Currently: {charts.equipmentData.length} unit{charts.equipmentData.length !== 1 ? 's' : ''} logged.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.equipmentData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <ReferenceLine y={100} stroke="#DC2626" strokeDasharray="3 3" />
                  {charts.equipmentData.map((entry, i) => (
                    <Bar
                      key={i}
                      dataKey="rate"
                      fill={entry.rate >= 90 ? '#2f7a4d' : '#c2731a'}
                      radius={[4, 4, 0, 0]}
                    />
                  )).slice(0, 1)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Time of Day Distribution */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
          <h3 className="text-sm font-semibold text-[#1E2D4D] mb-4">Time of Day Distribution</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.timeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#A08C5A" opacity={0.7} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
