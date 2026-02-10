import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Thermometer,
  CheckSquare,
  FileText,
  Truck,
  ShieldCheck,
  ClipboardList,
  Bell,
  MessageSquare,
  Trophy,
  Users,
  Settings,
  BarChart3,
  TrendingUp,
  HelpCircle,
  CalendarDays,
  Lock,
  MailOpen,
  AlertTriangle,
  ClipboardCheck,
  Cog,
  Megaphone,
} from 'lucide-react';
import { useRole, UserRole } from '../../contexts/RoleContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useTranslation } from '../../contexts/LanguageContext';

type Section = 'operations' | 'insights' | 'system';

interface NavItem {
  i18nKey: string;
  href: string;
  icon: typeof LayoutDashboard;
  tourId: string;
  roles: UserRole[];
  section: Section;
  badge?: boolean;
  badgeCount?: number;
}

const navigation: NavItem[] = [
  { i18nKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard, tourId: '', roles: ['executive', 'management', 'kitchen', 'facilities'], section: 'operations' },
  { i18nKey: 'nav.temperatures', href: '/temp-logs', icon: Thermometer, tourId: 'temp-logs-nav', roles: ['executive', 'management', 'kitchen'], section: 'operations' },
  { i18nKey: 'nav.checklists', href: '/checklists', icon: CheckSquare, tourId: 'checklists-nav', roles: ['executive', 'management', 'kitchen'], section: 'operations' },
  { i18nKey: 'nav.haccp', href: '/haccp', icon: ClipboardList, tourId: '', roles: ['executive', 'management', 'kitchen'], section: 'operations' },
  { i18nKey: 'nav.vendorServices', href: '/vendors', icon: Truck, tourId: '', roles: ['executive', 'management', 'facilities'], section: 'operations' },
  { i18nKey: 'nav.equipment', href: '/equipment', icon: Cog, tourId: '', roles: ['executive', 'management', 'kitchen', 'facilities'], section: 'operations', badgeCount: 3 },
  { i18nKey: 'nav.documentation', href: '/documents', icon: FileText, tourId: '', roles: ['executive', 'management', 'kitchen', 'facilities'], section: 'operations' },
  { i18nKey: 'nav.calendar', href: '/calendar', icon: CalendarDays, tourId: '', roles: ['executive', 'management', 'kitchen', 'facilities'], section: 'operations' },
  { i18nKey: 'nav.incidentLog', href: '/incidents', icon: AlertTriangle, tourId: '', roles: ['executive', 'management', 'kitchen', 'facilities'], section: 'operations' },
  { i18nKey: 'nav.reporting', href: '/reports', icon: BarChart3, tourId: '', roles: ['executive', 'management'], section: 'insights' },
  { i18nKey: 'nav.auditReport', href: '/audit-report', icon: ClipboardCheck, tourId: '', roles: ['executive', 'management'], section: 'insights' },
  { i18nKey: 'nav.scoreBreakdown', href: '/scoring-breakdown', icon: ShieldCheck, tourId: '', roles: ['executive', 'management'], section: 'insights' },
  { i18nKey: 'nav.leaderboard', href: '/leaderboard', icon: Trophy, tourId: '', roles: ['executive', 'management'], section: 'insights' },
  { i18nKey: 'nav.benchmarks', href: '/benchmarks', icon: BarChart3, tourId: '', roles: ['executive', 'management'], section: 'insights' },
  { i18nKey: 'nav.predictiveAlerts', href: '/analysis', icon: TrendingUp, tourId: '', roles: ['executive', 'management'], section: 'insights', badge: true },
  { i18nKey: 'nav.aiAdvisor', href: '/ai-advisor', icon: MessageSquare, tourId: 'ai-advisor-nav', roles: ['executive', 'management', 'kitchen', 'facilities'], section: 'insights' },
  { i18nKey: 'nav.weeklyDigest', href: '/weekly-digest', icon: MailOpen, tourId: '', roles: ['executive', 'management'], section: 'insights' },
  { i18nKey: 'nav.regulatoryAlerts', href: '/regulatory-alerts', icon: Megaphone, tourId: '', roles: ['executive', 'management'], section: 'insights', badgeCount: 2 },
  { i18nKey: 'nav.alerts', href: '/alerts', icon: Bell, tourId: '', roles: ['executive', 'management', 'facilities'], section: 'insights' },
  { i18nKey: 'nav.teams', href: '/team', icon: Users, tourId: '', roles: ['executive', 'management'], section: 'system' },
  { i18nKey: 'nav.settings', href: '/settings', icon: Settings, tourId: '', roles: ['executive', 'management'], section: 'system' },
  { i18nKey: 'nav.help', href: '/help', icon: HelpCircle, tourId: '', roles: ['executive', 'management', 'kitchen', 'facilities'], section: 'system' },
];

