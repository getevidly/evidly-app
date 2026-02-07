import { Check, Mail, Phone, Shield } from 'lucide-react';
import { useState } from 'react';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

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
    <section id="pricing" className="py-24 px-6 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-bold text-[#d4af37] uppercase tracking-wider mb-4">
            Pricing
          </span>
          <h2 className="font-['Outfit'] text-4xl md:text-5xl font-bold text-[#1b4965] tracking-tight">
            Lock in founder pricing today
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Founder Pricing Card */}
          <div className="relative">
            <div className="bg-white rounded-2xl p-8 relative border-4 border-[#d4af37] shadow-2xl shadow-[#d4af37]/20 h-full flex flex-col">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#d4af37] text-[#1b4965] text-sm font-bold rounded-full uppercase tracking-wider shadow-lg">
                Best Value
              </div>

              <div className="mb-6 pt-4">
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
                      ? 'bg-white text-[#1b4965] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    billingCycle === 'annual'
                      ? 'bg-white text-[#1b4965] shadow-sm'
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
                      <span className="text-6xl font-extrabold text-[#1e4d6b]">
                        ${founderTier.monthlyPrice}
                      </span>
                      <span className="text-xl text-gray-600">/month</span>
                    </div>
                    <div className="text-gray-700 font-medium mt-3">
                      + ${founderTier.additionalLocation}/month per additional location (up to 10)
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-semibold text-green-800">
                      Save $1,200/year — 50% off future standard pricing
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <Shield className="w-6 h-6 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-blue-900">60-Day Money-Back Guarantee</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Try EvidLY risk-free. If you're not satisfied within 60 days, get a full refund — no questions asked.
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
                      <span className="text-6xl font-extrabold text-[#1e4d6b]">
                        ${founderTier.annualPrice}
                      </span>
                      <span className="text-xl text-gray-600">/year</span>
                    </div>
                    <div className="text-gray-700 font-medium mt-3">
                      + ${founderTier.additionalLocation}/month per additional location (up to 10)
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-semibold text-green-800">
                      2 months free • Save ${founderTier.annualSavings.toLocaleString()}/year
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <Shield className="w-6 h-6 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-blue-900">60-Day Money-Back Guarantee</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Try EvidLY risk-free. If you're not satisfied within 60 days, get a full refund — no questions asked.
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
                        <a
                          href="#features"
                          className="ml-2 text-sm text-[#1e4d6b] hover:text-[#2a6a8f] underline font-medium"
                        >
                          See all features
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <div>
                <button className="w-full py-4 px-6 rounded-xl font-semibold text-base transition-all bg-[#1e4d6b] text-white hover:bg-[#2a6a8f] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  Get Started
                </button>
              </div>
            </div>
          </div>

          {/* Enterprise Card */}
          <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg h-full flex flex-col">
            <div className="mb-6">
              <div className="text-xl font-bold text-[#1b4965] mb-1">
                {enterpriseTier.name}
              </div>
              <div className="text-base text-gray-600">{enterpriseTier.subtitle}</div>
            </div>

            <div className="mb-8">
              <div className="text-4xl font-extrabold text-[#1b4965] mb-2">Custom</div>
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
              <button className="w-full py-4 px-6 rounded-xl font-semibold text-base transition-all bg-white text-[#1e4d6b] border-2 border-[#1e4d6b] hover:bg-[#1e4d6b] hover:text-white shadow-md hover:shadow-lg">
                Contact Sales
              </button>
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
            All plans include a 60-day money-back guarantee • No setup fees • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
