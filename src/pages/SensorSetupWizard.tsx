import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, Cloud, Zap, Upload, Bluetooth,
  Thermometer, Lock, Key, Wifi, Radio, Bell, Clock,
  ChevronDown, Mail, Phone, MessageSquare, AlertTriangle, Plus, MapPin,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { iotSensorProviders, locations } from '../data/demoData';
import { toast } from 'sonner';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { useDemo } from '../contexts/DemoContext';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const PRIMARY = '#1e4d6b';
const GOLD = '#d4af37';
const LIGHT_BG = '#eef4f8';

/* ── Types ────────────────────────────────────────────────── */

type Step = 1 | 2 | 3 | 4 | 5;

type ManualSensorType = 'temperature' | 'humidity' | 'co2' | 'door_contact';

interface WizardState {
  provider: string | null;
  // Auth
  authEmail: string;
  authPassword: string;
  authApiKey: string;
  webhookUrl: string;
  // Discovered sensors
  discoveredSensors: DiscoveredSensor[];
  // Thresholds
  thresholds: Record<string, ZoneThreshold>;
  // Alerts
  alertRecipients: string[];
  alertMethods: string[];
  alertDelay: number;
  escalationEnabled: boolean;
  // Frequency
  pollingInterval: number;
  // Manual add fields
  manualSensorName: string;
  manualSensorType: ManualSensorType;
  manualLocationId: string;
  manualEquipmentId: string;
  manualMinThreshold: number | null;
  manualMaxThreshold: number | null;
  manualPollingInterval: number;
}

interface DiscoveredSensor {
  id: string;
  name: string;
  mac: string;
  model: string;
  lastTemp: number | null;
  selected: boolean;
  assignedZone: string;
}

interface ZoneThreshold {
  zone: string;
  maxTempF: number | null;
  minTempF: number | null;
  warningBuffer: number;
  maxHumidity: number | null;
}

/* ── Demo Data for Wizard ─────────────────────────────────── */

const DEMO_DISCOVERED: Record<string, DiscoveredSensor[]> = {
  sensorpush: [
    { id: 'disc-1', name: 'SensorPush HT.w #4821', mac: 'SP:A4:3B:7C:18:AA', model: 'HT.w', lastTemp: 36.8, selected: true, assignedZone: 'Walk-in Cooler' },
    { id: 'disc-2', name: 'SensorPush HT1 #4822', mac: 'SP:A4:3B:7C:18:AB', model: 'HT1', lastTemp: -1.5, selected: true, assignedZone: 'Walk-in Freezer' },
    { id: 'disc-3', name: 'SensorPush HTP.xw #4823', mac: 'SP:A4:3B:7C:18:AC', model: 'HTP.xw', lastTemp: 71.2, selected: false, assignedZone: 'Dry Storage' },
  ],
  tempstick: [
    { id: 'disc-4', name: 'Temp Stick WiFi #TS-901', mac: 'TS:B8:2A:5D:20:D1', model: 'WiFi', lastTemp: 39.1, selected: true, assignedZone: 'Reach-in Cooler' },
    { id: 'disc-5', name: 'Temp Stick WiFi #TS-902', mac: 'TS:B8:2A:5D:20:D2', model: 'WiFi', lastTemp: 70.5, selected: true, assignedZone: 'Prep Station' },
  ],
  monnit: [
    { id: 'disc-6', name: 'Monnit Temp Sensor #MN-301', mac: 'MN:C7:4E:1B:40:E1', model: 'ALTA Temp', lastTemp: 37.5, selected: true, assignedZone: 'Walk-in Cooler' },
  ],
};

const ZONE_PRESETS: Record<string, ZoneThreshold> = {
  'Walk-in Cooler': { zone: 'Walk-in Cooler', maxTempF: 41, minTempF: null, warningBuffer: 2, maxHumidity: 70 },
  'Walk-in Freezer': { zone: 'Walk-in Freezer', maxTempF: 0, minTempF: null, warningBuffer: 3, maxHumidity: null },
  'Hot Holding': { zone: 'Hot Holding', maxTempF: null, minTempF: 135, warningBuffer: 5, maxHumidity: null },
  'Dry Storage': { zone: 'Dry Storage', maxTempF: 75, minTempF: null, warningBuffer: 3, maxHumidity: 60 },
  'Reach-in Cooler': { zone: 'Reach-in Cooler', maxTempF: 41, minTempF: null, warningBuffer: 2, maxHumidity: 70 },
  'Prep Station': { zone: 'Prep Station', maxTempF: null, minTempF: null, warningBuffer: 0, maxHumidity: null },
  'Receiving': { zone: 'Receiving', maxTempF: 41, minTempF: null, warningBuffer: 2, maxHumidity: null },
};

