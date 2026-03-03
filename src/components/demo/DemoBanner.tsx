import { MapPin, ArrowRight } from 'lucide-react';

const NAVY = '#1E2D4D';
const GOLD = '#d4af37';

interface Props {
  companyName: string;
  city: string;
  county: string;
  healthAuthority: string;
  fireAuthority: string;
  isAdmin: boolean;
  onConvert?: () => void;
}

/**
 * Persistent banner shown during a live demo presentation.
 * Cannot be dismissed. Shows company, location, and jurisdiction info.
 * "Convert to Live Account" button visible to admins only.
 */
export function DemoBanner({ companyName, city, county, healthAuthority, fireAuthority, isAdmin, onConvert }: Props) {
  return (
    <div
      className="sticky top-0 z-50 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-white text-sm"
      style={{ backgroundColor: NAVY }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 font-semibold">
          <span style={{ color: GOLD }}>PERSONALIZED DEMO</span>
          <span className="text-white/60">—</span>
          <span>{companyName}</span>
        </span>
        <span className="flex items-center gap-1 text-white/70 text-xs">
          <MapPin className="w-3 h-3" />
          {city}, {county} Co.
        </span>
        <span className="text-white/50 text-xs hidden sm:inline">
          Jurisdiction: {healthAuthority} + {fireAuthority}
        </span>
      </div>

      {isAdmin && onConvert && (
        <button
          onClick={onConvert}
          className="px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors hover:opacity-90"
          style={{ backgroundColor: GOLD, color: NAVY }}
        >
          Convert to Live Account
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
