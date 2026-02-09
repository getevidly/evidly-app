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
        <p className="text-[1.125rem] text-[var(--color-blue)] font-semibold mb-3 max-w-[600px] mx-auto">
          The all-in-one compliance platform for commercial kitchens
        </p>
        <p className="text-[1rem] text-[var(--color-text-light)] mb-6 max-w-[500px] mx-auto">
          From the team behind 90+ commercial kitchen accounts
        </p>
        <p className="text-[1.25rem] text-[var(--color-text-light)] leading-[1.7] max-w-[600px] mx-auto mb-10">
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
      <div className="max-w-[900px] mx-auto mt-16 px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden" style={{ transform: 'perspective(1200px) rotateX(2deg)', transformOrigin: 'bottom center' }}>
          {/* Mock TopBar */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#1e4d6b] flex items-center justify-center">
                <svg viewBox="0 0 56 65" fill="none" className="w-3.5 h-4">
                  <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#d4af37"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-700">Pacific Coast Dining</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 hidden sm:inline">Downtown Kitchen</span>
              <div className="w-7 h-7 rounded-full bg-[#1e4d6b] flex items-center justify-center text-white text-xs font-bold">J</div>
            </div>
          </div>
          {/* Mock Dashboard Content */}
          <div className="p-6 bg-[#faf8f3]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Compliance Score */}
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Compliance Score</p>
                <div className="relative w-24 h-24 mx-auto mb-3">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#16a34a" strokeWidth="8" strokeLinecap="round" strokeDasharray="243 264" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-[#16a34a]">92%</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-[#16a34a]">Inspection Ready</span>
              </div>
              {/* Location Scores */}
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Locations</p>
                <div className="space-y-3">
                  {[{ name: 'Downtown Kitchen', score: 95, color: '#16a34a' }, { name: 'Airport Cafe', score: 88, color: '#2563eb' }, { name: 'University Dining', score: 76, color: '#d97706' }].map((loc) => (
                    <div key={loc.name} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 truncate mr-2">{loc.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${loc.score}%`, backgroundColor: loc.color }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: loc.color }}>{loc.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Activity Feed */}
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Recent Activity</p>
                <div className="space-y-2.5">
                  {[{ text: 'Walk-in Cooler: 38°F', badge: 'Pass', color: '#16a34a' }, { text: 'Opening Checklist 12/12', badge: 'Done', color: '#2563eb' }, { text: 'Health Permit expires in 14d', badge: 'Alert', color: '#d97706' }].map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 truncate mr-2">{item.text}</span>
                      <span className="px-2 py-0.5 rounded-full text-white font-medium flex-shrink-0" style={{ backgroundColor: item.color, fontSize: '10px' }}>{item.badge}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <LeadCaptureModal isOpen={showLeadModal} onClose={() => setShowLeadModal(false)} />
    </>
  );
}
