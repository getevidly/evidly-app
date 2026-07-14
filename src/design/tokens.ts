/* EvidLY design tokens — the single source of color and type.
   STATE owns color. PILLAR owns category. They never borrow from each other. */

export const FONT = {
  display: "'Spectral', Georgia, serif",
  body:    "'Instrument Sans', system-ui, -apple-system, sans-serif",
  mono:    "'IBM Plex Mono', ui-monospace, monospace",
} as const;

export const SURFACE = {
  page:   '#F7F1E6',   // cream
  paper:  '#FFFFFF',
  raised: '#EFE8DA',   // stat grid backing, tab rail
  topbar: '#CFE3D7',   // the 6px sage bar
  rail:   '#F0EADC',   // progress + range tracks
} as const;

export const TEXT = {
  ink:    '#1C2A3A',   // 12.96:1 on cream
  body:   '#4A5566',
  muted:  '#5F6875',   //  5.02:1 — sub-labels, secondary copy
  meta:   '#6E675A',   //  4.98:1 — mono meta, eyebrows, range figures
  label:  '#646D7A',   //  4.66:1 — mono section labels
  numeral:'#836839',   //  4.66:1 — proof numerals 01 / 02 / 03
  onDark: '#EDE7DA',   // tooltip + navy-card copy
} as const;

export const LINE = {
  soft:   '#EEE7D9',
  strong: '#E4DBC8',
} as const;

/* STATE — the only semantic colors. Every one clears WCAG AA on cream. */
export const TONE = {
  sage:  { fill: '#7FA98B', tint: '#E3ECE1', text: '#3E5E4B', dot: '#547A62' }, // handled
  amber: { fill: '#D8A93A', tint: '#F7EDD3', text: '#8A6412', dot: '#D8A93A' }, // coming due
  red:   { fill: '#9E3B32', tint: '#F6E3DF', text: '#8E332B', dot: '#9E3B32' }, // exposed now
} as const;

/* PILLAR — category, never judgment. Fire and food are permanently separate
   and must never be blended, aggregated, or rendered in the same hue.
   ΔE 64 apart, so they can never be confused on a chart. */
export const PILLAR = {
  fire: { bar: '#B26A43', tint: '#F4E5DA', text: '#8A4A28' },
  food: { bar: '#3E6B8A', tint: '#E2ECF2', text: '#2C5570' },
} as const;

/* BRAND — accents only. GOLD is NEVER a chart fill, bar, or data color. */
export const BRAND = {
  gold:     '#A08C5A',   // brand-mark accents only
  wordmark: '#A17C3B',   // the LY in the wordmark. Nothing else.
} as const;

export const TYPE = {
  hero:    66,  // "You're covered."
  ring:    52,  // the inspection-ready numeral
  ringPct: 24,  // its percent sign
  stat:    42,  // stat-grid figures
  figure:  34,  // risk drawer figures
  reading: 30,  // temperature readings
  section: 27,  // section headers
} as const;
