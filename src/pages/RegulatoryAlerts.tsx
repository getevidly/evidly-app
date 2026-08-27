import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Bell, Filter } from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { Breadcrumb } from '../components/Breadcrumb';
import { DEMO_ALERTS } from '../lib/regulatoryMonitor';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useRegulatoryChanges } from '../hooks/useRegulatoryChanges';
import { feedMode, type FeedMode } from '../lib/intelligenceGate';
import { supabase } from '../lib/supabase';

const NAVY = '#1E2D4D';
const EMBER = '#B24A2E';
const UPGRADE_ROUTE = '/upgrade';

/** Same vocabulary the intelligence-digest email uses for its chips. */
const CATEGORY_LABELS: Record<string, string> = {
  recall_alert: 'Recall',
  recall: 'Recall',
  outbreak_alert: 'Outbreak',
  food_code_update: 'Food Code Update',
  nfpa_update: 'NFPA Update',
  fire_safety: 'Fire Safety',
  hood_cleaning: 'Hood Cleaning',
  ventilation: 'Ventilation',
  grease_trap: 'Grease Trap',
  enforcement_surge: 'Enforcement',
};

interface IntelAlert {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  actionDeadline: string | null;
  matchType: string;
  matchReason: string | null;
  relevance: number;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

/** The chip shown first on each card — why this signal reached this kitchen. */
function relevanceChip(a: IntelAlert): string {
  const reason = a.matchReason ? a.matchReason.trim() : '';
  if (a.matchType === 'requirement' && reason) return reason;
  if (a.matchType === 'county' && reason) {
    const m = reason.match(/in\s+(.+?)\s+County/i);
    return m ? `${m[1]} County` : reason;
  }
  return CATEGORY_LABELS[a.category || ''] || 'National';
}

export function RegulatoryAlerts() {
  // TODO: i18n

  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { user, profile } = useAuth();
  const { isPaid } = useFeatureAccess();
  const { jurisdictions, monitoringSources, loading: sourcesLoading, error } = useRegulatoryChanges();

  const [alerts, setAlerts] = useState<IntelAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [trialStartDate, setTrialStartDate] = useState<string | null>(null);

  // DEMO_ALERTS is fabricated content. isDemoMode alone does NOT confine it —
  // __rolePreview in the URL forces isDemoMode true even for an authenticated
  // session, so any real org could have reached it. Requiring the absence of a
  // session confines it to the anonymous marketing tour, which is the only
  // place CLAUDE.md permits demo content.
  const showDemoContent = isDemoMode && !user;

  const orgId = profile?.organization_id;

  useEffect(() => {
    if (showDemoContent) {
      setAlerts(
        DEMO_ALERTS.map((d) => ({
          id: d.id,
          title: d.title,
          summary: d.summary,
          category: null,
          actionDeadline: d.effectiveDate || null,
          matchType: 'category',
          matchReason: null,
          relevance: 0.3,
          createdAt: d.postedDate,
        })),
      );
      setLoading(false);
      return;
    }
    if (!orgId) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);

      const [orgRes, corrRes] = await Promise.all([
        supabase.from('organizations').select('trial_start_date').eq('id', orgId).maybeSingle(),
        supabase
          .from('intelligence_correlations')
          .select(
            'signal_id, match_type, match_reason, relevance_score, intelligence_signals!inner(id, title, content_summary, category, action_deadline, is_published, created_at)',
          )
          .eq('organization_id', orgId)
          .eq('intelligence_signals.is_published', true),
      ]);

      if (cancelled) return;

      setTrialStartDate((orgRes.data?.trial_start_date as string) ?? null);

      // One signal renders once, carrying its highest-relevance correlation.
      const best = new Map<string, IntelAlert>();
      for (const row of (corrRes.data || []) as unknown as Array<{
        signal_id: string;
        match_type: string;
        match_reason: string | null;
        relevance_score: number | null;
        intelligence_signals: {
          id: string;
          title: string;
          content_summary: string | null;
          category: string | null;
          action_deadline: string | null;
          created_at: string;
        };
      }>) {
        const s = row.intelligence_signals;
        const score = row.relevance_score ?? 0;
        const cur = best.get(row.signal_id);
        if (!cur || score > cur.relevance) {
          best.set(row.signal_id, {
            id: s.id,
            title: s.title,
            summary: s.content_summary,
            category: s.category,
            actionDeadline: s.action_deadline,
            matchType: row.match_type,
            matchReason: row.match_reason,
            relevance: score,
            createdAt: s.created_at,
          });
        }
      }

      // Newest first.
      setAlerts(
        [...best.values()].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, showDemoContent]);

  const mode: FeedMode = showDemoContent
    ? 'full'
    : feedMode({ isPaid, trialStartDate });

  // Setup phase (and an indeterminate one) shows no alerts at all.
  const visibleAlerts = mode === 'none' ? [] : alerts;

  const upcomingDates = visibleAlerts
    .filter((a) => a.actionDeadline && new Date(a.actionDeadline + 'T00:00:00') > new Date())
    .sort(
      (a, b) =>
        new Date(a.actionDeadline!).getTime() - new Date(b.actionDeadline!).getTime(),
    );

  const getSourceTypeBadge = (type: string) => {
    switch (type) {
      case 'federal': return 'bg-blue-50 text-blue-700';
      case 'state': return 'bg-amber-100 text-amber-700';
      case 'county': return 'bg-emerald-50 text-emerald-700';
      case 'industry': return 'bg-red-50 text-red-700';
      default: return 'bg-[#1E2D4D]/5 text-[#1E2D4D]/70';
    }
  };

  return (
    <>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Regulatory Alerts' },
      ]} />

