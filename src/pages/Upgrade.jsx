/**
 * CPP-VENDOR-CONNECT-01 — Upgrade page.
 * Route: /upgrade (inside ProtectedLayout)
 *
 * Shows CPP Free vs EvidLY Standard comparison.
 * CTA: mailto founders@getevidly.com
 */
import { Link } from 'react-router-dom';
import { Check, Lock, Shield, Flame, FileText, Thermometer, ClipboardList, Users, BarChart3, Mic, Brain, Calendar } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';

const FREE_FEATURES = [
  { label: 'Hood cleaning service records', included: true },
  { label: 'Hood cleaning certificates', included: true },
  { label: 'Next hood service date + alerts', included: true },
  { label: 'PSE status — hood pillar only', included: true },
  { label: 'My Vendors — add & view', included: true },
  { label: 'Service requests (any vendor)', included: true },
  { label: 'Community forum — read only', included: true },
];

const PAID_FEATURES = [
  { icon: Shield, label: 'Full PSE compliance tracking (all 4 pillars)' },
  { icon: Thermometer, label: 'Temperature logging & monitoring' },
  { icon: ClipboardList, label: 'Checklists & HACCP plans' },
  { icon: FileText, label: 'Document vault & AI validation' },
  { icon: BarChart3, label: 'Jurisdiction intelligence & benchmarks' },
  { icon: Users, label: 'Team & staff management' },
  { icon: Calendar, label: 'Calendar & scheduling' },
  { icon: Flame, label: 'Vendor Connect marketplace access' },
  { icon: Mic, label: 'Voice commands' },
  { icon: Brain, label: 'AI superpowers & insights' },
];

const PSE_PILLARS = [
  { num: 1, label: 'Hood Cleaning', status: 'active', color: '#16a34a' },
  { num: 2, label: 'Fire Suppression', status: 'locked', color: '#9ca3af' },
  { num: 3, label: 'Alarm Systems', status: 'locked', color: '#9ca3af' },
  { num: 4, label: 'Sprinkler Systems', status: 'locked', color: '#9ca3af' },
];

export function Upgrade() {
  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Upgrade' }]} />

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: '#1E2D4D' }}>
            Your hood is covered. Protect your whole kitchen.
          </h1>
          <p className="text-[#1E2D4D]/50 text-sm max-w-lg mx-auto">
            You're getting free hood cleaning compliance through your CPP relationship.
            Upgrade to protect every aspect of your kitchen's compliance.
          </p>
        </div>

        {/* PSE Pillars Visual */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PSE_PILLARS.map(p => (
            <div
              key={p.num}
              className="rounded-xl p-4 text-center border"
              style={{
                borderColor: p.status === 'active' ? '#16a34a' : '#e5e7eb',
                background: p.status === 'active' ? '#f0fdf4' : '#f9fafb',
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold"
                style={{
                  background: p.status === 'active' ? '#16a34a' : '#e5e7eb',
                  color: p.status === 'active' ? 'white' : '#9ca3af',
                }}
              >
                {p.status === 'active' ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <p className="text-xs font-semibold" style={{ color: p.color }}>
                Pillar {p.num}
              </p>
              <p className="text-xs text-[#1E2D4D]/50 mt-0.5">{p.label}</p>
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* CPP Free */}
          <div className="rounded-xl border border-[#1E2D4D]/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1E2D4D]/5">
              <p className="text-xs font-semibold text-[#1E2D4D]/30 uppercase tracking-wider">Current Plan</p>
              <p className="text-lg font-bold text-[#1E2D4D] mt-1">CPP Free</p>
              <p className="text-xs text-[#1E2D4D]/50">Included with your CPP service</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {FREE_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-[#1E2D4D]/80">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* EvidLY Standard */}
          <div
            className="rounded-xl border-2 overflow-hidden"
            style={{ borderColor: '#A08C5A' }}
          >
            <div className="px-5 py-4" style={{ background: '#1E2D4D' }}>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: '#A08C5A' }}
              >
                Recommended
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-lg font-bold text-white">EvidLY Standard</p>
                <p className="text-sm text-[#1E2D4D]/30">$99/mo</p>
              </div>
              <p className="text-xs text-[#1E2D4D]/30 mt-0.5">Founder pricing — locked through August 7, 2026</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider mb-2">
                Everything in CPP Free, plus:
              </p>
              {PAID_FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="flex items-start gap-2">
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#A08C5A' }} />
                    <span className="text-sm text-[#1E2D4D]/80">{f.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-4 border-t border-[#1E2D4D]/5">
              <a
                href="mailto:founders@getevidly.com?subject=EvidLY Upgrade — Founder Pricing"
                className="w-full flex items-center justify-center px-4 py-3 text-white text-sm font-semibold rounded-xl transition-colors"
                style={{ background: '#A08C5A' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#9A8450')}
                onMouseLeave={e => (e.currentTarget.style.background = '#A08C5A')}
              >
                Upgrade Now →
              </a>
              <p className="text-center text-xs text-[#1E2D4D]/30 mt-2">
                Or call (559) 761-5502
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-xl border border-[#1E2D4D]/10 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#1E2D4D]">Frequently Asked Questions</h2>
          <div>
            <p className="text-sm font-medium text-[#1E2D4D]/90">What happens to my hood cleaning records?</p>
            <p className="text-xs text-[#1E2D4D]/50 mt-1">
              Nothing changes. Your hood cleaning records, certificates, and service dates stay free forever through your CPP relationship.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-[#1E2D4D]/90">Can I cancel anytime?</p>
            <p className="text-xs text-[#1E2D4D]/50 mt-1">
              Yes. Cancel anytime and you'll revert to CPP Free. Your hood cleaning data stays intact.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-[#1E2D4D]/90">What is Founder pricing?</p>
            <p className="text-xs text-[#1E2D4D]/50 mt-1">
              Early adopters lock in $99/mo. This rate is guaranteed through August 7, 2026 — the price goes up after that.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
