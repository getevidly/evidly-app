import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Shield, AlertTriangle, DollarSign, Calendar, ArrowRight } from 'lucide-react';

interface Props {
  locationId: string;
}

interface EquipmentSummary {
  total: number;
  operational: number;
  needsRepair: number;
  outOfService: number;
  warrantyActive: number;
  warrantyExpiringSoon: number;
  warrantyExpired: number;
  ytdSpend: number;
  nextServiceDue: string;
  alerts: { text: string; severity: 'red' | 'amber' }[];
}

const ALL_DATA: EquipmentSummary = {
  total: 19,
  operational: 17,
  needsRepair: 1,
  outOfService: 1,
  warrantyActive: 8,
  warrantyExpiringSoon: 2,
  warrantyExpired: 9,
  ytdSpend: 14250,
  nextServiceDue: 'Feb 15',
  alerts: [
    { text: 'Commercial Dishwasher \u2014 past 8-yr useful life, replacement recommended', severity: 'red' },
    { text: 'Hood Ventilation \u2014 warranty expired, fire suppression inspection overdue at Airport', severity: 'amber' },
    { text: 'Exhaust Fan \u2014 bearing noise reported at Airport Cafe', severity: 'amber' },
  ],
};

const LOCATION_DATA: Record<string, EquipmentSummary> = {
  '1': {
    total: 10,
    operational: 9,
    needsRepair: 1,
    outOfService: 0,
    warrantyActive: 4,
    warrantyExpiringSoon: 1,
    warrantyExpired: 5,
    ytdSpend: 7650,
    nextServiceDue: 'Feb 15',
    alerts: [
      { text: 'Commercial Dishwasher \u2014 past 8-yr useful life, replacement recommended', severity: 'red' },
      { text: 'Hood Ventilation \u2014 fan belt showing wear, schedule replacement', severity: 'amber' },
    ],
  },
  '2': {
    total: 4,
    operational: 4,
    needsRepair: 0,
    outOfService: 0,
    warrantyActive: 1,
    warrantyExpiringSoon: 0,
    warrantyExpired: 3,
    ytdSpend: 3100,
    nextServiceDue: 'Feb 14',
    alerts: [
      { text: 'Hood Ventilation \u2014 warranty expired, fire suppression inspection overdue', severity: 'amber' },
      { text: 'Exhaust Fan \u2014 bearing noise reported', severity: 'amber' },
    ],
  },
  '3': {
    total: 5,
    operational: 5,
    needsRepair: 0,
    outOfService: 0,
    warrantyActive: 3,
    warrantyExpiringSoon: 1,
    warrantyExpired: 1,
    ytdSpend: 3500,
    nextServiceDue: 'Feb 15',
    alerts: [
      { text: 'Hood System \u2014 heavy grease buildup, more frequent cleaning needed', severity: 'amber' },
    ],
  },
};

export function EquipmentHealthWidget({ locationId }: Props) {
  const navigate = useNavigate();

  const data = useMemo<EquipmentSummary>(() => {
    if (locationId === 'all') return ALL_DATA;
    return LOCATION_DATA[locationId] ?? ALL_DATA;
  }, [locationId]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
            <Wrench className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Equipment Health</h3>
            <p className="text-xs text-gray-500">{data.total} items tracked</p>
          </div>
        </div>
        <button
          onClick={() => navigate(locationId === 'all' ? '/equipment' : `/equipment?location=${locationId}`)}
          className="text-sm font-medium flex items-center gap-1 hover:underline"
          style={{ color: '#1e4d6b' }}
        >
          View <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Status summary row */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-4" style={{ backgroundColor: '#eef4f8' }}>
        <span className="text-sm font-semibold text-gray-900">{data.total} Total</span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1 text-sm font-medium" style={{ color: '#16a34a' }}>
          {data.operational} OK
        </span>
        {data.needsRepair > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1 text-sm font-medium" style={{ color: '#d97706' }}>
              {data.needsRepair} Repair
            </span>
          </>
        )}
        {data.outOfService > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1 text-sm font-medium" style={{ color: '#dc2626' }}>
              {data.outOfService} Down
            </span>
          </>
        )}
      </div>

      {/* Warranty summary */}
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        <span className="text-xs text-gray-500">Warranty:</span>
        <span className="text-xs font-medium" style={{ color: '#16a34a' }}>{data.warrantyActive} active</span>
        {data.warrantyExpiringSoon > 0 && (
          <span className="text-xs font-medium" style={{ color: '#d97706' }}>{data.warrantyExpiringSoon} expiring</span>
        )}
        <span className="text-xs font-medium text-gray-400">{data.warrantyExpired} expired</span>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2 mb-4">
          {data.alerts.slice(0, 3).map((alert, i) => (
            <div
              key={i}
              className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
              style={{
                backgroundColor: alert.severity === 'red' ? '#fef2f2' : '#fffbeb',
                color: alert.severity === 'red' ? '#dc2626' : '#d97706',
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span className="font-medium leading-snug">{alert.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-sm">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500">YTD Maintenance:</span>
          <span className="font-semibold text-gray-900">${data.ytdSpend.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500">Next service:</span>
          <span className="font-semibold text-gray-900">{data.nextServiceDue}</span>
        </div>
      </div>
    </div>
  );
}
