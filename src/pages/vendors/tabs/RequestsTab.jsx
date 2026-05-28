import { useState } from 'react';
import { Send } from 'lucide-react';
import { useServiceRequests } from '../../../hooks/useServiceRequests';
import { deriveState, deriveCta } from '../../../utils/serviceRequestState';
import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { RequestRow } from '../../../components/vendors/RequestRow';
import { prp } from '../../../lib/designSystem';

/**
 * RequestsTab — Surface 4.
 * All outbound requests (document requests, quotes, renewals) with fulfillment tracking.
 */

export function RequestsTab() {
  const { requests: rawRequests, loading, error } = useServiceRequests();
  const [filter, setFilter] = useState('all');

  const requests = rawRequests.map(r => ({
    id: r.id,
    title: r.service_type || '',
    state: deriveState(r.status),
    vendorName: r.vendor_name || '',
    sentDate: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
    answerLine: null,
    viewedDate: null,
    reminders: r.reminders_count ?? 0,
    cta: deriveCta(r.status),
  }));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#1E2D4D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-white rounded-lg px-4 py-4"
        style={{ border: '1px solid #E2DDD4' }}
      >
        <p style={{ fontSize: '14px', color: '#B91C1C' }}>
          Unable to load service requests. Please try again.
        </p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div
        className="rounded-xl flex flex-col items-center text-center py-14 px-6"
        style={{ backgroundColor: '#FAF7F0', border: '2px dashed #E5E0D8' }}
      >
        <div
          className="w-[54px] h-[54px] rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: '#DBEAFE' }}
        >
          <Send className="h-[38px] w-[38px]" style={{ color: '#2563EB' }} />
        </div>

        <h3
          className="text-[22px] font-bold tracking-tight mb-3"
          style={{ color: '#1E2D4D', fontFamily: "'Montserrat', sans-serif" }}
        >
          No service requests sent yet
        </h3>

        <p
          className="text-sm mb-6"
          style={{ color: '#94A3B8', maxWidth: 520, lineHeight: 1.55 }}
        >
          Send a document or information request to any vendor — insurance
          certificate, service log, inspection report, scope clarification.
          Auto-reminders fire on the cadence you set. Stalled-thread detection
          identifies the requests that need a different contact at the vendor.
        </p>

        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-5"
          style={{ maxWidth: 720 }}
        >
          <div
            className="rounded-lg border text-left p-3.5"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8', borderTopWidth: 3, borderTopColor: prp.predict.accent }}
          >
            <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: prp.predict.accent, letterSpacing: '0.12em' }}>
              PREDICT
            </p>
            <p className="text-xs" style={{ color: '#94A3B8', lineHeight: 1.45 }}>
              Identifies stalled requests and non-responsive vendors before document gaps affect your compliance record.
            </p>
          </div>
          <div
            className="rounded-lg border text-left p-3.5"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8', borderTopWidth: 3, borderTopColor: prp.reduce.accent }}
          >
            <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: prp.reduce.accent, letterSpacing: '0.12em' }}>
              REDUCE
            </p>
            <p className="text-xs" style={{ color: '#94A3B8', lineHeight: 1.45 }}>
              Auto-reminders and escalation cadences reduce the manual follow-up burden for overdue documents.
            </p>
          </div>
          <div
            className="rounded-lg border text-left p-3.5"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8', borderTopWidth: 3, borderTopColor: prp.prove.accent }}
          >
            <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: prp.prove.accent, letterSpacing: '0.12em' }}>
              PROVE
            </p>
            <p className="text-xs" style={{ color: '#94A3B8', lineHeight: 1.45 }}>
              Every request, response, and reminder carries a timestamp. The full thread is recoverable for any inspector question.
            </p>
          </div>
        </div>

        <p className="text-xs" style={{ color: '#94A3B8' }}>
          Add vendors to your Roster to begin sending requests.
        </p>
      </div>
    );
  }

  const actionCount = requests.filter(r => r.state === 'action').length;
  const attentionCount = requests.filter(r => r.state === 'attention').length;
  const currentCount = requests.filter(r => r.state === 'current').length;
  const fulfilledCount = requests.filter(r => r.state === 'fulfilled').length;
  const cancelledCount = requests.filter(r => r.state === 'cancelled').length;

  const metricCards = [
    { label: 'Open requests', value: requests.filter(r => r.state !== 'fulfilled' && r.state !== 'cancelled').length, valueColor: 'navy' },
    { label: 'Action required', value: actionCount, valueColor: 'action' },
    { label: 'Attention', value: attentionCount, valueColor: 'attention' },
    { label: 'Fulfilled', value: fulfilledCount, valueColor: 'current' },
    { label: 'Cancelled', value: cancelledCount, valueColor: 'navy' },
  ];

  const filteredRequests = filter === 'all'
    ? requests
    : requests.filter(r => r.state === filter);

  return (
    <div>
      <AISynthesisStrip message={null} />
      <MetricsStrip cards={metricCards} />

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto">
        {['all', 'action', 'attention', 'current', 'fulfilled', 'cancelled'].map(f => {
          const count = f === 'all' ? requests.length : requests.filter(r => r.state === f).length;
          const label = f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1);
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full whitespace-nowrap transition-colors"
              style={{
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: filter === f ? '#1E2D4D' : '#FFFFFF',
                color: filter === f ? '#FAF7F0' : '#1E2D4D',
                border: filter === f ? 'none' : '1px solid #E2DDD4',
              }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Request cards */}
      <div className="flex flex-col gap-2.5">
        {filteredRequests.map(request => (
          <RequestRow key={request.id} request={request} />
        ))}
      </div>
    </div>
  );
}
