/**
 * SERVICE-PROVIDER-1 — Public Invite Landing Page
 *
 * Route: /vendor/invite/:code (public, no auth required)
 *
 * Shows branded landing page when a client clicks an invite link
 * from their service provider. CTA leads to signup.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Shield, Calendar, FileText, BarChart3 } from 'lucide-react';

const NAVY = '#1e4d6b';
const GOLD = '#d4af37';

// Demo provider lookup — in production this would be an API call
const DEMO_PROVIDERS: Record<string, { name: string; services: string[]; serviceArea: string }> = {
  'cleaning-pros-plus-llc': {
    name: 'Cleaning Pros Plus, LLC',
    services: ['Hood Cleaning / Exhaust Cleaning', 'Fan Performance Management', 'Grease Filter Exchange', 'Rooftop Grease Containment'],
    serviceArea: 'Central Valley, Northern California',
  },
};

const BENEFITS = [
  { icon: Shield, title: 'All compliance records in one place', description: 'Food safety + facility safety tracking with real-time scoring' },
  { icon: Calendar, title: 'Automated service scheduling', description: 'Your hood cleaning schedule, reminders, and service reports — always up to date' },
  { icon: FileText, title: 'Documents on file automatically', description: 'COI, certifications, and service reports shared instantly — no more email requests' },
  { icon: BarChart3, title: 'Inspection-ready compliance score', description: 'Know exactly where you stand before any health or fire inspector walks in' },
];

export function VendorInviteLanding() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const provider = DEMO_PROVIDERS[code || ''] || {
    name: code?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Your Service Provider',
    services: ['Service management'],
    serviceArea: '',
  };

  return (
    <div className="min-h-screen bg-[#faf8f3]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-10">
              <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill={GOLD} />
                <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill={NAVY} />
                <path d="M22 32L26 36L34 26" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-bold">
              <span style={{ color: NAVY }}>Evid</span>
              <span style={{ color: GOLD }}>LY</span>
            </span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            style={{ color: NAVY }}
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-10">
          {/* Provider badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
            style={{ backgroundColor: '#eef4f8', color: NAVY }}
          >
            <CheckCircle size={16} style={{ color: '#16a34a' }} />
            Invited by {provider.name}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Join EvidLY — the compliance<br />platform for commercial kitchens
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {provider.name} uses EvidLY to manage your service records, documentation, and scheduling.
            Sign up and they'll be automatically linked as your vendor — COI, certifications, and
            service schedule ready from day one.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={() => navigate(`/signup?invite=${code}`)}
            className="px-8 py-3 text-white font-semibold rounded-lg text-lg shadow-lg transition-colors"
            style={{ backgroundColor: NAVY }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#163a52')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = NAVY)}
          >
            Sign Up Free
          </button>
          <span className="text-sm text-gray-500">Takes about 10 minutes to set up</span>
        </div>

        {/* Services from provider */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Services {provider.name} provides you:
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {provider.services.map(svc => (
              <div key={svc} className="flex items-center gap-2">
                <CheckCircle size={16} style={{ color: '#16a34a' }} />
                <span className="text-sm text-gray-700">{svc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-6">What you get with EvidLY</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {BENEFITS.map(b => (
            <div key={b.title} className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#eef4f8' }}>
                <b.icon size={20} style={{ color: NAVY }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{b.title}</h3>
                <p className="text-xs text-gray-500">{b.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Ready to get started?</h2>
          <p className="text-sm text-gray-500 mb-4">
            Your compliance records, vendor management, and facility safety — all in one place.
          </p>
          <button
            onClick={() => navigate(`/signup?invite=${code}`)}
            className="px-8 py-3 text-white font-semibold rounded-lg shadow transition-colors"
            style={{ backgroundColor: NAVY }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#163a52')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = NAVY)}
          >
            Sign Up Free
          </button>
          <p className="text-xs text-gray-400 mt-3">
            Already have an account? <button onClick={() => navigate('/login')} className="underline" style={{ color: NAVY }}>Sign in</button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 text-center">
        <p className="text-xs text-gray-400">
          <span className="font-semibold" style={{ color: NAVY }}>Evid</span>
          <span className="font-semibold" style={{ color: GOLD }}>LY</span>
          {' '}&middot; Compliance platform for commercial kitchens
        </p>
      </footer>
    </div>
  );
}
