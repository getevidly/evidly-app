import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio, Thermometer, Battery, BatteryWarning, Wifi, WifiOff,
  AlertTriangle, ChevronRight, Droplets,
} from 'lucide-react';
import {
  iotSensors, iotSensorAlerts, iotSparklines,
  type IoTSensor, type IoTSparklinePoint,
} from '../data/demoData';

const PRIMARY = '#1e4d6b';

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

function MiniSparkline({ data, width = 80, height = 20 }: { data: IoTSparklinePoint[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const temps = data.map(d => d.temp);
  const yMin = Math.min(...temps) - 1;
  const yMax = Math.max(...temps) + 1;
  const toX = (i: number) => (i / (data.length - 1)) * width;
  const toY = (v: number) => height - ((v - yMin) / (yMax - yMin)) * height;
  const d = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.temp).toFixed(1)}`).join(' ');
  const lastColor = complianceColor(temps[temps.length - 1], 'cooler');
  return (
    <svg width={width} height={height} className="block flex-shrink-0">
      <path d={d} fill="none" stroke={lastColor} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function SensorMonitorWidget({ locationFilter }: { locationFilter?: string }) {
  const navigate = useNavigate();

  const sensors = useMemo(() => {
    if (!locationFilter || locationFilter === 'all') return iotSensors;
    const locMap: Record<string, string> = { downtown: 'Downtown Kitchen', airport: 'Airport Terminal', university: 'University Campus' };
    const locName = locMap[locationFilter] || locationFilter;
    return iotSensors.filter(s => s.locationName === locName);
  }, [locationFilter]);

  const online = sensors.filter(s => s.status === 'online').length;
  const violations = sensors.filter(s => s.status !== 'offline' && complianceColor(s.currentTempF, s.zone) === '#ef4444').length;
  const warnings = sensors.filter(s => s.status !== 'offline' && complianceColor(s.currentTempF, s.zone) === '#f59e0b').length;
  const activeAlerts = iotSensorAlerts.filter(a => !a.acknowledged).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4" style={{ color: PRIMARY }} />
          <span className="text-sm font-bold text-gray-900">Live Sensor Monitor</span>
          {activeAlerts > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">{activeAlerts}</span>
          )}
        </div>
        <button onClick={() => navigate('/sensors')} className="text-xs font-medium hover:underline flex items-center gap-0.5" style={{ color: PRIMARY }}>
          View All <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center gap-3 px-5 py-2 mx-4 mb-3 rounded-lg" style={{ backgroundColor: '#eef4f8' }}>
        <span className="flex items-center gap-1 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />{online} online</span>
        <span className="text-gray-300 text-xs">|</span>
        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: violations > 0 ? '#ef4444' : '#22c55e' }}>
          {violations} violation{violations !== 1 ? 's' : ''}
        </span>
        <span className="text-gray-300 text-xs">|</span>
        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: warnings > 0 ? '#f59e0b' : '#22c55e' }}>
          {warnings} warning{warnings !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Sensor Rows */}
      <div className="px-4 pb-4">
        <div className="space-y-1">
          {sensors.slice(0, 8).map(sensor => {
            const color = sensor.status === 'offline' ? '#9ca3af' : complianceColor(sensor.currentTempF, sensor.zone);
            const sparkData = iotSparklines[sensor.id];
            return (
              <div
                key={sensor.id}
                onClick={() => navigate(`/sensors/${sensor.id}`)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                style={color === '#ef4444' ? { backgroundColor: '#fef2f2' } : undefined}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusDot(sensor.status) }} />
                <span className="text-xs font-medium text-gray-900 flex-1 min-w-0 truncate">{sensor.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0 w-6 text-right">{timeAgo(sensor.lastSeenAt)}</span>
                {sparkData && <MiniSparkline data={sparkData} />}
                {sensor.status !== 'offline' ? (
                  <span className="text-xs font-bold flex-shrink-0 w-14 text-right" style={{ color }}>{sensor.currentTempF}°F</span>
                ) : (
                  <span className="text-xs text-gray-300 flex-shrink-0 w-14 text-right">--</span>
                )}
              </div>
            );
          })}
        </div>
        {sensors.length > 8 && (
          <button onClick={() => navigate('/sensors')} className="w-full mt-2 py-1.5 text-center text-xs font-medium rounded-lg hover:bg-gray-50" style={{ color: PRIMARY }}>
            +{sensors.length - 8} more sensors
          </button>
        )}
      </div>
    </div>
  );
}
