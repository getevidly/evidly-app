/**
 * DashboardToday — "Today" tab content for Dashboard.
 *
 * Shows a quick summary of today's scheduled tasks, upcoming deadlines,
 * and module statuses. Pulls from existing useDashboardData() hook.
 */

import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ChevronRight,
  ClipboardCheck, Thermometer, FileUp,
} from 'lucide-react';
import { useDashboardData, type DeadlineItem } from '../../hooks/useDashboardData';
import { NAVY, BODY_TEXT, FONT } from './shared/constants';
import { OnboardingCard } from '../onboarding/OnboardingCard';

function DeadlineRow({ item, navigate }: { item: DeadlineItem; navigate: (path: string) => void }) {
  const color = item.severity === 'critical' ? '#dc2626' : item.severity === 'warning' ? '#d97706' : '#6b7280';
  return (
    <button
      type="button"
      onClick={() => navigate(item.route)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FAF7F0]"
      style={{ borderBottom: '1px solid #F0F0F0' }}
    >
      <CalendarDays size={16} style={{ color }} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: BODY_TEXT }}>{item.label}</p>
        <p className="text-xs" style={{ color: '#6b7280' }}>{item.location} · Due {item.dueDate}</p>
      </div>
      <span className="text-xs font-semibold shrink-0" style={{ color }}>
        {item.daysLeft}d
      </span>
    </button>
  );
}

export function DashboardToday() {
  const navigate = useNavigate();
  const { data } = useDashboardData();
  const deadlines = data.deadlines ?? [];
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto space-y-5" style={{ ...FONT }}>
      {/* Date header — centered */}
      <div className="text-center mb-4">
        <span className="font-semibold" style={{ color: '#1E2D4D' }}>Today</span>
        <span className="mx-2 text-[#1E2D4D]/30">&middot;</span>
        <span className="text-[#1E2D4D]/50">{todayStr}</span>
      </div>

      {/* Onboarding Checklist */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
        <OnboardingCard />
      </div>

      {/* Upcoming Deadlines */}
      {deadlines.length > 0 && (
        <div className="bg-white rounded-xl" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Upcoming Deadlines</h3>
          </div>
          <div>
            {deadlines.map(item => (
              <DeadlineRow key={item.id} item={item} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: 'Log Temp', subtitle: 'Record a reading', icon: Thermometer, route: '/temp-logs', iconBg: '#fef2f2', iconColor: '#ef4444' },
          { label: 'Run Checklist', subtitle: 'Start a checklist', icon: ClipboardCheck, route: '/checklists', iconBg: 'rgba(160,140,90,0.08)', iconColor: '#A08C5A' },
          { label: 'Report Incident', subtitle: 'Log an incident', icon: AlertTriangle, route: '/incidents', iconBg: '#fefce8', iconColor: '#d97706' },
          { label: 'Upload Doc', subtitle: 'Add a document', icon: FileUp, route: '/documents', iconBg: '#eff6ff', iconColor: '#3b82f6' },
        ] as const).map(link => (
          <button
            key={link.route}
            type="button"
            onClick={() => navigate(link.route, { state: { fromTab: 'today' } })}
            className="group bg-white rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-[#1E2D4D]/15 transition-all duration-200"
            style={{ border: '1px solid #e5e7eb' }}
          >
            <div className="p-2 rounded-lg" style={{ backgroundColor: link.iconBg, color: link.iconColor }}>
              <link.icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block" style={{ color: BODY_TEXT }}>{link.label}</span>
              <span className="text-xs" style={{ color: '#6b7280' }}>{link.subtitle}</span>
            </div>
            <ChevronRight
              size={14}
              className="ml-auto shrink-0 text-[#1E2D4D]/30 group-hover:text-[#1E2D4D]/70 group-hover:translate-x-1 transition-all duration-200"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
