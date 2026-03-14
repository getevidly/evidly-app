/**
 * RoadsideAssistanceCard — Shows roadside provider with tap-to-call.
 */
import { Phone, Globe, Smartphone, Shield, Hash } from 'lucide-react';
import type { RoadsideAssistance } from '../../hooks/api/useInsurance';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY } from '@shared/components/dashboard/shared/constants';

interface Props {
  data: RoadsideAssistance;
}

const COVERAGE_LABELS: Record<string, string> = {
  basic: 'Basic',
  plus: 'Plus',
  premier: 'Premier',
};

export function RoadsideAssistanceCard({ data }: Props) {
  return (
    <div className="rounded-xl p-5 border" style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${NAVY}12` }}>
            <Shield className="w-5 h-5" style={{ color: NAVY }} />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: NAVY }}>{data.providerName}</h3>
            {data.coverageType && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                {COVERAGE_LABELS[data.coverageType] || data.coverageType}
              </span>
            )}
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${data.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {data.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Big phone number */}
      <a
        href={`tel:${data.phoneNumber}`}
        className="flex items-center gap-3 p-3 rounded-lg mb-3 transition-colors hover:opacity-90"
        style={{ background: `${NAVY}08`, border: `1px solid ${CARD_BORDER}` }}
      >
        <Phone className="w-5 h-5" style={{ color: NAVY }} />
        <span className="text-lg font-bold" style={{ color: NAVY }}>{data.phoneNumber}</span>
        <span className="ml-auto text-xs font-medium px-2 py-1 rounded-lg text-white" style={{ background: NAVY }}>
          Call Now
        </span>
      </a>

      <div className="space-y-2 text-sm">
        {data.membershipNumber && (
          <div className="flex items-center gap-2">
            <Hash className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
            <span style={{ color: TEXT_TERTIARY }}>Membership:</span>
            <span className="font-medium" style={{ color: NAVY }}>{data.membershipNumber}</span>
          </div>
        )}
        {data.towingMilesIncluded && (
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
            <span style={{ color: TEXT_TERTIARY }}>Towing:</span>
            <span className="font-medium" style={{ color: NAVY }}>{data.towingMilesIncluded} miles included</span>
          </div>
        )}
        {data.website && (
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
            <a href={data.website} target="_blank" rel="noopener noreferrer" className="font-medium underline" style={{ color: NAVY }}>Website</a>
          </div>
        )}
        {data.appName && (
          <div className="flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
            <span style={{ color: TEXT_TERTIARY }}>App:</span>
            <span className="font-medium" style={{ color: NAVY }}>{data.appName}</span>
          </div>
        )}
        {data.expiryDate && (
          <p className="text-xs mt-2" style={{ color: TEXT_TERTIARY }}>Expires: {data.expiryDate}</p>
        )}
      </div>
    </div>
  );
}
