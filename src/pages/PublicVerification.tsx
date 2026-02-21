import { useParams } from 'react-router-dom';
import { Star, Crown, Diamond, CheckCircle2, Award, ExternalLink } from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';

// ── Demo verification data ──────────────────────────────────────────

interface VerificationData {
  businessName: string;
  city: string;
  state: string;
  badgeTier: 'verified' | 'excellence' | 'elite' | 'platinum';
  qualifyingPeriod: string;
  overallPercentile: number;
  foodSafetyPercentile: number;
  fireSafetyPercentile: number;
  verifiedSince: string;
}

const DEMO_VERIFICATIONS: Record<string, VerificationData> = {
  'DWN-2024-EXCL': {
    businessName: 'Downtown Kitchen',
    city: 'Fresno',
    state: 'CA',
    badgeTier: 'excellence',
    qualifyingPeriod: 'Dec 2025 — Feb 2026',
    overallPercentile: 89,
    foodSafetyPercentile: 92,
    fireSafetyPercentile: 87,
    verifiedSince: 'September 2025',
  },
  'DWN-2024-VRFD': {
    businessName: 'Downtown Kitchen',
    city: 'Fresno',
    state: 'CA',
    badgeTier: 'verified',
    qualifyingPeriod: 'Sep 2025 — Nov 2025',
    overallPercentile: 82,
    foodSafetyPercentile: 85,
    fireSafetyPercentile: 80,
    verifiedSince: 'June 2025',
  },
};

const BADGE_CONFIG = {
  verified: { label: 'EvidLY Verified', icon: EvidlyIcon, color: '#cd7f32', bg: '#fdf4e8', desc: 'Compliance score 80+ for 3 consecutive months' },
  excellence: { label: 'EvidLY Excellence', icon: Star, color: '#3D5068', bg: '#f1f5f9', desc: 'Compliance score 90+ for 3 consecutive months' },
  elite: { label: 'EvidLY Elite', icon: Crown, color: '#d4af37', bg: '#fdf8e8', desc: 'Top 10% in vertical for 3 consecutive months' },
  platinum: { label: 'EvidLY Platinum', icon: Diamond, color: '#818cf8', bg: '#eef2ff', desc: 'Top 5% overall for 6 consecutive months' },
};

function PercentileBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#22c55e' : value >= 50 ? '#d4af37' : '#ef4444';
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 text-sm text-gray-600">{label}</div>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <div className="w-14 text-right text-sm font-bold" style={{ color }}>{value}th</div>
    </div>
  );
}

export default function PublicVerification() {
  const { code } = useParams<{ code: string }>();
  const data = code ? DEMO_VERIFICATIONS[code] : null;

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-w-md w-full p-8 text-center">
          <EvidlyIcon size={48} className="mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Verification Not Found</h1>
          <p className="text-sm text-gray-500 mb-6">This verification code is invalid or has expired. Please check the URL and try again.</p>
          <a href="https://evidly.com" className="text-sm font-medium" style={{ color: '#1e4d6b' }}>
            Learn more about EvidLY &rarr;
          </a>
        </div>
      </div>
    );
  }

  const badge = BADGE_CONFIG[data.badgeTier];
  const BadgeIcon = badge.icon;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#faf8f3' }}>
      {/* Header */}
      <div className="py-6 px-4" style={{ backgroundColor: '#1e4d6b' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EvidlyIcon size={32} />
            <span className="text-xl font-bold">
              <span className="text-white">Evid</span>
              <span style={{ color: '#d4af37' }}>LY</span>
            </span>
          </div>
          <span className="text-xs text-gray-300">Compliance Simplified</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 -mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Badge hero */}
          <div className="p-8 text-center" style={{ backgroundColor: badge.bg }}>
            <BadgeIcon className="h-16 w-16 mx-auto mb-4" style={{ color: badge.color }} />
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{badge.label}</h1>
            <p className="text-sm text-gray-500">{badge.desc}</p>
          </div>

          {/* Business info */}
          <div className="p-6 border-b border-gray-100">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">{data.businessName}</h2>
              <p className="text-sm text-gray-500">{data.city}, {data.state}</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-700">Verified by EvidLY</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">Overall Percentile Rank</div>
                <div className="text-3xl font-bold" style={{ color: '#1e4d6b' }}>{data.overallPercentile}th</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">Qualifying Period</div>
                <div className="text-sm font-semibold text-gray-800 mt-1">{data.qualifyingPeriod}</div>
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-900 mb-3">Category Rankings</h3>
            <div className="space-y-3">
              <PercentileBar label="Food Safety" value={data.foodSafetyPercentile} />
              <PercentileBar label="Fire Safety" value={data.fireSafetyPercentile} />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 text-center" style={{ backgroundColor: '#faf8f3' }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <EvidlyIcon size={20} />
              <span className="text-sm font-semibold text-gray-700">Verified by EvidLY — Compliance Simplified</span>
            </div>
            <p className="text-xs text-gray-500 mb-1">Verification code: {code}</p>
            <p className="text-xs text-gray-400">Member since {data.verifiedSince}</p>

            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
              <Award className="h-6 w-6 mx-auto mb-2" style={{ color: '#1e4d6b' }} />
              <p className="text-sm font-semibold" style={{ color: '#1e4d6b' }}>Want this for your kitchen?</p>
              <p className="text-xs text-gray-600 mb-3">Join 2,340+ commercial kitchens benchmarking with EvidLY</p>
              <a
                href="https://evidly.com"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: '#1e4d6b' }}
              >
                Get Started <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Privacy notice */}
        <div className="text-center mt-4 text-xs text-gray-400 pb-8">
          <p>This page displays publicly verifiable compliance rankings only.</p>
          <p>No raw scores, specific violation data, or employee information is disclosed.</p>
        </div>
      </div>
    </div>
  );
}
