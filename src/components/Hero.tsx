import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Hero() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/signup${email ? `?email=${encodeURIComponent(email)}` : ''}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-[var(--color-gold-bg)]" style={{ paddingTop: '120px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
      <div className="absolute top-[-100px] right-[-200px] w-[600px] h-[600px] pointer-events-none">
        <div className="w-full h-full rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.2)_0%,transparent_70%)]" />
      </div>
      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '48px' }}>
          {/* Left: Text content — 45% on desktop, full width on mobile */}
          <div style={{ flex: '1 1 400px', maxWidth: '540px' }}>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-[var(--color-gold)] rounded-full mb-6">
              <span className="w-2 h-2 bg-[var(--color-gold)] rounded-full animate-[pulse_2s_ease-in-out_infinite]" />
              <span className="text-[0.875rem] font-semibold text-[var(--color-blue)]">Launching April 7, 2026</span>
            </div>
            <h1 className="font-['Outfit'] font-extrabold leading-[1.15] tracking-[-0.02em] mb-5" style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)' }}>
              <span className="text-[var(--color-blue)]">One platform for </span>
              <span className="text-[var(--color-gold)]">fire safety, food safety, and vendor compliance</span>
            </h1>
            <p className="text-[1.1rem] text-[var(--color-text-light)] leading-[1.7] mb-7">
              Accurate records your team can trust. Eliminate manual errors, pass every inspection with verified data, and catch problems before inspectors do.
            </p>
            <form className="flex gap-3 mb-5 flex-col sm:flex-row" onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-5 py-3.5 border-2 border-[var(--color-gray-200)] rounded-xl text-base transition-colors focus:outline-none focus:border-[var(--color-gold)]"
              />
              <button
                type="submit"
                className="px-7 py-3.5 whitespace-nowrap bg-[#1e4d6b] text-white font-bold rounded-[10px] transition-all hover:bg-[#2a6a8f] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(30,77,107,0.3)] border-none cursor-pointer text-center"
              >
                Get Started
              </button>
            </form>
            <div className="mb-4">
              <button
                onClick={() => navigate('/demo')}
                className="text-[0.9rem] font-medium text-[var(--color-blue)] hover:text-[var(--color-gold-dark)] transition-colors underline underline-offset-4"
              >
                Try the interactive demo →
              </button>
            </div>
            <p className="text-[0.9rem] text-[var(--color-text-light)]">
              🎁 <strong className="text-[var(--color-gold-dark)]">Founder pricing</strong> — $99/mo base rate
            </p>
            <p className="text-[0.85rem] text-[var(--color-text-light)] mt-1">
              From the team behind 90+ commercial kitchen accounts across California
            </p>
          </div>

          {/* Right: Dashboard screenshot — 55% on desktop, full width on mobile */}
          <div style={{ flex: '1 1 500px', minWidth: 0 }}>
            <img
              src="/dashboard-hero.png"
              alt="EvidLY Compliance Dashboard"
              style={{ width: '100%', display: 'block', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.1)' }}
            />
            <p className="text-center mt-4 text-[0.85rem] font-semibold text-[var(--color-blue)]">
              Manage 1 to 1,000+ locations from a single dashboard
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
