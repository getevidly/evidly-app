import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Thermometer, Droplets, Battery, BatteryWarning, Wifi, WifiOff,
  AlertTriangle, CheckCircle, Clock, Activity, Settings, Edit3, Pause, Trash2,
  Bell, MapPin, Cpu, Radio, Calendar, Wrench, ChevronRight, RotateCcw,
  ArrowUpRight, ArrowDownRight, XCircle,
} from 'lucide-react';
import {
  iotSensors, iotSensorReadings, iotSensorAlerts, iotSensorProviders,
  iotMaintenanceLog, iotSensorConfigs,
  type IoTSensor, type IoTSensorReading, type IoTMaintenanceEntry,
} from '../data/demoData';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const PRIMARY = '#1e4d6b';
const GOLD = '#d4af37';
const LIGHT_BG = '#eef4f8';
const BORDER = '#b8d4e8';

/* ── Helpers ──────────────────────────────────────────────── */

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function complianceInfo(tempF: number, zone: string): { color: string; bg: string; label: string } {
  const z = zone.toLowerCase();
  if (z.includes('freezer')) {
    if (tempF > 0) return { color: '#ef4444', bg: '#fef2f2', label: 'VIOLATION' };
    if (tempF > -3) return { color: '#f59e0b', bg: '#fffbeb', label: 'WARNING' };
    return { color: '#22c55e', bg: '#ecfdf5', label: 'IN RANGE' };
  }
  if (z.includes('cooler') || z.includes('salad') || z.includes('beverage') || z.includes('display') || z.includes('blast') || z.includes('cold') || z.includes('reach')) {
    if (tempF > 41) return { color: '#ef4444', bg: '#fef2f2', label: 'VIOLATION' };
    if (tempF > 38) return { color: '#f59e0b', bg: '#fffbeb', label: 'WARNING' };
    return { color: '#22c55e', bg: '#ecfdf5', label: 'IN RANGE' };
  }
  if (z.includes('hot') || z.includes('grill')) {
    if (tempF < 135) return { color: '#ef4444', bg: '#fef2f2', label: 'VIOLATION' };
    if (tempF < 140) return { color: '#f59e0b', bg: '#fffbeb', label: 'WARNING' };
    return { color: '#22c55e', bg: '#ecfdf5', label: 'IN RANGE' };
  }
  if (z.includes('dry')) {
    if (tempF > 75) return { color: '#ef4444', bg: '#fef2f2', label: 'VIOLATION' };
    if (tempF > 72) return { color: '#f59e0b', bg: '#fffbeb', label: 'WARNING' };
    return { color: '#22c55e', bg: '#ecfdf5', label: 'IN RANGE' };
  }
  return { color: '#6b7280', bg: '#f3f4f6', label: 'N/A' };
}

function getThresholdLimits(zone: string): { max: number | null; min: number | null } {
  const z = zone.toLowerCase();
  if (z.includes('freezer')) return { max: 0, min: null };
  if (z.includes('cooler') || z.includes('salad') || z.includes('beverage') || z.includes('display') || z.includes('blast') || z.includes('cold') || z.includes('reach')) return { max: 41, min: null };
  if (z.includes('hot') || z.includes('grill')) return { max: null, min: 135 };
  if (z.includes('dry')) return { max: 75, min: null };
  return { max: null, min: null };
}

function maintenanceIcon(type: IoTMaintenanceEntry['type']) {
  switch (type) {
    case 'battery_replacement': return Battery;
    case 'calibration': return Activity;
    case 'relocation': return MapPin;
    case 'firmware_update': return Cpu;
    case 'note': return Edit3;
  }
}

function maintenanceBadge(type: IoTMaintenanceEntry['type']) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    battery_replacement: { bg: '#fef2f2', text: '#ef4444', label: 'Battery' },
    calibration: { bg: '#eff6ff', text: '#2563eb', label: 'Calibration' },
    relocation: { bg: '#f3e8ff', text: '#7c3aed', label: 'Relocation' },
    firmware_update: { bg: '#ecfdf5', text: '#059669', label: 'Firmware' },
    note: { bg: '#f3f4f6', text: '#6b7280', label: 'Note' },
  };
  return map[type];
}

/* ── Inline SVG Chart ─────────────────────────────────────── */

