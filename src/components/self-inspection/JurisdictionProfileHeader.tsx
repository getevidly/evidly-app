// ═══════════════════════════════════════════════════════════════════
// JurisdictionProfileHeader.tsx
// Compact header showing the active jurisdiction's identity, scoring
// system, grading format, inspection frequency, and verification
// status. For dual-jurisdiction (Yosemite), shows two profiles.
// ═══════════════════════════════════════════════════════════════════

import { Shield, Calendar, BarChart3, Award, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import type { JurisdictionScoringConfig } from '../../data/selfInspectionJurisdictionMap';
import {
  getScoringMethodLabel,
  getGradingFormatLabel,
  getTierLabel,
  getTierColor,
} from '../../lib/selfInspectionScoring';

interface JurisdictionProfileHeaderProps {
  config: JurisdictionScoringConfig;
  federalOverlay?: JurisdictionScoringConfig | null;
}

function ProfileCard({ config, label }: { config: JurisdictionScoringConfig; label?: string }) {
  const tierLabel = getTierLabel(config.dataSourceTier);
  const tierColor = getTierColor(config.dataSourceTier);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
      {label && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          {label}
        </div>
      )}

      {/* Agency Name */}
      <div className="mb-3 flex items-start gap-2">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#1e4d6b]" />
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {config.agencyName}
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">
            {config.city
              ? `${config.city}, ${config.county} County`
              : `${config.county} County`}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {/* Scoring System */}
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Scoring
            </div>
            <div className="text-xs font-medium text-[var(--text-secondary)]">
              {getScoringMethodLabel(config.scoringType)}
            </div>
          </div>
        </div>

        {/* Grade Format */}
        <div className="flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Grade Format
            </div>
            <div className="text-xs font-medium text-[var(--text-secondary)]">
              {getGradingFormatLabel(config.gradingType)}
            </div>
          </div>
        </div>

        {/* Inspection Frequency */}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Frequency
            </div>
            <div className="text-xs font-medium text-[var(--text-secondary)]">
              {config.inspectionFrequency}
            </div>
          </div>
        </div>

        {/* Config Last Updated */}
        <div className="flex items-center gap-1.5">
          {config.isVerified ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
          )}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Config Updated
            </div>
            <div className="text-xs font-medium text-[var(--text-secondary)]">
              {config.configLastUpdated}
            </div>
          </div>
        </div>
      </div>

      {/* Tier Badge + Variance Notes */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tierColor}`}
        >
          Tier {config.dataSourceTier}: {tierLabel}
        </span>
        {config.varianceNotes.map((note, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
          >
            <Info className="h-3 w-3" />
            {note}
          </span>
        ))}
      </div>
    </div>
  );
}

export function JurisdictionProfileHeader({
  config,
  federalOverlay,
}: JurisdictionProfileHeaderProps) {
  if (!federalOverlay) {
    return (
      <div className="mb-4">
        <ProfileCard config={config} />
      </div>
    );
  }

  // Dual jurisdiction — show both profiles
  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200">
        <Info className="h-3.5 w-3.5" />
        Dual Jurisdiction — This location requires two separate inspection tracks
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ProfileCard config={config} label="Primary — County Health (CalCode)" />
        <ProfileCard config={federalOverlay} label="Federal Overlay — NPS (FDA Food Code 2022)" />
      </div>
    </div>
  );
}
