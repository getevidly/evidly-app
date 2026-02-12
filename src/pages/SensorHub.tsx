import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Thermometer, Wifi, WifiOff, Battery, BatteryWarning,
  AlertTriangle, CheckCircle, XCircle, Clock, Activity,
  Radio, Signal, Cloud, Bluetooth, FileText, Upload,
  Search, Filter, Plus, ChevronRight, Zap,
  ArrowUpRight, ArrowDownRight, MoreHorizontal,
} from 'lucide-react';
import {
  iotSensorProviders, iotSensors, iotSensorReadings,
  iotSensorAlerts, iotIngestionLog,
  type IoTSensor,
} from '../data/demoData';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const PRIMARY = '#1e4d6b';
const GOLD = '#d4af37';
const LIGHT_BG = '#eef4f8';
const BORDER = '#b8d4e8';

/* ── Helpers ──────────────────────────────────────────────── */

function statusDot(s: IoTSensor['status']) {
  const map = { online: '#22c55e', warning: '#f59e0b', error: '#ef4444', offline: '#9ca3af' };
  return map[s];
}

function statusLabel(s: IoTSensor['status']) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function complianceColor(tempF: number, zone: string): { color: string; label: string } {
  const z = zone.toLowerCase();
  if (z.includes('freezer')) {
    if (tempF > 0) return { color: '#ef4444', label: 'Violation' };
    if (tempF > -3) return { color: '#f59e0b', label: 'Warning' };
    return { color: '#22c55e', label: 'In Range' };
  }
  if (z.includes('cooler') || z.includes('salad') || z.includes('beverage') || z.includes('display') || z.includes('blast') || z.includes('cold') || z.includes('reach')) {
    if (tempF > 41) return { color: '#ef4444', label: 'Violation' };
    if (tempF > 38) return { color: '#f59e0b', label: 'Warning' };
    return { color: '#22c55e', label: 'In Range' };
  }
  if (z.includes('hot') || z.includes('grill')) {
    if (tempF < 135) return { color: '#ef4444', label: 'Violation' };
    if (tempF < 140) return { color: '#f59e0b', label: 'Warning' };
    return { color: '#22c55e', label: 'In Range' };
  }
  if (z.includes('dry')) {
    if (tempF > 75) return { color: '#ef4444', label: 'Violation' };
    if (tempF > 72) return { color: '#f59e0b', label: 'Warning' };
    return { color: '#22c55e', label: 'In Range' };
  }
  return { color: '#6b7280', label: 'N/A' };
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function batteryIcon(pct: number) {
  if (pct <= 20) return <BatteryWarning className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />;
  return <Battery className="h-3.5 w-3.5" style={{ color: pct > 50 ? '#22c55e' : '#f59e0b' }} />;
}

function signalBars(rssi: number) {
  if (rssi === 0) return <WifiOff className="h-3.5 w-3.5 text-gray-300" />;
  const strength = rssi > -45 ? 3 : rssi > -55 ? 2 : 1;
  return (
    <div className="flex items-end gap-px">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-sm" style={{
          width: 3, height: 4 + i * 3,
          backgroundColor: i <= strength ? PRIMARY : '#e5e7eb',
        }} />
      ))}
    </div>
  );
}

function providerLogo(slug: string) {
  const p = iotSensorProviders.find(pr => pr.slug === slug);
  return p ? (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: p.color + '15', color: p.color }}>
      {p.name}
    </span>
  ) : null;
}

/* ── Ingestion Method Cards ──────────────────────────────── */

const METHODS = [
  {
    title: 'Cloud-to-Cloud API Pull',
    icon: Cloud,
    color: '#2563eb',
    desc: 'EvidLY polls sensor cloud APIs on your configured schedule. SensorPush OAuth 2.0, Temp Stick API keys — all normalized into one stream.',
    providers: ['SensorPush', 'Temp Stick', 'Testo', 'DeltaTrak'],
    count: iotIngestionLog.filter(l => l.method === 'api_pull').length,
  },
  {
    title: 'Webhook / MQTT Push',
    icon: Zap,
    color: '#059669',
    desc: 'Sensor platforms push data to your dedicated EvidLY webhook endpoint in real-time. HMAC signature verification for security.',
    providers: ['Monnit'],
    count: iotIngestionLog.filter(l => l.method === 'webhook').length,
  },
  {
    title: 'Manual / CSV / Bluetooth',
    icon: Upload,
    color: '#0891b2',
    desc: 'Upload CSV exports from closed systems like ComplianceMate, or capture readings via Bluetooth from Cooper-Atkins and ThermoWorks.',
    providers: ['ComplianceMate', 'Cooper-Atkins', 'ThermoWorks'],
    count: iotIngestionLog.filter(l => l.method === 'manual' || l.method === 'bluetooth').length,
  },
];

/* ── Main Component ──────────────────────────────────────── */

