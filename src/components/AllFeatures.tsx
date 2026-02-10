import { Check } from 'lucide-react';

interface Feature {
  name: string;
  description: string;
  comingSoon?: boolean;
}

const featureCategories: { title: string; features: Feature[] }[] = [
  {
    title: 'Compliance Management',
    features: [
      { name: 'Compliance Scoring', description: 'Real-time scores across Operational (45%), Equipment (30%), and Documentation (25%) pillars with trend tracking' },
      { name: 'Multi-Location Dashboard', description: 'Aggregate and per-location compliance views with drill-down to individual scores' },
      { name: 'Temperature Logging', description: 'Digital temp checks for walk-ins, freezers, hot hold with in-range/out-of-range alerts' },
      { name: 'Daily Checklists', description: 'Opening, closing, and shift checklists with completion tracking and timestamps' },
      { name: 'Document Management', description: 'Store and track permits, licenses, certifications, and vendor docs with expiration alerts' },
      { name: 'Vendor Services', description: 'Track hood cleaning, fire suppression, grease trap, and HVAC service schedules and compliance' },
    ],
  },
  {
    title: 'Operations & Workflow',
    features: [
      { name: 'Role-Based Views', description: 'Management, Kitchen Staff, and Facilities dashboards tailored to each role' },
      { name: 'Action Center', description: 'Prioritized task management with overdue, due today, and upcoming items' },
      { name: 'Incident Log', description: 'Full lifecycle incident tracking from report to verified resolution with chain-of-custody, photo evidence, and compliance score integration' },
      { name: 'QR Passport', description: 'Equipment-level QR codes linking to service history, compliance docs, and quick actions' },
      { name: 'Share Reports', description: 'One-click compliance reports for inspectors, management, and insurance' },
    ],
  },
  {
    title: 'Intelligence & Insights',
    features: [
      { name: 'AI Compliance Advisor', description: 'Intelligent recommendations, mock inspections, and document analysis powered by Claude AI' },
      { name: 'Weekly Digest', description: 'Automated compliance summaries delivered to management via email' },
      { name: 'Leaderboard', description: 'Gamified compliance scoring across locations to drive accountability' },
      { name: 'Predictive Alerts', description: 'AI-driven early warnings before compliance issues become violations' },
      { name: 'PSE Insurance Integration', description: 'Connect compliance data to insurance for potential premium savings', comingSoon: true },
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
            Built for restaurants, healthcare, senior living, and food service operations
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureCategories.map((category, idx) => (
            <div
              key={idx}
              className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-[#d4af37] transition-all hover:shadow-lg"
            >
              <div className="flex items-center gap-3 mb-5">
                <h3 className="text-[1.3rem] font-bold text-[#1e4d6b]">{category.title}</h3>
                {category.title !== 'Coming Soon' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Available Now</span>
                )}
              </div>
              <ul className="space-y-4">
                {category.features.map((feature, featureIdx) => (
                  <li key={featureIdx} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${feature.comingSoon ? 'text-gray-400' : 'text-[#d4af37]'}`} strokeWidth={3} />
                    <div>
                      <span className="font-semibold text-gray-800">
                        {feature.name}
                        {feature.comingSoon && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded-full">Coming Soon</span>
                        )}
                      </span>
                      <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{feature.description}</p>
                    </div>
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
