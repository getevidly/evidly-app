import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ── Types ───────────────────────────────────────────────────

export interface BrandingColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  sidebarBg: string;
  sidebarText: string;
}

export interface BrandingConfig {
  brandName: string;
  tagline: string;
  poweredByVisible: boolean;
  colors: BrandingColors;
  loginWelcomeText: string;
  supportEmail: string;
  customDomain: string;
  sso: {
    enabled: boolean;
    provider: 'saml' | 'oidc' | null;
    enforce: boolean;
    entityId: string;
    ssoUrl: string;
  };
  features: {
    showMarketplace: boolean;
    showBenchmarking: boolean;
    showInsuranceScore: boolean;
    showVendorManagement: boolean;
    showPricingPage: boolean;
  };
}

interface BrandingContextType {
  branding: BrandingConfig;
  activeBrandKey: string;
  setBrandPreset: (key: string) => void;
  updateBranding: (partial: Partial<BrandingConfig>) => void;
}

// ── Defaults ────────────────────────────────────────────────

export const DEFAULT_BRANDING: BrandingConfig = {
  brandName: 'EvidLY',
  tagline: 'Compliance Simplified',
  poweredByVisible: false,
  colors: {
    primary: '#1e4d6b',
    primaryLight: '#2a6a8f',
    primaryDark: '#163a52',
    accent: '#d4af37',
    sidebarBg: '#0f1f35',
    sidebarText: '#ffffff',
  },
  loginWelcomeText: 'Welcome to EvidLY',
  supportEmail: 'support@evidly.com',
  customDomain: '',
  sso: { enabled: false, provider: null, enforce: false, entityId: '', ssoUrl: '' },
  features: {
    showMarketplace: true,
    showBenchmarking: true,
    showInsuranceScore: true,
    showVendorManagement: true,
    showPricingPage: true,
  },
};

export const DEMO_BRAND_PRESETS: Record<string, Partial<BrandingConfig>> = {
  evidly: {},
  enterprise: {
    brandName: 'Enterprise Compliance Portal',
    tagline: 'Kitchen Excellence',
    poweredByVisible: true,
    colors: {
      primary: '#C8102E',
      primaryLight: '#E8283E',
      primaryDark: '#A00D24',
      accent: '#F0AB00',
      sidebarBg: '#1A1A2E',
      sidebarText: '#FFFFFF',
    },
    loginWelcomeText: 'Welcome to Enterprise Compliance Portal',
    supportEmail: 'compliance@enterprise.com',
    customDomain: 'compliance.enterprise.com',
    sso: { enabled: true, provider: 'saml', enforce: false, entityId: 'https://compliance.enterprise.com', ssoUrl: 'https://login.enterprise.com/saml' },
    features: {
      showMarketplace: false,
      showBenchmarking: true,
      showInsuranceScore: true,
      showVendorManagement: true,
      showPricingPage: false,
    },
  },
  cintas: {
    brandName: 'Cintas Kitchen Safety',
    tagline: 'Protect Your Kitchen',
    poweredByVisible: true,
    colors: {
      primary: '#003366',
      primaryLight: '#004C99',
      primaryDark: '#002244',
      accent: '#0077CC',
      sidebarBg: '#002244',
      sidebarText: '#FFFFFF',
    },
    loginWelcomeText: 'Welcome to Cintas Kitchen Safety',
    supportEmail: 'kitchen-safety@cintas.com',
    customDomain: 'kitchen.cintas.com',
    sso: { enabled: true, provider: 'saml', enforce: true, entityId: 'https://kitchen.cintas.com', ssoUrl: 'https://sso.cintas.com/saml2' },
    features: {
      showMarketplace: false,
      showBenchmarking: true,
      showInsuranceScore: false,
      showVendorManagement: true,
      showPricingPage: false,
    },
  },
};

// ── Merge helper ────────────────────────────────────────────

function mergeBranding(base: BrandingConfig, override: Partial<BrandingConfig>): BrandingConfig {
  return {
    ...base,
    ...override,
    colors: { ...base.colors, ...(override.colors || {}) },
    sso: { ...base.sso, ...(override.sso || {}) },
    features: { ...base.features, ...(override.features || {}) },
  };
}

// ── CSS variable injection ──────────────────────────────────

function applyCSSVariables(colors: BrandingColors) {
  const root = document.documentElement;
  root.style.setProperty('--color-blue', colors.primary);
  root.style.setProperty('--color-blue-light', colors.primaryLight);
  root.style.setProperty('--color-blue-dark', colors.primaryDark);
  root.style.setProperty('--color-gold-light', colors.accent);
  root.style.setProperty('--brand-sidebar-bg', colors.sidebarBg);
  root.style.setProperty('--brand-sidebar-text', colors.sidebarText);
}

// ── Context ─────────────────────────────────────────────────

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  activeBrandKey: 'evidly',
  setBrandPreset: () => {},
  updateBranding: () => {},
});

// ── Provider ────────────────────────────────────────────────

const STORAGE_KEY = 'evidly_brand_preset';

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [activeBrandKey, setActiveBrandKey] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'evidly';
    } catch {
      return 'evidly';
    }
  });

  const [branding, setBranding] = useState<BrandingConfig>(() => {
    const preset = DEMO_BRAND_PRESETS[activeBrandKey] || {};
    return mergeBranding(DEFAULT_BRANDING, preset);
  });

  const setBrandPreset = useCallback((key: string) => {
    setActiveBrandKey(key);
    const preset = DEMO_BRAND_PRESETS[key] || {};
    const merged = mergeBranding(DEFAULT_BRANDING, preset);
    setBranding(merged);
    applyCSSVariables(merged.colors);
    try { localStorage.setItem(STORAGE_KEY, key); } catch { /* noop */ }
  }, []);

  const updateBranding = useCallback((partial: Partial<BrandingConfig>) => {
    setBranding(prev => {
      const next = mergeBranding(prev, partial);
      applyCSSVariables(next.colors);
      return next;
    });
  }, []);

  // Apply CSS variables on mount
  useEffect(() => {
    applyCSSVariables(branding.colors);
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, activeBrandKey, setBrandPreset, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────

export function useBranding() {
  return useContext(BrandingContext);
}
