import { colors } from '../../lib/designSystem';

const ROADMAP_TILES = [
  {
    icon: '\uD83D\uDCCA',
    title: 'Period Summary',
    body: 'Total completions, pass rate %, failed items with linked CAs, coverage gaps \u2014 scoped to your date filter.',
  },
  {
    icon: '\u26A0',
    title: 'Coverage Gap Detection',
    body: 'Missed shifts are identified automatically. \u201CLog retroactively\u201D with an audit reason. No silent gaps.',
  },
  {
    icon: '\u2728',
    title: 'AI Pattern Insights',
    body: 'Plain-language insights at 50+ completions. \u201CSanitizer log fails every PM Friday\u201D with statistical basis cited.',
  },
] as const;

export function ChecklistsHistoryRoadmap() {
  return (
    <div
      className="rounded-[10px] border"
      style={{
        backgroundColor: colors.cream,
        borderColor: colors.border,
        padding: '16px 20px',
        marginTop: 24,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <h3
          className="text-[13px] font-bold"
          style={{ color: colors.navy, fontFamily: "'Montserrat', sans-serif" }}
        >
          Coming in Phase 3
        </h3>
        <span
          className="inline-block font-bold uppercase"
          style={{
            backgroundColor: colors.warningSoft,
            color: colors.warning,
            fontSize: '9px',
            padding: '2px 7px',
            borderRadius: 4,
            letterSpacing: '0.04em',
          }}
        >
          ROADMAP
        </span>
      </div>
      <p className="text-xs mb-4" style={{ color: colors.textMuted }}>
        These review features unlock as your completion history grows.
      </p>

      {/* Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ROADMAP_TILES.map(tile => (
          <div
            key={tile.title}
            className="rounded-md border"
            style={{
              backgroundColor: colors.white,
              borderColor: colors.border,
              padding: '10px 12px',
            }}
          >
            <div
              className="font-bold leading-tight mb-1"
              style={{ color: colors.navy, fontSize: '12px' }}
            >
              {tile.icon} {tile.title}
            </div>
            <p
              style={{ color: colors.textMuted, fontSize: '11px', lineHeight: 1.4 }}
            >
              {tile.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
