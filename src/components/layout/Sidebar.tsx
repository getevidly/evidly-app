import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, ChevronRight, ChevronDown } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { useBranding } from '../../contexts/BrandingContext';
import { SidebarUpgradeBadge } from '../SidebarUpgradeBadge';
import { locations as demoLocations } from '../../data/demoData';
import { DEMO_LOCATION_GRADE_OVERRIDES } from '../../data/demoJurisdictions';
import {
  getNavItemsForRole,
  checkTestMode,
  LOCATION_VISIBLE_ROLES,
  SIDEBAR_SECTIONS,
  UNGROUPED_IDS,
  type SidebarNavItem,
  type SidebarSubItem,
} from '../../config/sidebarConfig';
import { checkPermission } from '../../hooks/usePermission';

// ── Jurisdiction status dot color ─────────────────────────

function getStatusDotColor(locUrlId: string): string {
  const overrideKey = `demo-loc-${locUrlId}`;
  const override = DEMO_LOCATION_GRADE_OVERRIDES[overrideKey];
  if (!override) return '#6b7280'; // gray for unknown
  const foodStatus = override.foodSafety.status;
  if (foodStatus === 'failing') return '#dc2626';
  if (foodStatus === 'at_risk') return '#d97706';
  if (foodStatus === 'passing') return '#16a34a';
  return '#6b7280';
}

const STORAGE_KEY = 'evidly-sidebar-collapsed';

