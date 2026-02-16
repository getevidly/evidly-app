import {
  Shield,
  ShieldCheck,
  CheckCircle,
  TrendingUp,
  Flame,
  BarChart3,
  Lock,
  Mail,
} from 'lucide-react';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export function CarrierPartnership() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #eef4f8 0%, #ffffff 50%)', ...F }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#1e4d6b' }}>
            <ShieldCheck className="h-10 w-10 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl font-bold text-gray-900">Evid</span>
            <span className="text-2xl font-bold" style={{ color: '#d4af37' }}>LY</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Insurance Carrier Partnership Portal</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Direct API access to verified kitchen risk profiles for evidence-based underwriting conversations.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full" style={{ backgroundColor: '#fdf8e8', border: '1px solid #d4af37' }}>
            <Lock className="h-4 w-4" style={{ color: '#d4af37' }} />
            <span className="text-sm font-semibold" style={{ color: '#d4af37' }}>Coming Soon</span>
          </div>
        </div>

        {/* What This Portal Will Offer */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">What This Portal Will Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Shield, title: 'Authenticated API Access', desc: 'Real-time risk scores via RESTful API with X-API-Key authentication and rate limiting' },
              { icon: TrendingUp, title: '12-Month Trend Analysis', desc: 'Monthly score snapshots showing consistency and improvement trajectory' },
              { icon: Flame, title: 'Fire Safety Verification', desc: 'NFPA 96/17A/10/72 (2025 Edition) compliance status with service dates and vendor documentation' },
              { icon: BarChart3, title: 'Anonymized Incident Metrics', desc: 'Aggregated incident counts by severity and category — no employee PII or raw reports' },
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

        {/* Data Privacy */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Data Privacy & Consent</h2>
          <div className="space-y-3">
            {[
              'All data sharing requires explicit operator consent',
              'Operators authorize each carrier individually',
              'Consent can be revoked at any time with immediate effect',
              'No employee PII is ever exposed through the API',
              'No specific health department violation details are shared',
              'All API calls are logged for inspection trail compliance',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API Endpoints Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">API Endpoints</h2>
          <div className="space-y-2">
            {[
              { method: 'POST', path: '/api/v1/risk-score/verify', desc: 'Verify current risk score' },
              { method: 'GET', path: '/api/v1/risk-score/{id}/summary', desc: 'Score breakdown' },
              { method: 'GET', path: '/api/v1/risk-score/{id}/history', desc: '12-month trend' },
              { method: 'GET', path: '/api/v1/risk-score/{id}/fire-safety', desc: 'NFPA (2025) compliance' },
              { method: 'GET', path: '/api/v1/risk-score/{id}/incidents', desc: 'Anonymized metrics' },
            ].map(ep => (
              <div key={ep.path} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 font-mono">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${ep.method === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {ep.method}
                </span>
                <code className="text-xs text-gray-800 flex-1">{ep.path}</code>
                <span className="text-[11px] text-gray-400 font-sans">{ep.desc}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">
            Authentication via X-API-Key header. Rate limited: 60 requests/minute, 1,000 requests/day per key.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Insurance carriers interested in partnership opportunities:
          </p>
          <a
            href="mailto:partnerships@evidly.com"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: '#1e4d6b' }}
          >
            <Mail className="h-5 w-5" />
            Contact Partnership Team
          </a>
          <p className="text-xs text-gray-400 mt-3">partnerships@evidly.com</p>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-[11px] text-gray-400 leading-relaxed max-w-lg mx-auto">
            EvidLY provides compliance documentation tools for food service operators.
            Risk scores reflect compliance activities tracked through the platform.
            Insurance premium decisions are made solely by carriers based on their own underwriting criteria.
            EvidLY does not act as an insurance broker, agent, or advisor.
          </p>
        </div>
      </div>
    </div>
  );
}
