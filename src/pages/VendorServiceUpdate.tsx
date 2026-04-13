import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';
import {
  Loader, AlertCircle, CheckCircle, CalendarDays, XCircle,
  Clock, MapPin, Wrench, Building2, ChevronRight,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import {
  validateServiceToken,
  submitServiceUpdate,
  type ServiceTokenData,
  type ServiceUpdateData,
} from '../lib/vendorServiceToken';

type Phase =
  | 'loading'
  | 'error'
  | 'service-info'
  | 'form-completed'
  | 'form-rescheduled'
  | 'form-canceled'
  | 'submitting'
  | 'success';

const RESCHEDULE_REASONS = [
  'Scheduling conflict',
  'Parts on backorder',
  'Weather conditions',
  'Staff unavailable',
  'Other',
];

const CANCEL_REASONS = [
  'No longer needed',
  'Switching vendors',
  'Budget constraints',
  'Service consolidated',
  'Other',
];

export function VendorServiceUpdate() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [tokenData, setTokenData] = useState<ServiceTokenData | null>(null);
  const [error, setError] = useState('');

  // Completed form
  const [technicianName, setTechnicianName] = useState('');
  const [completionDate, setCompletionDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [completionNotes, setCompletionNotes] = useState('');

  // Rescheduled form
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');

  // Canceled form
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

  // Success state
  const [submittedType, setSubmittedType] = useState<'completed' | 'rescheduled' | 'canceled' | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No token provided');
      setPhase('error');
      return;
    }
    validateServiceToken(token).then((data) => {
      if (data.valid) {
        setTokenData(data);
        setPhase('service-info');
      } else {
        setError(data.error || 'Invalid or expired link');
        setPhase('error');
      }
    }).catch(() => {
      setError('Unable to validate link. Please contact your client.');
      setPhase('error');
    });
  }, [token]);

  const handleSubmit = async (updateType: 'completed' | 'rescheduled' | 'canceled') => {
    if (!token) return;
    setPhase('submitting');

    const data: ServiceUpdateData = { updateType };
    if (updateType === 'completed') {
      data.technicianName = technicianName;
      data.completionDate = new Date(completionDate).toISOString();
      data.notes = completionNotes;
    } else if (updateType === 'rescheduled') {
      data.rescheduleDate = rescheduleDate;
      data.rescheduleReason = rescheduleReason;
      data.notes = rescheduleNotes;
    } else {
      data.cancelReason = cancelReason;
      data.notes = cancelNotes;
    }

    const result = await submitServiceUpdate(token, data);
    if (result.success) {
      setSubmittedType(updateType);
      setPhase('success');
    } else {
      setError(result.error || 'Something went wrong');
      setPhase('error');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
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
          <p className="text-sm text-gray-400">
            If you believe this is an error, please contact your client directly.
          </p>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (phase === 'success' && submittedType) {
    const successConfig = {
      completed: {
        icon: <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />,
        title: 'Service Marked Complete',
        message: `Thank you! Your service completion for ${tokenData?.serviceName} at ${tokenData?.locationName} has been recorded. The client will be notified.`,
        color: 'text-green-600',
      },
      rescheduled: {
        icon: <CalendarDays className="w-16 h-16 mx-auto mb-4" style={{ color: '#1e4d6b' }} />,
        title: 'Service Rescheduled',
        message: `Your ${tokenData?.serviceName} at ${tokenData?.locationName} has been rescheduled to ${rescheduleDate ? formatDate(rescheduleDate) : 'the new date'}. The client will be notified.`,
        color: 'text-[#1e4d6b]',
      },
      canceled: {
        icon: <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />,
        title: 'Service Canceled',
        message: `Your ${tokenData?.serviceName} at ${tokenData?.locationName} has been canceled. The client will be notified and may follow up.`,
        color: 'text-gray-600',
      },
    };
    const cfg = successConfig[submittedType];

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          {cfg.icon}
          <h1 className={`text-xl font-bold mb-3 ${cfg.color}`}>{cfg.title}</h1>
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
          <p className="text-sm text-gray-500">Submitting your update...</p>
        </div>
      </div>
    );
  }

  if (!tokenData) return null;

  // ── Service Info + Forms ──
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5" style={{ backgroundColor: '#1e4d6b' }}>
            <div className="flex items-center gap-3">
              <EvidlyIcon size={36} />
              <div>
                <h1 className="text-lg font-bold text-white">Service Update</h1>
                <p className="text-xs text-gray-300">Update your service status for {tokenData.organizationName}</p>
              </div>
            </div>
          </div>

          {/* Service details card */}
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Wrench className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#A08C5A' }} />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Service</p>
                  <p className="text-sm font-semibold text-gray-900">{tokenData.serviceName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#A08C5A' }} />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Location</p>
                  <p className="text-sm font-semibold text-gray-900">{tokenData.locationName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDays className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#A08C5A' }} />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Due Date</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(tokenData.dueDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#A08C5A' }} />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Client</p>
                  <p className="text-sm font-semibold text-gray-900">{tokenData.organizationName}</p>
                </div>
              </div>
            </div>

            {/* Link expiration notice */}
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              <span>This link expires {formatDate(tokenData.expiresAt)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons (service-info phase) */}
        {phase === 'service-info' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Update Service Status</h2>
            <div className="space-y-3">
              <button
                onClick={() => setPhase('form-completed')}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-green-800">Mark Completed</p>
                    <p className="text-xs text-green-600">Service was performed successfully</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-green-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => setPhase('form-rescheduled')}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-blue-800">Reschedule</p>
                    <p className="text-xs text-blue-600">Need to change the service date</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => setPhase('form-canceled')}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-gray-500" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-700">Cancel Service</p>
                    <p className="text-xs text-gray-500">Service will not be performed</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* ── Completed Form ── */}
        {phase === 'form-completed' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h2 className="text-base font-semibold text-gray-900">Service Completion Details</h2>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSubmit('completed'); }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Technician Name *</label>
                <input
                  type="text"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  required
                  placeholder="e.g., John Smith"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Date & Time *</label>
                <input
                  type="datetime-local"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                  <AIAssistButton
                    fieldLabel="Notes"
                    context={{ vendorName: tokenData?.organizationName || '', serviceName: tokenData?.serviceName || '' }}
                    currentValue={completionNotes}
                    onGenerated={(text) => { setCompletionNotes(text); setAiFields(prev => new Set(prev).add('completionNotes')); }}
                  />
                </div>
                <textarea
                  value={completionNotes}
                  onChange={(e) => { setCompletionNotes(e.target.value); setAiFields(prev => { const s = new Set(prev); s.delete('completionNotes'); return s; }); }}
                  rows={3}
                  placeholder="Any observations or notes about the service performed..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b]"
                />
                {aiFields.has('completionNotes') && <AIGeneratedIndicator />}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPhase('service-info')}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!technicianName}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Completion
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Rescheduled Form ── */}
        {phase === 'form-rescheduled' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">Reschedule Service</h2>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSubmit('rescheduled'); }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Service Date *</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rescheduling *</label>
                <select
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b] bg-white"
                >
                  <option value="">Select reason...</option>
                  {RESCHEDULE_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Additional Notes (optional)</label>
                  <AIAssistButton
                    fieldLabel="Additional Notes"
                    context={{ vendorName: tokenData?.organizationName || '' }}
                    currentValue={rescheduleNotes}
                    onGenerated={(text) => { setRescheduleNotes(text); setAiFields(prev => new Set(prev).add('rescheduleNotes')); }}
                  />
                </div>
                <textarea
                  value={rescheduleNotes}
                  onChange={(e) => { setRescheduleNotes(e.target.value); setAiFields(prev => { const s = new Set(prev); s.delete('rescheduleNotes'); return s; }); }}
                  rows={3}
                  placeholder="Any details about the schedule change..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b]"
                />
                {aiFields.has('rescheduleNotes') && <AIGeneratedIndicator />}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPhase('service-info')}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!rescheduleDate || !rescheduleReason}
                  className="flex-1 px-4 py-2.5 bg-[#1e4d6b] text-white font-semibold rounded-lg hover:bg-[#163a52] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Canceled Form ── */}
        {phase === 'form-canceled' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="h-5 w-5 text-gray-500" />
              <h2 className="text-base font-semibold text-gray-900">Cancel Service</h2>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSubmit('canceled'); }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Cancellation *</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b] bg-white"
                >
                  <option value="">Select reason...</option>
                  {CANCEL_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Additional Notes (optional)</label>
                  <AIAssistButton
                    fieldLabel="Additional Notes"
                    context={{ vendorName: tokenData?.organizationName || '' }}
                    currentValue={cancelNotes}
                    onGenerated={(text) => { setCancelNotes(text); setAiFields(prev => new Set(prev).add('cancelNotes')); }}
                  />
                </div>
                <textarea
                  value={cancelNotes}
                  onChange={(e) => { setCancelNotes(e.target.value); setAiFields(prev => { const s = new Set(prev); s.delete('cancelNotes'); return s; }); }}
                  rows={3}
                  placeholder="Any details about the cancellation..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b]"
                />
                {aiFields.has('cancelNotes') && <AIGeneratedIndicator />}
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">
                  Canceling this service will notify the client. They may contact you to discuss alternatives.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPhase('service-info')}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!cancelReason}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Cancellation
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
