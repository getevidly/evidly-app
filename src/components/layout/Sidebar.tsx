import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Thermometer,
  CheckSquare,
  ClipboardList,
  Cog,
  ClipboardCheck,
  Truck,
  ShoppingBag,
  ShieldCheck,
  Building2,
  MailOpen,
  Shield,
  TrendingUp,
  Brain,
  Siren,
  GraduationCap,
  Network,
  Trophy,
  Users,
  Settings,
  CreditCard,
  HelpCircle,
  BarChart3,
  Lock,
  ChevronDown,
  ChevronRight,
  Upload,
  Camera,
  ListChecks,
  Bot,
  Scale,
  MapPin,
  ShieldAlert,
  Palette,
  Radio,
  Globe,
  Code2,
  Gift,
  type LucideIcon,
} from 'lucide-react';
import { useRole, UserRole } from '../../contexts/RoleContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { SidebarUpgradeBadge } from '../SidebarUpgradeBadge';
import { useSubscription } from '../../hooks/useSubscription';
import { getFeatureBadge } from '../../lib/featureGating';
import { useBranding } from '../../contexts/BrandingContext';
import { locations as demoLocations, locationScores, getGrade } from '../../data/demoData';

// ── Types ───────────────────────────────────────────────

type SectionId = 'main' | 'compliance' | 'vendors' | 'reports' | 'aiTools' | 'organization' | 'settings' | 'admin';

interface NavItem {
  i18nKey: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  badge?: number;
  featureId?: string;
}

interface NavSection {
  id: SectionId;
  i18nKey: string;
  items: NavItem[];
  adminOnly?: boolean;
}

// ── Navigation structure ────────────────────────────────

const allRoles: UserRole[] = ['executive', 'management', 'kitchen', 'facilities'];
const mgmtRoles: UserRole[] = ['executive', 'management'];

