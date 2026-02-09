import { Check } from 'lucide-react';

const featureCategories = [
  {
    title: 'Temperature Management',
    features: [
      'Digital temperature logging',
      'FDA limit auto-checking',
      'Pass/fail instant feedback',
      'Receiving temperature logs',
      '2-stage cooldown tracking',
      'Temperature history & reports',
      'Equipment management',
      'Corrective action tracking',
    ],
  },
  {
    title: 'Checklists & Tasks',
    features: [
      'Opening/closing checklists',
      'Custom checklist templates',
      'Daily/weekly/monthly schedules',
      'Photo documentation',
      'Corrective action workflows',
      'Completion tracking & reports',
    ],
  },
  {
    title: 'Document Management',
    features: [
      'Unlimited document storage',
      'Expiration tracking & alerts',
      'AI document analysis',
      'Category organization',
      'Version history',
      'Bulk upload',
    ],
  },
  {
    title: 'Vendor Management',
    features: [
      'Vendor profiles & contacts',
      'Upload request portal (no vendor login needed)',
      'Document tracking per vendor',
      'Performance scorecards',
      'Service history',
      'Automated reminders',
    ],
  },
  {
    title: 'Compliance & Scoring',
    features: [
      'Real-time compliance scoring',
      '3-pillar breakdown (Operational, Equipment, Documentation)',
      'QR compliance passports',
      'Inspection-ready reports',
      'Score trend tracking',
      'Predictive compliance alerts',
    ],
  },
  {
    title: 'AI & Automation',
    features: [
      'AI compliance advisor (chat)',
      'Automated email/SMS alerts',
      'Weekly compliance digests',
      'Predictive risk alerts',
      'Smart notifications',
      'Automated report delivery',
    ],
  },
  {
    title: 'Team & Locations',
    features: [
      'Unlimited users',
      'Role-based access (Owner, Manager, Staff)',
      'Employee certification tracking',
      'Multi-location management',
      'Location leaderboard',
      'Team activity reports',
      'SMS & email team invites',
    ],
  },
];

export default function AllFeatures() {
  return (
    <section id="features" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-bold text-[#d4af37] uppercase tracking-wider mb-4">
            Complete Feature List
          </span>
          <h2 className="font-['Outfit'] text-4xl md:text-5xl font-bold text-[#1e4d6b] tracking-tight mb-4">
            Everything you need for food safety compliance
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            45+ features built for restaurants, food manufacturers, and food service operations
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureCategories.map((category, idx) => (
            <div
              key={idx}
              className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-[#d4af37] transition-all hover:shadow-lg"
            >
              <h3 className="text-[1.3rem] font-bold text-[#1e4d6b] mb-4">{category.title}</h3>
              <ul className="space-y-3">
                {category.features.map((feature, featureIdx) => (
                  <li key={featureIdx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#d4af37] flex-shrink-0 mt-0.5" strokeWidth={3} />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-6">
            All features included in every plan. No hidden costs or feature tiers.
          </p>
          <button
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-block px-8 py-4 bg-[#1e4d6b] text-white rounded-xl font-semibold hover:bg-[#2a6a8f] shadow-lg hover:shadow-xl transition-all"
          >
            See Pricing
          </button>
        </div>
      </div>
    </section>
  );
}
