import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useMobileTasks } from '../../hooks/useMobileTasks';
import { useMobileAlerts } from '../../hooks/useMobileAlerts';
import { getMobileQuickActions, getMobileBottomNav, getRoleLabel } from '../../config/mobileProductionConfig';
import { MobileHeader } from './MobileHeader';
import { MobileQuickActions } from './MobileQuickActions';
import { AlertsBanner } from './AlertsBanner';
import { TaskList, countDueTasks } from './TaskList';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileMoreMenu } from './MobileMoreMenu';
import type { MobileTask } from '../../data/mobileDemoData';

export function MobileDailyTasksProduction() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { userRole } = useRole();
  const [moreOpen, setMoreOpen] = useState(false);

  const orgId = profile?.organization_id;
  const firstName = profile?.full_name?.split(' ')[0] || 'User';

  const { tasks, isLoading: tasksLoading } = useMobileTasks(orgId, userRole);
  const { alerts } = useMobileAlerts(orgId, userRole);

  const quickActions = getMobileQuickActions(userRole);
  const bottomNav = getMobileBottomNav(userRole);

  const dueCount = countDueTasks(tasks);

  const handleTaskPress = useCallback((task: MobileTask) => {
    if (task.path) {
      navigate(task.path);
    }
  }, [navigate]);

  const handleMorePress = useCallback(() => {
    setMoreOpen(true);
  }, []);

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
        <MobileBottomNav tabs={bottomNav} onMorePress={handleMorePress} />
        <MobileMoreMenu isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
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
        <div className="space-y-4 py-4">
          {/* Quick Actions */}
          <MobileQuickActions actions={quickActions} />

          {/* Alerts */}
          <AlertsBanner alerts={alerts} />

          {/* Task List */}
          <TaskList
            tasks={tasks}
            onTaskPress={handleTaskPress}
            isLoading={tasksLoading}
          />
        </div>
      </div>

      {/* Bottom Nav */}
      <MobileBottomNav tabs={bottomNav} onMorePress={handleMorePress} />

      {/* More Menu */}
      <MobileMoreMenu isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}
