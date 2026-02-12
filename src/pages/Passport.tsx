import { Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Passport() {
  const { id } = useParams();
  const navigate = useNavigate();

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const locationData = {
    name: 'Pacific Coast Dining — Downtown',
    address: '1245 Fulton Street, Fresno, CA 93721',
    overall: 92,
    foodSafety: 95,
    fireSafety: 89,
    vendorCompliance: 88,
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
          <Shield className="w-10 h-10 text-[#d4af37]" strokeWidth={2} />
          <div>
            <h1 className="font-['Outfit'] text-2xl font-bold">EvidLY Compliance Passport</h1>
            <p className="text-sm text-gray-300">Live Compliance Status</p>
          </div>
        </div>
      </header>

      <div style={{ padding: '12px 24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
        <span onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer', color: '#1e4d6b' }}>Dashboard</span>
        <span style={{ color: '#94a3b8' }}>›</span>
        <span onClick={() => navigate('/dashboard?tab=passport')} style={{ cursor: 'pointer', color: '#1e4d6b' }}>QR Passport</span>
        <span style={{ color: '#94a3b8' }}>›</span>
        <span style={{ color: '#64748b' }}>{locationData.name}</span>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="font-['Outfit'] text-3xl font-bold text-[#1e4d6b] mb-2">
            {locationData.name}
          </h2>
          <p className="text-gray-600 text-lg mb-1">{locationData.address}</p>
          <p className="text-sm text-gray-500">Last updated: {today}</p>
          {id && <p className="text-xs text-gray-400 mt-1">Location ID: {id}</p>}
        </div>

        <div className="mb-16">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="relative w-64 h-64">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  stroke="#e5e7eb"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  stroke="#10b981"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 110}`}
                  strokeDashoffset={`${2 * Math.PI * 110 * (1 - locationData.overall / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-7xl font-bold" style={{ color: locationData.overall >= 90 ? '#22c55e' : locationData.overall >= 75 ? '#eab308' : locationData.overall >= 60 ? '#f59e0b' : '#ef4444' }}>{locationData.overall}</div>
                <div className="text-lg text-gray-600 font-medium">Compliant</div>
              </div>
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
                <span className="font-bold" style={{ color: locationData.foodSafety >= 90 ? '#22c55e' : locationData.foodSafety >= 75 ? '#eab308' : locationData.foodSafety >= 60 ? '#f59e0b' : '#ef4444' }}>{locationData.foodSafety}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${locationData.foodSafety}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-700">Fire Safety</span>
                <span className="font-bold" style={{ color: locationData.fireSafety >= 90 ? '#22c55e' : locationData.fireSafety >= 75 ? '#eab308' : locationData.fireSafety >= 60 ? '#f59e0b' : '#ef4444' }}>{locationData.fireSafety}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${locationData.fireSafety}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-700">Vendor Compliance</span>
                <span className="font-bold" style={{ color: locationData.vendorCompliance >= 90 ? '#22c55e' : locationData.vendorCompliance >= 75 ? '#eab308' : locationData.vendorCompliance >= 60 ? '#f59e0b' : '#ef4444' }}>{locationData.vendorCompliance}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${locationData.vendorCompliance}%` }}
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
