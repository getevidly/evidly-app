/**
 * Request Service Modal — EvidLY client app.
 * Allows restaurant owners to request service from HoodOps.
 */
import { useState } from 'react';
import { X, Send, Calendar, AlertCircle } from 'lucide-react';

interface RequestServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  organizationId: string;
  defaultServiceType?: string;
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

export function RequestServiceModal({ isOpen, onClose, locationId, organizationId, defaultServiceType }: RequestServiceModalProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>(defaultServiceType ? [defaultServiceType] : []);
  const [urgency, setUrgency] = useState('normal');
  const [preferredDate, setPreferredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleService = (id: string) => {
    setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (selectedServices.length === 0) return;
    setSubmitting(true);
    try {
      // TODO: POST to supabase edge function evidly-service-request
      await new Promise(r => setTimeout(r, 1000));
      setSubmitted(true);
    } catch {
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Request Service</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <Send className="w-7 h-7 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Request Submitted!</h3>
            <p className="text-gray-500 mb-4">Your service provider will review your request and get back to you within 24 hours.</p>
            <button onClick={onClose} className="px-6 py-2 bg-[#1e4d6b] text-white rounded-lg text-sm font-medium hover:bg-[#163a52]">
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Services */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Services Needed *</label>
              <div className="space-y-2">
                {SERVICE_TYPES.map(svc => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => toggleService(svc.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                      selectedServices.includes(svc.id) ? 'border-[#1e4d6b] bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${selectedServices.includes(svc.id) ? 'border-[#1e4d6b] bg-[#1e4d6b]' : 'border-gray-300'}`}>
                      {selectedServices.includes(svc.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{svc.label}</p>
                      <p className="text-xs text-gray-500">{svc.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
              <div className="grid grid-cols-2 gap-2">
                {URGENCY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setUrgency(opt.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      urgency === opt.id ? 'border-[#1e4d6b] bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900 text-sm">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
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

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={preferredDate}
                  onChange={e => setPreferredDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent resize-none"
                placeholder="Any special requirements or access instructions..."
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedServices.length === 0}
              className="w-full bg-[#1e4d6b] text-white py-3 rounded-xl font-semibold hover:bg-[#163a52] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <><Send className="w-4 h-4" /> Submit Request</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