// ── Sidebar component ───────────────────────────────────

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { isDemoMode, presenterMode, togglePresenterMode } = useDemo();
  const { branding } = useBranding();

  const isTestMode = useMemo(() => checkTestMode(), []);
  const isEvidlyAdmin = false;
  const navItems = useMemo(() => {
    const roleFiltered = getNavItemsForRole(userRole, isEvidlyAdmin);
    // Permission system runs alongside role check (identical results in demo mode)
    return roleFiltered.filter(item => checkPermission(userRole, `sidebar.${item.id}`));
  }, [userRole, isEvidlyAdmin]);
  const navItemMap = useMemo(() => new Map(navItems.map(item => [item.id, item])), [navItems]);

  // ── Sub-item expansion state ──
  const [expandedNavItem, setExpandedNavItem] = useState<string | null>(null);

  // ── Collapsible section state ──
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // ── Ungrouped items (always visible at top) ──
  const ungroupedItems = useMemo(() =>
    UNGROUPED_IDS.map(id => navItemMap.get(id)).filter(Boolean) as SidebarNavItem[],
    [navItemMap]
  );

  // ── Sections with role-filtered items ──
  const sections = useMemo(() =>
    SIDEBAR_SECTIONS
      .map(section => ({
        ...section,
        items: section.itemIds
          .map(id => navItemMap.get(id))
          .filter(Boolean) as SidebarNavItem[],
      }))
      .filter(section => section.items.length > 0),
    [navItemMap]
  );

  // Location section visibility
  const showLocations = LOCATION_VISIBLE_ROLES.includes(userRole);
  const visibleLocations = useMemo(() => {
    if (!showLocations) return [];
    if (userRole === 'kitchen') {
      return demoLocations.filter(loc => loc.urlId === 'downtown');
    }
    return demoLocations;
  }, [showLocations, userRole]);

  // Expose test API for Playwright
  useEffect(() => {
    if (isTestMode) {
      (window as any).__evidly_test = {
        getVisibleNavItems: () => navItems.map(i => i.id),
        getCurrentRole: () => userRole,
        getNavItemCount: () => navItems.length,
      };
      console.log(`[EvidLY Test] Sidebar rendered for role: ${userRole}`);
      console.log(`[EvidLY Test] Visible items (${navItems.length}): ${navItems.map(i => i.id).join(', ')}`);
    }
    return () => {
      if (isTestMode) {
        delete (window as any).__evidly_test;
      }
    };
  }, [isTestMode, navItems, userRole]);

  // ── Render a sub-item ──
  const renderSubItem = (sub: SidebarSubItem) => {
    const active = location.pathname === sub.route || location.pathname + location.search === sub.route;
    return (
      <div
        key={sub.id}
        onClick={() => navigate(sub.route)}
        className={`flex items-center pl-10 pr-3 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-150 cursor-pointer ${
          active
            ? 'text-[#d4af37] bg-[#163a52]'
            : 'text-gray-300 hover:bg-[#163a52] hover:text-white'
        }`}
      >
        <span className="truncate">{sub.label}</span>
      </div>
    );
  };

  // ── Render a single nav item ──
  const renderNavItem = (item: SidebarNavItem) => {
    const active = location.pathname === item.route;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedNavItem === item.id;
    const testId = isTestMode ? `nav-${item.id}` : undefined;

    return (
      <div key={item.id}>
        <div
          onClick={() => {
            if (hasSubItems) {
              setExpandedNavItem(isExpanded ? null : item.id);
            }
            navigate(item.route);
          }}
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
          <span className="flex-1 truncate">{item.label}</span>
          {hasSubItems && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setExpandedNavItem(isExpanded ? null : item.id);
              }}
              className="ml-1 p-0.5 rounded hover:bg-white/10 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
              )}
            </span>
          )}
        </div>
        {hasSubItems && isExpanded && item.subItems!.map(sub => renderSubItem(sub))}
      </div>
    );
  };

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col z-[9999]">
      <div className="flex flex-col h-full" style={{ backgroundColor: branding.colors.sidebarBg }}>
        {/* Logo */}
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

        {/* Collapsible sidebar navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4" data-tour="sidebar-nav">
          {/* Ungrouped items (Dashboard, Calendar, My Tasks) */}
          {ungroupedItems.map(item => renderNavItem(item))}

          {ungroupedItems.length > 0 && sections.length > 0 && (
            <div className="my-2 border-t border-white/10 mx-1" />
          )}

          {/* Collapsible sections */}
          {sections.map(section => {
            const isCollapsed = !!collapsed[section.id];
            return (
              <div key={section.id} className="mb-1">
                {/* Section header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 mt-1 group cursor-pointer"
                >
                  <span
                    className="text-[10px] uppercase font-semibold tracking-wider"
                    style={{ color: '#94a3b8' }}
                  >
                    {section.label}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" style={{ color: '#94a3b8' }} />
                  ) : (
                    <ChevronDown className="h-3 w-3" style={{ color: '#94a3b8' }} />
                  )}
                </button>

                {/* Section items */}
                {!isCollapsed && section.items.map(item => renderNavItem(item))}
              </div>
            );
          })}
        </nav>

        {/* Locations — pinned to bottom, role-based visibility */}
        {showLocations && visibleLocations.length > 0 && (
          <div className="flex-shrink-0 border-t border-white/10 px-3 py-3">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Locations</span>
              {userRole === 'management' && (
                <span
                  onClick={() => navigate('/org-hierarchy')}
                  className="text-[10px] text-gray-500 hover:text-[#d4af37] cursor-pointer transition-colors"
                >
                  Edit
                </span>
              )}
            </div>
            {visibleLocations.map(loc => {
              const dotColor = getStatusDotColor(loc.urlId);
              const params = new URLSearchParams(window.location.search);
              const currentLoc = params.get('location');
              const isActive = currentLoc === loc.urlId;
              return (
                <div
                  key={loc.id}
                  onClick={() => navigate(`/dashboard?location=${loc.urlId}`)}
                  className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer transition-colors duration-150 ${
                    isActive ? 'bg-[#163a52] text-white' : 'text-gray-300 hover:bg-[#163a52] hover:text-white'
                  }`}
                  {...(isTestMode ? { 'data-testid': `nav-location-${loc.urlId}` } : {})}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mr-2"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="text-xs font-medium truncate">{loc.name}</span>
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

        {/* Demo upgrade badge */}
        <SidebarUpgradeBadge />
      </div>
    </div>
  );
}
