import { useRole } from '../../contexts/RoleContext';
import { MOBILE_DEMO_DATA } from '../../data/mobileDemoData';
import { MobileHeader } from './MobileHeader';
import { MobileQuickActions } from './MobileQuickActions';
import { AlertsBanner } from './AlertsBanner';
import { TaskList, countDueTasks } from './TaskList';
import { MobileRoleSwitcher } from './MobileRoleSwitcher';

export function MobileDailyTasks() {
  const { userRole } = useRole();
  const data = MOBILE_DEMO_DATA[userRole];
  const dueCount = countDueTasks(data.tasks);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col lg:hidden"
      style={{ background: '#F7F6F3', height: '100dvh' }}
    >
      {/* Header */}
      <MobileHeader
        roleLabel={data.roleLabel}
        firstName={data.greeting}
        tasksDueCount={dueCount}
        totalTasks={data.tasks.length}
      />

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="space-y-4 py-4" style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)' }}>
          {/* Role Switcher (demo only) */}
          <MobileRoleSwitcher />

          {/* Quick Actions */}
          <MobileQuickActions actions={data.quickActions} />

          {/* Alerts */}
          <AlertsBanner alerts={data.alerts} />

          {/* Task List */}
          <TaskList tasks={data.tasks} />
        </div>
      </div>
    </div>
  );
}
