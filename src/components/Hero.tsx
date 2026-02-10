import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeadCaptureModal } from './LeadCaptureModal';

export default function Hero() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const [showLeadModal, setShowLeadModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/signup${email ? `?email=${encodeURIComponent(email)}` : ''}`);
  };

  const handleTryDemo = () => {
    setShowLeadModal(true);
  };

  return (
    <>
    <section className="pt-[140px] pb-[100px] px-6 relative overflow-hidden bg-gradient-to-b from-white to-[var(--color-gold-bg)]">
      <div className="absolute top-[-100px] right-[-200px] w-[600px] h-[600px] pointer-events-none">
        <div className="w-full h-full rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.2)_0%,transparent_70%)]" />
      </div>
      <div className="max-w-[1200px] mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text content */}
          <div>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-[var(--color-gold)] rounded-full mb-8">
              <span className="w-2 h-2 bg-[var(--color-gold)] rounded-full animate-[pulse_2s_ease-in-out_infinite]" />
              <span className="text-[0.875rem] font-semibold text-[var(--color-blue)]">Launching April 7, 2026</span>
            </div>
            <h1 className="font-['Outfit'] text-[clamp(2.25rem,5vw,3.5rem)] font-extrabold leading-[1.1] tracking-[-0.03em] mb-5">
              <span className="text-[var(--color-blue)]">One platform for </span>
              <span className="text-[var(--color-gold)]">fire safety, food safety, and vendor compliance</span>
            </h1>
            <p className="text-[1.15rem] text-[var(--color-text-light)] leading-[1.7] mb-8 max-w-[520px]">
              Accurate records your team can trust. Eliminate manual errors, pass every inspection with verified data, and catch problems before inspectors do.
            </p>
            <form className="flex gap-3 max-w-[420px] mb-5 flex-col sm:flex-row" onSubmit={handleSubmit}>
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
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={handleTryDemo}
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

          {/* Right: Dashboard screenshot */}
          <div className="relative">
            <img
              src="/dashboard-hero.png"
              alt="EvidLY Compliance Dashboard"
              className="w-full rounded-xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.25)] border border-gray-200/60"
            />
            <p className="text-center mt-4 text-[0.85rem] font-semibold text-[var(--color-blue)]">
              Manage 1 to 1,000+ locations from a single dashboard
            </p>
          </div>
        </div>
      </div>
    </section>
    <LeadCaptureModal isOpen={showLeadModal} onClose={() => setShowLeadModal(false)} />
    </>
  );
}
