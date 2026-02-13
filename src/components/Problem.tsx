export default function Problem() {
  const problems = [
    {
      icon: '⏰',
      title: '5+ hours/week wasted',
      description: "That's 260+ hours per year on manual notes. Time you could spend training staff, improving compliance operations, or actually running your business."
    },
    {
      icon: '📁',
      title: 'Scattered documents',
      description: 'Vendor certificates in emails, inspection reports in filing cabinets, licenses who-knows-where. Good luck finding them during an inspection.'
    },
    {
      icon: '😰',
      title: 'Inspection-ready? Never.',
      description: "That sinking feeling when the health inspector walks in and you're scrambling to find your temperature logs from last Tuesday. One failed inspection = $25K+ in lost revenue."
    },
    {
      icon: '✍️',
      title: "Can't trust your own data",
      description: 'Illegible handwriting, backdated entries, "forgot to log it" excuses. When 40% of your logs are unreliable, you\'re operating blind.'
    }
  ];

  return (
    <section className="py-[100px] px-6 bg-[var(--color-gray-50)]">
      <div className="max-w-[1000px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-['Outfit'] text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-[var(--color-blue)] tracking-tight mb-3">
            Your kitchen compliance operations are held together by notes, spreadsheets, and hope.
          </h2>
          <p className="text-[1.125rem] text-[var(--color-text-light)]">Sound familiar?</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {problems.map((problem, index) => (
            <div key={index} className="bg-white rounded-[20px] p-10 text-center border border-[var(--color-gray-200)]">
              <div className="text-[3rem] mb-5">{problem.icon}</div>
              <h3 className="font-['Outfit'] text-[1.5rem] font-bold text-[var(--color-blue)] mb-3">{problem.title}</h3>
              <p className="text-[var(--color-text-light)] leading-[1.6]">{problem.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
