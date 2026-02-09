export default function Features() {
  const features = [
    {
      icon: '🛡️',
      title: 'Inspection-Ready, Always',
      description: "No more Sunday night panic preparing for Monday's health inspection. Your records are always complete, always accurate, always accessible."
    },
    {
      icon: '⏱️',
      title: 'Takes 2 Minutes, Not 20',
      description: 'Complete a full opening checklist in under 2 minutes. Staff spend 90% less time on compliance tasks.'
    },
    {
      icon: '📸',
      title: '100% Verifiable Records',
      description: 'Timestamped, photo-verified, GPS-confirmed. Every entry is provably accurate. No more guessing if your team actually did the check.'
    },
    {
      icon: '🔔',
      title: 'Catch Problems Early',
      description: 'Cooler running warm? Task missed? Get alerted instantly so you can fix it before it costs you or fails inspection.'
    },
    {
      icon: '📊',
      title: 'Know Your Operation',
      description: 'See which tasks are overdue, which coolers run hot, which staff need retraining. Turn scattered data into actionable insights.'
    },
    {
      icon: '🔍',
      title: 'Find Any Record in Seconds',
      description: '"Show me Tuesday\'s temp logs." Done. Pull up any log, any date, any location instantly. No more digging through binders.'
    },
    {
      icon: '⚡',
      title: 'Automate the Busy Work',
      description: 'Auto-generate inspection reports, vendor compliance summaries, and inspection packages in one click. What took hours now takes seconds.'
    },
    {
      icon: '🤖',
      title: 'Get Answers Fast',
      description: '"How long can cooked chicken sit out?" Ask our AI and get the FDA answer in seconds.'
    }
  ];

  return (
    <section className="py-[100px] px-6 bg-[var(--color-gold-bg)] border-t border-b border-[var(--color-gold-border)]">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-[0.875rem] font-bold text-[var(--color-gold-dark)] uppercase tracking-[0.1em] mb-4">
            Why Restaurants Switch to EvidLY
          </span>
          <h2 className="font-['Outfit'] text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-[var(--color-blue)] tracking-tight mb-3">
            Stop worrying about compliance. Relax at night.
          </h2>
          <p className="text-[1.125rem] text-[var(--color-text-light)]">
            Everything documented, verified, and inspection-ready — automatically.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-[20px] p-8 border border-[var(--color-gold-border)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(30,77,107,0.1)]"
            >
              <div className="w-14 h-14 bg-[var(--color-blue)] rounded-[14px] flex items-center justify-center text-[1.5rem] mb-5">
                {feature.icon}
              </div>
              <h3 className="font-['Outfit'] text-[1.25rem] font-bold text-[var(--color-blue)] mb-2">
                {feature.title}
              </h3>
              <p className="text-[var(--color-text-light)] leading-[1.6]">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
