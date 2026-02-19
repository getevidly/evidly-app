/**
 * DASH-CONTENT-FIX-1 — Shared Hero Jurisdiction Summary
 *
 * Dual-Authority Jurisdiction Summary used inside DashboardHero by
 * Owner/Operator, Executive, and Compliance Manager dashboards.
 * Shows Food Safety and Fire Safety panels side-by-side with
 * per-location grades, statuses, and FireStatusBars.
 */

import { UtensilsCrossed, Flame } from 'lucide-react';
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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
      {/* Food Safety */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 mb-3">
          <UtensilsCrossed size={16} style={{ color: '#e2e8f0' }} />
          <span className="text-sm font-semibold text-white">Food Safety</span>
          <SectionTooltip content={useTooltip('overallScore', userRole)} />
          <span className="text-[10px] text-slate-200 ml-auto">
            {Object.keys(jurisdictions).length > 0 ? `${new Set(Object.values(jurisdictions).map(j => j.county)).size} County Health Depts` : ''}
          </span>
        </div>
        <div className="space-y-3">
          {LOCATIONS_WITH_SCORES.map(loc => {
            const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
            const score = jieScores[jieLocId];
            const jur = jurisdictions[jieLocId];
            const override = DEMO_LOCATION_GRADE_OVERRIDES[jieLocId];
            const status = score?.foodSafety?.status || 'unknown';
            const isPassing = status === 'passing';
            const isFailing = status === 'failing';
            const statusLabel = isPassing ? 'Compliant' : isFailing ? 'Action Required' : 'At Risk';
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

      {/* Fire Safety — 4 bars per location */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} style={{ color: '#e2e8f0' }} />
          <span className="text-sm font-semibold text-white">Fire Safety</span>
          <SectionTooltip content={useTooltip('fireSafety', userRole)} />
          <span className="text-[10px] text-slate-200 ml-auto">NFPA 96 (2024)</span>
        </div>
        <div className="space-y-3">
          {LOCATIONS_WITH_SCORES.map(loc => {
            const jieLocId = JIE_LOC_MAP[loc.id] || loc.id;
            const score = jieScores[jieLocId];
            const override = DEMO_LOCATION_GRADE_OVERRIDES[jieLocId];
            const isPassing = score?.fireSafety?.status === 'passing';
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => navigate('/fire-safety')}
                className="w-full text-left rounded-lg p-3 transition-colors hover:bg-white/10"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white font-medium">{loc.name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isPassing ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {isPassing ? 'Pass' : 'Fail'}
                  </span>
                </div>
                {override && (
                  <FireStatusBars
                    permitStatus={override.fireSafety.permitStatus}
                    hoodStatus={override.fireSafety.hoodStatus}
                    extinguisherStatus={override.fireSafety.extinguisherStatus}
                    ansulStatus={override.fireSafety.ansulStatus}
                    compact
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