      {(loading || sourcesLoading) && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-[#1E2D4D]/15 border-t-[#1E2D4D] rounded-full animate-spin" />
        </div>
      )}
      {error && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 mb-4">
          Unable to connect to regulatory monitoring service. Showing cached data if available.
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D]">Regulatory Change Alerts</h1>
          <p className="text-sm text-[#1E2D4D]/70 mt-1">Stay ahead of compliance changes — we monitor so you don't have to</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 mt-6">
          {/* Left: Alert Feed */}
          <div className="flex-1 space-y-4">

            {/* Teaser cap banner */}
            {mode === 'teaser' && visibleAlerts.length > 0 && (
              <div className="bg-[#FAF7F0] rounded-xl border border-[#1E2D4D]/5 p-4 sm:p-5">
                <p className="text-sm text-[#1E2D4D]">
                  Your 60-day window has ended. These alerts kept arriving because they touch your kitchen — the detail unlocks on any plan.
                </p>
              </div>
            )}

            {visibleAlerts.length === 0 && !loading && (
              <div className="bg-white rounded-xl border border-[#1E2D4D]/5 p-4 sm:p-5 text-center">
                <Filter className="w-8 h-8 text-[#1E2D4D]/30 mx-auto mb-3" />
                <p className="text-sm text-[#1E2D4D]/50">
                  No regulatory alerts at this time. We’ll notify you when updates affect your jurisdictions.
                </p>
              </div>
            )}

