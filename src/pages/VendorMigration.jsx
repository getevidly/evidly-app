import { useRef } from 'react';
import { MigrationWizard } from '../components/migration/MigrationWizard';

const PRIMARY = '#1e4d6b';
const GOLD = '#d4af37';
const NAVY = '#1E2D4D';
const MUTED_GOLD = '#A08C5A';
const CREAM = '#FAF7F0';

const painCards = [
  {
    title: 'The Hardware Trap',
    description:
      'Proprietary sensors that lock you into annual contracts and replacement cycles. When you leave, your temperature history leaves with you.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: 'The Black Box',
    description:
      'Your current platform stores data but builds no HACCP narrative. When an inspector asks "show me your corrective action history," you scramble.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    ),
  },
  {
    title: 'The California Blindspot',
    description:
      'Generic platforms treat every jurisdiction the same. They have no idea that LA County grades on a 100-point deductive scale while San Francisco uses a pass/fail system.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
];

const transferRows = [
  { item: 'Temperature Logs', transfers: true, note: 'Full CSV import with date/time/equipment' },
  { item: 'Equipment Inventory', transfers: true, note: 'Names, types, thresholds auto-mapped' },
  { item: 'Violation History', transfers: true, note: 'Corrective actions and resolution notes' },
  { item: 'Vendor Contacts', transfers: true, note: 'Service provider contact info via CSV' },
  { item: 'Sensor Readings', transfers: true, note: 'Historical readings mapped to equipment' },
  { item: 'Compliance History', transfers: true, note: 'Imported as historical HACCP records' },
  { item: 'Subscriptions', transfers: false, note: 'Cancel with your current provider directly' },
];

const timelineSteps = [
  {
    day: 'Day 1',
    title: 'Your data lands',
    description: 'CSV imported, equipment mapped, historical records indexed. Your kitchen is already in the system.',
  },
  {
    day: 'Day 3',
    title: 'Jurisdiction intelligence activates',
    description:
      'EvidLY identifies your local health authority, grading methodology, and inspection patterns. Alerts calibrate to your zip code.',
  },
  {
    day: 'Day 7',
    title: 'First compliance narrative builds',
    description:
      'A week of EvidLY data combines with your imported history. Your HACCP story starts writing itself.',
  },
  {
    day: 'Day 30',
    title: 'Patterns emerge',
    description:
      'Temperature trends, equipment reliability, and staff compliance patterns emerge. You see your kitchen clearly for the first time.',
  },
  {
    day: 'Day 90',
    title: 'Full operational intelligence',
    description:
      'Predictive signals, insurance documentation, and inspection readiness scores are fully calibrated. You wonder how you ever ran without this.',
  },
];

export function VendorMigration() {
  const wizardRef = useRef(null);

  const scrollToWizard = () => {
    if (wizardRef.current) {
      wizardRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* ─── SECTION 1: HERO ─── */}
      <section
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${PRIMARY} 100%)` }}
      >
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"
            style={{ background: GOLD }}
          />
          <div
            className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl"
            style={{ background: GOLD }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-4">
            You've outgrown them.
          </h1>
          <p className="text-2xl md:text-3xl font-medium mb-6" style={{ color: GOLD }}>
            Your kitchen deserves better.
          </p>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Import your entire compliance history from Zenput, Squadle, ComplianceMate, and CSV.
            No data left behind. No gaps in your record. No hardware to ship back.
          </p>

          {/* Trust Badges */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            {[
              { label: 'Data imported in minutes', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
              { label: 'No gaps in compliance history', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
              { label: 'No hardware to return', icon: 'M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0a2.998 2.998 0 00.75-1.974V5.51a2.25 2.25 0 012.25-2.25h13.5a2.25 2.25 0 012.25 2.25v1.865a2.998 2.998 0 00-.75 1.974' },
            ].map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-3 px-5 py-3 rounded-full"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke={GOLD} strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={badge.icon} />
                </svg>
                <span className="text-white text-sm font-medium">{badge.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={scrollToWizard}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-lg font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
            style={{ background: GOLD }}
          >
            Start My Migration
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
          </button>
        </div>
      </section>

      {/* ─── SECTION 2: WHAT YOU'RE LEAVING BEHIND ─── */}
      <section className="py-20 px-6" style={{ background: '#F8F9FB' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: NAVY }}>
              Be honest with yourself.
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Your current platform was fine when you started. But your kitchen has grown, and it hasn't kept up.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {painCards.map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center mb-5"
                  style={{ background: `${PRIMARY}10`, color: PRIMARY }}
                >
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: NAVY }}>
                  {card.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: WHAT TRANSFERS ─── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: NAVY }}>
              What transfers to EvidLY
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Everything that matters comes with you. We make sure nothing falls through the cracks.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr style={{ background: NAVY }}>
                  <th className="text-left text-white text-sm font-semibold px-6 py-4">Data Type</th>
                  <th className="text-center text-white text-sm font-semibold px-6 py-4 w-28">Transfers</th>
                  <th className="text-left text-white text-sm font-semibold px-6 py-4 hidden sm:table-cell">Details</th>
                </tr>
              </thead>
              <tbody>
                {transferRows.map((row, i) => (
                  <tr
                    key={row.item}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{row.item}</td>
                    <td className="px-6 py-4 text-center">
                      {row.transfers ? (
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                          style={{ background: '#ECFDF5', color: '#059669' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                          style={{ background: '#FEF2F2', color: '#DC2626' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm hidden sm:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: MIGRATION WIZARD ─── */}
      <section ref={wizardRef} className="py-20 px-6" style={{ background: CREAM }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: NAVY }}>
              Start your migration
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Four steps. A few minutes. Your entire compliance history, safely transferred.
            </p>
          </div>

          <MigrationWizard />
        </div>
      </section>

      {/* ─── SECTION 5: WHAT HAPPENS AFTER ─── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: NAVY }}>
              What happens after you switch
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              The first 90 days set the foundation. Here is exactly what to expect.
            </p>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5"
              style={{ background: `linear-gradient(to bottom, ${GOLD}, ${PRIMARY})` }}
            />

            <div className="space-y-10">
              {timelineSteps.map((step, i) => (
                <div key={step.day} className="relative flex gap-6 md:gap-8">
                  {/* Dot */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white text-xs md:text-sm font-bold"
                      style={{
                        background: i === 0 ? GOLD : PRIMARY,
                        boxShadow: `0 0 0 4px white, 0 0 0 6px ${i === 0 ? GOLD : PRIMARY}30`,
                      }}
                    >
                      {step.day.replace('Day ', 'D')}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pt-2 md:pt-4 pb-2">
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: MUTED_GOLD }}
                    >
                      {step.day}
                    </span>
                    <h3 className="text-xl font-bold mt-1 mb-2" style={{ color: NAVY }}>
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 6: FINAL CTA ─── */}
      <section
        className="py-20 px-6"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${PRIMARY} 100%)` }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to stop settling?
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-xl mx-auto leading-relaxed">
            Your kitchen runs on precision. Your compliance platform should too.
            Bring your history, leave the headaches behind.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={scrollToWizard}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-lg font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
              style={{ background: GOLD }}
            >
              Start My Migration
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
              </svg>
            </button>

            <a
              href="mailto:arthur@getevidly.com?subject=Migration%20from%20current%20platform"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-lg font-semibold transition-all hover:scale-105"
              style={{
                color: GOLD,
                border: `2px solid ${GOLD}`,
                background: 'transparent',
              }}
            >
              Talk to Arthur
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
