/**
 * Referral Codes — manage customer referral codes.
 * Route: /referrals/codes
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Link2, QrCode, Plus, Check, Users } from 'lucide-react';
import { useReferralCodes, type ReferralCode } from '../../hooks/api/useReferrals';

export function ReferralCodesPage() {
  const navigate = useNavigate();
  const { data: codes, isLoading } = useReferralCodes();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(`https://getevidly.com/r/${code}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/referrals')} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Referral Codes</h1>
            <p className="text-sm text-gray-500 mt-1">Manage customer referral links and QR codes</p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 bg-[#1e4d6b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#163a52]">
          <Plus className="w-4 h-4" /> Generate Code
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b] mx-auto" />
        </div>
      ) : !codes || codes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No referral codes yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">Generate referral codes for your customers to share with other restaurants.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {codes.map((code: ReferralCode) => (
            <div key={code.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{code.organization?.name || 'Customer'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{code.type} code</p>
                </div>
                {code.is_active ? (
                  <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">Active</span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">Inactive</span>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-3 mb-3 flex items-center justify-between">
                <code className="text-sm font-mono font-semibold text-[#1e4d6b]">{code.code}</code>
                <button onClick={() => handleCopy(code.code, code.id)} className="p-1.5 text-gray-400 hover:text-[#1e4d6b] rounded">
                  {copiedId === code.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="font-semibold text-gray-900">{code.total_referrals}</p>
                  <p className="text-gray-500">Referred</p>
                </div>
                <div>
                  <p className="font-semibold text-green-600">{code.successful_referrals}</p>
                  <p className="text-gray-500">Converted</p>
                </div>
                <div>
                  <p className="font-semibold text-purple-600">${code.total_rewards_earned.toFixed(0)}</p>
                  <p className="text-gray-500">Earned</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <button onClick={() => handleCopy(code.code, code.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                  <Copy className="w-3 h-3" /> Copy Link
                </button>
                <button className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                  <QrCode className="w-3 h-3" /> QR Code
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
