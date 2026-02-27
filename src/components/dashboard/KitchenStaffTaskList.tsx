import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Globe,
} from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { useTooltip } from '../../hooks/useTooltip';
import { SectionTooltip } from '../ui/SectionTooltip';
import { useTranslation } from '../../contexts/LanguageContext';
import type { Locale } from '../../lib/i18n';
import { AlertBanner, type AlertBannerItem } from '../shared/AlertBanner';
import { DashboardHero } from './shared/DashboardHero';
import { DEMO_ROLE_NAMES } from './shared/constants';
import { CalendarCard, type CalendarEvent } from './shared/CalendarCard';

// --------------- Demo Data ---------------

interface StaffTask {
  id: string;
  description: string;
  descriptionEs: string;
  type: 'temp_log' | 'checklist';
  status: 'todo' | 'done';
  equipment?: string;
  completedAt?: string;
}

const DEMO_STAFF_LOCATION = 'Downtown Kitchen';

// Calendar demo events for kitchen staff
const STAFF_CALENDAR_EVENTS: CalendarEvent[] = (() => {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return [
    { date: fmt(today), type: 'checklist', title: 'Opening Checklist', location: 'Downtown Kitchen', priority: 'high' as const }, // demo
    { date: fmt(today), type: 'temp_check', title: 'AM Temperature Logs', location: 'Downtown Kitchen', priority: 'high' as const }, // demo
    { date: fmt(today), type: 'checklist', title: 'Closing Checklist', location: 'Downtown Kitchen', priority: 'medium' as const }, // demo
    { date: fmt(new Date(today.getTime() + 86400000)), type: 'checklist', title: 'Opening Checklist', location: 'Downtown Kitchen', priority: 'high' as const }, // demo
    { date: fmt(new Date(today.getTime() + 86400000)), type: 'temp_check', title: 'AM Temperature Logs', location: 'Downtown Kitchen', priority: 'high' as const }, // demo
    { date: fmt(new Date(today.getTime() + 2 * 86400000)), type: 'checklist', title: 'Opening Checklist', location: 'Downtown Kitchen', priority: 'medium' as const }, // demo
  ];
})();

const STAFF_CALENDAR_COLORS: Record<string, string> = {
  checklist: '#1e4d6b',
  temp_check: '#d97706',
};

const STAFF_CALENDAR_LABELS: Record<string, string> = {
  checklist: 'Checklist',
  temp_check: 'Temp Check',
};

const INITIAL_TASKS: StaffTask[] = [
  // TO DO (6 tasks) — temp tasks first
  { id: 'task-1', description: 'Check prep cooler temperature', descriptionEs: 'Verificar temperatura del enfriador de preparación', type: 'temp_log', status: 'todo', equipment: 'Prep Cooler' },
  { id: 'task-4', description: 'Check walk-in cooler #2 temperature', descriptionEs: 'Verificar temperatura del enfriador #2', type: 'temp_log', status: 'todo', equipment: 'Walk-in Cooler #2' },
  { id: 'task-5', description: 'Verify hot holding temps', descriptionEs: 'Verificar temperaturas de mantención caliente', type: 'temp_log', status: 'todo', equipment: 'Hot Holding Station' },
  { id: 'task-2', description: 'Sanitize prep surfaces', descriptionEs: 'Sanitizar superficies de preparación', type: 'checklist', status: 'todo' },
  { id: 'task-3', description: 'Date-label all prepped items', descriptionEs: 'Etiquetar con fecha todos los productos preparados', type: 'checklist', status: 'todo' },
  { id: 'task-6', description: 'Wipe down station', descriptionEs: 'Limpiar estación de trabajo', type: 'checklist', status: 'todo' },
  // DONE (4 tasks)
  { id: 'task-7', description: 'Check walk-in cooler #1 temperature', descriptionEs: 'Verificar temperatura del enfriador #1', type: 'temp_log', status: 'done', completedAt: '7:15 AM' },
  { id: 'task-8', description: 'Handwashing station stocked', descriptionEs: 'Estación de lavado de manos abastecida', type: 'checklist', status: 'done', completedAt: '6:45 AM' },
  { id: 'task-9', description: 'Verify freezer temperature', descriptionEs: 'Verificar temperatura del congelador', type: 'temp_log', status: 'done', completedAt: '6:30 AM' },
  { id: 'task-10', description: 'Clean floor mats', descriptionEs: 'Limpiar tapetes del piso', type: 'checklist', status: 'done', completedAt: '6:20 AM' },
];

// --------------- i18n strings ---------------

