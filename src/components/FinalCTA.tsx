export default function FinalCTA() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <section className="py-[100px] px-6 bg-gradient-to-br from-[var(--color-blue)] to-[var(--color-blue-dark)] text-white">
      <div className="max-w-[700px] mx-auto text-center">
        <h2 className="font-['Outfit'] text-[clamp(2rem,5vw,3rem)] font-extrabold tracking-tight mb-5">
          Ready for <span className="text-[var(--color-gold)]">peace of mind</span>?
        </h2>
        <p className="text-[1.25rem] text-[rgba(255,255,255,0.8)] mb-10">
          Stop worrying about the next inspection. Sign up and relax at night.
        </p>
        <form className="flex gap-3 max-w-[480px] mx-auto flex-col sm:flex-row" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            required
            className="flex-1 px-5 py-4 border-2 border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.1)] text-white rounded-xl text-base transition-all focus:outline-none focus:border-[var(--color-gold)] focus:bg-[rgba(255,255,255,0.15)] placeholder:text-[rgba(255,255,255,0.5)]"
          />
          <button type="submit" className="px-8 py-4 whitespace-nowrap bg-white text-[#1e4d6b] font-bold rounded-[10px] transition-all hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(255,255,255,0.3)] border-none cursor-pointer">
            Get Started
          </button>
        </form>
      </div>
    </section>
  );
}
