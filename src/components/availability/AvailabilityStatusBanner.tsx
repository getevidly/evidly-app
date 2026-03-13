/**
 * AvailabilityStatusBanner — Shows availability submission status on Dashboard/Timecards.
 * States: not submitted (before/after deadline), submitted, late pending approval.
 */
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  useAvailabilitySubmission,
  useAvailabilityDeadline,
  useNextWeekDates,
} from '../../hooks/api/useAvailability';

interface BannerConfig {
  icon: typeof CalendarCheck;
  bg: string;
  border: string;
  text: string;
  label: string;
}

export function AvailabilityStatusBanner() {
  const navigate = useNavigate();
  const { weekStart, dates } = useNextWeekDates();
  const deadline = useAvailabilityDeadline();
  const { data: submission } = useAvailabilitySubmission(weekStart);

  const formatRange = () => {
    const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(dates[0])} — ${fmt(dates[6])}`;
  };

  let config: BannerConfig;

  if (submission?.status === 'submitted' || submission?.status === 'approved') {
    config = {
      icon: CheckCircle,
      bg: '#dcfce7',
      border: '#bbf7d0',
      text: '#16a34a',
      label: `Availability submitted for ${formatRange()}`,
    };
  } else if (submission?.status === 'late') {
    config = {
      icon: Clock,
      bg: '#ffedd5',
      border: '#fed7aa',
      text: '#c2410c',
      label: 'Awaiting supervisor approval',
    };
  } else if (!deadline.isBeforeDeadline) {
    config = {
      icon: AlertTriangle,
      bg: '#fee2e2',
      border: '#fecaca',
      text: '#dc2626',
      label: 'Availability overdue!',
    };
  } else {
    config = {
      icon: CalendarCheck,
      bg: '#fef9c3',
      border: '#fef08a',
      text: '#a16207',
      label: 'Submit your availability for next week',
    };
  }

  const Icon = config.icon;

  return (
    <button
      onClick={() => navigate('/availability')}
      className="w-full flex items-center gap-3 p-3 rounded-xl transition-opacity hover:opacity-90 text-left"
      style={{ background: config.bg, border: `1px solid ${config.border}` }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" style={{ color: config.text }} />
      <span className="text-sm font-medium flex-1" style={{ color: config.text }}>{config.label}</span>
      <span className="text-xs" style={{ color: config.text }}>→</span>
    </button>
  );
}
