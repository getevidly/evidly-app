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
      <div className="max-w-[960px] mx-auto mt-16 px-4">
        <div className="bg-white rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] border border-gray-200/60 overflow-hidden" style={{ transform: 'perspective(1200px) rotateX(2deg)', transformOrigin: 'bottom center' }}>
          {/* Mock TopBar */}
          <div className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1e4d6b] flex items-center justify-center">
                <svg viewBox="0 0 56 65" fill="none" className="w-3.5 h-4">
                  <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#d4af37"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-800">Pacific Coast Dining</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 hidden sm:inline">All Locations</span>
              <div className="w-7 h-7 rounded-full bg-[#1e4d6b] flex items-center justify-center text-white text-xs font-bold">J</div>
            </div>
          </div>

          {/* Mock Dashboard Body */}
          <div className="px-5 py-4 bg-[#faf9f7]">
            {/* Section header */}
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Compliance Overview</h3>

            {/* Compliance Score Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                {/* Gauge */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="relative w-[100px] h-[100px]">
                    <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 40 * 0.92} ${2 * Math.PI * 40}`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold text-[#22c55e]">92</span>
                      <span className="text-[9px] text-gray-400">Overall</span>
                    </div>
                  </div>
                  <span className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Inspection Ready
                  </span>
                </div>

                {/* 3 Pillar Cards */}
                <div className="flex gap-3 flex-1 w-full">
                  {[
                    { name: 'Operational', weight: '45%', score: 95 },
                    { name: 'Equipment', weight: '30%', score: 91 },
                    { name: 'Documentation', weight: '25%', score: 89 },
                  ].map((pillar) => (
                    <div key={pillar.name} className="flex-1 bg-white border border-gray-100 rounded-lg p-3 text-center" style={{ borderLeft: '3px solid #22c55e' }}>
                      <div className="text-[10px] font-medium text-gray-500 mb-1">{pillar.name} ({pillar.weight})</div>
                      <div className="text-xl font-bold text-[#22c55e]">{pillar.score}</div>
                      <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${pillar.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Locations Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">Overall</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center hidden sm:table-cell">Operational</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center hidden sm:table-cell">Equipment</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center hidden sm:table-cell">Documentation</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Downtown Kitchen', overall: 92, op: 95, eq: 91, doc: 89, status: 'Inspection Ready', statusColor: '#22c55e', statusBg: '#f0fdf4' },
                    { name: 'Airport Cafe', overall: 74, op: 78, eq: 70, doc: 72, status: 'Needs Attention', statusColor: '#d4af37', statusBg: '#fffbeb' },
                    { name: 'University Dining', overall: 57, op: 62, eq: 55, doc: 52, status: 'Critical', statusColor: '#dc2626', statusBg: '#fef2f2' },
                  ].map((loc, i) => {
                    const scoreColor = (s: number) => s >= 80 ? '#22c55e' : s >= 60 ? '#d4af37' : '#dc2626';
                    return (
                      <tr key={loc.name} className={i < 2 ? 'border-b border-gray-50' : ''}>
                        <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{loc.name}</td>
                        <td className="px-3 py-2.5 text-center"><span className="text-xs font-bold" style={{ color: scoreColor(loc.overall) }}>{loc.overall}</span></td>
                        <td className="px-3 py-2.5 text-center hidden sm:table-cell"><span className="text-xs font-semibold" style={{ color: scoreColor(loc.op) }}>{loc.op}</span></td>
                        <td className="px-3 py-2.5 text-center hidden sm:table-cell"><span className="text-xs font-semibold" style={{ color: scoreColor(loc.eq) }}>{loc.eq}</span></td>
                        <td className="px-3 py-2.5 text-center hidden sm:table-cell"><span className="text-xs font-semibold" style={{ color: scoreColor(loc.doc) }}>{loc.doc}</span></td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: loc.statusColor, backgroundColor: loc.statusBg, border: `1px solid ${loc.statusColor}20` }}>{loc.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
    <LeadCaptureModal isOpen={showLeadModal} onClose={() => setShowLeadModal(false)} />
    </>
  );
}
