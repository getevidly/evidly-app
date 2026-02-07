export default function TrustedBy() {
  return (
    <section className="py-[60px] px-6 bg-white border-b border-[var(--color-gray-200)]">
      <div className="max-w-[1000px] mx-auto text-center">
        <p className="text-[0.8rem] font-semibold text-[var(--color-gray-400)] uppercase tracking-[0.15em] mb-8">
          Trusted by industry leaders
        </p>
        <div className="flex items-center justify-center gap-12 flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <span className="font-semibold text-[var(--color-text-light)] text-[0.95rem]">Cintas</span>
            <span className="inline-block px-2.5 py-1 bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)] rounded text-[0.7rem] font-semibold text-[var(--color-gold-dark)] uppercase tracking-wider">KEC Partner</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[2.5rem] opacity-70">🏞️</span>
            <span className="font-semibold text-[var(--color-text-light)] text-[0.95rem]">Yosemite National Park</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[2.5rem] opacity-70">🍽️</span>
            <span className="font-semibold text-[var(--color-text-light)] text-[0.95rem]">Aramark</span>
          </div>
        </div>
      </div>
    </section>
  );
}
