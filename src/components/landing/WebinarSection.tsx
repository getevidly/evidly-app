import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CalendlyButton from './CalendlyButton';

export default function WebinarSection() {
  const navigate = useNavigate();

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-4xl mx-auto text-center">
        <span className="inline-block text-sm font-bold uppercase tracking-wider mb-4" style={{ color: '#d4af37' }}>
          Live Walkthrough
        </span>
        <h2 className="font-['Outfit'] text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#1e4d6b' }}>
          See EvidLY in Action
        </h2>
        <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-2xl mx-auto">
          Join a free 15-minute walkthrough with Arthur Haggerty, EvidLY's founder.
          He'll show you exactly how EvidLY works for your type of kitchen.
        </p>

        <div className="max-w-md mx-auto mb-8">
          <ul className="space-y-3 text-left">
            {[
              'Live demo tailored to your operation',
              'Q&A about compliance in your jurisdiction',
              'See Founder pricing (limited to 100 customers)',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5" strokeWidth={3} style={{ color: '#d4af37' }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <CalendlyButton text="Book Free Walkthrough" variant="gold" />
          <button
            onClick={() => navigate('/demo')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-base transition-all hover:-translate-y-0.5 border-2 min-h-[44px] bg-white"
            style={{ color: '#1e4d6b', borderColor: '#1e4d6b' }}
          >
            Try the Demo Now &rarr;
          </button>
        </div>
      </div>
    </section>
  );
}
