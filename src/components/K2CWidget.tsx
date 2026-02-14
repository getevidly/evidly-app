/**
 * Kitchen to Community (K2C) Dashboard Widget
 * Shows donation impact summary with a CTA to refer and donate more
 */
import { Heart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { demoK2CDonations, demoReferralStats } from '../data/referralDemoData';

export function K2CWidget() {
  const navigate = useNavigate();
  const stats = demoReferralStats;
  const recentDonation = demoK2CDonations[0];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <Heart className="h-4 w-4 text-red-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Kitchen to Community</h3>
        </div>
        <button
          onClick={() => navigate('/referrals')}
          className="text-xs font-medium flex items-center gap-1 hover:underline cursor-pointer"
          style={{ color: '#1e4d6b' }}
        >
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div>
          <div className="text-2xl font-bold text-red-600">${stats.k2cTotalDonated}</div>
          <div className="text-xs text-gray-400">Total donated</div>
        </div>
        <div className="h-10 w-px bg-gray-100" />
        <div>
          <div className="text-2xl font-bold" style={{ color: '#1e4d6b' }}>{demoK2CDonations.length}</div>
          <div className="text-xs text-gray-400">Donations</div>
        </div>
      </div>

      {recentDonation && (
        <div className="bg-red-50 rounded-lg px-3 py-2 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-700 font-medium">Latest: {recentDonation.charityName}</span>
            <span className="text-xs text-red-600 font-bold">${recentDonation.amount}</span>
          </div>
          {recentDonation.publicMessage && (
            <p className="text-[11px] text-red-500 italic mt-0.5">"{recentDonation.publicMessage}"</p>
          )}
        </div>
      )}

      <button
        onClick={() => navigate('/referrals')}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer"
        style={{ backgroundColor: '#ef4444' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#dc2626')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ef4444')}
      >
        <Heart className="h-3 w-3" /> Refer &amp; Donate
      </button>
    </div>
  );
}
