/**
 * JobFormModal — Create/edit a scheduled job with meeting location support.
 */
import { useState } from 'react';
import { X, Calendar, Clock, MapPin, User, Wrench, FileText, Save } from 'lucide-react';
import { NAVY, CARD_BG, CARD_BORDER, TEXT_TERTIARY } from '../dashboard/shared/constants';
import { MeetingLocationField } from './MeetingLocationField';
import type { ScheduledJob } from '../../hooks/api/useSchedule';

interface JobFormModalProps {
  job?: ScheduledJob | null;
  onClose: () => void;
  onSave: (data: JobFormData) => void;
}

export interface JobFormData {
  title: string;
  customerId: string;
  customerName: string;
  locationAddress: string;
  date: string;
  startTime: string;
  endTime: string;
  technicianId: string;
  serviceTypes: string[];
  notes: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  meetingLocation: string | null;
  meetingLocationNotes: string | null;
}

export function JobFormModal({ job, onClose, onSave }: JobFormModalProps) {
  const isEdit = !!job;

  const [title, setTitle] = useState(job?.title || '');
  const [customerName, setCustomerName] = useState(job?.customerName || '');
  const [locationAddress, setLocationAddress] = useState(job?.locationAddress || '');
  const [date, setDate] = useState(job?.date || '');
  const [startTime, setStartTime] = useState(job?.startTime || '');
  const [endTime, setEndTime] = useState(job?.endTime || '');
  const [notes, setNotes] = useState(job?.notes || '');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>(job?.priority || 'normal');
  const [meetingLocation, setMeetingLocation] = useState<string | null>(job?.meetingLocation || null);
  const [meetingLocationNotes, setMeetingLocationNotes] = useState<string | null>(job?.meetingLocationNotes || null);
  const [sameAsJob, setSameAsJob] = useState(!job?.meetingLocation || job?.meetingLocation === job?.locationAddress);

  function handleMeetingChange(loc: string | null, locNotes: string | null, same: boolean) {
    setMeetingLocation(loc);
    setMeetingLocationNotes(locNotes);
    setSameAsJob(same);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      title,
      customerId: job?.customerId || '',
      customerName,
      locationAddress,
      date,
      startTime,
      endTime,
      technicianId: job?.technicianId || '',
      serviceTypes: job?.serviceTypes || [],
      notes,
      priority,
      meetingLocation: sameAsJob ? null : meetingLocation,
      meetingLocationNotes,
    });
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-xl"
        style={{ background: CARD_BG }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <h2 className="text-base font-bold" style={{ color: NAVY }}>
            {isEdit ? 'Edit Job' : 'New Job'}
          </h2>
          <button onClick={onClose} className="p-2.5 -m-1 rounded hover:bg-gray-100" aria-label="Close">
            <X className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1" style={{ color: NAVY }}>
              <FileText className="w-3.5 h-3.5" /> Job Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputClass}
              style={{ borderColor: CARD_BORDER }}
              placeholder="e.g. Hood Cleaning — Main Kitchen"
            />
          </div>

          {/* Customer */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1" style={{ color: NAVY }}>
              <User className="w-3.5 h-3.5" /> Customer
            </label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className={inputClass}
              style={{ borderColor: CARD_BORDER }}
              placeholder="Customer name"
            />
          </div>

          {/* Job Location */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1" style={{ color: NAVY }}>
              <MapPin className="w-3.5 h-3.5" /> Job Location
            </label>
            <input
              type="text"
              value={locationAddress}
              onChange={e => setLocationAddress(e.target.value)}
              className={inputClass}
              style={{ borderColor: CARD_BORDER }}
              placeholder="123 Main St, Los Angeles, CA 90001"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1" style={{ color: NAVY }}>
                <Calendar className="w-3.5 h-3.5" /> Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={inputClass}
                style={{ borderColor: CARD_BORDER }}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1" style={{ color: NAVY }}>
                <Clock className="w-3.5 h-3.5" /> Start
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className={inputClass}
                style={{ borderColor: CARD_BORDER }}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1" style={{ color: NAVY }}>
                <Clock className="w-3.5 h-3.5" /> End
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className={inputClass}
                style={{ borderColor: CARD_BORDER }}
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1" style={{ color: NAVY }}>
              <Wrench className="w-3.5 h-3.5" /> Priority
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as typeof priority)}
              className={inputClass}
              style={{ borderColor: CARD_BORDER }}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Meeting Location */}
          <div className="pt-2 border-t" style={{ borderColor: CARD_BORDER }}>
            <p className="text-xs font-bold mb-2" style={{ color: NAVY }}>Meeting Location</p>
            <MeetingLocationField
              value={meetingLocation}
              notes={meetingLocationNotes}
              sameAsJob={sameAsJob}
              jobAddress={locationAddress}
              onChange={handleMeetingChange}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1" style={{ color: NAVY }}>
              <FileText className="w-3.5 h-3.5" /> Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className={inputClass}
              style={{ borderColor: CARD_BORDER }}
              placeholder="Additional job notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-semibold rounded-lg border hover:bg-gray-50 transition-colors"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-white transition-colors"
              style={{ background: '#1e4d6b' }}
            >
              <Save className="w-3.5 h-3.5" />
              {isEdit ? 'Update Job' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