export function SensorHub() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const locations = useMemo(() => [...new Set(iotSensors.map(s => s.locationName))], []);
  const activeAlerts = useMemo(() => iotSensorAlerts.filter(a => !a.acknowledged), []);

  const filtered = useMemo(() => {
    return iotSensors.filter(s => {
      if (locationFilter !== 'all' && s.locationName !== locationFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.zone.toLowerCase().includes(q) || s.macAddress.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, locationFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = iotSensors.length;
    const online = iotSensors.filter(s => s.status === 'online').length;
    const violations = iotSensorReadings.filter(r => r.complianceStatus === 'violation').length;
    return { total, online, onlinePct: Math.round((online / total) * 100), violations, alerts: activeAlerts.length };
  }, [activeAlerts]);

  return (
    <div className="px-3 sm:px-6 py-6 max-w-[1400px] mx-auto" style={F}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>
              <Radio className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">IoT Sensor Hub</h1>
              <p className="text-sm text-gray-500">Your sensors. Our intelligence. Zero manual logging.</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/sensors/add')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors min-h-[44px]"
          style={{ backgroundColor: PRIMARY }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = PRIMARY)}
        >
          <Plus className="h-4 w-4" /> Add Sensor
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Sensors', value: stats.total, icon: Radio, color: PRIMARY, sub: `${iotSensorProviders.filter(p => p.status === 'connected').length} providers connected` },
          { label: 'Online', value: `${stats.onlinePct}%`, icon: Wifi, color: '#22c55e', sub: `${stats.online} of ${stats.total} sensors online` },
          { label: 'Violations', value: stats.violations, icon: AlertTriangle, color: stats.violations > 0 ? '#ef4444' : '#22c55e', sub: stats.violations > 0 ? 'Requires immediate action' : 'All readings in range' },
          { label: 'Active Alerts', value: stats.alerts, icon: Activity, color: stats.alerts > 0 ? '#f59e0b' : '#22c55e', sub: stats.alerts > 0 ? `${activeAlerts.filter(a => a.severity === 'critical').length} critical` : 'No unacknowledged alerts' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</span>
              <card.icon className="h-4 w-4" style={{ color: card.color }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</div>
            <div className="text-xs text-gray-400 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Three Ingestion Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {METHODS.map(m => (
          <div key={m.title} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: m.color + '12' }}>
                <m.icon className="h-4.5 w-4.5" style={{ color: m.color }} />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{m.title}</div>
                <div className="text-xs text-gray-400">{m.count} ingestion events</div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">{m.desc}</p>
            <div className="flex flex-wrap gap-1">
              {m.providers.map(p => (
                <span key={p} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">{p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search sensors by name, zone, or MAC address..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b]"
            />
          </div>
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b]"
          >
            <option value="all">All Locations</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b]"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="offline">Offline</option>
          </select>
          <div className="text-xs text-gray-400">{filtered.length} sensor{filtered.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Connected Devices Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100" style={{ backgroundColor: LIGHT_BG }}>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Device</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Brand</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Zone</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Last Reading</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Battery</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Signal</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sensor, idx) => {
                const comp = sensor.status !== 'offline'
                  ? complianceColor(sensor.currentTempF, sensor.zone)
                  : { color: '#9ca3af', label: 'Offline' };
                const alert = activeAlerts.find(a => a.sensorId === sensor.id && a.severity === 'critical');
                return (
                  <tr
                    key={sensor.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/sensors/${sensor.id}`)}
                    style={alert ? { backgroundColor: '#fef2f2' } : undefined}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: LIGHT_BG }}>
                          <Thermometer className="h-4 w-4" style={{ color: PRIMARY }} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{sensor.name}</div>
                          <div className="text-xs text-gray-400">{sensor.locationName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">{providerLogo(sensor.providerSlug)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-700">{sensor.zone}</span>
                    </td>
                    <td className="px-4 py-3">
                      {sensor.status !== 'offline' ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold" style={{ color: comp.color }}>{sensor.currentTempF}°F</span>
                            {sensor.currentHumidity !== null && (
                              <span className="text-xs text-gray-400">{sensor.currentHumidity}%</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{timeAgo(sensor.lastSeenAt)}</div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm text-gray-400">— —</span>
                          <div className="text-xs text-gray-400">{timeAgo(sensor.lastSeenAt)}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: statusDot(sensor.status) + '15',
                          color: statusDot(sensor.status),
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusDot(sensor.status) }} />
                        {statusLabel(sensor.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        {batteryIcon(sensor.batteryPct)}
                        <span className="text-xs text-gray-600">{sensor.batteryPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">{signalBars(sensor.signalRssi)}</td>
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                    No sensors match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Ingestion Activity */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Ingestion Activity</h3>
        <div className="space-y-2">
          {iotIngestionLog.slice(0, 5).map(log => (
            <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-400' : log.status === 'partial' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                <span className="text-sm text-gray-700">{log.provider}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                  {log.method === 'api_pull' ? 'API Pull' : log.method === 'webhook' ? 'Webhook' : log.method === 'bluetooth' ? 'Bluetooth' : 'Manual'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>{log.readingCount} readings</span>
                <span>{log.durationMs}ms</span>
                <span>{timeAgo(log.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
