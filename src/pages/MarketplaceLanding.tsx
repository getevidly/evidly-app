import {
  UserPlus,
  TrendingUp,
  Flame,
  Wrench,
  ClipboardCheck,
  Award,
  BadgeCheck,
  Users,
  FileText,
  BarChart3,
  Link,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export function MarketplaceLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #eef4f8 0%, #ffffff 50%)', ...F }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#1e4d6b' }}>
            <EvidlyIcon size={40} />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl font-bold text-gray-900">Evid</span>
            <span className="text-2xl font-bold" style={{ color: '#d4af37' }}>LY</span>
          </div>
          <p className="text-sm font-medium text-gray-500 mb-6">Certified Provider Network</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Join the EvidLY Certified Provider Network</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Connect with 150+ commercial kitchens in your area. Get verified, receive leads, and grow your business.
          </p>
        </div>

        {/* How It Works */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">How It Works for Vendors</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: 1, icon: UserPlus, title: 'Create Your Profile', desc: 'Sign up free, add your services, certifications, and service area. Takes less than 10 minutes.' },
              { step: 2, icon: () => <EvidlyIcon size={24} />, title: 'Get EvidLY Verified', desc: 'Upload your credentials. Our team verifies your insurance, licenses, and certifications within 24 hours.' },
              { step: 3, icon: TrendingUp, title: 'Receive Qualified Leads', desc: 'Operators in your area find you through our marketplace. Accept quotes, schedule services, grow your business.' },
            ].map(item => (
              <div key={item.step} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 text-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-sm font-bold" style={{ backgroundColor: '#1e4d6b' }}>
                  {item.step}
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#eef4f8' }}>
                  <item.icon className="h-6 w-6" style={{ color: '#1e4d6b' }} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Service Categories */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Categories We Serve</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Flame, title: 'Fire Safety', subs: ['Hood Cleaning', 'Fire Suppression', 'Fire Extinguisher', 'Kitchen Fire Systems'] },
              { icon: () => <EvidlyIcon size={20} />, title: 'Food Safety', subs: ['Pest Control', 'Food Safety Consulting', 'ServSafe Training', 'Health Inspection Prep'] },
              { icon: Wrench, title: 'Equipment', subs: ['HVAC', 'Refrigeration', 'Grease Trap', 'Kitchen Equipment Repair', 'Plumbing'] },
              { icon: ClipboardCheck, title: 'Compliance', subs: ['Permit Consulting', 'Food Safety Inspections', 'HACCP Plan Development'] },
            ].map(cat => (
              <div key={cat.title} className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#eef4f8' }}>
                    <cat.icon className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{cat.title}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-12">
                  {cat.subs.map(sub => (
                    <span key={sub} className="px-2 py-0.5 text-[11px] rounded-full text-gray-600" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier Comparison */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">EvidLY Certification Tiers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: () => <EvidlyIcon size={24} />,
                iconColor: '#22c55e',
                accent: '#22c55e',
                tier: 'Verified',
                features: ['Free to join', 'Basic marketplace listing', 'Up to 5 leads/month', 'Credential verification'],
              },
              {
                icon: () => <EvidlyIcon size={24} />,
                iconColor: '#6b7280',
                accent: '#1e4d6b',
                tier: 'Certified',
                features: ['Meet quality thresholds for 3+ months', 'Unlimited leads', 'Priority placement', 'Analytics dashboard', 'EvidLY Certified badge'],
              },
              {
                icon: Award,
                iconColor: '#d4af37',
                accent: '#d4af37',
                tier: 'Preferred',
                features: ['Top 10% vendors for 6+ months', 'Top search placement', 'Featured in AI recommendations', 'EvidLY Preferred badge', 'Co-marketing opportunities'],
              },
            ].map(t => (
              <div key={t.tier} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: t.accent }} />
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#eef4f8' }}>
                    <t.icon className="h-6 w-6" style={{ color: t.iconColor }} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-4">{t.tier}</h3>
                  <div className="space-y-2 text-left">
                    {t.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: t.accent }} />
                        <span className="text-xs text-gray-600">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Why Vendors Choose EvidLY</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: BadgeCheck, title: 'Verified Credibility', desc: 'Your EvidLY badge tells operators your credentials are current and verified.' },
              { icon: Users, title: 'Qualified Leads', desc: 'Receive quote requests from verified commercial kitchen operators in your area.' },
              { icon: FileText, title: 'Digital Documentation', desc: "Upload service reports that auto-update your client's compliance records." },
              { icon: BarChart3, title: 'Performance Analytics', desc: 'Track profile views, conversion rates, and compare to your category average.' },
              { icon: Link, title: 'Compliance Integration', desc: "Your work directly updates the operator's compliance score and insurance risk profile." },
              { icon: Sparkles, title: 'Growth Platform', desc: 'Featured in AI-powered vendor recommendations sent to operators when services are due.' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#eef4f8' }}>
                  <item.icon className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center mb-10">
          <p className="text-sm text-gray-500 font-medium">
            Trusted by <span className="font-bold text-gray-900">150+ commercial kitchens</span> across California's Central Valley
          </p>
        </div>

        {/* Dual CTAs */}
        <div className="text-center mb-12">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/vendor/register')}
              className="px-8 py-3 rounded-lg text-white font-semibold text-sm transition-colors cursor-pointer"
              style={{ backgroundColor: '#1e4d6b' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#163a52')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
            >
              Join as a Vendor
            </button>
            <div className="text-center">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 rounded-lg font-semibold text-sm transition-colors bg-white cursor-pointer"
                style={{ border: '2px solid #1e4d6b', color: '#1e4d6b' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#eef4f8')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                Find a Vendor
              </button>
              <p className="text-[11px] text-gray-400 mt-1">Requires an operator account</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200 text-center">
          <p className="text-[11px] text-gray-400">
            Powered by{' '}
            <span
              className="font-semibold cursor-pointer hover:underline"
              style={{ color: '#1e4d6b' }}
              onClick={() => navigate('/')}
            >
              EvidLY
            </span>
            {' '}&mdash; Compliance Simplified
          </p>
        </div>
      </div>
    </div>
  );
}
