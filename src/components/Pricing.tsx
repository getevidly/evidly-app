import { Check, Mail, Phone, Gift, CreditCard } from 'lucide-react';
import { EvidlyIcon } from './ui/EvidlyIcon';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../utils/analytics';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const navigate = useNavigate();

  const founderTier = {
    name: 'Founder Pricing',
    originalPrice: 199,
    monthlyPrice: 99,
    additionalLocation: 49,
    annualPrice: 990,
    annualOriginalPrice: 2388,
    annualSavings: 1200,
    features: [
      '45+ compliance features included',
      'Up to 10 locations',
      'Unlimited users',
      'Price locked forever',
      'Priority email support (4hr response)',
      'In-app chat support',
      'Phone support (business hours)',
      'Dedicated 1-on-1 onboarding call',
      'Quarterly account review',
      'Direct founder access',
    ],
  };

  const enterpriseTier = {
    name: 'Enterprise',
    subtitle: '11+ locations, custom pricing',
    features: [
      'Everything in Founder',
      'Dedicated success manager',
      'Custom SLA with guaranteed response times',
      'Custom integrations & API access',
      'On-site training available',
      'Volume discounts',
    ],
  };

  return (
    <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block text-sm font-bold text-[#d4af37] uppercase tracking-wider mb-4">
            Pricing
          </span>
          <h2 className="font-['Outfit'] text-4xl md:text-5xl font-bold text-[#1e4d6b] tracking-tight">
            Lock in founder pricing today
          </h2>
        </div>

        {/* Risk-Free Guarantee Banner */}
        <div className="max-w-3xl mx-auto mb-10 rounded-2xl p-6 text-center" style={{ backgroundColor: '#eef4f8', border: '2px solid #b8d4e8' }}>
          <div className="flex items-center justify-center gap-3 mb-3">
            <EvidlyIcon size={28} />
            <h3 className="text-xl font-bold" style={{ color: '#1e4d6b' }}>Risk-Free Guarantee</h3>
          </div>
          <p className="text-gray-700 max-w-xl mx-auto leading-relaxed">
            Try EvidLY <strong>free for 30 days</strong> with full access to every feature.
            Not convinced? Get a <strong>full refund within 45 days</strong> of your first payment. No questions asked.
          </p>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5"><Gift className="w-4 h-4 text-[#d4af37]" />30-day free trial</span>
            <span className="flex items-center gap-1.5"><EvidlyIcon size={16} />45-day money-back</span>
            <span className="flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-[#d4af37]" />Cancel anytime</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
          {/* Founder Pricing Card */}
          <div className="relative">
            <div className="bg-white rounded-xl p-5 sm:p-8 relative border-4 border-[#d4af37] shadow-sm shadow-[#d4af37]/20 h-full flex flex-col">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2">
                <span className="px-4 py-2 bg-[#d4af37] text-[#1e4d6b] text-sm font-bold rounded-full uppercase tracking-wider shadow-sm">
                  Best Value
                </span>
                <span className="px-4 py-2 bg-[#16a34a] text-white text-sm font-bold rounded-full uppercase tracking-wider shadow-sm">
                  30 Days Free
                </span>
              </div>

              {/* Founder Urgency Banner */}
              <div className="mb-4 pt-6 -mx-5 px-5 sm:-mx-8 sm:px-8">
                <div className="bg-gradient-to-r from-[#d4af37]/10 to-[#d4af37]/5 border border-[#d4af37]/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-[#1e4d6b]">Founder Pricing — Only 87 of 100 spots remaining</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-[#d4af37] h-2.5 rounded-full" style={{ width: '13%' }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">13 spots claimed — price locks forever when you sign up</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-sm font-bold text-[#d4af37] uppercase tracking-wider mb-1">
                  {founderTier.name}
                </div>
                <div className="text-sm font-semibold text-[#1e4d6b]">Price Locked Forever</div>
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-3 mb-6 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-[#1e4d6b] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    billingCycle === 'annual'
                      ? 'bg-white text-[#1e4d6b] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Annual
                </button>
              </div>

              {billingCycle === 'monthly' ? (
                <>
                  <div className="mb-4">
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-500">Standard:</span>
                      <span className="ml-2 text-xl font-bold text-gray-400 line-through">
                        ${founderTier.originalPrice}/month
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-[#1e4d6b]">Founder:</span>
                      <span className="text-4xl sm:text-6xl font-extrabold text-[#1e4d6b]">
                        ${founderTier.monthlyPrice}
                      </span>
                      <span className="text-lg sm:text-xl text-gray-600">/month</span>
                    </div>
                    <div className="text-sm sm:text-base text-gray-700 font-medium mt-3">
                      + ${founderTier.additionalLocation}/month per additional location (up to 10)
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }} className="rounded-lg p-3 mb-4">
                    <p className="text-sm font-semibold" style={{ color: '#166534' }}>
                      Save $1,200/year — 50% off future standard pricing
                    </p>
                  </div>
                  <div style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }} className="rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <EvidlyIcon size={24} className="flex-shrink-0" />
                      <div>
                        <p className="font-semibold" style={{ color: '#1e4d6b' }}>45-Day Money-Back Guarantee</p>
                        <p className="text-sm mt-1" style={{ color: '#3a6d8a' }}>
                          Try EvidLY risk-free. If you're not satisfied within 45 days of your first payment, get a full refund — no questions asked.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-500">Standard:</span>
                      <span className="ml-2 text-xl font-bold text-gray-400 line-through">
                        ${founderTier.annualOriginalPrice.toLocaleString()}/year
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-[#1e4d6b]">Founder:</span>
                      <span className="text-4xl sm:text-6xl font-extrabold text-[#1e4d6b]">
                        ${founderTier.annualPrice}
                      </span>
                      <span className="text-lg sm:text-xl text-gray-600">/year</span>
                    </div>
                    <div className="text-sm sm:text-base text-gray-700 font-medium mt-3">
                      + ${founderTier.additionalLocation}/month per additional location (up to 10)
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }} className="rounded-lg p-3 mb-4">
                    <p className="text-sm font-semibold" style={{ color: '#166534' }}>
                      2 months free &bull; Save ${founderTier.annualSavings.toLocaleString()}/year
                    </p>
                  </div>
                  <div style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }} className="rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <EvidlyIcon size={24} className="flex-shrink-0" />
                      <div>
                        <p className="font-semibold" style={{ color: '#1e4d6b' }}>45-Day Money-Back Guarantee</p>
                        <p className="text-sm mt-1" style={{ color: '#3a6d8a' }}>
                          Try EvidLY risk-free. If you're not satisfied within 45 days of your first payment, get a full refund — no questions asked.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <ul className="space-y-3 mb-8 flex-grow">
                {founderTier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-[#d4af37] flex-shrink-0 mt-0.5" strokeWidth={3} />
                    <span>
                      {feature}
                      {idx === 0 && (
                        <button
                          onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                          className="ml-2 text-sm text-[#1e4d6b] hover:text-[#2a6a8f] underline font-medium bg-transparent border-none cursor-pointer p-0"
                        >
                          See all features
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <div>
                <button
                  onClick={() => { trackEvent('cta_click', { cta: 'pricing_start_trial', page: 'landing', billing: billingCycle }); navigate('/signup'); }}
                  className="w-full py-4 px-6 rounded-xl font-semibold text-base transition-all bg-[#1e4d6b] text-white hover:bg-[#163a52] shadow-sm hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Start Free Trial
                </button>
                <p className="text-xs text-center text-gray-500 mt-2">30 days free, then {billingCycle === 'monthly' ? `$${founderTier.monthlyPrice}/mo` : `$${founderTier.annualPrice}/yr`}. Cancel anytime.</p>
              </div>
            </div>
          </div>

          {/* Enterprise Card */}
          <div id="contact" className="bg-white rounded-xl p-5 sm:p-8 border-2 border-gray-200 shadow-sm h-full flex flex-col">
            <div className="mb-6">
              <div className="text-xl font-bold text-[#1e4d6b] mb-1">
                {enterpriseTier.name}
              </div>
              <div className="text-base text-gray-600">{enterpriseTier.subtitle}</div>
            </div>

            <div className="mb-8">
              <div className="text-4xl font-extrabold text-[#1e4d6b] mb-2">Custom</div>
              <div className="text-gray-600">Tailored to your needs</div>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              {enterpriseTier.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-700">
                  <Check className="w-5 h-5 text-[#1e4d6b] flex-shrink-0 mt-0.5" strokeWidth={3} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-4">
              <a
                href="mailto:founders@getevidly.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-4 px-6 rounded-xl font-semibold text-base transition-all bg-white text-[#1e4d6b] border-2 border-[#1e4d6b] hover:bg-[#1e4d6b] hover:text-white shadow-sm hover:shadow-md text-center"
              >
                Contact Sales
              </a>
              <div className="space-y-2">
                <a
                  href="mailto:founders@getevidly.com"
                  className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-[#1e4d6b] transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  founders@getevidly.com
                </a>
                <a
                  href="tel:+18553843591"
                  className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-[#1e4d6b] transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  (855) EVIDLY1
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Statement */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            30-day free trial &bull; 45-day money-back guarantee &bull; No setup fees &bull; Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
