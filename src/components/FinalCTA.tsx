import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FinalCTA() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/signup${email ? `?email=${encodeURIComponent(email)}` : ''}`);
  };

  return (
    <section className="py-16 sm:py-[100px] px-4 sm:px-6 bg-gradient-to-br from-[var(--color-blue)] to-[var(--color-blue-dark)] text-white">
      <div className="max-w-[700px] mx-auto text-center">
        <h2 className="font-['Outfit'] text-[clamp(2rem,5vw,3rem)] font-extrabold tracking-tight mb-5">
          Ready to <span className="text-[var(--color-gold)]">simplify compliance</span>?
        </h2>
        <p className="text-[1.3rem] text-[rgba(255,255,255,0.8)] mb-10">
          Start your free demo and see why commercial kitchens trust EvidLY.
        </p>
        <form className="flex gap-3 max-w-[480px] mx-auto flex-col sm:flex-row" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-5 py-4 border-2 border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.1)] text-white rounded-xl text-base transition-all focus:outline-none focus:border-[var(--color-gold)] focus:bg-[rgba(255,255,255,0.15)] placeholder:text-[rgba(255,255,255,0.5)]"
          />
          <button type="submit" className="px-8 py-4 whitespace-nowrap bg-white text-[#1e4d6b] font-bold rounded-[10px] transition-all hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(255,255,255,0.3)] border-none cursor-pointer min-h-[44px]">
            Get Started
          </button>
        </form>
      </div>
    </section>
  );
}
