/**
 * DASH-CONTENT-FIX-1 — Shared Hero Jurisdiction Summary
 *
 * Dual-Authority Jurisdiction Summary used inside DashboardHero by
 * Owner/Operator, Executive, and Compliance Manager dashboards.
 * Shows Food Safety and Facility Safety panels side-by-side with
 * per-location grades, statuses, and FireStatusBars.
 */

import { UtensilsCrossed, Flame, Shield, Info } from 'lucide-react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useDemo } from '../../../contexts/DemoContext';
import { useTooltip } from '../../../hooks/useTooltip';
import { SectionTooltip } from '../../ui/SectionTooltip';
import { FireStatusBars } from '../../shared/FireStatusBars';
import { DEMO_LOCATION_GRADE_OVERRIDES } from '../../../data/demoJurisdictions';
import { LOCATIONS_WITH_SCORES } from '../../../data/demoData';
import { JIE_LOC_MAP } from './constants';
import type { LocationScore, LocationJurisdiction } from '../../../types/jurisdiction';
import type { UserRole } from '../../../contexts/RoleContext';

interface HeroJurisdictionSummaryProps {
  jieScores: Record<string, LocationScore>;
  jurisdictions: Record<string, LocationJurisdiction>;
  navigate: (path: string) => void;
  userRole: UserRole;
}

export function HeroJurisdictionSummary({ jieScores, jurisdictions, navigate, userRole }: HeroJurisdictionSummaryProps) {
  const { t } = useTranslation();
  const { isDemoMode } = useDemo();

  // In demo mode, use hardcoded demo locations + grade overrides.
  // In live mode, derive locations from the jurisdictions record (real Supabase data).
  const locations = isDemoMode
    ? LOCATIONS_WITH_SCORES.map(loc => ({ id: JIE_LOC_MAP[loc.id] || loc.id, name: loc.name }))
    : Object.keys(jurisdictions).map(locId => ({ id: locId, name: jurisdictions[locId]?.county ? `${jurisdictions[locId].county} Location` : locId }));

  const gradeOverrides = isDemoMode ? DEMO_LOCATION_GRADE_OVERRIDES : {};

  if (locations.length === 0) {
    return (
      <div className="mt-2 rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
        <p className="text-sm text-slate-300">No locations configured.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
      {/* Food Safety */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 mb-3">
          <UtensilsCrossed size={16} style={{ color: '#e2e8f0' }} />
          <span className="text-sm font-semibold text-white">{t('cards.foodSafety')}</span>
          <SectionTooltip content={useTooltip('foodSafety', userRole)} />
          <span className="text-[10px] text-slate-200 ml-auto">
            {Object.keys(jurisdictions).length > 0 ? `${new Set(Object.values(jurisdictions).map(j => j.county)).size} County Health Depts` : ''}
          </span>
        </div>
        <div className="space-y-3">
          {locations.map(loc => {
            const score = jieScores[loc.id];
            const jur = jurisdictions[loc.id];
            const override = gradeOverrides[loc.id];
            const status = score?.foodSafety?.status || 'unknown';
            const isPassing = status === 'passing';
            const isFailing = status === 'failing';
            const statusLabel = isPassing ? t('status.compliant') : isFailing ? t('status.actionRequired') : t('status.atRisk');
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => navigate('/compliance')}
                className="w-full text-left rounded-lg p-3 transition-colors hover:bg-white/10"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white font-medium">{loc.name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    isPassing ? 'bg-green-500/20 text-green-300'
                      : isFailing ? 'bg-red-500/20 text-red-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {statusLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-200">
                    {jur?.county ? `${jur.county} County` : ''}
                  </span>
                  <span className="text-[11px] font-semibold text-white">
                    {override?.foodSafety?.gradeDisplay || score?.foodSafety?.gradeDisplay || 'Pending'}
                  </span>
                </div>
                {override?.foodSafety?.summary && (
                  <p className="text-[10px] text-slate-200 mt-1">{override.foodSafety.summary}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Facility Safety — 4 bars per location */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} style={{ color: '#e2e8f0' }} />
          <span className="text-sm font-semibold text-white">{t('cards.facilitySafety')}</span>
          <SectionTooltip content={useTooltip('facilitySafety', userRole)} />
          <span className="text-[10px] text-slate-200 ml-auto">
            {(() => {
              const firstLoc = locations[0];
              const firstJur = firstLoc ? jurisdictions[firstLoc.id] : null;
              return firstJur?.facilitySafety?.fire_jurisdiction_config?.fire_code_edition ?? '2025 CFC';
            })()}
          </span>
        </div>
        <div className="space-y-3">
          {locations.map(loc => {
            const score = jieScores[loc.id];
            const jur = jurisdictions[loc.id];
            const override = gradeOverrides[loc.id];
            const isPassing = score?.facilitySafety?.status === 'passing';
            const fireConfig = jur?.facilitySafety?.fire_jurisdiction_config;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => navigate('/facility-safety')}
                className="w-full text-left rounded-lg p-3 transition-colors hover:bg-white/10"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white font-medium">{loc.name}</span>
                  <div className="flex items-center gap-1.5">
                    {fireConfig?.federal_overlay && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 flex items-center gap-0.5">
                        <Shield size={9} />
                        {fireConfig.federal_overlay.agency}
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isPassing ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                      {isPassing ? t('status.pass') : t('status.fail')}
                    </span>
                  </div>
                </div>
                {fireConfig && (
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="text-[10px] text-slate-200 truncate">{fireConfig.fire_ahj_name}</span>
                    {fireConfig.ahj_split_notes && (
                      <span title={fireConfig.ahj_split_notes}>
                        <Info size={10} className="text-slate-400 shrink-0" />
                      </span>
                    )}
                  </div>
                )}
                {override && (
                  <FireStatusBars
                    permitStatus={override.facilitySafety.permitStatus}
                    hoodStatus={override.facilitySafety.hoodStatus}
                    extinguisherStatus={override.facilitySafety.extinguisherStatus}
                    ansulStatus={override.facilitySafety.ansulStatus}
                    compact
                    onCardClick={(key) => {
                      const routes: Record<string, string> = {
                        permit: '/equipment?category=permit',
                        extinguisher: '/equipment?category=fire_extinguisher',
                        hood: '/calendar?category=hood_cleaning',
                        ansul: '/calendar?category=fire_suppression',
                      };
                      navigate(routes[key] || '/equipment');
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
