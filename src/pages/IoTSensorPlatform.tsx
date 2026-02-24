import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Activity, Radio, Cloud, Zap, Upload, Bluetooth, Thermometer,
  Wifi, WifiOff, Battery, BatteryWarning, AlertTriangle, CheckCircle,
  Bell, Clock, Settings, TrendingUp, DollarSign, Snowflake,
  DoorOpen, BarChart3, Plus, ChevronRight, ArrowUpRight, ArrowDownRight,
  Lock, Key, XCircle, FileText, Droplets, Users, Mail, Phone,
  MessageSquare, Brain, Cpu, Link2, Eye,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import {
  iotSensors, iotSensorProviders, iotSensorReadings, iotSensorAlerts,
  iotSensorConfigs, iotIngestionLog, iotDefrostSchedules, iotDoorEvents,
  iotCoolingLogs, iotComplianceImpact, iotSparklines,
  type IoTSensor, type IoTSensorProvider, type IoTSparklinePoint,
} from '../data/demoData';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const PRIMARY = '#1e4d6b';
const GOLD = '#d4af37';
const LIGHT_BG = '#eef4f8';
const BORDER = '#b8d4e8';

type Tab = 'live' | 'devices' | 'integrations' | 'alerts' | 'compliance' | 'pricing';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'live', label: 'Live Dashboard', icon: Activity },
  { key: 'devices', label: 'Device Management', icon: Radio },
  { key: 'integrations', label: 'Integration Setup', icon: Cloud },
  { key: 'alerts', label: 'Alert Config', icon: Bell },
  { key: 'compliance', label: 'Compliance Impact', icon: () => <EvidlyIcon size={14} /> },
  { key: 'pricing', label: 'Pricing', icon: DollarSign },
];

/* ── Helpers ──────────────────────────────────────────────── */

function statusDot(s: IoTSensor['status']) {
  return { online: '#22c55e', warning: '#f59e0b', error: '#ef4444', offline: '#9ca3af' }[s];
}

