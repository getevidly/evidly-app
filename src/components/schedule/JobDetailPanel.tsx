/**
 * JobDetailPanel — Slide-in panel showing full job details with action buttons.
 */
import { X, Calendar, Clock, MapPin, User, Wrench, FileText, ChevronRight, RotateCcw, UserPlus, Navigation, ExternalLink } from 'lucide-react';
import type { ScheduledJob, JobStatus } from '../../hooks/api/useSchedule';
import { NAVY, CARD_BG, CARD_BORDER, TEXT_TERTIARY, MUTED } from '../dashboard/shared/constants';

interface JobDetailPanelProps {
  job: ScheduledJob;
  onClose: () => void;
  onReschedule: () => void;
  onAssign: (techId: string) => void;
}

const STATUS_LABELS: Record<JobStatus, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Scheduled', color: '#3B82F6', bg: '#EFF6FF' },
  confirmed: { label: 'Confirmed', color: '#6366F1', bg: '#EEF2FF' },
  en_route: { label: 'En Route', color: '#D97706', bg: '#FFFBEB' },
  in_progress: { label: 'In Progress', color: '#EA580C', bg: '#FFF7ED' },
  completed: { label: 'Completed', color: '#16A34A', bg: '#F0FFF4' },
  cancelled: { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2' },
};

export function JobDetailPanel({ job, onClose, onReschedule, onAssign }: JobDetailPanelProps) {
  const status = STATUS_LABELS[job.status] || STATUS_LABELS.scheduled;

  return (
    <div
      className="w-80 flex-shrink-0 border-l flex flex-col ml-4 overflow-y-auto"
      style={{ background: CARD_BG, borderColor: CARD_BORDER }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: CARD_BORDER }}>
        <h3 className="text-sm font-bold" style={{ color: NAVY }}>Job Details</h3>
        <button onClick={onClose} className="p-2.5 -m-1 rounded hover:bg-gray-100" aria-label="Close">
          <X className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
        </button>
      </div>

      {/* Status badge */}
      <div className="px-4 pt-4 pb-2">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ color: status.color, background: status.bg }}
        >
          {status.label}
        </span>
        {job.priority !== 'normal' && job.priority !== 'low' && (
          <span
            className="inline-flex items-center ml-2 px-2 py-1 rounded-full text-xs font-bold"
            style={{
              color: job.priority === 'urgent' ? '#DC2626' : '#EA580C',
              background: job.priority === 'urgent' ? '#FEF2F2' : '#FFF7ED',
            }}
          >
            {job.priority.toUpperCase()}
          </span>
        )}
      </div>

      {/* Customer & Title */}
      <div className="px-4 pb-3">
        <p className="text-base font-bold" style={{ color: NAVY }}>{job.customerName}</p>
        {job.title && (
          <p className="text-xs mt-0.5" style={{ color: TEXT_TERTIARY }}>{job.title}</p>
        )}
      </div>

      {/* Info rows */}
      <div className="px-4 space-y-3 pb-4">
        <InfoRow icon={Calendar} label="Date" value={job.date} />
        <InfoRow icon={Clock} label="Time" value={`${job.startTime} – ${job.endTime} (${job.durationMinutes} min)`} />
        <InfoRow icon={MapPin} label="Location" value={job.locationName} subValue={job.locationAddress} />
        <InfoRow icon={User} label="Technician" value={job.technicianName || 'Unassigned'} />
        {job.serviceTypes.length > 0 && (
          <InfoRow icon={Wrench} label="Services" value={job.serviceTypes.join(', ')} />
        )}
        {job.notes && (
          <InfoRow icon={FileText} label="Notes" value={job.notes} />
        )}

        {/* Meeting Location */}
        {job.meetingLocation && job.meetingLocation !== job.locationAddress && (
          <div className="mt-1">
            <InfoRow icon={Navigation} label="Meeting Point" value={job.meetingLocation} subValue={job.meetingLocationNotes || undefined} />
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.meetingLocation)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-6 mt-1 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
              style={{ color: '#1E2D4D' }}
            >
              <ExternalLink className="w-3 h-3" />
              Get Directions
            </a>
          </div>
        )}
      </div>

      {/* Recurring info */}
      {job.recurringScheduleId && (
        <div className="mx-4 mb-4 px-3 py-2 rounded-lg" style={{ background: '#F8FAFC', border: `1px solid ${CARD_BORDER}` }}>
          <div className="flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
            <span className="text-xs font-semibold" style={{ color: TEXT_TERTIARY }}>Part of recurring schedule</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto px-4 py-4 border-t space-y-2" style={{ borderColor: CARD_BORDER }}>
        <button
          onClick={onReschedule}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-lg border hover:bg-gray-50 transition-colors"
          style={{ borderColor: CARD_BORDER, color: NAVY }}
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Reschedule
          </span>
          <ChevronRight className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
        </button>

        {!job.technicianId && (
          <button
            onClick={() => alert('Assign technician (demo)')}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-lg text-white transition-colors"
            style={{ background: '#1E2D4D' }}
          >
            <span className="flex items-center gap-2">
              <UserPlus className="w-3.5 h-3.5" />
              Assign Technician
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() => alert('View full job details (demo)')}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          style={{ color: TEXT_TERTIARY }}
        >
          Open Full Details
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, subValue }: {
  icon: React.ElementType; label: string; value: string; subValue?: string;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: TEXT_TERTIARY }} />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase" style={{ color: MUTED }}>{label}</p>
        <p className="text-xs font-medium" style={{ color: NAVY }}>{value}</p>
        {subValue && <p className="text-xs" style={{ color: TEXT_TERTIARY }}>{subValue}</p>}
      </div>
    </div>
  );
}
