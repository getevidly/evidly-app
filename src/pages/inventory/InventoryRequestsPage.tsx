/**
 * InventoryRequestsPage — Request list with tabs and approval actions.
 * Route: /inventory/requests
 */
import { useState, useMemo } from 'react';
import { ClipboardList, Plus, Loader2, User, Calendar } from 'lucide-react';
import { useInventoryRequests } from '../../hooks/api/useInventory';
import type { InventoryRequest, RequestPriority, RequestStatus } from '../../hooks/api/useInventory';

const NAVY = '#163a5f';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#D1D9E6';
const CARD_SHADOW = '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)';
const TEXT_TERTIARY = '#6B7F96';

type ViewTab = 'my' | 'pending' | 'all';

const VIEW_TABS: { key: ViewTab; label: string }[] = [
  { key: 'my', label: 'My Requests' },
  { key: 'pending', label: 'Pending Approval' },
  { key: 'all', label: 'All' },
];

const PRIORITY_BADGE: Record<RequestPriority, { bg: string; text: string; label: string }> = {
  low:    { bg: '#F3F4F6', text: '#6B7280', label: 'Low' },
  normal: { bg: '#EFF6FF', text: '#2563EB', label: 'Normal' },
  high:   { bg: '#FFFBEB', text: '#D97706', label: 'High' },
  urgent: { bg: '#FEF2F2', text: '#DC2626', label: 'Urgent' },
};

const STATUS_BADGE: Record<RequestStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: '#FFFBEB', text: '#D97706', label: 'Pending' },
  approved: { bg: '#F0FFF4', text: '#059669', label: 'Approved' },
  denied:   { bg: '#FEF2F2', text: '#DC2626', label: 'Denied' },
  ordered:  { bg: '#EFF6FF', text: '#2563EB', label: 'Ordered' },
  received: { bg: '#F0FFF4', text: '#16A34A', label: 'Received' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function InventoryRequestsPage() {
  const { data: requests, isLoading } = useInventoryRequests();
  const [activeTab, setActiveTab] = useState<ViewTab>('all');

  const filtered = useMemo(() => {
    if (activeTab === 'pending') {
      return requests.filter(r => r.status === 'pending');
    }
    if (activeTab === 'my') {
      // In a real app this would filter by current user's employeeId.
      // With stubbed data we just return all.
      return requests;
    }
    return requests;
  }, [requests, activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#eef4f8', color: NAVY }}
          >
            <ClipboardList className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>
            Inventory Requests
          </h1>
        </div>
        <button
          onClick={() => alert('New Request (not yet implemented)')}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors hover:opacity-90"
          style={{ background: NAVY }}
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: CARD_BORDER }}>
        {VIEW_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{ color: activeTab === tab.key ? NAVY : TEXT_TERTIARY }}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                style={{ background: NAVY }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: NAVY }} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div
          className="rounded-xl p-10 text-center"
          style={{
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            boxShadow: CARD_SHADOW,
          }}
        >
          <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
          <p className="text-sm font-medium" style={{ color: NAVY }}>
            No inventory requests
          </p>
          <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>
            Requests will appear here when submitted.
          </p>
        </div>
      )}

      {/* Request cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map(req => (
            <RequestCard key={req.id} request={req} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({ request }: { request: InventoryRequest }) {
  const priorityBadge = PRIORITY_BADGE[request.priority];
  const statusBadge = STATUS_BADGE[request.status];

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        boxShadow: CARD_SHADOW,
      }}
    >
      {/* Top row: employee, date, badges */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
            <span className="text-sm font-semibold" style={{ color: NAVY }}>
              {request.employeeName || request.employeeId}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: TEXT_TERTIARY }}>
            <Calendar className="w-3 h-3" />
            {formatDate(request.createdAt)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: priorityBadge.bg, color: priorityBadge.text }}
          >
            {priorityBadge.label}
          </span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: statusBadge.bg, color: statusBadge.text }}
          >
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Items list */}
      {request.items.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {request.items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm px-3 py-2 rounded-lg"
              style={{ background: '#F8F9FC' }}
            >
              <span style={{ color: NAVY }}>{item.itemName}</span>
              <span className="font-medium" style={{ color: TEXT_TERTIARY }}>
                Qty: {item.quantityRequested}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {request.notes && (
        <p className="text-xs mt-3" style={{ color: TEXT_TERTIARY }}>
          {request.notes}
        </p>
      )}

      {/* Action buttons (only for pending requests) */}
      {request.status === 'pending' && (
        <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: `1px solid ${CARD_BORDER}` }}>
          <button
            onClick={() => alert('Request approved (not yet implemented)')}
            className="px-4 py-1.5 text-xs font-medium rounded-lg text-white transition-colors hover:opacity-90"
            style={{ background: '#059669' }}
          >
            Approve
          </button>
          <button
            onClick={() => alert('Request denied (not yet implemented)')}
            className="px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: CARD_BORDER, color: '#DC2626' }}
          >
            Deny
          </button>
        </div>
      )}
    </div>
  );
}
