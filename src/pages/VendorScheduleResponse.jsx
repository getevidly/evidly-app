/**
 * VendorScheduleResponse — Public page for vendors to respond to scheduling requests.
 * Route: /vendor/schedule/:token (no auth required)
 * Pattern: Same state-machine approach as VendorServiceUpdate.tsx
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader, AlertCircle, CheckCircle, CalendarDays, XCircle,
  Clock, MapPin, Wrench, Building2, ChevronRight, Send,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ── Demo token map ──────────────────────────────────────────────
const DEMO_SCHEDULE_DATA = {
  valid: true,
  request_id: 'sr-demo-1',
  vendor_name: 'ABC Fire Protection',
  service_type: 'Hood Cleaning',
  service_name: 'Hood Cleaning',
  location_name: 'Downtown Kitchen',
  organization_name: 'Demo Restaurant Group',
  urgency: 'normal',
  proposed_slots: [
    new Date(Date.now() + 7 * 86400000).toISOString(),
    new Date(Date.now() + 10 * 86400000).toISOString(),
    new Date(Date.now() + 14 * 86400000).toISOString(),
  ],
  notes: 'Quarterly hood cleaning service needed.',
  expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
};

function isDemoSession() {
  try { return sessionStorage.getItem('evidly_demo_mode') === 'true'; } catch { return false; }
}

export function VendorScheduleResponse() {
  const { token } = useParams();
  const [phase, setPhase] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Select slot
  const [selectedSlot, setSelectedSlot] = useState('');

  // Propose alternatives
  const [altSlot1, setAltSlot1] = useState('');
  const [altSlot2, setAltSlot2] = useState('');
  const [altSlot3, setAltSlot3] = useState('');
  const [altNotes, setAltNotes] = useState('');

  // Decline
  const [declineNotes, setDeclineNotes] = useState('');
  const [resultAction, setResultAction] = useState(null);

  useEffect(() => {
    if (!token) { setError('No token provided'); setPhase('error'); return; }

    // Demo mode
    if (isDemoSession() && token.startsWith('demo-')) {
      setTimeout(() => { setData(DEMO_SCHEDULE_DATA); setPhase('schedule-info'); }, 600);
      return;
    }

    // Production: validate token
    fetch(`${SUPABASE_URL}/functions/v1/vendor-schedule-response/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.valid) { setData(d); setPhase('schedule-info'); }
        else { setError(d.error || 'Invalid or expired link'); setPhase('error'); }
      })
      .catch(() => { setError('Unable to validate link. Please contact your client.'); setPhase('error'); });
  }, [token]);

  const handleSubmit = async (action) => {
    setPhase('submitting');
    const body = { token, action };

    if (action === 'select_slot') body.selected_slot = selectedSlot;
    if (action === 'propose_alternatives') {
      body.alternative_slots = [altSlot1, altSlot2, altSlot3].filter(Boolean);
      body.notes = altNotes;
    }
    if (action === 'decline') body.notes = declineNotes;

    // Demo mode
    if (isDemoSession()) {
      await new Promise(r => setTimeout(r, 800));
      setResultAction(action);
      setPhase('success');
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/vendor-schedule-response/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) { setResultAction(action); setPhase('success'); }
      else { setError(result.error || 'Something went wrong'); setPhase('error'); }
    } catch {
      setError('Failed to submit response. Please try again.');
      setPhase('error');
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // ── Loading ──
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-[#1e4d6b] animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Validating your link...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Not Valid</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-400">If you believe this is an error, please contact your client directly.</p>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (phase === 'success') {
    const successConfig = {
      select_slot: {
        icon: <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />,
        title: 'Date Confirmed!',
        message: `You've confirmed ${data?.service_name || 'the service'} at ${data?.location_name || 'the location'}. The client has been notified and a calendar event has been created.`,
      },
      propose_alternatives: {
        icon: <CalendarDays className="w-16 h-16 mx-auto mb-4" style={{ color: '#1e4d6b' }} />,
        title: 'Alternative Dates Submitted',
        message: `Your proposed dates have been sent to ${data?.organization_name || 'the client'}. They will review and respond soon.`,
      },
      decline: {
        icon: <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />,
        title: 'Request Declined',
        message: `You've declined this service request. ${data?.organization_name || 'The client'} has been notified and may follow up.`,
      },
    };
    const cfg = successConfig[resultAction] || successConfig.select_slot;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          {cfg.icon}
          <h1 className="text-xl font-bold text-gray-900 mb-3">{cfg.title}</h1>
          <p className="text-gray-600 text-sm mb-6">{cfg.message}</p>
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <EvidlyIcon size={20} />
              <span className="text-xs font-medium">Powered by EvidLY</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Submitting ──
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-[#1e4d6b] animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Submitting your response...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const urgencyBadge = {
    normal: null,
    soon: <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Soon</span>,
    urgent: <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">Urgent</span>,
    emergency: <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Emergency</span>,
  };

  // ── Main content ──
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5" style={{ backgroundColor: '#1e4d6b' }}>
            <div className="flex items-center gap-3">
              <EvidlyIcon size={36} />
              <div>
                <h1 className="text-lg font-bold text-white">Schedule Service</h1>
                <p className="text-xs text-gray-300">Respond to scheduling request from {data.organization_name}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Wrench className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#A08C5A' }} />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Service</p>
                  <p className="text-sm font-semibold text-gray-900">{data.service_name || data.service_type}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#A08C5A' }} />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Location</p>
                  <p className="text-sm font-semibold text-gray-900">{data.location_name || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#A08C5A' }} />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Client</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{data.organization_name}</p>
                    {urgencyBadge[data.urgency]}
                  </div>
                </div>
              </div>
              {data.notes && (
                <div className="flex items-start gap-3">
                  <Send className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#A08C5A' }} />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Notes</p>
                    <p className="text-sm text-gray-700">{data.notes}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              <span>This link expires {formatDate(data.expires_at)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons (schedule-info phase) */}
        {phase === 'schedule-info' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Proposed Dates</h2>
            <div className="space-y-2 mb-6">
              {data.proposed_slots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-[#1e4d6b] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDate(slot)}</p>
                    <p className="text-xs text-gray-500">{formatTime(slot)}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-base font-semibold text-gray-900 mb-3">How would you like to respond?</h2>
            <div className="space-y-3">
              <button
                onClick={() => setPhase('select-slot')}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-green-800">Select a Date</p>
                    <p className="text-xs text-green-600">Pick one of the proposed dates</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-green-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => setPhase('propose-alternatives')}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-blue-800">Propose Alternatives</p>
                    <p className="text-xs text-blue-600">Suggest different dates that work for you</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => setPhase('decline')}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-gray-500" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-700">Decline Request</p>
                    <p className="text-xs text-gray-500">Unable to provide this service</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* Select Slot Form */}
        {phase === 'select-slot' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h2 className="text-base font-semibold text-gray-900">Select a Date</h2>
            </div>
            <div className="space-y-2 mb-6">
              {data.proposed_slots.map((slot, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedSlot(slot)}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedSlot === slot
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedSlot === slot ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}>
                    {selectedSlot === slot && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDate(slot)}</p>
                    <p className="text-xs text-gray-500">{formatTime(slot)}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPhase('schedule-info')}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Back
              </button>
              <button
                onClick={() => handleSubmit('select_slot')}
                disabled={!selectedSlot}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Date
              </button>
            </div>
          </div>
        )}

        {/* Propose Alternatives Form */}
        {phase === 'propose-alternatives' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">Propose Alternative Dates</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">Suggest up to 3 dates that work for your schedule.</p>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit('propose_alternatives'); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Option 1 *</label>
                <input
                  type="datetime-local"
                  value={altSlot1}
                  onChange={(e) => setAltSlot1(e.target.value)}
                  required
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Option 2</label>
                <input
                  type="datetime-local"
                  value={altSlot2}
                  onChange={(e) => setAltSlot2(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Option 3</label>
                <input
                  type="datetime-local"
                  value={altSlot3}
                  onChange={(e) => setAltSlot3(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={altNotes}
                  onChange={(e) => setAltNotes(e.target.value)}
                  rows={3}
                  placeholder="Any scheduling constraints or notes..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b]"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPhase('schedule-info')}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!altSlot1}
                  className="flex-1 px-4 py-2.5 bg-[#1e4d6b] text-white font-semibold rounded-lg hover:bg-[#163a52] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Alternatives
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Decline Form */}
        {phase === 'decline' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="h-5 w-5 text-gray-500" />
              <h2 className="text-base font-semibold text-gray-900">Decline Request</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit('decline'); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea
                  value={declineNotes}
                  onChange={(e) => setDeclineNotes(e.target.value)}
                  rows={3}
                  placeholder="Any reason for declining..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b]"
                />
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">
                  Declining this request will notify the client. They may contact you to discuss alternatives.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPhase('schedule-info')}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Confirm Decline
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <EvidlyIcon size={18} />
            <span className="text-xs font-medium">Powered by EvidLY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
