/**
 * IntelligenceAdmin — Signal Approval Queue
 *
 * Focused admin page for reviewing and publishing intelligence signals.
 * Shows signals in hold/notify tiers that need manual review.
 * Route: /admin/intelligence-admin
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { routingTierLabel, routingTierColor, type RoutingTier } from '../../lib/intelligenceRouter';
import VerificationPanel from '../../components/admin/VerificationPanel';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E5E0D8';

interface QueueSignal {
  id: string;
  title: string;
  summary: string | null;
  signal_type: string;
  source_key: string | null;
  source_url: string | null;
  ai_urgency: string | null;
  ai_summary: string | null;
  ai_confidence: number | null;
  status: string;
  scope: string | null;
  affected_jurisdictions: string[];
  risk_revenue: string | null;
  risk_liability: string | null;
  risk_cost: string | null;
  risk_operational: string | null;
  routing_tier: RoutingTier | null;
  severity_score: number | null;
  confidence_score: number | null;
  routing_reason: string | null;
  review_deadline: string | null;
  auto_publish_at: string | null;
  created_at: string;
}

const URGENCY_COLORS: Record<string, { bg: string; text: string }> = {
  critical:      { bg: '#FEF2F2', text: '#DC2626' },
  high:          { bg: '#FFFBEB', text: '#D97706' },
  medium:        { bg: '#EFF6FF', text: '#2563EB' },
  low:           { bg: '#F9FAFB', text: '#6B7280' },
  informational: { bg: '#F9FAFB', text: '#9CA3AF' },
};

const RISK_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#D97706',
  moderate: '#2563EB',
  low: '#6B7280',
  none: '#D1D5DB',
};

const DIM_COLORS: Record<string, string> = {
  revenue: '#DC2626',
  liability: '#7C3AED',
  cost: '#D97706',
  operational: '#2563EB',
};

const LEVELS = ['critical', 'high', 'moderate', 'low', 'none'] as const;
const LEVEL_LABELS: Record<string, string> = { critical: 'Crit', high: 'High', moderate: 'Med', low: 'Low', none: 'None' };

export default function IntelligenceAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [signals, setSignals] = useState<QueueSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'hold' | 'notify'>('all');
  const [dimFilter, setDimFilter] = useState<'' | 'revenue' | 'liability' | 'cost' | 'operational'>('');
  const [publishing, setPublishing] = useState<string | null>(null);
  const [riskEdits, setRiskEdits] = useState<Record<string, { revenue: string; liability: string; cost: string; operational: string }>>({});
  const [expandedVerification, setExpandedVerification] = useState<string | null>(null);
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, { verification_status: string; publish_blocked: boolean; gates_passed: number; gates_required: number }>>({});

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('is_published', false)
      .order('routing_tier', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) {
      setSignals(data);
      // Load verification statuses for all pending signals
      const ids = data.map((s: QueueSignal) => s.id);
      if (ids.length > 0) {
        const { data: vsData } = await supabase
          .from('content_verification_status')
          .select('content_id, verification_status, publish_blocked, gates_passed, gates_required')
          .eq('content_table', 'intelligence_signals')
          .in('content_id', ids);
        if (vsData) {
          const map: typeof verificationStatuses = {};
          vsData.forEach((v: { content_id: string; verification_status: string; publish_blocked: boolean; gates_passed: number; gates_required: number }) => {
            map[v.content_id] = v;
          });
          setVerificationStatuses(map);
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const getRiskLevel = (sig: QueueSignal, dim: 'revenue' | 'liability' | 'cost' | 'operational'): string => {
    if (riskEdits[sig.id]) return riskEdits[sig.id][dim];
    return (sig[`risk_${dim}` as keyof QueueSignal] as string) || 'none';
  };

  const setRiskLevel = (sig: QueueSignal, dim: 'revenue' | 'liability' | 'cost' | 'operational', level: string) => {
    setRiskEdits(prev => ({
      ...prev,
      [sig.id]: {
        revenue: prev[sig.id]?.revenue ?? sig.risk_revenue ?? 'none',
        liability: prev[sig.id]?.liability ?? sig.risk_liability ?? 'none',
        cost: prev[sig.id]?.cost ?? sig.risk_cost ?? 'none',
        operational: prev[sig.id]?.operational ?? sig.risk_operational ?? 'none',
        [dim]: level,
      },
    }));
  };

  const isAllNone = (sig: QueueSignal): boolean => {
    return (['revenue', 'liability', 'cost', 'operational'] as const).every(d => getRiskLevel(sig, d) === 'none');
  };

  const publishSignal = async (sig: QueueSignal) => {
    setPublishing(sig.id);
    const riskValues = {
      risk_revenue: getRiskLevel(sig, 'revenue'),
      risk_liability: getRiskLevel(sig, 'liability'),
      risk_cost: getRiskLevel(sig, 'cost'),
      risk_operational: getRiskLevel(sig, 'operational'),
    };
    const { error } = await supabase
      .from('intelligence_signals')
      .update({
        ...riskValues,
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: user?.email,
      })
      .eq('id', sig.id);
    if (error) {
      console.error(`Failed to publish: ${error.message}`);
    } else {
      setSignals(prev => prev.filter(s => s.id !== sig.id));
      setRiskEdits(prev => { const next = { ...prev }; delete next[sig.id]; return next; });
      try {
        await supabase.functions.invoke('intelligence-deliver', {
          body: { type: 'signal', id: sig.id },
        });
      } catch {}
    }
    setPublishing(null);
  };

  const dismissSignal = async (sigId: string) => {
    await supabase
      .from('intelligence_signals')
      .update({ status: 'dismissed' })
      .eq('id', sigId);
    setSignals(prev => prev.filter(s => s.id !== sigId));
  };

  const filtered = signals.filter(s => {
    if (filter === 'hold' && s.routing_tier !== 'hold') return false;
    if (filter === 'notify' && s.routing_tier !== 'notify') return false;
    if (dimFilter) {
      const riskVal = s[`risk_${dimFilter}` as keyof QueueSignal] as string | null;
      if (!riskVal || riskVal === 'none') return false;
    }
    return true;
  });

  const holdCount = signals.filter(s => s.routing_tier === 'hold').length;
  const notifyCount = signals.filter(s => s.routing_tier === 'notify').length;
  const revenueCount = signals.filter(s => s.risk_revenue && s.risk_revenue !== 'none').length;
  const liabilityCount = signals.filter(s => s.risk_liability && s.risk_liability !== 'none').length;
  const costOpsCount = signals.filter(s =>
    (s.risk_cost && s.risk_cost !== 'none') ||
    (s.risk_operational && s.risk_operational !== 'none')
  ).length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>
          Signal Approval Queue
        </h1>
        <p style={{ fontSize: 13, color: TEXT_SEC, margin: 0 }}>
          Review and publish intelligence signals to client feeds. Sorted by severity.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Pending', value: signals.length, color: NAVY },
          { label: 'Revenue', value: revenueCount, color: '#DC2626' },
          { label: 'Liability', value: liabilityCount, color: '#7C3AED' },
          { label: 'Cost + Ops', value: costOpsCount, color: '#D97706' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {([
          { key: 'all' as const, label: `All (${signals.length})` },
          { key: 'hold' as const, label: `Hold (${holdCount})` },
          { key: 'notify' as const, label: `Notify (${notifyCount})` },
        ]).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: filter === f.key ? NAVY : '#fff',
              color: filter === f.key ? '#fff' : TEXT_SEC,
              border: `1px solid ${filter === f.key ? NAVY : BORDER}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Risk dimension filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Risk:</span>
        {([
          { key: '' as const, label: 'All' },
          { key: 'revenue' as const, label: 'Revenue' },
          { key: 'liability' as const, label: 'Liability' },
          { key: 'cost' as const, label: 'Cost' },
          { key: 'operational' as const, label: 'Operational' },
        ]).map(f => (
          <button key={f.key} onClick={() => setDimFilter(f.key)}
            style={{
              padding: '3px 10px', borderRadius: 14, fontSize: 10, fontWeight: 600, cursor: 'pointer',
              background: dimFilter === f.key ? GOLD : '#fff',
              color: dimFilter === f.key ? '#fff' : TEXT_MUTED,
              border: `1px solid ${dimFilter === f.key ? GOLD : BORDER}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Signal cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: 80, background: '#E5E7EB', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', background: '#FAFAF8', border: '1.5px dashed #E5E0D8', borderRadius: 10 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{'✅'}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Queue is clear</div>
          <div style={{ fontSize: 12, color: TEXT_SEC, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
            No signals pending review. New signals will appear here when the intelligence crawler detects changes.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(sig => {
            const uc = URGENCY_COLORS[sig.ai_urgency || 'low'] || URGENCY_COLORS.low;
            const rc = sig.routing_tier ? routingTierColor(sig.routing_tier) : null;
            return (
              <div key={sig.id} style={{
                background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 18px',
                borderLeft: sig.routing_tier === 'hold' ? '4px solid #DC2626' : sig.routing_tier === 'notify' ? '4px solid #D97706' : `4px solid ${BORDER}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                      {sig.routing_tier && rc && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: rc.bg, color: rc.text }}>
                          {routingTierLabel(sig.routing_tier)}
                        </span>
                      )}
                      {sig.ai_urgency && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: uc.bg, color: uc.text }}>
                          {sig.ai_urgency.toUpperCase()}
                        </span>
                      )}
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#F9FAFB', color: TEXT_SEC, border: `1px solid ${BORDER}` }}>
                        {sig.signal_type?.replace(/_/g, ' ')}
                      </span>
                      {sig.severity_score != null && (
                        <span style={{ fontSize: 9, fontWeight: 600, color: TEXT_MUTED }}>
                          Severity: {sig.severity_score}
                        </span>
                      )}
                      {sig.confidence_score != null && (
                        <span style={{ fontSize: 9, fontWeight: 600, color: TEXT_MUTED }}>
                          Confidence: {sig.confidence_score}%
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
                      {sig.title}
                    </div>

                    {/* Summary */}
                    {(sig.ai_summary || sig.summary) && (
                      <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.5, marginBottom: 6 }}>
                        {(sig.ai_summary || sig.summary || '').slice(0, 200)}
                        {(sig.ai_summary || sig.summary || '').length > 200 ? '...' : ''}
                      </div>
                    )}

                    {/* Risk dimension selectors */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8, marginTop: 4 }}>
                      {(['revenue', 'liability', 'cost', 'operational'] as const).map(dim => {
                        const current = getRiskLevel(sig, dim);
                        return (
                          <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: DIM_COLORS[dim], width: 72, textTransform: 'capitalize' }}>
                              {dim}
                            </span>
                            <div style={{ display: 'flex', gap: 3 }}>
                              {LEVELS.map(level => {
                                const isActive = current === level;
                                const levelColor = level === 'none' ? '#9CA3AF' : (RISK_COLORS[level] || '#6B7280');
                                return (
                                  <button key={level} onClick={() => setRiskLevel(sig, dim, level)}
                                    style={{
                                      padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 600, cursor: 'pointer',
                                      background: isActive ? levelColor : 'transparent',
                                      color: isActive ? '#fff' : TEXT_MUTED,
                                      border: `1px solid ${isActive ? levelColor : '#E5E7EB'}`,
                                    }}>
                                    {LEVEL_LABELS[level]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* All-none warning */}
                    {isAllNone(sig) && (
                      <div style={{ fontSize: 10, color: '#D97706', background: '#FFFBEB', padding: '4px 10px', borderRadius: 6, marginBottom: 6 }}>
                        No risk dimensions assigned — this signal will not appear under any dimension in the Intelligence Center.
                      </div>
                    )}

                    {/* Meta */}
                    <div style={{ fontSize: 10, color: TEXT_MUTED }}>
                      {sig.source_key && <span>{sig.source_key} · </span>}
                      {sig.affected_jurisdictions?.length > 0 && <span>{sig.affected_jurisdictions.join(', ')} · </span>}
                      {new Date(sig.created_at).toLocaleDateString()}
                      {sig.routing_reason && <span> · {sig.routing_reason}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    {(() => {
                      const vs = verificationStatuses[sig.id];
                      const blocked = vs?.publish_blocked ?? true;
                      const label = vs
                        ? blocked
                          ? `${vs.gates_passed}/${vs.gates_required} verified`
                          : 'Verified — Publish'
                        : 'Unverified';
                      return (
                        <button
                          onClick={() => publishSignal(sig)}
                          disabled={publishing === sig.id || blocked}
                          style={{
                            padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: blocked ? 'not-allowed' : 'pointer',
                            background: blocked ? '#E5E7EB' : '#059669', color: blocked ? TEXT_MUTED : '#fff', border: 'none',
                            opacity: publishing === sig.id ? 0.5 : 1,
                          }}
                        >
                          {publishing === sig.id ? 'Publishing...' : label}
                        </button>
                      );
                    })()}
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedVerification(expandedVerification === sig.id ? null : sig.id); }}
                      style={{
                        padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        background: 'transparent', color: TEXT_SEC, border: `1px solid ${BORDER}`,
                      }}
                    >
                      {expandedVerification === sig.id ? 'Hide Gates' : 'Verify Gates'}
                    </button>
                    <button
                      onClick={() => navigate(`/admin/verification?signal=${sig.id}`)}
                      style={{
                        padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        background: NAVY, color: '#fff', border: 'none',
                      }}
                    >
                      Verify{(() => {
                        const vs = verificationStatuses[sig.id];
                        return vs ? ` (${vs.gates_passed}/${vs.gates_required})` : '';
                      })()}
                    </button>
                    <button
                      onClick={() => dismissSignal(sig.id)}
                      style={{
                        padding: '6px 16px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        background: 'transparent', color: TEXT_MUTED, border: `1px solid ${BORDER}`,
                      }}
                    >
                      Dismiss
                    </button>
                    {sig.source_url && (
                      <a href={sig.source_url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 10, color: TEXT_SEC, textAlign: 'center', textDecoration: 'underline' }}>
                        Source
                      </a>
                    )}
                  </div>
                </div>

                {/* Verification Panel (expanded) */}
                {expandedVerification === sig.id && (
                  <div style={{ marginTop: 12 }}>
                    <VerificationPanel
                      contentTable="intelligence_signals"
                      contentId={sig.id}
                      contentType={sig.signal_type || 'recall'}
                      contentTitle={sig.title}
                      onVerificationChange={loadQueue}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