function complianceColor(tempF: number, zone: string): string {
  const z = zone.toLowerCase();
  if (z.includes('freezer')) return tempF > 0 ? '#ef4444' : tempF > -3 ? '#f59e0b' : '#22c55e';
  if (z.includes('cooler') || z.includes('salad') || z.includes('beverage') || z.includes('display') || z.includes('blast') || z.includes('cold') || z.includes('reach')) return tempF > 41 ? '#ef4444' : tempF > 38 ? '#f59e0b' : '#22c55e';
  if (z.includes('hot') || z.includes('grill')) return tempF < 135 ? '#ef4444' : tempF < 140 ? '#f59e0b' : '#22c55e';
  if (z.includes('dry')) return tempF > 75 ? '#ef4444' : tempF > 72 ? '#f59e0b' : '#22c55e';
  return '#6b7280';
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/* ── Mini Sparkline SVG ───────────────────────────────────── */

function Sparkline({ data, threshold, width = 120, height = 28 }: { data: IoTSparklinePoint[]; threshold?: number; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const temps = data.map(d => d.temp);
  let yMin = Math.min(...temps);
  let yMax = Math.max(...temps);
  if (threshold !== undefined) { yMin = Math.min(yMin, threshold - 3); yMax = Math.max(yMax, threshold + 3); }
  const pad = (yMax - yMin) * 0.15 || 1;
  yMin -= pad; yMax += pad;
  const toX = (i: number) => (i / (data.length - 1)) * width;
  const toY = (v: number) => height - ((v - yMin) / (yMax - yMin)) * height;
  const d = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.temp).toFixed(1)}`).join(' ');
  const lastColor = complianceColor(temps[temps.length - 1], 'cooler');

  return (
    <svg width={width} height={height} className="block">
      {threshold !== undefined && (
        <line x1={0} y1={toY(threshold)} x2={width} y2={toY(threshold)} stroke="#ef4444" strokeWidth={0.5} strokeDasharray="2,2" opacity={0.5} />
      )}
      <path d={d} fill="none" stroke={lastColor} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={toX(data.length - 1)} cy={toY(temps[temps.length - 1])} r={2} fill={lastColor} />
    </svg>
  );
}

/* ── Tab: Live Sensor Dashboard ───────────────────────────── */

function LiveDashboard({ navigate }: { navigate: (p: string) => void }) {
  const online = iotSensors.filter(s => s.status === 'online').length;
  const violations = iotSensors.filter(s => s.status !== 'offline' && complianceColor(s.currentTempF, s.zone) === '#ef4444').length;
  const warnings = iotSensors.filter(s => s.status !== 'offline' && complianceColor(s.currentTempF, s.zone) === '#f59e0b').length;

  return (
    <div>
      {/* Summary Bar */}
      <div className="flex items-center gap-4 p-3 rounded-xl mb-4 flex-wrap" style={{ backgroundColor: LIGHT_BG, border: `1px solid ${BORDER}` }}>
        <span className="flex items-center gap-1.5 text-sm font-medium"><span className="w-2 h-2 rounded-full bg-green-400" />{online} sensors online</span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: violations > 0 ? '#ef4444' : '#22c55e' }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: violations > 0 ? '#ef4444' : '#22c55e' }} />{violations} violation{violations !== 1 ? 's' : ''}</span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: warnings > 0 ? '#f59e0b' : '#22c55e' }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: warnings > 0 ? '#f59e0b' : '#22c55e' }} />{warnings} warning{warnings !== 1 ? 's' : ''}</span>
        <div className="flex-1" />
        <button onClick={() => navigate('/sensors')} className="text-xs font-medium hover:underline" style={{ color: PRIMARY }}>View All <ChevronRight className="h-3 w-3 inline" /></button>
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {iotSensors.map(sensor => {
          const color = sensor.status === 'offline' ? '#9ca3af' : complianceColor(sensor.currentTempF, sensor.zone);
          const sparkData = iotSparklines[sensor.id];
          const zone = sensor.zone.toLowerCase();
          const threshold = zone.includes('freezer') ? 0 : zone.includes('cooler') || zone.includes('salad') || zone.includes('beverage') || zone.includes('display') || zone.includes('blast') || zone.includes('cold') || zone.includes('reach') ? 41 : zone.includes('hot') || zone.includes('grill') ? 135 : zone.includes('dry') ? 75 : undefined;

          return (
            <div
              key={sensor.id}
              onClick={() => navigate(`/sensors/${sensor.id}`)}
              className="bg-white rounded-xl border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
              style={color === '#ef4444' ? { borderColor: '#fca5a5' } : undefined}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusDot(sensor.status) }} />
                  <span className="text-xs font-semibold text-gray-900 truncate">{sensor.name}</span>
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(sensor.lastSeenAt)}</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  {sensor.status !== 'offline' ? (
                    <div className="text-2xl font-bold" style={{ color }}>{sensor.currentTempF}°F</div>
                  ) : (
                    <div className="text-2xl font-bold text-gray-300">--</div>
                  )}
                  <div className="text-[10px] text-gray-400">{sensor.zone} &middot; {sensor.locationName.split(' ')[0]}</div>
                </div>
                {sparkData && <Sparkline data={sparkData} threshold={threshold} />}
              </div>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-1">
                  {sensor.batteryPct <= 20 ? <BatteryWarning className="h-3 w-3 text-red-400" /> : <Battery className="h-3 w-3 text-gray-300" />}
                  <span className="text-[10px] text-gray-400">{sensor.batteryPct}%</span>
                </div>
                {sensor.currentHumidity !== null && (
                  <div className="flex items-center gap-1">
                    <Droplets className="h-3 w-3 text-blue-300" />
                    <span className="text-[10px] text-gray-400">{sensor.currentHumidity}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Defrost Cycles */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Snowflake className="h-4 w-4" style={{ color: '#0891b2' }} />
          <h3 className="text-sm font-bold text-gray-900">Defrost Cycle Management</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2">Sensor</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2">Frequency</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2">Duration</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2 hidden sm:table-cell">Recovery</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2 hidden sm:table-cell">Last Defrost</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2 hidden sm:table-cell">Auto-Detect</th>
              </tr>
            </thead>
            <tbody>
              {iotDefrostSchedules.map(d => (
                <tr key={d.sensorId} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-900">{d.sensorName}</td>
                  <td className="py-2 text-gray-600">{d.frequency}</td>
                  <td className="py-2 text-gray-600">{d.durationMin} min</td>
                  <td className="py-2 text-gray-600 hidden sm:table-cell">{d.expectedRecoveryMin} min</td>
                  <td className="py-2 text-gray-600 hidden sm:table-cell">{timeAgo(d.lastDefrostAt)} ago</td>
                  <td className="py-2 hidden sm:table-cell">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: d.autoDetect ? '#ecfdf5' : '#f3f4f6', color: d.autoDetect ? '#059669' : '#6b7280' }}>
                      {d.autoDetect ? 'AI Enabled' : 'Manual'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 p-2 rounded-lg bg-blue-50 text-xs text-blue-700">
          <Brain className="h-3 w-3 inline mr-1" />
          Defrost readings are excluded from compliance scoring. If recovery exceeds expected time, an alert triggers automatically.
        </div>
      </div>

      {/* Door Open Events */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4" style={{ color: '#7c3aed' }} />
            <h3 className="text-sm font-bold text-gray-900">Door Open Detection</h3>
          </div>
          <span className="text-xs text-gray-400">{iotDoorEvents.length} events today</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="p-3 rounded-lg bg-gray-50 text-center">
            <div className="text-xl font-bold text-gray-900">{iotDoorEvents.length}</div>
            <div className="text-[10px] text-gray-500">Door Openings Today</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 text-center">
            <div className="text-xl font-bold text-gray-900">{(iotDoorEvents.reduce((a, e) => a + e.durationSec, 0) / iotDoorEvents.length / 60).toFixed(1)} min</div>
            <div className="text-[10px] text-gray-500">Avg Open Duration</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 text-center">
            <div className="text-xl font-bold" style={{ color: '#f59e0b' }}>{iotDoorEvents.filter(e => e.durationSec > 300).length}</div>
            <div className="text-[10px] text-gray-500">Extended Opens ({'>'}5 min)</div>
          </div>
        </div>
        {iotDoorEvents.filter(e => e.durationSec > 120).length > 0 && (
          <div className="p-2 rounded-lg bg-purple-50 text-xs text-purple-700">
            <Brain className="h-3 w-3 inline mr-1" />
            AI Insight: Walk-in cooler door opened {iotDoorEvents.filter(e => e.sensorId === 'iot-s01').length} times between 11am-1pm (lunch rush). Consider pre-staging items to reduce door openings.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tab: Device Management ───────────────────────────────── */

function DeviceManagement({ navigate }: { navigate: (p: string) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <p className="text-sm text-gray-500">{iotSensors.length} sensors across {new Set(iotSensors.map(s => s.locationName)).size} locations</p>
        <button onClick={() => navigate('/sensors/add')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-white min-h-[44px]" style={{ backgroundColor: PRIMARY }}>
          <Plus className="h-4 w-4" /> Add Sensor
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100" style={{ backgroundColor: LIGHT_BG }}>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-2.5">Device</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-2.5 hidden sm:table-cell">Zone</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-2.5">Reading</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-2.5">Status</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-2.5 hidden sm:table-cell">Battery</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-2.5 hidden sm:table-cell">Provider</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {iotSensors.map(s => {
              const color = s.status !== 'offline' ? complianceColor(s.currentTempF, s.zone) : '#9ca3af';
              const provider = iotSensorProviders.find(p => p.slug === s.providerSlug);
              return (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/sensors/${s.id}`)}>
                  <td className="px-4 py-2.5">
                    <div className="text-sm font-medium text-gray-900">{s.name}</div>
                    <div className="text-[10px] text-gray-400">{s.locationName}</div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 hidden sm:table-cell">{s.zone}</td>
                  <td className="px-4 py-2.5">
                    {s.status !== 'offline' ? (
                      <span className="text-sm font-bold" style={{ color }}>{s.currentTempF}°F</span>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: statusDot(s.status) + '15', color: statusDot(s.status) }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusDot(s.status) }} />
                      {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <div className="flex items-center gap-1">
                      {s.batteryPct <= 20 ? <BatteryWarning className="h-3 w-3 text-red-400" /> : <Battery className="h-3 w-3 text-gray-400" />}
                      <span className="text-xs text-gray-500">{s.batteryPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    {provider && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: provider.color + '15', color: provider.color }}>{provider.name}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={e => { e.stopPropagation(); toast.info(`Edit ${s.name} (Demo)`); }} className="text-[10px] font-medium px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50">Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Integration Setup ───────────────────────────────── */

function IntegrationSetup() {
  const methods = [
    { title: 'Cloud-to-Cloud API Pull', icon: Cloud, color: '#2563eb', desc: 'EvidLY polls sensor cloud APIs on schedule. Auto-normalizes all readings.', providers: iotSensorProviders.filter(p => p.authType === 'oauth' || p.authType === 'apikey') },
    { title: 'Webhook / MQTT Push', icon: Zap, color: '#059669', desc: 'Receive real-time pushes. HMAC signature verification. Unique URL per location.', providers: iotSensorProviders.filter(p => p.authType === 'webhook') },
    { title: 'Manual / CSV / Bluetooth', icon: Upload, color: '#0891b2', desc: 'Upload CSV exports from closed systems or capture via Bluetooth Low Energy.', providers: iotSensorProviders.filter(p => p.authType === 'csv' || p.authType === 'bluetooth') },
  ];

  return (
    <div>
      {/* Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {methods.map(m => (
          <div key={m.title} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: m.color + '12' }}>
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
              </div>
              <div className="text-sm font-bold text-gray-900">{m.title}</div>
            </div>
            <p className="text-xs text-gray-500 mb-3">{m.desc}</p>
            <div className="space-y-1">
              {m.providers.map(p => (
                <div key={p.slug} className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-700">{p.name}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{
                    backgroundColor: p.status === 'connected' ? '#ecfdf5' : p.status === 'pending' ? '#fffbeb' : '#f3f4f6',
                    color: p.status === 'connected' ? '#059669' : p.status === 'pending' ? '#d97706' : '#6b7280',
                  }}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Provider Cards */}
      <h3 className="text-sm font-bold text-gray-900 mb-3">All Providers</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {iotSensorProviders.map(p => {
          const authIcon = p.authType === 'oauth' ? Lock : p.authType === 'apikey' ? Key : p.authType === 'webhook' ? Zap : p.authType === 'bluetooth' ? Bluetooth : Upload;
          return (
            <div key={p.slug} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: p.color + '15' }}>
                <Thermometer className="h-5 w-5" style={{ color: p.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{p.name}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{
                    backgroundColor: p.status === 'connected' ? '#ecfdf5' : p.status === 'pending' ? '#fffbeb' : '#f3f4f6',
                    color: p.status === 'connected' ? '#059669' : p.status === 'pending' ? '#d97706' : '#6b7280',
                  }}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <authIcon className="h-3 w-3 text-gray-400" />
                  <span className="text-[10px] text-gray-400">{p.authType === 'oauth' ? 'OAuth 2.0' : p.authType === 'apikey' ? 'API Key' : p.authType === 'webhook' ? 'Webhook Push' : p.authType === 'bluetooth' ? 'Bluetooth LE' : 'CSV Import'}</span>
                  <span className="text-[10px] text-gray-400">&middot; {p.sensorCount} sensors</span>
                  {p.lastSync && <span className="text-[10px] text-gray-400">&middot; Last sync {timeAgo(p.lastSync)}</span>}
                </div>
              </div>
              <button
                onClick={() => toast.info(`${p.status === 'connected' ? 'Configure' : 'Connect'} ${p.name} (Demo)`)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={p.status === 'connected'
                  ? { borderColor: '#e5e7eb', color: '#6b7280' }
                  : { borderColor: PRIMARY, color: PRIMARY, backgroundColor: LIGHT_BG }}
              >
                {p.status === 'connected' ? 'Configure' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Tab: Alert Configuration ─────────────────────────────── */

function AlertConfig() {
  const activeAlerts = iotSensorAlerts.filter(a => !a.acknowledged);
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;

  const escalationSteps = [
    { time: '0 min', action: 'Immediate Alert', desc: 'Push notification + email to assigned staff', color: '#f59e0b' },
    { time: '15 min', action: 'Sustained Violation Check', desc: 'If still in violation → escalate to shift lead', color: '#ea580c' },
    { time: '30 min', action: 'Auto-Create Incident', desc: 'Create incident record, AI drafts corrective action', color: '#ef4444' },
    { time: '60 min', action: 'Escalation', desc: 'SMS to owner/manager if no acknowledgment', color: '#dc2626' },
    { time: 'Critical', action: 'Danger Zone Alert', desc: '>70°F cooler or <120°F hot holding → immediate SMS to all managers', color: '#991b1b' },
  ];

  return (
    <div>
      {/* Active Alerts */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="text-sm font-bold text-gray-900">Active Alerts ({activeAlerts.length})</h3>
          {criticalCount > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">{criticalCount} Critical</span>}
        </div>
        <div className="space-y-2">
          {activeAlerts.map(alert => (
            <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg" style={{
              backgroundColor: alert.severity === 'critical' ? '#fef2f2' : alert.severity === 'warning' ? '#fffbeb' : '#eff6ff',
            }}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4" style={{ color: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'warning' ? '#f59e0b' : '#3b82f6' }} />
                <div>
                  <div className="text-xs font-semibold text-gray-900">{alert.sensorName} — {alert.locationName}</div>
                  <div className="text-[10px] text-gray-500">{alert.message.slice(0, 100)}</div>
                </div>
              </div>
              <button onClick={() => toast.success('Alert acknowledged')} className="px-2 py-1 rounded text-[10px] font-medium border border-gray-200 text-gray-500 hover:bg-white">Ack</button>
            </div>
          ))}
        </div>
      </div>

      {/* Threshold Rules */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Zone Threshold Rules (FDA Standard)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { zone: 'Walk-in Cooler', max: '41°F', warning: '39°F', icon: '❄️' },
            { zone: 'Walk-in Freezer', max: '0°F', warning: '-3°F', icon: '🧊' },
            { zone: 'Hot Holding', min: '135°F', warning: '140°F', icon: '🔥' },
            { zone: 'Dry Storage', max: '75°F / 60% RH', warning: '72°F', icon: '📦' },
          ].map(r => (
            <div key={r.zone} className="p-3 rounded-lg bg-gray-50">
              <div className="text-lg mb-1">{r.icon}</div>
              <div className="text-xs font-bold text-gray-900">{r.zone}</div>
              <div className="text-[10px] text-gray-500 mt-1">{r.max ? `Max: ${r.max}` : `Min: ${r.min}`}</div>
              <div className="text-[10px] text-gray-400">Warning at {r.warning}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Escalation Chain */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Violation → Incident Escalation Flow</h3>
        <div className="space-y-3">
          {escalationSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: step.color }}>{i + 1}</div>
                {i < escalationSteps.length - 1 && <div className="w-0.5 h-6 bg-gray-200 mt-1" />}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900">{step.action}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">{step.time}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Compliance Impact ───────────────────────────────── */

function ComplianceImpactTab() {
  return (
    <div>
      {/* Before / After */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Before IoT Sensors</div>
          <div className="space-y-2">
            {[
              { label: 'Manual temp checks', value: '4x/day', color: '#ef4444' },
              { label: 'Data gaps', value: '20 hrs/day unmonitored', color: '#ef4444' },
              { label: 'Response time', value: '30-60 min (next check)', color: '#f59e0b' },
              { label: 'Data completeness', value: '~25%', color: '#ef4444' },
              { label: 'Inspector confidence', value: 'Low — "when did you check last?"', color: '#f59e0b' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-600">{row.label}</span>
                <span className="text-xs font-bold" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border-2 p-4 sm:p-5" style={{ borderColor: '#22c55e' }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#22c55e' }}>After IoT Sensors</div>
          <div className="space-y-2">
            {[
              { label: 'Automated readings', value: 'Every 1-5 min', color: '#22c55e' },
              { label: 'Data gaps', value: '0 — continuous 24/7', color: '#22c55e' },
              { label: 'Response time', value: '<2 min (real-time alert)', color: '#22c55e' },
              { label: 'Data completeness', value: '99%+', color: '#22c55e' },
              { label: 'Inspector confidence', value: 'High — "here\'s our 30-day log"', color: '#22c55e' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-600">{row.label}</span>
                <span className="text-xs font-bold" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-Location Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Location Compliance Metrics</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2">Location</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2">Sensors</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2">Compliance Rate</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2 hidden sm:table-cell">Data Completeness</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2 hidden sm:table-cell">Manual Log Reduction</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2 hidden sm:table-cell">Avg Response</th>
              </tr>
            </thead>
            <tbody>
              {iotComplianceImpact.map(loc => (
                <tr key={loc.locationName} className="border-b border-gray-50">
                  <td className="py-2.5 font-medium text-gray-900">{loc.locationName}</td>
                  <td className="py-2.5 text-gray-600">{loc.sensorCount}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-gray-100">
                        <div className="h-full rounded-full" style={{ width: `${loc.tempComplianceRate}%`, backgroundColor: loc.tempComplianceRate >= 97 ? '#22c55e' : loc.tempComplianceRate >= 95 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className="font-bold" style={{ color: loc.tempComplianceRate >= 97 ? '#22c55e' : loc.tempComplianceRate >= 95 ? '#f59e0b' : '#ef4444' }}>{loc.tempComplianceRate}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 font-bold hidden sm:table-cell" style={{ color: loc.dataCompletenessScore >= 95 ? '#22c55e' : '#f59e0b' }}>{loc.dataCompletenessScore}%</td>
                  <td className="py-2.5 text-green-600 font-bold hidden sm:table-cell">{loc.manualLogReduction}% less</td>
                  <td className="py-2.5 text-gray-600 hidden sm:table-cell">{loc.avgResponseTimeMin} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Impact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <EvidlyIcon size={16} />
            <span className="text-xs font-semibold text-gray-500">Compliance Score</span>
          </div>
          <div className="text-xs text-gray-500 mb-2">Temp compliance rate feeds into Operational Compliance (50% weight)</div>
          <div className="text-xs text-gray-400">Formula: (in-range readings / total readings) x 100</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4" style={{ color: GOLD }} />
            <span className="text-xs font-semibold text-gray-500">Insurance Risk Score</span>
          </div>
          <div className="text-xs text-gray-500 mb-2">Automated 24/7 monitoring boosts insurance readiness</div>
          <div className="text-xs text-gray-400">Report includes sensor count, frequency, and uptime</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold text-gray-500">HACCP Integration</span>
          </div>
          <div className="text-xs text-gray-500 mb-2">Sensors auto-document CCP monitoring for HACCP plans</div>
          <div className="text-xs text-gray-400">Deviations auto-trigger corrective action workflows</div>
        </div>
      </div>

      {/* Cooling Log */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Cooling Log Compliance</h3>
        <div className="space-y-3">
          {iotCoolingLogs.map(log => (
            <div key={log.id} className="p-3 rounded-lg" style={{ backgroundColor: log.meetsStandard ? '#ecfdf5' : '#fef2f2', border: `1px solid ${log.meetsStandard ? '#bbf7d0' : '#fecaca'}` }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-gray-900">{log.foodItem}</span>
                  <span className="text-[10px] text-gray-400 ml-2">{log.locationName} &middot; {log.sensorName}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                  backgroundColor: log.meetsStandard ? '#dcfce7' : '#fee2e2',
                  color: log.meetsStandard ? '#16a34a' : '#dc2626',
                }}>
                  {log.meetsStandard ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-gray-500">
                <span>{log.startTemp}°F → {log.targetTemp}°F</span>
                <span>{log.totalMin} min total</span>
                <span>{log.standard}</span>
              </div>
              {/* Mini cooling curve */}
              <div className="mt-2">
                <svg viewBox="0 0 300 40" className="w-full" style={{ maxHeight: 40 }}>
                  {log.readings.map((r, i) => {
                    if (i === 0) return null;
                    const x1 = ((i - 1) / (log.readings.length - 1)) * 300;
                    const x2 = (i / (log.readings.length - 1)) * 300;
                    const yScale = (v: number) => 40 - ((v - log.targetTemp) / (log.startTemp - log.targetTemp)) * 40;
                    return <line key={i} x1={x1} y1={yScale(log.readings[i - 1].temp)} x2={x2} y2={yScale(r.temp)} stroke={log.meetsStandard ? '#22c55e' : '#ef4444'} strokeWidth={2} />;
                  })}
                  {/* 70°F reference line */}
                  <line x1={0} y1={40 - ((70 - log.targetTemp) / (log.startTemp - log.targetTemp)) * 40} x2={300} y2={40 - ((70 - log.targetTemp) / (log.startTemp - log.targetTemp)) * 40} stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="3,3" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Pricing ─────────────────────────────────────────── */

function PricingTab() {
  const tiers = [
    { name: 'Standard', price: '$99', period: '/mo per location', highlight: false },
    { name: 'Premium', price: '$199', period: '/mo per location', highlight: true },
    { name: 'Enterprise', price: 'Custom', period: 'contact sales', highlight: false },
  ];

  const features = [
    { name: 'Manual temp logging', standard: true, premium: true, enterprise: true },
    { name: 'CSV import', standard: true, premium: true, enterprise: true },
    { name: 'Connect sensors (API pull)', standard: 'Up to 5', premium: 'Up to 20', enterprise: 'Unlimited' },
    { name: 'Webhook receiver', standard: false, premium: true, enterprise: true },
    { name: 'Alert via email', standard: true, premium: true, enterprise: true },
    { name: 'Alert via SMS', standard: false, premium: true, enterprise: true },
    { name: 'Escalation rules', standard: false, premium: true, enterprise: true },
    { name: 'Defrost cycle management', standard: false, premium: true, enterprise: true },
    { name: 'Door open monitoring', standard: false, premium: true, enterprise: true },
    { name: 'Cooling curve tracking', standard: false, premium: true, enterprise: true },
    { name: 'HACCP auto-documentation', standard: false, premium: true, enterprise: true },
    { name: 'Enterprise integrations (Testo, TempTrak)', standard: false, premium: false, enterprise: true },
    { name: 'White-label sensor dashboard', standard: false, premium: false, enterprise: true },
    { name: 'Dedicated support', standard: false, premium: false, enterprise: true },
  ];

  function renderCell(val: boolean | string) {
    if (val === true) return <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />;
    if (val === false) return <XCircle className="h-4 w-4 text-gray-300 mx-auto" />;
    return <span className="text-xs font-medium text-gray-700">{val}</span>;
  }

  return (
    <div>
      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {tiers.map(tier => (
          <div key={tier.name} className="bg-white rounded-xl border-2 p-4 sm:p-6 text-center" style={{ borderColor: tier.highlight ? GOLD : '#e5e7eb' }}>
            {tier.highlight && <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: GOLD }}>Most Popular</div>}
            <div className="text-lg font-bold text-gray-900">{tier.name}</div>
            <div className="text-xl sm:text-3xl font-bold mt-2" style={{ color: PRIMARY }}>{tier.price}</div>
            <div className="text-xs text-gray-400">{tier.period}</div>
            <button onClick={() => toast.info(`${tier.name} Plan (Demo)`)} className="mt-4 w-full py-2 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: tier.highlight ? GOLD : PRIMARY }}>
              {tier.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>

      {/* Feature Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: LIGHT_BG }}>
              <th className="text-left text-xs font-semibold text-gray-700 px-4 py-3">Feature</th>
              <th className="text-center text-xs font-semibold text-gray-700 px-4 py-3">Standard</th>
              <th className="text-center text-xs font-semibold px-4 py-3" style={{ color: GOLD }}>Premium</th>
              <th className="text-center text-xs font-semibold text-gray-700 px-4 py-3">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr key={i} className="border-t border-gray-50">
                <td className="text-xs text-gray-700 px-4 py-2.5">{f.name}</td>
                <td className="text-center px-4 py-2.5">{renderCell(f.standard)}</td>
                <td className="text-center px-4 py-2.5" style={{ backgroundColor: '#fdf8e820' }}>{renderCell(f.premium)}</td>
                <td className="text-center px-4 py-2.5">{renderCell(f.enterprise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

/* ── Main Platform Component ──────────────────────────────── */

export function IoTSensorPlatform() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('live');

  return (
    <div className="px-3 sm:px-6 py-6 max-w-[1400px] mx-auto" style={F}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>
            <Radio className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">IoT Sensor Integration</h1>
            <p className="text-sm text-gray-500">Hardware-agnostic sensor ingestion &mdash; the central nervous system for all your temperature data</p>
          </div>
        </div>
        <button onClick={() => navigate('/sensors/add')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white min-h-[44px]" style={{ backgroundColor: PRIMARY }}>
          <Plus className="h-4 w-4" /> Add Sensor
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
            style={{
              backgroundColor: tab === t.key ? 'white' : 'transparent',
              color: tab === t.key ? PRIMARY : '#6b7280',
              boxShadow: tab === t.key ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'live' && <LiveDashboard navigate={navigate} />}
      {tab === 'devices' && <DeviceManagement navigate={navigate} />}
      {tab === 'integrations' && <IntegrationSetup />}
      {tab === 'alerts' && <AlertConfig />}
      {tab === 'compliance' && <ComplianceImpactTab />}
      {tab === 'pricing' && <PricingTab />}
    </div>
  );
}
