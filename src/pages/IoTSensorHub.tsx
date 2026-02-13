import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import {
  Thermometer, Wifi, WifiOff, Battery, BatteryWarning, BatteryCharging,
  AlertTriangle, CheckCircle, XCircle, Clock, Activity, Settings as SettingsIcon,
  Radio, Signal, Cloud, CloudOff, Bluetooth, FileText, Download, Upload,
  Copy, RefreshCw, Zap, Eye, Bell, BellOff, ArrowUpRight, ArrowDownRight,
  Search, Filter, MoreHorizontal, ChevronDown, ChevronRight, LogOut,
  Layers, BarChart3, TrendingUp, Shield, Database, Link2, ExternalLink,
  X, Plus, ArrowLeft, Wrench, Pause, Trash2, Mail, Phone, ChevronLeft, ChevronUp,
} from 'lucide-react';
import {
  iotSensorProviders, iotSensors, iotSensorReadings, iotSensorAlerts,
  iotSensorConfigs, iotIngestionLog, iotMaintenanceLog,
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
  const [showWizard, setShowWizard] = useState(false);
  const [deviceDetailId, setDeviceDetailId] = useState<string | null>(null);

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
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1e4d6b' }}>
              <Thermometer className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-gray-900">Evid</span>
              <span className="text-lg font-bold" style={{ color: '#d4af37' }}>LY</span>
              <span className="text-gray-400 mx-1 hidden sm:inline">|</span>
              <span className="text-lg font-semibold text-gray-700 hidden sm:inline">IoT Sensor Hub</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-green-700">{onlineCount} sensors online</span>
            </div>
            {criticalAlerts > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                <span className="text-sm font-medium text-red-700">{criticalAlerts} critical</span>
              </div>
            )}
            <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white min-h-[44px]" style={{ backgroundColor: '#1e4d6b' }}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Sensor</span>
            </button>
            <button onClick={() => toast.info('Sign out clicked (demo)')} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6">
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
      <main className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6">
        {deviceDetailId ? (
          <DeviceDetailView sensorId={deviceDetailId} onBack={() => setDeviceDetailId(null)} />
        ) : (
          <>
            {activeTab === 'monitor' && <LiveMonitorTab sensors={sortedSensors} selectedSensor={selectedSensor} setSelectedSensor={setSelectedSensor} onlineCount={onlineCount} warningCount={warningCount} criticalAlerts={criticalAlerts} totalReadingsToday={totalReadingsToday} onViewDetail={setDeviceDetailId} />}
            {activeTab === 'fleet' && <SensorFleetTab sensors={filteredFleet} search={fleetSearch} setSearch={setFleetSearch} locationFilter={fleetLocationFilter} setLocationFilter={setFleetLocationFilter} providerFilter={fleetProviderFilter} setProviderFilter={setFleetProviderFilter} statusFilter={fleetStatusFilter} setStatusFilter={setFleetStatusFilter} locations={locations} providerSlugs={providerSlugs} onViewDetail={setDeviceDetailId} />}
            {activeTab === 'alerts' && <AlertsTab />}
            {activeTab === 'integrations' && <IntegrationsTab onOpenWizard={() => setShowWizard(true)} />}
            {activeTab === 'analytics' && <AnalyticsTab data={analyticsData} />}
            {activeTab === 'settings' && <SettingsTab />}
          </>
        )}
      </main>

      {/* Setup Wizard Modal */}
      {showWizard && <SetupWizardModal onClose={() => setShowWizard(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Live Monitor
// ═══════════════════════════════════════════════════════════════════════════

function LiveMonitorTab({ sensors, selectedSensor, setSelectedSensor, onlineCount, warningCount, criticalAlerts, totalReadingsToday, onViewDetail }: {
  sensors: IoTSensor[]; selectedSensor: string | null; setSelectedSensor: (id: string | null) => void;
  onlineCount: number; warningCount: number; criticalAlerts: number; totalReadingsToday: number;
  onViewDetail: (id: string) => void;
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

      <div className="flex flex-col lg:flex-row gap-6">
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
                    <span className="text-xl sm:text-3xl font-bold" style={{ color: tempColor(sensor.currentTempF, sensor.zone) }}>{sensor.currentTempF.toFixed(1)}</span>
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
          <div className="w-full lg:w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sm:p-5 sticky top-24 h-fit">
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
            <button onClick={() => onViewDetail(selected!.id)} className="w-full mb-4 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1e4d6b' }}>
              View Full Detail
            </button>
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

function SensorFleetTab({ sensors, search, setSearch, locationFilter, setLocationFilter, providerFilter, setProviderFilter, statusFilter, setStatusFilter, locations, providerSlugs, onViewDetail }: {
  sensors: IoTSensor[]; search: string; setSearch: (v: string) => void;
  locationFilter: string; setLocationFilter: (v: string) => void;
  providerFilter: string; setProviderFilter: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  locations: string[]; providerSlugs: string[];
  onViewDetail: (id: string) => void;
}) {
  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sensors..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]" />
        </div>
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white">
          <option value="all">All Locations</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white">
          <option value="all">All Providers</option>
          {providerSlugs.map(s => <option key={s} value={s}>{iotSensorProviders.find(p => p.slug === s)?.name || s}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white">
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="warning">Warning</option>
          <option value="offline">Offline</option>
          <option value="error">Error</option>
        </select>
        <button onClick={() => toast.info('Bulk actions: Export, Update, Recalibrate (demo)')} className="px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1e4d6b' }}>
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
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Provider</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">MAC Address</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Zone</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Temp</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Battery</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Signal</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Last Seen</th>
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
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: provider?.color }} />
                        <span className="text-gray-700">{provider?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 hidden lg:table-cell">{sensor.macAddress}</td>
                    <td className="px-4 py-3 text-gray-700 hidden md:table-cell">{sensor.locationName}</td>
                    <td className="px-4 py-3 hidden sm:table-cell"><span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>{sensor.zone}</span></td>
                    <td className="px-4 py-3 text-center">
                      {sensor.status !== 'offline' ? (
                        <span className="font-bold" style={{ color: tempColor(sensor.currentTempF, sensor.zone) }}>{sensor.currentTempF.toFixed(1)}°F</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="flex justify-center"><BatteryBar pct={sensor.batteryPct} /></div></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><div className="flex justify-center">{sensor.signalRssi !== 0 ? <SignalBars rssi={sensor.signalRssi} /> : <span className="text-gray-400">—</span>}</div></td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: statusColor(sensor.status) + '20', color: statusColor(sensor.status) }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor(sensor.status) }} />
                        {sensor.status.charAt(0).toUpperCase() + sensor.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{timeAgo(sensor.lastSeenAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => onViewDetail(sensor.id)} className="text-gray-400 hover:text-[#1e4d6b]" title="View detail"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => toast.info(`Configure ${sensor.name} (demo)`)} className="text-gray-400 hover:text-[#1e4d6b]" title="Configure"><MoreHorizontal className="h-4 w-4" /></button>
                      </div>
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
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Alerts list */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-bold text-gray-900">Active Alerts ({iotSensorAlerts.filter(a => !a.acknowledged).length})</h2>
          <button onClick={() => toast.success('All alerts acknowledged (demo)')} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1e4d6b' }}>
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
                  <button onClick={() => toast.success(`Acknowledged alert for ${alert.sensorName}`)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0">
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Threshold configuration */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 sticky top-24">
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
          <button onClick={() => toast.success('Thresholds saved (demo)')} className="w-full mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1e4d6b' }}>
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

function IntegrationsTab({ onOpenWizard }: { onOpenWizard: () => void }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Sensor Provider Integrations</h2>

      {/* Provider cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {iotSensorProviders.map(provider => {
          const config = iotSensorConfigs.find(c => c.providerSlug === provider.slug);
          return (
            <div key={provider.id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
              <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
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
                  <button onClick={() => toast.info(`Configure ${provider.name} integration (demo)`)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
                    Configure
                  </button>
                ) : (
                  <button onClick={onOpenWizard} className="text-xs font-medium px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: '#1e4d6b' }}>
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
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200" style={{ backgroundColor: '#f8fafc' }}>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Time</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Provider</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700">Method</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Sensors</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700">Readings</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Duration</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Details</th>
            </tr>
          </thead>
          <tbody>
            {iotIngestionLog.map(entry => (
              <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500">{formatTime(entry.timestamp)}</td>
                <td className="px-4 py-3 font-medium text-gray-700">{entry.provider}</td>
                <td className="px-4 py-3 text-center">{methodBadge(entry.method)}</td>
                <td className="px-4 py-3 text-center text-gray-700 hidden sm:table-cell">{entry.sensorCount}</td>
                <td className="px-4 py-3 text-center text-gray-700">{entry.readingCount}</td>
                <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">{entry.durationMs}ms</td>
                <td className="px-4 py-3 text-center">{logStatusBadge(entry.status)}</td>
                <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate hidden md:table-cell">{entry.errorMessage || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Temperature trend chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
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
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const [globalConfig, setGlobalConfig] = useState({
    highTempF: 41, lowTempF: -10, humidityHigh: 70, humidityLow: 20, batteryLowPct: 20,
    defaultPollingMin: 5, autoLogCompliance: true, dataRetentionDays: 90,
    emailNotifications: true, smsNotifications: false, pushNotifications: true,
  });

  const webhookUrl = 'https://api.evidly.com/v1/iot/webhook/ingest';

  return (
    <>
    <div className="max-w-4xl">
      <h2 className="text-lg font-bold text-gray-900 mb-6">IoT Sensor Settings</h2>

      <div className="space-y-6">
        {/* Webhook URL */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Webhook Ingestion Endpoint</h3>
          <p className="text-xs text-gray-500 mb-3">Configure your sensor platforms to push data to this URL. Include your API key in the X-API-Key header.</p>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <code className="flex-1 min-w-0 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-mono text-gray-700 truncate">{webhookUrl}</code>
            <button onClick={() => { navigator.clipboard.writeText(webhookUrl).then(() => toast.success('Webhook URL copied to clipboard')); }} className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Default Alert Thresholds</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Data Management</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Data Retention (days)</label>
              <input type="number" value={globalConfig.dataRetentionDays} onChange={e => setGlobalConfig(prev => ({ ...prev, dataRetentionDays: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => guardAction('export', 'sensor data', () => toast.info('Export sensor data as CSV (demo)'))} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 text-gray-700">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button onClick={() => guardAction('export', 'sensor data', () => toast.info('Export sensor data as JSON (demo)'))} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 text-gray-700">
              <Download className="h-4 w-4" /> Export JSON
            </button>
            <button onClick={() => toast.info('Import sensor config from CSV (demo)')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 text-gray-700">
              <Upload className="h-4 w-4" /> Import Config
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={() => guardAction('settings', 'sensor settings', () => toast.success('Settings saved (demo)'))} className="px-6 py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1e4d6b' }}>
            Save All Settings
          </button>
        </div>
      </div>
    </div>
    {showUpgrade && (
      <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
    )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5-Step Integration Setup Wizard
// ═══════════════════════════════════════════════════════════════════════════

type WizardStep = 1 | 2 | 3 | 4 | 5;

const WIZARD_STEPS = [
  { step: 1 as const, label: 'Select Brand' },
  { step: 2 as const, label: 'Authenticate' },
  { step: 3 as const, label: 'Thresholds' },
  { step: 4 as const, label: 'Alerts' },
  { step: 5 as const, label: 'Frequency' },
];

const WIZARD_SENSORS = [
  { id: 'ws-1', name: 'Walk-in Cooler Sensor A', macAddress: 'SP:B2:4C:8D:1E:A3', model: 'SensorPush HT.w', lastReading: 37.2, selected: false },
  { id: 'ws-2', name: 'Walk-in Cooler Sensor B', macAddress: 'SP:B2:4C:8D:1E:A4', model: 'SensorPush HT.w', lastReading: 38.1, selected: false },
  { id: 'ws-3', name: 'Prep Area Humidity', macAddress: 'SP:C3:5D:9E:2F:B5', model: 'SensorPush HTP.xw', lastReading: 66.8, selected: false },
];

function SetupWizardModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'oauth' | 'apikey' | 'webhook' | ''>('');
  const [apiKey, setApiKey] = useState('');
  const [thresholds, setThresholds] = useState({ highTempF: 41, lowTempF: 0, humidityHigh: 70, humidityLow: 20, batteryLowPct: 20 });
  const [zone, setZone] = useState('cold_holding');
  const [jurisdiction, setJurisdiction] = useState('fda');
  const [alertRecipients, setAlertRecipients] = useState('manager@example.com');
  const [alertMethods, setAlertMethods] = useState({ email: true, sms: false, push: true });
  const [escalationMinutes, setEscalationMinutes] = useState(15);
  const [pollingInterval, setPollingInterval] = useState(5);
  const [discoveredSensors, setDiscoveredSensors] = useState(WIZARD_SENSORS);

  const selectedProv = iotSensorProviders.find(p => p.slug === selectedProvider);

  const canNext = () => {
    if (step === 1) return !!selectedProvider;
    if (step === 2) return selectedProvider === 'sensorpush' || (apiKey.length > 0);
    return true;
  };

  const zoneThresholds: Record<string, { highTempF: number; lowTempF: number; label: string }> = {
    cold_holding: { highTempF: 41, lowTempF: 32, label: 'Cold Holding (FDA: ≤41°F)' },
    frozen_storage: { highTempF: 0, lowTempF: -20, label: 'Frozen Storage (FDA: ≤0°F)' },
    hot_holding: { highTempF: 200, lowTempF: 135, label: 'Hot Holding (FDA: ≥135°F)' },
    dry_storage: { highTempF: 75, lowTempF: 50, label: 'Dry Storage (FDA: ≤75°F)' },
    receiving: { highTempF: 41, lowTempF: 32, label: 'Receiving / Cold Chain (FDA: ≤41°F)' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" style={F}>
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add New Sensor Integration</h2>
            <p className="text-xs text-gray-500">Step {step} of 5 — {WIZARD_STEPS[step - 1].label}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {/* Step indicators */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
          {WIZARD_STEPS.map(s => (
            <div key={s.step} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${s.step < step ? 'bg-green-500 text-white' : s.step === step ? 'text-white' : 'bg-gray-200 text-gray-500'}`} style={s.step === step ? { backgroundColor: '#1e4d6b' } : undefined}>
                {s.step < step ? <CheckCircle className="h-4 w-4" /> : s.step}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${s.step === step ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
              {s.step < 5 && <div className="flex-1 h-0.5 rounded bg-gray-200"><div className="h-full rounded" style={{ width: s.step < step ? '100%' : '0%', backgroundColor: '#1e4d6b' }} /></div>}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {/* Step 1: Select Brand */}
          {step === 1 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Select Sensor Brand</h3>
              <p className="text-xs text-gray-500 mb-4">Choose the sensor platform you want to connect to EvidLY.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {iotSensorProviders.map(p => (
                  <button key={p.slug} onClick={() => { setSelectedProvider(p.slug); setAuthMethod(p.authType as any); }} className={`p-4 rounded-xl border text-left transition-all ${selectedProvider === p.slug ? 'border-[#1e4d6b] ring-2 ring-[#1e4d6b]/20 bg-[#eef4f8]' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
                        <Thermometer className="h-4 w-4" style={{ color: p.color }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.authType === 'oauth' ? 'OAuth 2.0' : p.authType === 'apikey' ? 'API Key' : p.authType === 'webhook' ? 'Webhook' : p.authType === 'bluetooth' ? 'Bluetooth' : 'CSV Import'}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {p.capabilities.slice(0, 3).map(c => (
                        <span key={c} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">{c.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Authenticate */}
          {step === 2 && selectedProv && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Authenticate with {selectedProv.name}</h3>
              <p className="text-xs text-gray-500 mb-4">Connect your {selectedProv.name} account to start pulling sensor data.</p>

              {selectedProv.authType === 'oauth' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Shield className="h-5 w-5 text-purple-600" /></div>
                      <div>
                        <div className="text-sm font-semibold text-purple-900">OAuth 2.0 Authorization</div>
                        <div className="text-xs text-purple-600">Secure token-based authentication</div>
                      </div>
                    </div>
                    <p className="text-xs text-purple-700 mb-3">Clicking "Authorize" will redirect you to {selectedProv.name}'s login page. After granting access, you'll be redirected back to EvidLY.</p>
                    <button onClick={() => toast.info(`OAuth redirect to ${selectedProv.name} (demo)`)} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700">
                      Authorize with {selectedProv.name}
                    </button>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Demo: Authorization simulated successfully</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">Access token received. Refresh token stored securely.</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Discovered Sensors ({discoveredSensors.length})</h4>
                    <div className="space-y-2">
                      {discoveredSensors.map(s => (
                        <label key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={s.selected} onChange={() => setDiscoveredSensors(prev => prev.map(x => x.id === s.id ? { ...x, selected: !x.selected } : x))} className="rounded border-gray-300" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{s.name}</div>
                            <div className="text-xs text-gray-500">{s.model} • {s.macAddress}</div>
                          </div>
                          {s.lastReading !== null && <span className="text-sm font-bold" style={{ color: '#1e4d6b' }}>{s.lastReading}°F</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedProv.authType === 'apikey' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Link2 className="h-5 w-5 text-blue-600" /></div>
                      <div>
                        <div className="text-sm font-semibold text-blue-900">API Key Authentication</div>
                        <div className="text-xs text-blue-600">Enter your {selectedProv.name} API key</div>
                      </div>
                    </div>
                    <p className="text-xs text-blue-700 mb-3">Find your API key in your {selectedProv.name} account settings under "API Access" or "Integrations".</p>
                    <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={`Enter ${selectedProv.name} API key...`} className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                  {apiKey && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">API key validated successfully (demo)</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(selectedProv.authType === 'webhook' || selectedProv.authType === 'bluetooth' || selectedProv.authType === 'csv') && (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                      {selectedProv.authType === 'webhook' ? <Zap className="h-5 w-5 text-green-600" /> : selectedProv.authType === 'bluetooth' ? <Bluetooth className="h-5 w-5 text-cyan-600" /> : <FileText className="h-5 w-5 text-gray-600" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{selectedProv.authType === 'webhook' ? 'Webhook Configuration' : selectedProv.authType === 'bluetooth' ? 'Bluetooth Pairing' : 'CSV Import Setup'}</div>
                      <div className="text-xs text-gray-500">{selectedProv.authType === 'webhook' ? 'Configure your webhook endpoint in ' + selectedProv.name : selectedProv.authType === 'bluetooth' ? 'Pair via the EvidLY mobile app' : 'Upload CSV files from ' + selectedProv.name}</div>
                    </div>
                  </div>
                  {selectedProv.authType === 'webhook' && (
                    <div className="mt-3">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Your Webhook URL</label>
                      <code className="block px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-mono text-gray-700">https://api.evidly.com/v1/iot/webhook/{selectedProv.slug}/ingest</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Configure Thresholds */}
          {step === 3 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Configure Compliance Thresholds</h3>
              <p className="text-xs text-gray-500 mb-4">Set temperature and humidity limits based on your kitchen zone and jurisdiction requirements.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Kitchen Zone</label>
                  <select value={zone} onChange={e => { setZone(e.target.value); const z = zoneThresholds[e.target.value]; if (z) setThresholds(prev => ({ ...prev, highTempF: z.highTempF, lowTempF: z.lowTempF })); }} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                    {Object.entries(zoneThresholds).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Jurisdiction</label>
                  <select value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                    <option value="fda">FDA Food Code (Federal)</option>
                    <option value="california">California CRFC</option>
                    <option value="new_york">New York State Sanitary Code</option>
                    <option value="texas">Texas DSHS</option>
                  </select>
                </div>
              </div>

              {/* Threshold visualization bar */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h4 className="text-xs font-semibold text-gray-700 mb-3">Temperature Threshold Range</h4>
                <div className="relative h-8 rounded-lg overflow-hidden bg-gradient-to-r from-blue-400 via-green-400 to-red-400 mb-2">
                  {zone !== 'hot_holding' ? (
                    <>
                      <div className="absolute inset-y-0 left-0 bg-blue-100/80" style={{ width: `${Math.max(0, (thresholds.lowTempF + 20) / 80 * 100)}%` }} />
                      <div className="absolute inset-y-0 bg-red-100/80" style={{ left: `${Math.max(0, (thresholds.highTempF + 20) / 80 * 100)}%`, right: 0 }} />
                      <div className="absolute inset-y-0 border-l-2 border-dashed border-red-600" style={{ left: `${Math.max(0, (thresholds.highTempF + 20) / 80 * 100)}%` }}>
                        <span className="absolute -top-5 -translate-x-1/2 text-xs font-bold text-red-600">{thresholds.highTempF}°F</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-y-0 right-0 bg-blue-100/80" style={{ width: `${100 - (thresholds.lowTempF / 200 * 100)}%` }} />
                      <div className="absolute inset-y-0 border-l-2 border-dashed border-red-600" style={{ left: `${thresholds.lowTempF / 200 * 100}%` }}>
                        <span className="absolute -top-5 -translate-x-1/2 text-xs font-bold text-red-600">{thresholds.lowTempF}°F</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{zone === 'hot_holding' ? '0°F' : '-20°F'}</span>
                  <span className="font-medium text-green-600">Safe Zone</span>
                  <span>{zone === 'hot_holding' ? '200°F' : '60°F'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">High Temp Alert (°F)</label>
                  <input type="number" value={thresholds.highTempF} onChange={e => setThresholds(prev => ({ ...prev, highTempF: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Low Temp Alert (°F)</label>
                  <input type="number" value={thresholds.lowTempF} onChange={e => setThresholds(prev => ({ ...prev, lowTempF: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Humidity High (%)</label>
                  <input type="number" value={thresholds.humidityHigh} onChange={e => setThresholds(prev => ({ ...prev, humidityHigh: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Battery Low (%)</label>
                  <input type="number" value={thresholds.batteryLowPct} onChange={e => setThresholds(prev => ({ ...prev, batteryLowPct: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20" />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Configure Alerts */}
          {step === 4 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Configure Alert Notifications</h3>
              <p className="text-xs text-gray-500 mb-4">Set up who gets notified and how when thresholds are exceeded.</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Alert Recipients</label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <input type="text" value={alertRecipients} onChange={e => setAlertRecipients(e.target.value)} placeholder="email@example.com, another@example.com" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Comma-separated email addresses</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Notification Methods</label>
                  <div className="flex gap-3">
                    {[
                      { key: 'email' as const, label: 'Email', icon: Mail },
                      { key: 'sms' as const, label: 'SMS', icon: Phone },
                      { key: 'push' as const, label: 'Push', icon: Bell },
                    ].map(m => (
                      <button key={m.key} onClick={() => setAlertMethods(prev => ({ ...prev, [m.key]: !prev[m.key] }))} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${alertMethods[m.key] ? 'border-[#1e4d6b] bg-[#eef4f8] text-[#1e4d6b]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        <m.icon className="h-4 w-4" /> {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Escalation Timer (minutes)</label>
                  <p className="text-xs text-gray-400 mb-2">If alert is not acknowledged within this time, escalate to secondary contacts.</p>
                  <div className="flex flex-wrap items-center gap-3">
                    {[5, 10, 15, 30, 60].map(m => (
                      <button key={m} onClick={() => setEscalationMinutes(m)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${escalationMinutes === m ? 'border-[#1e4d6b] bg-[#eef4f8] text-[#1e4d6b]' : 'border-gray-200 text-gray-500'}`}>
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-800">Critical alerts are never snoozed</span>
                  </div>
                  <p className="text-xs text-amber-700">Temperature violations above +5°F over threshold will bypass snooze and always send immediate notifications.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Set Reading Frequency */}
          {step === 5 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Set Reading Frequency</h3>
              <p className="text-xs text-gray-500 mb-4">How often should EvidLY pull readings from this sensor platform?</p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { min: 1, label: '1 min', desc: 'Maximum frequency', note: 'SensorPush rate limit: 1/min' },
                    { min: 5, label: '5 min', desc: 'Recommended', note: 'Good balance of freshness and API usage' },
                    { min: 15, label: '15 min', desc: 'Standard', note: 'Matches most health department requirements' },
                    { min: 30, label: '30 min', desc: 'Conservative', note: 'Lower API usage, still within compliance' },
                    { min: 60, label: '60 min', desc: 'Minimum', note: 'Bare minimum for compliance logging' },
                  ].map(opt => (
                    <button key={opt.min} onClick={() => setPollingInterval(opt.min)} className={`p-3 rounded-xl border text-left transition-all ${pollingInterval === opt.min ? 'border-[#1e4d6b] ring-2 ring-[#1e4d6b]/20 bg-[#eef4f8]' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="text-lg font-bold" style={{ color: pollingInterval === opt.min ? '#1e4d6b' : '#111827' }}>{opt.label}</div>
                      <div className="text-xs font-medium text-gray-700">{opt.desc}</div>
                      <div className="text-xs text-gray-400 mt-1">{opt.note}</div>
                    </button>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Estimated API Usage</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-gray-900">{Math.round(1440 / pollingInterval)}</div>
                      <div className="text-xs text-gray-500">calls/day</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">{Math.round(1440 / pollingInterval * 30)}</div>
                      <div className="text-xs text-gray-500">calls/month</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold" style={{ color: '#22c55e' }}>
                        {pollingInterval <= 5 ? 'High' : pollingInterval <= 15 ? 'Medium' : 'Low'}
                      </div>
                      <div className="text-xs text-gray-500">data freshness</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <h4 className="text-xs font-semibold text-green-800 mb-2">Integration Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-green-700">Provider:</div><div className="font-medium text-green-900">{selectedProv?.name || 'Not selected'}</div>
                    <div className="text-green-700">Zone:</div><div className="font-medium text-green-900">{zoneThresholds[zone]?.label || zone}</div>
                    <div className="text-green-700">High Temp:</div><div className="font-medium text-green-900">{thresholds.highTempF}°F</div>
                    <div className="text-green-700">Polling:</div><div className="font-medium text-green-900">Every {pollingInterval} min</div>
                    <div className="text-green-700">Alerts:</div><div className="font-medium text-green-900">{[alertMethods.email && 'Email', alertMethods.sms && 'SMS', alertMethods.push && 'Push'].filter(Boolean).join(', ')}</div>
                    <div className="text-green-700">Escalation:</div><div className="font-medium text-green-900">{escalationMinutes} min</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button onClick={() => step > 1 ? setStep((step - 1) as WizardStep) : onClose()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200">
            <ChevronLeft className="h-4 w-4" /> {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 5 ? (
            <button disabled={!canNext()} onClick={() => setStep((step + 1) as WizardStep)} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#1e4d6b' }}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={() => { toast.success('Integration configured, syncing shortly'); onClose(); }} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#22c55e' }}>
              <CheckCircle className="h-4 w-4" /> Complete Setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Device Detail View
// ═══════════════════════════════════════════════════════════════════════════

function DeviceDetailView({ sensorId, onBack }: { sensorId: string; onBack: () => void }) {
  const sensor = iotSensors.find(s => s.id === sensorId);
  if (!sensor) return <div className="text-center py-12 text-gray-500">Sensor not found</div>;

  const provider = iotSensorProviders.find(p => p.slug === sensor.providerSlug);
  const readings = iotSensorReadings.filter(r => r.sensorId === sensorId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const alerts = iotSensorAlerts.filter(a => a.sensorId === sensorId);
  const maintenance = iotMaintenanceLog.filter(m => m.sensorId === sensorId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;

  // Determine zone thresholds for chart
  const isHot = sensor.zone.toLowerCase().includes('hot') || sensor.zone.toLowerCase().includes('grill');
  const isFreezer = sensor.zone.toLowerCase().includes('freezer');
  const thresholdMax = isHot ? null : isFreezer ? 0 : 41;
  const thresholdMin = isHot ? 135 : null;

  // SVG 24h chart
  const chartW = 600;
  const chartH = 180;
  const chartPadL = 45;
  const chartPadR = 15;
  const chartPadT = 20;
  const chartPadB = 25;
  const plotW = chartW - chartPadL - chartPadR;
  const plotH = chartH - chartPadT - chartPadB;

  const temps = readings.map(r => r.temperatureF);
  const minTemp = Math.min(...temps, thresholdMin ?? Infinity, -5);
  const maxTemp = Math.max(...temps, thresholdMax ?? -Infinity, 50);
  const tempRange = maxTemp - minTemp || 1;

  const toY = (t: number) => chartPadT + plotH - ((t - minTemp) / tempRange) * plotH;
  const toX = (i: number) => chartPadL + (i / Math.max(readings.length - 1, 1)) * plotW;

  const linePoints = readings.map((_, i) => `${toX(i)},${toY(readings[i].temperatureF)}`).join(' ');

  // Compliance zone shading
  const threshMaxY = thresholdMax !== null ? toY(thresholdMax) : null;
  const threshMinY = thresholdMin !== null ? toY(thresholdMin) : null;

  const maintTypeIcon = (type: string) => {
    switch (type) {
      case 'battery_replacement': return <BatteryCharging className="h-3.5 w-3.5 text-amber-600" />;
      case 'calibration': return <Activity className="h-3.5 w-3.5 text-blue-600" />;
      case 'relocation': return <ArrowUpRight className="h-3.5 w-3.5 text-purple-600" />;
      case 'firmware_update': return <RefreshCw className="h-3.5 w-3.5 text-green-600" />;
      default: return <FileText className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  const maintTypeBg = (type: string) => {
    switch (type) {
      case 'battery_replacement': return '#fffbeb';
      case 'calibration': return '#eff6ff';
      case 'relocation': return '#faf5ff';
      case 'firmware_update': return '#ecfdf5';
      default: return '#f9fafb';
    }
  };

  return (
    <div>
      {/* Back button + sensor name */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 min-h-[44px]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColor(sensor.status) }} />
          <h1 className="text-xl font-bold text-gray-900">{sensor.name}</h1>
          <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>{sensor.zone}</span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{sensor.locationName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Current reading + chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current reading */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div>
                <div className="text-sm text-gray-500 mb-1">Current Temperature</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-5xl font-bold" style={{ color: tempColor(sensor.currentTempF, sensor.zone) }}>{sensor.currentTempF.toFixed(1)}</span>
                  <span className="text-xl text-gray-400">°F</span>
                </div>
                {sensor.currentHumidity !== null && (
                  <div className="text-sm text-gray-500 mt-1">{sensor.currentHumidity}% relative humidity</div>
                )}
              </div>
              <div className="text-right">
                {latestReading && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${latestReading.complianceStatus === 'in_range' ? 'bg-green-100 text-green-700' : latestReading.complianceStatus === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {latestReading.complianceStatus === 'in_range' ? 'IN RANGE' : latestReading.complianceStatus === 'warning' ? 'WARNING' : 'VIOLATION'}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <BatteryBar pct={sensor.batteryPct} />
                  {sensor.signalRssi !== 0 && <SignalBars rssi={sensor.signalRssi} />}
                </div>
                <div className="text-xs text-gray-400 mt-2">Last seen: {timeAgo(sensor.lastSeenAt)}</div>
              </div>
            </div>

            {/* Threshold visualization bar */}
            {latestReading?.thresholdApplied && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Threshold: {latestReading.thresholdApplied.rule.replace(/_/g, ' ')}</span>
                  <span>{thresholdMax !== null ? `Max ${thresholdMax}°F` : ''}{thresholdMin !== null ? `Min ${thresholdMin}°F` : ''}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden bg-gray-100 relative">
                  {thresholdMax !== null && (
                    <>
                      <div className="absolute inset-y-0 left-0 rounded-l-full bg-green-200" style={{ width: `${Math.min(100, (thresholdMax / (thresholdMax + 20)) * 100)}%` }} />
                      <div className="absolute inset-y-0 rounded-r-full bg-red-200" style={{ left: `${Math.min(100, (thresholdMax / (thresholdMax + 20)) * 100)}%`, right: 0 }} />
                      <div className="absolute inset-y-0 w-1 bg-gray-800" style={{ left: `${Math.min(100, Math.max(0, (sensor.currentTempF / (thresholdMax + 20)) * 100))}%` }} title={`Current: ${sensor.currentTempF}°F`} />
                    </>
                  )}
                  {thresholdMin !== null && (
                    <>
                      <div className="absolute inset-y-0 right-0 rounded-r-full bg-green-200" style={{ width: `${100 - Math.min(100, (thresholdMin / 200) * 100)}%` }} />
                      <div className="absolute inset-y-0 left-0 rounded-l-full bg-red-200" style={{ width: `${Math.min(100, (thresholdMin / 200) * 100)}%` }} />
                      <div className="absolute inset-y-0 w-1 bg-gray-800" style={{ left: `${Math.min(100, Math.max(0, (sensor.currentTempF / 200) * 100))}%` }} title={`Current: ${sensor.currentTempF}°F`} />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 24h temperature chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Temperature History</h3>
            <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="xMidYMid meet">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                const y = chartPadT + pct * plotH;
                const tempVal = maxTemp - pct * tempRange;
                return (
                  <g key={pct}>
                    <line x1={chartPadL} y1={y} x2={chartW - chartPadR} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                    <text x={chartPadL - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{Math.round(tempVal)}°</text>
                  </g>
                );
              })}

              {/* Compliance zone shading — green for safe zone */}
              {threshMaxY !== null && (
                <rect x={chartPadL} y={threshMaxY} width={plotW} height={chartPadT + plotH - threshMaxY} fill="#dcfce7" opacity="0.4" />
              )}
              {threshMinY !== null && (
                <rect x={chartPadL} y={chartPadT} width={plotW} height={threshMinY - chartPadT} fill="#dcfce7" opacity="0.4" />
              )}

              {/* Threshold line */}
              {threshMaxY !== null && (
                <>
                  <line x1={chartPadL} y1={threshMaxY} x2={chartW - chartPadR} y2={threshMaxY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6,3" />
                  <text x={chartW - chartPadR + 2} y={threshMaxY + 4} fontSize="10" fill="#ef4444">{thresholdMax}°F</text>
                </>
              )}
              {threshMinY !== null && (
                <>
                  <line x1={chartPadL} y1={threshMinY} x2={chartW - chartPadR} y2={threshMinY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6,3" />
                  <text x={chartW - chartPadR + 2} y={threshMinY + 4} fontSize="10" fill="#ef4444">{thresholdMin}°F</text>
                </>
              )}

              {/* Data line */}
              {readings.length >= 2 && <polyline points={linePoints} fill="none" stroke="#1e4d6b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}

              {/* Data points */}
              {readings.map((r, i) => (
                <circle key={i} cx={toX(i)} cy={toY(r.temperatureF)} r={r.isAnomaly ? 5 : 3} fill={r.isAnomaly ? '#ef4444' : r.complianceStatus === 'violation' ? '#ef4444' : r.complianceStatus === 'warning' ? '#f59e0b' : '#1e4d6b'} stroke="white" strokeWidth="1.5">
                  <title>{formatTime(r.timestamp)}: {r.temperatureF.toFixed(1)}°F ({r.complianceStatus})</title>
                </circle>
              ))}

              {/* Time labels */}
              {readings.map((r, i) => (
                i % Math.max(1, Math.floor(readings.length / 3)) === 0 && (
                  <text key={i} x={toX(i)} y={chartH - 5} textAnchor="middle" fontSize="9" fill="#9ca3af">{formatTime(r.timestamp)}</text>
                )
              ))}
            </svg>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#1e4d6b] rounded" />Temperature</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-500 rounded" style={{ borderTop: '1px dashed #ef4444' }} />Threshold</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-200" />Safe zone</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Anomaly</div>
            </div>
          </div>

          {/* Reading history table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Reading History</h3>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100" style={{ backgroundColor: '#f8fafc' }}>
                  <th className="text-left px-4 py-2 font-semibold text-gray-600 text-xs">Time</th>
                  <th className="text-center px-4 py-2 font-semibold text-gray-600 text-xs">Temp</th>
                  <th className="text-center px-4 py-2 font-semibold text-gray-600 text-xs hidden sm:table-cell">Humidity</th>
                  <th className="text-center px-4 py-2 font-semibold text-gray-600 text-xs hidden sm:table-cell">Battery</th>
                  <th className="text-center px-4 py-2 font-semibold text-gray-600 text-xs hidden md:table-cell">Quality</th>
                  <th className="text-center px-4 py-2 font-semibold text-gray-600 text-xs">Compliance</th>
                </tr>
              </thead>
              <tbody>
                {[...readings].reverse().map((r, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${r.isAnomaly ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-2 text-xs text-gray-500">{formatTime(r.timestamp)}</td>
                    <td className="px-4 py-2 text-center font-bold" style={{ color: tempColor(r.temperatureF, sensor.zone) }}>{r.temperatureF.toFixed(1)}°F</td>
                    <td className="px-4 py-2 text-center text-gray-500 hidden sm:table-cell">{r.humidityPct !== null ? `${r.humidityPct}%` : '—'}</td>
                    <td className="px-4 py-2 hidden sm:table-cell"><div className="flex justify-center"><BatteryBar pct={r.batteryPct} /></div></td>
                    <td className="px-4 py-2 text-center hidden md:table-cell">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${r.quality === 'good' ? 'bg-green-100 text-green-700' : r.quality === 'suspect' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{r.quality}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${r.complianceStatus === 'in_range' ? 'bg-green-100 text-green-700' : r.complianceStatus === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {r.complianceStatus === 'in_range' ? 'In Range' : r.complianceStatus === 'warning' ? 'Warning' : 'Violation'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* RIGHT: Device info + maintenance + actions */}
        <div className="space-y-6">
          {/* Device info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Device Information</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Provider', value: provider?.name || '—' },
                { label: 'Model', value: sensor.sensorType },
                { label: 'MAC Address', value: sensor.macAddress, mono: true },
                { label: 'Firmware', value: sensor.firmware },
                { label: 'Location', value: sensor.locationName },
                { label: 'Zone', value: sensor.zone },
                { label: 'Status', value: sensor.status, color: statusColor(sensor.status) },
                { label: 'Battery', value: `${sensor.batteryPct}%` },
                { label: 'Signal', value: `${sensor.signalRssi} dBm` },
                { label: 'Last Seen', value: timeAgo(sensor.lastSeenAt) },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{item.label}</span>
                  <span className={`font-medium ${(item as any).mono ? 'font-mono text-xs' : ''}`} style={(item as any).color ? { color: (item as any).color } : undefined}>
                    {(item as any).color ? (item.value as string).charAt(0).toUpperCase() + (item.value as string).slice(1) : item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active alerts for this sensor */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Alerts ({alerts.length})</h3>
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.id} className={`p-3 rounded-lg border ${a.acknowledged ? 'opacity-60' : ''}`} style={{ borderColor: severityColor(a.severity) + '40', backgroundColor: severityBg(a.severity) }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded text-xs font-bold uppercase" style={{ color: severityColor(a.severity) }}>{a.severity}</span>
                      <span className="text-xs text-gray-500">{formatDateTime(a.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-700">{a.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance log */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Maintenance Log</h3>
            {maintenance.length === 0 ? (
              <p className="text-xs text-gray-400">No maintenance records for this sensor.</p>
            ) : (
              <div className="space-y-3">
                {maintenance.map(m => (
                  <div key={m.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: maintTypeBg(m.type) }}>
                      {maintTypeIcon(m.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900">{m.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                      <p className="text-xs text-gray-600 mt-0.5">{m.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>{new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>•</span>
                        <span>{m.performedBy}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => toast.info('Add maintenance entry (demo)')} className="w-full mt-3 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Entry
            </button>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Actions</h3>
            <div className="space-y-2">
              <button onClick={() => toast.info('Edit thresholds for this sensor (demo)')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200">
                <SettingsIcon className="h-4 w-4 text-gray-400" /> Edit Thresholds
              </button>
              <button onClick={() => toast.info('Edit alert recipients (demo)')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200">
                <Bell className="h-4 w-4 text-gray-400" /> Edit Alert Recipients
              </button>
              <button onClick={() => toast.info('Reassign kitchen zone (demo)')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200">
                <Layers className="h-4 w-4 text-gray-400" /> Reassign Zone
              </button>
              <button onClick={() => toast.warning('Sensor monitoring paused (demo)')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-50 border border-amber-200">
                <Pause className="h-4 w-4" /> Pause Monitoring
              </button>
              <button onClick={() => toast.warning('Sensor removal requested (demo)')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 border border-red-200">
                <Trash2 className="h-4 w-4" /> Remove Sensor
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