/* ── Equipment Options (by location) ────────────────────── */

const EQUIPMENT_OPTIONS = [
  { id: 'eq-wic-01', name: 'Walk-in Cooler #1', locationId: '1' },
  { id: 'eq-wif-01', name: 'Walk-in Freezer', locationId: '1' },
  { id: 'eq-hh-01', name: 'Hot Hold Station', locationId: '1' },
  { id: 'eq-ri-01', name: 'Reach-in Cooler', locationId: '1' },
  { id: 'eq-wic-02', name: 'Walk-in Cooler A', locationId: '2' },
  { id: 'eq-wif-02', name: 'Walk-in Freezer A', locationId: '2' },
  { id: 'eq-hh-02', name: 'Hot Hold Station', locationId: '2' },
  { id: 'eq-wic-03', name: 'Main Walk-in', locationId: '3' },
  { id: 'eq-wif-03', name: 'Walk-in Freezer', locationId: '3' },
];

/* ── Sensor Type Threshold Defaults ─────────────────────── */

const SENSOR_TYPE_DEFAULTS: Record<ManualSensorType, { min: number | null; max: number | null; unit: string }> = {
  temperature: { min: null, max: 41, unit: '°F' },
  humidity: { min: 20, max: 70, unit: '%' },
  co2: { min: null, max: 1000, unit: 'ppm' },
  door_contact: { min: null, max: null, unit: '' },
};

const SENSOR_TYPE_LABELS: Record<ManualSensorType, string> = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  co2: 'CO₂',
  door_contact: 'Door Contact',
};

const POLLING_OPTIONS = [
  { value: 1, label: '1 min' },
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
];

const STEP_LABELS = ['Select Brand', 'Authenticate', 'Thresholds', 'Alerts', 'Frequency'];

/* ── Component ────────────────────────────────────────────── */

