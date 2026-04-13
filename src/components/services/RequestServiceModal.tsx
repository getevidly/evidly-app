/**
 * Request Service Modal — EvidLY client app.
 * Allows operators to request service from vendors.
 * Supports 3-slot scheduling for non-CPP vendors.
 * Wired to process-service-request edge function.
 */
import { useState } from 'react';
import { X, Send, Calendar, AlertCircle, CalendarDays } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { buildCalendarEvent, getGoogleCalendarUrl, getOutlookCalendarUrl, downloadIcsFile } from '../../lib/calendarSync';

interface RequestServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  organizationId: string;
  defaultServiceType?: string;
  vendorId?: string;
  vendorName?: string;
}

const SERVICE_TYPES = [
  { id: 'HC', label: 'Hood Cleaning', desc: 'Kitchen exhaust system cleaning' },
  { id: 'FPM', label: 'Fan & Parts', desc: 'Fan maintenance and parts replacement' },
  { id: 'GFX', label: 'Grease Trap', desc: 'Grease interceptor cleaning' },
  { id: 'FS', label: 'Fire Suppression', desc: 'Ansul system inspection' },
];

const URGENCY_OPTIONS = [
  { id: 'normal', label: 'Normal', desc: 'Within 2-4 weeks' },
  { id: 'soon', label: 'Soon', desc: 'Within 1-2 weeks' },
  { id: 'urgent', label: 'Urgent', desc: 'Within a few days' },
  { id: 'emergency', label: 'Emergency', desc: 'ASAP - fire marshal issue' },
];

