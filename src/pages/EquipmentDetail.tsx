import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Wrench, Shield, Clock, MapPin, Calendar, Flame, UtensilsCrossed,
  Truck, AlertTriangle, Plus, CheckCircle, XCircle, ChevronRight, Package,
  DollarSign, TrendingUp, QrCode, Printer,
} from 'lucide-react';
import { EquipmentQRCode } from '../components/EquipmentQRCode';
import { format } from 'date-fns';

// ── Brand ─────────────────────────────────────────────────────────
const NAVY = '#1e4d6b';
const GOLD = '#d4af37';
const F: React.CSSProperties = { fontFamily: "'Inter', 'DM Sans', sans-serif" };

// ── Types (matching Equipment.tsx) ────────────────────────────────
type Condition = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
type EquipmentStatus = 'operational' | 'needs_repair' | 'out_of_service' | 'decommissioned';

interface ServiceRecord { date: string; vendor: string; type: string; cost: number; notes: string; }
interface ScheduleItem { task: string; interval: string; lastDone: string; nextDue: string; }

interface EquipmentItem {
  id: string; name: string; type: string; make: string; model: string; serial: string;
  locationId: string; location: string; installDate: string; purchasePrice: number;
  warrantyExpiry: string; warrantyProvider: string; warrantyTerms: string; warrantyContact?: string;
  condition: Condition; nextMaintenanceDue: string; maintenanceInterval: string;
  linkedVendor: string; usefulLifeYears: number; replacementCost: number;
  status?: EquipmentStatus; pillar?: 'fire_safety' | 'food_safety';
  notes: string; serviceHistory: ServiceRecord[]; schedule: ScheduleItem[];
}

// ── Helpers ───────────────────────────────────────────────────────
const NOW = new Date('2026-02-09');
function daysBetween(a: string | Date, b: string | Date): number { return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000); }
function ageLabel(d: string): string { const m = Math.floor((NOW.getTime() - new Date(d).getTime()) / (30.44 * 86400000)); return `${Math.floor(m / 12)} yr${Math.floor(m / 12) !== 1 ? 's' : ''} ${m % 12} mo`; }
function conditionColor(c: string) { const m: Record<string, string> = { Excellent: '#16a34a', Good: '#22c55e', Fair: '#d97706', Poor: '#f97316', Critical: '#dc2626' }; return m[c] || '#6b7280'; }
function conditionBg(c: string) { const m: Record<string, string> = { Excellent: '#f0fdf4', Good: '#f0fdf4', Fair: '#fffbeb', Poor: '#fff7ed', Critical: '#fef2f2' }; return m[c] || '#f9fafb'; }
function statusInfo(s?: EquipmentStatus) { const m: Record<string, { label: string; color: string; bg: string }> = { needs_repair: { label: 'Needs Repair', color: '#d97706', bg: '#fffbeb' }, out_of_service: { label: 'Out of Service', color: '#dc2626', bg: '#fef2f2' }, decommissioned: { label: 'Decommissioned', color: '#6b7280', bg: '#f3f4f6' } }; return m[s || ''] || { label: 'Operational', color: '#16a34a', bg: '#f0fdf4' }; }
function warrantyInfo(exp: string) { const d = daysBetween(NOW, exp); if (d < 0) return { label: 'Expired', color: '#dc2626', bg: '#fef2f2' }; if (d <= 90) return { label: 'Expiring Soon', color: '#d97706', bg: '#fffbeb' }; return { label: 'Active', color: '#16a34a', bg: '#f0fdf4' }; }
function maintenanceInfo(nextDue: string) { const d = daysBetween(NOW, nextDue); if (d < 0) return { label: `${Math.abs(d)}d overdue`, color: '#dc2626', bg: '#fef2f2', overdue: true }; if (d <= 7) return { label: `Due in ${d}d`, color: '#d97706', bg: '#fffbeb', overdue: false }; if (d <= 30) return { label: `Due in ${d}d`, color: '#2563eb', bg: '#eff6ff', overdue: false }; return { label: format(new Date(nextDue), 'MMM d, yyyy'), color: '#6b7280', bg: '#f9fafb', overdue: false }; }
const FIRE_TYPES = new Set(['Hood System', 'Fire Suppression System', 'Exhaust Fan']);
function getPillar(eq: EquipmentItem): 'fire_safety' | 'food_safety' { return eq.pillar || (FIRE_TYPES.has(eq.type) ? 'fire_safety' : 'food_safety'); }

