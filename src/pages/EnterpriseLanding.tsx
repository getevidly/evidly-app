import {
  Building2, Network, KeyRound, Palette, Globe,
  BarChart3, Headphones, ArrowRight, Lock, Layers, Users, Zap,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useNavigate } from 'react-router-dom';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export function EnterpriseLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #eef4f8 0%, #ffffff 50%)', ...F }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#1E2D4D' }}>
            <EvidlyIcon size={40} />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl font-bold tracking-tight text-[#1E2D4D]">Evid</span>
            <span className="text-2xl font-bold tracking-tight" style={{ color: '#A08C5A' }}>LY</span>
          </div>
          <p className="text-sm font-medium text-[#1E2D4D]/50 mb-6">for Enterprise</p>
          <h1 className="text-3xl font-bold tracking-tight text-[#1E2D4D] mb-3">White-Label Compliance for Global Organizations</h1>
          <p className="text-lg text-[#1E2D4D]/70 max-w-xl mx-auto mb-4">
            Deploy EvidLY under your brand. Manage thousands of locations with SSO, custom hierarchy, and multi-region rollups.
          </p>
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border-2" style={{ borderColor: '#A08C5A', color: '#A08C5A' }}>
            Coming Soon
          </span>
        </div>

        {/* Target Enterprises */}
        <div className="mb-12">
          <p className="text-center text-sm text-[#1E2D4D]/50 font-medium mb-4">Built for the world's largest food service operators</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['Compass Group', 'Sodexo', 'Aramark', 'Kaiser', 'HCA Healthcare', 'CommonSpirit', 'Delaware North', 'Levy'].map(name => (
              <div key={name} className="bg-white rounded-xl border border-[#1E2D4D]/10 p-3 flex items-center justify-center">
                <span className="text-xs font-semibold text-[#1E2D4D]/30">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5 mb-8">
          <h2 className="text-xl font-bold text-[#1E2D4D] mb-6">Enterprise Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: KeyRound, title: 'SSO & Identity', desc: 'SAML 2.0 and OIDC integration with Okta, Azure AD, and any IdP. SCIM 2.0 automated user provisioning.' },
              { icon: Network, title: 'Custom Hierarchy', desc: 'Define your own organizational levels — corporate, division, region, district, location — with custom labels per tenant.' },
              { icon: Palette, title: 'White-Label Branding', desc: 'Full brand customization: colors, logos, custom domains, and "Powered by" control. Your platform, your brand.' },
              { icon: Layers, title: 'Multi-Region Rollups', desc: 'Compliance scores roll up from individual locations through districts, regions, and divisions to corporate view.' },
              { icon: Zap, title: 'API Access', desc: 'Full REST API for integration with your existing systems, BI tools, and custom dashboards.' },
              { icon: Headphones, title: 'Dedicated Support', desc: 'Named Customer Success Manager, SLA guarantees, quarterly business reviews, and 24/7 emergency support.' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-[#FAF7F0]">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#eef4f8' }}>
                  <item.icon className="h-5 w-5" style={{ color: '#1E2D4D' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1E2D4D]">{item.title}</h3>
                  <p className="text-xs text-[#1E2D4D]/50 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5 mb-8 text-center">
          <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Custom Pricing for 500+ Locations</h2>
          <p className="text-sm text-[#1E2D4D]/50 mb-6">Volume-based pricing tailored to your organization's needs</p>
          <div className="space-y-2 text-left max-w-md mx-auto">
            {[
              'Dedicated tenant with full white-label branding',
              'SSO / SCIM integration with your identity provider',
              'Custom organizational hierarchy and rollup dashboards',
              'Named Customer Success Manager',
              'SLA with 99.9% uptime guarantee',
              'Quarterly business reviews and optimization reports',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#1E2D4D' }} />
                <span className="text-sm text-[#1E2D4D]/70">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ROI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { value: '12%', label: 'Compliance Score Improvement', sub: 'Average across enterprise clients' },
            { value: '4.2 hrs', label: 'Saved per Week per Location', sub: 'Reduced manual compliance tasks' },
            { value: '$18K', label: 'Annual Savings per 100 Locations', sub: 'Reduced inspection and remediation costs' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 text-center">
              <p className="text-2xl font-bold tracking-tight" style={{ color: '#1E2D4D' }}>{item.value}</p>
              <p className="text-xs font-semibold text-[#1E2D4D] mt-1">{item.label}</p>
              <p className="text-xs text-[#1E2D4D]/30 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mb-12">
          <a
            href="mailto:enterprise@evidly.com?subject=Enterprise%20Demo%20Request"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold text-sm transition-colors"
            style={{ backgroundColor: '#1E2D4D' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#141E33')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1E2D4D')}
          >
            Request Enterprise Demo
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="text-xs text-[#1E2D4D]/30 mt-2">enterprise@evidly.com</p>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-[#1E2D4D]/10 text-center">
          <p className="text-xs text-[#1E2D4D]/30">
            Powered by{' '}
            <span className="font-semibold cursor-pointer hover:underline" style={{ color: '#1E2D4D' }} onClick={() => navigate('/')}>
              EvidLY
            </span>
            {' '}&mdash; Answers before you ask.
          </p>
        </div>
      </div>
    </div>
  );
}