export function SensorSetupWizard() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const [step, setStep] = useState<Step>(1);
  const [authenticating, setAuthenticating] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [state, setState] = useState<WizardState>({
    provider: null,
    authEmail: '',
    authPassword: '',
    authApiKey: '',
    webhookUrl: 'https://api.evidly.com/v1/iot/webhook/downtown-kitchen/monnit',
    discoveredSensors: [],
    thresholds: {},
    alertRecipients: ['Kitchen Manager', 'Shift Lead'],
    alertMethods: ['push', 'email'],
    alertDelay: 0,
    escalationEnabled: true,
    pollingInterval: 5,
    manualSensorName: '',
    manualSensorType: 'temperature',
    manualLocationId: '',
    manualEquipmentId: '',
    manualMinThreshold: null,
    manualMaxThreshold: 41,
    manualPollingInterval: 5,
  });
  const [complete, setComplete] = useState(false);
  const isManualMode = state.provider === 'manual';

  function handleManualSensorTypeChange(type: ManualSensorType) {
    const defaults = SENSOR_TYPE_DEFAULTS[type];
    setState(prev => ({
      ...prev,
      manualSensorType: type,
      manualMinThreshold: defaults.min,
      manualMaxThreshold: defaults.max,
    }));
  }

  function handleManualSubmit() {
    guardAction('create', 'IoT Sensors', () => {
      toast.success('Sensor added successfully');
      navigate('/sensors');
    });
  }

  if (!isDemoMode) {
    return (
      <div className="p-6 max-w-3xl mx-auto" style={F}>
        <button onClick={() => navigate('/sensors')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Manage Sensors
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Radio className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sensor Setup</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Sensor configuration is not yet available.
          </p>
        </div>
      </div>
    );
  }

  const selectedProvider = iotSensorProviders.find(p => p.slug === state.provider);

  function selectProvider(slug: string) {
    const sensors = DEMO_DISCOVERED[slug] || [];
    const thresholds: Record<string, ZoneThreshold> = {};
    sensors.forEach(s => {
      if (s.assignedZone && ZONE_PRESETS[s.assignedZone]) {
        thresholds[s.id] = { ...ZONE_PRESETS[s.assignedZone] };
      } else {
        thresholds[s.id] = { zone: s.assignedZone || 'Unknown', maxTempF: 41, minTempF: null, warningBuffer: 2, maxHumidity: null };
      }
    });
    setState(prev => ({ ...prev, provider: slug, discoveredSensors: sensors, thresholds }));
  }

  function handleAuth() {
    setAuthenticating(true);
    setTimeout(() => {
      setAuthenticating(false);
      setAuthenticated(true);
    }, 1500);
  }

  function toggleSensor(id: string) {
    setState(prev => ({
      ...prev,
      discoveredSensors: prev.discoveredSensors.map(s => s.id === id ? { ...s, selected: !s.selected } : s),
    }));
  }

  function updateZone(id: string, zone: string) {
    const preset = ZONE_PRESETS[zone] || { zone, maxTempF: 41, minTempF: null, warningBuffer: 2, maxHumidity: null };
    setState(prev => ({
      ...prev,
      discoveredSensors: prev.discoveredSensors.map(s => s.id === id ? { ...s, assignedZone: zone } : s),
      thresholds: { ...prev.thresholds, [id]: { ...preset } },
    }));
  }

  function updateThreshold(sensorId: string, field: keyof ZoneThreshold, value: number | null) {
    setState(prev => ({
      ...prev,
      thresholds: { ...prev.thresholds, [sensorId]: { ...prev.thresholds[sensorId], [field]: value } },
    }));
  }

  function handleFinish() {
    setComplete(true);
    setTimeout(() => navigate('/sensors'), 2000);
  }

  const canNext = (): boolean => {
    if (step === 1) return !!state.provider;
    if (step === 2) return authenticated;
    if (step === 3) return state.discoveredSensors.some(s => s.selected);
    if (step === 4) return state.alertRecipients.length > 0;
    return true;
  };

  if (complete) {
    return (
      <div className="p-6 max-w-2xl mx-auto" style={F}>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#ecfdf5' }}>
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sensors Connected!</h2>
          <p className="text-sm text-gray-500 mb-2">
            {state.discoveredSensors.filter(s => s.selected).length} sensor{state.discoveredSensors.filter(s => s.selected).length !== 1 ? 's' : ''} from {selectedProvider?.name} are now ingesting data.
          </p>
          <p className="text-xs text-gray-400">Redirecting to Manage Sensors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto" style={F}>
      {/* Back */}
      <button onClick={() => step === 1 ? navigate('/sensors') : setStep((step - 1) as Step)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> {step === 1 ? 'Back to Manage Sensors' : 'Previous Step'}
      </button>

      {/* Progress — hidden in manual mode */}
      {!isManualMode && (
        <div className="flex items-center gap-2 mb-8">
          {STEP_LABELS.map((label, i) => {
            const stepNum = (i + 1) as Step;
            const active = step === stepNum;
            const done = step > stepNum;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: done ? '#22c55e' : active ? PRIMARY : '#e5e7eb',
                      color: done || active ? 'white' : '#9ca3af',
                    }}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : stepNum}
                  </div>
                  <span className={`text-xs font-medium hidden md:block ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
                </div>
                {i < 4 && <div className="flex-1 h-px" style={{ backgroundColor: done ? '#22c55e' : '#e5e7eb' }} />}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">

        {/* ── Manual Add Sensor Form ──────────────────────────── */}
        {isManualMode && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Add Sensor Manually</h2>
            <p className="text-sm text-gray-500 mb-6">Configure an individual sensor without connecting to a cloud provider.</p>

            <div className="space-y-5">
              {/* 1. Sensor Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sensor Name</label>
                <input
                  type="text"
                  placeholder="e.g., Walk-in Cooler #1"
                  value={state.manualSensorName}
                  onChange={e => setState(prev => ({ ...prev, manualSensorName: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b]"
                />
              </div>

              {/* 2. Sensor Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sensor Type</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['temperature', 'humidity', 'co2', 'door_contact'] as ManualSensorType[]).map(type => {
                    const selected = state.manualSensorType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => handleManualSensorTypeChange(type)}
                        className="text-left p-3 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: selected ? PRIMARY : '#e5e7eb',
                          backgroundColor: selected ? LIGHT_BG : 'white',
                        }}
                      >
                        <div className="text-sm font-semibold" style={{ color: selected ? PRIMARY : '#374151' }}>
                          {SENSOR_TYPE_LABELS[type]}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {type === 'temperature' ? 'Cold/hot storage' : type === 'humidity' ? 'Moisture levels' : type === 'co2' ? 'Air quality' : 'Open/close events'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Location Assignment */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={state.manualLocationId}
                    onChange={e => setState(prev => ({ ...prev, manualLocationId: e.target.value, manualEquipmentId: '' }))}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b] appearance-none bg-white"
                  >
                    <option value="">Select a location...</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name} — {loc.address}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Equipment Assignment (optional) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Link to Equipment <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <select
                  value={state.manualEquipmentId}
                  onChange={e => setState(prev => ({ ...prev, manualEquipmentId: e.target.value }))}
                  disabled={!state.manualLocationId}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b] appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">{state.manualLocationId ? 'None — standalone sensor' : 'Select a location first'}</option>
                  {EQUIPMENT_OPTIONS
                    .filter(eq => eq.locationId === state.manualLocationId)
                    .map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.name}</option>
                    ))}
                </select>
              </div>

              {/* 5. Alert Thresholds */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Alert Thresholds</label>
                {state.manualSensorType === 'door_contact' ? (
                  <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: LIGHT_BG }}>
                    <Bell className="h-4 w-4 inline mr-1.5" style={{ color: PRIMARY }} />
                    Alerts trigger on open/close events. Duration-based alerts configurable post-setup.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                        Min ({SENSOR_TYPE_DEFAULTS[state.manualSensorType].unit})
                      </label>
                      <input
                        type="number"
                        value={state.manualMinThreshold ?? ''}
                        onChange={e => setState(prev => ({ ...prev, manualMinThreshold: e.target.value ? Number(e.target.value) : null }))}
                        placeholder="No minimum"
                        className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                        Max ({SENSOR_TYPE_DEFAULTS[state.manualSensorType].unit})
                      </label>
                      <input
                        type="number"
                        value={state.manualMaxThreshold ?? ''}
                        onChange={e => setState(prev => ({ ...prev, manualMaxThreshold: e.target.value ? Number(e.target.value) : null }))}
                        placeholder="No maximum"
                        className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b]"
                      />
                    </div>
                  </div>
                )}
                {state.manualSensorType === 'temperature' && (
                  <p className="text-xs text-gray-400 mt-1.5">FDA cold holding default: max 41°F. Adjust based on your jurisdiction requirements.</p>
                )}
              </div>

              {/* 6. Polling Interval */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Reading Frequency</label>
                <div className="flex flex-wrap gap-2">
                  {POLLING_OPTIONS.map(opt => {
                    const selected = state.manualPollingInterval === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setState(prev => ({ ...prev, manualPollingInterval: opt.value }))}
                        className="px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all"
                        style={{
                          borderColor: selected ? PRIMARY : '#e5e7eb',
                          backgroundColor: selected ? LIGHT_BG : 'white',
                          color: selected ? PRIMARY : '#6b7280',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setState(prev => ({ ...prev, provider: null }))}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Back to Brand Selection
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={!state.manualSensorName.trim() || !state.manualLocationId}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                style={{ backgroundColor: (state.manualSensorName.trim() && state.manualLocationId) ? PRIMARY : '#d1d5db' }}
              >
                <Plus className="h-4 w-4" /> Add Sensor
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Select Brand */}
        {step === 1 && !isManualMode && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Select Your Sensor Brand</h2>
            <p className="text-sm text-gray-500 mb-6">Choose the hardware platform you want to connect, or add a sensor manually.</p>

            {/* Manual Entry card */}
            <button
              onClick={() => setState(prev => ({ ...prev, provider: 'manual' }))}
              className="w-full text-left p-4 rounded-xl border-2 border-dashed transition-all mb-4"
              style={{ borderColor: '#b8d4e8', backgroundColor: LIGHT_BG }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = PRIMARY; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#b8d4e8'; }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">Manual Entry</div>
                  <div className="text-xs text-gray-500">Add an individual sensor without a cloud integration</div>
                </div>
              </div>
            </button>

            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Or connect a sensor platform</div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {iotSensorProviders.map(p => {
                const selected = state.provider === p.slug;
                const authIcon = p.authType === 'oauth' ? Lock : p.authType === 'apikey' ? Key : p.authType === 'webhook' ? Zap : p.authType === 'bluetooth' ? Bluetooth : Upload;
                return (
                  <button
                    key={p.slug}
                    onClick={() => selectProvider(p.slug)}
                    className="text-left p-4 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: selected ? PRIMARY : '#e5e7eb',
                      backgroundColor: selected ? LIGHT_BG : 'white',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color + '15' }}>
                        <Thermometer className="h-4 w-4" style={{ color: p.color }} />
                      </div>
                      {selected && <Check className="h-4 w-4" style={{ color: PRIMARY }} />}
                    </div>
                    <div className="text-sm font-bold text-gray-900">{p.name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <authIcon className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {p.authType === 'oauth' ? 'OAuth 2.0' : p.authType === 'apikey' ? 'API Key' : p.authType === 'webhook' ? 'Webhook' : p.authType === 'bluetooth' ? 'Bluetooth' : 'CSV Import'}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">{p.pricingNote}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Authenticate */}
        {step === 2 && selectedProvider && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Connect to {selectedProvider.name}</h2>
            <p className="text-sm text-gray-500 mb-6">
              {selectedProvider.authType === 'oauth'
                ? 'Enter your SensorPush Gateway Cloud credentials to authorize EvidLY.'
                : selectedProvider.authType === 'apikey'
                  ? `Enter your ${selectedProvider.name} API key found in your account settings.`
                  : selectedProvider.authType === 'webhook'
                    ? 'Configure your sensor platform to push data to this webhook URL.'
                    : selectedProvider.authType === 'bluetooth'
                      ? 'Pair your Bluetooth sensor using the EvidLY mobile app.'
                      : 'Upload a CSV export from your sensor platform.'}
            </p>

            {/* OAuth flow (SensorPush) */}
            {selectedProvider.authType === 'oauth' && (
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="your-email@restaurant.com"
                    value={state.authEmail}
                    onChange={e => setState(prev => ({ ...prev, authEmail: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b]"
                    disabled={authenticated}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="SensorPush Gateway password"
                    value={state.authPassword}
                    onChange={e => setState(prev => ({ ...prev, authPassword: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b]"
                    disabled={authenticated}
                  />
                </div>
                <div className="p-3 rounded-lg bg-blue-50 text-xs text-blue-700">
                  <Lock className="h-3 w-3 inline mr-1" /> EvidLY uses OAuth 2.0 — we never store your password. Access tokens expire in 12 hours and auto-refresh.
                </div>
              </div>
            )}

            {/* API Key flow */}
            {selectedProvider.authType === 'apikey' && (
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">API Key</label>
                  <input
                    type="text"
                    placeholder={`${selectedProvider.name} API key`}
                    value={state.authApiKey}
                    onChange={e => setState(prev => ({ ...prev, authApiKey: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:border-[#1e4d6b]"
                    disabled={authenticated}
                  />
                  <p className="text-xs text-gray-400 mt-1">Found in your {selectedProvider.name} account settings under API Access.</p>
                </div>
              </div>
            )}

            {/* Webhook flow */}
            {selectedProvider.authType === 'webhook' && (
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Your EvidLY Webhook URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={state.webhookUrl}
                      readOnly
                      className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-mono bg-gray-50 text-gray-600"
                    />
                    <button
                      onClick={() => guardAction('copy', 'IoT Sensors', () => { navigator.clipboard.writeText(state.webhookUrl); toast.success('Webhook URL copied'); })}
                      className="px-3 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Paste this URL into your iMonnit webhook configuration.</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 text-xs text-green-700">
                  <EvidlyIcon size={12} className="inline mr-1" /> Webhook secured with HMAC-SHA256 signature verification. EvidLY validates every payload.
                </div>
              </div>
            )}

            {/* Bluetooth flow */}
            {selectedProvider.authType === 'bluetooth' && (
              <div className="space-y-4 max-w-md">
                <div className="p-6 rounded-xl border-2 border-dashed border-gray-200 text-center">
                  <Bluetooth className="h-8 w-8 mx-auto mb-3" style={{ color: '#0891b2' }} />
                  <div className="text-sm font-semibold text-gray-900 mb-1">Bluetooth Pairing Required</div>
                  <p className="text-xs text-gray-500 mb-3">Open the EvidLY mobile app and hold your {selectedProvider.name} sensor nearby to pair via Bluetooth Low Energy.</p>
                  <div className="text-xs text-gray-400">Or use the mobile app to capture readings directly.</div>
                </div>
              </div>
            )}

            {/* CSV flow */}
            {selectedProvider.authType === 'csv' && (
              <div className="space-y-4 max-w-md">
                <div className="p-6 rounded-xl border-2 border-dashed border-gray-200 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                  <div className="text-sm font-semibold text-gray-900 mb-1">Upload CSV Export</div>
                  <p className="text-xs text-gray-500 mb-3">Export temperature data from {selectedProvider.name} and upload the CSV file here. EvidLY will map columns automatically.</p>
                  <button
                    onClick={() => { setAuthenticated(true); }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    Choose File
                  </button>
                  <p className="text-xs text-gray-400 mt-2">Supported: .csv, .xlsx — Max 10MB</p>
                </div>
              </div>
            )}

            {/* Auth Button */}
            {(selectedProvider.authType === 'oauth' || selectedProvider.authType === 'apikey' || selectedProvider.authType === 'webhook') && (
              <div className="mt-6">
                {!authenticated ? (
                  <button
                    onClick={handleAuth}
                    disabled={authenticating}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                    style={{ backgroundColor: authenticating ? '#9ca3af' : PRIMARY }}
                  >
                    {authenticating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {selectedProvider.authType === 'webhook' ? 'Verifying webhook...' : 'Connecting...'}
                      </>
                    ) : (
                      <>
                        <Wifi className="h-4 w-4" />
                        {selectedProvider.authType === 'webhook' ? 'Verify Webhook' : `Connect to ${selectedProvider.name}`}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-5 w-5" />
                    <span className="text-sm font-semibold">
                      {selectedProvider.authType === 'webhook'
                        ? 'Webhook verified — ready to receive data'
                        : `Connected — ${state.discoveredSensors.length} sensors discovered`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Bluetooth auto-advance */}
            {selectedProvider.authType === 'bluetooth' && !authenticated && (
              <div className="mt-4">
                <button onClick={() => setAuthenticated(true)} className="text-xs underline text-gray-400 hover:text-gray-600">
                  Skip — I'll pair later via mobile app
                </button>
              </div>
            )}

            {/* Discovered sensors list */}
            {authenticated && state.discoveredSensors.length > 0 && (selectedProvider.authType === 'oauth' || selectedProvider.authType === 'apikey') && (
              <div className="mt-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Discovered Sensors — Select and assign to kitchen zones</h3>
                <div className="space-y-2">
                  {state.discoveredSensors.map(sensor => (
                    <div key={sensor.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                      <input
                        type="checkbox"
                        checked={sensor.selected}
                        onChange={() => toggleSensor(sensor.id)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: PRIMARY }}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{sensor.name}</div>
                        <div className="text-xs text-gray-400">{sensor.mac} &middot; {sensor.model} {sensor.lastTemp !== null && `&middot; ${sensor.lastTemp}°F`}</div>
                      </div>
                      <select
                        value={sensor.assignedZone}
                        onChange={e => updateZone(sensor.id, e.target.value)}
                        className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#1e4d6b]"
                      >
                        {Object.keys(ZONE_PRESETS).map(z => <option key={z} value={z}>{z}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Configure Thresholds */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Configure Compliance Thresholds</h2>
            <p className="text-sm text-gray-500 mb-6">Thresholds auto-populated from FDA food safety standards. Customize per zone as needed.</p>

            <div className="space-y-4">
              {state.discoveredSensors.filter(s => s.selected).map(sensor => {
                const th = state.thresholds[sensor.id];
                if (!th) return null;
                return (
                  <div key={sensor.id} className="p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{sensor.name}</div>
                        <div className="text-xs text-gray-400">{sensor.assignedZone}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                        FDA Standard
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Max Temp (°F)</label>
                        <input
                          type="number"
                          value={th.maxTempF ?? ''}
                          onChange={e => updateThreshold(sensor.id, 'maxTempF', e.target.value ? Number(e.target.value) : null)}
                          placeholder="—"
                          className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Min Temp (°F)</label>
                        <input
                          type="number"
                          value={th.minTempF ?? ''}
                          onChange={e => updateThreshold(sensor.id, 'minTempF', e.target.value ? Number(e.target.value) : null)}
                          placeholder="—"
                          className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Warning Buffer (°F)</label>
                        <input
                          type="number"
                          value={th.warningBuffer}
                          onChange={e => updateThreshold(sensor.id, 'warningBuffer', Number(e.target.value))}
                          className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Max Humidity (%)</label>
                        <input
                          type="number"
                          value={th.maxHumidity ?? ''}
                          onChange={e => updateThreshold(sensor.id, 'maxHumidity', e.target.value ? Number(e.target.value) : null)}
                          placeholder="—"
                          className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1e4d6b]"
                        />
                      </div>
                    </div>
                    {th.warningBuffer > 0 && th.maxTempF !== null && (
                      <div className="mt-2 text-xs text-gray-400">
                        Alert at {th.maxTempF - th.warningBuffer}°F (warning), violation at {th.maxTempF}°F
                      </div>
                    )}
                    {th.warningBuffer > 0 && th.minTempF !== null && (
                      <div className="mt-2 text-xs text-gray-400">
                        Alert at {th.minTempF + th.warningBuffer}°F (warning), violation below {th.minTempF}°F
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Configure Alerts */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Configure Alert Notifications</h2>
            <p className="text-sm text-gray-500 mb-6">Choose who gets alerted, how, and when threshold violations occur.</p>

            <div className="space-y-6">
              {/* Recipients */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Who gets alerted?</label>
                <div className="flex flex-wrap gap-2">
                  {['Kitchen Manager', 'Shift Lead', 'General Manager', 'Maintenance Team'].map(role => {
                    const selected = state.alertRecipients.includes(role);
                    return (
                      <button
                        key={role}
                        onClick={() => setState(prev => ({
                          ...prev,
                          alertRecipients: selected
                            ? prev.alertRecipients.filter(r => r !== role)
                            : [...prev.alertRecipients, role],
                        }))}
                        className="px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all"
                        style={{
                          borderColor: selected ? PRIMARY : '#e5e7eb',
                          backgroundColor: selected ? LIGHT_BG : 'white',
                          color: selected ? PRIMARY : '#6b7280',
                        }}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Methods */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Alert methods</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'push', label: 'In-App Push', icon: Bell, desc: 'Mobile + web notifications' },
                    { key: 'email', label: 'Email', icon: Mail, desc: 'Detailed alert with context' },
                    { key: 'sms', label: 'SMS', icon: Phone, desc: 'Critical alerts via text' },
                    { key: 'slack', label: 'Slack/Teams', icon: MessageSquare, desc: 'Channel notifications' },
                  ].map(method => {
                    const selected = state.alertMethods.includes(method.key);
                    return (
                      <button
                        key={method.key}
                        onClick={() => setState(prev => ({
                          ...prev,
                          alertMethods: selected
                            ? prev.alertMethods.filter(m => m !== method.key)
                            : [...prev.alertMethods, method.key],
                        }))}
                        className="text-left p-3 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: selected ? PRIMARY : '#e5e7eb',
                          backgroundColor: selected ? LIGHT_BG : 'white',
                        }}
                      >
                        <method.icon className="h-4 w-4 mb-1" style={{ color: selected ? PRIMARY : '#9ca3af' }} />
                        <div className="text-xs font-semibold" style={{ color: selected ? PRIMARY : '#374151' }}>{method.label}</div>
                        <div className="text-[10px] text-gray-400">{method.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Timing */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Alert timing</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 0, label: 'Immediate' },
                    { value: 2, label: 'After 2 min sustained' },
                    { value: 5, label: 'After 5 min sustained' },
                    { value: 10, label: 'After 10 min sustained' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setState(prev => ({ ...prev, alertDelay: opt.value }))}
                      className="px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all"
                      style={{
                        borderColor: state.alertDelay === opt.value ? PRIMARY : '#e5e7eb',
                        backgroundColor: state.alertDelay === opt.value ? LIGHT_BG : 'white',
                        color: state.alertDelay === opt.value ? PRIMARY : '#6b7280',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Escalation */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Escalation Rules</div>
                  <div className="text-xs text-gray-400">Auto-escalate to GM if not acknowledged within 15 minutes</div>
                </div>
                <button
                  onClick={() => setState(prev => ({ ...prev, escalationEnabled: !prev.escalationEnabled }))}
                  className="w-10 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: state.escalationEnabled ? PRIMARY : '#e5e7eb' }}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform" style={{ transform: state.escalationEnabled ? 'translateX(20px)' : 'translateX(4px)' }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Reading Frequency */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Set Reading Frequency</h2>
            <p className="text-sm text-gray-500 mb-6">How often should EvidLY pull data from {selectedProvider?.name}? Respects vendor rate limits.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { value: 1, label: 'Every 1 min', desc: 'Maximum frequency', rec: selectedProvider?.rateLimitPerMin === 1 },
                  { value: 5, label: 'Every 5 min', desc: 'Recommended for critical zones', rec: true },
                  { value: 15, label: 'Every 15 min', desc: 'Good for non-critical zones', rec: false },
                  { value: 30, label: 'Every 30 min', desc: 'Low-priority monitoring', rec: false },
                  { value: 60, label: 'Every 60 min', desc: 'Hourly check-ins', rec: false },
                  { value: 0, label: 'Webhook only', desc: 'Sensor pushes data to EvidLY', rec: selectedProvider?.authType === 'webhook' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setState(prev => ({ ...prev, pollingInterval: opt.value }))}
                    className="text-left p-4 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: state.pollingInterval === opt.value ? PRIMARY : '#e5e7eb',
                      backgroundColor: state.pollingInterval === opt.value ? LIGHT_BG : 'white',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold" style={{ color: state.pollingInterval === opt.value ? PRIMARY : '#374151' }}>{opt.label}</span>
                      {opt.rec && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: GOLD + '20', color: GOLD }}>Rec</span>}
                    </div>
                    <div className="text-xs text-gray-400">{opt.desc}</div>
                  </button>
                ))}
              </div>

              {selectedProvider?.rateLimitPerMin && selectedProvider.rateLimitPerMin > 0 && state.pollingInterval > 0 && (
                <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: state.pollingInterval < (60 / selectedProvider.rateLimitPerMin) ? '#fef2f2' : '#ecfdf5', color: state.pollingInterval < (60 / selectedProvider.rateLimitPerMin) ? '#ef4444' : '#059669' }}>
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  {selectedProvider.name} rate limit: {selectedProvider.rateLimitPerMin} request{selectedProvider.rateLimitPerMin !== 1 ? 's' : ''}/min.
                  {state.pollingInterval >= (60 / selectedProvider.rateLimitPerMin)
                    ? ' Your configured interval is within the rate limit.'
                    : ' Warning: this interval may exceed the rate limit.'}
                </div>
              )}

              {/* Summary */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: LIGHT_BG, border: `1px solid ${BORDER}` }}>
                <h3 className="text-sm font-bold mb-2" style={{ color: PRIMARY }}>Setup Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-500">Provider:</div>
                  <div className="font-medium text-gray-900">{selectedProvider?.name}</div>
                  <div className="text-gray-500">Sensors:</div>
                  <div className="font-medium text-gray-900">{state.discoveredSensors.filter(s => s.selected).length} selected</div>
                  <div className="text-gray-500">Alerts to:</div>
                  <div className="font-medium text-gray-900">{state.alertRecipients.join(', ')}</div>
                  <div className="text-gray-500">Methods:</div>
                  <div className="font-medium text-gray-900">{state.alertMethods.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}</div>
                  <div className="text-gray-500">Frequency:</div>
                  <div className="font-medium text-gray-900">{state.pollingInterval === 0 ? 'Webhook (real-time)' : `Every ${state.pollingInterval} min`}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation — hidden in manual mode (manual form has own buttons) */}
        {!isManualMode && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => step > 1 ? setStep((step - 1) as Step) : navigate('/sensors')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            <button
              onClick={() => step < 5 ? setStep((step + 1) as Step) : handleFinish()}
              disabled={!canNext()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ backgroundColor: canNext() ? PRIMARY : '#d1d5db' }}
            >
              {step < 5 ? (
                <>Next <ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Finish Setup <Check className="h-4 w-4" /></>
              )}
            </button>
          </div>
        )}
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
