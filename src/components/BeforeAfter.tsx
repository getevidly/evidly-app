import { X, Check } from 'lucide-react';

export default function BeforeAfter() {
  const comparisons = [
    {
      before: 'Hope your team did the work',
      after: 'Know your team did the work (with proof)'
    },
    {
      before: 'Find records manually (10+ min)',
      after: 'Pull any record instantly (10 seconds)'
    },
    {
      before: 'Discover problems during inspections',
      after: 'Catch problems before they cost you'
    },
    {
      before: 'Guess what needs attention',
      after: 'See exactly what needs fixing'
    },
    {
      before: 'Stress before every inspection',
      after: 'Welcome inspections with confidence'
    }
  ];

  return (
    <section className="py-16 sm:py-[100px] px-4 sm:px-6 bg-white">
      <div className="max-w-[1000px] mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-[0.875rem] font-bold text-[var(--color-gold-dark)] uppercase tracking-[0.1em] mb-4">
            The Transformation
          </span>
          <h2 className="font-['Outfit'] text-[clamp(2rem,4vw,2.75rem)] font-bold text-[var(--color-blue)] tracking-tight mb-3">
            Before EvidLY vs. After EvidLY
          </h2>
          <p className="text-[1.2rem] text-[var(--color-text-light)]">
            See what changes when you move from handwritten notes and hope to verified digital compliance
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--color-gray-50)] rounded-[20px] p-5 sm:p-8 border-2 border-[var(--color-gray-200)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" strokeWidth={2.5} />
              </div>
              <h3 className="font-['Outfit'] text-[1.5rem] font-bold text-[var(--color-blue)]">Before EvidLY</h3>
            </div>
            <ul className="space-y-4">
              {comparisons.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="text-[var(--color-text-light)] leading-[1.6]">{item.before}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-[var(--color-gold-bg)] to-white rounded-[20px] p-5 sm:p-8 border-2 border-[var(--color-gold)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[var(--color-gold)] rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-[var(--color-blue)]" strokeWidth={2.5} />
              </div>
              <h3 className="font-['Outfit'] text-[1.5rem] font-bold text-[var(--color-blue)]">After EvidLY</h3>
            </div>
            <ul className="space-y-4">
              {comparisons.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[var(--color-gold-dark)] flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="text-[var(--color-blue)] font-semibold leading-[1.6]">{item.after}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