const STRINGS = {
  en: {
    myShift: 'MY SHIFT',
    tasksDone: (done: number, total: number) => `${done} of ${total} tasks done`,
    todoNow: 'TO DO NOW',
    logTemp: 'Log Temp',
    markDone: 'Mark Done',
    done: 'DONE',
    tapToExpand: 'tap to expand',
    tapToCollapse: 'tap to collapse',
    completedAt: 'Completed at',
    allDone: 'All done for now!',
    logTempMega: 'LOG TEMP',
    reportIssue: 'REPORT ISSUE',
  },
  es: {
    myShift: 'MI TURNO',
    tasksDone: (done: number, total: number) => `${done} de ${total} tareas completadas`,
    todoNow: 'POR HACER AHORA',
    logTemp: 'Registrar Temp',
    markDone: 'Marcar Hecho',
    done: 'HECHO',
    tapToExpand: 'toca para expandir',
    tapToCollapse: 'toca para contraer',
    completedAt: 'Completado a las',
    allDone: '¡Todo listo por ahora!',
    logTempMega: 'REGISTRAR TEMP',
    reportIssue: 'REPORTAR PROBLEMA',
  },
} as const;

// --------------- Helpers ---------------

function getProgressColor(pct: number): string {
  if (pct >= 80) return '#16a34a';
  if (pct >= 40) return '#d4af37';
  return '#9ca3af';
}

// ===============================================
// KITCHEN STAFF TASK LIST
// ===============================================