const mainSections: Section[] = ['operations', 'insights'];

// Demo: count of active high-severity predictive alerts for badge
const HIGH_ALERT_COUNT = 4;

function NavItemRow({ item, label, isActive, onClick }: { item: NavItem; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <div
      key={item.i18nKey}
      onClick={onClick}
      data-tour={item.tourId || undefined}
      className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 cursor-pointer ${
        isActive
          ? 'text-[#d4af37] bg-[#163a52]'
          : 'text-gray-200 hover:bg-[#163a52] hover:text-white'
      }`}
      style={isActive ? { boxShadow: 'inset 3px 0 0 #d4af37' } : undefined}
    >
      <item.icon
        className={`mr-3 flex-shrink-0 h-5 w-5 ${
          isActive ? 'text-[#d4af37]' : 'text-gray-300 group-hover:text-white'
        }`}
      />
      <span className="flex-1">{label}</span>
      {item.badge && HIGH_ALERT_COUNT > 0 && (
        <span style={{ backgroundColor: '#dc2626', color: 'white', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '9999px', minWidth: '18px', textAlign: 'center', lineHeight: '16px' }}>
          {HIGH_ALERT_COUNT}
        </span>
      )}
      {item.badgeCount && item.badgeCount > 0 && (
        <span style={{ backgroundColor: '#dc2626', color: 'white', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '9999px', minWidth: '18px', textAlign: 'center', lineHeight: '16px' }}>
          {item.badgeCount}
        </span>
      )}
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const { t } = useTranslation();
  const showAdminSection = isEvidlyAdmin || isDemoMode;

  const filteredNavigation = navigation.filter(item => item.roles.includes(userRole));

  const mainItems = filteredNavigation.filter(item => mainSections.includes(item.section));
  const systemItems = filteredNavigation.filter(item => item.section === 'system');

  const sectionLabelKeys: Record<Section, string> = {
    operations: 'nav.operations',
    insights: 'nav.insights',
    system: 'nav.system',
  };

  const renderSection = (sectionKey: Section, items: NavItem[]) => {
    const sectionItems = items.filter(item => item.section === sectionKey);
    if (sectionItems.length === 0) return null;
    return (
      <div key={sectionKey}>
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold px-3 pt-4 pb-1">
          {t(sectionLabelKeys[sectionKey])}
        </div>
        <div className="space-y-0.5">
          {sectionItems.map(item => (
            <NavItemRow
              key={item.i18nKey}
              item={item}
              label={t(item.i18nKey)}
              isActive={location.pathname === item.href}
              onClick={() => navigate(item.href)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col z-[9999]">
      <div className="flex flex-col flex-grow bg-[#1e4d6b]">
        <div className="flex items-center flex-shrink-0 px-6 py-6">
          <ShieldCheck className="h-8 w-8" style={{ color: '#d4af37' }} />
          <span className="ml-3 text-xl font-bold">
            <span className="text-white">Evid</span>
            <span className="text-[#d4af37]">LY</span>
          </span>
        </div>

        {/* Scrollable main nav: Operations + Insights */}
        <nav className="flex-1 overflow-y-auto px-3 pb-2" data-tour="sidebar-nav">
          {mainSections.map(section => renderSection(section, mainItems))}
        </nav>

        {/* Pinned bottom: System */}
        {systemItems.length > 0 && (
          <div className="px-3 pb-4 pt-2 border-t border-white/10">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold px-3 pt-2 pb-1">
              {t('nav.system')}
            </div>
            <div className="space-y-0.5">
              {systemItems.map(item => (
                <NavItemRow
                  key={item.i18nKey}
                  item={item}
                  label={t(item.i18nKey)}
                  isActive={location.pathname === item.href}
                  onClick={() => navigate(item.href)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Admin — EvidLY internal only */}
        {showAdminSection && (
          <div className="px-3 pb-4 pt-1 border-t border-white/10">
            <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
              <Lock className="h-3 w-3 text-gray-500" />
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('nav.admin')}</span>
            </div>
            <div
              onClick={() => navigate('/admin/usage-analytics')}
              className={`group flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors duration-150 cursor-pointer ${
                location.pathname === '/admin/usage-analytics'
                  ? 'text-[#d4af37] bg-[#163a52]'
                  : 'text-gray-400 hover:bg-[#163a52] hover:text-gray-200'
              }`}
              style={location.pathname === '/admin/usage-analytics' ? { boxShadow: 'inset 3px 0 0 #d4af37' } : undefined}
            >
              <BarChart3 className={`mr-3 flex-shrink-0 h-4 w-4 ${
                location.pathname === '/admin/usage-analytics' ? 'text-[#d4af37]' : 'text-gray-500 group-hover:text-gray-300'
              }`} />
              {t('nav.usageAnalytics')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