const sections: NavSection[] = [
  {
    id: 'main',
    i18nKey: 'nav.sectionMain',
    items: [
      { i18nKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard, roles: allRoles },
      { i18nKey: 'nav.calendar', href: '/calendar', icon: CalendarDays, roles: allRoles },
    ],
  },
  {
    id: 'compliance',
    i18nKey: 'nav.sectionCompliance',
    items: [
      { i18nKey: 'nav.temperatureLogs', href: '/temp-logs', icon: Thermometer, roles: ['executive', 'management', 'kitchen'] },
      { i18nKey: 'nav.dailyChecklists', href: '/checklists', icon: CheckSquare, roles: ['executive', 'management', 'kitchen'] },
      { i18nKey: 'nav.foodSafety', href: '/haccp', icon: ClipboardList, roles: ['executive', 'management', 'kitchen'] },
      { i18nKey: 'nav.documents', href: '/documents', icon: FileText, roles: allRoles },
      { i18nKey: 'nav.documentChecklist', href: '/document-checklist', icon: ListChecks, roles: mgmtRoles },
      { i18nKey: 'nav.equipment', href: '/equipment', icon: Cog, roles: allRoles },
      { i18nKey: 'nav.selfAudit', href: '/self-audit', icon: ClipboardCheck, roles: mgmtRoles },
      { i18nKey: 'nav.photoEvidence', href: '/photo-evidence', icon: Camera, roles: allRoles },
      { i18nKey: 'nav.jurisdictionSettings', href: '/jurisdiction', icon: MapPin, roles: mgmtRoles },
    ],
  },
  {
    id: 'vendors',
    i18nKey: 'nav.sectionVendors',
    items: [
      { i18nKey: 'nav.vendorManagement', href: '/vendors', icon: Truck, roles: ['executive', 'management', 'facilities'] },
      { i18nKey: 'nav.vendorPortal', href: '/marketplace', icon: ShoppingBag, roles: ['executive', 'management', 'facilities'] },
    ],
  },
  {
    id: 'reports',
    i18nKey: 'nav.sectionReports',
    items: [
      { i18nKey: 'nav.complianceScore', href: '/scoring-breakdown', icon: ShieldCheck, roles: mgmtRoles },
      { i18nKey: 'nav.healthDeptReports', href: '/health-dept-report', icon: Building2, roles: mgmtRoles },
      { i18nKey: 'nav.weeklyDigest', href: '/weekly-digest', icon: MailOpen, roles: mgmtRoles },
      { i18nKey: 'nav.complianceIntelligence', href: '/compliance-index', icon: Shield, roles: mgmtRoles, featureId: 'advanced-analytics' },
      { i18nKey: 'nav.predictiveAlerts', href: '/analysis', icon: TrendingUp, roles: mgmtRoles, badge: 4, featureId: 'ai-predictive-insights' },
      { i18nKey: 'nav.inspectorView', href: '/inspector-view', icon: ClipboardCheck, roles: mgmtRoles },
      { i18nKey: 'nav.auditTrail', href: '/audit-trail', icon: Shield, roles: mgmtRoles },
      { i18nKey: 'nav.benchmarks', href: '/benchmarks', icon: BarChart3, roles: mgmtRoles, featureId: 'industry-benchmarks' },
      { i18nKey: 'nav.insuranceRisk', href: '/insurance-risk', icon: ShieldAlert, roles: mgmtRoles, featureId: 'insurance-risk-score' },
      { i18nKey: 'nav.regulatoryUpdates', href: '/regulatory-alerts', icon: Scale, roles: mgmtRoles },
    ],
  },
  {
    id: 'aiTools',
    i18nKey: 'nav.sectionAiTools',
    items: [
      { i18nKey: 'nav.aiAdvisor', href: '/ai-advisor', icon: Brain, roles: allRoles },
      { i18nKey: 'nav.copilot', href: '/copilot', icon: Bot, roles: allRoles },
      { i18nKey: 'nav.incidentPlaybooks', href: '/playbooks', icon: Siren, roles: ['executive', 'management', 'kitchen'] },
      { i18nKey: 'nav.training', href: '/training', icon: GraduationCap, roles: ['executive', 'management', 'kitchen'] },
    ],
  },
  {
    id: 'organization',
    i18nKey: 'nav.sectionOrganization',
    items: [
      { i18nKey: 'nav.locations', href: '/org-hierarchy', icon: Network, roles: mgmtRoles },
      { i18nKey: 'nav.leaderboard', href: '/leaderboard', icon: Trophy, roles: mgmtRoles },
      { i18nKey: 'nav.referralProgram', href: '/referrals', icon: Gift, roles: mgmtRoles },
      { i18nKey: 'nav.teams', href: '/team', icon: Users, roles: mgmtRoles },
    ],
  },
  {
    id: 'settings',
    i18nKey: 'nav.sectionSettings',
    items: [
      { i18nKey: 'nav.settings', href: '/settings', icon: Settings, roles: mgmtRoles },
      { i18nKey: 'nav.branding', href: '/settings/branding', icon: Palette, roles: mgmtRoles },
      { i18nKey: 'nav.integrations', href: '/integrations', icon: Globe, roles: mgmtRoles },
      { i18nKey: 'nav.developerPortal', href: '/developers', icon: Code2, roles: mgmtRoles },
      { i18nKey: 'nav.iotSensors', href: '/settings/sensors', icon: Radio, roles: mgmtRoles },
      { i18nKey: 'nav.importData', href: '/import', icon: Upload, roles: mgmtRoles },
      { i18nKey: 'nav.billing', href: '/settings', icon: CreditCard, roles: mgmtRoles },
      { i18nKey: 'nav.helpSupport', href: '/help', icon: HelpCircle, roles: allRoles },
    ],
  },
  {
    id: 'admin',
    i18nKey: 'nav.admin',
    items: [
      { i18nKey: 'nav.usageAnalytics', href: '/admin/usage-analytics', icon: BarChart3, roles: allRoles },
      { i18nKey: 'nav.regulatoryChanges', href: '/admin/regulatory-changes', icon: Scale, roles: allRoles },
      { i18nKey: 'nav.systemAdmin', href: '/enterprise/dashboard', icon: Building2, roles: allRoles, featureId: 'enterprise-dashboard' },
    ],
    adminOnly: true,
  },
];

