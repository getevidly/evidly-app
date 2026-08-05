/**
 * study-questions.ts — single source of truth for study question metadata.
 *
 * Both the public instrument (KitchenSafetyStudy.jsx) and the
 * email senders (survey-respond/index.ts) import from here so
 * citations cannot drift between the two.
 *
 * ⚠  CROSS-REPO DEPENDENCY
 * evidly-landing vendors a copy of these citations as a test fixture:
 *   evidly-landing/tests/fixtures/canonical-citations.json
 * If you change a citation here, update that fixture in the same session.
 * A test in evidly-landing asserts the two match; it will fail on the
 * landing side until the fixture is updated.
 */

export interface QuestionMeta {
  /** Display label (matches the instrument's short name) */
  label: string;
  /** CalCode / NFPA citation — canonical */
  citation: string;
}

export const QUESTION_META: Record<string, QuestionMeta> = {
  hood:    { label: 'Exhaust & hood cleaning',        citation: 'NFPA 96 Table 12.4' },
  supp:    { label: 'Hood suppression',              citation: 'NFPA 17A' },
  ext:     { label: 'Fire extinguishers',            citation: 'NFPA 10' },
  sprink:  { label: 'Fire sprinklers',               citation: 'NFPA 25' },
  cool:    { label: 'Cooling records',               citation: '\u00A7114002' },
  hold:    { label: 'Holding temperatures',          citation: '\u00A7113996 \u00B7 \u2265135\u00B0F and \u226441\u00B0F' },
  sanit:   { label: 'Sanitization records',          citation: '\u00A7114099, \u00A7114125' },
  handler: { label: 'Food handler cards',            citation: '\u00A7113948' },
  vins:    { label: 'Vendor insurance certificates', citation: '' },
};
