import { useState, useMemo } from 'react';
import {
  Thermometer, Wifi, WifiOff, Battery, BatteryWarning, BatteryCharging,
  AlertTriangle, CheckCircle, XCircle, Clock, Activity, Settings as SettingsIcon,
  Radio, Signal, Cloud, CloudOff, Bluetooth, FileText, Download, Upload,
  Copy, RefreshCw, Zap, Eye, Bell, BellOff, ArrowUpRight, ArrowDownRight,
  Search, Filter, MoreHorizontal, ChevronDown, ChevronRight, LogOut,
  Layers, BarChart3, TrendingUp, Shield, Database, Link2, ExternalLink,
} from 'lucide-react';
import {
  iotSensorProviders, iotSensors, iotSensorReadings, iotSensorAlerts,
  iotSensorConfigs, iotIngestionLog,
  type IoTSensor, type IoTSensorProvider, type IoTSensorAlert, type IoTIngestionLog,
} from '../data/demoData';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

type Tab = 'monitor' | 'fleet' | 'alerts' | 'integrations' | 'analytics' | 'settings';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'monitor', label: 'Live Monitor', icon: Activity },
  { key: 'fleet', label: 'Sensor Fleet', icon: Radio },
  { key: 'alerts', label: 'Alerts & Thresholds', icon: AlertTriangle },
  { key: 'integrations', label: 'Integrations', icon: Cloud },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: IoTSensor['status']) {
  switch (s) {
    case 'online': return '#22c55e';
    case 'warning': return '#f59e0b';
    case 'error': return '#ef4444';
    case 'offline': return '#9ca3af';
  }
}

function severityColor(s: IoTSensorAlert['severity']) {
  switch (s) {
    case 'critical': return '#ef4444';
    case 'warning': return '#f59e0b';
    case 'info': return '#3b82f6';
  }
}

function severityBg(s: IoTSensorAlert['severity']) {
  switch (s) {
    case 'critical': return '#fef2f2';
    case 'warning': return '#fffbeb';
    case 'info': return '#eff6ff';
  }
}

function tempColor(f: number, zone: string): string {
  if (zone.toLowerCase().includes('freezer')) return f > 0 ? '#ef4444' : f > -5 ? '#f59e0b' : '#22c55e';
  if (zone.toLowerCase().includes('cooler') || zone.toLowerCase().includes('salad') || zone.toLowerCase().includes('beverage') || zone.toLowerCase().includes('display') || zone.toLowerCase().includes('blast') || zone.toLowerCase().includes('cold')) {
    return f > 41 ? '#ef4444' : f > 38 ? '#f59e0b' : '#22c55e';
  }
  if (zone.toLowerCase().includes('hot') || zone.toLowerCase().includes('grill')) return f < 140 ? '#ef4444' : f < 145 ? '#f59e0b' : '#22c55e';
  return '#6b7280';
}

function authBadge(t: IoTSensorProvider['authType']) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    oauth: { bg: '#f3e8ff', text: '#7c3aed', label: 'OAuth 2.0' },
    apikey: { bg: '#eff6ff', text: '#2563eb', label: 'API Key' },
    webhook: { bg: '#ecfdf5', text: '#059669', label: 'Webhook' },
    bluetooth: { bg: '#ecfeff', text: '#0891b2', label: 'Bluetooth' },
    csv: { bg: '#f3f4f6', text: '#6b7280', label: 'CSV Import' },
  };
  const m = map[t];
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: m.bg, color: m.text }}>{m.label}</span>;
}

function connStatusBadge(s: IoTSensorProvider['status']) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    connected: { bg: '#ecfdf5', text: '#059669', dot: '#22c55e' },
    pending: { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b' },
    available: { bg: '#f3f4f6', text: '#6b7280', dot: '#9ca3af' },
  };
  const m = map[s];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: m.bg, color: m.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.dot }} />
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function methodBadge(m: IoTIngestionLog['method']) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    api_pull: { bg: '#eff6ff', text: '#2563eb', label: 'API Pull' },
    webhook: { bg: '#ecfdf5', text: '#059669', label: 'Webhook' },
    manual: { bg: '#f3f4f6', text: '#6b7280', label: 'Manual' },
    bluetooth: { bg: '#ecfeff', text: '#0891b2', label: 'Bluetooth' },
  };
  const v = map[m];
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: v.bg, color: v.text }}>{v.label}</span>;
}

