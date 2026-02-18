/**
 * DASHBOARD-8 v2 — Shared Hero Banner
 *
 * Steel-slate gradient hero used by all dashboard views (except Kitchen Staff).
 * Provides consistent branding with EvidLY logo, greeting, date, and org info.
 * Children slot allows role-specific content (score panels, status cards, etc.).
 */

import { ShieldCheck } from 'lucide-react';
import { STEEL_SLATE_GRADIENT, GOLD, FONT, getGreeting, getFormattedDate } from './constants';

interface DashboardHeroProps {
  /** Main greeting text — defaults to time-based greeting */
  greeting?: string;
  /** User's first name for greeting */
  firstName?: string;
  /** Organization name */
  orgName: string;
  /** Optional subtitle line (e.g., "3 locations · California") */
  subtitle?: string;
  /** Callback when subtitle is clicked (e.g., navigate to org-hierarchy) */
  onSubtitleClick?: () => void;
  /** Optional location name (single-location views) */
  locationName?: string;
  /** Role-specific content rendered below the header info */
  children?: React.ReactNode;
}

export function DashboardHero({
  greeting,
  firstName,
  orgName,
  subtitle,
  onSubtitleClick,
  locationName,
  children,
}: DashboardHeroProps) {
  const greetingText = greeting || `${getGreeting()}${firstName ? `, ${firstName}` : ''}`;
  const dateText = getFormattedDate();

  return (
    <div
      style={{
        background: STEEL_SLATE_GRADIENT,
        ...FONT,
      }}
      className="rounded-xl px-6 py-5 text-white relative overflow-hidden"
    >
      {/* Top row: logo + org info */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(196, 154, 43, 0.15)' }}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: GOLD }} />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">{greetingText}</h2>
            <p className="text-sm text-gray-300">{dateText}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-white">{orgName}</p>
          {subtitle && (
            <p
              className={`text-xs text-gray-400 mt-0.5 ${onSubtitleClick ? 'cursor-pointer hover:text-gray-300 transition-colors' : ''}`}
              onClick={onSubtitleClick}
            >
              {subtitle}
            </p>
          )}
          {locationName && (
            <p className="text-xs text-gray-400 mt-0.5">{locationName}</p>
          )}
        </div>
      </div>

      {/* Gold accent bar */}
      <div
        className="h-[2px] rounded-full mb-4"
        style={{ background: `linear-gradient(90deg, ${GOLD}, transparent)` }}
      />

      {/* Role-specific content */}
      {children}
    </div>
  );
}