// ── Collapse state persistence ──────────────────────────

const STORAGE_KEY = 'evidly_sidebar_sections';
const DEFAULT_EXPANDED: SectionId[] = ['main', 'compliance'];

function loadExpandedState(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* noop */ }
  return Object.fromEntries(DEFAULT_EXPANDED.map(id => [id, true]));
}

function saveExpandedState(state: Record<string, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* noop */ }
}

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

  const [expanded, setExpanded] = useState<Record<string, boolean>>(loadExpandedState);

  const isExpanded = (id: SectionId) => expanded[id] ?? false;

  const toggleSection = (id: SectionId) => {
    setExpanded(prev => {
      const next = { ...prev, [id]: !isExpanded(id) };
      saveExpandedState(next);
      return next;
    });
  };

  // Auto-expand the section containing the current route
  useEffect(() => {
    for (const section of sections) {
      if (section.items.some(item => location.pathname === item.href)) {
        if (!isExpanded(section.id)) {
          setExpanded(prev => {
            const next = { ...prev, [section.id]: true };
            saveExpandedState(next);
            return next;
          });
        }
        break;
      }
    }
  }, [location.pathname]);

  // Filter sections & items by role and admin visibility
  const visibleSections = sections
    .filter(section => {
      if (section.adminOnly && !showAdmin) return false;
      return section.items.some(item => item.roles.includes(userRole));
    });

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

        {/* Scrollable navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4" data-tour="sidebar-nav">
          {visibleSections.map((section) => {
            const visibleItems = section.items.filter(item => item.roles.includes(userRole));
            if (visibleItems.length === 0) return null;

            const sectionOpen = isExpanded(section.id);
            const isAdmin = section.adminOnly;

            return (
              <div key={section.id} className={isAdmin ? 'border-t border-white/10 mt-2 pt-1' : ''}>
                {/* Section header — clickable to toggle */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 pt-3 pb-1 group"
                >
                  <div className="flex items-center gap-1.5">
                    {isAdmin && <Lock className="h-3 w-3 text-gray-500" />}
                    <span className={`text-[11px] uppercase tracking-wider font-semibold ${isAdmin ? 'text-gray-500' : 'text-gray-400'} group-hover:text-gray-300 transition-colors`}>
                      {t(section.i18nKey)}
                    </span>
                  </div>
                  {sectionOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500 group-hover:text-gray-300 transition-colors" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-500 group-hover:text-gray-300 transition-colors" />
                  )}
                </button>

                {/* Section items — shown when expanded */}
                {sectionOpen && (
                  <div className="space-y-0.5 mt-0.5">
                    {visibleItems.map(item => {
                      const active = location.pathname === item.href;
                      return (
                        <div
                          key={item.i18nKey}
                          onClick={() => navigate(item.href)}
                          className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 cursor-pointer ${
                            active
                              ? 'text-[#d4af37] bg-[#163a52]'
                              : isAdmin
                              ? 'text-gray-400 hover:bg-[#163a52] hover:text-gray-200'
                              : 'text-gray-200 hover:bg-[#163a52] hover:text-white'
                          }`}
                          style={active ? { boxShadow: 'inset 3px 0 0 #d4af37' } : undefined}
                        >
                          <item.icon
                            className={`mr-3 flex-shrink-0 h-[18px] w-[18px] ${
                              active ? 'text-[#d4af37]' : isAdmin ? 'text-gray-500 group-hover:text-gray-300' : 'text-gray-300 group-hover:text-white'
                            }`}
                          />
                          <span className="flex-1 truncate">{t(item.i18nKey)}</span>
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
                  </div>
                )}
              </div>
            );
          })}
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
