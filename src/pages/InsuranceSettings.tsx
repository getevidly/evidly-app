import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  ShieldOff,
  CheckCircle,
  XCircle,
  Lock,
  Key,
  Eye,
  EyeOff,
  Info,
  ArrowRight,
  Copy,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { Breadcrumb } from '../components/Breadcrumb';
import { AiUpgradePrompt } from '../components/AiUpgradePrompt';
import { FeatureGate } from '../components/FeatureGate';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { getAiTier, isFeatureAvailable } from '../lib/aiTier';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

// Demo carrier data (empty for now — "Coming Soon" state)
const DEMO_CARRIERS: { name: string; logo: string; status: 'coming_soon' }[] = [
  { name: 'Hartford Financial', logo: 'HF', status: 'coming_soon' },
  { name: 'Zurich Insurance', logo: 'ZI', status: 'coming_soon' },
  { name: 'Society Insurance', logo: 'SI', status: 'coming_soon' },
];

const SHARED_DATA = [
  'Overall risk score (0-100) and tier classification',
  'Category scores: fire risk, food safety, documentation, operational',
  'Anonymized incident counts by severity (no descriptions)',
  'Service compliance dates (hood cleaning, fire suppression, extinguishers)',
  'Score trend direction (improving, stable, declining)',
  'Factor-level compliance status against NFPA (2025)/FDA standards',
];

const NEVER_SHARED = [
  'Employee names, contact information, or any PII',
  'Specific health department violation details or reports',
  'Raw inspection report content or images',
  'Vendor contract terms, pricing, or financial data',
  'Internal communications or notes',
  'Customer or patron information',
];

