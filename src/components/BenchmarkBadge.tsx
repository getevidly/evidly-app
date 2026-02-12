import { Shield, ShieldCheck, Download, Printer, Share2, QrCode, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import type { BadgeQualification, BadgeTier } from '../data/benchmarkData';
import { getBadgeColor, getBadgeBgGradient, getBadgeLabel, getBadgeRequirement, ALL_BADGE_TIERS, generateSocialPost } from '../lib/benchmarkBadges';
import { PERCENTILE_DATA } from '../data/benchmarkData';

interface BenchmarkBadgeProps {
  qualification: BadgeQualification;
  locationName: string;
}

function BadgeTierCard({ tier, isEarned, isCurrent, qualification, locationName }: {
  tier: BadgeTier;
  isEarned: boolean;
  isCurrent: boolean;
  qualification: BadgeQualification;
  locationName: string;
}) {
  const [showQR, setShowQR] = useState(false);
  const color = getBadgeColor(tier);
  const label = getBadgeLabel(tier);
  const requirement = getBadgeRequirement(tier);
  const percentile = PERCENTILE_DATA[qualification.locationId]?.percentile || 50;

  return (
    <div
      className="relative rounded-xl p-5 transition-all"
      style={{
        border: isEarned ? `2px solid ${color}` : '2px dashed #d1d5db',
        opacity: isEarned ? 1 : 0.6,
        backgroundColor: isEarned ? '#fefefe' : '#f9fafb',
      }}
    >
      {isCurrent && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
          CURRENT
        </div>
      )}

      {/* Badge icon */}
      <div className="flex flex-col items-center mb-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
          style={{
            background: isEarned ? getBadgeBgGradient(tier) : '#e5e7eb',
          }}
        >
          {isEarned ? (
            <ShieldCheck className="h-8 w-8 text-white" />
          ) : (
            <Lock className="h-6 w-6 text-gray-400" />
          )}
        </div>
        <h4 className="text-sm font-bold" style={{ color: isEarned ? color : '#6b7280' }}>
          {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </h4>
        <p className="text-xs text-gray-500 text-center mt-0.5">{label}</p>
      </div>

      {/* Requirement */}
      <p className="text-[11px] text-gray-400 text-center mb-3">{requirement}</p>

      {/* Earned: show details + actions */}
      {isEarned && isCurrent && (
        <>
          {qualification.qualifyingSince && (
            <p className="text-xs text-center text-gray-500 mb-3">
              Qualified since {new Date(qualification.qualifyingSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              {' '}({qualification.monthsQualified} months)
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-1.5">
            <button
              onClick={() => toast.success('Badge image downloaded')}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-gray-200 hover:bg-gray-50 text-gray-600"
            >
              <Download className="h-3 w-3" /> Download
            </button>
            <button
              onClick={() => toast.success('Certificate PDF generated')}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-gray-200 hover:bg-gray-50 text-gray-600"
            >
              <Printer className="h-3 w-3" /> Certificate
            </button>
            <button
              onClick={() => {
                const post = generateSocialPost(tier, locationName, percentile);
                navigator.clipboard.writeText(post).then(() => toast.success('Share text copied to clipboard'));
              }}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-gray-200 hover:bg-gray-50 text-gray-600"
            >
              <Share2 className="h-3 w-3" /> Share
            </button>
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-gray-200 hover:bg-gray-50 text-gray-600"
            >
              <QrCode className="h-3 w-3" /> QR
            </button>
          </div>

          {showQR && (
            <div className="flex justify-center mt-3">
              <QRCodeSVG
                value={`https://evidly-app.vercel.app/verify/${qualification.locationCode}`}
                size={100}
                level="M"
              />
            </div>
          )}
        </>
      )}

      {/* Not earned: show progress */}
      {!isEarned && tier === qualification.nextTier && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
            <span>Progress</span>
            <span>{qualification.progressToNext}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${qualification.progressToNext}%`, backgroundColor: color }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function BenchmarkBadge({ qualification, locationName }: BenchmarkBadgeProps) {
  const earnedTiers = new Set<BadgeTier>();
  if (qualification.tier) {
    // All tiers at or below current are considered earned
    const tierOrder: BadgeTier[] = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIdx = tierOrder.indexOf(qualification.tier);
    for (let i = 0; i <= currentIdx; i++) earnedTiers.add(tierOrder[i]);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <Shield className="h-5 w-5" style={{ color: '#1e4d6b' }} />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Compliance Badges</h3>
          <p className="text-xs text-gray-500">{locationName}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ALL_BADGE_TIERS.map(tier => (
          <BadgeTierCard
            key={tier}
            tier={tier}
            isEarned={earnedTiers.has(tier)}
            isCurrent={tier === qualification.tier}
            qualification={qualification}
            locationName={locationName}
          />
        ))}
      </div>
    </div>
  );
}
