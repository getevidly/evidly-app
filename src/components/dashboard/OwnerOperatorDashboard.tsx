import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Check,
  CheckCircle2, Hammer, AlertCircle,
} from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import {
  useDashboardData,
  type TaskItem,
  type LocationWithScores,
} from '../../hooks/useDashboardData';
import { useAllLocationJurisdictions } from '../../hooks/useJurisdiction';
import { useAllComplianceScores } from '../../hooks/useComplianceScore';
import type { LocationScore, LocationJurisdiction } from '../../types/jurisdiction';
import { GOLD, NAVY, BODY_TEXT, FONT, JIE_LOC_MAP } from './shared/constants';
import { ReferralBanner } from '../referral/ReferralBanner';
import { demoReferral } from '../../data/demoData';
import { ComplianceBanner } from './shared/ComplianceBanner';


// ================================================================
// LOCATION STATUS ROW (traffic light)
// ================================================================

interface LocationStatusInfo {
  locId: string;
  name: string;
  status: 'all_clear' | 'warning' | 'action_required';
  statusText: string;
}

function getLocationStatusInfo(
  loc: LocationWithScores,
  jieScore: LocationScore | null,
  _jurisdictionData: LocationJurisdiction | null,
): LocationStatusInfo {
  const foodStatus = jieScore?.foodSafety?.status ?? 'unknown';
  const fireStatus = jieScore?.fireSafety?.status ?? 'unknown';
  const fireDetails = jieScore?.fireSafety?.details as Record<string, any> | null;

  if (foodStatus === 'failing' || fireStatus === 'failing') {
    const issues: string[] = [];
    if (foodStatus === 'failing') {
      const summary = (jieScore?.foodSafety?.details as Record<string, any>)?.summary;
      issues.push(summary || 'Food safety violations');
    }
    if (fireStatus === 'failing') {
      issues.push('Fire safety non-compliant');
    }
    return { locId: loc.id, name: loc.name, status: 'action_required', statusText: issues.join(' \u00b7 ') };
  }

  if (foodStatus === 'at_risk' || fireStatus === 'at_risk') {
    const issues: string[] = [];
    if (foodStatus === 'at_risk') issues.push('Food safety at risk');
    if (fireStatus === 'at_risk') issues.push('Fire cert due soon');
    if (fireDetails) {
      if (fireDetails.hoodStatus === 'due_soon') issues.push('Hood cert due soon');
      if (fireDetails.ansulStatus === 'due_soon') issues.push('Ansul cert due soon');
    }
    return { locId: loc.id, name: loc.name, status: 'warning', statusText: issues.join(' \u00b7 ') };
  }

  return { locId: loc.id, name: loc.name, status: 'all_clear', statusText: 'All Clear' };
}

