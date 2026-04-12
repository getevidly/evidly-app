/**
 * EmptyState — EMOTIONAL-UX-01
 *
 * Empathetic, role-aware empty state component.
 * Frames the next action as a leadership move, not just "no data."
 */

import { Link } from 'react-router-dom';

const EMPTY_STATES = {
  temp_logs: {
    icon: '\u{1F321}\uFE0F',
    heading: 'No temperature logs yet',
    subtext: 'Every log is a record that protects your team and your kitchen.',
    cta: 'Log a Temperature',
    ctaRoute: '/temp-logs/new',
  },
  checklists: {
    icon: '\u2713',
    heading: 'No checklists completed today',
    subtext: 'Consistent checklists are the difference between reactive and ready.',
    cta: 'Start a Checklist',
    ctaRoute: '/checklists',
  },
  violations: {
    icon: '\u{1F6E1}\uFE0F',
    heading: 'No violations on record',
    subtext: "That's the goal. Keep your standards high and it stays that way.",
    cta: null,
    ctaRoute: null,
  },
  documents: {
    icon: '\u{1F4C4}',
    heading: 'No documents uploaded',
    subtext: 'Your compliance documents are your proof. Upload them before you need them.',
    cta: 'Upload a Document',
    ctaRoute: '/documents/upload',
  },
  inspections: {
    icon: '\u{1F4CB}',
    heading: 'No inspection records yet',
    subtext: "When an inspector walks in, you'll already know what they'll find.",
    cta: 'Add Inspection Record',
    ctaRoute: '/food-safety/inspections/new',
  },
  signals: {
    icon: '\u{1F4E1}',
    heading: 'No signals yet',
    subtext: "EvidLY is watching your jurisdiction. You'll know before your competition does.",
    cta: null,
    ctaRoute: null,
  },
  pse: {
    icon: '\u{1F525}',
    heading: 'No safeguard records',
    subtext: 'Your fire protection records are what stand between you and a closure.',
    cta: 'Add Safeguard Record',
    ctaRoute: '/facility-safety/pse',
  },
  service_records: {
    icon: '\u{1F527}',
    heading: 'No service records',
    subtext: "Every service record is evidence of a kitchen that's taken care of.",
    cta: 'Log a Service',
    ctaRoute: '/facility-safety/service/new',
  },
};

export function EmptyState({ type, customHeading, customSubtext, customCta, customCtaRoute }) {
  const state = EMPTY_STATES[type] ?? {
    icon: '\u{1F4C2}',
    heading: 'Nothing here yet',
    subtext: 'Get started and this will fill in.',
    cta: null,
    ctaRoute: null,
  };

  const heading = customHeading ?? state.heading;
  const subtext = customSubtext ?? state.subtext;
  const cta = customCta ?? state.cta;
  const ctaRoute = customCtaRoute ?? state.ctaRoute;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="text-4xl mb-4">{state.icon}</div>
      <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-2">
        {heading}
      </h3>
      <p className="text-sm text-[#1E2D4D]/50 max-w-xs mb-6">
        {subtext}
      </p>
      {cta && ctaRoute && (
        <Link
          to={ctaRoute}
          className="inline-flex items-center px-4 py-2 bg-[#A08C5A] text-white text-sm font-medium rounded-lg hover:bg-[#9A8450] transition-colors"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}