const badge = (text: string, color: string, bg: string): React.CSSProperties => ({
  fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px',
  color, backgroundColor: bg, display: 'inline-block', whiteSpace: 'nowrap',
});

// ── Demo Data (subset — same items as Equipment.tsx) ─────────────
// This minimal lookup allows EquipmentDetail to render without extracting the full 400-line dataset
const DEMO_EQUIPMENT: EquipmentItem[] = [
  { id: 'EQ-001', name: 'Walk-in Cooler #1', type: 'Walk-in Cooler', make: 'True Manufacturing', model: 'TG2R-2S', serial: 'TM-2019-04821', locationId: '1', location: 'Downtown Kitchen', installDate: '2019-01-15', purchasePrice: 9500, warrantyExpiry: '2024-01-15', warrantyProvider: 'True Manufacturing', warrantyTerms: '5-year parts and labor', warrantyContact: '1-800-878-3633', condition: 'Good', nextMaintenanceDue: '2026-02-28', maintenanceInterval: 'Quarterly', linkedVendor: 'CleanAir HVAC', usefulLifeYears: 15, replacementCost: 11000, status: 'operational', notes: 'Replaced door gaskets Oct 2025. Running well.', serviceHistory: [{ date: '2025-10-12', vendor: 'CleanAir HVAC', type: 'Door Gasket Replacement', cost: 450, notes: 'Replaced both door gaskets, checked refrigerant levels' }, { date: '2025-07-08', vendor: 'CleanAir HVAC', type: 'Quarterly Maintenance', cost: 275, notes: 'Cleaned condenser coils, thermostat calibration' }], schedule: [{ task: 'Condenser coil cleaning', interval: 'Quarterly', lastDone: '2025-10-12', nextDue: '2026-01-12' }, { task: 'Thermostat calibration', interval: 'Semi-Annual', lastDone: '2025-07-08', nextDue: '2026-01-08' }] },
  { id: 'EQ-003', name: 'Hood Ventilation System', type: 'Hood System', make: 'Captive Aire', model: 'CK-48', serial: 'CA-2018-30982', locationId: '1', location: 'Downtown Kitchen', installDate: '2018-08-20', purchasePrice: 18000, warrantyExpiry: '2023-08-20', warrantyProvider: 'Captive Aire', warrantyTerms: '5-year limited', condition: 'Fair', nextMaintenanceDue: '2026-01-20', maintenanceInterval: 'Quarterly', linkedVendor: 'ABC Fire Protection', usefulLifeYears: 20, replacementCost: 22000, notes: 'Fan belt showing wear. Schedule replacement next service.', serviceHistory: [{ date: '2025-10-20', vendor: 'ABC Fire Protection', type: 'Hood Cleaning', cost: 850, notes: 'Full hood and duct cleaning. Fan belt showing wear.' }, { date: '2025-07-20', vendor: 'ABC Fire Protection', type: 'Hood Cleaning', cost: 850, notes: 'Quarterly deep clean. Grease buildup moderate.' }], schedule: [{ task: 'Hood & duct cleaning', interval: 'Quarterly', lastDone: '2025-10-20', nextDue: '2026-01-20' }, { task: 'Baffle filter replacement', interval: 'Annual', lastDone: '2025-04-18', nextDue: '2026-04-18' }] },
  { id: 'EQ-004', name: 'Fire Suppression System', type: 'Fire Suppression System', make: 'Ansul', model: 'R-102', serial: 'AN-2020-78543', locationId: '1', location: 'Downtown Kitchen', installDate: '2020-11-05', purchasePrice: 6500, warrantyExpiry: '2026-11-05', warrantyProvider: 'Ansul / Tyco', warrantyTerms: '6-year system warranty', condition: 'Good', nextMaintenanceDue: '2026-05-05', maintenanceInterval: 'Semi-Annual', linkedVendor: 'Valley Fire Systems', usefulLifeYears: 12, replacementCost: 7500, notes: 'Semi-annual inspection by Valley Fire. Under warranty.', serviceHistory: [{ date: '2025-11-05', vendor: 'Valley Fire Systems', type: 'Semi-Annual Inspection', cost: 0, notes: 'Warranty inspection. All nozzles clear, agent level OK.' }, { date: '2025-05-05', vendor: 'Valley Fire Systems', type: 'Semi-Annual Inspection', cost: 0, notes: 'System test passed. Links inspected.' }], schedule: [{ task: 'System inspection & test', interval: 'Semi-Annual', lastDone: '2025-11-05', nextDue: '2026-05-05' }] },
  { id: 'EQ-007', name: 'Commercial Dishwasher', type: 'Commercial Dishwasher', make: 'Hobart', model: 'AM15', serial: 'HB-2017-19843', locationId: '1', location: 'Downtown Kitchen', installDate: '2017-09-01', purchasePrice: 12000, warrantyExpiry: '2022-09-01', warrantyProvider: 'Hobart', warrantyTerms: '5-year parts and labor', condition: 'Poor', nextMaintenanceDue: '2026-01-01', maintenanceInterval: 'Quarterly', linkedVendor: 'CleanAir HVAC', usefulLifeYears: 8, replacementCost: 14500, status: 'needs_repair', notes: 'Past useful life. Frequent repairs. Replacement recommended.', serviceHistory: [{ date: '2025-12-18', vendor: 'CleanAir HVAC', type: 'Emergency Repair', cost: 1200, notes: 'Replaced wash pump motor.' }, { date: '2025-10-01', vendor: 'CleanAir HVAC', type: 'Quarterly Service', cost: 375, notes: 'Cleaned spray arms, descaled booster heater.' }], schedule: [{ task: 'Spray arm cleaning & descale', interval: 'Quarterly', lastDone: '2025-10-01', nextDue: '2026-01-01' }] },
  { id: 'EQ-009', name: 'Hood Ventilation System', type: 'Hood System', make: 'Captive Aire', model: 'CK-36', serial: 'CA-2020-41567', locationId: '2', location: 'Airport Cafe', installDate: '2020-05-22', purchasePrice: 14000, warrantyExpiry: '2025-05-22', warrantyProvider: 'Captive Aire', warrantyTerms: '5-year limited', condition: 'Good', nextMaintenanceDue: '2026-02-22', maintenanceInterval: 'Quarterly', linkedVendor: 'ABC Fire Protection', usefulLifeYears: 20, replacementCost: 18000, notes: 'Warranty recently expired. Good shape.', serviceHistory: [{ date: '2025-11-22', vendor: 'ABC Fire Protection', type: 'Hood Cleaning', cost: 750, notes: 'Full cleaning. Good condition.' }], schedule: [{ task: 'Hood & duct cleaning', interval: 'Quarterly', lastDone: '2025-11-22', nextDue: '2026-02-22' }] },
  { id: 'EQ-017', name: 'Upblast Exhaust Fan — Main Hood', type: 'Exhaust Fan', make: 'Captive Aire', model: 'DU33HFA', serial: 'CA-2021-44812', locationId: '1', location: 'Downtown Kitchen', installDate: '2021-03-15', purchasePrice: 3200, warrantyExpiry: '2026-03-15', warrantyProvider: 'Captive Aire', warrantyTerms: '5-year limited', condition: 'Good', nextMaintenanceDue: '2026-03-10', maintenanceInterval: 'Quarterly', linkedVendor: 'ABC Fire Protection', usefulLifeYears: 15, replacementCost: 3800, notes: 'Cleaned with main hood system. Belt replaced Oct 2025.', serviceHistory: [{ date: '2025-12-10', vendor: 'ABC Fire Protection', type: 'Quarterly Cleaning', cost: 0, notes: 'Fan blades cleaned, hinge kit lubricated.' }], schedule: [{ task: 'Clean blades & housing', interval: 'Quarterly', lastDone: '2025-12-10', nextDue: '2026-03-10' }] },
];

