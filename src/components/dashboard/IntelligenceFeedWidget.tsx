/**
 * IntelligenceFeedWidget — Dashboard widget for intelligence feed
 *
 * Shows latest intelligence items with 4 risk dimension cards.
 * Supports mark-as-actioned and dismiss actions.
 * Used on OwnerOperatorDashboard.
 *
 * INTELLIGENCE-PIPELINE-ALIGN-01: Wired to production Supabase query.
 * Demo mode uses static DEMO_FEED; production queries intelligence_signals.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../contexts/DemoContext';
import { useAuth } from '../../contexts/AuthContext';
import { useIntelligenceFeed } from '../../hooks/useIntelligenceFeed';
import { AlertTriangle, CheckCircle2, X, ChevronRight, Zap, RefreshCw } from 'lucide-react';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const MUTED = '#6B7F96';

interface RiskDim {
  level: string;  // critical, high, moderate, low, none, n/a
  note?: string;
}

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  category?: string;
  signal_type?: string;
  priority: string;  // critical, high, normal, low
  revenue_risk: RiskDim;
  liability_risk: RiskDim;
  cost_risk: RiskDim;
  operational_risk: RiskDim;
  opp_revenue?: RiskDim;
  opp_liability?: RiskDim;
  opp_cost?: RiskDim;
  opp_operational?: RiskDim;
  relevance_reason?: string;
  recommended_action?: string;
  action_deadline?: string;
  feed_type: string;
  created_at: string;
  is_actioned?: boolean;
  is_dismissed?: boolean;
}

const DIM_META: Record<string, { icon: string; label: string; color: string }> = {
  revenue:     { icon: '\u{1F4B0}', label: 'Revenue',     color: '#C2410C' },
  liability:   { icon: '\u{2696}\u{FE0F}', label: 'Liability',   color: '#991B1B' },
  cost:        { icon: '\u{1F4B8}', label: 'Cost',        color: '#1E2D4D' },
  operational: { icon: '\u{2699}\u{FE0F}', label: 'Operational', color: '#166534' },
  workforce:   { icon: '\u{1F477}', label: 'Workforce',  color: '#6B21A8' },
};

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FEF2F2', text: '#DC2626' },
  high:     { bg: '#FFFBEB', text: '#D97706' },
  moderate: { bg: '#EFF6FF', text: '#2563EB' },
  low:      { bg: '#F9FAFB', text: '#6B7280' },
};

const PRIORITY_DOT: Record<string, string> = {
  critical: '#DC2626',
  high: '#D97706',
  normal: '#2563EB',
  low: '#6B7280',
};

// Demo feed items — jurisdiction intelligence per location
const DEMO_FEED: FeedItem[] = [
  {
    id: 'demo-cif-1',
    title: 'Merced County prioritizing cold-holding enforcement',
    summary: 'Your Airport location operates in Merced County, which has elevated cold-holding temperature compliance to priority enforcement.',
    category: 'food_safety',
    signal_type: 'enforcement_priority',
    priority: 'critical',
    revenue_risk:     { level: 'high',     note: 'Grade card at risk if not corrected' },
    liability_risk:   { level: 'critical', note: 'Direct liability if temp violations found' },
    cost_risk:        { level: 'low',      note: 'No new equipment — process change only' },
    operational_risk: { level: 'critical', note: 'Immediate cold-holding protocol update required' },
    opp_revenue:     { level: 'moderate', note: 'Proactive compliance differentiates' },
    opp_operational: { level: 'high', note: 'Digital monitoring qualifies for insurance discount' },
    relevance_reason: 'Your Airport location in Merced County is directly affected.',
    recommended_action: 'Audit all cold-holding units at Airport location. Verify digital probe calibration records.',
    feed_type: 'jurisdiction',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo-cif-2',
    title: 'Fresno County inspection frequency increasing',
    summary: 'Downtown location: routine inspections moving from annual to semi-annual for high-risk facilities starting April 2026.',
    category: 'food_safety',
    signal_type: 'inspection_frequency',
    priority: 'high',
    revenue_risk:     { level: 'high',     note: 'More frequent inspections = more grade risk' },
    liability_risk:   { level: 'moderate', note: 'Repeat violations trigger mandatory re-inspection' },
    cost_risk:        { level: 'low' },
    operational_risk: { level: 'high',     note: 'Resolve open CAs before next cycle' },
    opp_revenue:     { level: 'high', note: 'Clean inspections strengthen grade card' },
    opp_operational: { level: 'moderate', note: 'Internal audits build inspection-ready culture' },
    relevance_reason: 'Your Downtown location in Fresno County — semi-annual cycle starts April 2026.',
    recommended_action: 'Resolve all open corrective actions at Downtown. Schedule pre-inspection internal audit.',
    feed_type: 'jurisdiction',
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'demo-cif-3',
    title: 'Stanislaus DER adds allergen management scoring',
    summary: 'University location will be scored on food allergen management. Written protocols and training records required.',
    category: 'food_safety',
    signal_type: 'methodology_change',
    priority: 'high',
    revenue_risk:     { level: 'moderate', note: 'New scoring category could lower overall grade' },
    liability_risk:   { level: 'critical', note: 'Allergen failure = immediate critical violation' },
    cost_risk:        { level: 'low' },
    operational_risk: { level: 'high',     note: 'Written allergen protocol + staff training required' },
    opp_revenue:     { level: 'high', note: 'First-mover advantage' },
    opp_liability:   { level: 'high', note: 'Written protocol creates legal safe harbor' },
    relevance_reason: 'Your University location in Stanislaus County — new scoring effective March 2026.',
    recommended_action: 'Develop written allergen management protocol. Schedule allergen awareness training.',
    feed_type: 'jurisdiction',
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'demo-cif-4',
    title: 'Annual hood suppression testing now required',
    summary: 'Stanislaus County Fire: annual UL-300 compliance testing required (was biennial). University location must schedule before April 15.',
    category: 'facility_safety',
    signal_type: 'fire_code_update',
    priority: 'high',
    revenue_risk:     { level: 'none' },
    liability_risk:   { level: 'high',     note: 'Fire code violation = Notice of Violation' },
    cost_risk:        { level: 'high',     note: 'UL-300 test ~$400-800 annually' },
    operational_risk: { level: 'moderate', note: 'Schedule with certified technician' },
    opp_liability:   { level: 'high', note: 'Proactive testing avoids NOV' },
    opp_cost:        { level: 'moderate', note: 'Insurance discount for annual testing docs' },
    relevance_reason: 'Your University location in Stanislaus County — annual testing now mandatory.',
    recommended_action: 'Schedule UL-300 suppression test at University location before April 15.',
    action_deadline: '2026-04-15',
    feed_type: 'jurisdiction',
    created_at: new Date(Date.now() - 21600000).toISOString(),
  },
];

/** Map an intelligence_signals DB row to a FeedItem */
function mapRow(row: any): FeedItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    category: row.category || undefined,
    signal_type: row.signal_type || undefined,
    priority: row.priority || 'normal',
    revenue_risk:     { level: row.revenue_risk_level || 'none', note: row.revenue_risk_note || undefined },
    liability_risk:   { level: row.liability_risk_level || 'none', note: row.liability_risk_note || undefined },
    cost_risk:        { level: row.cost_risk_level || 'none', note: row.cost_risk_note || undefined },
    operational_risk: { level: row.operational_risk_level || 'none', note: row.operational_risk_note || undefined },
    opp_revenue:     row.opp_revenue_level ? { level: row.opp_revenue_level, note: row.opp_revenue_note || undefined } : undefined,
    opp_liability:   row.opp_liability_level ? { level: row.opp_liability_level, note: row.opp_liability_note || undefined } : undefined,
    opp_cost:        row.opp_cost_level ? { level: row.opp_cost_level, note: row.opp_cost_note || undefined } : undefined,
    opp_operational: row.opp_operational_level ? { level: row.opp_operational_level, note: row.opp_operational_note || undefined } : undefined,
    relevance_reason: row.relevance_reason || undefined,
    recommended_action: row.recommended_action || undefined,
    action_deadline: row.action_deadline || undefined,
    feed_type: row.feed_type || 'advisory',
    created_at: row.delivered_at || row.created_at,
    is_actioned: row.is_actioned || false,
    is_dismissed: row.is_dismissed || false,
  };
}

