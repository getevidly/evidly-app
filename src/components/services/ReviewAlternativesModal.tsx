/**
 * ReviewAlternativesModal — Operator reviews vendor's proposed alternative dates.
 * Shows vendor's 3 counter-proposals. Operator can accept one or decline all.
 */
import { useState } from 'react';
import { X, CalendarDays, CheckCircle, XCircle } from 'lucide-react';
import type { ServiceRequest } from '../../types/serviceRequest';
import { buildCalendarEvent, getGoogleCalendarUrl, getOutlookCalendarUrl, downloadIcsFile } from '../../lib/calendarSync';

interface ReviewAlternativesModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ServiceRequest;
  onAccept: (requestId: string, selectedSlot: string) => Promise<void>;
  onDecline: (requestId: string) => Promise<void>;
}

export function ReviewAlternativesModal({
  isOpen,
  onClose,
  request,
  onAccept,
  onDecline,
}: ReviewAlternativesModalProps) {
  const [selectedSlot, setSelectedSlot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedDatetime, setConfirmedDatetime] = useState('');

  if (!isOpen) return null;

  const altSlots = [
    request.vendor_alt_slot_1,
    request.vendor_alt_slot_2,
    request.vendor_alt_slot_3,
  ].filter(Boolean) as string[];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleAccept = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    await onAccept(request.id, selectedSlot);
    setConfirmedDatetime(selectedSlot);
    setConfirmed(true);
    setSubmitting(false);
  };

  const handleDecline = async () => {
    setSubmitting(true);
    await onDecline(request.id);
    setSubmitting(false);
    onClose();
  };

  // After accepting — show calendar add options
  if (confirmed && confirmedDatetime) {
    const calEvent = buildCalendarEvent({
      serviceType: request.service_type,
      vendorName: request.vendor_name || 'Vendor',
      confirmedDatetime,
      locationName: request.location_name,
    });

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#1E2D4D] mb-2">Date Confirmed!</h3>
          <p className="text-sm text-[#1E2D4D]/70 mb-6">
            {request.service_type} with {request.vendor_name} confirmed for {formatDate(confirmedDatetime)} at {formatTime(confirmedDatetime)}.
          </p>

          <div className="space-y-2 mb-6">
            <p className="text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider">Add to Calendar</p>
            <div className="flex flex-col gap-2">
              <a
                href={getGoogleCalendarUrl(calEvent)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#1E2D4D]/10 rounded-lg hover:bg-gray-50 text-sm font-medium text-[#1E2D4D]/80"
              >
                <CalendarDays className="h-4 w-4" />
                Google Calendar
              </a>
              <a
                href={getOutlookCalendarUrl(calEvent)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#1E2D4D]/10 rounded-lg hover:bg-gray-50 text-sm font-medium text-[#1E2D4D]/80"
              >
                <CalendarDays className="h-4 w-4" />
                Outlook Calendar
              </a>
              <button
                onClick={() => downloadIcsFile(calEvent)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#1E2D4D]/10 rounded-lg hover:bg-gray-50 text-sm font-medium text-[#1E2D4D]/80"
              >
                <CalendarDays className="h-4 w-4" />
                Download .ics (Apple Calendar)
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#1E2D4D] text-white rounded-lg text-sm font-medium hover:bg-[#162340]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#1E2D4D]">Review Alternative Dates</h2>
          <button onClick={onClose} className="p-2 text-[#1E2D4D]/30 hover:text-gray-600 rounded-lg hover:bg-gray-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Context */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>{request.vendor_name}</strong> wasn't available for your proposed dates and has suggested the following alternatives for <strong>{request.service_type}</strong>.
            </p>
            {request.vendor_response_notes && (
              <p className="text-sm text-blue-700 mt-2 italic">"{request.vendor_response_notes}"</p>
            )}
          </div>

          {/* Vendor's proposed slots */}
          <div>
            <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">Vendor's Proposed Dates</label>
            <div className="space-y-2">
              {altSlots.map((slot, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedSlot === slot
                      ? 'border-[#1E2D4D] bg-blue-50/50'
                      : 'border-[#1E2D4D]/10 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedSlot === slot ? 'border-[#1E2D4D] bg-[#1E2D4D]' : 'border-[#1E2D4D]/15'
                  }`}>
                    {selectedSlot === slot && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{formatDate(slot)}</p>
                    <p className="text-xs text-[#1E2D4D]/50">{formatTime(slot)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleDecline}
              disabled={submitting}
              className="flex items-center justify-center gap-2 flex-1 px-4 py-2.5 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Decline All
            </button>
            <button
              onClick={handleAccept}
              disabled={!selectedSlot || submitting}
              className="flex items-center justify-center gap-2 flex-1 px-4 py-2.5 bg-[#1E2D4D] text-white font-semibold rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Accept Date
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
