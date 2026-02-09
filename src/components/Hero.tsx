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
      <div className="max-w-[800px] mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-[var(--color-gold)] rounded-full mb-8">
          <span className="w-2 h-2 bg-[var(--color-gold)] rounded-full animate-[pulse_2s_ease-in-out_infinite]" />
          <span className="text-[0.875rem] font-semibold text-[var(--color-blue)]">Launching April 7, 2026</span>
        </div>
        <h1 className="font-['Outfit'] text-[clamp(3rem,8vw,4.5rem)] font-extrabold leading-[1.1] tracking-[-0.03em] mb-4">
          <span className="text-[var(--color-blue)] block">Compliance</span>
          <span className="text-[var(--color-gold)] block">Simplified</span>
        </h1>
        <p className="text-[1.2rem] text-[var(--color-blue)] font-semibold mb-3 max-w-[600px] mx-auto">
          The all-in-one compliance platform for commercial kitchens
        </p>
        <p className="text-[1.05rem] text-[var(--color-text-light)] mb-6 max-w-[500px] mx-auto">
          From the team behind 90+ commercial kitchen accounts across California
        </p>
        <p className="text-[1.3rem] text-[var(--color-text-light)] leading-[1.7] max-w-[600px] mx-auto mb-10">
          Accurate records your team can trust. Eliminate manual errors, pass every inspection with verified data, and catch problems before inspectors do.
        </p>
        <form className="flex gap-3 max-w-[480px] mx-auto mb-6 flex-col sm:flex-row" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-5 py-4 border-2 border-[var(--color-gray-200)] rounded-xl text-base transition-colors focus:outline-none focus:border-[var(--color-gold)]"
          />
          <button
            type="submit"
            className="px-8 py-4 whitespace-nowrap bg-[#1e4d6b] text-white font-bold rounded-[10px] transition-all hover:bg-[#2a6a8f] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(30,77,107,0.3)] border-none cursor-pointer text-center"
          >
            Get Started
          </button>
        </form>
        <p className="text-[0.95rem] text-[var(--color-text-light)]">
          🎁 <strong className="text-[var(--color-gold-dark)]">Founder pricing</strong> — $99/mo base rate
        </p>
        <button
          onClick={handleTryDemo}
          className="mt-4 text-[0.9rem] font-medium text-[var(--color-blue)] hover:text-[var(--color-gold-dark)] transition-colors underline underline-offset-4"
        >
          or try the interactive demo →
        </button>
      </div>

      {/* Dashboard Preview */}
      <div className="max-w-[960px] mx-auto mt-16 px-4">
        <img
          src="/dashboard-overview.png"
          alt="EvidLY Compliance Dashboard — Pacific Coast Dining overview with compliance score, pillar breakdown, and location table"
          className="w-full rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] border border-gray-200/60"
          style={{ transform: 'perspective(1200px) rotateX(2deg)', transformOrigin: 'bottom center' }}
        />
        <p className="text-center mt-6 text-[0.95rem] font-semibold text-[var(--color-blue)]">
          Manage 1 to 1,000+ locations from a single dashboard
        </p>
      </div>
    </section>
    <LeadCaptureModal isOpen={showLeadModal} onClose={() => setShowLeadModal(false)} />
    </>
  );
}
