/**
 * Referral Campaigns — manage promotional campaigns.
 * Route: /referrals/campaigns
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Megaphone, Calendar, Users, Zap } from 'lucide-react';
import { useCampaigns, type ReferralCampaign } from '../../hooks/api/useReferrals';

export function CampaignsPage() {
  const navigate = useNavigate();
  const { data: campaigns, isLoading } = useCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/referrals')} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-sm text-gray-500 mt-1">Run promotional campaigns to boost referrals</p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 bg-[#1e4d6b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#163a52]">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b] mx-auto" />
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No active campaigns</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">Create a campaign to offer double rewards or other promotions to boost referrals.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c: ReferralCampaign) => {
            const isActive = c.is_active && new Date(c.ends_at) > new Date();
            const progress = c.max_referrals ? (c.current_referrals / c.max_referrals) * 100 : null;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    {c.description && <p className="text-sm text-gray-500 mt-1">{c.description}</p>}
                  </div>
                  {isActive ? (
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">Ended</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div className="text-xs">
                      <p className="text-gray-500">Period</p>
                      <p className="font-medium text-gray-900">{new Date(c.starts_at).toLocaleDateString()} - {new Date(c.ends_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <div className="text-xs">
                      <p className="text-gray-500">Multiplier</p>
                      <p className="font-medium text-gray-900">{c.referrer_reward_multiplier}x rewards</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{c.current_referrals}{c.max_referrals ? ` / ${c.max_referrals}` : ''} referrals</span>
                </div>
                {progress !== null && (
                  <div className="mt-2 bg-gray-100 rounded-full h-2">
                    <div className="bg-[#1e4d6b] h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
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
