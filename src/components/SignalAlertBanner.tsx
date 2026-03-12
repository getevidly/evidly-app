/**
 * SIGNAL-NOTIFY-01 — Dashboard banner for critical/high intelligence signal notifications
 *
 * Shows a dismissible banner at the top of the dashboard when there are
 * unread critical or high-priority signal notifications.
 * - "View →" navigates to /insights/intelligence (Business Intelligence)
 * - "×" dismisses (marks all signal notifications as read)
 *
 * No CIC pillar scores are shown to operators — only the signal title
 * and advisory language.
 */

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { useSignalNotifications } from '../hooks/useSignalNotifications';

export function SignalAlertBanner() {
  const { criticalNotifications, hasCritical, dismissAll } = useSignalNotifications();
  const navigate = useNavigate();

  if (!hasCritical) return null;

  const first = criticalNotifications[0];
  const count = criticalNotifications.length;

  return (
    <div
      className="rounded-xl mb-4 overflow-hidden"
      style={{
        background: first.priority === 'critical' ? '#FEF2F2' : '#FFFBEB',
        border: `1px solid ${first.priority === 'critical' ? '#FECACA' : '#FDE68A'}`,
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <AlertTriangle
          className="h-4 w-4 shrink-0"
          style={{ color: first.priority === 'critical' ? '#DC2626' : '#D97706' }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-semibold truncate"
            style={{ color: first.priority === 'critical' ? '#991B1B' : '#92400E' }}
          >
            New Intelligence Signal{count > 1 ? `s (${count})` : ''}
          </p>
          <p className="text-[13px] text-gray-600 truncate mt-0.5">
            {first.title}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/insights/intelligence')}
          className="inline-flex items-center gap-1 text-xs font-bold shrink-0 px-3 py-1.5 rounded-md transition-colors"
          style={{
            color: first.priority === 'critical' ? '#991B1B' : '#92400E',
            backgroundColor: first.priority === 'critical' ? 'rgba(153,27,27,0.08)' : 'rgba(146,64,14,0.08)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              first.priority === 'critical' ? 'rgba(153,27,27,0.15)' : 'rgba(146,64,14,0.15)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              first.priority === 'critical' ? 'rgba(153,27,27,0.08)' : 'rgba(146,64,14,0.08)';
          }}
        >
          View <ArrowRight className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={dismissAll}
          className="p-1 rounded-md transition-colors shrink-0"
          style={{ color: '#9CA3AF' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#6B7280';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.05)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = '#9CA3AF';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
