/**
 * RecurringScheduleModal — Create or edit a recurring job schedule.
 */
import { useState } from 'react';
import { X, RotateCcw, Calendar, Clock, User, MapPin } from 'lucide-react';
import type { RecurrenceFrequency, Technician } from '../../hooks/api/useSchedule';
import { useCreateRecurringSchedule } from '../../hooks/api/useSchedule';
import { NAVY, CARD_BG, CARD_BORDER, TEXT_TERTIARY } from '../dashboard/shared/constants';

interface RecurringScheduleModalProps {
  technicians: Technician[];
  onClose: () => void;
}

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function RecurringScheduleModal({ technicians, onClose }: RecurringScheduleModalProps) {
  const { mutate: create } = useCreateRecurringSchedule();

  const [customerName, setCustomerName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('quarterly');
  const [preferredDay, setPreferredDay] = useState(0); // Monday
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [techId, setTechId] = useState('');
  const [serviceTypes, setServiceTypes] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create({
      customerId: '',
      customerName,
      locationId: '',
      locationName,
      frequency,
      preferredDayOfWeek: preferredDay,
      preferredStartTime: startTime,
      preferredEndTime: endTime,
      serviceTypes: serviceTypes.split(',').map(s => s.trim()).filter(Boolean),
      technicianId: techId || null,
      startDate,
      endDate: endDate || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-xl" style={{ background: CARD_BG }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10" style={{ borderColor: CARD_BORDER, background: CARD_BG }}>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" style={{ color: '#1e4d6b' }} />
            <h2 className="text-base font-bold" style={{ color: NAVY }}>Recurring Schedule</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Customer */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              required
              placeholder="Enter customer name"
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
          </div>

          {/* Location */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: NAVY }}>
              <MapPin className="w-3.5 h-3.5" />
              Location
            </label>
            <input
              type="text"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              required
              placeholder="Enter location"
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: NAVY }}>
              <RotateCcw className="w-3.5 h-3.5" />
              Frequency
            </label>
            <div className="grid grid-cols-4 gap-2">
              {FREQUENCIES.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFrequency(f.value)}
                  className="px-2 py-2 text-xs font-semibold rounded-lg border transition-colors"
                  style={{
                    borderColor: frequency === f.value ? '#1e4d6b' : CARD_BORDER,
                    background: frequency === f.value ? '#1e4d6b' : 'white',
                    color: frequency === f.value ? 'white' : TEXT_TERTIARY,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred day */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Preferred Day</label>
            <div className="flex gap-1">
              {DAYS_OF_WEEK.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setPreferredDay(i)}
                  className="flex-1 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors"
                  style={{
                    borderColor: preferredDay === i ? '#1e4d6b' : CARD_BORDER,
                    background: preferredDay === i ? '#1e4d6b' : 'white',
                    color: preferredDay === i ? 'white' : TEXT_TERTIARY,
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: NAVY }}>
                <Clock className="w-3.5 h-3.5" />
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: CARD_BORDER, color: NAVY }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: CARD_BORDER, color: NAVY }}
              />
            </div>
          </div>

          {/* Technician */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: NAVY }}>
              <User className="w-3.5 h-3.5" />
              Assigned Technician
            </label>
            <select
              value={techId}
              onChange={e => setTechId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            >
              <option value="">Auto-assign</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Service types */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Service Types</label>
            <input
              type="text"
              value={serviceTypes}
              onChange={e => setServiceTypes(e.target.value)}
              placeholder="e.g. Hood Cleaning, Fan Hinge"
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            />
            <p className="text-[10px] mt-1" style={{ color: TEXT_TERTIARY }}>Comma-separated</p>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: NAVY }}>
                <Calendar className="w-3.5 h-3.5" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: CARD_BORDER, color: NAVY }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: CARD_BORDER, color: NAVY }}
              />
              <p className="text-[10px] mt-1" style={{ color: TEXT_TERTIARY }}>Optional — leave blank for ongoing</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border hover:bg-gray-50"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg text-white"
              style={{ background: '#1e4d6b' }}
            >
              Create Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