function TempChart({ readings, zone, range }: { readings: IoTSensorReading[]; zone: string; range: '24h' | '7d' | '30d' }) {
  const W = 600;
  const H = 200;
  const PAD = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Generate extended readings for chart (simulate more data points)
  const extendedReadings = useMemo(() => {
    if (readings.length < 2) return readings;
    const base = [...readings].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const result: { time: number; temp: number; humidity: number | null }[] = [];
    const latest = base[base.length - 1];
    const latestTime = new Date(latest.timestamp).getTime();

    const intervalMs = range === '24h' ? 15 * 60000 : range === '7d' ? 60 * 60000 : 4 * 60 * 60000;
    const totalMs = range === '24h' ? 24 * 3600000 : range === '7d' ? 7 * 24 * 3600000 : 30 * 24 * 3600000;
    const points = Math.min(Math.floor(totalMs / intervalMs), 96);

    for (let i = 0; i < points; i++) {
      const t = latestTime - (points - 1 - i) * intervalMs;
      const baseTemp = latest.temperatureF;
      const variance = (Math.sin(i * 0.3) * 1.5 + Math.cos(i * 0.7) * 0.8 + (Math.random() - 0.5) * 0.5);
      result.push({
        time: t,
        temp: +(baseTemp + variance).toFixed(1),
        humidity: latest.humidityPct !== null ? +((latest.humidityPct || 45) + Math.sin(i * 0.2) * 3).toFixed(0) : null,
      });
    }
    return result;
  }, [readings, range]);

  if (extendedReadings.length < 2) return <div className="text-sm text-gray-400 text-center py-8">Insufficient data</div>;

  const temps = extendedReadings.map(r => r.temp);
  const times = extendedReadings.map(r => r.time);
  const { max: thMax, min: thMin } = getThresholdLimits(zone);

  // Y axis bounds — include threshold lines with padding
  let yMin = Math.min(...temps);
  let yMax = Math.max(...temps);
  if (thMax !== null) { yMax = Math.max(yMax, thMax + 5); yMin = Math.min(yMin, thMax - 15); }
  if (thMin !== null) { yMin = Math.min(yMin, thMin - 5); yMax = Math.max(yMax, thMin + 15); }
  const yPad = (yMax - yMin) * 0.1 || 5;
  yMin -= yPad;
  yMax += yPad;

  const xMin = Math.min(...times);
  const xMax = Math.max(...times);
  const xRange = xMax - xMin || 1;

  const toX = (t: number) => PAD.left + ((t - xMin) / xRange) * chartW;
  const toY = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * chartH;

  // Build path
  const pathD = extendedReadings.map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(r.time).toFixed(1)},${toY(r.temp).toFixed(1)}`).join(' ');

  // Gradient fill area
  const areaD = pathD + ` L${toX(times[times.length - 1]).toFixed(1)},${(PAD.top + chartH).toFixed(1)} L${toX(times[0]).toFixed(1)},${(PAD.top + chartH).toFixed(1)} Z`;

  // Y axis labels
  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => yMin + ((yMax - yMin) / (yTicks - 1)) * i);

  // X axis labels
  const xTicks = 6;
  const xLabels = Array.from({ length: xTicks }, (_, i) => xMin + (xRange / (xTicks - 1)) * i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
      <defs>
        <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PRIMARY} stopOpacity="0.15" />
          <stop offset="100%" stopColor={PRIMARY} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke="#f3f4f6" strokeWidth={1} />
          <text x={PAD.left - 6} y={toY(v) + 3} textAnchor="end" fontSize={9} fill="#9ca3af">{v.toFixed(0)}°</text>
        </g>
      ))}

      {/* Threshold zones */}
      {thMax !== null && (
        <>
          <rect x={PAD.left} y={PAD.top} width={chartW} height={Math.max(0, toY(thMax) - PAD.top)} fill="#fef2f2" opacity={0.5} />
          <line x1={PAD.left} y1={toY(thMax)} x2={W - PAD.right} y2={toY(thMax)} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6,3" />
          <text x={W - PAD.right - 2} y={toY(thMax) - 4} textAnchor="end" fontSize={9} fill="#ef4444" fontWeight="bold">Max {thMax}°F</text>
        </>
      )}
      {thMin !== null && (
        <>
          <rect x={PAD.left} y={toY(thMin)} width={chartW} height={Math.max(0, PAD.top + chartH - toY(thMin))} fill="#fef2f2" opacity={0.5} />
          <line x1={PAD.left} y1={toY(thMin)} x2={W - PAD.right} y2={toY(thMin)} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6,3" />
          <text x={W - PAD.right - 2} y={toY(thMin) + 12} textAnchor="end" fontSize={9} fill="#ef4444" fontWeight="bold">Min {thMin}°F</text>
        </>
      )}

      {/* Warning zones */}
      {thMax !== null && (
        <>
          <rect x={PAD.left} y={toY(thMax)} width={chartW} height={Math.max(0, toY(thMax - 3) - toY(thMax))} fill="#fffbeb" opacity={0.4} />
          <line x1={PAD.left} y1={toY(thMax - 3)} x2={W - PAD.right} y2={toY(thMax - 3)} stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="3,3" />
        </>
      )}

      {/* Area fill */}
      <path d={areaD} fill="url(#tempGrad)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke={PRIMARY} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Data dots for last 3 actual readings */}
      {extendedReadings.slice(-3).map((r, i) => (
        <circle key={i} cx={toX(r.time)} cy={toY(r.temp)} r={3} fill="white" stroke={PRIMARY} strokeWidth={2} />
      ))}

      {/* X axis labels */}
      {xLabels.map((t, i) => (
        <text key={i} x={toX(t)} y={H - 4} textAnchor="middle" fontSize={9} fill="#9ca3af">
          {range === '24h'
            ? new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </text>
      ))}
    </svg>
  );
}

/* ── Main Component ──────────────────────────────────────── */

export function SensorDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [chartRange, setChartRange] = useState<'24h' | '7d' | '30d'>('24h');
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const sensor = useMemo(() => iotSensors.find(s => s.id === id), [id]);
  const provider = useMemo(() => sensor ? iotSensorProviders.find(p => p.slug === sensor.providerSlug) : null, [sensor]);
  const readings = useMemo(() => sensor ? iotSensorReadings.filter(r => r.sensorId === sensor.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [], [sensor]);
  const alerts = useMemo(() => sensor ? iotSensorAlerts.filter(a => a.sensorId === sensor.id) : [], [sensor]);
  const maintenance = useMemo(() => sensor ? iotMaintenanceLog.filter(m => m.sensorId === sensor.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [], [sensor]);
  const config = useMemo(() => sensor ? iotSensorConfigs.find(c => c.providerSlug === sensor.providerSlug) : null, [sensor]);

  if (!sensor) {
    return (
      <div className="p-6" style={F}>
        <button onClick={() => navigate('/sensors')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Sensor Hub
        </button>
        <div className="text-center py-12 text-gray-400">Sensor not found.</div>
      </div>
    );
  }

  const compliance = sensor.status !== 'offline' ? complianceInfo(sensor.currentTempF, sensor.zone) : { color: '#9ca3af', bg: '#f3f4f6', label: 'OFFLINE' };
  const { max: thMax, min: thMin } = getThresholdLimits(sensor.zone);

  return (
    <div className="px-3 sm:px-6 py-6 max-w-[1200px] mx-auto" style={F}>
      {/* Back nav */}
      <button onClick={() => navigate('/sensors')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Sensor Hub
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: compliance.bg }}>
            <Thermometer className="h-6 w-6" style={{ color: compliance.color }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{sensor.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">{sensor.locationName}</span>
              <span className="text-gray-300">&middot;</span>
              <span className="text-sm text-gray-500">{sensor.zone}</span>
              {provider && (
                <>
                  <span className="text-gray-300">&middot;</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: provider.color + '15', color: provider.color }}>{provider.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => guardAction('edit', 'IoT Sensors', () => toast.info('Edit thresholds — demo mode'))} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 min-h-[44px]">
            <Settings className="h-3.5 w-3.5" /> Thresholds
          </button>
          <button onClick={() => guardAction('edit', 'IoT Alerts', () => toast.info('Edit alerts — demo mode'))} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <Bell className="h-3.5 w-3.5" /> Alerts
          </button>
          <button onClick={() => guardAction('edit', 'IoT Sensors', () => toast.info('Reassign zone — demo mode'))} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <MapPin className="h-3.5 w-3.5" /> Zone
          </button>
          <button onClick={() => guardAction('pause', 'IoT Monitoring', () => toast.info('Pause monitoring — demo mode'))} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-yellow-200 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100">
            <Pause className="h-3.5 w-3.5" /> Pause
          </button>
          <button onClick={() => guardAction('delete', 'IoT Sensors', () => toast.info('Remove sensor — demo mode'))} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>

      {/* Top Row: Current Reading + Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Current Temperature — large */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Temperature</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: compliance.bg, color: compliance.color }}>
              {compliance.label}
            </span>
          </div>
          {sensor.status !== 'offline' ? (
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold" style={{ color: compliance.color }}>{sensor.currentTempF}°F</span>
              {sensor.currentHumidity !== null && (
                <div className="flex items-center gap-1 mb-2">
                  <Droplets className="h-4 w-4 text-blue-400" />
                  <span className="text-lg text-gray-500">{sensor.currentHumidity}%</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-5xl font-bold text-gray-300">— —</div>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span>Last reading: {timeAgo(sensor.lastSeenAt)}</span>
            {thMax !== null && <span>Threshold: max {thMax}°F</span>}
            {thMin !== null && <span>Threshold: min {thMin}°F</span>}
          </div>
        </div>

        {/* Quick stats */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              {sensor.batteryPct <= 20 ? <BatteryWarning className="h-4 w-4 text-red-500" /> : <Battery className="h-4 w-4 text-green-500" />}
              <span className="text-xs font-medium text-gray-500">Battery</span>
            </div>
            <div className="text-xl font-bold" style={{ color: sensor.batteryPct <= 20 ? '#ef4444' : sensor.batteryPct <= 50 ? '#f59e0b' : '#22c55e' }}>
              {sensor.batteryPct}%
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-100 mt-2">
              <div className="h-full rounded-full" style={{
                width: `${sensor.batteryPct}%`,
                backgroundColor: sensor.batteryPct <= 20 ? '#ef4444' : sensor.batteryPct <= 50 ? '#f59e0b' : '#22c55e',
              }} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              {sensor.signalRssi === 0 ? <WifiOff className="h-4 w-4 text-gray-300" /> : <Wifi className="h-4 w-4" style={{ color: PRIMARY }} />}
              <span className="text-xs font-medium text-gray-500">Signal</span>
            </div>
            <div className="text-xl font-bold" style={{ color: sensor.signalRssi === 0 ? '#9ca3af' : PRIMARY }}>
              {sensor.signalRssi === 0 ? 'No Signal' : `${sensor.signalRssi} dBm`}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {sensor.signalRssi === 0 ? 'Sensor offline' : sensor.signalRssi > -45 ? 'Excellent' : sensor.signalRssi > -55 ? 'Good' : 'Weak'}
            </div>
          </div>
        </div>

        {/* Active alerts for this sensor */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" style={{ color: alerts.some(a => !a.acknowledged && a.severity === 'critical') ? '#ef4444' : '#f59e0b' }} />
            <span className="text-xs font-medium text-gray-500">Active Alerts</span>
          </div>
          {alerts.filter(a => !a.acknowledged).length > 0 ? (
            <div className="space-y-2">
              {alerts.filter(a => !a.acknowledged).slice(0, 3).map(alert => (
                <div key={alert.id} className="p-2 rounded-lg text-xs" style={{
                  backgroundColor: alert.severity === 'critical' ? '#fef2f2' : alert.severity === 'warning' ? '#fffbeb' : '#eff6ff',
                }}>
                  <div className="font-semibold" style={{ color: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'warning' ? '#d97706' : '#2563eb' }}>
                    {alert.alertType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div className="text-gray-500 mt-0.5">{alert.message.slice(0, 80)}...</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">No active alerts</span>
            </div>
          )}
        </div>
      </div>

      {/* Temperature Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className="text-sm font-bold text-gray-900">Temperature History</h3>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100">
            {(['24h', '7d', '30d'] as const).map(r => (
              <button
                key={r}
                onClick={() => setChartRange(r)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  backgroundColor: chartRange === r ? 'white' : 'transparent',
                  color: chartRange === r ? PRIMARY : '#6b7280',
                  boxShadow: chartRange === r ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 mb-2 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ backgroundColor: PRIMARY }} /> Temperature</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-red-400" style={{ borderTop: '2px dashed #ef4444' }} /> Threshold</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50" /> Violation Zone</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-50" /> Warning Zone</span>
        </div>
        <TempChart readings={readings} zone={sensor.zone} range={chartRange} />
      </div>

      {/* Bottom grid: Device Info + Maintenance Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Device Information</h3>
          <div className="space-y-3">
            {[
              { label: 'Brand', value: provider?.name || '—' },
              { label: 'Model', value: sensor.macAddress.split(':').slice(0, 2).join(':') === 'SP:A4' ? 'HT.w WiFi' : sensor.macAddress.split(':').slice(0, 2).join(':') === 'TS:B8' ? 'WiFi Sensor' : sensor.firmware },
              { label: 'MAC Address', value: sensor.macAddress, mono: true },
              { label: 'Firmware', value: sensor.firmware },
              { label: 'Sensor Type', value: sensor.type.charAt(0).toUpperCase() + sensor.type.slice(1) },
              { label: 'Ingestion Method', value: provider?.authType === 'oauth' ? 'Cloud-to-Cloud API Pull' : provider?.authType === 'apikey' ? 'Cloud-to-Cloud API Pull' : provider?.authType === 'webhook' ? 'Webhook Push' : provider?.authType === 'bluetooth' ? 'Bluetooth Capture' : 'CSV Import' },
              { label: 'Polling Interval', value: config ? (config.pollingIntervalMin === 0 ? 'Real-time (webhook)' : `Every ${config.pollingIntervalMin} min`) : '—' },
              { label: 'Last Calibration', value: maintenance.find(m => m.type === 'calibration')?.date ? formatDate(maintenance.find(m => m.type === 'calibration')!.date) : 'Not recorded' },
              { label: 'Auto-Log Compliance', value: config?.autoLogCompliance ? 'Enabled' : 'Disabled' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500">{row.label}</span>
                <span className={`text-xs font-medium text-gray-900 ${(row as any).mono ? 'font-mono' : ''}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance Log */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h3 className="text-sm font-bold text-gray-900">Maintenance Log</h3>
            <button onClick={() => guardAction('create', 'Sensor Maintenance', () => toast.info('Add maintenance entry — demo mode'))} className="flex items-center gap-1 text-xs font-medium hover:text-gray-700" style={{ color: PRIMARY }}>
              <Wrench className="h-3.5 w-3.5" /> Add Entry
            </button>
          </div>
          {maintenance.length > 0 ? (
            <div className="space-y-3">
              {maintenance.map(entry => {
                const Icon = maintenanceIcon(entry.type);
                const badge = maintenanceBadge(entry.type);
                return (
                  <div key={entry.id} className="flex gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: badge.bg }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: badge.text }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: badge.bg, color: badge.text }}>{badge.label}</span>
                        <span className="text-xs text-gray-400">{formatDate(entry.date)}</span>
                      </div>
                      <div className="text-xs text-gray-700">{entry.description}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">By {entry.performedBy}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">No maintenance records yet.</div>
          )}
        </div>
      </div>

      {/* Recent Readings Table */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Recent Readings</h3>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2">Timestamp</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2">Temperature</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2 hidden sm:table-cell">Humidity</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2 hidden sm:table-cell">Quality</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2">Compliance</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2 hidden sm:table-cell">Battery</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r, i) => {
              const comp = r.complianceStatus === 'violation' ? { color: '#ef4444', bg: '#fef2f2' }
                : r.complianceStatus === 'warning' ? { color: '#f59e0b', bg: '#fffbeb' }
                  : { color: '#22c55e', bg: '#ecfdf5' };
              return (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2.5 text-xs text-gray-600">{formatTime(r.timestamp)}</td>
                  <td className="py-2.5 text-xs font-bold" style={{ color: comp.color }}>{r.temperatureF}°F</td>
                  <td className="py-2.5 text-xs text-gray-600 hidden sm:table-cell">{r.humidityPct !== null ? `${r.humidityPct}%` : '—'}</td>
                  <td className="py-2.5 hidden sm:table-cell">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
                      backgroundColor: r.quality === 'good' ? '#ecfdf5' : r.quality === 'suspect' ? '#fffbeb' : '#fef2f2',
                      color: r.quality === 'good' ? '#059669' : r.quality === 'suspect' ? '#d97706' : '#ef4444',
                    }}>
                      {r.quality.charAt(0).toUpperCase() + r.quality.slice(1)}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: comp.bg, color: comp.color }}>
                      {r.complianceStatus === 'in_range' ? 'In Range' : r.complianceStatus === 'warning' ? 'Warning' : 'Violation'}
                    </span>
                  </td>
                  <td className="py-2.5 text-xs text-gray-600 hidden sm:table-cell">{r.batteryPct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
