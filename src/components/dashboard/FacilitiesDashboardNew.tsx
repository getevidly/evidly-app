import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Wrench,
  AlertTriangle,
  Calendar,
  FileText,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import {
  DEMO_LOCATION_SCORES,
  calculateInspectionReadiness,
  getReadinessColor,
} from '../../utils/inspectionReadiness';

// --------------- Demo Data ---------------

const DEMO_EQUIPMENT_COUNT = 12;

interface FacilitiesAttentionItem {
  id: string;
  severity: 'critical' | 'warning';
  title: string;
  detail: string;
  actionLabel: string;
  actionRoute: string;
}

const DEMO_FACILITIES_ATTENTION: FacilitiesAttentionItem[] = [
  {
    id: 'fac-1',
    severity: 'warning',
    title: 'Fire suppression inspection expires in 12 days',
    detail: 'ABC Fire Protection notified',
    actionLabel: 'Schedule Service',
    actionRoute: '/vendors',
  },
  {
    id: 'fac-2',
    severity: 'warning',
    title: 'Walk-in Freezer compressor — service overdue',
    detail: 'Last serviced: 8 months ago',
    actionLabel: 'View Equipment',
    actionRoute: '/equipment',
  },
];

interface VendorVisit {
  day: string;
  service: string;
  vendor: string;
  status: 'confirmed' | 'pending' | 'overdue';
}

const DEMO_VENDOR_SCHEDULE: VendorVisit[] = [
  { day: 'Mon', service: 'Hood Cleaning', vendor: 'Cleaning Pros Plus', status: 'confirmed' },
  { day: 'Wed', service: 'Pest Control', vendor: 'Western Pest', status: 'pending' },
  { day: 'Fri', service: 'Grease Trap', vendor: 'Valley Grease', status: 'confirmed' },
];

interface FacilitiesDoc {
  name: string;
  status: 'current' | 'expiring' | 'expired';
  expires: string;
}

const DEMO_FACILITIES_DOCS: FacilitiesDoc[] = [
  { name: 'Hood Cleaning Certificate', status: 'current', expires: 'Apr 15, 2026' },
  { name: 'Fire Suppression Inspection', status: 'expiring', expires: 'Feb 26, 2026' },
  { name: 'Fire Extinguisher Tags', status: 'current', expires: 'Aug 1, 2026' },
  { name: 'Hood Vendor IKECA Cert', status: 'current', expires: 'Dec 31, 2026' },
  { name: 'Vendor Insurance (GL)', status: 'current', expires: 'Jul 15, 2026' },
];

interface EquipmentAlert {
  name: string;
  alert: string | null;
  status?: string;
  severity?: 'warning' | 'critical';
}

const DEMO_EQUIPMENT_ALERTS: EquipmentAlert[] = [
  { name: 'Walk-in Freezer #1', alert: 'Compressor runtime up 23% this month', severity: 'warning' },
  { name: 'Hood System', alert: null, status: 'All normal' },
  { name: 'Fire Suppression System', alert: null, status: 'All normal' },
  { name: 'Walk-in Cooler #1', alert: null, status: 'All normal' },
  { name: 'Walk-in Cooler #2', alert: null, status: 'All normal' },
];

// --------------- Helpers ---------------

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-lg p-4 ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif' }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, children }: { icon: typeof Flame; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} className="text-gray-400" />
      <h3
        className="text-xs font-semibold uppercase"
        style={{ letterSpacing: '0.1em', color: '#6b7280', fontFamily: 'Inter, sans-serif' }}
      >
        {children}
      </h3>
    </div>
  );
}

function StatusBadge({ status }: { status: 'current' | 'expiring' | 'expired' | 'confirmed' | 'pending' | 'overdue' }) {
  const config = {
    current: { bg: '#dcfce7', color: '#16a34a', label: 'Current' },
    confirmed: { bg: '#dcfce7', color: '#16a34a', label: 'Confirmed' },
    expiring: { bg: '#fef3c7', color: '#b45309', label: 'Expiring' },
    pending: { bg: '#fef3c7', color: '#b45309', label: 'Pending' },
    expired: { bg: '#fee2e2', color: '#dc2626', label: 'Expired' },
    overdue: { bg: '#fee2e2', color: '#dc2626', label: 'Overdue' },
  }[status];

  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: '#dc2626',
  warning: '#d4af37',
};

// ===============================================
// FACILITIES MANAGER DASHBOARD
// ===============================================

