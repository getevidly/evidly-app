import { useState } from 'react';
import { AISynthesisStrip } from '../../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../../components/vendors/MetricsStrip';
import { RequestRow } from '../../../components/vendors/RequestRow';

/**
 * RequestsTab — Surface 4.
 * All outbound requests (document requests, quotes, renewals) with fulfillment tracking.
 */
export function RequestsTab() {
  const [filter, setFilter] = useState('all');
  const requests = [];

  if (requests.length === 0) {
    return (
      <div className="text-center py-10">
        <p style={{ fontSize: '14px', fontWeight: 500, color: '#1E2D4D' }}>
          No requests yet
        </p>
        <p className="mt-1" style={{ fontSize: '12px', color: '#5A6478' }}>
          Document requests, quote requests, and renewal reminders will appear here once sent.
        </p>
      </div>
    );
  }

  const actionCount = requests.filter(r => r.state === 'action').length;
  const attentionCount = requests.filter(r => r.state === 'attention').length;
  const currentCount = requests.filter(r => r.state === 'current').length;
  const fulfilledCount = requests.filter(r => r.state === 'fulfilled').length;

  const metricCards = [
    { label: 'Open requests', value: requests.filter(r => r.state !== 'fulfilled').length, valueColor: 'navy' },
    { label: 'Action required', value: actionCount, valueColor: 'action' },
    { label: 'Attention', value: attentionCount, valueColor: 'attention' },
    { label: 'Fulfilled', value: fulfilledCount, valueColor: 'current' },
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
        {['all', 'action', 'attention', 'current', 'fulfilled'].map(f => {
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
