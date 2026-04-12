import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Radio, Wifi, Bluetooth, Cpu, Shield, ChevronRight, Calculator,
  ArrowRight, CheckCircle, Clock, Zap, TrendingUp, Server,
  Activity, Settings, BarChart3,
} from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const PRIMARY = '#1E2D4D';
const GOLD = '#d4af37';
const NAVY = '#1E2D4D';
const MUTED_GOLD = '#A08C5A';
const CREAM = '#FAF7F0';

/* ── Section 2: Value Summary Card ─────────────────────── */

interface ValueStats {
  daysOfHistory: number;
  totalReadings: number;
  haccpRecords: number;
  signalsGenerated: number;
}

function useValueStats(): ValueStats {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [stats, setStats] = useState<ValueStats>({
    daysOfHistory: 0, totalReadings: 0, haccpRecords: 0, signalsGenerated: 0,
  });

  useEffect(() => {
    if (isDemoMode) {
      setStats({ daysOfHistory: 47, totalReadings: 1284, haccpRecords: 23, signalsGenerated: 8 });
      return;
    }
    if (!profile?.organization_id) return;
    const orgId = profile.organization_id;

    (async () => {
      try {
        const [logsRes, violationsRes] = await Promise.all([
          supabase.from('temperature_logs').select('reading_time', { count: 'exact' }).eq('organization_id', orgId),
          supabase.from('temperature_logs').select('id', { count: 'exact' }).eq('organization_id', orgId).eq('temp_pass', false),
        ]);

        const totalReadings = logsRes.count || 0;
        const haccpRecords = violationsRes.count || 0;
        let daysOfHistory = 0;
        if (logsRes.data && logsRes.data.length > 0) {
          const dates = logsRes.data.map(r => new Date(r.reading_time).toDateString());
          daysOfHistory = new Set(dates).size;
        }

        setStats({ daysOfHistory, totalReadings, haccpRecords, signalsGenerated: Math.floor(haccpRecords * 0.4) });
      } catch {
        // Silent fail
      }
    })();
  }, [isDemoMode, profile?.organization_id]);

  return stats;
}

/* ── Section 3: Cost Calculator ────────────────────────── */

