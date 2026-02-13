import { useState } from 'react';
import { Building, Building2, Plus, Minus, Phone, Mail, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SignupLocations() {
  const [selectedType, setSelectedType] = useState<'single' | 'multiple' | 'enterprise' | null>(null);
  const [locationCount, setLocationCount] = useState(2);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const navigate = useNavigate();

  const calculatePricing = () => {
    const standardBasePrice = 199;
    const standardPerLocationPrice = 99;
    const founderBasePrice = 99;
    const founderPerLocationPrice = 49;

    if (selectedType === 'single') {
      const monthlyTotal = founderBasePrice;
      const standardMonthlyTotal = standardBasePrice;
      const annualTotal = monthlyTotal * 10;
      const monthlySavings = standardMonthlyTotal - monthlyTotal;
      const annualSavings = monthlySavings * 12;
      const savingsPercent = Math.round((monthlySavings / standardMonthlyTotal) * 100);

      return {
        monthly: monthlyTotal,
        standardMonthly: standardMonthlyTotal,
        annual: annualTotal,
        annualFreeSavings: monthlyTotal * 2,
        monthlySavings,
        annualSavings,
        savingsPercent
      };
    }

    const additionalLocations = locationCount - 1;
    const monthlyTotal = founderBasePrice + (additionalLocations * founderPerLocationPrice);
    const standardMonthlyTotal = standardBasePrice + (additionalLocations * standardPerLocationPrice);
    const annualTotal = monthlyTotal * 10;
    const monthlySavings = standardMonthlyTotal - monthlyTotal;
    const annualSavings = monthlySavings * 12;
    const savingsPercent = Math.round((monthlySavings / standardMonthlyTotal) * 100);

    return {
      monthly: monthlyTotal,
      standardMonthly: standardMonthlyTotal,
      annual: annualTotal,
      annualFreeSavings: monthlyTotal * 2,
      monthlySavings,
      annualSavings,
      savingsPercent,
      standardBasePrice,
      standardPerLocationPrice,
      founderBasePrice,
      founderPerLocationPrice
    };
  };

  const pricing = calculatePricing();

  const handleContinue = () => {
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="flex items-center">
              <div className="w-12 h-14">
                <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#d4af37"/>
                  <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill="#1e4d6b"/>
                  <path d="M22 32L26 36L34 26" stroke="#d4af37" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="ml-3 text-3xl font-bold">
                <span className="text-[#1e4d6b]">Evid</span>
                <span className="text-[#d4af37]">LY</span>
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">How many locations will you be managing?</h1>
          <p className="text-lg text-gray-600">Choose the option that best fits your business</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setSelectedType('single')}
            className={`relative bg-white rounded-xl p-8 shadow-sm border border-gray-200 hover:shadow-xl transition-all cursor-pointer ${
              selectedType === 'single' ? 'ring-4 ring-[#1e4d6b] ring-opacity-50' : ''
            } ${selectedType && selectedType !== 'single' ? 'opacity-40' : ''}`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Building className="h-10 w-10 text-[#1e4d6b]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Single Location</h3>
              <p className="text-gray-600">1 location, 1 address</p>
            </div>
            {selectedType === 'single' && (
              <div className="absolute top-4 right-4 w-6 h-6 bg-[#1e4d6b] rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>

          <button
            onClick={() => setSelectedType('multiple')}
            className={`relative bg-white rounded-xl p-8 shadow-sm border border-gray-200 hover:shadow-xl transition-all cursor-pointer ${
              selectedType === 'multiple' ? 'ring-4 ring-[#1e4d6b] ring-opacity-50' : ''
            } ${selectedType && selectedType !== 'multiple' ? 'opacity-40' : ''}`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-10 w-10 text-[#1e4d6b]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Multiple Locations</h3>
              <p className="text-gray-600">2+ locations, multiple addresses</p>
            </div>
            {selectedType === 'multiple' && (
              <div className="absolute top-4 right-4 w-6 h-6 bg-[#1e4d6b] rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>

          <button
            onClick={() => setSelectedType('enterprise')}
            className={`relative bg-white rounded-xl p-8 shadow-sm border border-gray-200 hover:shadow-xl transition-all cursor-pointer ${
              selectedType === 'enterprise' ? 'ring-4 ring-[#1e4d6b] ring-opacity-50' : ''
            } ${selectedType && selectedType !== 'enterprise' ? 'opacity-40' : ''}`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Layers className="h-10 w-10 text-[#1e4d6b]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-600">Large organizations with dedicated support</p>
            </div>
            {selectedType === 'enterprise' && (
              <div className="absolute top-4 right-4 w-6 h-6 bg-[#1e4d6b] rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        </div>

        {selectedType === 'multiple' && (
          <div className="mb-8 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <label className="block text-center text-lg font-medium text-gray-900 mb-4">
              Number of Locations
            </label>
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setLocationCount(Math.max(2, locationCount - 1))}
                className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
              >
                <Minus className="h-6 w-6 text-gray-700" />
              </button>
              <div className="text-5xl font-bold text-[#1e4d6b] w-24 text-center">
                {locationCount}
              </div>
              <button
                onClick={() => setLocationCount(Math.min(10, locationCount + 1))}
                className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
              >
                <Plus className="h-6 w-6 text-gray-700" />
              </button>
            </div>
          </div>
        )}

        {selectedType === 'enterprise' && (
          <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-xl p-8 text-white shadow-sm">
            <h3 className="text-2xl font-bold mb-4">Enterprise Plan (11+ Locations)</h3>
            <p className="text-lg mb-6">
              For 11+ locations, we offer custom pricing with dedicated onboarding and a success manager.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center space-x-3">
                <Phone className="h-6 w-6 text-[#d4af37]" />
                <div>
                  <div className="text-sm text-gray-300">Phone</div>
                  <div className="font-semibold">(855) 384-3591</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-6 w-6 text-[#d4af37]" />
                <div>
                  <div className="text-sm text-gray-300">Email</div>
                  <div className="font-semibold">sales@getevidly.com</div>
                </div>
              </div>
            </div>
            <button className="w-full py-4 bg-[#1e4d6b] text-white rounded-lg text-lg font-bold hover:bg-[#2a6a8f] active:bg-[#1e4d6b] transition-colors shadow-sm">
              Schedule a Demo
            </button>
          </div>
        )}

        {selectedType && selectedType !== 'enterprise' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900">Your Plan</h2>
                <div className="inline-flex items-center bg-[#d4af37] text-white px-4 py-2 rounded-full text-sm font-bold">
                  Founder Pricing — Locked Forever
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Founder Tier 1 • Up to 10 locations
              </div>
            </div>

            <div className="mb-6 space-y-4">
              <div className="space-y-3 pb-4 border-b">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Base (1 location)</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#d4af37]">${pricing.founderBasePrice || 99}/mo</span>
                    <span className="text-gray-400 line-through">${pricing.standardBasePrice || 199}/mo</span>
                  </div>
                </div>
                {selectedType === 'multiple' && locationCount > 1 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Additional locations ({locationCount - 1})</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[#d4af37]">${pricing.founderPerLocationPrice || 49} each</span>
                      <span className="text-gray-400 line-through">${pricing.standardPerLocationPrice || 99} each</span>
                    </div>
                  </div>
                )}
                {selectedType === 'multiple' && locationCount > 1 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Subtotal for {locationCount - 1} locations</span>
                    <span className="font-semibold text-gray-700">${(locationCount - 1) * (pricing.founderPerLocationPrice || 49)}/mo</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold text-gray-900">Monthly Total</span>
                  <span className="font-bold text-2xl text-[#d4af37]">${pricing.monthly}/mo</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Standard price would be:</span>
                  <span className="text-gray-400 line-through">${pricing.standardMonthly}/mo</span>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-green-800">YOU SAVE:</span>
                    <div className="text-right">
                      <div className="font-bold text-green-800">${pricing.monthlySavings}/mo ({pricing.savingsPercent}%)</div>
                      <div className="text-sm text-green-700">${pricing.annualSavings}/year</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-3 mb-6">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-[#1e4d6b] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  billingPeriod === 'annual'
                    ? 'bg-[#1e4d6b] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Annual
              </button>
            </div>

            {billingPeriod === 'annual' && (
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  ${pricing.annual}/year
                </div>
                <div className="text-green-600 font-semibold text-lg">
                  Get 2 months free! Save ${pricing.annualFreeSavings}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Plus your founder discount of ${pricing.annualSavings}/year
                </div>
              </div>
            )}

            <div className="space-y-3 mb-8 text-gray-700">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>All features included</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>AI Advisor</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>QR Passport</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Priority support</span>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="w-full py-4 bg-[#1e4d6b] text-white rounded-lg text-lg font-bold hover:bg-[#2a6a8f] active:bg-[#1e4d6b] transition-colors shadow-sm"
            >
              Continue to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
