/**
 * JurisdictionResult — Renders a food safety result EXACTLY as the jurisdiction produces it.
 *
 * Absolute rule: No EvidLY-generated score. Display the jurisdiction's own format.
 *
 * Five display modes:
 *   letter_grade        → "A" / "B" / "C"  (LA, San Diego, San Bernardino)
 *   letter_grade_strict → "B — FAIL"        (Riverside: only A passes)
 *   numeric             → "87 / 100"        (Fresno, Alameda)
 *   color_placard       → Green / Yellow / Red  (Sacramento, Santa Clara)
 *   three_tier_rating   → Good / Satisfactory / Unsatisfactory  (Merced)
 *   violation_report    → "No Open Majors" or "2 Open Majors"   (Stanislaus)
 */

import type { JurisdictionScoringType } from '../../data/demoData';

interface JurisdictionResultProps {
  scoringType: JurisdictionScoringType;
  gradeDisplay: string;
  status: 'passing' | 'at_risk' | 'failing' | 'unknown';
  detail?: string | null;
  /** Compact mode for inline use (dashboard pills) */
  compact?: boolean;
}

// Color palette keyed by status
const STATUS_COLORS = {
  passing: { text: '#166534', bg: '#DCFCE7', border: '#BBF7D0' },
  at_risk: { text: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
  failing: { text: '#991B1B', bg: '#FEE2E2', border: '#FECACA' },
  unknown: { text: '#64748B', bg: '#F1F5F9', border: '#E2E8F0' },
} as const;

// Color placard specific colors
const PLACARD_COLORS: Record<string, { text: string; bg: string; dot: string }> = {
  green:  { text: '#166534', bg: '#DCFCE7', dot: '#16A34A' },
  yellow: { text: '#92400E', bg: '#FEF3C7', dot: '#D97706' },
  red:    { text: '#991B1B', bg: '#FEE2E2', dot: '#DC2626' },
};

// Three-tier rating colors
const TIER_COLORS: Record<string, { text: string; bg: string }> = {
  good:           { text: '#166534', bg: '#DCFCE7' },
  satisfactory:   { text: '#92400E', bg: '#FEF3C7' },
  unsatisfactory: { text: '#991B1B', bg: '#FEE2E2' },
};

function getLetterColor(grade: string) {
  const g = grade.toUpperCase().charAt(0);
  if (g === 'A') return STATUS_COLORS.passing;
  if (g === 'B') return STATUS_COLORS.at_risk;
  return STATUS_COLORS.failing;
}

function getPlacardColor(display: string) {
  const lower = display.toLowerCase();
  if (lower.includes('green')) return PLACARD_COLORS.green;
  if (lower.includes('yellow')) return PLACARD_COLORS.yellow;
  if (lower.includes('red')) return PLACARD_COLORS.red;
  return { text: '#64748B', bg: '#F1F5F9', dot: '#94A3B8' };
}

function getTierColor(display: string) {
  const lower = display.toLowerCase();
  if (lower.includes('good')) return TIER_COLORS.good;
  if (lower.includes('satisfactory') && !lower.includes('un')) return TIER_COLORS.satisfactory;
  if (lower.includes('unsatisfactory')) return TIER_COLORS.unsatisfactory;
  return { text: '#64748B', bg: '#F1F5F9' };
}

export function JurisdictionResult({
  scoringType,
  gradeDisplay,
  status,
  detail,
  compact = false,
}: JurisdictionResultProps) {
  // ── Compact mode (inline pill for dashboard) ──
  if (compact) {
    return <CompactResult scoringType={scoringType} gradeDisplay={gradeDisplay} status={status} />;
  }

  // ── Full display mode ──
  switch (scoringType) {
    case 'letter_grade':
      return <LetterGradeResult grade={gradeDisplay} status={status} detail={detail} />;
    case 'letter_grade_strict':
      return <LetterGradeStrictResult grade={gradeDisplay} status={status} detail={detail} />;
    case 'numeric':
      return <NumericResult display={gradeDisplay} status={status} detail={detail} />;
    case 'color_placard':
      return <ColorPlacardResult display={gradeDisplay} status={status} detail={detail} />;
    case 'three_tier_rating':
      return <ThreeTierResult display={gradeDisplay} status={status} detail={detail} />;
    case 'violation_report':
      return <ViolationReportResult display={gradeDisplay} status={status} detail={detail} />;
    default:
      return <FallbackResult display={gradeDisplay} status={status} />;
  }
}

// ── Compact pill (used in LocationStandingList) ──
function CompactResult({
  scoringType,
  gradeDisplay,
  status,
}: {
  scoringType: JurisdictionScoringType;
  gradeDisplay: string;
  status: string;
}) {
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.unknown;

  // Color placard gets a colored dot
  if (scoringType === 'color_placard') {
    const placard = getPlacardColor(gradeDisplay);
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: placard.bg, color: placard.text }}
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: placard.dot }} />
        {gradeDisplay}
      </span>
    );
  }

  // Letter grade gets prominent letter
  if (scoringType === 'letter_grade' || scoringType === 'letter_grade_strict') {
    const lc = getLetterColor(gradeDisplay);
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
        style={{ backgroundColor: lc.bg, color: lc.text, border: `1px solid ${lc.border}` }}
      >
        {gradeDisplay}
      </span>
    );
  }

  // Three-tier gets tier color
  if (scoringType === 'three_tier_rating') {
    const tc = getTierColor(gradeDisplay);
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: tc.bg, color: tc.text }}
      >
        {gradeDisplay}
      </span>
    );
  }

  // Default: status-colored pill
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {gradeDisplay}
    </span>
  );
}

