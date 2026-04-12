import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, Wifi, Bluetooth, Radio, Cpu,
  Thermometer, Bell, Clock, Copy, AlertTriangle, Zap, CheckCircle,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { supabase } from '../lib/supabase';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const PRIMARY = '#1E2D4D';
const GOLD = '#d4af37';
const LIGHT_BG = '#eef4f8';

type Step = 1 | 2 | 3 | 4 | 5;
type SensorType = 'wifi' | 'bluetooth' | 'lorawan' | 'mqtt';

interface EquipmentOption {
  id: string;
  name: string;
  equipment_type: string;
  last_check_count: number;
}

const SENSOR_TYPES: { key: SensorType; label: string; icon: React.ElementType; desc: string; recommended?: boolean }[] = [
  { key: 'wifi', label: 'WiFi Sensor (HTTP Webhook)', icon: Wifi, desc: 'Setup in 5 minutes', recommended: true },
  { key: 'bluetooth', label: 'Bluetooth Probe', icon: Bluetooth, desc: 'Requires mobile app' },
  { key: 'lorawan', label: 'LoRaWAN', icon: Radio, desc: 'Enterprise setup, contact support' },
  { key: 'mqtt', label: 'Generic MQTT', icon: Cpu, desc: 'For advanced users' },
];

const STEP_LABELS = ['Equipment', 'Sensor Type', 'Connection', 'Alerts', 'Confirm'];

const SUPABASE_PROJECT_REF = 'your-project-ref';

function generateSensorId(): string {
  return 'ev-sensor-' + Math.random().toString(36).substring(2, 10);
}

/* ── Demo Equipment Data ─────────────────────────────── */
const DEMO_EQUIPMENT: EquipmentOption[] = [
  { id: 'eq-wic-01', name: 'Walk-in Cooler #1', equipment_type: 'storage_cold', last_check_count: 6 },
  { id: 'eq-wif-01', name: 'Walk-in Freezer', equipment_type: 'storage_frozen', last_check_count: 4 },
  { id: 'eq-hh-01', name: 'Hot Hold Station', equipment_type: 'holding_hot', last_check_count: 8 },
  { id: 'eq-ri-01', name: 'Reach-in Cooler', equipment_type: 'storage_cold', last_check_count: 3 },
  { id: 'eq-sl-01', name: 'Salad Bar Cooler', equipment_type: 'storage_cold', last_check_count: 5 },
  { id: 'eq-ds-01', name: 'Dry Storage Room', equipment_type: 'dry_storage', last_check_count: 2 },
];

/* ── Component ────────────────────────────────────────── */

