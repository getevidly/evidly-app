import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useMobileTasks } from '../../hooks/useMobileTasks';
import { useRecordsOnFile } from '../../hooks/useRecordsOnFile';
import { useMobileAlerts } from '../../hooks/useMobileAlerts';
import { getMobileQuickActions, getRoleLabel } from '../../config/mobileProductionConfig';
import { MobileHeader } from './MobileHeader';
import { MobileQuickActions } from './MobileQuickActions';
import { AlertsBanner } from './AlertsBanner';
import { TaskList, countDueTasks } from './TaskList';
import type { MobileTask } from '../../data/mobileDemoData';

export function MobileDailyTasksProduction() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { userRole } = useRole();
  const orgId = profile?.organization_id;
  const firstName = profile?.full_name?.split(' ')[0] || 'User';

  const { tasks, isLoading: tasksLoading } = useMobileTasks(orgId, userRole);
  const { alerts, isLoading: alertsLoading } = useMobileAlerts(orgId, userRole);

  const quickActions = getMobileQuickActions(userRole);
  const dueCount = countDueTasks(tasks);

  const handleTaskPress = useCallback((task: MobileTask) => {
    if (task.path) {
      navigate(task.path);
    }
  }, [navigate]);

  // Empty state: no org configured
  if (!orgId) {
    return (
      <div
        className="fixed inset-0 z-40 flex flex-col lg:hidden"
        style={{ background: '#F7F6F3', height: '100dvh' }}
      >
        <MobileHeader
          roleLabel={getRoleLabel(userRole)}
          firstName={firstName}
          tasksDueCount={0}
          totalTasks={0}
        />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <span className="text-4xl block mb-4">🏪</span>
            <p className="text-[16px] font-semibold text-[#1E2D4D] mb-2">
              Add your first location to get started
            </p>
            <p className="text-sm text-[#6B7280] leading-snug">
              Your daily tasks will appear here once your kitchen is set up.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col lg:hidden"
      style={{ background: '#F7F6F3', height: '100dvh' }}
    >
      {/* Header */}
      <MobileHeader
        roleLabel={getRoleLabel(userRole)}
        firstName={firstName}
        tasksDueCount={dueCount}
        totalTasks={tasks.length}
      />

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="space-y-4 py-4" style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)' }}>
          {/* Quick Actions */}
          <MobileQuickActions actions={quickActions} />

          {/* Alerts */}
          <AlertsBanner alerts={alerts} isLoading={alertsLoading} />

          {/* Records on file */}
          <MobileRecordsOnFile />

          {/* Task List */}
          <TaskList
            tasks={tasks}
            onTaskPress={handleTaskPress}
            isLoading={tasksLoading}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Records on file (mobile) ───────────────────────────────────
// Same counts as the desktop dashboard block, in this screen's card
// language: rounded-2xl white card, hairline navy border, px-4 gutter.
// No percentage, and the word "compliance" does not appear.
function MobileRecordsOnFile() {
  const navigate = useNavigate();
  const { onFile, required, gap, pillars, missing, loading } = useRecordsOnFile(null);

  // Same reservation as the desktop block - hold the card box while counts load.
  if (loading) {
    return (
      <div className="px-4">
        <div className="rounded-2xl bg-white border border-[#1E2D4D]/5" style={{ minHeight: 484 }} aria-hidden="true" />
      </div>
    );
  }
  if (required === 0) return null;

  const empty = onFile === 0;
  const inMotion = missing[0];

  return (
    <div className="px-4">
      <div className="rounded-2xl bg-white border border-[#1E2D4D]/5 px-4 py-4">
        <div
          className="text-[10px] tracking-[0.15em] font-semibold mb-1.5"
          style={{ color: '#6B7689', fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
        >
          RECORDS ON FILE
        </div>

        <h2 className="text-[17px] leading-snug font-semibold" style={{ color: '#1E2D4D' }}>
          {empty ? (
            <>{required} records to collect — collection is underway</>
          ) : (
            <>{onFile} of {required} records on file — <span style={{ color: '#B24A2E' }}>{gap} to collect</span></>
          )}
        </h2>

        <p className="text-[13px] mt-1 leading-snug" style={{ color: '#6B7689' }}>
          What an inspector, insurer, or landlord can be handed today.
        </p>

        <div className="mt-4 space-y-2.5">
          {pillars.map(p => {
            const complete = p.onFile >= p.required;
            const near = !complete && p.required > 0 && p.onFile / p.required >= 0.8;
            const barColor = complete || near ? '#3F6B47' : '#B08A2E';
            const widthPct = p.required > 0 ? Math.round((p.onFile / p.required) * 100) : 0;
            return (
              <div key={p.pillar}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-medium" style={{ color: '#1E2D4D' }}>{p.label}</span>
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: '#6B7689', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", letterSpacing: '0.08em' }}
                  >
                    {p.onFile} OF {p.required}
                  </span>
                </div>
                <div className="mt-1.5" style={{ height: 4, backgroundColor: '#F0EADC', borderRadius: 999 }}>
                  <div style={{ height: '100%', width: `${widthPct}%`, backgroundColor: barColor, borderRadius: 999 }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(30,45,77,0.08)' }}>
          {inMotion ? (
            <>
              <div className="text-[13px] leading-snug" style={{ color: '#1E2D4D' }}>
                <span className="font-semibold">In motion:</span> {inMotion.label} — requested from your
                vendor. It files here automatically when it lands.
              </div>
              <button
                type="button"
                onClick={() => navigate(inMotion.actionType === 'identify_vendor' ? '/vendors' : '/documents')}
                className="w-full mt-3 rounded-xl text-white text-[14px] font-semibold min-h-[44px] active:scale-[0.98] transition-transform"
                style={{ backgroundColor: '#1E2D4D' }}
              >
                View status
              </button>
              <div className="text-[12px] mt-2.5" style={{ color: '#6B7689' }}>
                Have a copy already?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/documents?upload=1')}
                  className="underline"
                  style={{ color: '#1E2D4D' }}
                >
                  Upload it
                </button>{' '}
                and we’ll file it now.
              </div>
            </>
          ) : (
            <div className="text-[13px]" style={{ color: '#1E2D4D' }}>All required records are on file.</div>
          )}
        </div>
      </div>
    </div>
  );
}
