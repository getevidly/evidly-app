/**
 * Compliance Score Alert Banner
 *
 * Dismissible banner for Owner/Operator and Facilities roles.
 * Appears ONLY when a location's score crosses a threshold:
 * - Warning (yellow): score 70-79
 * - Critical (red): score below 70
 * - Clear: score returns above 80 → banner auto-dismissed
 *
 * Dismiss state persisted in localStorage (demo mode).
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';

interface ComplianceAlert {
  id: string;
  locationName: string;
  pillar: string;
  score: number;
  severity: 'warning' | 'critical';
}

// Demo data: pre-defined threshold alerts based on known demo scores
// Downtown 91 (clear), Airport 69 (critical), University 56 (critical)
const DEMO_COMPLIANCE_ALERTS: ComplianceAlert[] = [
  {
    id: 'cb-airport-fire',
    locationName: 'Airport Cafe',
    pillar: 'fire safety compliance',
    score: 69,
    severity: 'critical',
  },
  {
    id: 'cb-university-fire',
    locationName: 'University Dining',
    pillar: 'fire safety compliance',
    score: 56,
    severity: 'critical',
  },
];

function getDismissedBanners(): Set<string> {
  try {
    const stored = localStorage.getItem('evidly_dismissed_compliance_banners');
    if (stored) return new Set(JSON.parse(stored));
  } catch { /* ignore */ }
  return new Set();
}

function setDismissedBanners(ids: Set<string>) {
  localStorage.setItem('evidly_dismissed_compliance_banners', JSON.stringify([...ids]));
}

export function ComplianceBanner() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissedBanners);

  const visibleAlerts = useMemo(
    () => DEMO_COMPLIANCE_ALERTS.filter(a => !dismissed.has(a.id)),
    [dismissed],
  );

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    setDismissedBanners(next);
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visibleAlerts.map(alert => {
        const isWarning = alert.severity === 'warning';
        return (
          <div
            key={alert.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{
              backgroundColor: isWarning ? '#fffbeb' : '#fef2f2',
              border: `1px solid ${isWarning ? '#fde68a' : '#fecaca'}`,
            }}
          >
            <AlertTriangle
              size={18}
              className="shrink-0"
              style={{ color: isWarning ? '#d97706' : '#dc2626' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: isWarning ? '#92400e' : '#991b1b' }}>
                {alert.locationName} {alert.pillar} is {isWarning ? 'approaching' : ''} out of compliance
              </p>
              <p className="text-[11px]" style={{ color: isWarning ? '#a16207' : '#b91c1c' }}>
                Score: {alert.score} — {isWarning ? 'action recommended' : 'immediate action required'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/compliance')}
              className="text-xs font-semibold px-3 py-1.5 rounded-md shrink-0"
              style={{
                backgroundColor: isWarning ? '#d97706' : '#dc2626',
                color: '#fff',
              }}
            >
              Review
            </button>
            <button
              type="button"
              onClick={() => handleDismiss(alert.id)}
              className="p-1 rounded hover:bg-black/5 transition-colors shrink-0"
            >
              <X size={14} style={{ color: isWarning ? '#92400e' : '#991b1b' }} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
