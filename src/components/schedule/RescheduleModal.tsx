/**
 * RescheduleModal — Change date, time, or technician for a job.
 */
import { useState } from 'react';
import { X, Calendar, Clock, User } from 'lucide-react';
import type { ScheduledJob, Technician } from '../../hooks/api/useSchedule';
import { NAVY, CARD_BG, CARD_BORDER, TEXT_TERTIARY, MUTED } from '../dashboard/shared/constants';

interface RescheduleModalProps {
  job: ScheduledJob;
  technicians: Technician[];
  onClose: () => void;
  onSave: (data: { jobId: string; date: string; startTime: string; endTime: string; technicianId?: string }) => void;
}

export function RescheduleModal({ job, technicians, onClose, onSave }: RescheduleModalProps) {
  const [date, setDate] = useState(job.date);
  const [startTime, setStartTime] = useState(job.startTime);
  const [endTime, setEndTime] = useState(job.endTime);
  const [techId, setTechId] = useState(job.technicianId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      jobId: job.id,
      date,
      startTime,
      endTime,
      technicianId: techId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-xl shadow-xl"
        style={{ background: CARD_BG }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <h2 className="text-base font-bold" style={{ color: NAVY }}>Reschedule Job</h2>
          <button onClick={onClose} className="p-2.5 -m-1 rounded hover:bg-[#1E2D4D]/5" aria-label="Close">
            <X className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>

        {/* Job summary */}
        <div className="px-5 py-3 border-b" style={{ borderColor: CARD_BORDER, background: '#F8FAFC' }}>
          <p className="text-sm font-semibold" style={{ color: NAVY }}>{job.customerName}</p>
          <p className="text-xs" style={{ color: TEXT_TERTIARY }}>{job.locationName}</p>
          {job.serviceTypes.length > 0 && (
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>{job.serviceTypes.join(', ')}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Date */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: NAVY }}>
              <Calendar className="w-3.5 h-3.5" />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-xl border"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: NAVY }}>
                <Clock className="w-3.5 h-3.5" />
                Start
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-xl border"
                style={{ borderColor: CARD_BORDER, color: NAVY }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>
                End
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-xl border"
                style={{ borderColor: CARD_BORDER, color: NAVY }}
              />
            </div>
          </div>

          {/* Technician */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: NAVY }}>
              <User className="w-3.5 h-3.5" />
              Technician
            </label>
            <select
              value={techId}
              onChange={e => setTechId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            >
              <option value="">Unassigned</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border hover:bg-[#FAF7F0]"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg text-white"
              style={{ background: '#1E2D4D' }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