// ── Letter Grade (A/B/C) ──
function LetterGradeResult({
  grade,
  status,
  detail,
}: {
  grade: string;
  status: string;
  detail?: string | null;
}) {
  const colors = getLetterColor(grade);
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
        style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
      >
        {grade.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold" style={{ color: colors.text }}>
          Grade {grade}
        </div>
        {detail && <div className="text-xs text-[#1E2D4D]/50 truncate">{detail}</div>}
      </div>
    </div>
  );
}

// ── Letter Grade Strict (only A passes) ──
function LetterGradeStrictResult({
  grade,
  status,
  detail,
}: {
  grade: string;
  status: string;
  detail?: string | null;
}) {
  const isPassing = grade.toUpperCase().startsWith('A');
  const colors = isPassing ? STATUS_COLORS.passing : STATUS_COLORS.failing;
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
        style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
      >
        {grade.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold" style={{ color: colors.text }}>
          {isPassing ? `Grade ${grade} — PASS` : `Grade ${grade} — FAIL`}
        </div>
        {!isPassing && (
          <div className="text-xs" style={{ color: STATUS_COLORS.failing.text }}>
            Only Grade A (90+) passes
          </div>
        )}
        {detail && <div className="text-xs text-[#1E2D4D]/50 truncate">{detail}</div>}
      </div>
    </div>
  );
}

// ── Numeric Score (87/100) ──
function NumericResult({
  display,
  status,
  detail,
}: {
  display: string;
  status: string;
  detail?: string | null;
}) {
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.unknown;
  return (
    <div className="flex items-center gap-3">
      <div
        className="px-3 py-1.5 rounded-lg text-base font-bold tabular-nums"
        style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
      >
        {display}
      </div>
      {detail && <div className="text-xs text-[#1E2D4D]/50 truncate">{detail}</div>}
    </div>
  );
}

// ── Color Placard (Green/Yellow/Red) ──
function ColorPlacardResult({
  display,
  status,
  detail,
}: {
  display: string;
  status: string;
  detail?: string | null;
}) {
  const placard = getPlacardColor(display);
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{ backgroundColor: placard.bg, color: placard.text }}
      >
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: placard.dot }} />
        <span className="text-sm font-bold">{display}</span>
      </div>
      {detail && <div className="text-xs text-[#1E2D4D]/50 truncate">{detail}</div>}
    </div>
  );
}

// ── Three-Tier Rating (Good / Satisfactory / Unsatisfactory) ──
function ThreeTierResult({
  display,
  status,
  detail,
}: {
  display: string;
  status: string;
  detail?: string | null;
}) {
  const tc = getTierColor(display);
  return (
    <div className="flex items-center gap-3">
      <div
        className="px-3 py-1.5 rounded-lg text-sm font-bold"
        style={{ backgroundColor: tc.bg, color: tc.text }}
      >
        {display}
      </div>
      {detail && <div className="text-xs text-[#1E2D4D]/50 truncate">{detail}</div>}
    </div>
  );
}

// ── Violation Report (count only) ──
function ViolationReportResult({
  display,
  status,
  detail,
}: {
  display: string;
  status: string;
  detail?: string | null;
}) {
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.unknown;
  return (
    <div className="flex items-center gap-3">
      <div
        className="px-3 py-1.5 rounded-lg text-sm font-semibold"
        style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
      >
        {display}
      </div>
      {detail && <div className="text-xs text-[#1E2D4D]/50 truncate">{detail}</div>}
    </div>
  );
}

// ── Fallback ──
function FallbackResult({ display, status }: { display: string; status: string }) {
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.unknown;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {display}
    </span>
  );
}
