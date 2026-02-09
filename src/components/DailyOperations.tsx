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

  const checklistItems = [
    { completed: true, title: 'Walk-in Cooler Temp Check', detail: 'Logged: 38°F ✓ In range', time: '6:42 AM' },
    { completed: true, title: 'Freezer Temp Check', detail: 'Logged: -4°F ✓ In range', time: '6:43 AM' },
    { completed: true, title: 'Opening Checklist', detail: '12/12 items completed', time: '6:58 AM' },
    { completed: false, title: 'Lunch Temp Check', detail: 'Due by 11:00 AM', time: null }
  ];

  return (
    <section id="how-it-works" className="py-[100px] px-6 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-[0.875rem] font-bold text-[var(--color-gold-dark)] uppercase tracking-[0.1em] mb-4">
              How It Works
            </span>
            <h2 className="font-['Outfit'] text-[2.75rem] font-bold text-[var(--color-blue)] tracking-tight mb-5">
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
          <div className="bg-gradient-to-br from-[var(--color-blue)] to-[var(--color-blue-dark)] rounded-[24px] p-10 text-white">
            <h3 className="font-['Outfit'] text-[1.25rem] mb-6 text-[var(--color-gold)]">📋 Today's Tasks</h3>
            {checklistItems.map((item, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 p-4 rounded-xl mb-3 ${
                  item.completed ? 'bg-[rgba(212,175,55,0.15)]' : 'bg-[rgba(255,255,255,0.08)]'
                }`}
              >
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  item.completed
                    ? 'bg-[var(--color-gold)] border-[var(--color-gold)]'
                    : 'border-[rgba(255,255,255,0.3)]'
                }`}>
                  {item.completed && <Check className="w-4 h-4 text-[var(--color-blue)]" />}
                </div>
                <div className="flex-1">
                  <strong className="block text-[0.95rem]">{item.title}</strong>
                  <span className="text-[0.8rem] text-[rgba(255,255,255,0.6)]">{item.detail}</span>
                </div>
                {item.time && (
                  <div className="text-[0.8rem] text-[var(--color-gold)] font-semibold">{item.time}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
