/**
 * DASHBOARD-8 v2 — Shared Hero Banner
 *
 * Steel-slate gradient hero used by all dashboard views (except Kitchen Staff).
 * Provides consistent branding with EvidLY logo, greeting, date, and org info.
 * Children slot allows role-specific content (score panels, status cards, etc.).
 */

import { EvidlyIcon } from '../../ui/EvidlyIcon';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDemo } from '../../../contexts/DemoContext';
import { useRole } from '../../../contexts/RoleContext';
import { STEEL_SLATE_GRADIENT, GOLD, FONT, DEMO_ROLE_NAMES } from './constants';

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
  const { t, locale } = useTranslation();
  const { profile } = useAuth();
  const { isDemoMode, firstName: demoFirstName } = useDemo();
  const { userRole } = useRole();

  // Resolve firstName: explicit prop → demo role name → auth profile → demo context
  const resolvedFirstName = firstName
    || (isDemoMode ? (DEMO_ROLE_NAMES[userRole]?.firstName || demoFirstName) : null)
    || profile?.full_name?.split(' ')[0]
    || null;
  const greetingText = greeting || `Welcome back${resolvedFirstName ? `, ${resolvedFirstName}` : ''}!`;
  const dateText = new Date().toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

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
            <EvidlyIcon size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">{greetingText}</h2>
            <p className="text-sm text-slate-200">{dateText}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-white">{orgName}</p>
          {subtitle && (
            <p
              className={`text-xs text-slate-200 mt-0.5 ${onSubtitleClick ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
              onClick={onSubtitleClick}
            >
              {subtitle}
            </p>
          )}
          {locationName && (
            <p className="text-xs text-slate-200 mt-0.5">{locationName}</p>
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