export default function FacilitiesDashboardNew() {
  const navigate = useNavigate();
  const { getAccessibleLocations } = useRole();

  const accessibleLocations = useMemo(() => getAccessibleLocations(), [getAccessibleLocations]);
  // Default to downtown
  const defaultLoc = accessibleLocations[0]?.locationUrlId || 'downtown';

  const locationData = DEMO_LOCATION_SCORES[defaultLoc];
  const locationScore = useMemo(() => {
    if (!locationData) return null;
    return calculateInspectionReadiness(locationData.foodOps, locationData.foodDocs, locationData.fireOps, locationData.fireDocs);
  }, [locationData]);

  const locationName = locationData?.name || 'Downtown Kitchen';
  const fireScore = locationScore?.fireSafety.score ?? 0;
  const fireOps = locationScore?.fireSafety.ops ?? 0;
  const fireDocs = locationScore?.fireSafety.docs ?? 0;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MapPin size={18} style={{ color: '#1e4d6b' }} />
          <h2 className="text-lg font-semibold text-gray-900">
            {locationName} — <span className="text-gray-500">Facilities</span>
          </h2>
        </div>
        <span className="text-sm text-gray-500">Today: {today}</span>
      </div>

      {/* Fire Safety Hero */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame size={24} style={{ color: getReadinessColor(fireScore) }} />
            <span className="font-bold" style={{ fontSize: 28, color: getReadinessColor(fireScore) }}>
              {fireScore}%
            </span>
            <span className="text-sm font-semibold text-gray-700 ml-1">Fire Safety</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full">
            <Wrench size={14} className="text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Equipment: {DEMO_EQUIPMENT_COUNT} units</span>
          </div>
        </div>

        {/* Main progress bar */}
        <div className="w-full bg-gray-200 rounded-full mb-4" style={{ height: 10 }}>
          <div
            className="rounded-full"
            style={{
              width: `${fireScore}%`,
              height: 10,
              backgroundColor: getReadinessColor(fireScore),
            }}
          />
        </div>

        {/* Sub-scores */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">Ops</span>
              <span className="text-xs font-semibold text-gray-700">{fireOps}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full" style={{ height: 6 }}>
              <div
                className="rounded-full"
                style={{ width: `${fireOps}%`, height: 6, backgroundColor: getReadinessColor(fireOps) }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">Docs</span>
              <span className="text-xs font-semibold text-gray-700">{fireDocs}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full" style={{ height: 6 }}>
              <div
                className="rounded-full"
                style={{ width: `${fireDocs}%`, height: 6, backgroundColor: getReadinessColor(fireDocs) }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Needs Attention */}
      <Card>
        <SectionHeader icon={AlertTriangle}>Needs Attention</SectionHeader>
        <div className="space-y-2">
          {DEMO_FACILITIES_ATTENTION.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-white"
              style={{ borderLeft: `4px solid ${SEVERITY_BORDER[item.severity]}` }}
            >
              <Flame size={16} className="text-gray-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(item.actionRoute)}
                className="text-xs font-medium shrink-0 px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1e4d6b' }}
              >
                {item.actionLabel} →
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Vendor Schedule */}
      <Card>
        <SectionHeader icon={Calendar}>This Week's Vendor Schedule</SectionHeader>
        <div className="space-y-1">
          {DEMO_VENDOR_SCHEDULE.map((visit, i) => (
            <button
              key={i}
              type="button"
              onClick={() => navigate('/vendors')}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-500 w-10 shrink-0">{visit.day}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{visit.service}</p>
                <p className="text-xs text-gray-500">{visit.vendor}</p>
              </div>
              <StatusBadge status={visit.status} />
            </button>
          ))}
        </div>
      </Card>

      {/* Document Status */}
      <Card>
        <SectionHeader icon={FileText}>Document Status</SectionHeader>
        <div className="space-y-1">
          {DEMO_FACILITIES_DOCS.map((doc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => navigate('/documents')}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{doc.name}</p>
              </div>
              <StatusBadge status={doc.status} />
              <span className="text-xs text-gray-400 shrink-0 ml-1">Exp: {doc.expires}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Equipment Alerts */}
      <Card>
        <SectionHeader icon={Wrench}>Equipment Alerts</SectionHeader>
        <div className="space-y-1">
          {DEMO_EQUIPMENT_ALERTS.map((eq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => navigate('/equipment')}
              className="w-full flex items-start gap-3 p-3 rounded-lg text-left hover:bg-gray-50 transition-colors"
              style={eq.alert ? { borderLeft: `3px solid ${SEVERITY_BORDER[eq.severity || 'warning']}` } : undefined}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${eq.alert ? 'text-gray-900' : 'text-gray-500'}`}>
                  {eq.name}
                </p>
                {eq.alert ? (
                  <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>{eq.alert}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">{eq.status}</p>
                )}
              </div>
              {eq.alert ? (
                <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: '#b45309' }} />
              ) : (
                <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
