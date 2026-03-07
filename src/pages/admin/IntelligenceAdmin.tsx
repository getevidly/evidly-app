/**
 * IntelligenceAdmin — Signal Approval Queue
 *
 * Focused admin page for reviewing and publishing intelligence signals.
 * Shows signals in hold/notify tiers that need manual review.
 * Route: /admin/intelligence-admin
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { routingTierLabel, routingTierColor, type RoutingTier } from '../../lib/intelligenceRouter';

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

export default function IntelligenceAdmin() {
  const { user } = useAuth();
  const [signals, setSignals] = useState<QueueSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'hold' | 'notify'>('all');
  const [publishing, setPublishing] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('is_published', false)
      .order('routing_tier', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setSignals(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const publishSignal = async (sig: QueueSignal) => {
    setPublishing(sig.id);
    const { error } = await supabase
      .from('intelligence_signals')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: user?.email,
      })
      .eq('id', sig.id);
    if (error) {
      alert(`Failed to publish: ${error.message}`);
    } else {
      setSignals(prev => prev.filter(s => s.id !== sig.id));
      // Fire-and-forget delivery
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
    if (filter === 'hold') return s.routing_tier === 'hold';
    if (filter === 'notify') return s.routing_tier === 'notify';
    return true;
  });

  const holdCount = signals.filter(s => s.routing_tier === 'hold').length;
  const notifyCount = signals.filter(s => s.routing_tier === 'notify').length;
  const autoCount = signals.filter(s => s.routing_tier === 'auto').length;

  const RiskDot = ({ level }: { level: string | null }) => {
    if (!level || level === 'none') return null;
    return (
      <span style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: RISK_COLORS[level] || RISK_COLORS.low,
      }} />
    );
  };

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
          { label: 'Hold (Review)', value: holdCount, color: '#DC2626' },
          { label: 'Notify (Approve)', value: notifyCount, color: '#D97706' },
          { label: 'Auto (Scheduled)', value: autoCount, color: '#059669' },
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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

                    {/* Risk dimensions */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                      {[
                        { label: 'Rev', level: sig.risk_revenue },
                        { label: 'Liab', level: sig.risk_liability },
                        { label: 'Cost', level: sig.risk_cost },
                        { label: 'Ops', level: sig.risk_operational },
                      ].map(r => (
                        <span key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: TEXT_MUTED }}>
                          <RiskDot level={r.level} /> {r.label}: {r.level || 'none'}
                        </span>
                      ))}
                    </div>

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
                    <button
                      onClick={() => publishSignal(sig)}
                      disabled={publishing === sig.id}
                      style={{
                        padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        background: GOLD, color: '#fff', border: 'none',
                        opacity: publishing === sig.id ? 0.5 : 1,
                      }}
                    >
                      {publishing === sig.id ? 'Publishing...' : 'Publish'}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
