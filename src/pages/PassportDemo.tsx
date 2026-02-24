import { CheckCircle2, AlertCircle } from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';

export default function PassportDemo() {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const complianceData = {
    foodSafety: 95,
    fireSafety: 89
  };

  const recentActivity = [
    {
      icon: CheckCircle2,
      text: 'Temperature logs current (312 logs this month)',
      status: 'success'
    },
    {
      icon: CheckCircle2,
      text: 'Hood cleaning certificate valid through Aug 2026',
      status: 'success'
    },
    {
      icon: CheckCircle2,
      text: 'Fire suppression inspection passed Dec 2025',
      status: 'success'
    },
    {
      icon: CheckCircle2,
      text: 'All food handler certifications current',
      status: 'success'
    },
    {
      icon: AlertCircle,
      text: 'Health permit renewal due in 45 days',
      status: 'warning'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#1e4d6b] text-white py-6 px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <EvidlyIcon size={40} />
          <div>
            <h1 className="font-['Outfit'] text-2xl font-bold">EvidLY Compliance Passport</h1>
            <p className="text-sm text-gray-300">Live Compliance Status</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="font-['Outfit'] text-3xl font-bold text-[#1e4d6b] mb-2">
            Pacific Coast Dining — Downtown
          </h2>
          <p className="text-gray-600 text-lg mb-1">1245 Fulton Street, Fresno, CA 93721</p>
          <p className="text-sm text-gray-500">Last updated: {today}</p>
        </div>

        <div className="mb-16">
          <div className="flex items-center justify-center gap-8 mb-8">
            {/* Food Safety Ring */}
            <div className="flex flex-col items-center">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="68" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                  <circle cx="80" cy="80" r="68" stroke="#10b981" strokeWidth="12" fill="none"
                    strokeDasharray={`${2 * Math.PI * 68}`}
                    strokeDashoffset={`${2 * Math.PI * 68 * (1 - complianceData.foodSafety / 100)}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl font-bold text-[#1e4d6b]">{complianceData.foodSafety}</div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-600 mt-2">Food Safety</div>
            </div>
            {/* Fire Safety Ring */}
            <div className="flex flex-col items-center">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="68" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                  <circle cx="80" cy="80" r="68" stroke="#10b981" strokeWidth="12" fill="none"
                    strokeDasharray={`${2 * Math.PI * 68}`}
                    strokeDashoffset={`${2 * Math.PI * 68 * (1 - complianceData.fireSafety / 100)}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl font-bold text-[#1e4d6b]">{complianceData.fireSafety}</div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-600 mt-2">Fire Safety</div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h3 className="font-['Outfit'] text-2xl font-bold text-[#1e4d6b] mb-6">
            Compliance Breakdown
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-700">Food Safety</span>
                <span className="font-bold text-[#1e4d6b]">{complianceData.foodSafety}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${complianceData.foodSafety}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-700">Fire Safety</span>
                <span className="font-bold text-[#1e4d6b]">{complianceData.fireSafety}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${complianceData.fireSafety}%` }}
                />
              </div>
            </div>

          </div>
        </div>

        <div className="mb-12">
          <h3 className="font-['Outfit'] text-2xl font-bold text-[#1e4d6b] mb-6">
            Recent Compliance Activity
          </h3>
          <div className="space-y-4">
            {recentActivity.map((item, index) => (
              <div
                key={index}
                className={`flex items-start gap-4 p-4 rounded-lg ${
                  item.status === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}
              >
                <item.icon
                  className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                    item.status === 'success' ? 'text-green-600' : 'text-yellow-600'
                  }`}
                  strokeWidth={2}
                />
                <span className="text-gray-800 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 py-8 px-6 mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600 font-medium mb-2">
            Powered by EvidLY — Compliance Simplified
          </p>
          <a
            href="https://getevidly.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1e4d6b] hover:text-[#1e4d6b] font-semibold transition-colors"
          >
            Learn more at getevidly.com
          </a>
        </div>
      </footer>
    </div>
  );
}