export default function KitchenStaffTaskList() {
  const navigate = useNavigate();
  const { locale, setLocale } = useTranslation();
  const { userRole } = useRole();
  const { isDemoMode } = useDemo();

  const lang = (locale === 'es' ? 'es' : 'en') as 'en' | 'es';
  const s = STRINGS[lang];

  const [tasks, setTasks] = useState<StaffTask[]>(isDemoMode ? INITIAL_TASKS : []);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const todoTasks = useMemo(() => tasks.filter(t => t.status === 'todo'), [tasks]);
  const doneTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);
  const totalTasks = tasks.length;
  const doneCount = doneTasks.length;
  const progressPct = Math.round((doneCount / totalTasks) * 100);

  const staffAlerts: AlertBannerItem[] = useMemo(() => {
    const overdueTasks = todoTasks.filter(t => t.type === 'temp_log');
    if (overdueTasks.length === 0) return [];
    return [{
      id: 'staff-overdue',
      severity: 'warning' as const,
      message: `${overdueTasks.length} temperature log${overdueTasks.length > 1 ? 's' : ''} due`,
      actionLabel: 'Log Now',
      route: '/temp-logs',
    }];
  }, [todoTasks]);

  const visibleAlerts = useMemo(
    () => staffAlerts.filter(a => !dismissedAlerts.has(a.id)),
    [staffAlerts, dismissedAlerts],
  );

  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => new Set(prev).add(id));
  }, []);

  const handleMarkDone = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h = hours % 12 || 12;
      const m = minutes.toString().padStart(2, '0');
      return { ...t, status: 'done' as const, completedAt: `${h}:${m} ${ampm}` };
    }));
  }, []);

  const getTaskDescription = (task: StaffTask) => lang === 'es' ? task.descriptionEs : task.description;

  const staffName = DEMO_ROLE_NAMES.kitchen_staff?.firstName || 'Miguel';

  return (
    <div className="w-full flex justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full" style={{ maxWidth: 480 }}>
        <div className="space-y-6">
          {/* Hero Banner */}
          <DashboardHero
            firstName={staffName}
            orgName={isDemoMode ? 'Pacific Coast Dining' : ''}
            locationName={isDemoMode ? DEMO_STAFF_LOCATION : ''}
          />

          {/* ============================================================ */}
          {/* ABOVE THE FOLD — Task count + progress bar                   */}
          {/* ============================================================ */}

          {/* Task count — large + progress bar */}
          <div
            className="rounded-xl p-5 text-center"
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <p className="text-4xl font-bold" style={{ color: getProgressColor(progressPct) }}>
              {doneCount} / {totalTasks}
            </p>
            <p className="text-sm text-gray-500 mt-1">{s.tasksDone(doneCount, totalTasks)}</p>
            <div className="w-full bg-gray-200 rounded-full mt-3" style={{ height: 14 }}>
              <div
                className="rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPct}%`,
                  height: 14,
                  backgroundColor: getProgressColor(progressPct),
                }}
              />
            </div>
          </div>

          {/* ONE overdue alert or next task due */}
          <AlertBanner alerts={visibleAlerts} onDismiss={handleDismissAlert} navigate={navigate} />

          {/* ============================================================ */}
          {/* BELOW THE FOLD                                                */}
          {/* ============================================================ */}

          {/* My Shift Progress (section header) */}
          <div>
            <p
              className="text-xs font-semibold uppercase mb-2 flex items-center"
              style={{ letterSpacing: '0.1em', color: '#6b7280' }}
            >
              {s.myShift}<SectionTooltip content={useTooltip('todaysProgress', userRole)} />
            </p>
            <div className="w-full bg-gray-200 rounded-full" style={{ height: 12 }}>
              <div
                className="rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPct}%`,
                  height: 12,
                  backgroundColor: getProgressColor(progressPct),
                }}
              />
            </div>
            <p className="text-sm mt-1.5" style={{ color: getProgressColor(progressPct) }}>
              {s.tasksDone(doneCount, totalTasks)}
            </p>
          </div>

          {/* TO DO NOW */}
          <div>
            <p
              className="text-xs font-semibold uppercase mb-3 flex items-center"
              style={{ letterSpacing: '0.1em', color: '#6b7280' }}
            >
              {s.todoNow}<SectionTooltip content={useTooltip('urgentItems', userRole)} />
            </p>

            {todoTasks.length === 0 ? (
              <div
                className="bg-white rounded-lg p-6 text-center"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
              >
                <p className="text-lg font-semibold text-gray-700">{s.allDone}</p>
              </div>
            ) : (
              <div
                className="bg-white rounded-lg overflow-hidden divide-y divide-gray-100"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
              >
                {todoTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4"
                    style={{ minHeight: 72 }}
                  >
                    <div className="flex items-start gap-3">
                      <Circle size={32} className="text-gray-300 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium" style={{ fontSize: 16, lineHeight: '1.4' }}>
                          {getTaskDescription(task)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      {task.type === 'temp_log' ? (
                        <button
                          type="button"
                          onClick={() => navigate('/temp-logs')}
                          className="flex items-center justify-center gap-2 rounded-lg text-white font-semibold transition-opacity hover:opacity-90 active:opacity-80"
                          style={{
                            backgroundColor: '#1e4d6b',
                            height: 44,
                            paddingLeft: 16,
                            paddingRight: 16,
                            fontSize: 16,
                          }}
                        >
                          <Thermometer size={20} />
                          {s.logTemp} →
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkDone(task.id)}
                          className="flex items-center justify-center gap-2 rounded-lg text-white font-semibold transition-opacity hover:opacity-90 active:opacity-80"
                          style={{
                            backgroundColor: '#16a34a',
                            height: 44,
                            paddingLeft: 16,
                            paddingRight: 16,
                            fontSize: 16,
                          }}
                        >
                          <CheckCircle2 size={20} />
                          {s.markDone}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DONE (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setDoneExpanded(!doneExpanded)}
              className="flex items-center gap-2 w-full text-left"
              style={{ minHeight: 56 }}
            >
              <CheckCircle2 size={20} className="text-green-500" />
              <span className="text-sm font-semibold text-gray-700">
                {s.done} ({doneCount})
              </span>
              <span className="text-xs text-gray-400 ml-1">
                {doneExpanded ? s.tapToCollapse : s.tapToExpand}
              </span>
              <span className="ml-auto">
                {doneExpanded
                  ? <ChevronUp size={20} className="text-gray-400" />
                  : <ChevronDown size={20} className="text-gray-400" />
                }
              </span>
            </button>

            {doneExpanded && (
              <div className="mt-2 space-y-1">
                {doneTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => task.type === 'temp_log' ? navigate('/temp-logs') : toast.info('Task already completed')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-gray-100 transition-colors"
                    style={{ backgroundColor: '#f9fafb' }}
                  >
                    <CheckCircle2 size={20} className="text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500 line-through">
                        {getTaskDescription(task)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{task.completedAt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mega Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate('/temp-logs')}
              className="w-full flex items-center justify-center gap-3 rounded-lg text-white font-bold transition-opacity hover:opacity-90 active:opacity-80"
              style={{
                backgroundColor: '#1e4d6b',
                height: 56,
                fontSize: 16,
              }}
            >
              <Thermometer size={24} />
              {s.logTempMega}
            </button>

            <button
              type="button"
              onClick={() => navigate('/incidents')}
              className="w-full flex items-center justify-center gap-3 rounded-lg text-white font-bold transition-opacity hover:opacity-90 active:opacity-80"
              style={{
                backgroundColor: '#dc2626',
                height: 56,
                fontSize: 16,
              }}
            >
              <AlertTriangle size={24} />
              {s.reportIssue}
            </button>
          </div>

          {/* Calendar */}
          <CalendarCard
            events={isDemoMode ? STAFF_CALENDAR_EVENTS : []}
            typeColors={STAFF_CALENDAR_COLORS}
            typeLabels={STAFF_CALENDAR_LABELS}
            navigate={navigate}
            tooltipContent={useTooltip('scheduleCalendar', userRole)}
          />

          {/* Language Toggle */}
          <div className="flex items-center justify-center gap-2 py-4">
            <Globe size={16} className="text-gray-400" />
            <button
              type="button"
              onClick={() => setLocale('en' as Locale)}
              className={`text-sm px-1 ${locale === 'en' ? 'font-bold text-gray-900 underline' : 'text-gray-400'}`}
            >
              EN
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => setLocale('es' as Locale)}
              className={`text-sm px-1 ${locale === 'es' ? 'font-bold text-gray-900 underline' : 'text-gray-400'}`}
            >
              ES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