export function SensorSetupWizard() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const [step, setStep] = useState<Step>(1);
  const [complete, setComplete] = useState(false);

  // Step 1: Equipment
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [loadingEquipment, setLoadingEquipment] = useState(true);

  // Step 2: Sensor Type
  const [sensorType, setSensorType] = useState<SensorType | null>(null);

  // Step 3: Connection
  const [sensorId] = useState(() => generateSensorId());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Step 4: Alerts
  const [alertThreshold, setAlertThreshold] = useState<'out_of_range' | 'near_threshold' | 'every_reading'>('out_of_range');
  const [alertDelay, setAlertDelay] = useState(15);
  const [alertChannels, setAlertChannels] = useState({ inApp: true, email: false, sms: false });

  // Step 5: Label
  const [sensorLabel, setSensorLabel] = useState('');

  // Load equipment
  useEffect(() => {
    if (isDemoMode) {
      setEquipment(DEMO_EQUIPMENT);
      setLoadingEquipment(false);
      return;
    }
    if (!profile?.organization_id) {
      setLoadingEquipment(false);
      return;
    }

    (async () => {
      try {
        const { data } = await supabase
          .from('temperature_equipment')
          .select('id, name, equipment_type')
          .eq('organization_id', profile.organization_id);

        if (data) {
          setEquipment(data.map(e => ({ ...e, last_check_count: 0 })));
        }
      } catch { /* silent */ }
      setLoadingEquipment(false);
    })();
  }, [isDemoMode, profile?.organization_id]);

  const selectedEquipObj = equipment.find(e => e.id === selectedEquipment);
  const webhookUrl = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/iot-sensor-webhook`;

  const payloadExample = JSON.stringify({
    sensor_id: sensorId,
    equipment_id: selectedEquipment || '<equipment_id>',
    organization_id: profile?.organization_id || '<org_id>',
    temperature: 38.2,
    unit: 'F',
    timestamp: new Date().toISOString(),
  }, null, 2);

  function handleTestConnection() {
    setTestStatus('testing');
    setTimeout(() => setTestStatus('success'), 1500);
  }

  function handleCopyWebhook() {
    navigator.clipboard.writeText(webhookUrl).then(() => toast.success('Webhook URL copied'));
  }

  function handleCopyPayload() {
    navigator.clipboard.writeText(payloadExample).then(() => toast.success('Payload copied'));
  }

  function handleActivate() {
    guardAction('create', 'IoT Sensors', () => {
      setComplete(true);
    });
  }

  function canNext(): boolean {
    if (step === 1) return !!selectedEquipment;
    if (step === 2) return !!sensorType;
    if (step === 3) return testStatus === 'success' || sensorType !== 'wifi';
    if (step === 4) return true;
    if (step === 5) return sensorLabel.trim().length > 0;
    return false;
  }

  // Auto-fill label
  useEffect(() => {
    if (step === 5 && !sensorLabel && selectedEquipObj) {
      setSensorLabel(`${selectedEquipObj.name} — Sensor`);
    }
  }, [step]);

  if (complete) {
    return (
      <div className="p-6 max-w-2xl mx-auto" style={F}>
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-12 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#ecfdf5' }}>
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Your sensor is live!</h2>
          <p className="text-sm text-[#1E2D4D]/50 mb-2">
            <strong>{sensorLabel}</strong> is now connected to <strong>{selectedEquipObj?.name}</strong>.
          </p>
          <p className="text-xs text-[#1E2D4D]/30 mb-6">
            Manual logging continues as backup until you disable it.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => navigate('/iot/hub')} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: PRIMARY }}>
              View Sensor Dashboard
            </button>
            <button onClick={() => navigate('/iot/platform')} className="px-5 py-2.5 rounded-xl text-sm font-bold border border-[#1E2D4D]/10 text-[#1E2D4D]/70">
              Back to Platform
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto" style={F}>
      {/* Back */}
      <button
        onClick={() => step === 1 ? navigate('/iot/platform') : setStep((step - 1) as Step)}
        className="flex items-center gap-1 text-sm text-[#1E2D4D]/50 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> {step === 1 ? 'Back to Sensor Platform' : 'Previous Step'}
      </button>

      {/* Progress */}
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
                <span className={`text-xs font-medium hidden md:block ${active ? 'text-gray-900' : 'text-[#1E2D4D]/30'}`}>{label}</span>
              </div>
              {i < 4 && <div className="flex-1 h-px" style={{ backgroundColor: done ? '#22c55e' : '#e5e7eb' }} />}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6">

        {/* ── Step 1: Choose Equipment ─────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-[#1E2D4D] mb-1">Choose Equipment</h2>
            <p className="text-sm text-[#1E2D4D]/50 mb-6">Select the equipment you want to pair with a sensor.</p>

            {loadingEquipment ? (
              <div className="py-8 text-center text-sm text-[#1E2D4D]/30">Loading equipment...</div>
            ) : equipment.length === 0 ? (
              <div className="py-8 text-center">
                <Thermometer className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-[#1E2D4D]/50 mb-3">No equipment configured yet.</p>
                <button onClick={() => navigate('/equipment')} className="px-4 py-2 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: PRIMARY }}>
                  Add Equipment First
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {equipment.map(eq => {
                  const selected = selectedEquipment === eq.id;
                  return (
                    <button
                      key={eq.id}
                      onClick={() => setSelectedEquipment(eq.id)}
                      className="w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all"
                      style={{
                        borderColor: selected ? PRIMARY : '#e5e7eb',
                        backgroundColor: selected ? LIGHT_BG : 'white',
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: selected ? PRIMARY : '#f3f4f6' }}>
                        <Thermometer className="h-5 w-5" style={{ color: selected ? 'white' : '#9ca3af' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[#1E2D4D]">{eq.name}</div>
                        <div className="text-xs text-[#1E2D4D]/30">
                          {eq.equipment_type.replace(/_/g, ' ')}
                          {eq.last_check_count > 0 && <> &middot; {eq.last_check_count} manual checks today</>}
                        </div>
                      </div>
                      {selected && <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: PRIMARY }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Choose Sensor Type ───────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-[#1E2D4D] mb-1">Choose Sensor Type</h2>
            <p className="text-sm text-[#1E2D4D]/50 mb-6">How does your sensor connect to the network?</p>

            <div className="space-y-3">
              {SENSOR_TYPES.map(st => {
                const selected = sensorType === st.key;
                return (
                  <button
                    key={st.key}
                    onClick={() => setSensorType(st.key)}
                    className="w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: selected ? PRIMARY : '#e5e7eb',
                      backgroundColor: selected ? LIGHT_BG : 'white',
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: selected ? PRIMARY : '#f3f4f6' }}>
                      <st.icon className="h-5 w-5" style={{ color: selected ? 'white' : '#9ca3af' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#1E2D4D]">{st.label}</span>
                        {st.recommended && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: GOLD + '20', color: GOLD }}>
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#1E2D4D]/30">{st.desc}</div>
                    </div>
                    {selected && <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: PRIMARY }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 3: Connection Setup ─────────────────────── */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-[#1E2D4D] mb-1">Connection Setup</h2>

            {sensorType === 'wifi' ? (
              <>
                <p className="text-sm text-[#1E2D4D]/50 mb-6">Configure your WiFi sensor to push data to this webhook URL.</p>

                {/* Webhook URL */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-[#1E2D4D]/80 mb-1">Your Webhook URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={webhookUrl}
                      readOnly
                      className="flex-1 px-3 py-2.5 rounded-lg border border-[#1E2D4D]/10 text-sm font-mono bg-[#FAF7F0] text-[#1E2D4D]/70 truncate"
                    />
                    <button onClick={handleCopyWebhook} className="flex items-center gap-1 px-3 py-2.5 rounded-lg text-sm font-medium border border-[#1E2D4D]/10 hover:bg-gray-50 flex-shrink-0">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  </div>
                </div>

                {/* Payload Format */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#1E2D4D]/80">Required Payload Format</label>
                    <button onClick={handleCopyPayload} className="text-xs text-[#1E2D4D]/30 hover:text-gray-600 flex items-center gap-1">
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                  <pre className="p-4 rounded-lg bg-gray-900 text-green-400 text-xs font-mono overflow-x-auto">
                    {payloadExample}
                  </pre>
                </div>

                {/* Test Connection */}
                <div className="flex items-center gap-3">
                  {testStatus === 'idle' && (
                    <button onClick={handleTestConnection} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1E2D4D] hover:bg-[#162340] transition-colors min-h-[44px]">
                      <Zap className="h-4 w-4" /> Test Connection
                    </button>
                  )}
                  {testStatus === 'testing' && (
                    <div className="flex items-center gap-2 text-sm text-[#1E2D4D]/50">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Testing connection...
                    </div>
                  )}
                  {testStatus === 'success' && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      Your sensor is connected!
                    </div>
                  )}
                  {testStatus === 'error' && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Connection failed. Check your sensor configuration.
                      <button onClick={() => setTestStatus('idle')} className="text-xs underline ml-2">Retry</button>
                    </div>
                  )}
                </div>
              </>
            ) : sensorType === 'bluetooth' ? (
              <div className="py-8 text-center">
                <Bluetooth className="h-12 w-12 mx-auto mb-3 text-purple-400" />
                <h3 className="text-sm font-bold text-[#1E2D4D] mb-2">Bluetooth Pairing</h3>
                <p className="text-sm text-[#1E2D4D]/50 max-w-md mx-auto mb-4">
                  Open the EvidLY mobile app and hold your Bluetooth sensor nearby to pair. The sensor will appear automatically.
                </p>
                <button onClick={() => setTestStatus('success')} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: PRIMARY }}>
                  Skip — I'll pair later via mobile app
                </button>
              </div>
            ) : sensorType === 'lorawan' ? (
              <div className="py-8 text-center">
                <Radio className="h-12 w-12 mx-auto mb-3 text-green-400" />
                <h3 className="text-sm font-bold text-[#1E2D4D] mb-2">LoRaWAN Enterprise Setup</h3>
                <p className="text-sm text-[#1E2D4D]/50 max-w-md mx-auto mb-4">
                  LoRaWAN sensors require gateway configuration and network server setup. Our team will help you configure your deployment.
                </p>
                <a href="mailto:arthur@getevidly.com" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white inline-block" style={{ backgroundColor: PRIMARY }}>
                  Contact Support
                </a>
                <button onClick={() => setTestStatus('success')} className="block mx-auto mt-3 text-xs text-[#1E2D4D]/30 hover:text-gray-600">
                  Skip — configure later
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-[#1E2D4D]/50 mb-6">Configure your device to publish to this MQTT topic.</p>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-[#1E2D4D]/80 mb-1">MQTT Topic</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={`evidly/${profile?.organization_id || '<org_id>'}/${selectedEquipment}/temperature`}
                      readOnly
                      className="flex-1 px-3 py-2.5 rounded-lg border border-[#1E2D4D]/10 text-sm font-mono bg-[#FAF7F0] text-[#1E2D4D]/70 truncate"
                    />
                    <button onClick={() => { navigator.clipboard.writeText(`evidly/${profile?.organization_id}/${selectedEquipment}/temperature`); toast.success('Topic copied'); }} className="flex items-center gap-1 px-3 py-2.5 rounded-lg text-sm font-medium border border-[#1E2D4D]/10 hover:bg-gray-50 flex-shrink-0">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  </div>
                </div>
                <button onClick={() => setTestStatus('success')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: PRIMARY }}>
                  <Zap className="h-4 w-4" /> Test Connection
                </button>
                {testStatus === 'success' && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-600 mt-3">
                    <CheckCircle className="h-5 w-5" /> Connected!
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Step 4: Alert Configuration ──────────────────── */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-[#1E2D4D] mb-1">Alert Configuration</h2>
            <p className="text-sm text-[#1E2D4D]/50 mb-6">Configure when and how you get notified about temperature issues.</p>

            {/* Alert Threshold */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-[#1E2D4D]/80 mb-2">Alert trigger</label>
              <div className="space-y-2">
                {[
                  { key: 'out_of_range' as const, label: 'Out of range only', desc: 'Alert only when temperature exceeds equipment thresholds' },
                  { key: 'near_threshold' as const, label: 'Within 2°F of threshold', desc: 'Early warning before a violation occurs' },
                  { key: 'every_reading' as const, label: 'Every reading', desc: 'Get notified of every sensor reading (high volume)' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setAlertThreshold(opt.key)}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: alertThreshold === opt.key ? PRIMARY : '#e5e7eb',
                      backgroundColor: alertThreshold === opt.key ? LIGHT_BG : 'white',
                    }}
                  >
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: alertThreshold === opt.key ? PRIMARY : '#d1d5db' }}>
                      {alertThreshold === opt.key && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIMARY }} />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                      <div className="text-xs text-[#1E2D4D]/30">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Alert Delay */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-[#1E2D4D]/80 mb-2">
                Alert delay <span className="font-normal text-[#1E2D4D]/30">(prevents false alarms from door openings)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 0, label: '0 min (immediate)' },
                  { value: 5, label: '5 min' },
                  { value: 15, label: '15 min (recommended)' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAlertDelay(opt.value)}
                    className="px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all"
                    style={{
                      borderColor: alertDelay === opt.value ? PRIMARY : '#e5e7eb',
                      backgroundColor: alertDelay === opt.value ? LIGHT_BG : 'white',
                      color: alertDelay === opt.value ? PRIMARY : '#6b7280',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Channels */}
            <div>
              <label className="block text-xs font-semibold text-[#1E2D4D]/80 mb-2">Notification channels</label>
              <div className="space-y-2">
                {[
                  { key: 'inApp' as const, label: 'In-App', desc: 'Always on — push notifications in EvidLY', locked: true },
                  { key: 'email' as const, label: 'Email', desc: 'Detailed alert with temperature history', locked: false },
                  { key: 'sms' as const, label: 'SMS', desc: 'Critical alerts via text message', locked: false },
                ].map(ch => (
                  <div key={ch.key} className="flex items-center justify-between p-3 rounded-lg border border-[#1E2D4D]/10">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{ch.label}</div>
                      <div className="text-xs text-[#1E2D4D]/30">{ch.desc}</div>
                    </div>
                    <button
                      onClick={() => !ch.locked && setAlertChannels(prev => ({ ...prev, [ch.key]: !prev[ch.key] }))}
                      className="w-10 h-6 rounded-full transition-colors flex-shrink-0"
                      style={{ backgroundColor: alertChannels[ch.key] ? PRIMARY : '#e5e7eb', cursor: ch.locked ? 'not-allowed' : 'pointer' }}
                    >
                      <div
                        className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
                        style={{ transform: alertChannels[ch.key] ? 'translateX(20px)' : 'translateX(4px)' }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 5: Name & Confirm ───────────────────────── */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-bold text-[#1E2D4D] mb-1">Name Your Sensor</h2>
            <p className="text-sm text-[#1E2D4D]/50 mb-6">Give this sensor a descriptive label so your team knows where it is.</p>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-[#1E2D4D]/80 mb-1">Sensor Label</label>
              <input
                type="text"
                value={sensorLabel}
                onChange={e => setSensorLabel(e.target.value)}
                placeholder="e.g., Walk-in Cooler #1 — North Wall Sensor"
                className="w-full px-3 py-2.5 rounded-lg border border-[#1E2D4D]/10 text-sm focus:outline-none focus:border-[#1E2D4D]"
              />
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: LIGHT_BG }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: PRIMARY }}>Setup Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-[#1E2D4D]/50">Equipment:</div>
                <div className="font-medium text-gray-900">{selectedEquipObj?.name}</div>
                <div className="text-[#1E2D4D]/50">Sensor type:</div>
                <div className="font-medium text-gray-900">{SENSOR_TYPES.find(t => t.key === sensorType)?.label}</div>
                <div className="text-[#1E2D4D]/50">Alert trigger:</div>
                <div className="font-medium text-gray-900">
                  {alertThreshold === 'out_of_range' ? 'Out of range' : alertThreshold === 'near_threshold' ? 'Near threshold' : 'Every reading'}
                </div>
                <div className="text-[#1E2D4D]/50">Alert delay:</div>
                <div className="font-medium text-gray-900">{alertDelay === 0 ? 'Immediate' : `${alertDelay} min`}</div>
                <div className="text-[#1E2D4D]/50">Channels:</div>
                <div className="font-medium text-gray-900">
                  {[alertChannels.inApp && 'In-App', alertChannels.email && 'Email', alertChannels.sms && 'SMS'].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation ──────────────────────────────────── */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => step > 1 ? setStep((step - 1) as Step) : navigate('/iot/platform')}
            className="text-sm text-[#1E2D4D]/50 hover:text-gray-700"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={() => {
              if (step < 5) setStep((step + 1) as Step);
              else handleActivate();
            }}
            disabled={!canNext()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ backgroundColor: canNext() ? PRIMARY : '#d1d5db' }}
          >
            {step < 5 ? (
              <>Next <ArrowRight className="h-4 w-4" /></>
            ) : (
              <>Activate Sensor <Check className="h-4 w-4" /></>
            )}
          </button>
        </div>
      </div>

      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  );
}
