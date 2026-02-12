import { Check } from 'lucide-react';

export default function DailyOperations() {
  const features = [
    {
      title: 'Accurate Records Every Time',
      description: 'Digital logs with timestamps and photos eliminate illegible handwriting, backdated entries, and "forgot to log it" excuses.'
    },
    {
      title: 'Catch Problems Before Inspectors Do',
      description: 'Real-time alerts when temps go out of range or tasks get missed. Fix issues before they become violations.'
    },
    {
      title: 'Spot Patterns Before They\'re Problems',
      description: 'See which equipment fails checks repeatedly. Know which staff consistently skip tasks. Data-driven decisions instead of gut feelings.'
    },
    {
      title: 'Inspector Asks? You Answer Instantly',
      description: 'Pull up any log, any date, any location in seconds. No more digging through filing cabinets while the inspector waits.'
    }
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-[100px] px-4 sm:px-6 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-[0.875rem] font-bold text-[var(--color-gold-dark)] uppercase tracking-[0.1em] mb-4">
              How It Works
            </span>
            <h2 className="font-['Outfit'] text-[clamp(2rem,4vw,2.75rem)] font-bold text-[var(--color-blue)] tracking-tight mb-5">
              Your staff does the checks. EvidLY does the notes.
            </h2>
            <p className="text-[1.2rem] text-[var(--color-text-light)] leading-[1.7] mb-8">
              Replace clipboards and handwritten notes with a simple app your team will actually use — and you can actually trust.
            </p>
            <ul className="list-none">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-4 py-4 border-b border-[var(--color-gray-200)] last:border-b-0">
                  <Check className="w-6 h-6 text-[var(--color-gold)] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                  <div>
                    <strong className="block text-[var(--color-blue)] mb-1">{feature.title}</strong>
                    <span className="text-[var(--color-text-light)] text-[0.95rem]">{feature.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <img
              src="/temp-logs.png"
              alt="EvidLY Temperature Logs — real-time cooler, freezer, and hot hold readings with pass/fail status"
              loading="lazy"
              className="w-full rounded-[24px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] border border-gray-200/60"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
