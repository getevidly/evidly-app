/**
 * ClientIntelligenceFeed — Tenant-facing intelligence advisories
 *
 * Route: /insights/intelligence
 * Access: owner_operator, executive, compliance_manager, platform_admin
 *
 * Dimensions: Revenue, Liability, Cost, Operational
 * Card types: risk (red), opportunity (green), update (blue), action_required (amber)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemoGuard } from '../hooks/useDemoGuard';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#D1D9E6';

interface Advisory {
  id: string;
  title: string;
  summary: string;
  dimension: string;
  risk_level: string;
  advisory_type: string;
  recommended_actions: { action: string; priority: string }[];
  published_at: string;
  is_active: boolean;
  is_read?: boolean;
}

const DIMENSION_META: Record<string, { label: string; icon: string; color: string }> = {
  revenue:     { label: 'Revenue Impact',     icon: '\uD83D\uDCB0', color: '#059669' },
  liability:   { label: 'Liability Risk',     icon: '\u26A0\uFE0F', color: '#DC2626' },
  cost:        { label: 'Cost Implications',  icon: '\uD83D\uDCB3', color: '#D97706' },
  operational: { label: 'Operational Impact',  icon: '\u2699\uFE0F', color: '#2563EB' },
};

const TYPE_STYLES: Record<string, { bg: string; border: string; badge: string; badgeBg: string }> = {
  risk:            { bg: '#FEF2F2', border: '#FECACA', badge: 'RISK',    badgeBg: '#DC2626' },
  opportunity:     { bg: '#ECFDF5', border: '#A7F3D0', badge: 'OPPORTUNITY', badgeBg: '#059669' },
  update:          { bg: '#EFF6FF', border: '#BFDBFE', badge: 'UPDATE',  badgeBg: '#2563EB' },
  action_required: { bg: '#FFFBEB', border: '#FDE68A', badge: 'ACTION REQUIRED', badgeBg: '#D97706' },
};

const RISK_DOT: Record<string, string> = {
  critical: '#DC2626',
  high: '#D97706',
  medium: '#2563EB',
  low: '#6B7280',
  informational: '#9CA3AF',
};

// (DEMO_ADVISORIES removed — DB is source of truth)

export function ClientIntelligenceFeed() {
  useDemoGuard();
  const { isDemoMode } = useDemo();
  const { user } = useAuth();

  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dimensionFilter, setDimensionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const loadAdvisories = useCallback(async () => {
    setLoading(true);
    if (isDemoMode) {
      setAdvisories([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('client_advisories')
      .select('*')
      .eq('is_active', true)
      .order('published_at', { ascending: false })
      .limit(50);
    if (data) setAdvisories(data);

    // Load read status
    if (user) {
      const { data: reads } = await supabase
        .from('client_advisory_reads')
        .select('advisory_id')
        .eq('user_id', user.id);
      if (reads) setReadIds(new Set(reads.map(r => r.advisory_id)));
    }
    setLoading(false);
  }, [isDemoMode, user]);

  useEffect(() => { loadAdvisories(); }, [loadAdvisories]);

  const markRead = async (advisoryId: string) => {
    if (isDemoMode) {
      setReadIds(prev => new Set([...prev, advisoryId]));
      return;
    }
    await supabase.from('client_advisory_reads').upsert({
      advisory_id: advisoryId,
      user_id: user?.id,
    });
    setReadIds(prev => new Set([...prev, advisoryId]));
  };

  const filtered = advisories.filter(a => {
    if (dimensionFilter && a.dimension !== dimensionFilter) return false;
    if (typeFilter && a.advisory_type !== typeFilter) return false;
    return true;
  });

  const unreadCount = advisories.filter(a => !readIds.has(a.id)).length;

  const dimCounts = advisories.reduce((acc, a) => {
    acc[a.dimension] = (acc[a.dimension] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>
          Intelligence Feed
        </h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_SEC }}>
          Actionable intelligence from 80+ regulatory, legislative, and industry sources — filtered to your jurisdictions and operations.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(DIMENSION_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setDimensionFilter(dimensionFilter === key ? '' : key)}
            className="text-left p-4 rounded-xl border bg-white transition-all"
            style={{
              borderColor: dimensionFilter === key ? meta.color : BORDER,
              boxShadow: dimensionFilter === key ? `0 0 0 1px ${meta.color}` : undefined,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{meta.icon}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
                {meta.label}
              </span>
            </div>
            <div className="text-xl font-bold" style={{ color: NAVY }}>
              {dimCounts[key] || 0}
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="text-sm rounded-lg border px-3 py-2 bg-white"
          style={{ borderColor: BORDER, color: NAVY }}
        >
          <option value="">All Types</option>
          <option value="risk">Risk</option>
          <option value="opportunity">Opportunity</option>
          <option value="update">Update</option>
          <option value="action_required">Action Required</option>
        </select>

        {unreadCount > 0 && (
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: '#FEF2F2', color: '#DC2626' }}
          >
            {unreadCount} unread
          </span>
        )}

        {(dimensionFilter || typeFilter) && (
          <button
            onClick={() => { setDimensionFilter(''); setTypeFilter(''); }}
            className="text-xs font-medium underline"
            style={{ color: TEXT_SEC }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Advisory cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-xl border bg-white animate-pulse" style={{ borderColor: BORDER }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border" style={{ borderColor: BORDER }}>
          <div className="text-4xl mb-3">{'\uD83D\uDD14'}</div>
          <div className="text-sm font-semibold" style={{ color: NAVY }}>
            {advisories.length === 0 ? 'No advisories yet' : 'No advisories match your filters'}
          </div>
          <div className="text-xs mt-1" style={{ color: TEXT_SEC }}>
            {advisories.length === 0
              ? 'Intelligence advisories will appear here as they are published.'
              : 'Adjust your filters or check back later for new intelligence.'}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(advisory => {
            const typeStyle = TYPE_STYLES[advisory.advisory_type] || TYPE_STYLES.update;
            const isRead = readIds.has(advisory.id);
            const riskColor = RISK_DOT[advisory.risk_level] || RISK_DOT.medium;
            const dimMeta = DIMENSION_META[advisory.dimension] || DIMENSION_META.operational;

            return (
              <div
                key={advisory.id}
                className="rounded-xl border bg-white overflow-hidden transition-all"
                style={{
                  borderColor: BORDER,
                  opacity: isRead ? 0.75 : 1,
                  borderLeft: `4px solid ${riskColor}`,
                }}
              >
                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full text-white"
                          style={{ background: typeStyle.badgeBg }}
                        >
                          {typeStyle.badge}
                        </span>
                        <span className="text-[10px] font-medium" style={{ color: dimMeta.color }}>
                          {dimMeta.icon} {dimMeta.label}
                        </span>
                        <span className="flex items-center gap-1 text-[10px]" style={{ color: TEXT_MUTED }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: riskColor, display: 'inline-block' }} />
                          {advisory.risk_level}
                        </span>
                      </div>
                      <h3 className="text-[15px] font-bold" style={{ color: NAVY }}>
                        {advisory.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isRead && (
                        <button
                          onClick={() => markRead(advisory.id)}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors hover:bg-gray-50"
                          style={{ borderColor: BORDER, color: TEXT_SEC }}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-xs leading-relaxed mb-4" style={{ color: TEXT_SEC, lineHeight: 1.7 }}>
                    {advisory.summary}
                  </p>

                  {/* Recommended actions */}
                  {advisory.recommended_actions && advisory.recommended_actions.length > 0 && (
                    <div
                      className="rounded-lg p-3"
                      style={{ background: '#F9FAFB', border: `1px solid ${BORDER}` }}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: TEXT_MUTED }}>
                        Recommended Actions
                      </div>
                      <div className="space-y-1.5">
                        {advisory.recommended_actions.map((ra, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                              style={{
                                background:
                                  ra.priority === 'critical' ? '#DC2626' :
                                  ra.priority === 'high' ? '#D97706' :
                                  ra.priority === 'medium' ? '#2563EB' : '#6B7280',
                              }}
                            />
                            <span className="text-xs" style={{ color: NAVY }}>{ra.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <span className="text-[11px]" style={{ color: TEXT_MUTED }}>
                      Published {new Date(advisory.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {isRead && (
                      <span className="text-[10px] font-medium" style={{ color: '#059669' }}>
                        {'\u2713'} Read
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
