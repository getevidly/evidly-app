import { Download, Printer, Share2, QrCode, Lock } from 'lucide-react';
import { EvidlyIcon } from './ui/EvidlyIcon';
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
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>
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
            <EvidlyIcon size={32} />
          ) : (
            <Lock className="h-6 w-6 text-[#1E2D4D]/30" />
          )}
        </div>
        <h4 className="text-sm font-bold" style={{ color: isEarned ? color : '#6b7280' }}>
          {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </h4>
        <p className="text-xs text-[#1E2D4D]/50 text-center mt-0.5">{label}</p>
      </div>

      {/* Requirement */}
      <p className="text-xs text-[#1E2D4D]/30 text-center mb-3">{requirement}</p>

      {/* Earned: show details + actions */}
      {isEarned && isCurrent && (
        <>
          {qualification.qualifyingSince && (
            <p className="text-xs text-center text-[#1E2D4D]/50 mb-3">
              Qualified since {new Date(qualification.qualifyingSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              {' '}({qualification.monthsQualified} months)
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-1.5">
            <button
              onClick={() => toast.success('Badge image downloaded')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-[#1E2D4D]/10 hover:bg-gray-50 text-[#1E2D4D]/70"
            >
              <Download className="h-3 w-3" /> Download
            </button>
            <button
              onClick={() => toast.success('Certificate PDF generated')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-[#1E2D4D]/10 hover:bg-gray-50 text-[#1E2D4D]/70"
            >
              <Printer className="h-3 w-3" /> Certificate
            </button>
            <button
              onClick={() => {
                const post = generateSocialPost(tier, locationName, percentile);
                navigator.clipboard.writeText(post).then(() => toast.success('Share text copied to clipboard'));
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-[#1E2D4D]/10 hover:bg-gray-50 text-[#1E2D4D]/70"
            >
              <Share2 className="h-3 w-3" /> Share
            </button>
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-[#1E2D4D]/10 hover:bg-gray-50 text-[#1E2D4D]/70"
            >
              <QrCode className="h-3 w-3" /> QR
            </button>
          </div>

          {showQR && (
            <div className="flex justify-center mt-3">
              <QRCodeSVG
                value={`https://app.getevidly.com/verify/${qualification.locationCode}`}
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
          <div className="flex items-center justify-between text-xs text-[#1E2D4D]/50 mb-1">
            <span>Progress</span>
            <span>{qualification.progressToNext}%</span>
          </div>
          <div className="h-1.5 bg-[#1E2D4D]/8 rounded-full overflow-hidden">
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
    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-5">
        <EvidlyIcon size={20} />
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">Compliance Badges</h3>
          <p className="text-xs text-[#1E2D4D]/50">{locationName}</p>
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
