import { useState } from 'react';
import { toast } from 'sonner';
import {
  Radio, Wifi, WifiOff, Battery, Signal, AlertTriangle, Check, X,
  Thermometer, Droplets, Bell, BellOff, Settings, ChevronDown, ChevronUp,
  Clock, MapPin, Activity, RefreshCw, Eye, BarChart3,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { useDemo } from '../contexts/DemoContext';
import {
  iotSensors, iotSensorReadings, iotSensorAlerts, iotSensorProviders,
  iotSensorConfigs, iotIngestionLog, iotSparklines, iotComplianceImpact,
  type IoTSensor, type IoTSensorAlert, type IoTSensorReading,
} from '../data/demoData';
import { usePageTitle } from '../hooks/usePageTitle';

type Tab = 'dashboard' | 'sensors' | 'alerts' | 'settings';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  online:  { bg: 'bg-green-100', text: 'text-green-800', label: 'Online' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Warning' },
  offline: { bg: 'bg-red-100',   text: 'text-red-800',   label: 'Offline' },
  error:   { bg: 'bg-red-100',   text: 'text-red-800',   label: 'Error' },
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50',    text: 'text-red-800',    border: 'border-red-200' },
  warning:  { bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200' },
  info:     { bg: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-200' },
};

function BatteryIcon({ pct }: { pct: number }) {
  const color = pct <= 20 ? 'text-red-500' : pct <= 50 ? 'text-amber-500' : 'text-green-500';
  return (
    <div className="flex items-center gap-1">
      <Battery className={`h-4 w-4 ${color}`} />
      <span className={`text-xs font-medium ${color}`}>{pct}%</span>
    </div>
  );
}

function SignalIcon({ rssi }: { rssi: number }) {
  const strength = rssi === 0 ? 0 : rssi > -40 ? 3 : rssi > -55 ? 2 : 1;
  const color = strength >= 2 ? 'text-green-500' : strength === 1 ? 'text-amber-500' : 'text-[#1E2D4D]/30';
  return <Signal className={`h-4 w-4 ${color}`} />;
}

function MiniSparkline({ sensorId }: { sensorId: string }) {
  const data = iotSparklines[sensorId];
  if (!data || data.length === 0) return <span className="text-xs text-[#1E2D4D]/30">No data</span>;
  return (
    <ResponsiveContainer width={100} height={32}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="temp" stroke="#1E2D4D" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function IoTMonitoring() {
  const { isDemoMode } = useDemo();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [locationFilter, setLocationFilter] = useState('all');
  const [expandedSensor, setExpandedSensor] = useState<string | null>(null);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  usePageTitle('IoT Monitoring');
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(
    new Set(iotSensorAlerts.filter(a => a.acknowledged).map(a => a.id))
  );

  if (!isDemoMode) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: 'IoT Monitoring' }]} />
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-12 text-center">
          <Radio className="h-12 w-12 mx-auto mb-4 text-[#1E2D4D]/30" />
          <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-2">IoT Monitoring</h2>
          <p className="text-sm text-[#1E2D4D]/50 max-w-md mx-auto">
            Connect sensors to monitor temperature and conditions in real time.
          </p>
        </div>
      </div>
    );
  }

  const locations = [...new Set(iotSensors.map(s => s.locationName))];
  const filteredSensors = locationFilter === 'all'
    ? iotSensors
    : iotSensors.filter(s => s.locationName === locationFilter);

  const onlineCount = iotSensors.filter(s => s.status === 'online').length;
  const warningCount = iotSensors.filter(s => s.status === 'warning').length;
  const offlineCount = iotSensors.filter(s => s.status === 'offline' || s.status === 'error').length;
  const unackedAlerts = iotSensorAlerts.filter(a => !acknowledgedAlerts.has(a.id));

  const getLatestReading = (sensorId: string): IoTSensorReading | undefined =>
    iotSensorReadings.filter(r => r.sensorId === sensorId).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  const handleAcknowledge = (alertId: string) => {
    setAcknowledgedAlerts(prev => new Set([...prev, alertId]));
  };

  const tabs: { id: Tab; label: string; icon: typeof Radio; badge?: number }[] = [
    { id: 'dashboard', label: 'Live Dashboard', icon: Activity },
    { id: 'sensors', label: 'Sensors', icon: Radio, badge: iotSensors.length },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: unackedAlerts.length },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'IoT Monitoring' }]} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D] flex items-center gap-2">
            <Radio className="h-6 w-6 text-[#1E2D4D]" />
            IoT Monitoring
          </h1>
          <p className="text-sm text-[#1E2D4D]/50 mt-1">Real-time temperature monitoring from connected sensors</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
          >
            <option value="all">All Locations</option>
            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
          <button
            onClick={() => guardAction('refresh', 'IoT Monitoring', () => toast.info('Refreshing sensor data'))}
            className="px-4 py-2 bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1E2D4D]/10">
        <nav className="flex space-x-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 font-medium whitespace-nowrap flex items-center gap-1.5 text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#A08C5A] text-[#1E2D4D]'
                    : 'border-transparent text-[#1E2D4D]/70 hover:text-[#1E2D4D]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    tab.id === 'alerts' ? 'bg-red-50 text-red-700' : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/70'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── LIVE DASHBOARD TAB ── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#eef4f8] flex items-center justify-center">
                  <Radio className="h-4 w-4 text-[#1E2D4D]" />
                </div>
                <span className="text-sm font-medium text-[#1E2D4D]/50">Total Sensors</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-[#1E2D4D]">{iotSensors.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Wifi className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-[#1E2D4D]/50">Online</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-green-700">{onlineCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-[#1E2D4D]/50">Warnings</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-amber-700">{warningCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <WifiOff className="h-4 w-4 text-red-600" />
                </div>
                <span className="text-sm font-medium text-[#1E2D4D]/50">Offline</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-red-700">{offlineCount}</p>
            </div>
          </div>

          {/* Active Alerts Banner */}
          {unackedAlerts.filter(a => a.severity === 'critical').length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-bold text-red-800">Critical Alerts</span>
              </div>
              {unackedAlerts.filter(a => a.severity === 'critical').map(alert => (
                <div key={alert.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-red-800">{alert.sensorName} — {alert.locationName}</p>
                    <p className="text-xs text-red-600">{alert.message}</p>
                  </div>
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Sensor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSensors.map(sensor => {
              const reading = getLatestReading(sensor.id);
              const statusStyle = STATUS_STYLES[sensor.status] || STATUS_STYLES.error;
              const complianceColor = reading?.complianceStatus === 'violation' ? 'text-red-700'
                : reading?.complianceStatus === 'warning' ? 'text-amber-700' : 'text-green-700';

              return (
                <div key={sensor.id} className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#1E2D4D]">{sensor.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-[#1E2D4D]/30" />
                        <span className="text-xs text-[#1E2D4D]/50">{sensor.locationName} — {sensor.zone}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                  </div>

                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className={`text-3xl font-bold tracking-tight ${complianceColor}`}>
                        {sensor.status === 'offline' ? '—' : `${sensor.currentTempF}°F`}
                      </p>
                      {sensor.currentHumidity !== null && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Droplets className="h-3 w-3 text-blue-400" />
                          <span className="text-xs text-[#1E2D4D]/50">{sensor.currentHumidity}% RH</span>
                        </div>
                      )}
                    </div>
                    <MiniSparkline sensorId={sensor.id} />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#1E2D4D]/5">
                    <div className="flex items-center gap-3">
                      <BatteryIcon pct={sensor.batteryPct} />
                      <SignalIcon rssi={sensor.signalRssi} />
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-[#1E2D4D]/30" />
                      <span className="text-xs text-[#1E2D4D]/30">
                        {formatDistanceToNow(new Date(sensor.lastSeenAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {reading?.complianceStatus === 'violation' && (
                    <div className="mt-3 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-xs font-semibold text-red-700">
                        VIOLATION: {reading.thresholdApplied?.rule?.replace(/_/g, ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Threshold: {reading.thresholdApplied?.max !== null ? `≤${reading.thresholdApplied?.max}°F` : `≥${reading.thresholdApplied?.min}°F`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Compliance Impact */}
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
            <h3 className="text-lg font-bold text-[#1E2D4D] mb-4 flex items-center gap-2">
              <EvidlyIcon size={20} />
              IoT Compliance Impact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {iotComplianceImpact.map(loc => (
                <div key={loc.locationName} className="p-4 bg-[#eef4f8] rounded-xl border border-[#b8d4e8]">
                  <h4 className="text-sm font-bold text-[#1E2D4D] mb-2">{loc.locationName}</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#1E2D4D]/70">Compliance Rate</span>
                      <span className="font-bold text-[#1E2D4D]">{loc.tempComplianceRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#1E2D4D]/70">Data Completeness</span>
                      <span className="font-bold text-[#1E2D4D]">{loc.dataCompletenessScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#1E2D4D]/70">Manual Log Reduction</span>
                      <span className="font-bold text-green-700">{loc.manualLogReduction}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#1E2D4D]/70">Avg Response Time</span>
                      <span className="font-bold text-[#1E2D4D]">{loc.avgResponseTimeMin} min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SENSORS TAB ── */}
      {activeTab === 'sensors' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
            <div className="px-4 py-3 bg-[#FAF7F0] border-b border-[#1E2D4D]/10">
              <h3 className="text-sm font-bold text-[#1E2D4D]">{filteredSensors.length} Sensor{filteredSensors.length !== 1 ? 's' : ''}</h3>
            </div>
            <div className="divide-y divide-[#1E2D4D]/5">
              {filteredSensors.map(sensor => {
                const isExpanded = expandedSensor === sensor.id;
                const readings = iotSensorReadings.filter(r => r.sensorId === sensor.id)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                const sparkData = iotSparklines[sensor.id] || [];
                const statusStyle = STATUS_STYLES[sensor.status] || STATUS_STYLES.error;
                const provider = iotSensorProviders.find(p => p.slug === sensor.providerSlug);

                return (
                  <div key={sensor.id}>
                    <button
                      onClick={() => setExpandedSensor(isExpanded ? null : sensor.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#FAF7F0] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          sensor.status === 'online' ? 'bg-green-500' : sensor.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        <div className="text-left min-w-0">
                          <p className="text-sm font-semibold text-[#1E2D4D] truncate">{sensor.name}</p>
                          <p className="text-xs text-[#1E2D4D]/50 truncate">{sensor.locationName} — {sensor.zone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="text-lg font-bold text-[#1E2D4D]">
                          {sensor.status === 'offline' ? '—' : `${sensor.currentTempF}°F`}
                        </span>
                        <BatteryIcon pct={sensor.batteryPct} />
                        <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusStyle.label}
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-[#1E2D4D]/30" /> : <ChevronDown className="h-4 w-4 text-[#1E2D4D]/30" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 bg-[#FAF7F0] border-t border-[#1E2D4D]/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          {/* Details */}
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-[#1E2D4D]/5">
                              <span className="text-[#1E2D4D]/50">Provider</span>
                              <span className="font-medium" style={{ color: provider?.color }}>{provider?.name || sensor.providerSlug}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#1E2D4D]/5">
                              <span className="text-[#1E2D4D]/50">MAC Address</span>
                              <span className="font-mono font-medium text-[#1E2D4D]/80">{sensor.macAddress}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#1E2D4D]/5">
                              <span className="text-[#1E2D4D]/50">Firmware</span>
                              <span className="font-medium text-[#1E2D4D]/80">{sensor.firmware}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#1E2D4D]/5">
                              <span className="text-[#1E2D4D]/50">Signal</span>
                              <span className="font-medium text-[#1E2D4D]/80">{sensor.signalRssi === 0 ? 'N/A' : `${sensor.signalRssi} dBm`}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#1E2D4D]/5">
                              <span className="text-[#1E2D4D]/50">Type</span>
                              <span className="font-medium text-[#1E2D4D]/80 capitalize">{sensor.type}</span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-[#1E2D4D]/50">Last Seen</span>
                              <span className="font-medium text-[#1E2D4D]/80">{format(new Date(sensor.lastSeenAt), 'MMM d, h:mm a')}</span>
                            </div>
                          </div>

                          {/* Sparkline chart */}
                          {sparkData.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-[#1E2D4D]/80 mb-2">4-Hour Trend</p>
                              <ResponsiveContainer width="100%" height={120}>
                                <LineChart data={sparkData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="time" tick={false} />
                                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={40} />
                                  <Tooltip
                                    formatter={(v: number) => [`${v}°F`, 'Temperature']}
                                    labelFormatter={(l: string) => format(new Date(l), 'h:mm a')}
                                  />
                                  <Line type="monotone" dataKey="temp" stroke="#1E2D4D" strokeWidth={2} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>

                        {/* Recent Readings */}
                        {readings.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-[#1E2D4D]/80 mb-2">Recent Readings</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {readings.slice(0, 3).map((r, i) => (
                                <div key={i} className={`p-2 rounded-xl border text-center text-xs ${
                                  r.complianceStatus === 'violation' ? 'bg-red-50 border-red-200' :
                                  r.complianceStatus === 'warning' ? 'bg-amber-50 border-amber-200' :
                                  'bg-green-50 border-green-200'
                                }`}>
                                  <p className="font-bold">{r.temperatureF}°F</p>
                                  <p className="text-[#1E2D4D]/50 mt-0.5">{format(new Date(r.timestamp), 'h:mm a')}</p>
                                  <span className={`mt-1 inline-block px-1.5 py-0.5 rounded text-xs font-bold ${
                                    r.complianceStatus === 'violation' ? 'bg-red-50 text-red-700' :
                                    r.complianceStatus === 'warning' ? 'bg-amber-100 text-amber-700' :
                                    'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {r.complianceStatus.replace('_', ' ').toUpperCase()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Provider Summary */}
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
            <h3 className="text-sm font-bold text-[#1E2D4D] mb-3">Connected Providers</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {iotSensorProviders.filter(p => p.status === 'connected').map(p => (
                <div key={p.id} className="p-3 rounded-xl border border-[#1E2D4D]/5 bg-[#FAF7F0]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-bold" style={{ color: p.color }}>{p.name}</span>
                  </div>
                  <p className="text-xs text-[#1E2D4D]/50">{p.sensorCount} sensor{p.sensorCount !== 1 ? 's' : ''}</p>
                  {p.lastSync && (
                    <p className="text-xs text-[#1E2D4D]/30 mt-0.5">
                      Synced {formatDistanceToNow(new Date(p.lastSync), { addSuffix: true })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ALERTS TAB ── */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#1E2D4D]">
              Sensor Alerts
              {unackedAlerts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700">
                  {unackedAlerts.length} unacknowledged
                </span>
              )}
            </h3>
          </div>

          <div className="space-y-3">
            {iotSensorAlerts.map(alert => {
              const isAcked = acknowledgedAlerts.has(alert.id);
              const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;

              return (
                <div key={alert.id} className={`p-4 rounded-xl border ${style.border} ${style.bg} ${isAcked ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {alert.severity === 'critical' ? (
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : alert.severity === 'warning' ? (
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Bell className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-bold ${style.text}`}>{alert.sensorName}</span>
                          <span className="text-xs text-[#1E2D4D]/50">{alert.locationName}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase ${
                            alert.severity === 'critical' ? 'bg-red-200 text-red-800' :
                            alert.severity === 'warning' ? 'bg-amber-200 text-amber-800' :
                            'bg-blue-200 text-blue-800'
                          }`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm text-[#1E2D4D]/80 mt-1">{alert.message}</p>
                        <p className="text-xs text-[#1E2D4D]/30 mt-1">
                          {format(new Date(alert.createdAt), 'MMM d, yyyy h:mm a')}
                          {isAcked && alert.acknowledgedBy && ` — Acknowledged by ${alert.acknowledgedBy}`}
                        </p>
                      </div>
                    </div>
                    {!isAcked && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-3 py-1.5 bg-white border border-[#1E2D4D]/15 rounded-xl text-xs font-medium hover:bg-[#FAF7F0] flex-shrink-0"
                      >
                        Acknowledge
                      </button>
                    )}
                    {isAcked && (
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Alert Thresholds */}
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
            <h3 className="text-lg font-bold text-[#1E2D4D] mb-4">Alert Thresholds</h3>
            <div className="space-y-3">
              {iotSensorConfigs.map(config => {
                const provider = iotSensorProviders.find(p => p.slug === config.providerSlug);
                return (
                  <div key={config.providerSlug} className="p-4 bg-[#FAF7F0] rounded-xl border border-[#1E2D4D]/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold" style={{ color: provider?.color }}>{provider?.name || config.providerSlug}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        config.autoLogCompliance ? 'bg-emerald-50 text-emerald-700' : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/70'
                      }`}>
                        {config.autoLogCompliance ? 'Auto-Log ON' : 'Auto-Log OFF'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                      <div>
                        <span className="text-[#1E2D4D]/50">High Temp</span>
                        <p className="font-bold text-red-700">{config.alertThresholds.highTempF}°F</p>
                      </div>
                      <div>
                        <span className="text-[#1E2D4D]/50">Low Temp</span>
                        <p className="font-bold text-blue-700">{config.alertThresholds.lowTempF}°F</p>
                      </div>
                      <div>
                        <span className="text-[#1E2D4D]/50">Humidity High</span>
                        <p className="font-bold text-[#1E2D4D]/80">{config.alertThresholds.humidityHigh}%</p>
                      </div>
                      <div>
                        <span className="text-[#1E2D4D]/50">Battery Low</span>
                        <p className="font-bold text-amber-700">{config.alertThresholds.batteryLowPct}%</p>
                      </div>
                      <div>
                        <span className="text-[#1E2D4D]/50">Poll Interval</span>
                        <p className="font-bold text-[#1E2D4D]/80">
                          {config.pollingIntervalMin === 0 ? 'Webhook' : `${config.pollingIntervalMin} min`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {config.notificationChannels.map(ch => (
                        <span key={ch} className="px-2 py-0.5 bg-white rounded text-xs font-medium text-[#1E2D4D]/70 border border-[#1E2D4D]/10 capitalize">
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => guardAction('save', 'IoT Monitoring', () => toast.success('Threshold configuration saved'))}
              className="mt-4 px-6 py-2 bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] text-sm font-medium"
            >
              Save Thresholds
            </button>
          </div>

          {/* Ingestion Log */}
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4">
            <h3 className="text-lg font-bold text-[#1E2D4D] mb-4">Recent Data Ingestion</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1E2D4D]/10 hover:bg-[#1E2D4D]/[0.02] transition-colors">
                    <th className="text-left py-2 px-3 font-medium text-[#1E2D4D]/50">Provider</th>
                    <th className="text-left py-2 px-3 font-medium text-[#1E2D4D]/50">Method</th>
                    <th className="text-left py-2 px-3 font-medium text-[#1E2D4D]/50">Sensors</th>
                    <th className="text-left py-2 px-3 font-medium text-[#1E2D4D]/50">Readings</th>
                    <th className="text-left py-2 px-3 font-medium text-[#1E2D4D]/50">Time</th>
                    <th className="text-left py-2 px-3 font-medium text-[#1E2D4D]/50">Status</th>
                    <th className="text-left py-2 px-3 font-medium text-[#1E2D4D]/50">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2D4D]/3">
                  {iotIngestionLog.map(log => (
                    <tr key={log.id} className="hover:bg-[#FAF7F0]">
                      <td className="py-2 px-3 font-medium text-[#1E2D4D]">{log.provider}</td>
                      <td className="py-2 px-3 text-[#1E2D4D]/70 capitalize">{log.method.replace('_', ' ')}</td>
                      <td className="py-2 px-3 text-[#1E2D4D]/70">{log.sensorCount}</td>
                      <td className="py-2 px-3 text-[#1E2D4D]/70">{log.readingCount}</td>
                      <td className="py-2 px-3 text-[#1E2D4D]/70">{format(new Date(log.timestamp), 'h:mm:ss a')}</td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                          log.status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                          log.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#1E2D4D]/70">{log.durationMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