function LocationStatusRow({ info, navigate }: { info: LocationStatusInfo; navigate: (path: string) => void }) {
  const dotColor = info.status === 'all_clear' ? '#16a34a'
    : info.status === 'warning' ? '#d97706' : '#dc2626';
  const textColor = info.status === 'all_clear' ? '#16a34a'
    : info.status === 'warning' ? '#92400e' : '#991b1b';

  return (
    <button
      type="button"
      onClick={() => navigate(`/dashboard?location=${info.locId}`)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
      style={{ borderBottom: '1px solid #F0F0F0' }}
    >
      <span className="shrink-0 rounded-full" style={{ width: 12, height: 12, backgroundColor: dotColor }} />
      <span className="text-sm font-semibold flex-1" style={{ color: BODY_TEXT }}>{info.name}</span>
      <span className="text-xs font-medium" style={{ color: textColor }}>{info.statusText}</span>
      <span className="text-xs font-medium shrink-0" style={{ color: NAVY }}>View &rarr;</span>
    </button>
  );
}


// ================================================================
// TODAY'S TASKS (flat list, no tabs)
// ================================================================

const MAX_VISIBLE_TASKS = 6;

function TodaysTasks({ navigate, tasks }: { navigate: (path: string) => void; tasks: TaskItem[] }) {
  const done = tasks.filter(tk => tk.status === 'done').length;
  const visible = tasks.slice(0, MAX_VISIBLE_TASKS);
  const hasMore = tasks.length > MAX_VISIBLE_TASKS;

  return (
    <div className="bg-white rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Today's Tasks</h3>
        <span className="text-xs font-medium" style={{ color: NAVY }}>{done}/{tasks.length} complete</span>
      </div>

      {/* Task rows */}
      <div>
        {visible.map(task => {
          const isOverdue = task.status === 'overdue';
          const isDone = task.status === 'done';
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => navigate(task.route)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
              style={{
                borderBottom: '1px solid #F0F0F0',
                backgroundColor: isOverdue ? '#fef2f2' : undefined,
              }}
            >
              {isDone && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
              {task.status === 'in_progress' && <Hammer size={16} className="shrink-0" style={{ color: GOLD }} />}
              {task.status === 'pending' && <span className="shrink-0 w-4 h-4 rounded-full border-2 border-gray-300" />}
              {isOverdue && <AlertCircle size={16} className="text-red-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {task.label}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-[11px] ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                  {task.time}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* View all link */}
      {hasMore && (
        <button
          type="button"
          onClick={() => navigate('/checklists')}
          className="w-full px-4 py-3 text-center text-xs font-semibold transition-colors hover:bg-gray-50"
          style={{ color: NAVY }}
        >
          View all {tasks.length} tasks &rarr;
        </button>
      )}
    </div>
  );
}


// ================================================================
// SKELETON LOADER
// ================================================================

function DashboardSkeleton() {
  return (
    <div style={{ ...FONT, backgroundColor: '#F5F6F8', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg p-5 animate-pulse" style={{ height: i === 4 ? 200 : 60 }}>
            <div className="w-32 h-3 bg-gray-200 rounded mb-3" />
            <div className="w-full h-3 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}


// ================================================================
// ERROR BANNER
// ================================================================

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg"
      style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
    >
      <AlertTriangle size={18} className="text-red-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-red-800">Dashboard data could not be loaded</p>
        <p className="text-[11px] text-red-600">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="text-xs font-semibold px-3 py-1.5 rounded-md text-white shrink-0"
        style={{ backgroundColor: '#dc2626' }}
      >
        Retry
      </button>
    </div>
  );
}


// ================================================================
// MAIN COMPONENT — 5 ELEMENTS ONLY
// ================================================================

export default function OwnerOperatorDashboard() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { data, loading, error, refresh } = useDashboardData();

  // JIE: Dual-authority jurisdiction data per location
  const jieLocIds = useMemo(
    () => data.locations.map(l => JIE_LOC_MAP[l.id] || l.id),
    [data.locations],
  );
  const jurisdictions = useAllLocationJurisdictions(jieLocIds, isDemoMode);
  const jieScores = useAllComplianceScores(jurisdictions, isDemoMode);

  // Single vs multi-location detection
  const isSingleLocation = data.locations.length === 1;

  // Build location status rows
  const locationStatusRows = useMemo(
    () => data.locations.map(loc => {
      const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
      return getLocationStatusInfo(loc, jieScores[jieLocId] || null, jurisdictions[jieLocId] || null);
    }),
    [data.locations, jieScores, jurisdictions],
  );

  // Multi-location: only show red and yellow rows (filter out green)
  const nonGreenRows = useMemo(
    () => locationStatusRows.filter(r => r.status !== 'all_clear'),
    [locationStatusRows],
  );
  const allGreen = !isSingleLocation && nonGreenRows.length === 0;

  // ONE priority alert — highest severity, most recent
  const topAlert = useMemo(() => {
    if (data.impact.length === 0) return null;
    const sorted = [...data.impact].sort((a, b) => {
      const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
      return (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
    });
    return sorted[0];
  }, [data.impact]);

  // Conditional referral: only show when all locations >= 80 AND zero critical/high alerts
  const showReferral = useMemo(() => {
    const allCompliant = data.locations.every(l => l.score >= 80);
    const noCriticalOrHighAlerts = !data.impact.some(
      i => i.severity === 'critical' || i.severity === 'warning',
    );
    return allCompliant && noCriticalOrHighAlerts;
  }, [data.locations, data.impact]);

  // Date line — no year, quiet context
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  if (loading) return <DashboardSkeleton />;

  return (
    <div style={{ ...FONT, backgroundColor: '#F5F6F8', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Error state */}
      {error && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
          <ErrorBanner message={error} onRetry={refresh} />
        </div>
      )}

      {/* Date line — right-aligned, quiet context */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
        <p className="text-right" style={{ color: '#9CA3AF', fontSize: '13px' }}>
          {todayStr}
        </p>
      </div>

      {/* ─── ELEMENT 1: Compliance Warning Banners ──────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <ComplianceBanner isSingleLocation={isSingleLocation} />
      </div>

      {/* ─── ELEMENT 2: Today's Tasks ───────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <TodaysTasks navigate={navigate} tasks={data.tasks} />
      </div>

      {/* ─── ELEMENT 3: ONE Priority Alert ──────────────────────── */}
      {topAlert && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          <button
            type="button"
            onClick={() => navigate(topAlert.route)}
            className="w-full flex items-start gap-3 p-4 rounded-lg text-left transition-colors hover:opacity-90"
            style={{
              backgroundColor: 'white',
              border: `1px solid ${topAlert.severity === 'critical' ? '#fecaca' : '#fde68a'}`,
              borderLeftWidth: 4,
              borderLeftColor: topAlert.severity === 'critical' ? '#DC2626' : '#F59E0B',
            }}
          >
            <AlertTriangle
              size={16}
              className={`shrink-0 mt-0.5 ${topAlert.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-800">{topAlert.action}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {topAlert.location} &middot; {topAlert.pillar} &middot; +{topAlert.points} pts
              </p>
            </div>
            <span className="text-xs font-semibold shrink-0" style={{ color: NAVY }}>
              Fix Now &rarr;
            </span>
          </button>
        </div>
      )}

      {/* ─── ELEMENT 4: Location Status Rows (multi-location only) ── */}
      {!isSingleLocation && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          {allGreen ? (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Check size={16} style={{ color: '#16a34a' }} />
                <span className="text-sm" style={{ color: '#6B7280' }}>All locations compliant</span>
              </div>
              <span className="text-sm" style={{ color: '#6B7280' }}>{todayStr}</span>
            </div>
          ) : (
            <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
              {nonGreenRows.map(info => (
                <LocationStatusRow key={info.locId} info={info} navigate={navigate} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ELEMENT 5: Referral Banner (conditional) ─────────────── */}
      {showReferral && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          <ReferralBanner
            referralCode={demoReferral.referralCode}
            referralUrl={demoReferral.referralUrl}
            mealsGenerated={demoReferral.mealsGenerated}
          />
        </div>
      )}

    </div>
  );
}
