import { Check, Mail, Phone, Gift, CreditCard } from 'lucide-react';
import { EvidlyIcon } from './ui/EvidlyIcon';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../utils/analytics';
import K2CPricingBadge from './K2CPricingBadge';
import { FOUNDER_PRICING_DEADLINE } from '../lib/stripe';
import { CALENDLY_URL } from '../lib/config';

function DeadlineCountdown() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, FOUNDER_PRICING_DEADLINE.getTime() - now.getTime());
  const expired = diff === 0;
  const dd = Math.floor(diff / 86400000);
  const hh = Math.floor((diff % 86400000) / 3600000);
  const mm = Math.floor((diff % 3600000) / 60000);
  const ss = Math.floor((diff % 60000) / 1000);

  if (expired) {
    return (
      <div className="bg-gradient-to-r from-[#A08C5A]/10 to-[#A08C5A]/5 border border-[#A08C5A]/30 rounded-xl p-4 text-center">
        <span className="text-sm font-bold text-[#1E2D4D]">Founder pricing has ended. Contact us for current rates.</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#A08C5A]/10 to-[#A08C5A]/5 border border-[#A08C5A]/30 rounded-xl p-4">
      <p className="text-sm font-bold text-[#1E2D4D] text-center mb-3">
        Founder pricing locks in forever &mdash; offer ends August 7, 2026
      </p>
      <div className="flex gap-3 justify-center">
        {[
          [dd, 'Days'],
          [hh, 'Hrs'],
          [mm, 'Min'],
          [ss, 'Sec'],
        ].map(([val, label]) => (
          <div key={label as string} className="text-center">
            <div className="text-2xl font-black text-[#1E2D4D] tabular-nums leading-none min-w-[36px]">
              {String(val).padStart(2, '0')}
            </div>
            <div className="text-xs text-[#1E2D4D]/50 uppercase tracking-wider mt-1">{label as string}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const navigate = useNavigate();

  const founderSingle = {
    name: 'Founder',
    subtitle: 'Single Location',
    monthlyPrice: 99,
    annualPrice: 990,
    features: [
      'Full dual-pillar compliance intelligence',
      'Jurisdiction Intelligence Engine (169 Counties · 5 States)',
      'AI-powered HACCP plan generation',
      'Real-time regulatory alerts',
      'Self-inspection & mock inspection tools',
      'Temperature logging with AI anomaly detection',
      'Document management & vendor tracking',
      'Team management with role-based access',
    ],
  };

  const founderMulti = {
    name: 'Founder',
    subtitle: '2\u201310 Locations',
    basePrice: 99,
    additionalPrice: 49,
    features: [
      'Everything in Founder Single',
      'Portfolio-wide risk dashboard',
      'Cross-location benchmarking',
      'Executive summary reports',
      'Centralized vendor management',
    ],
  };

  const enterprise = {
    name: 'Custom',
    subtitle: '11+ Locations',
    features: [
      'Everything in Founder Multi',
      'Dedicated onboarding specialist',
      'Custom integrations',
      'Priority support',
      'Custom reporting',
    ],
  };

  return (
    <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-white to-[#FAF7F0]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block text-sm font-bold text-[#1E2D4D] uppercase tracking-wider mb-4">
            Pricing
          </span>
          <h2 className="font-['Outfit'] text-4xl md:text-5xl font-bold text-[#1E2D4D] tracking-tight">
            Lock in founder pricing today
          </h2>
          <p className="text-[#1E2D4D]/70 mt-3 max-w-lg mx-auto">
            Founder pricing available through August 7, 2026. Price locked forever when you sign up.
          </p>
        </div>

        {/* Risk-Free Guarantee Banner */}
        <div className="max-w-3xl mx-auto mb-10 rounded-2xl p-6 text-center" style={{ backgroundColor: '#eef4f8', border: '2px solid #b8d4e8' }}>
          <div className="flex items-center justify-center gap-3 mb-3">
            <EvidlyIcon size={28} />
            <h3 className="text-xl font-bold" style={{ color: '#1E2D4D' }}>Risk-Free Guarantee</h3>
          </div>
          <p className="text-[#1E2D4D]/80 max-w-xl mx-auto leading-relaxed">
            Try EvidLY <strong>free for 30 days</strong> with full access to every feature.
            Not convinced? Get a <strong>full refund within 45 days</strong> of your first payment. No questions asked.
          </p>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-[#1E2D4D]/70">
            <span className="flex items-center gap-1.5"><Gift className="w-4 h-4 text-[#A08C5A]" />30-day free trial</span>
            <span className="flex items-center gap-1.5"><EvidlyIcon size={16} />45-day money-back</span>
            <span className="flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-[#A08C5A]" />Cancel anytime</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {/* Founder Single Card */}
          <div className="relative">
            <div className="bg-white rounded-xl p-5 sm:p-8 relative border-4 border-[#A08C5A] shadow-sm shadow-[#A08C5A]/20 h-full flex flex-col">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2">
                <span className="px-4 py-2 bg-[#A08C5A] text-[#1E2D4D] text-sm font-bold rounded-full uppercase tracking-wider shadow-sm">
                  Best Value
                </span>
                <span className="px-4 py-2 bg-[#16a34a] text-white text-sm font-bold rounded-full uppercase tracking-wider shadow-sm">
                  30 Days Free
                </span>
              </div>

              <div className="mb-4 pt-6 -mx-5 px-5 sm:-mx-8 sm:px-8">
                <DeadlineCountdown />
              </div>

              <div className="mb-6">
                <div className="text-sm font-bold text-[#1E2D4D] uppercase tracking-wider mb-1">
                  {founderSingle.name}
                </div>
                <div className="text-sm font-semibold text-[#1E2D4D]">{founderSingle.subtitle} &mdash; Price Locked Forever</div>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-6xl font-extrabold text-[#1E2D4D]">
                    ${billingCycle === 'monthly' ? founderSingle.monthlyPrice : founderSingle.annualPrice}
                  </span>
                  <span className="text-lg sm:text-xl text-[#1E2D4D]/70">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                </div>
                {billingCycle === 'annual' && (
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }} className="rounded-lg p-3 mt-3">
                    <p className="text-sm font-semibold" style={{ color: '#166534' }}>
                      2 months free &bull; Save $198/year
                    </p>
                  </div>
                )}
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-3 mb-6 bg-[#1E2D4D]/5 p-1 rounded-lg">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-[#1E2D4D] shadow-sm'
                      : 'text-[#1E2D4D]/70 hover:text-[#1E2D4D]'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    billingCycle === 'annual'
                      ? 'bg-white text-[#1E2D4D] shadow-sm'
                      : 'text-[#1E2D4D]/70 hover:text-[#1E2D4D]'
                  }`}
                >
                  Annual
                </button>
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {founderSingle.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[#1E2D4D]/80">
                    <Check className="w-5 h-5 text-[#A08C5A] flex-shrink-0 mt-0.5" strokeWidth={3} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div>
                <button
                  onClick={() => { trackEvent('cta_click', { cta: 'pricing_founder_single', page: 'landing', billing: billingCycle }); navigate('/signup'); }}
                  className="w-full py-4 px-6 rounded-xl font-semibold text-base transition-all bg-[#1E2D4D] text-white hover:bg-[#162340] shadow-sm hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Start Free Trial
                </button>
                <p className="text-xs text-center text-[#1E2D4D]/50 mt-2">30 days free, then ${billingCycle === 'monthly' ? `${founderSingle.monthlyPrice}/mo` : `${founderSingle.annualPrice}/yr`}. Cancel anytime.</p>
              </div>
            </div>
          </div>

          {/* Founder Multi Card */}
          <div className="relative">
            <div className="bg-white rounded-xl p-5 sm:p-8 relative border-2 border-[#1E2D4D] shadow-sm h-full flex flex-col">
              <div className="mb-6 pt-2">
                <div className="text-sm font-bold text-[#1E2D4D] uppercase tracking-wider mb-1">
                  {founderMulti.name}
                </div>
                <div className="text-sm font-semibold text-[#1E2D4D]">{founderMulti.subtitle}</div>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-[#1E2D4D]">
                    ${founderMulti.basePrice}
                  </span>
                  <span className="text-lg text-[#1E2D4D]/70">/mo base</span>
                </div>
                <div className="text-sm text-[#1E2D4D]/80 font-medium mt-2">
                  + ${founderMulti.additionalPrice}/mo per additional location (up to 10)
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {founderMulti.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[#1E2D4D]/80">
                    <Check className="w-5 h-5 text-[#1E2D4D] flex-shrink-0 mt-0.5" strokeWidth={3} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div>
                <button
                  onClick={() => { trackEvent('cta_click', { cta: 'pricing_founder_multi', page: 'landing', billing: billingCycle }); navigate('/signup'); }}
                  className="w-full py-4 px-6 rounded-xl font-semibold text-base transition-all bg-[#1E2D4D] text-white hover:bg-[#162340] shadow-sm hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Start Free Trial
                </button>
                <p className="text-xs text-center text-[#1E2D4D]/50 mt-2">30 days free. Price locked forever.</p>
              </div>
            </div>
          </div>

          {/* Enterprise/Custom Card */}
          <div id="contact" className="bg-white rounded-xl p-5 sm:p-8 border-2 border-[#1E2D4D]/10 shadow-sm h-full flex flex-col">
            <div className="mb-6 pt-2">
              <div className="text-xl font-bold text-[#1E2D4D] mb-1">
                {enterprise.name}
              </div>
              <div className="text-base text-[#1E2D4D]/70">{enterprise.subtitle}</div>
            </div>

            <div className="mb-8">
              <div className="text-4xl font-extrabold text-[#1E2D4D] mb-2">Custom</div>
              <div className="text-[#1E2D4D]/70">Tailored to your needs</div>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              {enterprise.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-[#1E2D4D]/80">
                  <Check className="w-5 h-5 text-[#1E2D4D] flex-shrink-0 mt-0.5" strokeWidth={3} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-4">
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('cta_click', { cta: 'pricing_enterprise_calendly', page: 'landing' })}
                className="block w-full py-4 px-6 rounded-xl font-semibold text-base transition-all bg-white text-[#1E2D4D] border-2 border-[#1E2D4D] hover:bg-[#1E2D4D] hover:text-white shadow-sm hover:shadow-md text-center"
              >
                Schedule a Call
              </a>
              <div className="space-y-2">
                <a
                  href="mailto:founders@getevidly.com"
                  className="flex items-center justify-center gap-2 text-sm text-[#1E2D4D]/70 hover:text-[#1E2D4D] transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  founders@getevidly.com
                </a>
                <a
                  href="tel:+18553843591"
                  className="flex items-center justify-center gap-2 text-sm text-[#1E2D4D]/70 hover:text-[#1E2D4D] transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  (855) EVIDLY1
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* K2C Badge */}
        <K2CPricingBadge />

        {/* Trust Statement */}
        <div className="text-center mt-12">
          <p className="text-sm text-[#1E2D4D]/50">
            30-day free trial &bull; 45-day money-back guarantee &bull; No setup fees &bull; Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
