// ── GAP-11: Re-Score Alerts Dashboard Widget ──────────────────────────
// AUDIT: No re-score alert widget existed. This is new.
// Shows active alert counts by severity with click-through to Command Center.
// ──────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { AlertTriangle, ShieldAlert, ArrowRight, Check, X } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import {
  DEMO_RESCORE_ALERTS,
  getActiveAlerts,
  getAlertCountBySeverity,
  getSeverityColor,
  getPillarLabel,
  type ReScoreAlert,
} from '../../data/rescoreAlertsDemoData';

const NAVY = '#1e4d6b';

interface Props {
  navigate: (path: string) => void;
}

export function ReScoreAlertsWidget({ navigate }: Props) {
  const { isDemoMode } = useDemo();
  const [alerts, setAlerts] = useState<ReScoreAlert[]>(isDemoMode ? DEMO_RESCORE_ALERTS : []);

  const active = useMemo(() => getActiveAlerts(alerts), [alerts]);
  const counts = useMemo(() => getAlertCountBySeverity(alerts), [alerts]);
  const total = counts.critical + counts.high + counts.medium;

  const handleAcknowledge = (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAlerts(prev => prev.map(a =>
      a.id === alertId
        ? { ...a, status: 'acknowledged' as const, acknowledgedAt: new Date().toISOString(), acknowledgedBy: 'Current User' }
        : a
    ));
  };

  if (total === 0) return null;

  const topAlert = active.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 };
    return (order[a.severity] - order[b.severity]) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  })[0];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: counts.critical > 0 ? '#fef2f2' : '#fffbeb' }}>
            <ShieldAlert className="h-5 w-5" style={{ color: counts.critical > 0 ? '#dc2626' : '#d97706' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Re-Score Alerts</h3>
            <p className="text-xs text-gray-500">{total} active alert{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/intelligence')}
          className="text-sm font-medium flex items-center gap-1 hover:underline"
          style={{ color: NAVY }}
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Severity breakdown */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-3" style={{ backgroundColor: '#f9fafb' }}>
        {counts.critical > 0 && (
          <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#dc2626' }}>
            {counts.critical} Critical
          </span>
        )}
        {counts.high > 0 && (
          <>
            {counts.critical > 0 && <span className="text-gray-300">|</span>}
            <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#d97706' }}>
              {counts.high} High
            </span>
          </>
        )}
        {counts.medium > 0 && (
          <>
            {(counts.critical > 0 || counts.high > 0) && <span className="text-gray-300">|</span>}
            <span className="flex items-center gap-1 text-sm font-medium" style={{ color: '#2563eb' }}>
              {counts.medium} Medium
            </span>
          </>
        )}
      </div>

      {/* Top alerts preview */}
      <div className="space-y-2">
        {active.slice(0, 3).map(alert => {
          const color = getSeverityColor(alert.severity);
          return (
            <div
              key={alert.id}
              className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer hover:opacity-80"
              style={{ backgroundColor: color.bg, border: `1px solid ${color.border}` }}
              onClick={() => navigate('/admin/intelligence')}
            >
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: color.text }} />
              <div className="flex-1 min-w-0">
                <span className="font-medium leading-snug" style={{ color: color.text }}>{alert.message}</span>
                <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ color: color.text, opacity: 0.7 }}>
                  <span>{alert.facilityName}</span>
                  <span>·</span>
                  <span>{getPillarLabel(alert.pillar)}</span>
                </div>
              </div>
              <button
                onClick={(e) => handleAcknowledge(alert.id, e)}
                className="p-1 rounded hover:bg-white/50 flex-shrink-0"
                title="Acknowledge"
              >
                <Check className="h-3.5 w-3.5" style={{ color: color.text }} />
              </button>
            </div>
          );
        })}
      </div>

      {active.length > 3 && (
        <button
          onClick={() => navigate('/admin/intelligence')}
          className="text-xs font-medium mt-2 hover:underline"
          style={{ color: NAVY }}
        >
          +{active.length - 3} more alert{active.length - 3 !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
