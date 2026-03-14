/**
 * Referral Detail — view and manage a single referral.
 * Route: /referrals/:id
 */
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle2, Clock, DollarSign, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import { useReferral } from '../../hooks/api/useReferrals';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700', contacted: 'bg-blue-50 text-blue-700',
    quoted: 'bg-purple-50 text-purple-700', converted: 'bg-green-50 text-green-700',
    lost: 'bg-red-50 text-red-600', expired: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string | null }) {
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

export function ReferralDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: referral, isLoading } = useReferral(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b]" />
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900">Referral not found</h3>
        <button onClick={() => navigate('/referrals')} className="mt-3 text-sm text-[#1e4d6b] hover:underline">Back to referrals</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/referrals')} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Referral Details</h1>
          <p className="text-sm text-gray-500">{referral.referee_name} &middot; {new Date(referral.created_at).toLocaleDateString()}</p>
        </div>
        <StatusBadge status={referral.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Referee Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Referred Customer</h2>
            <div className="space-y-1">
              <InfoRow icon={Users} label="Name" value={referral.referee_name} />
              <InfoRow icon={Building2} label="Business" value={referral.referee_business_name} />
              <InfoRow icon={Mail} label="Email" value={referral.referee_email} />
              <InfoRow icon={Phone} label="Phone" value={referral.referee_phone} />
              <InfoRow icon={MapPin} label="Address" value={referral.referee_address} />
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-[#1e4d6b] text-white rounded-lg text-sm font-medium hover:bg-[#163a52]">
                Mark Contacted
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                Create Estimate
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                Create Job
              </button>
              <button className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
                Mark Lost
              </button>
            </div>
          </div>

          {/* Notes */}
          {referral.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Notes</h2>
              <p className="text-sm text-gray-700">{referral.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Referrer */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Referred By</h3>
            <p className="font-medium text-gray-900">{referral.referrer_org?.name || '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Source: {referral.source || '—'}</p>
          </div>

          {/* Rewards */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Rewards</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Referrer reward</span>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">${referral.referrer_reward_amount?.toFixed(2) || '0.00'}</p>
                  <p className="text-xs text-gray-500">{referral.referrer_reward_status}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Referee discount</span>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">${referral.referee_reward_amount?.toFixed(2) || '0.00'}</p>
                  <p className="text-xs text-gray-500">{referral.referee_reward_status}</p>
                </div>
              </div>
              {referral.referrer_reward_status === 'earned' && (
                <button className="w-full mt-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200 hover:bg-green-100">
                  <DollarSign className="w-4 h-4 inline mr-1" /> Mark Reward Paid
                </button>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3 h-3 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">{new Date(referral.created_at).toLocaleString()}</p>
                </div>
              </div>
              {referral.first_job_completed_at && (
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">First Job Completed</p>
                    <p className="text-xs text-gray-500">{new Date(referral.first_job_completed_at).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