export function RequestServiceModal({
  isOpen,
  onClose,
  locationId,
  organizationId,
  defaultServiceType,
  vendorId,
  vendorName,
}: RequestServiceModalProps) {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();

  const [selectedServices, setSelectedServices] = useState<string[]>(defaultServiceType ? [defaultServiceType] : []);
  const [urgency, setUrgency] = useState('normal');
  const [slot1, setSlot1] = useState('');
  const [slot2, setSlot2] = useState('');
  const [slot3, setSlot3] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmedDatetime, setConfirmedDatetime] = useState<string | null>(null);

  const toggleService = (id: string) => {
    setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (selectedServices.length === 0 || !slot1) return;
    setSubmitting(true);

    try {
      if (isDemoMode) {
        // Demo mode: mock 1s delay, show success
        await new Promise(r => setTimeout(r, 1000));
        setSubmitted(true);
        setSubmitting(false);
        return;
      }

      // Production: call edge function
      const token = (await import('../../lib/supabase')).supabase.auth.getSession();
      const session = (await token).data.session;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-service-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            organization_id: organizationId,
            location_id: locationId || null,
            vendor_id: vendorId,
            service_type: selectedServices.join(', '),
            request_type: urgency === 'emergency' ? 'emergency' : 'scheduled',
            urgency,
            notes,
            proposed_slots: [slot1, slot2, slot3].filter(Boolean),
          }),
        }
      );

      const result = await response.json();

      if (result.request_id) {
        if (result.status === 'confirmed' && result.confirmed_datetime) {
          setConfirmedDatetime(result.confirmed_datetime);
        }
        setSubmitted(true);
      } else {
        alert(result.error || 'Failed to submit request. Please try again.');
      }
    } catch {
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state on close
    setSelectedServices(defaultServiceType ? [defaultServiceType] : []);
    setUrgency('normal');
    setSlot1('');
    setSlot2('');
    setSlot3('');
    setNotes('');
    setSubmitting(false);
    setSubmitted(false);
    setConfirmedDatetime(null);
    onClose();
  };

  if (!isOpen) return null;

  // Build calendar event for confirmed requests
  const calEvent = confirmedDatetime
    ? buildCalendarEvent({
        serviceType: selectedServices.join(', '),
        vendorName: vendorName || 'Vendor',
        confirmedDatetime,
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto modal-content-enter">
        <div className="flex items-center justify-between p-6 border-b border-[#1E2D4D]/5">
          <h2 className="text-lg font-bold text-[#1E2D4D]">Request Service</h2>
          <button onClick={handleClose} className="p-2 text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70 rounded-lg hover:bg-[#1E2D4D]/5" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <Send className="w-7 h-7 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-[#1E2D4D] mb-2">
              {confirmedDatetime ? 'Service Confirmed!' : 'Request Submitted!'}
            </h3>
            <p className="text-[#1E2D4D]/50 mb-4">
              {confirmedDatetime
                ? `Your service has been confirmed for ${new Date(confirmedDatetime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`
                : 'Your service provider will review your proposed dates and respond within 14 days.'}
            </p>

            {/* Calendar add options for confirmed requests */}
            {calEvent && !isDemoMode && (
              <div className="space-y-2 mb-6 text-left">
                <p className="text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider text-center">Add to Calendar</p>
                <a
                  href={getGoogleCalendarUrl(calEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-[#1E2D4D]/10 rounded-xl hover:bg-[#FAF7F0] text-sm font-medium text-[#1E2D4D]/80"
                >
                  <CalendarDays className="h-4 w-4" />
                  Google Calendar
                </a>
                <a
                  href={getOutlookCalendarUrl(calEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-[#1E2D4D]/10 rounded-xl hover:bg-[#FAF7F0] text-sm font-medium text-[#1E2D4D]/80"
                >
                  <CalendarDays className="h-4 w-4" />
                  Outlook Calendar
                </a>
                <button
                  onClick={() => downloadIcsFile(calEvent)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#1E2D4D]/10 rounded-xl hover:bg-[#FAF7F0] text-sm font-medium text-[#1E2D4D]/80"
                >
                  <CalendarDays className="h-4 w-4" />
                  Download .ics
                </button>
              </div>
            )}

            <button onClick={handleClose} className="px-6 py-2.5 bg-[#1E2D4D] text-white rounded-lg text-sm font-medium hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] min-h-[44px]">
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Vendor context */}
            {vendorName && (
              <div className="bg-[#FAF7F0] rounded-lg p-3 flex items-center gap-2">
                <span className="text-sm text-[#1E2D4D]/70">Requesting from:</span>
                <span className="text-sm font-semibold text-[#1E2D4D]">{vendorName}</span>
              </div>
            )}

            {/* Services */}
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">Services Needed *</label>
              <div className="space-y-2">
                {SERVICE_TYPES.map(svc => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => toggleService(svc.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                      selectedServices.includes(svc.id) ? 'border-[#1E2D4D] bg-blue-50/50' : 'border-[#1E2D4D]/10 hover:border-[#1E2D4D]/15'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${selectedServices.includes(svc.id) ? 'border-[#1E2D4D] bg-[#1E2D4D]' : 'border-[#1E2D4D]/15'}`}>
                      {selectedServices.includes(svc.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div>
                      <p className="font-medium text-[#1E2D4D] text-sm">{svc.label}</p>
                      <p className="text-xs text-[#1E2D4D]/50">{svc.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">Urgency</label>
              <div className="grid grid-cols-2 gap-2">
                {URGENCY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setUrgency(opt.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      urgency === opt.id ? 'border-[#1E2D4D] bg-blue-50/50' : 'border-[#1E2D4D]/10 hover:border-[#1E2D4D]/15'
                    }`}
                  >
                    <p className="font-medium text-[#1E2D4D] text-sm">{opt.label}</p>
                    <p className="text-xs text-[#1E2D4D]/50">{opt.desc}</p>
                  </button>
                ))}
              </div>
              {urgency === 'emergency' && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>Emergency requests will be escalated immediately</span>
                </div>
              )}
            </div>

            {/* Proposed Dates (3 slots) */}
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Proposed Date & Time Slots</label>
              <p className="text-xs text-[#1E2D4D]/50 mb-2">Suggest up to 3 times that work for your schedule.</p>
              <div className="space-y-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E2D4D]/30" />
                  <input
                    type="datetime-local"
                    value={slot1}
                    onChange={e => setSlot1(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    placeholder="Slot 1 (required)"
                    className="w-full border border-[#1E2D4D]/15 rounded-xl pl-10 pr-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E2D4D]/30" />
                  <input
                    type="datetime-local"
                    value={slot2}
                    onChange={e => setSlot2(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    placeholder="Slot 2 (optional)"
                    className="w-full border border-[#1E2D4D]/15 rounded-xl pl-10 pr-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E2D4D]/30" />
                  <input
                    type="datetime-local"
                    value={slot3}
                    onChange={e => setSlot3(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    placeholder="Slot 3 (optional)"
                    className="w-full border border-[#1E2D4D]/15 rounded-xl pl-10 pr-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Additional Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full border border-[#1E2D4D]/15 rounded-xl px-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent resize-none"
                placeholder="Any special requirements or access instructions..."
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedServices.length === 0 || !slot1}
              className="w-full bg-[#1E2D4D] text-white py-3 rounded-xl font-semibold hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <><Send className="w-4 h-4" /> Submit Request</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
