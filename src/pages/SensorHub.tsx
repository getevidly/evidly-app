import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Thermometer, Wifi, WifiOff, Battery, BatteryWarning,
  AlertTriangle, CheckCircle, XCircle, Clock, Activity,
  Radio, Signal, Cloud, Bluetooth, FileText, Upload,
  Search, Filter, Plus, ChevronRight, Zap, X,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, Info,
  Droplets, Wind, DoorOpen,
} from 'lucide-react';
import {
  iotSensorProviders, iotSensors as demoSensors, iotSensorReadings,
  iotSensorAlerts, iotIngestionLog, locations as demoLocations,
  type IoTSensor,
} from '../data/demoData';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

/* ── Real-Time Connectivity ──────────────────────────────────
 * When a sensor is added (manual or provider-based), EvidLY will:
 *   1. INSERT row into `iot_sensors` / `sensor_devices` via Supabase
 *   2. Subscribe to Supabase Realtime channel for that sensor's readings
 *   3. On each new reading, evaluate against configured alert thresholds
 *   4. If threshold violated, INSERT into `iot_sensor_alerts` and push notification
 *   5. This Manage Sensors page subscribes to `iot_sensors` table changes
 *      so new sensors appear without page refresh
 *
 * Pre-launch mode: Static demo data from demoData.ts. No Supabase writes.
 * Post-launch edge functions: iot-sensor-pull (API polling), iot-sensor-webhook
 *   (push receiver), sensor-threshold-evaluate (real-time threshold check)
 * ─────────────────────────────────────────────────────────── */

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const PRIMARY = '#1e4d6b';
const GOLD = '#d4af37';
const LIGHT_BG = '#eef4f8';
const BORDER = '#b8d4e8';
const INPUT_CLASS = 'w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent';

/* ── Sensor Type Config ──────────────────────────────────── */

type SensorType = 'temperature' | 'humidity' | 'co2' | 'door_contact';

const SENSOR_TYPE_OPTIONS: { value: SensorType; label: string; icon: typeof Thermometer }[] = [
  { value: 'temperature', label: 'Temperature', icon: Thermometer },
  { value: 'humidity', label: 'Humidity', icon: Droplets },
  { value: 'co2', label: 'CO₂', icon: Wind },
  { value: 'door_contact', label: 'Door Contact', icon: DoorOpen },
];

const SENSOR_TYPE_DEFAULTS: Record<SensorType, { min: number | null; max: number | null; unit: string }> = {
  temperature: { min: null, max: 41, unit: '°F' },
  humidity: { min: 20, max: 70, unit: '%' },
  co2: { min: null, max: 1000, unit: 'ppm' },
  door_contact: { min: null, max: null, unit: '' },
};

const POLLING_OPTIONS = [
  { value: 1, label: '1 min' },
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
];

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

/* ── Add Sensor Modal ─────────────────────────────────────── */

interface AddSensorModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (sensor: IoTSensor) => void;
  isDemoMode: boolean;
}

