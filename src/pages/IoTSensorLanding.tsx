import {
  Thermometer, ShieldCheck, Cloud, Zap, Bluetooth, Wifi,
  Lock, CheckCircle, ArrowRight, BarChart3, Clock, Bell,
  Database, Settings, Radio, Activity,
} from 'lucide-react';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const PROVIDERS = [
  { name: 'SensorPush', auth: 'OAuth 2.0', note: 'One-click integration', color: '#2563eb' },
  { name: 'Temp Stick', auth: 'API Key', note: 'One-click integration', color: '#16a34a' },
  { name: 'Monnit', auth: 'Webhook', note: 'One-click integration', color: '#7c3aed' },
  { name: 'Cooper-Atkins', auth: 'Bluetooth', note: 'Mobile app capture', color: '#ea580c' },
  { name: 'Testo', auth: 'Enterprise API', note: 'Enterprise partnership', color: '#dc2626' },
  { name: 'ComplianceMate', auth: 'CSV Import', note: 'Manual data transfer', color: '#0891b2' },
  { name: 'ThermoWorks', auth: 'Bluetooth', note: 'Mobile app capture', color: '#ca8a04' },
  { name: 'DeltaTrak', auth: 'API Key', note: 'Cold chain integration', color: '#059669' },
];

const METHODS = [
  { title: 'Cloud-to-Cloud API Pull', icon: Cloud, color: '#2563eb', desc: 'EvidLY polls sensor cloud APIs on your configured schedule. SensorPush OAuth 2.0, Temp Stick API keys, Monnit REST — all normalized into one unified stream.' },
  { title: 'Webhook Push', icon: Zap, color: '#059669', desc: 'Sensor platforms push data to your dedicated EvidLY webhook endpoint in real-time. Sub-second ingestion with automatic threshold checking.' },
  { title: 'Manual / Bluetooth', icon: Bluetooth, color: '#0891b2', desc: 'Capture readings via the EvidLY mobile app using Bluetooth Low Energy, or manually enter spot-check temperatures from handheld probes.' },
];

export function IoTSensorLanding() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #eef4f8 0%, #ffffff 50%)', ...F }}>
      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#1e4d6b' }}>
            <Thermometer className="h-10 w-10 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl font-bold text-gray-900">Evid</span>
            <span className="text-2xl font-bold" style={{ color: '#d4af37' }}>LY</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">IoT Sensor Hub</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Your sensors. Our intelligence. Zero manual logging.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full" style={{ backgroundColor: '#fdf8e8', border: '1px solid #d4af37' }}>
            <Lock className="h-4 w-4" style={{ color: '#d4af37' }} />
            <span className="text-sm font-semibold" style={{ color: '#d4af37' }}>Coming Soon</span>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '1', icon: Wifi, title: 'Connect Your Sensors', desc: 'Link your existing WiFi and Bluetooth temperature sensors — SensorPush, Temp Stick, Monnit, and more.' },
              { step: '2', icon: Database, title: 'Auto-Ingest Data', desc: 'EvidLY pulls readings automatically via cloud APIs, receives webhooks, or captures Bluetooth data through the mobile app.' },
              { step: '3', icon: ShieldCheck, title: 'Compliance Updates', desc: 'Temperature readings automatically feed into your compliance scores, generate alerts, and populate health department reports.' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#eef4f8' }}>
                  <item.icon className="h-6 w-6" style={{ color: '#1e4d6b' }} />
                </div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#1e4d6b', color: 'white', fontSize: '12px', fontWeight: 700 }}>{item.step}</div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Supported Sensors */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Supported Sensor Ecosystem</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PROVIDERS.map(p => (
              <div key={p.name} className="p-3 rounded-xl border border-gray-200 hover:border-[#1e4d6b] transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: p.color + '15' }}>
                  <Thermometer className="h-4 w-4" style={{ color: p.color }} />
                </div>
                <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                <div className="text-xs text-gray-500">{p.auth}</div>
                <div className="text-xs mt-1" style={{ color: '#1e4d6b' }}>{p.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Three Ingestion Methods */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Three Ways to Ingest Data</h2>
          <div className="space-y-4">
            {METHODS.map(m => (
              <div key={m.title} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: m.color + '15' }}>
                  <m.icon className="h-5 w-5" style={{ color: m.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{m.title}</h3>
                  <p className="text-xs text-gray-600">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROI Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { value: '94%', label: 'Less Manual Logging', desc: 'Automated sensor readings replace clipboard checks' },
            { value: '2 min', label: 'Alert Response', desc: 'Real-time threshold monitoring with instant notifications' },
            { value: '100%', label: 'Reading Capture', desc: 'Every data point logged — no gaps, no missed checks' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: '#1e4d6b' }}>{item.value}</div>
              <div className="text-sm font-semibold text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Integration Preview */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Webhook API Preview</h2>
          <p className="text-sm text-gray-600 mb-4">Point any sensor platform to your EvidLY webhook endpoint. We normalize everything.</p>
          <div className="rounded-xl bg-gray-900 p-5 overflow-x-auto">
            <pre className="text-xs text-green-400 font-mono whitespace-pre">
{`POST https://api.evidly.com/v1/iot/webhook/ingest
X-API-Key: sk_live_your_api_key
Content-Type: application/json

{
  "provider": "sensorpush",
  "sensors": [
    {
      "mac_address": "SP:A4:3B:7C:12:F0",
      "temperature_f": 36.2,
      "humidity_pct": 45,
      "battery_pct": 87,
      "recorded_at": "2026-02-10T14:58:12Z"
    }
  ]
}

// Response: 200 OK
{
  "ingested": 1,
  "alerts_triggered": 0,
  "compliance_updated": true
}`}</pre>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mb-12">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <Radio className="h-8 w-8 mx-auto mb-3" style={{ color: '#1e4d6b' }} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Get Early Access</h2>
            <p className="text-sm text-gray-600 mb-4">Already using temperature sensors? Let us connect them to your compliance system.</p>
            <a href="mailto:iot@evidly.com" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: '#1e4d6b' }}>
              Request Access <ArrowRight className="h-4 w-4" />
            </a>
            <p className="text-xs text-gray-400 mt-3">Free for early partners. No hardware purchase required.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-400">
          <a href="/" className="hover:text-gray-600 transition-colors">
            Powered by <span className="font-semibold text-gray-500">Evid</span><span className="font-semibold" style={{ color: '#d4af37' }}>LY</span>
          </a>
        </div>
      </div>
    </div>
  );
}
