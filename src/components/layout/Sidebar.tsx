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
} from 'lucide-react';
import { useRole, UserRole } from '../../contexts/RoleContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tourId: '', roles: ['management', 'kitchen', 'facilities'] as UserRole[] },
  { name: 'Temperatures', href: '/temp-logs', icon: Thermometer, tourId: 'temp-logs-nav', roles: ['management', 'kitchen'] as UserRole[] },
  { name: 'Checklists', href: '/checklists', icon: CheckSquare, tourId: 'checklists-nav', roles: ['management', 'kitchen'] as UserRole[] },
  { name: 'HACCP', href: '/haccp', icon: ClipboardList, tourId: '', roles: ['management', 'kitchen'] as UserRole[] },
  { name: 'Vendor Services', href: '/vendors', icon: Truck, tourId: '', roles: ['management', 'facilities'] as UserRole[] },
  { name: 'Documentation', href: '/documents', icon: FileText, tourId: '', roles: ['management', 'facilities'] as UserRole[] },
  { name: 'Reporting', href: '/reports', icon: BarChart3, tourId: '', roles: ['management'] as UserRole[] },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy, tourId: '', roles: ['management'] as UserRole[] },
  { name: 'Analysis', href: '/analysis', icon: TrendingUp, tourId: '', roles: ['management'] as UserRole[] },
  { name: 'AI Advisor', href: '/ai-advisor', icon: MessageSquare, tourId: 'ai-advisor-nav', roles: ['management', 'kitchen'] as UserRole[] },
  { name: 'Alerts', href: '/alerts', icon: Bell, tourId: '', roles: ['management', 'kitchen', 'facilities'] as UserRole[] },
  { name: 'Teams', href: '/team', icon: Users, tourId: '', roles: ['management'] as UserRole[] },
  { name: 'Settings', href: '/settings', icon: Settings, tourId: '', roles: ['management', 'kitchen', 'facilities'] as UserRole[] },
  { name: 'Help', href: '/help', icon: HelpCircle, tourId: '', roles: ['management', 'kitchen', 'facilities'] as UserRole[] },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useRole();

  const filteredNavigation = navigation.filter(item => item.roles.includes(userRole));

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col z-[9998]" style={{ position: 'fixed', zIndex: 99999, pointerEvents: 'auto' }}>
      <div className="flex flex-col flex-grow bg-[#1e4d6b] overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-6 py-6">
          <ShieldCheck className="h-8 w-8" style={{ color: '#d4af37' }} />
          <span className="ml-3 text-xl font-bold">
            <span className="text-white">Evid</span>
            <span className="text-[#d4af37]">LY</span>
          </span>
        </div>
        <nav className="mt-5 flex-1 flex flex-col px-3 space-y-1" data-tour="sidebar-nav">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <div
                key={item.name}
                onClick={() => { navigate(item.href); }}
                data-tour={item.tourId || undefined}
                style={{ cursor: 'pointer', pointerEvents: 'auto', position: 'relative', zIndex: 99999 }}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'text-[#d4af37] border-l-4 border-[#d4af37] bg-[#153a4d]'
                    : 'text-gray-200 hover:bg-[#153a4d] hover:text-white border-l-4 border-transparent'
                }`}
              >
                <item.icon
                  className={`mr-3 flex-shrink-0 h-5 w-5 ${
                    isActive ? 'text-[#d4af37]' : 'text-gray-300 group-hover:text-white'
                  }`}
                />
                {item.name}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