            {visibleAlerts.map((alert) => (
              <div key={alert.id} className="bg-white rounded-xl border border-[#1E2D4D]/5 p-4 sm:p-6 space-y-3">

                {/* Chips: relevance first, then the deadline when there is one */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="px-2.5 py-0.5 text-xs font-semibold rounded-full"
                    style={{ backgroundColor: '#FAF7F0', color: NAVY }}
                  >
                    {relevanceChip(alert)}
                  </span>
                  {alert.actionDeadline && (
                    <span
                      className="px-2.5 py-0.5 text-xs font-semibold rounded-full"
                      style={{ backgroundColor: '#F7E9E9', color: EMBER }}
                    >
                      Deadline · {formatDate(alert.actionDeadline)}
                    </span>
                  )}
                </div>

                {/* Headline */}
                <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">{alert.title}</h3>

                {/* Body */}
                {mode === 'teaser' ? (
                  <div className="border border-dashed border-[#1E2D4D]/20 rounded-xl p-5 text-center">
                    <p className="text-sm text-[#1E2D4D]/50">
                      The detail for this alert is not included in your current plan.
                    </p>
                    <button
                      onClick={() => navigate(UPGRADE_ROUTE)}
                      className="mt-3 px-5 py-2 text-sm font-semibold text-white rounded-lg min-h-[44px]"
                      style={{ backgroundColor: EMBER }}
                    >
                      Start Your Plan to Read
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-[#1E2D4D]/80 leading-relaxed">{alert.summary}</p>
                    {alert.matchReason && (
                      <p className="text-xs text-[#1E2D4D]/50">
                        Matched because {alert.matchReason}.
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Trust line — both modes, below the list */}
            {visibleAlerts.length > 0 && (
              <p className="text-xs text-[#1E2D4D]/50 leading-relaxed pt-1">
                Why you got this: EvidLY correlates regulatory and safety changes to your kitchen's county and the services you keep records for. You only receive what touches your operation.
              </p>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[280px] flex-shrink-0">
            {/* Your Jurisdictions */}
            <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#1E2D4D]/5">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1E2D4D]" />
                <h3 className="font-semibold text-[#1E2D4D]">Your Jurisdictions</h3>
              </div>
              <p className="text-xs text-[#1E2D4D]/50 mt-1">Monitoring based on your location addresses</p>
              <div className="mt-3">
                {jurisdictions.length === 0 ? (
                  <p className="text-xs text-[#1E2D4D]/30 py-2">Add a location to see your jurisdictions.</p>
                ) : (
                  jurisdictions.map((j, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[#1E2D4D]/3 last:border-0">
                      <span className="text-sm text-[#1E2D4D]/80">{j.name}, {j.state}</span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-[#1E2D4D]/5 text-[#1E2D4D]/70">{j.type}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Monitoring Sources */}
            <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#1E2D4D]/5 mt-4">
              <div className="flex items-center gap-2">
                <EvidlyIcon size={16} />
                <h3 className="font-semibold text-[#1E2D4D]">Monitoring Sources</h3>
              </div>
              <div className="mt-3 space-y-3">
                {monitoringSources.length === 0 ? (
                  <p className="text-xs text-[#1E2D4D]/30 py-2">No monitoring sources configured.</p>
                ) : (
                  monitoringSources.map((src, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#1E2D4D]/80">{src.name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getSourceTypeBadge(src.type)}`}>{src.type}</span>
                      </div>
                      <p className="text-xs text-[#1E2D4D]/30 mt-0.5">Last checked: {formatDate(src.lastChecked)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Compliance Calendar mini card */}
            <div className="bg-white rounded-xl p-4 sm:p-6 border border-[#1E2D4D]/5 mt-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1E2D4D]" />
                <h3 className="font-semibold text-[#1E2D4D]">Upcoming Effective Dates</h3>
              </div>
              <div className="mt-3">
                {upcomingDates.length === 0 && (
                  <p className="text-xs text-[#1E2D4D]/30">No upcoming effective dates.</p>
                )}
                {upcomingDates.map((alert) => (
                  <div key={alert.id} className="text-sm py-2 border-b border-[#1E2D4D]/3 last:border-0">
                    <p className="text-xs font-semibold text-[#1E2D4D]">{formatDate(alert.actionDeadline!)}</p>
                    <p className="text-xs text-[#1E2D4D]/70 mt-0.5">
                      {alert.title.length > 50 ? alert.title.slice(0, 50) + '...' : alert.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alert Preferences link */}
            <button
              onClick={() => navigate('/settings/notifications')}
              className="mt-4 w-full text-center px-4 py-2 border border-[#1E2D4D]/15 text-[#1E2D4D]/80 text-sm rounded-lg hover:bg-[#FAF7F0] flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Alert Preferences
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
