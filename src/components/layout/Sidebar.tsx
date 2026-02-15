import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  MapPin,
  Lock,
  BarChart3,
  Scale,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { SidebarUpgradeBadge } from '../SidebarUpgradeBadge';
import { useSubscription } from '../../hooks/useSubscription';
import { getFeatureBadge } from '../../lib/featureGating';
import { useBranding } from '../../contexts/BrandingContext';
import { locations as demoLocations, locationScores, getGrade } from '../../data/demoData';
import { getNavItemsForRole, checkTestMode, type SidebarNavItem } from '../../config/sidebarConfig';

// ── Admin section items (separate from role-based config) ──

interface AdminNavItem {
  i18nKey: string;
  href: string;
  icon: LucideIcon;
  featureId?: string;
}

const ADMIN_ITEMS: AdminNavItem[] = [
  { i18nKey: 'nav.usageAnalytics', href: '/admin/usage-analytics', icon: BarChart3 },
  { i18nKey: 'nav.regulatoryChanges', href: '/admin/regulatory-changes', icon: Scale },
  { i18nKey: 'nav.systemAdmin', href: '/enterprise/dashboard', icon: Building2, featureId: 'enterprise-dashboard' },
];

// ── Sidebar component ───────────────────────────────────

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode, presenterMode, togglePresenterMode } = useDemo();
  const { t } = useTranslation();
  const { currentTier } = useSubscription();
  const { branding } = useBranding();
  const showAdmin = isEvidlyAdmin || isDemoMode;

  const isTestMode = useMemo(() => checkTestMode(), []);
  const navItems = useMemo(() => getNavItemsForRole(userRole), [userRole]);

  // Expose test API for Playwright
  useEffect(() => {
    if (isTestMode) {
      const visibleItems = navItems.filter((i): i is SidebarNavItem => i !== 'divider');
      (window as any).__evidly_test = {
        getVisibleNavItems: () => visibleItems.map(i => i.id),
        getCurrentRole: () => userRole,
        getNavItemCount: () => visibleItems.length,
      };
      console.log(`[EvidLY Test] Sidebar rendered for role: ${userRole}`);
      console.log(`[EvidLY Test] Visible items (${visibleItems.length}): ${visibleItems.map(i => i.id).join(', ')}`);
    }
    return () => {
      if (isTestMode) {
        delete (window as any).__evidly_test;
      }
    };
  }, [isTestMode, navItems, userRole]);

  // Get resolved label for an item (handles per-role overrides)
  const getItemLabel = (item: SidebarNavItem): string => {
    if (item.roleI18nKeys?.[userRole]) {
      const translated = t(item.roleI18nKeys[userRole]!);
      if (translated !== item.roleI18nKeys[userRole]) return translated;
    }
    if (item.roleLabels?.[userRole]) return item.roleLabels[userRole]!;
    const translated = t(item.i18nKey);
    if (translated !== item.i18nKey) return translated;
    return item.label;
  };

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col z-[9999]">
      <div className="flex flex-col h-full" style={{ backgroundColor: branding.colors.sidebarBg }}>
        {/* Logo — sticky top */}
        <div className="flex items-center flex-shrink-0 px-6 py-5">
          <ShieldCheck className="h-8 w-8" style={{ color: branding.colors.accent }} />
          <div className="ml-3">
            {branding.brandName === 'EvidLY' ? (
              <span className="text-xl font-bold">
                <span style={{ color: branding.colors.sidebarText }}>Evid</span>
                <span style={{ color: branding.colors.accent }}>LY</span>
              </span>
            ) : (
              <span className="text-base font-bold leading-tight" style={{ color: branding.colors.sidebarText }}>
                {branding.brandName}
              </span>
            )}
            <p className="text-[10px] text-gray-400 -mt-0.5 tracking-wide">{branding.tagline}</p>
          </div>
        </div>

        {/* Presenter mode badge */}
        {presenterMode && (
          <button
            onClick={togglePresenterMode}
            className="mx-3 mb-2 px-2 py-1.5 rounded-md text-xs font-bold text-center transition-opacity hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: '#d4af37', color: '#1e4d6b' }}
            title="Click to deactivate presenter mode"
          >
            PRESENTER MODE
          </button>
        )}

        {/* Test mode badge */}
        {isTestMode && (
          <div className="mx-3 mb-2 px-2 py-1.5 rounded-md text-xs font-bold text-center bg-orange-500 text-white">
            TEST MODE
          </div>
        )}

        {/* Scrollable navigation — flat list with dividers */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4" data-tour="sidebar-nav">
          {navItems.map((entry, index) => {
            if (entry === 'divider') {
              return <div key={`divider-${index}`} className="my-2 border-t border-white/10" />;
            }

            const item = entry;
            const active = location.pathname === item.route;
            const testId = isTestMode ? `nav-${item.id}` : undefined;

            return (
              <div
                key={item.id}
                onClick={() => navigate(item.route)}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 cursor-pointer ${
                  active
                    ? 'text-[#d4af37] bg-[#163a52]'
                    : 'text-gray-200 hover:bg-[#163a52] hover:text-white'
                }`}
                style={active ? { boxShadow: 'inset 3px 0 0 #d4af37' } : undefined}
                {...(testId ? { 'data-testid': testId } : {})}
              >
                <item.icon
                  className={`mr-3 flex-shrink-0 h-[18px] w-[18px] ${
                    active ? 'text-[#d4af37]' : 'text-gray-300 group-hover:text-white'
                  }`}
                />
                <span className="flex-1 truncate">{getItemLabel(item)}</span>
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto bg-red-600 text-white text-[10px] font-bold px-1.5 rounded-full min-w-[18px] text-center leading-4">
                    {item.badge}
                  </span>
                )}
                {!isDemoMode && item.featureId && (() => {
                  const tierBadge = getFeatureBadge(item.featureId, currentTier);
                  if (!tierBadge) return null;
                  return (
                    <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded ${tierBadge === 'PRO' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-blue-500/20 text-blue-300'}`}>
                      {tierBadge}
                    </span>
                  );
                })()}
              </div>
            );
          })}

          {/* Admin section — only visible to admins or in demo mode */}
          {showAdmin && (
            <>
              <div className="border-t border-white/10 mt-2 pt-1" />
              <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                <Lock className="h-3 w-3 text-gray-500" />
                <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">
                  {t('nav.admin')}
                </span>
              </div>
              {ADMIN_ITEMS.map(item => {
                const active = location.pathname === item.href;
                const testId = isTestMode ? `nav-admin-${item.href.split('/').pop()}` : undefined;
                return (
                  <div
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 cursor-pointer ${
                      active
                        ? 'text-[#d4af37] bg-[#163a52]'
                        : 'text-gray-400 hover:bg-[#163a52] hover:text-gray-200'
                    }`}
                    style={active ? { boxShadow: 'inset 3px 0 0 #d4af37' } : undefined}
                    {...(testId ? { 'data-testid': testId } : {})}
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-[18px] w-[18px] ${
                        active ? 'text-[#d4af37]' : 'text-gray-500 group-hover:text-gray-300'
                      }`}
                    />
                    <span className="flex-1 truncate">{t(item.i18nKey)}</span>
                    {!isDemoMode && item.featureId && (() => {
                      const tierBadge = getFeatureBadge(item.featureId, currentTier);
                      if (!tierBadge) return null;
                      return (
                        <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded ${tierBadge === 'PRO' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-blue-500/20 text-blue-300'}`}>
                          {tierBadge}
                        </span>
                      );
                    })()}
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {/* Location Quick-Switch */}
        {demoLocations.length >= 2 && (
          <div className="flex-shrink-0 border-t border-white/10 px-3 py-3">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Locations</span>
              <kbd className="text-[9px] text-gray-500 bg-white/10 px-1.5 py-0.5 rounded border border-white/10">Ctrl+K</kbd>
            </div>
            {demoLocations.map(loc => {
              const score = locationScores[loc.urlId]?.overall ?? 0;
              const grade = getGrade(score);
              const params = new URLSearchParams(window.location.search);
              const currentLoc = params.get('location');
              const isActive = currentLoc === loc.urlId;
              return (
                <div
                  key={loc.id}
                  onClick={() => navigate(`/dashboard?location=${loc.urlId}`)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors duration-150 ${
                    isActive ? 'bg-[#163a52] text-white' : 'text-gray-300 hover:bg-[#163a52] hover:text-white'
                  }`}
                  {...(isTestMode ? { 'data-testid': `nav-location-${loc.urlId}` } : {})}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-gray-400" />
                    <span className="text-xs font-medium truncate">{loc.name}</span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-1.5 rounded-full flex-shrink-0"
                    style={{
                      color: grade.hex,
                      backgroundColor: grade.hex + '25',
                    }}
                  >
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Powered by EvidLY badge (white-label only) */}
        {branding.poweredByVisible && (
          <div className="flex-shrink-0 border-t border-white/10 px-4 py-2">
            <a
              href="https://evidly.com?ref=powered-by"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-300 transition-colors"
            >
              <ShieldCheck className="h-3 w-3" style={{ color: '#d4af37' }} />
              <span>Powered by <span className="font-semibold text-gray-300">EvidLY</span></span>
            </a>
          </div>
        )}

        {/* Demo upgrade badge at bottom of sidebar */}
        <SidebarUpgradeBadge />
      </div>
    </div>
  );
}
