import { useState } from 'react';
import {
  ShieldCheck,
  Shield,
  Palette,
  Globe,
  Lock,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useBranding, DEMO_BRAND_PRESETS, DEFAULT_BRANDING, type BrandingConfig } from '../contexts/BrandingContext';

// ── Brand preset metadata for cards ────────────────────
const PRESET_CARDS = [
  {
    key: 'evidly',
    label: 'EvidLY',
    desc: 'Default platform branding',
    color: '#1e4d6b',
    accent: '#d4af37',
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    desc: 'Red & gold enterprise portal',
    color: '#C8102E',
    accent: '#F0AB00',
  },
  {
    key: 'cintas',
    label: 'Cintas',
    desc: 'Navy blue kitchen safety',
    color: '#003366',
    accent: '#0077CC',
  },
];

export function BrandingSettings() {
  const { branding, activeBrandKey, setBrandPreset, updateBranding } = useBranding();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Local editing state for custom overrides
  const [localColors, setLocalColors] = useState({ ...branding.colors });
  const [localBrandName, setLocalBrandName] = useState(branding.brandName);
  const [localTagline, setLocalTagline] = useState(branding.tagline);
  const [localWelcome, setLocalWelcome] = useState(branding.loginWelcomeText);
  const [localSupport, setLocalSupport] = useState(branding.supportEmail);
  const [localDomain, setLocalDomain] = useState(branding.customDomain);
  const [localPoweredBy, setLocalPoweredBy] = useState(branding.poweredByVisible);
  const [localFeatures, setLocalFeatures] = useState({ ...branding.features });

  // Sync local state when preset changes
  const handlePresetChange = (key: string) => {
    setBrandPreset(key);
    const preset = DEMO_BRAND_PRESETS[key] || {};
    const merged = { ...DEFAULT_BRANDING, ...preset, colors: { ...DEFAULT_BRANDING.colors, ...(preset.colors || {}) }, features: { ...DEFAULT_BRANDING.features, ...(preset.features || {}) } };
    setLocalColors({ ...merged.colors });
    setLocalBrandName(merged.brandName);
    setLocalTagline(merged.tagline);
    setLocalWelcome(merged.loginWelcomeText);
    setLocalSupport(merged.supportEmail);
    setLocalDomain(merged.customDomain);
    setLocalPoweredBy(merged.poweredByVisible);
    setLocalFeatures({ ...merged.features });
    showToast(`Switched to ${key === 'evidly' ? 'EvidLY' : key.charAt(0).toUpperCase() + key.slice(1)} branding`);
  };

  const handleApply = () => {
    updateBranding({
      brandName: localBrandName,
      tagline: localTagline,
      loginWelcomeText: localWelcome,
      supportEmail: localSupport,
      customDomain: localDomain,
      poweredByVisible: localPoweredBy,
      colors: { ...localColors },
      features: { ...localFeatures },
    });
    showToast('Branding updated — changes applied live!');
  };

  const handleReset = () => {
    handlePresetChange('evidly');
  };

  const colorFields: { key: keyof typeof localColors; label: string }[] = [
    { key: 'primary', label: 'Primary' },
    { key: 'primaryLight', label: 'Primary Light' },
    { key: 'primaryDark', label: 'Primary Dark' },
    { key: 'accent', label: 'Accent' },
    { key: 'sidebarBg', label: 'Sidebar Background' },
    { key: 'sidebarText', label: 'Sidebar Text' },
  ];

  const featureToggles: { key: keyof BrandingConfig['features']; label: string; desc: string }[] = [
    { key: 'showMarketplace', label: 'Vendor Marketplace', desc: 'Public vendor directory & service catalog' },
    { key: 'showBenchmarking', label: 'Benchmarking Index', desc: 'Industry compliance benchmarks' },
    { key: 'showInsuranceScore', label: 'Insurance Risk Score', desc: 'Insurance premium risk scoring' },
    { key: 'showVendorManagement', label: 'Vendor Management', desc: 'Vendor tracking & compliance docs' },
    { key: 'showPricingPage', label: 'Pricing Page', desc: 'Public pricing & plan comparison' },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-right">
          <Check className="h-4 w-4" /> {toast}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branding & White-Label</h1>
          <p className="text-sm text-gray-500 mt-1">Customize your platform look, SSO, and feature visibility</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Reset to Default
        </button>
      </div>

      {/* Demo Brand Presets */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-[#1e4d6b]" />
          <h2 className="text-lg font-semibold text-gray-900">Demo Brand Presets</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Switch between preset brand themes to preview the white-label experience. Changes are applied live across the entire app.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PRESET_CARDS.map(preset => {
            const isActive = activeBrandKey === preset.key;
            return (
              <button
                key={preset.key}
                onClick={() => handlePresetChange(preset.key)}
                className={`relative flex flex-col items-center p-5 rounded-xl border-2 transition-all cursor-pointer ${
                  isActive ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: preset.color }}>
                    <ShieldCheck className="h-5 w-5 text-white" />
                  </div>
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.accent }} />
                </div>
                <span className="text-sm font-semibold text-gray-900">{preset.label}</span>
                <span className="text-xs text-gray-500 mt-0.5">{preset.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Identity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-[#1e4d6b]" />
            <h2 className="text-lg font-semibold text-gray-900">Brand Identity</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Brand Name</label>
              <input
                type="text"
                value={localBrandName}
                onChange={e => setLocalBrandName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tagline</label>
              <input
                type="text"
                value={localTagline}
                onChange={e => setLocalTagline(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Login Welcome Text</label>
              <input
                type="text"
                value={localWelcome}
                onChange={e => setLocalWelcome(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Support Email</label>
              <input
                type="email"
                value={localSupport}
                onChange={e => setLocalSupport(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Show "Powered by EvidLY" badge</p>
                <p className="text-xs text-gray-500">Displayed in sidebar and login page</p>
              </div>
              <button
                onClick={() => setLocalPoweredBy(!localPoweredBy)}
                className="flex-shrink-0"
              >
                {localPoweredBy ? (
                  <ToggleRight className="h-7 w-7 text-blue-500" />
                ) : (
                  <ToggleLeft className="h-7 w-7 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Color Palette */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5 text-[#1e4d6b]" />
            <h2 className="text-lg font-semibold text-gray-900">Color Palette</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {colorFields.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localColors[f.key]}
                    onChange={e => setLocalColors({ ...localColors, [f.key]: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localColors[f.key]}
                    onChange={e => setLocalColors({ ...localColors, [f.key]: e.target.value })}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Live Swatch Preview */}
          <div className="mt-5 p-4 rounded-xl border border-gray-200 flex items-center gap-4">
            <div className="flex gap-1">
              {Object.values(localColors).map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="text-xs text-gray-500">Live color preview</div>
          </div>
        </div>
      </div>

      {/* SSO / SAML Config */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-[#1e4d6b]" />
          <h2 className="text-lg font-semibold text-gray-900">SSO / SAML Configuration</h2>
          {branding.sso.enabled && (
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Enabled</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">SSO Provider</label>
            <select
              value={branding.sso.provider || ''}
              onChange={() => alert('SSO configuration changes require admin approval.\n\nDemo: Switch brand preset to Enterprise or Cintas to see SSO enabled.')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50"
            >
              <option value="">None</option>
              <option value="saml">SAML 2.0</option>
              <option value="oidc">OpenID Connect (OIDC)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Entity ID / Issuer</label>
            <input
              type="text"
              readOnly
              value={branding.sso.entityId || '—'}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">SSO Login URL</label>
            <input
              type="text"
              readOnly
              value={branding.sso.ssoUrl || '—'}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div className="flex items-center gap-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Enforce SSO</p>
              <p className="text-xs text-gray-500">Block password login when enabled</p>
            </div>
            <div className="ml-auto">
              {branding.sso.enforce ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Enforced</span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Optional</span>
              )}
            </div>
          </div>
        </div>
        {!branding.sso.enabled && (
          <p className="text-xs text-gray-400 mt-3">Switch to the Enterprise or Cintas brand preset to preview SSO configuration.</p>
        )}
      </div>

      {/* Custom Domain */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-[#1e4d6b]" />
          <h2 className="text-lg font-semibold text-gray-900">Custom Domain</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Custom Domain</label>
            <input
              type="text"
              value={localDomain}
              onChange={e => setLocalDomain(e.target.value)}
              placeholder="compliance.yourdomain.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">SSL Status</label>
            <div className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50">
              {localDomain ? (
                <>
                  <Lock className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-green-700 text-xs font-medium">SSL Active — Auto-provisioned</span>
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-gray-500 text-xs">No custom domain configured</span>
                </>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          CNAME your custom domain to <span className="font-mono">app.evidly.com</span>. SSL is auto-provisioned via Let's Encrypt.
        </p>
      </div>

      {/* Feature Visibility */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          {localFeatures.showMarketplace ? (
            <Eye className="h-5 w-5 text-[#1e4d6b]" />
          ) : (
            <EyeOff className="h-5 w-5 text-[#1e4d6b]" />
          )}
          <h2 className="text-lg font-semibold text-gray-900">Feature Visibility</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Control which modules are visible to users in this branded instance.
        </p>
        <div className="space-y-3">
          {featureToggles.map(toggle => (
            <div key={toggle.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div>
                <p className="text-sm font-medium text-gray-700">{toggle.label}</p>
                <p className="text-xs text-gray-500">{toggle.desc}</p>
              </div>
              <button
                onClick={() => setLocalFeatures({ ...localFeatures, [toggle.key]: !localFeatures[toggle.key] })}
                className="flex-shrink-0"
              >
                {localFeatures[toggle.key] ? (
                  <ToggleRight className="h-7 w-7 text-blue-500" />
                ) : (
                  <ToggleLeft className="h-7 w-7 text-gray-400" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mini Sidebar Preview */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <p className="text-xs font-medium text-gray-500 px-4 pt-3 pb-2">Sidebar</p>
            <div className="flex" style={{ height: 260 }}>
              <div className="w-44 flex-shrink-0 p-3" style={{ backgroundColor: localColors.sidebarBg }}>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-5 w-5" style={{ color: localColors.accent }} />
                  <span className="text-xs font-bold truncate" style={{ color: localColors.sidebarText }}>
                    {localBrandName}
                  </span>
                </div>
                <div className="space-y-1">
                  {['Dashboard', 'Temp Logs', 'Checklists', 'Vendors', 'Reports'].map((item, i) => (
                    <div key={item} className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={i === 0 ? { backgroundColor: localColors.primary + '40' } : {}}>
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: localColors.sidebarText + '40' }} />
                      <span className="text-[10px]" style={{ color: i === 0 ? localColors.sidebarText : localColors.sidebarText + '99' }}>{item}</span>
                    </div>
                  ))}
                </div>
                {localPoweredBy && (
                  <p className="text-[8px] mt-6" style={{ color: localColors.sidebarText + '66' }}>Powered by EvidLY</p>
                )}
              </div>
              <div className="flex-1 p-3 bg-gray-50">
                <div className="h-3 w-20 rounded mb-2" style={{ backgroundColor: localColors.primary }} />
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {[1, 2].map(i => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-2">
                      <div className="h-2 w-8 rounded mb-1" style={{ backgroundColor: localColors.accent }} />
                      <div className="h-2 w-12 rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mini Login Preview */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <p className="text-xs font-medium text-gray-500 px-4 pt-3 pb-2">Login Page</p>
            <div className="p-6 text-center bg-[#faf8f3]" style={{ minHeight: 260 }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <ShieldCheck className="h-6 w-6" style={{ color: localColors.accent }} />
                <span className="text-lg font-bold" style={{ color: localColors.primary }}>
                  {localBrandName}
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: localColors.primary }}>{localTagline}</p>
              <div className="max-w-[200px] mx-auto space-y-2">
                <div className="h-7 rounded border border-gray-200 bg-white" />
                <div className="h-7 rounded border border-gray-200 bg-white" />
                <div className="h-7 rounded text-white text-[10px] font-medium flex items-center justify-center" style={{ backgroundColor: localColors.primary }}>
                  Sign In
                </div>
                {branding.sso.enabled && (
                  <div className="h-7 rounded border-2 text-[10px] font-medium flex items-center justify-center" style={{ borderColor: localColors.primary, color: localColors.primary }}>
                    Sign in with SSO
                  </div>
                )}
              </div>
              {localPoweredBy && (
                <p className="text-[9px] mt-4 text-gray-400">Powered by EvidLY</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-6">
        <div>
          <p className="text-sm font-medium text-gray-700">Ready to apply changes?</p>
          <p className="text-xs text-gray-500">Updates are applied live across sidebar, login, and all branded surfaces.</p>
        </div>
        <button
          onClick={handleApply}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors shadow-sm"
          style={{ backgroundColor: '#1e4d6b' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
        >
          <Check className="h-4 w-4" /> Apply Branding
        </button>
      </div>

      {/* White-Label Tiers Info */}
      <div className="bg-gradient-to-br from-[#1e4d6b]/5 to-[#d4af37]/5 rounded-xl border border-[#1e4d6b]/10 p-6">
        <h3 className="text-sm font-semibold text-[#1e4d6b] mb-3">White-Label Tiers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-900 mb-1">Basic</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>Custom colors & logo</li>
              <li>Custom brand name</li>
              <li>"Powered by EvidLY" badge</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg border border-[#1e4d6b]/20 p-4 ring-1 ring-[#1e4d6b]/10">
            <p className="text-xs font-bold text-[#1e4d6b] mb-1">Professional</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>Everything in Basic</li>
              <li>Custom domain</li>
              <li>SSO / SAML integration</li>
              <li>Feature visibility controls</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg border border-[#d4af37]/30 p-4 ring-1 ring-[#d4af37]/20">
            <p className="text-xs font-bold text-[#d4af37] mb-1">Enterprise</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>Everything in Professional</li>
              <li>Remove "Powered by" badge</li>
              <li>Custom email templates</li>
              <li>Dedicated support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
