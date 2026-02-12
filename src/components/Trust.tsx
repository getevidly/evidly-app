export default function Trust() {
  const stats = [
    { value: '90+', label: 'Kitchens Serviced' },
    { value: 'IKECA', label: 'Certified' },
    { value: '20+', label: 'Years IT Experience' }
  ];

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 bg-[var(--color-gray-50)]">
      <div className="max-w-[1000px] mx-auto text-center">
        <h2 className="font-['Outfit'] text-[2rem] font-bold text-[var(--color-blue)] mb-4">
          Built by operators, for operators
        </h2>
        <p className="text-[1.2rem] text-[var(--color-text-light)] leading-[1.7] mb-12 max-w-[700px] mx-auto">
          EvidLY comes from 3+ years running commercial kitchen operations, backed by 20+ years of enterprise IT and cybersecurity expertise. We know compliance because we live it every day — servicing kitchens from Yosemite to Aramark facilities.
        </p>
        <div className="flex justify-center gap-8 sm:gap-16 flex-wrap">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="font-['Outfit'] text-[2.5rem] font-extrabold text-[var(--color-blue)] mb-1">
                {stat.value}
              </div>
              <div className="text-[var(--color-text-light)]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
