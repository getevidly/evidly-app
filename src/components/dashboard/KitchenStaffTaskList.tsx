import { useState, useMemo, useCallback } from 'react';
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
import { useTranslation } from '../../contexts/LanguageContext';
import type { Locale } from '../../lib/i18n';
import { AlertBanner, type AlertBannerItem } from '../shared/AlertBanner';

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

const DEMO_STAFF_NAME = 'Carlos';
const DEMO_STAFF_LOCATION = 'Downtown Kitchen';

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

  const lang = (locale === 'es' ? 'es' : 'en') as 'en' | 'es';
  const s = STRINGS[lang];

  const [tasks, setTasks] = useState<StaffTask[]>(INITIAL_TASKS);
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

  return (
    <div className="w-full flex justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full" style={{ maxWidth: 480 }}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{DEMO_STAFF_LOCATION}</h2>
            <div className="flex items-center gap-1.5">
              <ClipboardCheck size={18} style={{ color: '#1e4d6b' }} />
              <span className="text-sm font-medium text-gray-700">{DEMO_STAFF_NAME}</span>
            </div>
          </div>

          {/* Alert Banner */}
          <AlertBanner alerts={visibleAlerts} onDismiss={handleDismissAlert} navigate={navigate} />

          {/* My Shift Progress */}
          <div>
            <p
              className="text-xs font-semibold uppercase mb-2"
              style={{ letterSpacing: '0.1em', color: '#6b7280' }}
            >
              {s.myShift}
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
              className="text-xs font-semibold uppercase mb-3"
              style={{ letterSpacing: '0.1em', color: '#6b7280' }}
            >
              {s.todoNow}
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
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: '#f9fafb' }}
                  >
                    <CheckCircle2 size={20} className="text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500 line-through">
                        {getTaskDescription(task)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{task.completedAt}</span>
                  </div>
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
