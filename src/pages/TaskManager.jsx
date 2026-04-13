/**
 * TaskManager.jsx — TASK-ASSIGN-01
 *
 * Main task management page at /tasks.
 * 3-tab view: Today (instances), Schedule (week grid), Definitions (manager+).
 */

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardList, Filter, Settings, Plus, Calendar, ListChecks,
  Clock, AlertTriangle, CheckCircle2, Users,
} from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { useTaskInstances } from '../hooks/useTaskInstances';
import { useTaskDefinitions } from '../hooks/useTaskDefinitions';
import { TaskInstanceCard } from '../components/tasks/TaskInstanceCard';
import { TaskDefinitionForm } from '../components/tasks/TaskDefinitionForm';
import { NotificationPrefs } from '../components/tasks/NotificationPrefs';

const TABS = [
  { id: 'today', label: 'Today', icon: ListChecks },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'definitions', label: 'Templates', icon: Settings },
];

const MANAGER_ROLES = ['kitchen_manager', 'owner_operator', 'executive', 'compliance_manager', 'platform_admin'];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Tasks' },
  { value: 'my', label: 'My Tasks' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'overdue', label: 'Overdue' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TaskManager() {
  const [searchParams] = useSearchParams();
  const { userRole } = useRole();
  const { isDemoMode } = useDemo();
  const { user } = useAuth();

  const { tasks, myTasks, unassignedTasks, overdueTasks, loading, startTask, completeTask, skipTask } = useTaskInstances();
  const { definitions, loading: defsLoading, create, update, toggleActive } = useTaskDefinitions();

  const [tab, setTab] = useState('today');
  const [filter, setFilter] = useState('all');
  const [showDefForm, setShowDefForm] = useState(false);
  const [editDef, setEditDef] = useState(null);
  const [showPrefs, setShowPrefs] = useState(false);

  const isManager = MANAGER_ROLES.includes(userRole);

  // Auto-open definition form if ?action=new
  useEffect(() => {
    if (searchParams.get('action') === 'new' && isManager) {
      setTab('definitions');
      setShowDefForm(true);
    }
  }, [searchParams, isManager]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'my': return myTasks;
      case 'unassigned': return unassignedTasks;
      case 'overdue': return overdueTasks;
      default: return tasks;
    }
  }, [filter, tasks, myTasks, unassignedTasks, overdueTasks]);

  // Group by status for summary
  const summary = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    overdue: tasks.filter((t) => t.status === 'overdue' || t.status === 'escalated').length,
    pending: tasks.filter((t) => t.status === 'pending').length,
  }), [tasks]);

  // Available tabs (hide Definitions for non-managers)
  const visibleTabs = isManager ? TABS : TABS.filter((t) => t.id !== 'definitions');

  const handleSaveDef = async (formData) => {
    if (editDef) {
      await update(editDef.id, formData);
    } else {
      await create(formData);
    }
    setShowDefForm(false);
    setEditDef(null);
  };

  // ── Week schedule view data ──
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1E2D4D' }}>
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Task Manager</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {isDemoMode
                ? 'Task scheduling and assignment'
                : `${summary.completed}/${summary.total} completed today`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPrefs(true)}
          className="p-2 rounded-lg hover:bg-[var(--bg-panel)] transition-colors"
          title="Notification settings"
        >
          <Settings className="w-5 h-5 text-[var(--text-tertiary)]" />
        </button>
      </div>

      {/* Summary cards (live mode only) */}
      {!isDemoMode && tasks.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: summary.total, color: '#1E2D4D' },
            { label: 'Pending', value: summary.pending, color: '#6B7F96' },
            { label: 'Completed', value: summary.completed, color: '#166534' },
            { label: 'Overdue', value: summary.overdue, color: '#991B1B' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-3 text-center"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-[var(--text-tertiary)]">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-panel)' }}>
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                backgroundColor: tab === t.id ? 'var(--bg-card)' : 'transparent',
                color: tab === t.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: tab === t.id ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
              }}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ══════ TODAY TAB ══════ */}
      {tab === 'today' && (
        <div>
          {/* Filters */}
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-[var(--text-tertiary)]" />
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="px-3 py-1 text-xs font-medium rounded-lg transition-colors"
                style={{
                  backgroundColor: filter === f.value ? '#1E2D4D' : 'var(--bg-panel)',
                  color: filter === f.value ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {f.label}
                {f.value === 'overdue' && summary.overdue > 0 && (
                  <span className="ml-1 px-1 rounded-full text-[10px] bg-red-200 text-red-800">{summary.overdue}</span>
                )}
              </button>
            ))}
          </div>

          {/* Task list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-[var(--bg-panel)] animate-pulse" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-[var(--text-tertiary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No Tasks</h3>
              <p className="text-xs text-[var(--text-tertiary)]">
                {isDemoMode
                  ? 'Task instances are generated from active templates in live mode.'
                  : filter !== 'all'
                    ? 'No tasks match this filter.'
                    : 'No tasks scheduled for today. Create a template to get started.'}
              </p>
              {isManager && !isDemoMode && (
                <button
                  onClick={() => { setTab('definitions'); setShowDefForm(true); }}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
                  style={{ backgroundColor: '#1E2D4D' }}
                >
                  <Plus className="w-4 h-4" /> Create Template
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <TaskInstanceCard
                  key={task.id}
                  task={task}
                  onStart={startTask}
                  onComplete={completeTask}
                  onSkip={skipTask}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════ SCHEDULE TAB ══════ */}
      {tab === 'schedule' && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div
                  key={i}
                  className="px-2 py-2 text-center border-r border-[var(--border)] last:border-r-0"
                  style={{ backgroundColor: isToday ? '#EFF6FF' : 'transparent' }}
                >
                  <div className="text-[10px] font-medium text-[var(--text-tertiary)]">{DAY_NAMES[d.getDay()]}</div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: isToday ? '#1E2D4D' : 'var(--text-primary)' }}
                  >
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {definitions.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)]" />
              <p className="text-xs text-[var(--text-tertiary)]">
                {isDemoMode
                  ? 'Schedule view populates from active task templates in live mode.'
                  : 'No task templates defined yet. Create one in the Templates tab.'}
              </p>
            </div>
          ) : (
            <div>
              {definitions.filter((d) => d.is_active).map((def) => (
                <div key={def.id} className="grid grid-cols-7 border-b border-[var(--border-subtle)] last:border-b-0">
                  {weekDays.map((d, i) => {
                    const dayNum = d.getDay();
                    const applies =
                      def.schedule_type === 'daily' ||
                      def.schedule_type === 'shift' ||
                      (def.schedule_type === 'weekly' && def.schedule_days?.includes(dayNum));
                    return (
                      <div
                        key={i}
                        className="px-1.5 py-2 border-r border-[var(--border-subtle)] last:border-r-0 min-h-[40px]"
                      >
                        {applies && (
                          <div
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate"
                            style={{ backgroundColor: '#EFF6FF', color: '#1E2D4D' }}
                            title={def.name}
                          >
                            {def.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════ DEFINITIONS TAB ══════ */}
      {tab === 'definitions' && isManager && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[var(--text-secondary)]">
              {definitions.length} template{definitions.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => { setEditDef(null); setShowDefForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
              style={{ backgroundColor: '#1E2D4D' }}
            >
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>

          {defsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-[var(--bg-panel)] animate-pulse" />
              ))}
            </div>
          ) : definitions.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <Settings className="w-10 h-10 mx-auto mb-3 text-[var(--text-tertiary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No Templates</h3>
              <p className="text-xs text-[var(--text-tertiary)] mb-3">
                {isDemoMode
                  ? 'Task templates are managed in live mode.'
                  : 'Create your first task template to start scheduling recurring tasks.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {definitions.map((def) => (
                <div
                  key={def.id}
                  className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    opacity: def.is_active ? 1 : 0.5,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{def.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                      <span className="capitalize">{def.schedule_type}</span>
                      <span>{def.task_type.replace('_', ' ')}</span>
                      {def.assigned_to_role && <span>→ {def.assigned_to_role.replace('_', ' ')}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(def.id, !def.is_active)}
                    className="px-3 py-1 text-xs font-medium rounded-lg transition-colors"
                    style={{
                      backgroundColor: def.is_active ? '#F0FDF4' : 'var(--bg-panel)',
                      color: def.is_active ? '#166534' : 'var(--text-tertiary)',
                    }}
                  >
                    {def.is_active ? 'Active' : 'Paused'}
                  </button>
                  <button
                    onClick={() => { setEditDef(def); setShowDefForm(true); }}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-panel)]"
                  >
                    <Settings className="w-4 h-4 text-[var(--text-tertiary)]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showDefForm && (
        <TaskDefinitionForm
          definition={editDef}
          onSave={handleSaveDef}
          onClose={() => { setShowDefForm(false); setEditDef(null); }}
        />
      )}
      {showPrefs && <NotificationPrefs onClose={() => setShowPrefs(false)} />}
    </div>
  );
}