type DetailTab = 'overview' | 'service' | 'schedule' | 'lifecycle';

export function EquipmentDetail() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  const equipment = useMemo(() => {
    return DEMO_EQUIPMENT.find(e => e.id === equipmentId) || null;
  }, [equipmentId]);

  if (!equipment) {
    return (
      <div style={F} className="max-w-4xl mx-auto py-8 px-4">
        <button onClick={() => navigate('/equipment')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={16} /> Back to Equipment
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <Package size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Equipment not found</p>
          <p className="text-sm mt-1">This item may have been removed or the ID is invalid.</p>
        </div>
      </div>
    );
  }

  const pillar = getPillar(equipment);
  const isFire = pillar === 'fire_safety';
  const st = statusInfo(equipment.status);
  const w = warrantyInfo(equipment.warrantyExpiry);
  const m = maintenanceInfo(equipment.nextMaintenanceDue);
  const totalServiceCost = equipment.serviceHistory.reduce((s, r) => s + r.cost, 0);

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'service', label: `Service History (${equipment.serviceHistory.length})` },
    { id: 'schedule', label: 'Schedule' },
    { id: 'lifecycle', label: 'Lifecycle' },
  ];

  return (
    <div style={F} className="max-w-4xl mx-auto">
      {/* Back link */}
      <button onClick={() => navigate('/equipment')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Back to Equipment
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="p-5 border-b border-gray-200" style={{ backgroundColor: '#eef4f8' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{equipment.name}</h1>
              <p className="text-sm text-gray-600 mt-0.5">{equipment.make} {equipment.model} · S/N: {equipment.serial}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <span style={badge(st.label, st.color, st.bg)}>{st.label}</span>
                <span style={{ ...badge(isFire ? 'Fire Safety' : 'Food Safety', isFire ? '#b91c1c' : '#166534', isFire ? '#fef2f2' : '#f0fdf4'), display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  {isFire ? <Flame size={10} /> : <UtensilsCrossed size={10} />}
                  {isFire ? 'Fire Safety' : 'Food Safety'}
                </span>
                <span style={badge(equipment.condition, conditionColor(equipment.condition), conditionBg(equipment.condition))}>{equipment.condition}</span>
                <span style={badge(`Warranty: ${w.label}`, w.color, w.bg)}>Warranty: {w.label}</span>
                <span style={badge(m.label, m.color, m.bg)}>{m.label}</span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/equipment/${equipment.id}/service/new`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: NAVY }}
            >
              <Plus size={16} /> Record Service
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1e4d6b] text-[#1e4d6b]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {/* Overview */}
          {activeTab === 'overview' && (<>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Equipment Info</h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /><span className="text-gray-600">{equipment.location}</span></div>
                  <div className="flex items-center gap-2"><Calendar size={14} className="text-gray-400" /><span className="text-gray-600">Installed {format(new Date(equipment.installDate), 'MMM d, yyyy')} · {ageLabel(equipment.installDate)}</span></div>
                  <div className="flex items-center gap-2"><Wrench size={14} className="text-gray-400" /><span className="text-gray-600">{equipment.maintenanceInterval} maintenance</span></div>
                  <div className="flex items-center gap-2"><Truck size={14} className="text-gray-400" /><span className="text-gray-600">{equipment.linkedVendor}</span></div>
                </div>
                {equipment.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">{equipment.notes}</div>
                )}
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Warranty</h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Provider</span><span className="text-gray-900 font-medium">{equipment.warrantyProvider}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Terms</span><span className="text-gray-900">{equipment.warrantyTerms}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Expires</span><span style={{ color: w.color, fontWeight: 600 }}>{format(new Date(equipment.warrantyExpiry), 'MMM d, yyyy')}</span></div>
                  {equipment.warrantyContact && <div className="flex justify-between"><span className="text-gray-500">Contact</span><span className="text-gray-900 text-xs">{equipment.warrantyContact}</span></div>}
                </div>
              </div>
            </div>

            {/* QR Code for Temperature Logging */}
            {equipment.pillar === 'food_safety' && (
              <div className="mt-6 border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <QrCode size={16} style={{ color: NAVY }} />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">QR Temperature Label</h3>
                  </div>
                  <button
                    onClick={() => alert('Batch printing QR labels for all equipment at this location. (Demo)')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-gray-50 transition-colors"
                    style={{ color: NAVY, borderColor: '#b8d4e8' }}
                  >
                    <Printer size={12} />
                    Batch Print Labels
                  </button>
                </div>
                <div className="max-w-xs mx-auto">
                  <EquipmentQRCode
                    equipmentId={equipment.id}
                    equipmentName={equipment.name}
                    locationName={equipment.location}
                    size={140}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center mt-3">
                  Staff scan this label to instantly log a temperature reading — CalCode §113996
                </p>
              </div>
            )}
          </>)}

          {/* Service History */}
          {activeTab === 'service' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Service History</h3>
                <div className="text-xs text-gray-500">Total cost: <strong className="text-gray-900">${totalServiceCost.toLocaleString()}</strong></div>
              </div>
              {equipment.serviceHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No service records yet.</div>
              ) : (
                <div className="space-y-3">
                  {equipment.serviceHistory.map((sr, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Wrench size={14} className="text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{sr.type}</span>
                          <span className="text-xs text-gray-500">{format(new Date(sr.date), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{sr.vendor} · {sr.cost > 0 ? `$${sr.cost.toLocaleString()}` : 'No charge'}</div>
                        {sr.notes && <div className="text-xs text-gray-600 mt-1">{sr.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => navigate(`/equipment/${equipment.id}/service/new`)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white mt-4"
                style={{ backgroundColor: NAVY }}
              >
                <Plus size={14} /> Add Service Record
              </button>
            </div>
          )}

          {/* Schedule */}
          {activeTab === 'schedule' && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Maintenance Schedule</h3>
              {equipment.schedule.map((s, i) => {
                const mi = maintenanceInfo(s.nextDue);
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{s.task}</div>
                      <div className="text-xs text-gray-500">Every {s.interval} · Last: {format(new Date(s.lastDone), 'MMM d, yyyy')}</div>
                    </div>
                    <span style={badge(mi.label, mi.color, mi.bg)}>{mi.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lifecycle */}
          {activeTab === 'lifecycle' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <DollarSign size={20} className="mx-auto mb-1 text-gray-400" />
                <div className="text-lg font-bold text-gray-900">${equipment.purchasePrice.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Purchase Price</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <TrendingUp size={20} className="mx-auto mb-1 text-gray-400" />
                <div className="text-lg font-bold text-gray-900">${equipment.replacementCost.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Replacement Cost</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <Clock size={20} className="mx-auto mb-1 text-gray-400" />
                <div className="text-lg font-bold text-gray-900">{equipment.usefulLifeYears} yrs</div>
                <div className="text-xs text-gray-500">Useful Life</div>
              </div>
              <div className="md:col-span-3 bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Total Maintenance Cost</h4>
                <div className="text-2xl font-bold" style={{ color: NAVY }}>${totalServiceCost.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">across {equipment.serviceHistory.length} service records</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-20" />
    </div>
  );
}
