import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Thermometer,
  ClipboardList,
  FileText,
  MoreHorizontal,
  Store,
  AlertTriangle,
  Brain,
  Trophy,
  BarChart3,
  Users,
  Bell,
  Settings,
  X,
  TrendingUp,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { useRole, UserRole } from '../../contexts/RoleContext';
import { useAuth } from '../../contexts/AuthContext';

export function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { userRole } = useRole();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  // Role-specific primary tabs — the 4 things each role uses most
  const tabsByRole: Record<UserRole, { path: string; icon: any; label: string }[]> = {
    executive: [
      { path: '/dashboard', icon: Home, label: 'Home' },
      { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
      { path: '/documents', icon: FileText, label: 'Docs' },
      { path: '/reports', icon: BarChart3, label: 'Reporting' },
    ],
    management: [
      { path: '/dashboard', icon: Home, label: 'Home' },
      { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
      { path: '/documents', icon: FileText, label: 'Docs' },
      { path: '/reports', icon: BarChart3, label: 'Reporting' },
    ],
    kitchen: [
      { path: '/dashboard', icon: Home, label: 'Home' },
      { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
      { path: '/checklists', icon: ClipboardList, label: 'Lists' },
      { path: '/haccp', icon: AlertTriangle, label: 'HACCP' },
    ],
    facilities: [
      { path: '/dashboard', icon: Home, label: 'Home' },
      { path: '/vendors', icon: Store, label: 'Vendors' },
      { path: '/documents', icon: FileText, label: 'Docs' },
      { path: '/alerts', icon: Bell, label: 'Alerts' },
    ],
  };

  // Role-specific "More" items — everything else they have access to
  const moreByRole: Record<UserRole, { path: string; icon: any; label: string }[]> = {
    executive: [
      { path: '/checklists', icon: ClipboardList, label: 'Checklists' },
      { path: '/vendors', icon: Store, label: 'Vendors' },
      { path: '/haccp', icon: AlertTriangle, label: 'HACCP' },
      { path: '/analysis', icon: TrendingUp, label: 'Analysis' },
      { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
      { path: '/ai-advisor', icon: Brain, label: 'AI Advisor' },
      { path: '/team', icon: Users, label: 'Team' },
      { path: '/alerts', icon: Bell, label: 'Alerts' },
      { path: '/settings', icon: Settings, label: 'Settings' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    management: [
      { path: '/checklists', icon: ClipboardList, label: 'Checklists' },
      { path: '/vendors', icon: Store, label: 'Vendors' },
      { path: '/haccp', icon: AlertTriangle, label: 'HACCP' },
      { path: '/analysis', icon: TrendingUp, label: 'Analysis' },
      { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
      { path: '/ai-advisor', icon: Brain, label: 'AI Advisor' },
      { path: '/team', icon: Users, label: 'Team' },
      { path: '/alerts', icon: Bell, label: 'Alerts' },
      { path: '/settings', icon: Settings, label: 'Settings' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    kitchen: [
      { path: '/documents', icon: FileText, label: 'Docs' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    facilities: [
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
  };

  const mainTabs = tabsByRole[userRole];
  const moreItems = moreByRole[userRole];

  const handleNavigation = (path: string) => {
    navigate(path);
    setShowMoreMenu(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
    setShowMoreMenu(false);
  };

  return (
    <>
      {showMoreMenu && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-lg transition-transform duration-300 ease-out z-40 md:hidden ${
          showMoreMenu ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '70vh' }}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#1e4d6b]">More Options</h3>
          <button
            onClick={() => setShowMoreMenu(false)}
            className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 140px)' }}>
          <div className="grid grid-cols-3 gap-4">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg min-h-[80px] transition-all duration-150 ${
                    active
                      ? 'bg-[#d4af37]/10'
                      : 'hover:bg-gray-100'
                  }`}
                  style={active ? { boxShadow: 'inset 0 -2px 0 #d4af37' } : undefined}
                >
                  <Icon
                    className={`h-6 w-6 mb-2 ${active ? 'text-[#d4af37]' : 'text-gray-400'}`}
                  />
                  <span
                    className={`text-xs font-medium text-center ${
                      active ? 'text-[#d4af37]' : 'text-gray-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors duration-150"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden h-16 safe-area-bottom">
        <div className="grid grid-cols-5 h-full">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => handleNavigation(tab.path)}
                className={`flex flex-col items-center justify-center min-h-[56px] transition-colors duration-150 active:bg-gray-50 ${
                  active ? 'bg-[#d4af37]/10' : ''
                }`}
                style={active ? { boxShadow: 'inset 0 2px 0 #d4af37' } : undefined}
              >
                <Icon
                  className={`h-6 w-6 ${active ? 'text-[#d4af37]' : 'text-gray-400'}`}
                />
                <span
                  className={`text-[10px] mt-1 ${active ? 'text-[#d4af37] font-semibold' : 'text-gray-500'}`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center min-h-[56px] transition-colors duration-150 active:bg-gray-50 ${
              showMoreMenu ? 'bg-[#d4af37]/10' : ''
            }`}
            style={showMoreMenu ? { boxShadow: 'inset 0 2px 0 #d4af37' } : undefined}
          >
            <MoreHorizontal className={`h-6 w-6 ${showMoreMenu ? 'text-[#d4af37]' : 'text-gray-400'}`} />
            <span className={`text-[10px] mt-1 ${showMoreMenu ? 'text-[#d4af37] font-semibold' : 'text-gray-500'}`}>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
