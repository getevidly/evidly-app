/**
 * AvailabilityApprovalsPage — Supervisor view for approving late submissions.
 * Route: /availability/approvals
 */
import { useState } from 'react';
import { ClipboardCheck, Clock, CheckCircle, XCircle, Users } from 'lucide-react';
import {
  usePendingApprovals,
  useApproveAvailability,
  useRejectAvailability,
  type AvailabilitySubmission,
} from '../../hooks/api/useAvailability';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY } from '../../components/dashboard/shared/constants';

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function AvailabilityApprovalsPage() {
  const { data: pending, isLoading } = usePendingApprovals();
  const approveMutation = useApproveAvailability();
  const rejectMutation = useRejectAvailability();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const submissions = pending || [];

  const handleApprove = (id: string) => {
    alert(`Approved (save pending — Supabase table required)`);
  };

  const handleBulkApprove = () => {
    if (submissions.length === 0) return;
    alert(`Bulk approved ${submissions.length} submissions (save pending — Supabase table required)`);
  };

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) { alert('Please provide a reason'); return; }
    alert(`Rejected with reason: ${rejectReason} (save pending — Supabase table required)`);
    setRejectingId(null);
    setRejectReason('');
  };

  const formatDate = (d: string) => {
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getHowLate = (sub: AvailabilitySubmission): string => {
    if (!sub.submittedAt) return 'Not yet submitted';
    const submitted = new Date(sub.submittedAt);
    // Approximate deadline as Thursday 2 PM of prior week
    const weekMon = new Date(sub.weekStart + 'T12:00:00');
    const deadline = new Date(weekMon);
    deadline.setDate(deadline.getDate() - 4); // Thursday before
    deadline.setHours(14, 0, 0, 0);
    const diff = submitted.getTime() - deadline.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Less than 1 hour late';
    if (hours < 24) return `${hours} hours late`;
    return `${Math.floor(hours / 24)} days late`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="w-6 h-6" style={{ color: NAVY }} />
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Availability Approvals</h1>
          </div>
          <p className="text-sm" style={{ color: TEXT_TERTIARY }}>Review and approve late availability submissions.</p>
        </div>
        {submissions.length > 0 && (
          <button
            onClick={handleBulkApprove}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ background: NAVY }}
          >
            <CheckCircle className="w-4 h-4" /> Approve All ({submissions.length})
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <p className="text-xs" style={{ color: TEXT_TERTIARY }}>Pending Approvals</p>
          <p className="text-xl font-bold mt-1" style={{ color: '#c2410c' }}>{submissions.length}</p>
        </div>
        <div className="rounded-lg p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <p className="text-xs" style={{ color: TEXT_TERTIARY }}>Status</p>
          <p className="text-sm font-bold mt-1.5" style={{ color: submissions.length === 0 ? '#16a34a' : '#c2410c' }}>
            {submissions.length === 0 ? 'All Clear' : 'Action Required'}
          </p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-[#1E2D4D]/8 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#16a34a' }} />
          <p className="text-sm font-semibold" style={{ color: NAVY }}>No submissions pending approval</p>
          <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>All late submissions have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => {
            const availDays = sub.days.filter(d => d.available).length;
            return (
              <div key={sub.id} className="rounded-xl p-4 border" style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: NAVY }}>{sub.employeeName}</p>
                    <p className="text-xs" style={{ color: TEXT_TERTIARY }}>
                      Week of {formatDate(sub.weekStart)} — {getHowLate(sub)}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#ffedd5', color: '#c2410c' }}>
                    Late
                  </span>
                </div>

                {/* Availability summary */}
                <div className="flex gap-1.5 mb-3">
                  {DAY_SHORT.map((d, i) => {
                    const day = sub.days[i];
                    const isAvail = day?.available;
                    return (
                      <div
                        key={d}
                        className="flex-1 text-center py-1.5 rounded text-xs font-medium"
                        style={{
                          background: isAvail ? '#dcfce7' : '#f3f4f6',
                          color: isAvail ? '#16a34a' : '#9ca3af',
                        }}
                      >
                        {d}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs mb-3" style={{ color: TEXT_TERTIARY }}>
                  {availDays}/7 days available
                  {sub.preferredAreas ? ` — Preferred: ${sub.preferredAreas}` : ''}
                </p>

                {/* Actions */}
                {rejectingId === sub.id ? (
                  <div className="space-y-2">
                    <input
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="w-full px-3 py-2 text-sm border rounded-lg"
                      style={{ borderColor: CARD_BORDER, color: NAVY }}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border" style={{ borderColor: CARD_BORDER, color: NAVY }}>
                        Cancel
                      </button>
                      <button onClick={() => handleReject(sub.id)} className="flex-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg" style={{ background: '#dc2626' }}>
                        Confirm Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(sub.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold text-white rounded-lg"
                      style={{ background: '#16a34a' }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => setRejectingId(sub.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border"
                      style={{ borderColor: '#dc2626', color: '#dc2626' }}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
