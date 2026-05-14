import { useState } from 'react';
import { useServiceRequests } from '../../../hooks/useServiceRequests';
import { deriveState, deriveCta } from '../../../utils/serviceRequestState';
import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { RequestRow } from '../../../components/vendors/RequestRow';

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
    reminders: 0,
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
        className="bg-white rounded-lg px-4 py-4"
        style={{ border: '1px solid #E2DDD4' }}
      >
        <p style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
          Send a document or information request to any vendor — insurance
          certificate, service log, inspection report, scope clarification,
          anything. The thread tracks who's responded, who's overdue, and
          which conversations have stalled long enough to warrant an
          escalation.
        </p>
        <p className="mt-3.5" style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
          Auto-reminders fire on the cadence you set. Stalled-thread
          detection surfaces the requests that need a different contact
          at the vendor. Nothing falls through.
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