function AddSensorModal({ open, onClose, onSave, isDemoMode }: AddSensorModalProps) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [sensorType, setSensorType] = useState<SensorType>('temperature');
  const [locationId, setLocationId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [minThreshold, setMinThreshold] = useState<string>('');
  const [maxThreshold, setMaxThreshold] = useState<string>('');
  const [pollingInterval, setPollingInterval] = useState(5);

  // Apply defaults when sensor type changes
  useEffect(() => {
    const defaults = SENSOR_TYPE_DEFAULTS[sensorType];
    setMinThreshold(defaults.min !== null ? String(defaults.min) : '');
    setMaxThreshold(defaults.max !== null ? String(defaults.max) : '');
  }, [sensorType]);

  const locationName = useMemo(() => {
    const loc = demoLocations.find(l => l.id === locationId);
    return loc?.name || '';
  }, [locationId]);

  const filteredEquipment = useMemo(() =>
    EQUIPMENT_OPTIONS.filter(eq => eq.locationId === locationId),
  [locationId]);

  const resetForm = () => {
    setName('');
    setSensorType('temperature');
    setLocationId('');
    setEquipmentId('');
    setMinThreshold('');
    setMaxThreshold(String(SENSOR_TYPE_DEFAULTS.temperature.max ?? ''));
    setPollingInterval(5);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !locationId) return;

    setSaving(true);

    // Build the sensor object for optimistic UI
    const newSensor: IoTSensor = {
      id: `iot-new-${Date.now()}`,
      providerSlug: 'manual',
      name: name.trim(),
      macAddress: '',
      type: sensorType === 'co2' ? 'combo' : sensorType === 'door_contact' ? 'pressure' : sensorType,
      locationName,
      zone: name.trim(),
      equipmentLinkId: equipmentId || null,
      batteryPct: 100,
      signalRssi: -40,
      firmware: 'v1.0.0',
      status: 'online',
      lastSeenAt: new Date().toISOString(),
      currentTempF: sensorType === 'temperature' ? 38.0 : 0,
      currentHumidity: sensorType === 'humidity' ? 45 : null,
    };

    if (!isDemoMode && profile?.organization_id) {
      // Save to Supabase — realtime subscription will also pick this up
      const { data, error } = await supabase.from('iot_sensors').insert({
        organization_id: profile.organization_id,
        name: name.trim(),
        sensor_type: sensorType,
        location_id: locationId,
        location_name: locationName,
        equipment_link_id: equipmentId || null,
        min_threshold: minThreshold ? parseFloat(minThreshold) : null,
        max_threshold: maxThreshold ? parseFloat(maxThreshold) : null,
        polling_interval_min: pollingInterval,
        status: 'online',
        provider_slug: 'manual',
      }).select('id').single();

      if (error) {
        toast.error('Failed to save sensor. Please try again.');
        setSaving(false);
        return;
      }
      if (data?.id) newSensor.id = data.id;
    }

    // Optimistic UI update
    onSave(newSensor);
    toast.success(`Sensor "${name.trim()}" added successfully`);
    setSaving(false);
    resetForm();
    onClose();
  };

  if (!open) return null;

  const thresholdUnit = SENSOR_TYPE_DEFAULTS[sensorType].unit;
  const showThresholds = sensorType !== 'door_contact';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl p-5 w-[95vw] sm:w-auto sm:min-w-[480px] max-w-lg max-h-[90vh] overflow-y-auto relative" style={F}>
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-gray-900 mb-1 pr-8">Add Sensor</h3>
        <p className="text-sm text-gray-500 mb-5">Configure a new IoT sensor for monitoring.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sensor Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Sensor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Walk-in Cooler #2"
              required
              className={INPUT_CLASS}
            />
          </div>

          {/* Sensor Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sensor Type</label>
            <div className="grid grid-cols-2 gap-2">
              {SENSOR_TYPE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const selected = sensorType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSensorType(opt.value)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                      selected
                        ? 'border-[#1e4d6b] bg-[#eef4f8] text-[#1e4d6b]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Location <span className="text-red-500">*</span>
            </label>
            <select
              value={locationId}
              onChange={e => { setLocationId(e.target.value); setEquipmentId(''); }}
              required
              className={INPUT_CLASS}
            >
              <option value="">Select location...</option>
              {demoLocations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name} — {loc.address}</option>
              ))}
            </select>
          </div>

          {/* Equipment Assignment (optional) */}
          {locationId && filteredEquipment.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Equipment Assignment <span className="text-gray-400 text-xs font-normal">(optional)</span>
              </label>
              <select
                value={equipmentId}
                onChange={e => setEquipmentId(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">No equipment link</option>
                {filteredEquipment.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Alert Thresholds */}
          {showThresholds && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Alert Thresholds ({thresholdUnit})
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min</label>
                  <input
                    type="number"
                    step="any"
                    value={minThreshold}
                    onChange={e => setMinThreshold(e.target.value)}
                    placeholder="—"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max</label>
                  <input
                    type="number"
                    step="any"
                    value={maxThreshold}
                    onChange={e => setMaxThreshold(e.target.value)}
                    placeholder="—"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              {sensorType === 'temperature' && (
                <p className="text-xs text-gray-400 mt-1.5">FDA default: 41°F max for cold holding</p>
              )}
            </div>
          )}

          {/* Polling Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Polling Interval</label>
            <select
              value={pollingInterval}
              onChange={e => setPollingInterval(Number(e.target.value))}
              className={INPUT_CLASS}
            >
              {POLLING_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !locationId || saving}
              className="flex-1 px-4 py-3 text-sm font-bold text-white rounded-lg transition-colors disabled:opacity-40"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = '#2a6a8f'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = PRIMARY; }}
            >
              {saving ? 'Saving...' : 'Add Sensor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────── */

export function SensorHub() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // ── Sensor state: demo uses static data, live uses Supabase ──
  const [liveSensors, setLiveSensors] = useState<IoTSensor[]>([]);
  const [liveLoading, setLiveLoading] = useState(!isDemoMode);

  // In demo mode, start with demoSensors. In live mode, load from Supabase.
  const [localAddedSensors, setLocalAddedSensors] = useState<IoTSensor[]>([]);

  const allSensors = useMemo(() => {
    if (isDemoMode) return [...demoSensors, ...localAddedSensors];
    return [...liveSensors, ...localAddedSensors];
  }, [isDemoMode, liveSensors, localAddedSensors]);

  // ── Live mode: fetch sensors from Supabase ──
  useEffect(() => {
    if (isDemoMode || !profile?.organization_id) {
      setLiveLoading(false);
      return;
    }
    const fetchSensors = async () => {
      const { data } = await supabase
        .from('iot_sensors')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (data) {
        setLiveSensors(data.map((row: any) => ({
          id: row.id,
          providerSlug: row.provider_slug || 'manual',
          name: row.name,
          macAddress: row.mac_address || '',
          type: row.sensor_type || 'temperature',
          locationName: row.location_name || '',
          zone: row.name,
          equipmentLinkId: row.equipment_link_id || null,
          batteryPct: row.battery_pct ?? 100,
          signalRssi: row.signal_rssi ?? -40,
          firmware: row.firmware || 'v1.0.0',
          status: row.status || 'online',
          lastSeenAt: row.last_seen_at || row.created_at || new Date().toISOString(),
          currentTempF: row.current_temp_f ?? 0,
          currentHumidity: row.current_humidity ?? null,
        })));
      }
      setLiveLoading(false);
    };
    fetchSensors();
  }, [isDemoMode, profile?.organization_id]);

  // ── Supabase Realtime subscription for live sensor inserts ──
  useEffect(() => {
    if (isDemoMode || !profile?.organization_id) return;

    const channel = supabase
      .channel('iot-sensors-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'iot_sensors',
          filter: `organization_id=eq.${profile.organization_id}`,
        },
        (payload) => {
          const row = payload.new as any;
          const sensor: IoTSensor = {
            id: row.id,
            providerSlug: row.provider_slug || 'manual',
            name: row.name,
            macAddress: row.mac_address || '',
            type: row.sensor_type || 'temperature',
            locationName: row.location_name || '',
            zone: row.name,
            equipmentLinkId: row.equipment_link_id || null,
            batteryPct: row.battery_pct ?? 100,
            signalRssi: row.signal_rssi ?? -40,
            firmware: row.firmware || 'v1.0.0',
            status: row.status || 'online',
            lastSeenAt: row.last_seen_at || row.created_at || new Date().toISOString(),
            currentTempF: row.current_temp_f ?? 0,
            currentHumidity: row.current_humidity ?? null,
          };
          // Only add if not already present from optimistic update
          setLiveSensors(prev => {
            if (prev.some(s => s.id === sensor.id)) return prev;
            return [sensor, ...prev];
          });
          // Remove from local-added if it was an optimistic placeholder
          setLocalAddedSensors(prev => prev.filter(s => !s.id.startsWith('iot-new-')));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isDemoMode, profile?.organization_id]);

  const handleSensorAdded = useCallback((sensor: IoTSensor) => {
    setLocalAddedSensors(prev => [sensor, ...prev]);
  }, []);

  const locations = useMemo(() => [...new Set(allSensors.map(s => s.locationName))].sort(), [allSensors]);
  const activeAlerts = useMemo(() => isDemoMode ? iotSensorAlerts.filter(a => !a.acknowledged) : [], [isDemoMode]);

  const filtered = useMemo(() => {
    return allSensors.filter(s => {
      if (locationFilter !== 'all' && s.locationName !== locationFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.zone.toLowerCase().includes(q) || s.macAddress.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allSensors, search, locationFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = allSensors.length;
    if (total === 0) return { total: 0, online: 0, onlinePct: 0, violations: 0, alerts: 0 };
    const online = allSensors.filter(s => s.status === 'online').length;
    const violations = isDemoMode ? iotSensorReadings.filter(r => r.complianceStatus === 'violation').length : 0;
    return { total, online, onlinePct: Math.round((online / total) * 100), violations, alerts: activeAlerts.length };
  }, [allSensors, isDemoMode, activeAlerts]);

  // ── Empty State (no sensors at all) ──
  if (!liveLoading && allSensors.length === 0) {
    return (
      <div className="px-3 sm:px-6 py-6 max-w-[1400px] mx-auto" style={F}>
        {/* Header with Add Sensor button */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>
              <Radio className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Sensors</h1>
              <p className="text-sm text-gray-500">Add, configure, and manage IoT sensors across your locations.</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors min-h-[44px]"
            style={{ backgroundColor: PRIMARY }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = PRIMARY)}
          >
            <Plus className="h-4 w-4" /> Add Sensor
          </button>
        </div>

        {/* Empty state card */}
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Radio className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Sensors Configured</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Add your first IoT sensor to start monitoring temperatures, humidity, and more across your locations.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ backgroundColor: PRIMARY }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = PRIMARY)}
          >
            <Plus className="h-4 w-4" /> Add Your First Sensor
          </button>
        </div>

        <AddSensorModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSensorAdded}
          isDemoMode={isDemoMode}
        />
      </div>
    );
  }

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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Sensors</h1>
              <p className="text-sm text-gray-500">Add, configure, and manage IoT sensors across your locations.</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors min-h-[44px]"
          style={{ backgroundColor: PRIMARY }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = PRIMARY)}
        >
          <Plus className="h-4 w-4" /> Add Sensor
        </button>
      </div>

      {/* Admin vs Dashboard distinction banner */}
      <div
        className="flex items-center justify-between flex-wrap gap-2 px-4 py-2.5 rounded-lg mb-6"
        style={{ backgroundColor: LIGHT_BG, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-2 text-sm" style={{ color: '#3D5068' }}>
          <Info className="h-4 w-4 flex-shrink-0" style={{ color: PRIMARY }} />
          <span><strong>Manage Sensors</strong> (Admin) &mdash; Add and configure individual sensors</span>
        </div>
        <Link
          to="/iot-monitoring"
          className="flex items-center gap-1 text-sm font-medium transition-colors"
          style={{ color: PRIMARY }}
          onMouseEnter={e => (e.currentTarget.style.color = '#2a6a8f')}
          onMouseLeave={e => (e.currentTarget.style.color = PRIMARY)}
        >
          View Live IoT Dashboard <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Sensors', value: stats.total, icon: Radio, color: PRIMARY, sub: isDemoMode ? `${iotSensorProviders.filter(p => p.status === 'connected').length} providers connected` : `${allSensors.length} configured` },
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

      {/* Three Ingestion Methods — demo only */}
      {isDemoMode && (
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
      )}

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
              {filtered.map((sensor) => {
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

      {/* Recent Ingestion Activity — demo only */}
      {isDemoMode && (
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
      )}

      {/* Add Sensor Modal */}
      <AddSensorModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSensorAdded}
        isDemoMode={isDemoMode}
      />
    </div>
  );
}
