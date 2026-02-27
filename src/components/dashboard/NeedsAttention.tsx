import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Flame, CheckCircle } from 'lucide-react';
import type { InspectionPillar } from '../../utils/inspectionReadiness';

// --------------- Types ---------------

export interface AttentionItem {
  id: string;
  pillar: InspectionPillar;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  actionLabel: string;
  actionRoute: string;
  locationId?: string;
  locationName?: string;
  daysUntilDue?: number;
}

// --------------- Sort Algorithm ---------------

function severityRank(item: AttentionItem): number {
  const days = item.daysUntilDue ?? Infinity;
  if (item.severity === 'critical') {
    if (days < 0) return 0;           // critical + overdue
    if (days === 0) return 1;         // critical + due today
    if (days <= 7) return 2;          // critical + due within 7 days
    return 3;
  }
  if (item.severity === 'warning') {
    if (days < 0) return 4;           // warning + overdue
    if (days <= 14) return 5;         // warning + due within 14 days
    if (days <= 30) return 6;         // warning + due within 30 days
    return 7;
  }
  return 8;                           // info items
}

export function sortAttentionItems(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => severityRank(a) - severityRank(b));
}

// --------------- Severity Styles ---------------

const SEVERITY_BORDER: Record<AttentionItem['severity'], string> = {
  critical: '#dc2626',
  warning: '#d4af37',
  info: '#9ca3af',
};

const PillarIcon = ({ pillar }: { pillar: InspectionPillar }) => {
  if (pillar === 'food_safety') return <UtensilsCrossed size={16} className="text-gray-500 shrink-0 mt-0.5" />;
  return <Flame size={16} className="text-gray-500 shrink-0 mt-0.5" />;
};

// --------------- Component ---------------

interface NeedsAttentionProps {
  items: AttentionItem[];
  maxVisible?: number;
  showLocationPrefix?: boolean;
}

export default function NeedsAttention({ items, maxVisible = 5, showLocationPrefix = true }: NeedsAttentionProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const sorted = sortAttentionItems(items);
  const visible = expanded ? sorted : sorted.slice(0, maxVisible);
  const hasMore = sorted.length > maxVisible;

  if (items.length === 0) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif' }}>
        <h3
          className="text-xs font-semibold uppercase mb-3"
          style={{ letterSpacing: '0.1em', color: '#9ca3af' }}
        >
          Needs Attention
        </h3>
        <div className="flex items-center gap-2 py-6 justify-center text-gray-400">
          <CheckCircle size={18} className="text-green-500" />
          <span className="text-sm">All clear — no items need attention right now</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center gap-2 mb-3">
        <h3
          className="text-xs font-semibold uppercase"
          style={{ letterSpacing: '0.1em', color: '#9ca3af' }}
        >
          Needs Attention
        </h3>
        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
          {items.length}
        </span>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
        {visible.map((item) => {
          const title = showLocationPrefix && item.locationName
            ? `${item.locationName}: ${item.title}`
            : item.title;

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 bg-white"
              style={{ borderLeft: `4px solid ${SEVERITY_BORDER[item.severity]}` }}
            >
              <PillarIcon pillar={item.pillar} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 leading-snug">{title}</p>
                {item.detail && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate(item.actionRoute)}
                className="text-xs font-medium shrink-0 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                style={{ color: '#1e4d6b' }}
              >
                {item.actionLabel} →
              </button>
            </div>
          );
        })}
      </div>

      {hasMore && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-medium mt-2 hover:underline"
          style={{ color: '#1e4d6b' }}
        >
          View all alerts ({sorted.length})
        </button>
      )}
    </div>
  );
}

// --------------- Demo Data (demo defaults — only use when isDemoMode is true) ---------------

export const DEMO_ATTENTION_ITEMS: AttentionItem[] = [
  {
    id: 'att-1',
    pillar: 'facility_safety',
    severity: 'critical',
    title: 'Walk-in cooler reading 43°F (above 41°F)',
    detail: 'IoT sensor alert — check immediately',
    actionLabel: 'View',
    actionRoute: '/temp-logs',
    locationId: 'airport',
    locationName: 'Airport Cafe', // demo
    daysUntilDue: 0,
  },
  {
    id: 'att-2',
    pillar: 'facility_safety',
    severity: 'warning',
    title: 'Fire suppression inspection expires in 12 days',
    detail: 'ABC Fire Protection notified',
    actionLabel: 'Schedule',
    actionRoute: '/vendors',
    locationId: 'airport',
    locationName: 'Airport Cafe', // demo
    daysUntilDue: 12,
  },
  {
    id: 'att-3',
    pillar: 'food_safety',
    severity: 'warning',
    title: 'Midday checklist not started (due by 2 PM)',
    detail: 'Assigned to: Carlos',
    actionLabel: 'View',
    actionRoute: '/checklists',
    locationId: 'downtown',
    locationName: 'Downtown Kitchen', // demo
    daysUntilDue: 0,
  },
  {
    id: 'att-4',
    pillar: 'facility_safety',
    severity: 'warning',
    title: 'Hood cleaning cert expires in 18 days',
    detail: 'Cleaning Pros Plus notified',
    actionLabel: 'View Docs',
    actionRoute: '/documents',
    locationId: 'airport',
    locationName: 'Airport Cafe', // demo
    daysUntilDue: 18,
  },
  {
    id: 'att-5',
    pillar: 'food_safety',
    severity: 'info',
    title: 'Prep cooler not logged since 10 AM',
    detail: 'Manual log required',
    actionLabel: 'Log Temp',
    actionRoute: '/temp-logs',
    locationId: 'downtown',
    locationName: 'Downtown Kitchen', // demo
    daysUntilDue: 0,
  },
];
