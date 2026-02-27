import { useNavigate } from 'react-router-dom';
import { Heart, CalendarCheck, MapPin, Users, ArrowRight, Mail } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const WARM_BG = '#FDF6E3';

export default function KitchenToCommunity() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6" style={{ backgroundColor: WARM_BG, color: GOLD }}>
            <Heart className="w-4 h-4" />
            Kitchen to Community
          </div>
          <h1 className="font-['Outfit'] text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: NAVY }}>
            Your kitchen feeds your customers.
            <br />
            Now it feeds kids too.
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Every EvidLY subscription automatically funds meals for children through No Kid Hungry.
            No extra cost. No extra steps. Just impact.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12" style={{ color: NAVY }}>How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <CalendarCheck className="w-7 h-7" style={{ color: GOLD }} />,
                title: 'Day One',
                description: '$10 donated to No Kid Hungry when your first payment clears. That\'s about 100 meals for kids who need them.',
              },
              {
                icon: <Heart className="w-7 h-7" style={{ color: GOLD }} />,
                title: 'Every Month',
                description: '$10 per active location per month. Comes from our revenue, not your bill. You pay the same price either way.',
              },
              {
                icon: <MapPin className="w-7 h-7" style={{ color: GOLD }} />,
                title: 'Where It Goes',
                description: 'No Kid Hungry, a program of Share Our Strength (501(c)(3)). School breakfasts, community grants, after-school meals.',
              },
            ].map((step) => (
              <div key={step.title} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: WARM_BG }}>
                  {step.icon}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: NAVY }}>{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Refer & Multiply */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6" style={{ backgroundColor: WARM_BG, color: GOLD }}>
            <Users className="w-4 h-4" />
            Refer &amp; Multiply
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: NAVY }}>
            Refer a kitchen. Double the impact.
          </h2>
          <p className="text-gray-600 leading-relaxed max-w-xl mx-auto mb-8">
            When you refer another kitchen to EvidLY, they get the 100-meal welcome donation on day one.
            For their first 3 months, the donation doubles to $20 per location per month.
            No extra cost to anyone.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { number: '100', label: 'meals on day one' },
              { number: '3', label: 'months doubled' },
              { number: '$0', label: 'extra cost' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg p-4" style={{ backgroundColor: WARM_BG }}>
                <div className="text-2xl font-bold" style={{ color: GOLD }}>{stat.number}</div>
                <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Counter */}
      <section className="py-16 px-4 sm:px-6" style={{ backgroundColor: NAVY }}>
        <div className="max-w-3xl mx-auto text-center">
          <EvidlyIcon size={40} className="mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Total meals funded by EvidLY customers
          </h2>
          <p className="text-lg font-semibold mb-2" style={{ color: GOLD }}>
            Launching May 5, 2026
          </p>
          <p className="text-gray-400">
            Goal: 10,000 meals in month one.
          </p>
        </div>
      </section>

      {/* Transparency */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: NAVY }}>Transparency</h2>
          <div className="space-y-4">
            {[
              'Funded by EvidLY from operating revenue. Not charged to customers.',
              'Meal estimates based on No Kid Hungry\'s published figure: $1 ≈ 10 meals.',
              'Quarterly impact reports published with donation totals and partner confirmation.',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white" style={{ backgroundColor: GOLD }}>
                  {i + 1}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6" style={{ backgroundColor: WARM_BG }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: NAVY }}>
            Feed your business. Feed kids too.
          </h2>
          <p className="text-gray-600 mb-8">
            Every subscription makes a difference. Start today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="px-6 py-3 rounded-xl font-semibold text-white transition-colors hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#1e4d6b' }}
            >
              Start your free trial <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="px-6 py-3 rounded-xl font-semibold transition-colors border-2 flex items-center justify-center gap-2"
              style={{ color: '#1e4d6b', borderColor: '#1e4d6b' }}
            >
              See the platform in action <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4">$99/month after 30-day free trial. Cancel anytime.</p>
        </div>
      </section>

      {/* Footer note */}
      <div className="py-6 px-4 text-center border-t border-gray-100">
        <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
          <Mail className="w-4 h-4" />
          Questions about Kitchen to Community?{' '}
          <a href="mailto:arthur@getevidly.com" className="font-semibold hover:underline" style={{ color: GOLD }}>
            arthur@getevidly.com
          </a>
        </p>
      </div>

      <Footer />
    </div>
  );
}
