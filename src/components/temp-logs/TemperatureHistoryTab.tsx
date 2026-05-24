import { useState, Fragment } from 'react';
import { toast } from 'sonner';
import { Thermometer, ChevronDown, ChevronUp, Download, TrendingUp, QrCode, Pencil, Wifi, Camera, Clock, X, FileText } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTranslation } from '../../contexts/LanguageContext';
import { equipmentColors } from '../../data/tempDemoHistory';
import { EmptyState } from '../EmptyState';
import { PhotoGallery } from '../PhotoGallery';
import { Avatar } from '../ui/Avatar';
import { useHistoryPeriodSummary } from '../../hooks/temperatures/useHistoryPeriodSummary';
import { useCoverageGaps } from '../../hooks/temperatures/useCoverageGaps';
import { TemperatureHistoryGapCallout } from './TemperatureHistoryGapCallout';
import { RetroactiveEntryModal } from './RetroactiveEntryModal';
import { isHoldingEquipment, isStorageEquipment } from '../../lib/equipmentHelpers';
import { TEMP_CHECK_INTERVALS } from '../../config/tempConfig';
import type { TempCheckCompletion, TemperatureEquipment, InputMethod } from '../../pages/TempLogs';
import type { PhotoRecord } from '../PhotoEvidence';

// ── Props ─────────────────────────────────────────────────────

export interface RetroactiveSaveData {
  equipmentId: string;
  temperature: number;
  readingMethod: string;
  readingTime: string;
  reason: string;
  correctiveAction: string | null;
}

interface TemperatureHistoryTabProps {
  history: TempCheckCompletion[];
  equipment: TemperatureEquipment[];
  tempPhotos: PhotoRecord[];
  isDemoMode: boolean;
  guardAction: (action: string, feature: string, cb: () => void) => void;
  onHACCPReport: (log: TempCheckCompletion) => void;
  onRetroactiveSave: (data: RetroactiveSaveData) => Promise<boolean>;
}

// ── Helpers ───────────────────────────────────────────────────

function getExpectedIntervalForType(type: string): number | null {
  if (isHoldingEquipment(type)) return TEMP_CHECK_INTERVALS.HOT_HOLDING_OVERDUE_MINUTES;
  if (isStorageEquipment(type)) return TEMP_CHECK_INTERVALS.EQUIPMENT_CHECK_OVERDUE_MINUTES;
  return null;
}

function formatGapDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const CustomDot = (props: any) => {
  const { cx, cy, payload, dataKey } = props;
  const equipmentName = dataKey;
  const inRange = payload[`${equipmentName}_inRange`];

  if (inRange === false) {
    return (
      <circle cx={cx} cy={cy} r={5} fill="red" stroke="darkred" strokeWidth={2} />
    );
  }
  return null;
};

// ── Component ─────────────────────────────────────────────────

