/**
 * IntelligenceFeedWidget — Dashboard widget for intelligence feed
 *
 * Shows latest intelligence items with risk dimension cards.
 * Supports mark-as-actioned and dismiss actions.
 * Used on OwnerOperatorDashboard.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../contexts/DemoContext';
import { AlertTriangle, CheckCircle2, X, ChevronRight, Zap } from 'lucide-react';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const MUTED = '#6B7F96';

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  dimension: 'revenue' | 'liability' | 'cost' | 'operational';
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  feed_type: string;
  recommended_actions?: { action: string; priority: string }[];
  created_at: string;
  is_actioned?: boolean;
  is_dismissed?: boolean;
}

const DIMENSION_CONFIG: Record<string, { icon: string; bg: string; text: string; label: string }> = {
  revenue:     { icon: '💰', bg: '#FFFBEB', text: '#92400E', label: 'Revenue' },
  liability:   { icon: '⚖️', bg: '#FEF2F2', text: '#991B1B', label: 'Liability' },
  cost:        { icon: '📊', bg: '#EFF6FF', text: '#1E40AF', label: 'Cost' },
  operational: { icon: '⚙️', bg: '#F0FDF4', text: '#166534', label: 'Operational' },
};

const RISK_DOT: Record<string, string> = {
  critical: '#DC2626',
  high: '#D97706',
  medium: '#2563EB',
  low: '#6B7280',
  informational: '#9CA3AF',
};

// Demo feed items — matches the SQL seed data
const DEMO_FEED: FeedItem[] = [
  {
    id: 'demo-cif-1',
    title: 'Merced County prioritizing cold-holding enforcement',
    summary: 'Your Airport location operates in Merced County, which has elevated cold-holding temperature compliance to priority enforcement.',
    dimension: 'liability',
    risk_level: 'critical',
    feed_type: 'jurisdiction',
    recommended_actions: [
      { action: 'Audit all cold-holding units at Airport location', priority: 'critical' },
      { action: 'Verify digital probe calibration records', priority: 'high' },
    ],
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo-cif-2',
    title: 'Fresno County inspection frequency increasing',
    summary: 'Downtown location: routine inspections moving from annual to semi-annual for high-risk facilities starting April 2026.',
    dimension: 'revenue',
    risk_level: 'high',
    feed_type: 'jurisdiction',
    recommended_actions: [
      { action: 'Resolve all open corrective actions at Downtown', priority: 'high' },
      { action: 'Schedule pre-inspection internal audit', priority: 'medium' },
    ],
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'demo-cif-3',
    title: 'Stanislaus DER adds allergen management scoring',
    summary: 'University location will be scored on food allergen management. Written protocols and training records required.',
    dimension: 'operational',
    risk_level: 'high',
    feed_type: 'jurisdiction',
    recommended_actions: [
      { action: 'Develop written allergen protocol', priority: 'high' },
      { action: 'Schedule allergen training', priority: 'high' },
    ],
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'demo-cif-4',
    title: 'Annual hood suppression testing now required',
    summary: 'Stanislaus County Fire: annual UL-300 compliance testing required (was biennial). University location must schedule before April 15.',
    dimension: 'cost',
    risk_level: 'high',
    feed_type: 'jurisdiction',
    recommended_actions: [
      { action: 'Schedule UL-300 suppression test at University', priority: 'critical' },
    ],
    created_at: new Date(Date.now() - 21600000).toISOString(),
  },
];

export function IntelligenceFeedWidget() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [actioned, setActioned] = useState<Set<string>>(new Set());

  const items = useMemo(() => {
    if (!isDemoMode) return [];
    return DEMO_FEED.filter(item => !dismissed.has(item.id));
  }, [isDemoMode, dismissed]);

  const unactioned = items.filter(i => !actioned.has(i.id));
  const criticalCount = unactioned.filter(i => i.risk_level === 'critical').length;

  if (items.length === 0) return null;

  const handleAction = (id: string) => {
    setActioned(prev => new Set(prev).add(id));
  };

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => navigate('/insights/intelligence')}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
        style={{ borderBottom: '1px solid #F0F0F0' }}
      >
        <div className="flex items-center gap-2">
          <Zap size={14} style={{ color: GOLD }} />
          <span className="text-sm font-semibold" style={{ color: NAVY }}>Intelligence Feed</span>
          {criticalCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              {criticalCount} critical
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-medium" style={{ color: GOLD }}>View all</span>
          <ChevronRight size={14} style={{ color: GOLD }} />
        </div>
      </button>

      {/* Feed items (show max 3) */}
      {items.slice(0, 3).map(item => {
        const dim = DIMENSION_CONFIG[item.dimension];
        const isActioned = actioned.has(item.id);
        const dotColor = RISK_DOT[item.risk_level] || RISK_DOT.medium;

        return (
          <div
            key={item.id}
            style={{
              borderBottom: '1px solid #F0F0F0',
              padding: '12px 16px',
              opacity: isActioned ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            <div className="flex items-start gap-3">
              {/* Risk dot */}
              <span className="shrink-0 mt-1.5 rounded-full" style={{ width: 8, height: 8, backgroundColor: dotColor }} />

              <div className="flex-1 min-w-0">
                {/* Dimension badge + time */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: dim.bg, color: dim.text }}>
                    {dim.icon} {dim.label}
                  </span>
                  <span className="text-[10px]" style={{ color: MUTED }}>{timeAgo(item.created_at)}</span>
                </div>
                {/* Title */}
                <p className="text-[13px] font-semibold" style={{ color: isActioned ? MUTED : NAVY }}>{item.title}</p>
                {/* Summary */}
                <p className="text-[11px] mt-0.5" style={{ color: MUTED, lineHeight: 1.5 }}>{item.summary}</p>
                {/* Top recommended action */}
                {item.recommended_actions && item.recommended_actions.length > 0 && !isActioned && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <AlertTriangle size={10} style={{ color: dotColor }} />
                    <span className="text-[10px] font-medium" style={{ color: NAVY }}>
                      {item.recommended_actions[0].action}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {isActioned ? (
                  <CheckCircle2 size={16} className="text-green-500" />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAction(item.id)}
                      className="p-1 rounded transition-colors hover:bg-green-50"
                      title="Mark as actioned"
                    >
                      <CheckCircle2 size={14} style={{ color: '#059669' }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(item.id)}
                      className="p-1 rounded transition-colors hover:bg-red-50"
                      title="Dismiss"
                    >
                      <X size={14} style={{ color: MUTED }} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Footer — show count */}
      {items.length > 3 && (
        <button
          type="button"
          onClick={() => navigate('/insights/intelligence')}
          className="w-full px-4 py-2.5 text-center text-xs font-semibold transition-colors hover:bg-gray-50"
          style={{ color: NAVY }}
        >
          +{items.length - 3} more intelligence items →
        </button>
      )}
    </div>
  );
}