export function IntelligenceFeedWidget() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [actioned, setActioned] = useState<Set<string>>(new Set());

  const orgId = profile?.organization_id;

  // Production data via extracted hook (handles fetch + realtime + cleanup)
  const {
    data: liveRows,
    isLoading: loading,
    error,
    refetch: fetchFeed,
    markActioned: liveMarkActioned,
    markDismissed: liveMarkDismissed,
  } = useIntelligenceFeed(isDemoMode ? undefined : orgId);

  const liveItems = useMemo(() => (liveRows || []).map(mapRow), [liveRows]);

  const items = useMemo(() => {
    if (isDemoMode) return DEMO_FEED.filter(item => !dismissed.has(item.id));
    return liveItems;
  }, [isDemoMode, dismissed, liveItems]);

  const unactioned = items.filter(i => !actioned.has(i.id) && !i.is_actioned);
  const criticalCount = unactioned.filter(i => i.priority === 'critical').length;

  const handleAction = async (id: string) => {
    setActioned(prev => new Set(prev).add(id));
    if (!isDemoMode) {
      liveMarkActioned(id);
    }
  };

  const handleDismiss = async (id: string) => {
    if (isDemoMode) {
      setDismissed(prev => new Set(prev).add(id));
    } else {
      liveMarkDismissed(id);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const renderRiskDims = (item: FeedItem) => {
    const dims = [
      { key: 'revenue', ...item.revenue_risk },
      { key: 'liability', ...item.liability_risk },
      { key: 'cost', ...item.cost_risk },
      { key: 'operational', ...item.operational_risk },
    ].filter(d => d.level && d.level !== 'none' && d.level !== 'n/a');

    if (dims.length === 0) return null;

    return (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
        {dims.map(d => {
          const meta = DIM_META[d.key];
          const lc = LEVEL_COLORS[d.level] || LEVEL_COLORS.low;
          return (
            <span key={d.key} title={d.note || `${meta.label}: ${d.level}`}
              style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                background: lc.bg, color: lc.text, border: `1px solid ${lc.text}18`,
                display: 'inline-flex', alignItems: 'center', gap: 2,
              }}>
              <span style={{ fontSize: 10 }}>{meta.icon}</span>
              {d.level === 'critical' ? 'CRIT' : d.level.toUpperCase().slice(0, 4)}
            </span>
          );
        })}
      </div>
    );
  };

  const renderOppDims = (item: FeedItem) => {
    const dims = [
      { key: 'revenue', ...(item.opp_revenue || { level: 'none' }) },
      { key: 'liability', ...(item.opp_liability || { level: 'none' }) },
      { key: 'cost', ...(item.opp_cost || { level: 'none' }) },
      { key: 'operational', ...(item.opp_operational || { level: 'none' }) },
    ].filter(d => d.level && d.level !== 'none' && d.level !== 'n/a');

    if (dims.length === 0) return null;

    return (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
        {dims.map(d => (
          <span key={d.key} title={d.note || `${d.key}: ${d.level}`}
            style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
              background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0',
              display: 'inline-flex', alignItems: 'center', gap: 2,
            }}>
            {d.key.slice(0, 3).toUpperCase()}: {d.level === 'critical' ? 'CRIT' : d.level.toUpperCase().slice(0, 4)}
          </span>
        ))}
      </div>
    );
  };

  // Loading state (production only)
  if (!isDemoMode && loading) {
    return (
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <Zap size={14} style={{ color: GOLD }} />
          <span className="text-sm font-semibold" style={{ color: NAVY }}>Business Intelligence</span>
        </div>
        {[1, 2].map(i => (
          <div key={i} className="px-4 py-3 animate-pulse" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-12 bg-gray-200 rounded" />
              <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-1" />
            <div className="h-3 w-full bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Error state (production only)
  if (!isDemoMode && error) {
    return (
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <Zap size={14} style={{ color: GOLD }} />
          <span className="text-sm font-semibold" style={{ color: NAVY }}>Business Intelligence</span>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="text-xs" style={{ color: MUTED }}>{error}</p>
          <button
            type="button"
            onClick={fetchFeed}
            className="mt-2 text-xs font-medium inline-flex items-center gap-1 transition-colors hover:opacity-80"
            style={{ color: GOLD }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state — always show widget, never return null
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
        <button
          type="button"
          onClick={() => navigate('/insights/intelligence')}
          className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
          style={{ borderBottom: '1px solid #F0F0F0' }}
        >
          <div className="flex items-center gap-2">
            <Zap size={14} style={{ color: GOLD }} />
            <span className="text-sm font-semibold" style={{ color: NAVY }}>Business Intelligence</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium" style={{ color: GOLD }}>View all</span>
            <ChevronRight size={14} style={{ color: GOLD }} />
          </div>
        </button>
        <div className="px-4 py-5 text-center">
          <Zap size={20} className="mx-auto mb-2" style={{ color: '#D1D5DB' }} />
          <p className="text-sm font-medium mb-1" style={{ color: NAVY }}>
            Your intelligence feed is active
          </p>
          <p className="text-xs mb-3" style={{ color: MUTED, maxWidth: 320, margin: '0 auto 12px' }}>
            EvidLY monitors FDA recalls, CalCode updates, outbreak alerts, and regulatory changes affecting your county. Signals appear here when something relevant happens.
          </p>
          <button
            type="button"
            onClick={() => navigate('/insights/intelligence')}
            className="text-xs font-semibold"
            style={{ color: GOLD, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            View intelligence hub →
          </button>
        </div>
      </div>
    );
  }

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
          <span className="text-sm font-semibold" style={{ color: NAVY }}>Business Intelligence</span>
          {criticalCount > 0 && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              {criticalCount} critical
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium" style={{ color: GOLD }}>View all</span>
          <ChevronRight size={14} style={{ color: GOLD }} />
        </div>
      </button>

      {/* Feed items (show max 3) */}
      {items.slice(0, 3).map(item => {
        const isActioned = actioned.has(item.id) || item.is_actioned;
        const dotColor = PRIORITY_DOT[item.priority] || PRIORITY_DOT.normal;

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
              {/* Priority dot */}
              <span className="shrink-0 mt-1.5 rounded-full" style={{ width: 8, height: 8, backgroundColor: dotColor }} />

              <div className="flex-1 min-w-0">
                {/* Priority badge + category + time */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                    style={{ background: PRIORITY_DOT[item.priority] + '15', color: PRIORITY_DOT[item.priority] || MUTED }}>
                    {item.priority.toUpperCase()}
                  </span>
                  {item.category && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: '#F0FDF4', color: '#065F46' }}>
                      {item.category.replace(/_/g, ' ')}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: MUTED }}>{timeAgo(item.created_at)}</span>
                </div>
                {/* Title */}
                <p className="text-sm font-semibold" style={{ color: isActioned ? MUTED : NAVY }}>{item.title}</p>
                {/* Summary */}
                <p className="text-xs mt-0.5" style={{ color: MUTED, lineHeight: 1.5 }}>{item.summary}</p>
                {/* Risk dimensions */}
                {!isActioned && renderRiskDims(item)}
                {/* Opportunity dimensions */}
                {!isActioned && renderOppDims(item)}
                {/* Recommended action */}
                {item.recommended_action && !isActioned && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <AlertTriangle size={10} className="shrink-0 mt-0.5" style={{ color: dotColor }} />
                    <span className="text-xs font-medium" style={{ color: NAVY }}>
                      {item.recommended_action}
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
                      className="p-2 rounded transition-colors hover:bg-green-50"
                      title="Mark as actioned"
                    >
                      <CheckCircle2 size={18} style={{ color: '#059669' }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(item.id)}
                      className="p-2 rounded transition-colors hover:bg-red-50"
                      title="Dismiss"
                    >
                      <X size={18} style={{ color: MUTED }} />
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