export function TemperatureHistoryTab({
  history,
  equipment,
  tempPhotos,
  isDemoMode,
  guardAction,
  onHACCPReport,
  onRetroactiveSave,
}: TemperatureHistoryTabProps) {
  const { t } = useTranslation();

  // Filter / sort state (moved from TempLogs.tsx)
  const [historyDateRange, setHistoryDateRange] = useState('today');
  const [historyEquipment, setHistoryEquipment] = useState('all');
  const [historyStatus, setHistoryStatus] = useState('all');
  const [historyMethod, setHistoryMethod] = useState<'all' | InputMethod>('all');
  const [historyShift, setHistoryShift] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');
  const [historyView, setHistoryView] = useState<'table' | 'chart'>('table');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [historySortField, setHistorySortField] = useState<'created_at' | 'equipment_name' | 'temperature_value' | 'is_within_range'>('created_at');
  const [historySortDirection, setHistorySortDirection] = useState<'asc' | 'desc'>('desc');
  const [showHistoryDetails, setShowHistoryDetails] = useState(false);
  const [showGapsOnly, setShowGapsOnly] = useState(false);
  const [retroModal, setRetroModal] = useState<{ open: boolean; equipmentId: string; gapMidpointISO: string }>({ open: false, equipmentId: '', gapMidpointISO: '' });

  // ── Filtering ──────────────────────────────────────────────

  const getFilteredHistory = () => {
    let filtered = [...history];

    const now = new Date();
    if (historyDateRange === 'today') {
      const todayStart = startOfDay(now);
      filtered = filtered.filter(h => new Date(h.created_at) >= todayStart);
    } else if (historyDateRange === 'yesterday') {
      const yesterdayStart = startOfDay(subDays(now, 1));
      const yesterdayEnd = endOfDay(subDays(now, 1));
      filtered = filtered.filter(h => {
        const date = new Date(h.created_at);
        return date >= yesterdayStart && date <= yesterdayEnd;
      });
    } else if (historyDateRange === 'week') {
      const weekStart = subDays(now, 7);
      filtered = filtered.filter(h => new Date(h.created_at) >= weekStart);
    } else if (historyDateRange === 'month') {
      const monthStart = subDays(now, 30);
      filtered = filtered.filter(h => new Date(h.created_at) >= monthStart);
    } else if (historyDateRange === 'custom' && customDateFrom && customDateTo) {
      const from = new Date(customDateFrom);
      const to = endOfDay(new Date(customDateTo));
      filtered = filtered.filter(h => {
        const date = new Date(h.created_at);
        return date >= from && date <= to;
      });
    }

    if (historyEquipment !== 'all') {
      filtered = filtered.filter(h => h.equipment_id === historyEquipment);
    }
    if (historyStatus !== 'all') {
      const passFilter = historyStatus === 'pass';
      filtered = filtered.filter(h => h.is_within_range === passFilter);
    }
    if (historyMethod !== 'all') {
      filtered = filtered.filter(h => (h.input_method || 'manual') === historyMethod);
    }
    if (historyShift !== 'all') {
      filtered = filtered.filter(h => h.shift === historyShift);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (historySortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'equipment_name':
          comparison = a.equipment_name.localeCompare(b.equipment_name);
          break;
        case 'temperature_value':
          comparison = a.temperature_value - b.temperature_value;
          break;
        case 'is_within_range':
          comparison = (a.is_within_range ? 1 : 0) - (b.is_within_range ? 1 : 0);
          break;
      }
      return historySortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const handleHistoryHeaderClick = (field: typeof historySortField) => {
    if (historySortField === field) {
      setHistorySortDirection(historySortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setHistorySortField(field);
      setHistorySortDirection('asc');
    }
  };

  // ── CSV Export ─────────────────────────────────────────────

  const exportToCSV = () => {
    const filtered = getFilteredHistory();
    const headers = ['Date & Time', 'Equipment', 'Temperature', 'Status', 'Method', 'Shift', 'CCP', 'Recorded By', 'Corrective Action'];
    const rows = filtered.map(log => [
      format(new Date(log.created_at), 'MMM d, yyyy h:mm a'),
      log.equipment_name,
      `${log.temperature_value}\u00b0F`,
      log.is_within_range ? 'Pass' : 'Fail',
      log.input_method || 'manual',
      log.shift || '',
      log.ccp_number || '',
      log.recorded_by_name,
      log.corrective_action || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `temperature-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ── Chart helpers ──────────────────────────────────────────

  const getChartData = () => {
    const filtered = getFilteredHistory();
    let selectedEquipmentIds: string[];
    if (historyEquipment === 'all') {
      selectedEquipmentIds = equipment.map(eq => eq.id);
    } else {
      selectedEquipmentIds = [historyEquipment];
    }

    const chartLogs = filtered
      .filter(log => selectedEquipmentIds.includes(log.equipment_id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const timeMap = new Map<string, any>();
    for (const log of chartLogs) {
      const timeLabel = format(new Date(log.created_at), 'MMM d, HH:mm');
      if (!timeMap.has(timeLabel)) {
        timeMap.set(timeLabel, { time: timeLabel, timestamp: new Date(log.created_at).getTime() });
      }
      const point = timeMap.get(timeLabel)!;
      point[log.equipment_name] = log.temperature_value;
      point[`${log.equipment_name}_inRange`] = log.is_within_range;
    }

    return Array.from(timeMap.values()).sort((a: any, b: any) => a.timestamp - b.timestamp);
  };

  const getChartEquipmentNames = () => {
    const filtered = getFilteredHistory();
    if (historyEquipment === 'all') {
      const names = new Set<string>();
      filtered.forEach(log => names.add(log.equipment_name));
      return Array.from(names);
    }
    const name = filtered.find(log => log.equipment_id === historyEquipment)?.equipment_name || '';
    return name ? [name] : [];
  };

  // ── Filter window bounds ────────────────────────────────────

  const getFilterWindow = (): { start: Date; end: Date } => {
    const now = new Date();
    if (historyDateRange === 'today') {
      return { start: startOfDay(now), end: now };
    } else if (historyDateRange === 'yesterday') {
      return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
    } else if (historyDateRange === 'week') {
      return { start: subDays(now, 7), end: now };
    } else if (historyDateRange === 'month') {
      return { start: subDays(now, 30), end: now };
    } else if (historyDateRange === 'custom' && customDateFrom && customDateTo) {
      return { start: new Date(customDateFrom), end: endOfDay(new Date(customDateTo)) };
    }
    // Fallback: today
    return { start: startOfDay(now), end: now };
  };

  const filterWindow = getFilterWindow();

  // ── Computed data ──────────────────────────────────────────

  const filteredHistory = getFilteredHistory();
  const coverageGaps = useCoverageGaps(filteredHistory, equipment, filterWindow.start, filterWindow.end);
  const periodSummary = useHistoryPeriodSummary(filteredHistory, coverageGaps.length);

  // ── Gap interstitial detection for table rows ──────────────

  const buildTableRows = () => {
    type TableRow =
      | { type: 'reading'; log: TempCheckCompletion }
      | { type: 'gap'; equipmentId: string; equipmentName: string; gapMinutes: number; gapStartISO: string; gapEndISO: string; key: string };

    const rows: TableRow[] = [];
    const sorted = [...filteredHistory];

    for (let i = 0; i < sorted.length; i++) {
      rows.push({ type: 'reading', log: sorted[i] });

      if (i < sorted.length - 1) {
        const curr = sorted[i];
        const next = sorted[i + 1];
        if (curr.equipment_id === next.equipment_id) {
          const interval = getExpectedIntervalForType(curr.equipment_type);
          if (interval !== null) {
            const diffMs = Math.abs(new Date(curr.created_at).getTime() - new Date(next.created_at).getTime());
            const diffMinutes = diffMs / 60_000;
            if (diffMinutes > interval) {
              // curr is newer (desc sort), next is older — gap runs from next→curr
              const olderTime = next.created_at;
              const newerTime = curr.created_at;
              rows.push({
                type: 'gap',
                equipmentId: curr.equipment_id,
                equipmentName: curr.equipment_name,
                gapMinutes: Math.round(diffMinutes),
                gapStartISO: olderTime < newerTime ? olderTime : newerTime,
                gapEndISO: olderTime < newerTime ? newerTime : olderTime,
                key: `gap-${curr.id}-${next.id}`,
              });
            }
          }
        }
      }
    }

    if (showGapsOnly) {
      const gapIndices = new Set<number>();
      rows.forEach((row, idx) => {
        if (row.type === 'gap') {
          gapIndices.add(idx);
          if (idx > 0) gapIndices.add(idx - 1);
          if (idx < rows.length - 1) gapIndices.add(idx + 1);
        }
      });
      return rows.filter((_, idx) => gapIndices.has(idx));
    }

    return rows;
  };

  // ── Render helpers ─────────────────────────────────────────

  const pctColor = periodSummary.inRangePct >= 95 ? '#2f7a4d' : periodSummary.inRangePct >= 80 ? '#c2731a' : '#DC2626';

  const renderMethodPill = (method: InputMethod | undefined) => {
    const m = method || 'manual';
    const cfg = m === 'qr_scan'
      ? { icon: QrCode, label: 'QR Scan', bg: '#eef4f8', fg: '#1E2D4D' }
      : m === 'iot_sensor'
      ? { icon: Wifi, label: 'IoT', bg: '#ecfdf5', fg: '#065f46' }
      : { icon: Pencil, label: 'Manual', bg: '#f3f4f6', fg: '#4b5563' };
    const Icon = cfg.icon;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: cfg.bg, color: cfg.fg }}>
        <Icon className="h-3 w-3" /> {cfg.label}
      </span>
    );
  };

  // ── JSX ────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Period Summary Card */}
      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: '#FAF7F0', borderColor: '#E2DDD4' }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: '#8A93A6' }}>
              Total Readings
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#1E2D4D' }}>
              {periodSummary.totalReadings}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: '#8A93A6' }}>
              In Range
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: pctColor }}>
              {periodSummary.totalReadings > 0 ? `${periodSummary.inRangePct}%` : '\u2014'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: '#8A93A6' }}>
              Failed
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: periodSummary.failedCount > 0 ? '#DC2626' : '#1E2D4D' }}>
              {periodSummary.failedCount}
            </p>
            {periodSummary.failedCount > 0 && (
              <p className="text-[10px] mt-0.5" style={{ color: '#6B7F96' }}>
                {periodSummary.failedWithCA} with CA / {periodSummary.failedWithoutCA} without
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: '#8A93A6' }}>
              Coverage Gaps
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: coverageGaps.length > 0 ? '#c2731a' : '#1E2D4D' }}>
              {coverageGaps.length}
            </p>
          </div>
        </div>
      </div>

      {/* Gap Callout */}
      {coverageGaps.length > 0 && !showGapsOnly && (
        <TemperatureHistoryGapCallout
          gaps={coverageGaps}
          onShowGaps={() => setShowGapsOnly(true)}
        />
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-0 sm:min-w-[200px]">
            <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('tempLogs.dateRange')}</label>
            <select
              value={historyDateRange}
              onChange={(e) => setHistoryDateRange(e.target.value)}
              className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
            >
              <option value="today">{t('common.today')}</option>
              <option value="yesterday">{t('common.yesterday')}</option>
              <option value="week">{t('common.thisWeek')}</option>
              <option value="month">{t('common.thisMonth')}</option>
              <option value="custom">{t('tempLogs.custom')}</option>
            </select>
          </div>

          {historyDateRange === 'custom' && (
            <>
              <div className="flex-1 min-w-0 sm:min-w-[150px]">
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('tempLogs.from')}</label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                />
              </div>
              <div className="flex-1 min-w-0 sm:min-w-[150px]">
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('tempLogs.to')}</label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                />
              </div>
            </>
          )}

          <div className="flex-1 min-w-0 sm:min-w-[200px]">
            <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('tempLogs.equipmentName')}</label>
            <select
              value={historyEquipment}
              onChange={(e) => setHistoryEquipment(e.target.value)}
              className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
            >
              <option value="all">{t('tempLogs.allEquipment')}</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-0 sm:min-w-[150px]">
            <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('common.status')}</label>
            <select
              value={historyStatus}
              onChange={(e) => setHistoryStatus(e.target.value)}
              className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
            >
              <option value="all">{t('common.all')}</option>
              <option value="pass">{t('tempLogs.inRange')}</option>
              <option value="fail">{t('tempLogs.outOfRange')}</option>
            </select>
          </div>

          <div className="flex-1 min-w-0 sm:min-w-[140px]">
            <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">Method</label>
            <select
              value={historyMethod}
              onChange={(e) => setHistoryMethod(e.target.value as 'all' | InputMethod)}
              className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
            >
              <option value="all">All Methods</option>
              <option value="manual">Manual</option>
              <option value="qr_scan">QR Scan</option>
              <option value="iot_sensor">IoT Sensor</option>
            </select>
          </div>

          <div className="flex-1 min-w-0 sm:min-w-[120px]">
            <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">Shift</label>
            <select
              value={historyShift}
              onChange={(e) => setHistoryShift(e.target.value as 'all' | 'morning' | 'afternoon' | 'evening')}
              className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
            >
              <option value="all">All Shifts</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setHistoryView('table')}
              className={`px-4 py-2 min-h-[44px] rounded-lg font-medium ${
                historyView === 'table'
                  ? 'bg-[#1E2D4D] text-white'
                  : 'bg-[#1E2D4D]/10 text-[#1E2D4D]/80 hover:bg-[#1E2D4D]/15'
              }`}
            >
              {t('tempLogs.table')}
            </button>
            <button
              onClick={() => setHistoryView('chart')}
              className={`px-4 py-2 min-h-[44px] rounded-lg font-medium ${
                historyView === 'chart'
                  ? 'bg-[#1E2D4D] text-white'
                  : 'bg-[#1E2D4D]/10 text-[#1E2D4D]/80 hover:bg-[#1E2D4D]/15'
              }`}
            >
              {t('tempLogs.chart')}
            </button>
          </div>

          <button
            onClick={() => guardAction('export', 'temperature logs', () => exportToCSV())}
            className="px-4 py-2 min-h-[44px] bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] font-medium flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>{t('tempLogs.exportCsv')}</span>
          </button>
        </div>

        {/* Gaps-only filter chip */}
        {showGapsOnly && (
          <div className="mt-3 flex items-center">
            <button
              onClick={() => setShowGapsOnly(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: '#c2731a20', color: '#c2731a', border: '1px solid #c2731a' }}
            >
              <Clock className="h-3 w-3" />
              Gaps only
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Table View */}
      {historyView === 'table' && (
        <div className="bg-white border border-[#1E2D4D]/10 rounded-xl overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-[#1E2D4D]/10">
            <h2 className="text-xl font-bold text-[#1E2D4D]">Temperature History</h2>
            <button
              onClick={() => setShowHistoryDetails(!showHistoryDetails)}
              className="flex items-center space-x-2 text-sm text-[#1E2D4D]/70 hover:text-[#1E2D4D]"
            >
              <span>{showHistoryDetails ? 'Hide' : 'Show'} Details</span>
              {showHistoryDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#1E2D4D]/10">
            <thead className="bg-[#FAF7F0]">
              <tr>
                <th
                  onClick={() => handleHistoryHeaderClick('created_at')}
                  className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase cursor-pointer hover:bg-[#1E2D4D]/5"
                >
                  <div className="flex items-center space-x-1">
                    <span>{t('tempLogs.dateTime')}</span>
                    {historySortField === 'created_at' && (
                      <span>{historySortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHistoryHeaderClick('equipment_name')}
                  className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase cursor-pointer hover:bg-[#1E2D4D]/5"
                >
                  <div className="flex items-center space-x-1">
                    <span>{t('tempLogs.equipmentName')}</span>
                    {historySortField === 'equipment_name' && (
                      <span>{historySortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHistoryHeaderClick('temperature_value')}
                  className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase cursor-pointer hover:bg-[#1E2D4D]/5"
                >
                  <div className="flex items-center space-x-1">
                    <span>{t('tempLogs.temp')}</span>
                    {historySortField === 'temperature_value' && (
                      <span>{historySortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHistoryHeaderClick('is_within_range')}
                  className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase cursor-pointer hover:bg-[#1E2D4D]/5"
                >
                  <div className="flex items-center space-x-1">
                    <span>{t('common.status')}</span>
                    {historySortField === 'is_within_range' && (
                      <span>{historySortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">
                  Shift
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">
                  CCP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">
                  {t('tempLogs.recordedBy')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#1E2D4D]/10">
              {buildTableRows().map((row) => {
                if (row.type === 'gap') {
                  const midMs = (new Date(row.gapStartISO).getTime() + new Date(row.gapEndISO).getTime()) / 2;
                  return (
                    <tr
                      key={row.key}
                      style={{ borderLeft: '3px solid #c2731a', backgroundColor: '#fef6e8' }}
                    >
                      <td colSpan={8} className="px-6 py-2">
                        <div className="flex items-center gap-2 text-xs" style={{ color: '#c2731a' }}>
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-semibold">Gap: {formatGapDuration(row.gapMinutes)}</span>
                          <span style={{ color: '#6B7F96' }}>
                            &mdash; {row.equipmentName} exceeded check interval
                          </span>
                          <button
                            type="button"
                            onClick={() => setRetroModal({ open: true, equipmentId: row.equipmentId, gapMidpointISO: new Date(midMs).toISOString() })}
                            className="ml-auto text-xs font-semibold px-3 py-1 rounded-lg whitespace-nowrap"
                            style={{ backgroundColor: '#c2731a', color: '#fff' }}
                          >
                            + Log retroactively
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const log = row.log;
                return (
                  <Fragment key={log.id}>
                    <tr className="hover:bg-[#FAF7F0]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E2D4D]">
                        {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Thermometer className="h-5 w-5 text-[#1E2D4D]/30 mr-2" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#1E2D4D]">{log.equipment_name}</span>
                            {log.menu_item_name && (
                              <span className="text-xs text-[#1E2D4D]/60">{log.menu_item_name}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#1E2D4D]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {log.temperature_value}{'\u00b0'}F
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            log.is_within_range
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {log.is_within_range ? t('common.pass') : t('common.fail')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderMethodPill(log.input_method)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E2D4D]/70 capitalize">
                        {log.shift || '\u2014'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.ccp_number ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {log.ccp_number}
                          </span>
                        ) : (
                          <span className="text-xs text-[#1E2D4D]/30">{'\u2014'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar size={18} name={log.recorded_by_name} />
                          <span className="text-sm text-[#1E2D4D]/70">{log.recorded_by_name}</span>
                        </div>
                      </td>
                    </tr>
                    {showHistoryDetails && log.corrective_action && (
                      <tr key={`${log.id}-details`} className="bg-yellow-50">
                        <td colSpan={8} className="px-6 py-3">
                          <div className="text-sm">
                            <span className="font-medium text-[#1E2D4D]/80">Corrective Action: </span>
                            <span className="text-[#1E2D4D]/70">{log.corrective_action}</span>
                          </div>
                          {!log.is_within_range && (
                            <div className="mt-2 flex flex-wrap items-start gap-4">
                              <div>
                                <div className="flex items-center gap-1 text-xs text-[#1E2D4D]/50 mb-1">
                                  <Camera className="h-3 w-3" />
                                  <span className="font-medium">Photo evidence attached</span>
                                </div>
                                <PhotoGallery photos={tempPhotos} title="Temperature Evidence" />
                              </div>
                              <button
                                onClick={() => onHACCPReport(log)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: '#1E2D4D' }}
                              >
                                Generate HACCP Report
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    {showHistoryDetails && log.logged_retroactively && (
                      <tr key={`${log.id}-retro`} style={{ backgroundColor: '#fef6e8' }}>
                        <td colSpan={8} className="px-6 py-3">
                          <div className="flex items-center gap-2 text-xs" style={{ color: '#c2731a' }}>
                            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="font-semibold uppercase">Retroactive entry</span>
                            <span style={{ color: '#6B7F96' }}>
                              &middot; Logged {log.retroactive_logged_at ? format(new Date(log.retroactive_logged_at), 'MMM d, yyyy h:mm a') : ''} for reading at {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {log.retroactive_reason && (
                            <p className="text-xs mt-1 pl-[22px]" style={{ color: '#6B7F96' }}>
                              Reason: {log.retroactive_reason}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>

          {filteredHistory.length === 0 && (
            <EmptyState
              icon={Clock}
              title={!isDemoMode && history.length === 0 ? 'No temperature logs yet' : 'No temperature logs found'}
              description={!isDemoMode && history.length === 0 ? 'Start logging to track trends.' : 'No logs match the selected date range and filters. Try adjusting your criteria.'}
            />
          )}
        </div>
      )}

      {/* Chart View */}
      {historyView === 'chart' && (() => {
        const chartData = getChartData();
        const chartNames = getChartEquipmentNames();
        const selectedEq = historyEquipment !== 'all' ? equipment.find(e => e.id === historyEquipment) : null;

        return (
          <div className="bg-white border border-[#1E2D4D]/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-[#1E2D4D] mb-6">Temperature Trends</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis label={{ value: 'Temperature (\u00b0F)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: number, name: string) => [`${value}\u00b0F`, name]} />
                  <Legend />
                  {selectedEq && (
                    <ReferenceLine y={selectedEq.max_temp} stroke="#22c55e" strokeDasharray="3 3" label={{ value: `Max (${selectedEq.max_temp}\u00b0F)`, position: 'right', fontSize: 11 }} />
                  )}
                  {selectedEq && (
                    <ReferenceLine y={selectedEq.min_temp} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Min (${selectedEq.min_temp}\u00b0F)`, position: 'right', fontSize: 11 }} />
                  )}
                  {chartNames.map((name) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={equipmentColors[name] || '#888888'}
                      strokeWidth={2}
                      dot={<CustomDot />}
                      connectNulls
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-[#1E2D4D]/30 mx-auto mb-4" />
                <p className="text-[#1E2D4D]/50">No data available for chart. Try adjusting your filters.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Inspection Packet */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => toast.info('Inspection Packet builder is coming soon.')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm"
          style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
        >
          <FileText className="h-4 w-4" />
          Inspection Packet
        </button>
      </div>

      {/* Retroactive Entry Modal */}
      <RetroactiveEntryModal
        open={retroModal.open}
        onClose={() => setRetroModal({ open: false, equipmentId: '', gapMidpointISO: '' })}
        equipment={equipment}
        prefillEquipmentId={retroModal.equipmentId}
        prefillReadingTime={retroModal.gapMidpointISO}
        onSave={async (data) => {
          const ok = await onRetroactiveSave(data);
          if (ok) setRetroModal({ open: false, equipmentId: '', gapMidpointISO: '' });
        }}
      />
    </div>
  );
}