export function InsuranceSettings() {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { isDemoMode, presenterMode } = useDemo();
  const aiTier = getAiTier(isDemoMode, presenterMode);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature, handleOverride } = useDemoGuard();

  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const demoApiKey = 'esk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';

  const handleToggle = () => {
    if (!sharingEnabled) {
      setShowConsentModal(true);
    } else {
      toast.success('Data sharing disabled. Carrier access revoked');
      setSharingEnabled(false);
    }
  };

  const handleConsentConfirm = () => {
    setSharingEnabled(true);
    setShowConsentModal(false);
    toast.success('Data sharing enabled');
  };

  return (
    <div className="max-w-5xl mx-auto" style={F}>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Settings', href: '/settings' },
        { label: 'Insurance Integration' },
      ]} />

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
          <EvidlyIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance Integration</h1>
          <p className="text-sm text-gray-500">Manage data sharing consent and carrier connections</p>
        </div>
      </div>

      {/* Master Toggle Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-3">
            {sharingEnabled
              ? <EvidlyIcon size={24} />
              : <ShieldOff className="h-6 w-6 text-gray-400" />}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Share My EvidLY Risk Score with Insurance Partners</h2>
              <p className="text-sm text-gray-500">
                {sharingEnabled
                  ? 'Your anonymized compliance metrics are available to authorized carriers'
                  : 'Data sharing is currently disabled. No carrier has access to your data.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${sharingEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${sharingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {sharingEnabled && (
          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#1e4d6b' }} />
            <p className="text-xs" style={{ color: '#1e4d6b' }}>
              Your anonymized compliance metrics may be shared with insurance carriers you authorize.
              No employee names, specific violation details, or health department records are shared.
              You can revoke access at any time with immediate effect.
            </p>
          </div>
        )}
      </div>

      {/* Data Sharing Details — Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* What We Share */}
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-900">Data We Share (When Consent is Granted)</h3>
          </div>
          <ul className="space-y-2">
            {SHARED_DATA.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* What We Never Share */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <EyeOff className="h-5 w-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Data We Never Share</h3>
          </div>
          <ul className="space-y-2">
            {NEVER_SHARED.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Connected Carriers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Connected Insurance Carriers</h3>
            <p className="text-xs text-gray-500">Carriers you have authorized to access your risk score data</p>
          </div>
        </div>

        {/* Carrier List — Coming Soon State */}
        <div className="space-y-3 mb-4">
          {DEMO_CARRIERS.map(carrier => (
            <div key={carrier.name} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-500">{carrier.logo}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">{carrier.name}</span>
                  <span className="ml-2 text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase">Coming Soon</span>
                </div>
              </div>
              <button
                onClick={() => toast.info(`${carrier.name} integration coming soon`)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors min-h-[44px]"
              >
                Connect
              </button>
            </div>
          ))}
        </div>

        {/* Empty state message */}
        <div className="text-center py-6 border-t border-gray-100">
          <Lock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No carriers connected yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Carrier partnership integrations are coming soon. When available, you'll authorize each carrier individually
            and can revoke access at any time.
          </p>
        </div>
      </div>

      {/* API Key Management (Premium Gated) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
            <Key className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">API Key Management</h3>
            <p className="text-xs text-gray-500">Manage API keys for carrier access to your risk score data</p>
          </div>
        </div>

        <FeatureGate featureId="ai-predictive-insights">
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Your API Key</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                    title={showApiKey ? 'Hide' : 'Show'}
                  >
                    {showApiKey ? <EyeOff className="h-3.5 w-3.5 text-gray-500" /> : <Eye className="h-3.5 w-3.5 text-gray-500" />}
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(demoApiKey); toast.success('API key copied to clipboard'); }}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                    title="Copy"
                  >
                    <Copy className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>
              </div>
              <code className="text-sm text-gray-800 font-mono">
                {showApiKey ? demoApiKey : '••••••••••••••••••••••••••••••••••••'}
              </code>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Rate limit: 60 req/min, 1,000 req/day</span>
                <span>Status: <span className="text-green-600 font-medium">Active</span></span>
              </div>
              <button
                onClick={() => guardAction('settings', 'insurance settings', () => toast.success('API key regenerated'))}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-3 w-3" /> Regenerate Key
              </button>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-800">
                  API keys provide direct access to your risk score data. Only share keys with authorized insurance carriers.
                  Regenerating a key immediately invalidates the previous key.
                </p>
              </div>
            </div>
          </div>
        </FeatureGate>
      </div>

      {/* API Documentation Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Available API Endpoints</h3>
        <div className="space-y-2">
          {[
            { method: 'POST', path: '/api/v1/risk-score/verify', desc: 'Verify current risk score for a location' },
            { method: 'GET', path: '/api/v1/risk-score/{location_id}/summary', desc: 'Overall score with category breakdown' },
            { method: 'GET', path: '/api/v1/risk-score/{location_id}/history', desc: '12-month score trend with direction' },
            { method: 'GET', path: '/api/v1/risk-score/{location_id}/fire-safety', desc: 'Fire safety compliance and NFPA (2025) status' },
            { method: 'GET', path: '/api/v1/risk-score/{location_id}/incidents', desc: 'Anonymized incident metrics (no PII)' },
          ].map(ep => (
            <div key={ep.path} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 flex-wrap">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${ep.method === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {ep.method}
              </span>
              <code className="text-xs text-gray-800 font-mono flex-1 min-w-0 break-all">{ep.path}</code>
              <span className="text-[11px] text-gray-400 hidden sm:inline">{ep.desc}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
          <Info className="h-3 w-3" />
          <span>All endpoints require X-API-Key header and active operator consent</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Important Disclaimer</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              This score reflects compliance activities tracked in EvidLY. Insurance premium decisions are made
              solely by carriers based on their own underwriting criteria. EvidLY does not guarantee premium
              reductions, carrier acceptance, or specific underwriting outcomes. EvidLY does not act as an
              insurance broker, agent, or advisor. Share this data with your insurance broker to discuss how
              your compliance documentation may be considered in your policy review.
            </p>
          </div>
        </div>
      </div>

      {/* Back to Settings */}
      <div className="flex justify-between items-center flex-wrap gap-2 mb-6">
        <button
          onClick={() => navigate('/settings')}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to Settings
        </button>
        <button
          onClick={() => navigate('/insurance-risk')}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 min-h-[44px]"
          style={{ backgroundColor: '#1e4d6b' }}
        >
          View Insurance Risk Score <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Consent Confirmation Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-w-lg w-[95vw] sm:w-full p-4 sm:p-6" style={F}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
                <EvidlyIcon size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Enable Data Sharing?</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              By enabling data sharing, you consent to share anonymized risk score data with insurance carriers you specifically authorize.
            </p>

            <div className="p-4 rounded-lg bg-gray-50 mb-4">
              <p className="text-xs font-semibold text-gray-900 mb-2">What will be shared:</p>
              <ul className="space-y-1">
                {SHARED_DATA.slice(0, 4).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-lg border border-red-100 bg-red-50 mb-4">
              <p className="text-xs font-semibold text-gray-900 mb-2">What is NEVER shared:</p>
              <ul className="space-y-1">
                {NEVER_SHARED.slice(0, 3).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <XCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] text-gray-400 mb-4">
              You can revoke data sharing at any time. Revocation takes effect immediately and all carrier API access is terminated.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConsentModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleConsentConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors min-h-[44px]"
                style={{ backgroundColor: '#1e4d6b' }}
              >
                Enable Data Sharing
              </button>
            </div>
          </div>
        </div>
      )}

      <DemoUpgradePrompt
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        action={upgradeAction}
        feature={upgradeFeature}
        onOverride={handleOverride}
      />
    </div>
  );
}
