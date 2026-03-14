/**
 * Referrals Dashboard — list all referrals with stats.
 * Route: /referrals
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, Clock, DollarSign, Eye, Plus, Search } from 'lucide-react';
import { useReferrals, useReferralStats, type Referral } from '../../hooks/api/useReferrals';

type TabKey = 'all' | 'pending' | 'converted' | 'lost';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'converted', label: 'Converted' },
  { key: 'lost', label: 'Lost' },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    contacted: 'bg-blue-50 text-blue-700',
    quoted: 'bg-purple-50 text-purple-700',
    converted: 'bg-green-50 text-green-700',
    lost: 'bg-red-50 text-red-600',
    expired: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RewardBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'text-gray-400',
    earned: 'text-amber-600',
    paid: 'text-green-600',
    expired: 'text-gray-400',
  };
  return <span className={`text-xs font-medium ${styles[status] || ''}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

export function ReferralsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const { data: stats } = useReferralStats();
  const { data: referrals, isLoading } = useReferrals(
    activeTab !== 'all' ? { status: activeTab } : undefined
  );

  const statCards = [
    { label: 'Total Referrals', value: stats?.totalReferrals ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Converted', value: stats?.converted ?? 0, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pending', value: stats?.pending ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Rewards Paid', value: stats ? `$${stats.rewardsPaid.toFixed(0)}` : '$0', icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
          <p className="text-sm text-gray-500 mt-1">Track customer referrals and rewards</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/referrals/codes')} className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            Referral Codes
          </button>
          <button onClick={() => navigate('/referrals/campaigns')} className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            Campaigns
          </button>
          <button className="inline-flex items-center gap-2 bg-[#1e4d6b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#163a52]">
            <Plus className="w-4 h-4" /> Add Referral
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-[#1e4d6b] text-[#1e4d6b]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b] mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Loading referrals...</p>
        </div>
      ) : !referrals || referrals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No referrals yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Share your referral program with customers to start earning rewards for both parties.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Referrer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Referee</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Reward</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r: Referral) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/referrals/${r.id}`)}>
                    <td className="px-4 py-3 text-gray-600">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.referrer_org?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{r.referee_name}</p>
                        {r.referee_business_name && <p className="text-xs text-gray-500">{r.referee_business_name}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3"><RewardBadge status={r.referrer_reward_status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 text-gray-400 hover:text-[#1e4d6b] rounded-lg hover:bg-gray-100">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
