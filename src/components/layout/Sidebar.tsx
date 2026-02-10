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
} from 'lucide-react';
import { useRole, UserRole } from '../../contexts/RoleContext';

type Section = 'operations' | 'insights' | 'system';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  tourId: string;
  roles: UserRole[];
  section: Section;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tourId: '', roles: ['executive', 'management', 'kitchen', 'facilities'], section: 'operations' },
  { name: 'Temperatures', href: '/temp-logs', icon: Thermometer, tourId: 'temp-logs-nav', roles: ['executive', 'management', 'kitchen'], section: 'operations' },
  { name: 'Checklists', href: '/checklists', icon: CheckSquare, tourId: 'checklists-nav', roles: ['executive', 'management', 'kitchen'], section: 'operations' },
  { name: 'HACCP', href: '/haccp', icon: ClipboardList, tourId: '', roles: ['executive', 'management', 'kitchen'], section: 'operations' },
  { name: 'Vendor Services', href: '/vendors', icon: Truck, tourId: '', roles: ['executive', 'management', 'facilities'], section: 'operations' },
  { name: 'Documentation', href: '/documents', icon: FileText, tourId: '', roles: ['executive', 'management', 'kitchen', 'facilities'], section: 'operations' },
  { name: 'Calendar', href: '/calendar', icon: CalendarDays, tourId: '', roles: ['executive', 'management', 'kitchen', 'facilities'], section: 'operations' },
  { name: 'Reporting', href: '/reports', icon: BarChart3, tourId: '', roles: ['executive', 'management'], section: 'insights' },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy, tourId: '', roles: ['executive', 'management'], section: 'insights' },
  { name: 'Analysis', href: '/analysis', icon: TrendingUp, tourId: '', roles: ['executive', 'management'], section: 'insights' },
  { name: 'AI Advisor', href: '/ai-advisor', icon: MessageSquare, tourId: 'ai-advisor-nav', roles: ['executive', 'management'], section: 'insights' },
  { name: 'Alerts', href: '/alerts', icon: Bell, tourId: '', roles: ['executive', 'management', 'facilities'], section: 'insights' },
  { name: 'Teams', href: '/team', icon: Users, tourId: '', roles: ['executive', 'management'], section: 'system' },
  { name: 'Settings', href: '/settings', icon: Settings, tourId: '', roles: ['executive', 'management'], section: 'system' },
  { name: 'Help', href: '/help', icon: HelpCircle, tourId: '', roles: ['executive', 'management', 'kitchen', 'facilities'], section: 'system' },
];

const sectionLabels: Record<Section, string> = {
  operations: 'OPERATIONS',
  insights: 'INSIGHTS',
  system: 'SYSTEM',
};

const mainSections: Section[] = ['operations', 'insights'];

function NavItemRow({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick: () => void }) {
  return (
    <div
      key={item.name}
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
      {item.name}
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useRole();

  const filteredNavigation = navigation.filter(item => item.roles.includes(userRole));

  const mainItems = filteredNavigation.filter(item => mainSections.includes(item.section));
  const systemItems = filteredNavigation.filter(item => item.section === 'system');

  const renderSection = (sectionKey: Section, items: NavItem[]) => {
    const sectionItems = items.filter(item => item.section === sectionKey);
    if (sectionItems.length === 0) return null;
    return (
      <div key={sectionKey}>
        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold px-3 pt-4 pb-1">
          {sectionLabels[sectionKey]}
        </div>
        <div className="space-y-0.5">
          {sectionItems.map(item => (
            <NavItemRow
              key={item.name}
              item={item}
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
              {sectionLabels.system}
            </div>
            <div className="space-y-0.5">
              {systemItems.map(item => (
                <NavItemRow
                  key={item.name}
                  item={item}
                  isActive={location.pathname === item.href}
                  onClick={() => navigate(item.href)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