function logStatusBadge(s: IoTIngestionLog['status']) {
  if (s === 'success') return <span className="text-xs font-medium text-green-700">Success</span>;
  if (s === 'partial') return <span className="text-xs font-medium text-amber-700">Partial</span>;
  return <span className="text-xs font-medium text-red-700">Error</span>;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Signal bars component ────────────────────────────────────────────────────

function SignalBars({ rssi }: { rssi: number }) {
  const abs = Math.abs(rssi);
  const bars = abs === 0 ? 0 : abs <= 40 ? 4 : abs <= 55 ? 3 : abs <= 65 ? 2 : 1;
  return (
    <div className="flex items-end gap-0.5" title={`${rssi} dBm`}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-sm" style={{ width: 3, height: 4 + i * 3, backgroundColor: i <= bars ? '#1e4d6b' : '#e5e7eb' }} />
      ))}
    </div>
  );
}

// ── Battery bar component ────────────────────────────────────────────────────

function BatteryBar({ pct }: { pct: number }) {
  const color = pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-8 h-3 rounded-sm border border-gray-300 relative overflow-hidden bg-gray-100">
        <div className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-500">{pct}%</span>
    </div>
  );
}

// ── SVG Mini Trend ───────────────────────────────────────────────────────────

function MiniTrend({ sensorId }: { sensorId: string }) {
  const readings = iotSensorReadings.filter(r => r.sensorId === sensorId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  if (readings.length < 2) return null;
  const temps = readings.map(r => r.temperatureF);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = max - min || 1;
  const w = 60;
  const h = 24;
  const points = temps.map((t, i) => `${(i / (temps.length - 1)) * w},${h - ((t - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline points={points} fill="none" stroke="#1e4d6b" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ── Donut chart ──────────────────────────────────────────────────────────────

function DonutChart({ value, total, color, label }: { value: number; total: number; color: string; label: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const circumference = 2 * Math.PI * 40;
  const dash = (pct / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
        <text x="50" y="48" textAnchor="middle" className="text-lg font-bold" fill="#111827">{Math.round(pct)}%</text>
        <text x="50" y="62" textAnchor="middle" className="text-xs" fill="#6b7280">{value}/{total}</text>
      </svg>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function IoTSensorHub() {
  const [activeTab, setActiveTab] = useState<Tab>('monitor');
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [fleetSearch, setFleetSearch] = useState('');
  const [fleetLocationFilter, setFleetLocationFilter] = useState<string>('all');
  const [fleetProviderFilter, setFleetProviderFilter] = useState<string>('all');
  const [fleetStatusFilter, setFleetStatusFilter] = useState<string>('all');

  // Computed values
  const onlineCount = iotSensors.filter(s => s.status === 'online').length;
  const warningCount = iotSensors.filter(s => s.status === 'warning').length;
  const criticalAlerts = iotSensorAlerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const totalReadingsToday = iotSensorReadings.length;
  const locations = [...new Set(iotSensors.map(s => s.locationName))];
  const providerSlugs = [...new Set(iotSensors.map(s => s.providerSlug))];

  // Sorted sensors: anomalies first
  const sortedSensors = useMemo(() => {
    const priorityMap: Record<IoTSensor['status'], number> = { error: 0, warning: 1, offline: 2, online: 3 };
    return [...iotSensors].sort((a, b) => priorityMap[a.status] - priorityMap[b.status]);
  }, []);

  // Filtered fleet
  const filteredFleet = useMemo(() => {
    return iotSensors.filter(s => {
      if (fleetLocationFilter !== 'all' && s.locationName !== fleetLocationFilter) return false;
      if (fleetProviderFilter !== 'all' && s.providerSlug !== fleetProviderFilter) return false;
      if (fleetStatusFilter !== 'all' && s.status !== fleetStatusFilter) return false;
      if (fleetSearch && !s.name.toLowerCase().includes(fleetSearch.toLowerCase()) && !s.macAddress.toLowerCase().includes(fleetSearch.toLowerCase()) && !s.zone.toLowerCase().includes(fleetSearch.toLowerCase())) return false;
      return true;
    });
  }, [fleetSearch, fleetLocationFilter, fleetProviderFilter, fleetStatusFilter]);

  // Analytics data
  const analyticsData = useMemo(() => {
    const coolerReadings = iotSensorReadings.filter(r => {
      const sensor = iotSensors.find(s => s.id === r.sensorId);
      return sensor && (sensor.zone.toLowerCase().includes('cooler') || sensor.zone.toLowerCase().includes('freezer') || sensor.zone.toLowerCase().includes('display') || sensor.zone.toLowerCase().includes('salad') || sensor.zone.toLowerCase().includes('beverage') || sensor.zone.toLowerCase().includes('blast') || sensor.zone.toLowerCase().includes('cold'));
    });
    const inRange = coolerReadings.filter(r => {
      const sensor = iotSensors.find(s => s.id === r.sensorId);
      if (!sensor) return false;
      if (sensor.zone.toLowerCase().includes('freezer')) return r.temperatureF <= 0;
      return r.temperatureF <= 41;
    }).length;
    const byProvider: Record<string, number> = {};
    iotSensorReadings.forEach(r => {
      const sensor = iotSensors.find(s => s.id === r.sensorId);
      if (sensor) {
        const prov = iotSensorProviders.find(p => p.slug === sensor.providerSlug);
        const name = prov?.name || sensor.providerSlug;
        byProvider[name] = (byProvider[name] || 0) + 1;
      }
    });
    return { coolerTotal: coolerReadings.length, coolerInRange: inRange, byProvider };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50" style={F}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1e4d6b' }}>
              <Thermometer className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-gray-900">Evid</span>
              <span className="text-lg font-bold" style={{ color: '#d4af37' }}>LY</span>
              <span className="text-gray-400 mx-1">|</span>
              <span className="text-lg font-semibold text-gray-700">IoT Sensor Hub</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-green-700">{onlineCount} sensors online</span>
            </div>
            {criticalAlerts > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                <span className="text-sm font-medium text-red-700">{criticalAlerts} critical</span>
              </div>
            )}
            <button onClick={() => alert('Sign out clicked (demo)')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(t => {
              const active = activeTab === t.key;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)} className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors" style={{ color: active ? '#1e4d6b' : '#6b7280', borderBottom: active ? '2px solid #1e4d6b' : '2px solid transparent' }}>
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {activeTab === 'monitor' && <LiveMonitorTab sensors={sortedSensors} selectedSensor={selectedSensor} setSelectedSensor={setSelectedSensor} onlineCount={onlineCount} warningCount={warningCount} criticalAlerts={criticalAlerts} totalReadingsToday={totalReadingsToday} />}
        {activeTab === 'fleet' && <SensorFleetTab sensors={filteredFleet} search={fleetSearch} setSearch={setFleetSearch} locationFilter={fleetLocationFilter} setLocationFilter={setFleetLocationFilter} providerFilter={fleetProviderFilter} setProviderFilter={setFleetProviderFilter} statusFilter={fleetStatusFilter} setStatusFilter={setFleetStatusFilter} locations={locations} providerSlugs={providerSlugs} />}
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'analytics' && <AnalyticsTab data={analyticsData} />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Live Monitor
// ═══════════════════════════════════════════════════════════════════════════

function LiveMonitorTab({ sensors, selectedSensor, setSelectedSensor, onlineCount, warningCount, criticalAlerts, totalReadingsToday }: {
  sensors: IoTSensor[]; selectedSensor: string | null; setSelectedSensor: (id: string | null) => void;
  onlineCount: number; warningCount: number; criticalAlerts: number; totalReadingsToday: number;
}) {
  const selected = selectedSensor ? iotSensors.find(s => s.id === selectedSensor) : null;
  const selectedReadings = selectedSensor ? iotSensorReadings.filter(r => r.sensorId === selectedSensor).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [];

  return (
    <div>
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Online', value: onlineCount, total: iotSensors.length, color: '#22c55e', icon: Wifi },
          { label: 'Warnings', value: warningCount, total: null, color: '#f59e0b', icon: AlertTriangle },
          { label: 'Critical Alerts', value: criticalAlerts, total: null, color: '#ef4444', icon: XCircle },
          { label: 'Readings Today', value: totalReadingsToday, total: null, color: '#1e4d6b', icon: Database },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: item.color + '15' }}>
              <item.icon className="h-5 w-5" style={{ color: item.color }} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{item.value}{item.total !== null && <span className="text-sm font-normal text-gray-400">/{item.total}</span>}</div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Sensor grid */}
        <div className={`grid gap-4 ${selectedSensor ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 flex-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full'}`}>
          {sensors.map(sensor => {
            const provider = iotSensorProviders.find(p => p.slug === sensor.providerSlug);
            const isSelected = selectedSensor === sensor.id;
            return (
              <button key={sensor.id} onClick={() => setSelectedSensor(isSelected ? null : sensor.id)} className={`bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md ${isSelected ? 'border-[#1e4d6b] ring-2 ring-[#1e4d6b]/20' : 'border-gray-200'}`}>
                {/* Top row: status + name + provider */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor(sensor.status) }} />
                    <span className="text-sm font-semibold text-gray-900 truncate">{sensor.name}</span>
                  </div>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: provider?.color || '#999' }} title={provider?.name} />
                </div>

                {/* Location + zone badges */}
                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{sensor.locationName}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>{sensor.zone}</span>
                </div>

                {/* Temperature display */}
                {sensor.status !== 'offline' ? (
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold" style={{ color: tempColor(sensor.currentTempF, sensor.zone) }}>{sensor.currentTempF.toFixed(1)}</span>
                    <span className="text-sm text-gray-400">°F</span>
                    {sensor.currentHumidity !== null && (
                      <span className="text-sm text-gray-500 ml-auto">{sensor.currentHumidity}% RH</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-2">
                    <WifiOff className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-400">Offline</span>
                  </div>
                )}

                {/* Bottom row: battery, signal, trend, time */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <BatteryBar pct={sensor.batteryPct} />
                    {sensor.signalRssi !== 0 && <SignalBars rssi={sensor.signalRssi} />}
                  </div>
                  <div className="flex items-center gap-2">
                    <MiniTrend sensorId={sensor.id} />
                    <span className="text-xs text-gray-400">{timeAgo(sensor.lastSeenAt)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected sensor detail panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 p-5 sticky top-24 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{selected.name}</h3>
              <button onClick={() => setSelectedSensor(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Location</span><span className="font-medium">{selected.locationName}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Zone</span><span className="font-medium">{selected.zone}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Provider</span><span className="font-medium">{iotSensorProviders.find(p => p.slug === selected.providerSlug)?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">MAC</span><span className="font-mono text-xs">{selected.macAddress}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Firmware</span><span className="font-medium">{selected.firmware}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span><span className="font-medium capitalize" style={{ color: statusColor(selected.status) }}>{selected.status}</span></div>
            </div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Readings</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedReadings.map((r, i) => (
                <div key={i} className={`flex items-center justify-between text-xs p-2 rounded ${r.isAnomaly ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <span className="text-gray-500">{formatTime(r.timestamp)}</span>
                  <span className={`font-bold ${r.isAnomaly ? 'text-red-600' : 'text-gray-900'}`}>{r.temperatureF.toFixed(1)}°F</span>
                  {r.humidityPct !== null && <span className="text-gray-500">{r.humidityPct}%</span>}
                  <span className="text-gray-400">{r.batteryPct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Sensor Fleet
// ═══════════════════════════════════════════════════════════════════════════

function SensorFleetTab({ sensors, search, setSearch, locationFilter, setLocationFilter, providerFilter, setProviderFilter, statusFilter, setStatusFilter, locations, providerSlugs }: {
  sensors: IoTSensor[]; search: string; setSearch: (v: string) => void;
  locationFilter: string; setLocationFilter: (v: string) => void;
  providerFilter: string; setProviderFilter: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  locations: string[]; providerSlugs: string[];
}) {
  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sensors..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]" />
        </div>
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
          <option value="all">All Locations</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
          <option value="all">All Providers</option>
          {providerSlugs.map(s => <option key={s} value={s}>{iotSensorProviders.find(p => p.slug === s)?.name || s}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="warning">Warning</option>
          <option value="offline">Offline</option>
          <option value="error">Error</option>
        </select>
        <button onClick={() => alert('Bulk actions: Export CSV, Firmware Update, Recalibrate (demo)')} className="px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1e4d6b' }}>
          Bulk Actions <ChevronDown className="h-3 w-3 inline ml-1" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200" style={{ backgroundColor: '#f8fafc' }}>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Sensor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Provider</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">MAC Address</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Zone</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Temp</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Battery</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Signal</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Last Seen</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map(sensor => {
                const provider = iotSensorProviders.find(p => p.slug === sensor.providerSlug);
                return (
                  <tr key={sensor.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{sensor.name}</div>
                      <div className="text-xs text-gray-400">{sensor.firmware}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: provider?.color }} />
                        <span className="text-gray-700">{provider?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{sensor.macAddress}</td>
                    <td className="px-4 py-3 text-gray-700">{sensor.locationName}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>{sensor.zone}</span></td>
                    <td className="px-4 py-3 text-center">
                      {sensor.status !== 'offline' ? (
                        <span className="font-bold" style={{ color: tempColor(sensor.currentTempF, sensor.zone) }}>{sensor.currentTempF.toFixed(1)}°F</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><div className="flex justify-center"><BatteryBar pct={sensor.batteryPct} /></div></td>
                    <td className="px-4 py-3"><div className="flex justify-center">{sensor.signalRssi !== 0 ? <SignalBars rssi={sensor.signalRssi} /> : <span className="text-gray-400">—</span>}</div></td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: statusColor(sensor.status) + '20', color: statusColor(sensor.status) }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor(sensor.status) }} />
                        {sensor.status.charAt(0).toUpperCase() + sensor.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{timeAgo(sensor.lastSeenAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => alert(`Configure ${sensor.name} (demo)`)} className="text-gray-400 hover:text-[#1e4d6b]"><MoreHorizontal className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
          Showing {sensors.length} of {iotSensors.length} sensors
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Alerts & Thresholds
// ═══════════════════════════════════════════════════════════════════════════

function AlertsTab() {
  const [thresholds, setThresholds] = useState({ highTempF: 41, lowTempF: -10, humidityHigh: 70, humidityLow: 20, batteryLowPct: 20, offlineMinutes: 30 });
  const sortedAlerts = [...iotSensorAlerts].sort((a, b) => {
    const sevOrder = { critical: 0, warning: 1, info: 2 };
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
    return sevOrder[a.severity] - sevOrder[b.severity];
  });

  return (
    <div className="flex gap-6">
      {/* Alerts list */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Active Alerts ({iotSensorAlerts.filter(a => !a.acknowledged).length})</h2>
          <button onClick={() => alert('Acknowledge all alerts (demo)')} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1e4d6b' }}>
            Acknowledge All
          </button>
        </div>
        <div className="space-y-3">
          {sortedAlerts.map(alert => (
            <div key={alert.id} className={`bg-white rounded-xl border p-4 ${alert.acknowledged ? 'opacity-60' : ''}`} style={{ borderColor: alert.acknowledged ? '#e5e7eb' : severityColor(alert.severity) + '40' }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: severityBg(alert.severity) }}>
                  {alert.severity === 'critical' ? <XCircle className="h-4 w-4" style={{ color: severityColor(alert.severity) }} /> :
                   alert.severity === 'warning' ? <AlertTriangle className="h-4 w-4" style={{ color: severityColor(alert.severity) }} /> :
                   <Bell className="h-4 w-4" style={{ color: severityColor(alert.severity) }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase" style={{ backgroundColor: severityBg(alert.severity), color: severityColor(alert.severity) }}>{alert.severity}</span>
                    <span className="text-sm font-semibold text-gray-900">{alert.sensorName}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{alert.locationName}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{alert.message}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatDateTime(alert.createdAt)}</span>
                    {alert.acknowledged && <span className="text-green-600">Acknowledged by {alert.acknowledgedBy}</span>}
                  </div>
                </div>
                {!alert.acknowledged && (
                  <button onClick={() => window.alert(`Acknowledged alert for ${alert.sensorName} (demo)`)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0">
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Threshold configuration */}
      <div className="w-80 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-24">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Alert Thresholds</h3>
          <div className="space-y-4">
            {[
              { label: 'High Temp (°F)', key: 'highTempF' as const, icon: ArrowUpRight, color: '#ef4444' },
              { label: 'Low Temp (°F)', key: 'lowTempF' as const, icon: ArrowDownRight, color: '#3b82f6' },
              { label: 'Humidity High (%)', key: 'humidityHigh' as const, icon: Activity, color: '#7c3aed' },
              { label: 'Humidity Low (%)', key: 'humidityLow' as const, icon: Activity, color: '#0891b2' },
              { label: 'Battery Low (%)', key: 'batteryLowPct' as const, icon: BatteryWarning, color: '#f59e0b' },
              { label: 'Offline (minutes)', key: 'offlineMinutes' as const, icon: WifiOff, color: '#9ca3af' },
            ].map(item => (
              <div key={item.key}>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                  {item.label}
                </label>
                <input type="number" value={thresholds[item.key]} onChange={e => setThresholds(prev => ({ ...prev, [item.key]: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]" />
              </div>
            ))}
          </div>
          <button onClick={() => alert('Thresholds saved (demo)')} className="w-full mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1e4d6b' }}>
            Save Thresholds
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Integrations
// ═══════════════════════════════════════════════════════════════════════════

function IntegrationsTab() {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Sensor Provider Integrations</h2>

      {/* Provider cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {iotSensorProviders.map(provider => {
          const config = iotSensorConfigs.find(c => c.providerSlug === provider.slug);
          return (
            <div key={provider.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: provider.color + '20' }}>
                    <Thermometer className="h-5 w-5" style={{ color: provider.color }} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{provider.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {authBadge(provider.authType)}
                      {connStatusBadge(provider.status)}
                    </div>
                  </div>
                </div>
                {provider.status !== 'available' ? (
                  <button onClick={() => alert(`Configure ${provider.name} integration (demo)`)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
                    Configure
                  </button>
                ) : (
                  <button onClick={() => alert(`Connect ${provider.name} — integration setup wizard (demo)`)} className="text-xs font-medium px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: '#1e4d6b' }}>
                    Connect
                  </button>
                )}
              </div>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1 mb-3">
                {provider.capabilities.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{c.replace(/_/g, ' ')}</span>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span><strong className="text-gray-700">{provider.sensorCount}</strong> sensors</span>
                {provider.rateLimitPerMin && <span>{provider.rateLimitPerMin} req/min limit</span>}
                {provider.lastSync ? <span>Last sync: {timeAgo(provider.lastSync)}</span> : <span className="text-gray-400">No syncs yet</span>}
              </div>

              {/* Config details for connected */}
              {config && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <div className="flex items-center gap-3">
                    {config.pollingIntervalMin > 0 ? (
                      <span>Polling: every {config.pollingIntervalMin} min</span>
                    ) : provider.authType === 'webhook' ? (
                      <span className="text-green-600">Real-time webhook</span>
                    ) : (
                      <span>Manual sync</span>
                    )}
                    <span>•</span>
                    <span>{config.autoLogCompliance ? 'Auto-log ON' : 'Auto-log OFF'}</span>
                    <span>•</span>
                    <span>{config.notificationChannels.join(', ')}</span>
                  </div>
                </div>
              )}

              <div className="mt-2 text-xs text-gray-400">{provider.pricingNote}</div>
            </div>
          );
        })}
      </div>

      {/* Ingestion log */}
      <h3 className="text-lg font-bold text-gray-900 mb-3">Ingestion Log</h3>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200" style={{ backgroundColor: '#f8fafc' }}>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Time</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Provider</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700">Method</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700">Sensors</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700">Readings</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700">Duration</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Details</th>
            </tr>
          </thead>
          <tbody>
            {iotIngestionLog.map(entry => (
              <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500">{formatTime(entry.timestamp)}</td>
                <td className="px-4 py-3 font-medium text-gray-700">{entry.provider}</td>
                <td className="px-4 py-3 text-center">{methodBadge(entry.method)}</td>
                <td className="px-4 py-3 text-center text-gray-700">{entry.sensorCount}</td>
                <td className="px-4 py-3 text-center text-gray-700">{entry.readingCount}</td>
                <td className="px-4 py-3 text-center text-gray-500">{entry.durationMs}ms</td>
                <td className="px-4 py-3 text-center">{logStatusBadge(entry.status)}</td>
                <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{entry.errorMessage || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Analytics
// ═══════════════════════════════════════════════════════════════════════════

function AnalyticsTab({ data }: { data: { coolerTotal: number; coolerInRange: number; byProvider: Record<string, number> } }) {
  // SVG temperature trend for cooler sensors (last 3 readings each)
  const coolerSensors = iotSensors.filter(s => s.zone.toLowerCase().includes('cooler') || s.zone.toLowerCase().includes('freezer') || s.zone.toLowerCase().includes('display') || s.zone.toLowerCase().includes('salad') || s.zone.toLowerCase().includes('beverage') || s.zone.toLowerCase().includes('blast') || s.zone.toLowerCase().includes('cold'));

  const trendColors = ['#1e4d6b', '#d4af37', '#ef4444', '#22c55e', '#7c3aed', '#ea580c', '#0891b2', '#dc2626', '#059669'];

  // Bar chart data for readings by provider
  const providerEntries = Object.entries(data.byProvider).sort((a, b) => b[1] - a[1]);
  const maxReadings = Math.max(...providerEntries.map(e => e[1]));

  // Anomaly count
  const anomalyCount = iotSensorReadings.filter(r => r.isAnomaly).length;
  const avgTemp = iotSensorReadings.filter(r => r.temperatureF > 0 && r.temperatureF < 100).reduce((sum, r) => sum + r.temperatureF, 0) / iotSensorReadings.filter(r => r.temperatureF > 0 && r.temperatureF < 100).length;
  const uptimePct = Math.round((iotSensors.filter(s => s.status === 'online').length / iotSensors.length) * 100);

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Readings (24h)', value: iotSensorReadings.length.toString(), icon: Database, color: '#1e4d6b' },
          { label: 'Avg Temperature', value: `${avgTemp.toFixed(1)}°F`, icon: Thermometer, color: '#d4af37' },
          { label: 'Compliance Rate', value: `${data.coolerTotal > 0 ? Math.round((data.coolerInRange / data.coolerTotal) * 100) : 0}%`, icon: Shield, color: '#22c55e' },
          { label: 'Fleet Uptime', value: `${uptimePct}%`, icon: Wifi, color: '#7c3aed' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className="h-4 w-4" style={{ color: item.color }} />
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temperature trend chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Cold Storage Temperature Trend</h3>
          <svg width="100%" height="200" viewBox="0 0 500 200" preserveAspectRatio="xMidYMid meet">
            {/* Grid lines */}
            {[0, 50, 100, 150, 200].map(y => (
              <line key={y} x1="40" y1={y} x2="490" y2={y} stroke="#f3f4f6" strokeWidth="1" />
            ))}
            {/* 41°F threshold line */}
            <line x1="40" y1="80" x2="490" y2="80" stroke="#ef4444" strokeWidth="1" strokeDasharray="4,4" />
            <text x="35" y="84" textAnchor="end" className="text-xs" fill="#ef4444">41°F</text>
            {/* Sensor lines */}
            {coolerSensors.slice(0, 6).map((sensor, si) => {
              const readings = iotSensorReadings.filter(r => r.sensorId === sensor.id).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              if (readings.length < 2) return null;
              const points = readings.map((r, ri) => {
                const x = 60 + (ri / (readings.length - 1)) * 400;
                const y = 190 - ((r.temperatureF + 10) / 60) * 180;
                return `${x},${Math.max(5, Math.min(195, y))}`;
              }).join(' ');
              return (
                <g key={sensor.id}>
                  <polyline points={points} fill="none" stroke={trendColors[si]} strokeWidth="2" strokeLinecap="round" />
                  <circle cx={parseFloat(points.split(' ').pop()!.split(',')[0])} cy={parseFloat(points.split(' ').pop()!.split(',')[1])} r="3" fill={trendColors[si]} />
                </g>
              );
            })}
          </svg>
          <div className="flex flex-wrap gap-3 mt-3">
            {coolerSensors.slice(0, 6).map((s, i) => (
              <div key={s.id} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: trendColors[i] }} />
                <span className="text-gray-600">{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance donut + anomaly count */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Cold Storage Compliance</h3>
          <div className="flex items-center justify-around">
            <DonutChart value={data.coolerInRange} total={data.coolerTotal} color="#22c55e" label="In Range" />
            <DonutChart value={data.coolerTotal - data.coolerInRange} total={data.coolerTotal} color="#ef4444" label="Out of Range" />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">Anomalies detected (24h)</span>
            <span className="font-bold text-red-600">{anomalyCount}</span>
          </div>
        </div>

        {/* Readings by provider */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Readings by Provider</h3>
          <div className="space-y-3">
            {providerEntries.map(([name, count]) => {
              const provider = iotSensorProviders.find(p => p.name === name);
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: provider?.color || '#999' }} />
                  <span className="text-sm text-gray-700 w-28 flex-shrink-0">{name}</span>
                  <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(count / maxReadings) * 100}%`, backgroundColor: provider?.color || '#999' }} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ingestion methods breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Ingestion Methods</h3>
          <div className="space-y-4">
            {[
              { method: 'Cloud-to-Cloud API Pull', icon: Cloud, color: '#2563eb', desc: 'SensorPush, Temp Stick, Testo, DeltaTrak', count: iotIngestionLog.filter(l => l.method === 'api_pull').length, readings: iotIngestionLog.filter(l => l.method === 'api_pull').reduce((s, l) => s + l.readingCount, 0) },
              { method: 'Webhook Push', icon: Zap, color: '#059669', desc: 'Monnit iMonnit platform', count: iotIngestionLog.filter(l => l.method === 'webhook').length, readings: iotIngestionLog.filter(l => l.method === 'webhook').reduce((s, l) => s + l.readingCount, 0) },
              { method: 'Bluetooth / Manual', icon: Bluetooth, color: '#0891b2', desc: 'Cooper-Atkins Blue2, ComplianceMate CSV', count: iotIngestionLog.filter(l => l.method === 'bluetooth' || l.method === 'manual').length, readings: iotIngestionLog.filter(l => l.method === 'bluetooth' || l.method === 'manual').reduce((s, l) => s + l.readingCount, 0) },
            ].map(item => (
              <div key={item.method} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.color + '15' }}>
                  <item.icon className="h-5 w-5" style={{ color: item.color }} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">{item.method}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                  <div className="text-xs text-gray-400 mt-1">{item.count} syncs • {item.readings} readings</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Settings
// ═══════════════════════════════════════════════════════════════════════════

function SettingsTab() {
  const [globalConfig, setGlobalConfig] = useState({
    highTempF: 41, lowTempF: -10, humidityHigh: 70, humidityLow: 20, batteryLowPct: 20,
    defaultPollingMin: 5, autoLogCompliance: true, dataRetentionDays: 90,
    emailNotifications: true, smsNotifications: false, pushNotifications: true,
  });

  const webhookUrl = 'https://api.evidly.com/v1/iot/webhook/ingest';

  return (
    <div className="max-w-4xl">
      <h2 className="text-lg font-bold text-gray-900 mb-6">IoT Sensor Settings</h2>

      <div className="space-y-6">
        {/* Webhook URL */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Webhook Ingestion Endpoint</h3>
          <p className="text-xs text-gray-500 mb-3">Configure your sensor platforms to push data to this URL. Include your API key in the X-API-Key header.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-mono text-gray-700 truncate">{webhookUrl}</code>
            <button onClick={() => { navigator.clipboard.writeText(webhookUrl).then(() => alert('Webhook URL copied to clipboard!')); }} className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
              <Copy className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <div className="mt-3 p-3 rounded-lg bg-gray-50">
            <p className="text-xs font-semibold text-gray-700 mb-1">Example Payload:</p>
            <pre className="text-xs text-gray-500 font-mono whitespace-pre">
{`POST ${webhookUrl}
X-API-Key: your-api-key
Content-Type: application/json

{
  "sensor_id": "SP:A4:3B:7C:12:F0",
  "temperature_f": 36.2,
  "humidity_pct": 45,
  "battery_pct": 87,
  "timestamp": "2026-02-10T14:58:12Z"
}`}</pre>
          </div>
        </div>

        {/* Global thresholds */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Default Alert Thresholds</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'High Temp (°F)', key: 'highTempF' as const },
              { label: 'Low Temp (°F)', key: 'lowTempF' as const },
              { label: 'Humidity High (%)', key: 'humidityHigh' as const },
              { label: 'Humidity Low (%)', key: 'humidityLow' as const },
              { label: 'Battery Low (%)', key: 'batteryLowPct' as const },
              { label: 'Default Poll (min)', key: 'defaultPollingMin' as const },
            ].map(item => (
              <div key={item.key}>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{item.label}</label>
                <input type="number" value={globalConfig[item.key]} onChange={e => setGlobalConfig(prev => ({ ...prev, [item.key]: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]" />
              </div>
            ))}
          </div>
        </div>

        {/* Auto-log + notifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Compliance & Notifications</h3>
          <div className="space-y-3">
            {[
              { label: 'Auto-log readings to compliance system', key: 'autoLogCompliance' as const },
              { label: 'Email notifications', key: 'emailNotifications' as const },
              { label: 'SMS notifications', key: 'smsNotifications' as const },
              { label: 'Push notifications', key: 'pushNotifications' as const },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${globalConfig[item.key] ? 'bg-[#1e4d6b]' : 'bg-gray-300'}`} onClick={() => setGlobalConfig(prev => ({ ...prev, [item.key]: !prev[item.key] }))}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${globalConfig[item.key] ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Data retention + export */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Data Management</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Data Retention (days)</label>
              <input type="number" value={globalConfig.dataRetentionDays} onChange={e => setGlobalConfig(prev => ({ ...prev, dataRetentionDays: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => alert('Export all sensor data as CSV (demo)')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 text-gray-700">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button onClick={() => alert('Export all sensor data as JSON (demo)')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 text-gray-700">
              <Download className="h-4 w-4" /> Export JSON
            </button>
            <button onClick={() => alert('Import sensor configuration from CSV (demo)')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 text-gray-700">
              <Upload className="h-4 w-4" /> Import Config
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={() => alert('Settings saved successfully (demo)')} className="px-6 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1e4d6b' }}>
            Save All Settings
          </button>
        </div>
      </div>
    </div>
  );
}