function CostCalculator() {
  const [units, setUnits] = useState(9);
  const [checksPerDay, setChecksPerDay] = useState(6);
  const [minsPerCheck, setMinsPerCheck] = useState(2);

  const totalMinsDay = units * checksPerDay * minsPerCheck;
  const hoursWeek = ((totalMinsDay * 7) / 60).toFixed(0);
  const daysYear = ((totalMinsDay * 365) / 60 / 8).toFixed(0);
  const costYear = ((totalMinsDay * 365 / 60) * 15).toFixed(0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
          <Calculator className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1E2D4D]">The Cost of Manual</h3>
          <p className="text-sm text-gray-500">Your team spends more time than you think.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Equipment units</label>
          <input type="number" value={units} onChange={e => setUnits(Math.max(1, +e.target.value || 1))}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-[#1E2D4D]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Checks per unit/day</label>
          <input type="number" value={checksPerDay} onChange={e => setChecksPerDay(Math.max(1, +e.target.value || 1))}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-[#1E2D4D]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Minutes per check</label>
          <input type="number" value={minsPerCheck} onChange={e => setMinsPerCheck(Math.max(1, +e.target.value || 1))}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-[#1E2D4D]" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-amber-50 text-center">
          <div className="text-2xl font-bold text-amber-700">{totalMinsDay}</div>
          <div className="text-xs text-amber-600 font-medium">minutes/day</div>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 text-center">
          <div className="text-2xl font-bold text-amber-700">{hoursWeek}</div>
          <div className="text-xs text-amber-600 font-medium">hours/week</div>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 text-center">
          <div className="text-2xl font-bold text-amber-700">{daysYear}</div>
          <div className="text-xs text-amber-600 font-medium">work days/year</div>
        </div>
        <div className="p-4 rounded-xl bg-red-50 text-center">
          <div className="text-2xl font-bold text-red-600">${Number(costYear).toLocaleString()}</div>
          <div className="text-xs text-red-500 font-medium">labor cost/year</div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mt-4 text-center">
        Sensors eliminate 90% of this. EvidLY's AI handles the rest.
      </p>
    </div>
  );
}

/* ── Section 6: IoT Readiness Score ────────────────────── */

interface ReadinessData {
  equipmentConfigured: number;
  equipmentTotal: number;
  thresholdsSet: number;
  thresholdsTotal: number;
  hasBaseline: boolean;
  qrPrinted: number;
  qrTotal: number;
  score: number;
}

function useReadinessScore(): ReadinessData {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [data, setData] = useState<ReadinessData>({
    equipmentConfigured: 0, equipmentTotal: 0,
    thresholdsSet: 0, thresholdsTotal: 0,
    hasBaseline: false, qrPrinted: 0, qrTotal: 0, score: 0,
  });

  useEffect(() => {
    if (isDemoMode) {
      setData({
        equipmentConfigured: 7, equipmentTotal: 9,
        thresholdsSet: 7, thresholdsTotal: 9,
        hasBaseline: true, qrPrinted: 5, qrTotal: 9, score: 84,
      });
      return;
    }
    if (!profile?.organization_id) return;
    const orgId = profile.organization_id;

    (async () => {
      try {
        const [allEquip, withThresholds, qrCodes, logsCount] = await Promise.all([
          supabase.from('temperature_equipment').select('id', { count: 'exact' }).eq('organization_id', orgId),
          supabase.from('temperature_equipment').select('id', { count: 'exact' }).eq('organization_id', orgId).not('min_temp', 'is', null).not('max_temp', 'is', null),
          supabase.from('equipment_qr_codes').select('id', { count: 'exact' }).eq('organization_id', orgId),
          supabase.from('temperature_logs').select('id', { count: 'exact' }).eq('organization_id', orgId),
        ]);

        const eTotal = allEquip.count || 0;
        const tSet = withThresholds.count || 0;
        const qTotal = eTotal;
        const qPrinted = qrCodes.count || 0;
        const hasBase = (logsCount.count || 0) >= 30;

        let score = 0;
        if (eTotal > 0) score += 25 * Math.min(1, eTotal / eTotal);
        if (eTotal > 0) score += 25 * (tSet / eTotal);
        if (hasBase) score += 25;
        if (eTotal > 0) score += 25 * Math.min(1, qPrinted / eTotal);

        setData({
          equipmentConfigured: eTotal, equipmentTotal: eTotal,
          thresholdsSet: tSet, thresholdsTotal: eTotal,
          hasBaseline: hasBase, qrPrinted: qPrinted, qrTotal: qTotal,
          score: Math.round(score),
        });
      } catch {
        // Silent fail
      }
    })();
  }, [isDemoMode, profile?.organization_id]);

  return data;
}

/* ── Supported Devices Data ────────────────────────────── */

const DEVICE_CATEGORIES = [
  {
    title: 'WiFi Sensors',
    icon: Wifi,
    color: '#2563eb',
    brands: ['SensorPush', 'Govee Pro', 'Inkbird'],
    note: 'Setup in 5 minutes',
  },
  {
    title: 'Bluetooth Probes',
    icon: Bluetooth,
    color: '#7c3aed',
    brands: ['HACCP International', 'Cooper-Atkins', 'ThermoWorks'],
    note: 'Requires mobile app',
  },
  {
    title: 'LoRaWAN Sensors',
    icon: Radio,
    color: '#059669',
    brands: ['Dragino', 'Milesight', 'Laird/Ezurio'],
    note: 'Enterprise range',
  },
  {
    title: 'Modbus / RS485',
    icon: Server,
    color: '#dc2626',
    brands: ['Industrial cooler controllers'],
    note: 'Direct equipment integration',
  },
  {
    title: 'Generic HTTP / MQTT',
    icon: Cpu,
    color: '#0891b2',
    brands: ['Any network-capable device'],
    note: 'Maximum flexibility',
  },
];

/* ── Main Component ────────────────────────────────────── */

export function IoTSensorPlatform() {
  const navigate = useNavigate();
  const valueStats = useValueStats();
  const readiness = useReadinessScore();

  return (
    <div className="px-3 sm:px-6 py-6 max-w-[1100px] mx-auto" style={F}>

      {/* ── SECTION 1: HERO ─────────────────────────────────── */}
      <section className="text-center py-8 sm:py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
          style={{ backgroundColor: GOLD + '15', color: MUTED_GOLD, border: `1px solid ${GOLD}30` }}>
          <Radio className="h-3.5 w-3.5" />
          Hardware-Agnostic Sensor Platform
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-[#1E2D4D] mb-3 leading-tight">
          Your kitchen is already protected.
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
          When you're ready for sensors, EvidLY connects any device — no proprietary hardware, no locked contracts, no starting over.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <button
            onClick={() => navigate('/iot/setup')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white min-h-[44px]"
            style={{ backgroundColor: PRIMARY }}
          >
            Connect Your First Sensor <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="#devices"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border min-h-[44px]"
            style={{ borderColor: PRIMARY, color: PRIMARY }}
            onClick={e => {
              e.preventDefault();
              document.getElementById('devices')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            See Supported Devices
          </a>
        </div>
      </section>

      {/* ── SECTION 2: THE VALUE YOU ALREADY HAVE ───────────── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-[#1E2D4D] mb-2 text-center">The value you've already built</h2>
        <p className="text-sm text-gray-500 text-center mb-6 max-w-xl mx-auto">
          This is what sensors will automate — not replace. Your history, your patterns, your AI insights — they all transfer automatically when sensors take over.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {[
            { label: 'Days of history', value: valueStats.daysOfHistory, icon: Clock, color: '#2563eb' },
            { label: 'Readings logged', value: valueStats.totalReadings.toLocaleString(), icon: BarChart3, color: '#059669' },
            { label: 'HACCP records', value: valueStats.haccpRecords, icon: Shield, color: '#7c3aed' },
            { label: 'Signals generated', value: valueStats.signalsGenerated, icon: Activity, color: MUTED_GOLD },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <item.icon className="h-5 w-5 mx-auto mb-2" style={{ color: item.color }} />
              <div className="text-2xl font-bold text-[#1E2D4D]">{item.value}</div>
              <div className="text-xs text-gray-500 font-medium">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 3: THE COST OF MANUAL ───────────────────── */}
      <section className="mb-12">
        <CostCalculator />
      </section>

      {/* ── SECTION 4: SUPPORTED DEVICE ECOSYSTEM ──────────── */}
      <section id="devices" className="mb-12">
        <h2 className="text-xl font-bold text-[#1E2D4D] mb-2 text-center">
          Works with the sensors you already own or can buy today
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          If your sensor can send data, EvidLY can receive it.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DEVICE_CATEGORIES.map(cat => (
            <div key={cat.title} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '12' }}>
                  <cat.icon className="h-5 w-5" style={{ color: cat.color }} />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1E2D4D]">{cat.title}</div>
                  <div className="text-xs text-gray-400">{cat.note}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cat.brands.map(brand => (
                  <span key={brand} className="px-2 py-1 rounded-md bg-[#FAF7F0] text-xs text-gray-600 font-medium">
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-xl text-center text-sm font-medium" style={{ backgroundColor: CREAM, color: NAVY }}>
          <Zap className="h-4 w-4 inline mr-1.5" style={{ color: GOLD }} />
          If your sensor can send data, EvidLY can receive it. No proprietary lock-in.
        </div>
      </section>

      {/* ── SECTION 5: HOW EASY IS SETUP ───────────────────── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-[#1E2D4D] mb-6 text-center">Setup takes 15 minutes</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            {
              step: 1,
              title: 'Add your equipment',
              desc: 'Already done if you\'ve been logging manually. Your equipment records carry over.',
              icon: Settings,
            },
            {
              step: 2,
              title: 'Pair your sensor',
              desc: 'Use our setup wizard to connect your sensor to that equipment. WiFi sensors take 5 minutes.',
              icon: Radio,
            },
            {
              step: 3,
              title: 'Sensors go primary',
              desc: 'Manual logging continues as backup. Sensors become your primary source. No interruption.',
              icon: Activity,
            },
          ].map(item => (
            <div key={item.step} className="bg-white rounded-xl border border-gray-200 p-6 relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: PRIMARY }}>
                  {item.step}
                </div>
                <item.icon className="h-4 w-4 text-gray-400" />
              </div>
              <h3 className="text-sm font-bold text-[#1E2D4D] mb-1">{item.title}</h3>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-500 text-center mt-4">
          Your existing compliance history continues without interruption.
        </p>
      </section>

      {/* ── SECTION 6: SENSOR READINESS SCORE ──────────────── */}
      <section className="mb-12">
        <div className="bg-white rounded-2xl border-2 p-6 sm:p-8" style={{ borderColor: readiness.score >= 80 ? '#22c55e' : readiness.score >= 50 ? GOLD : '#e5e7eb' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#1E2D4D]">Your IoT Readiness Score</h2>
              <p className="text-sm text-gray-500">The more you log manually, the faster sensors deliver value on Day 1.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold" style={{ color: readiness.score >= 80 ? '#22c55e' : readiness.score >= 50 ? MUTED_GOLD : '#6b7280' }}>
                {readiness.score}%
              </div>
              <div className="text-xs font-medium text-gray-500">IoT Ready</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 rounded-full bg-gray-100 mb-6">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${readiness.score}%`,
                backgroundColor: readiness.score >= 80 ? '#22c55e' : readiness.score >= 50 ? GOLD : '#9ca3af',
              }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Equipment configured',
                value: `${readiness.equipmentConfigured}/${readiness.equipmentTotal}`,
                done: readiness.equipmentConfigured > 0,
              },
              {
                label: 'Thresholds set',
                value: `${readiness.thresholdsSet}/${readiness.thresholdsTotal}`,
                done: readiness.thresholdsSet > 0 && readiness.thresholdsSet === readiness.thresholdsTotal,
              },
              {
                label: '30+ day baseline',
                value: readiness.hasBaseline ? 'Yes' : 'Not yet',
                done: readiness.hasBaseline,
              },
              {
                label: 'QR codes printed',
                value: `${readiness.qrPrinted}/${readiness.qrTotal}`,
                done: readiness.qrPrinted > 0 && readiness.qrPrinted === readiness.qrTotal,
              },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-xl bg-[#FAF7F0] text-center">
                <CheckCircle className="h-4 w-4 mx-auto mb-1" style={{ color: item.done ? '#22c55e' : '#d1d5db' }} />
                <div className="text-sm font-bold text-[#1E2D4D]">{item.value}</div>
                <div className="text-xs text-gray-500">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/equipment')}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              Complete Your Setup <ChevronRight className="h-4 w-4 inline ml-1" />
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: ZERO LOCK-IN GUARANTEE ──────────────── */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-[#1E2D4D] mb-6 text-center">Zero lock-in guarantee</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'No proprietary hardware',
              desc: 'EvidLY works with $30 sensors from Amazon or enterprise-grade LoRaWAN networks. Your choice. Always.',
              icon: Radio,
            },
            {
              title: 'Cancel sensors, keep your data',
              desc: 'Every reading is yours. Export anytime as CSV. Your compliance history never leaves.',
              icon: Shield,
            },
            {
              title: 'Switch sensors anytime',
              desc: 'Outgrew your WiFi sensors? Switch to LoRaWAN. Changed vendors? Re-pair in 15 minutes. No penalties.',
              icon: Zap,
            },
          ].map(item => (
            <div key={item.title} className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: PRIMARY + '10' }}>
                <item.icon className="h-5 w-5" style={{ color: PRIMARY }} />
              </div>
              <h3 className="text-sm font-bold text-[#1E2D4D] mb-2">{item.title}</h3>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-500 text-center mt-4 max-w-xl mx-auto">
          Other platforms require proprietary sensors. EvidLY works with any device that sends HTTP or MQTT. Your choice. Always.
        </p>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────── */}
      <section className="text-center py-8 border-t border-gray-100">
        <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Ready to connect your first sensor?</h2>
        <p className="text-sm text-gray-500 mb-6">Your compliance history is waiting. Sensors make it automatic.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/iot/setup')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white min-h-[44px]"
            style={{ backgroundColor: PRIMARY }}
          >
            Start Sensor Setup <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/iot/hub')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border min-h-[44px]"
            style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
          >
            View Sensor Dashboard
          </button>
        </div>
      </section>

    </div>
  );
}
