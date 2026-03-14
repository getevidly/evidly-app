/**
 * Service Request Detail — view and process a single service request.
 * Route: /service-requests/:id
 */
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox, Bot, Phone, Mail, MapPin, Building2, Calendar, Clock, FileText, Wrench, Camera, AlertTriangle, Globe } from 'lucide-react';
import { useServiceRequest } from '../../hooks/api/useServiceRequests';

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function ConditionBar({ level }: { level: string }) {
  const levels: Record<string, { width: string; color: string; label: string }> = {
    light: { width: '25%', color: 'bg-green-500', label: 'Light' },
    moderate: { width: '50%', color: 'bg-amber-500', label: 'Moderate' },
    heavy: { width: '75%', color: 'bg-orange-500', label: 'Heavy' },
    extreme: { width: '100%', color: 'bg-red-500', label: 'Extreme' },
  };
  const l = levels[level] || levels.moderate;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">Condition</span>
        <span className="text-sm font-semibold text-gray-900">{l.label}</span>
      </div>
      <div className="bg-gray-100 rounded-full h-2.5">
        <div className={`${l.color} h-2.5 rounded-full transition-all`} style={{ width: l.width }} />
      </div>
    </div>
  );
}

export function ServiceRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: request, isLoading } = useServiceRequest(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b]" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900">Request not found</h3>
        <button onClick={() => navigate('/service-requests')} className="mt-3 text-sm text-[#1e4d6b] hover:underline">Back to requests</button>
      </div>
    );
  }

  const hasAiData = request.source === 'ai_estimate' && request.ai_estimate_data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/service-requests')} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Service Request</h1>
          <p className="text-sm text-gray-500">{request.contact_name || request.business_name || 'Customer'} &middot; {new Date(request.created_at).toLocaleString()}</p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          request.status === 'new' ? 'bg-blue-50 text-blue-700' :
          request.status === 'reviewing' ? 'bg-amber-50 text-amber-700' :
          request.status === 'scheduled' ? 'bg-green-50 text-green-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Info</h2>
            <div className="space-y-1">
              <InfoRow icon={Building2} label="Business" value={request.business_name} />
              <InfoRow icon={Phone} label="Phone" value={request.contact_phone} />
              <InfoRow icon={Mail} label="Email" value={request.contact_email} />
              <InfoRow icon={MapPin} label="Address" value={[request.address, request.city, request.state, request.zip].filter(Boolean).join(', ') || null} />
            </div>
          </div>

          {/* Request Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Details</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500">Services</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(request.service_types || []).map((t: string) => (
                    <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{t}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Urgency</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}</p>
              </div>
              {request.preferred_date && (
                <div>
                  <p className="text-xs text-gray-500">Preferred Date</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{request.preferred_date}</p>
                </div>
              )}
              {request.preferred_time_window && (
                <div>
                  <p className="text-xs text-gray-500">Time Window</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{request.preferred_time_window.charAt(0).toUpperCase() + request.preferred_time_window.slice(1)}</p>
                </div>
              )}
            </div>
            {request.notes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{request.notes}</p>
              </div>
            )}
          </div>

          {/* AI Estimate Section */}
          {hasAiData && (
            <div className="bg-white rounded-xl border-2 border-purple-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-purple-900">AI Estimate</h2>
              </div>

              {/* Photos */}
              {request.ai_photos && request.ai_photos.length > 0 && (
                <div className="mb-4">
                  <div className="flex gap-2 overflow-x-auto">
                    {request.ai_photos.map((url: string, i: number) => (
                      <div key={i} className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
                        <Camera className="w-6 h-6 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment Detected */}
              {request.ai_equipment_detected && request.ai_equipment_detected.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Equipment Detected</p>
                  <ul className="space-y-1">
                    {request.ai_equipment_detected.map((eq: { count: number; size?: string; type: string; estimated_length?: string }, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <Wrench className="w-3.5 h-3.5 text-gray-400" />
                        {eq.count}x {eq.size ? `${eq.size} ` : ''}{eq.type}{eq.estimated_length ? ` (~${eq.estimated_length})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Condition */}
              {request.ai_condition_assessment && (
                <div className="mb-4">
                  <ConditionBar level={request.ai_condition_assessment} />
                </div>
              )}

              {/* Price & Time */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {request.ai_estimated_price_low && request.ai_estimated_price_high && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-600 font-medium">AI Price Estimate</p>
                    <p className="text-xl font-bold text-purple-900">${request.ai_estimated_price_low} - ${request.ai_estimated_price_high}</p>
                  </div>
                )}
                {request.ai_estimated_hours && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-600 font-medium">Estimated Time</p>
                    <p className="text-xl font-bold text-purple-900">{request.ai_estimated_hours} hours</p>
                  </div>
                )}
              </div>

              <button className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                Use AI Estimate to Create Quote
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-[#1e4d6b] text-white rounded-lg text-sm font-medium hover:bg-[#163a52]">
                Create Estimate
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                Schedule Job
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                Contact Customer
              </button>
              <button className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
                Decline
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Source</h3>
            <div className="flex items-center gap-2">
              {request.source === 'ai_estimate' && <Bot className="w-5 h-5 text-purple-600" />}
              {request.source === 'evidly' && <Globe className="w-5 h-5 text-blue-600" />}
              <span className="text-sm font-medium text-gray-900">
                {request.source === 'ai_estimate' ? 'AI Self-Estimate' : request.source.charAt(0).toUpperCase() + request.source.slice(1)}
              </span>
            </div>
            {request.referral_code && (
              <p className="text-xs text-gray-500 mt-2">Referral: <code className="text-[#1e4d6b]">{request.referral_code}</code></p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Response Time</h3>
            {request.first_response_at ? (
              <div>
                <p className="text-2xl font-bold text-gray-900">{request.response_time_minutes}m</p>
                <p className="text-xs text-gray-500">First response</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Awaiting response</span>
              </div>
            )}
          </div>

          {request.urgency === 'urgent' || request.urgency === 'emergency' ? (
            <div className="bg-red-50 rounded-xl border border-red-200 p-6">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-semibold">Urgent Request</h3>
              </div>
              <p className="text-sm text-red-600">This request requires immediate attention.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
