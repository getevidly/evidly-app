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
  HelpCircle,
  LogOut,
  AlertCircle,
  ClipboardCheck,
  Target,
  ShoppingBag,
  Network,
  Camera,
  GraduationCap,
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
  const isKitchen = userRole === 'kitchen_staff';

  // Role-specific primary tabs
  // Kitchen staff: 5 dedicated tabs, no More button
  // All other roles: 4 tabs + More button
  const tabsByRole: Record<UserRole, { path: string; icon: any; label: string }[]> = {
    owner_operator: [
      { path: '/dashboard', icon: Home, label: 'Home' },
      { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
      { path: '/documents', icon: FileText, label: 'Docs' },
      { path: '/reports', icon: BarChart3, label: 'Reporting' },
    ],
    executive: [
      { path: '/dashboard', icon: Home, label: 'Home' },
      { path: '/reports', icon: BarChart3, label: 'Reporting' },
      { path: '/benchmarks', icon: Target, label: 'Benchmarks' },
      { path: '/org-hierarchy', icon: Network, label: 'Locations' },
    ],
    compliance_manager: [
      { path: '/dashboard', icon: Home, label: 'Home' },
      { path: '/scoring-breakdown', icon: Target, label: 'Compliance' },
      { path: '/self-inspection', icon: ClipboardCheck, label: 'Inspect' },
      { path: '/reports', icon: BarChart3, label: 'Reports' },
    ],
    chef: [
      { path: '/dashboard', icon: Home, label: 'Home' },
      { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
      { path: '/checklists', icon: ClipboardList, label: 'Lists' },
      { path: '/documents', icon: FileText, label: 'Docs' },
    ],
    facilities_manager: [
      { path: '/dashboard', icon: Home, label: 'Home' },
      { path: '/vendors', icon: Store, label: 'Vendors' },
      { path: '/documents', icon: FileText, label: 'Docs' },
      { path: '/analysis', icon: Bell, label: 'Alerts' },
    ],
    kitchen_manager: [
      { path: '/dashboard', icon: Home, label: 'Home' },
      { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
      { path: '/checklists', icon: ClipboardList, label: 'Lists' },
      { path: '/documents', icon: FileText, label: 'Docs' },
    ],
    kitchen_staff: [
      { path: '/dashboard', icon: ClipboardCheck, label: 'Tasks' },
      { path: '/temp-logs', icon: Thermometer, label: 'Temp' },
      { path: '/photo-evidence', icon: Camera, label: 'Photo' },
      { path: '/playbooks', icon: AlertTriangle, label: 'Report' },
      { path: '/training', icon: GraduationCap, label: 'Train' },
    ],
  };

  // Role-specific "More" items (kitchen has none — all 5 tabs are primary)
  const moreByRole: Record<UserRole, { path: string; icon: any; label: string }[]> = {
    owner_operator: [
      { path: '/checklists', icon: ClipboardList, label: 'Checklists' },
      { path: '/vendors', icon: Store, label: 'Vendors' },
      { path: '/playbooks', icon: AlertCircle, label: 'Incidents' },
      { path: '/scoring-breakdown', icon: Target, label: 'Compliance' },
      { path: '/copilot', icon: Brain, label: 'Copilot' },
      { path: '/self-inspection', icon: ClipboardCheck, label: 'Self-Inspection' },
      { path: '/photo-evidence', icon: Camera, label: 'Photos' },
      { path: '/analysis', icon: Bell, label: 'Alerts' },
      { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
      { path: '/benchmarks', icon: Target, label: 'Benchmarks' },
      { path: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
      { path: '/team', icon: Users, label: 'Team' },
      { path: '/training', icon: GraduationCap, label: 'Training' },
      { path: '/settings', icon: Settings, label: 'Settings' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    executive: [
      { path: '/scoring-breakdown', icon: Target, label: 'Compliance' },
      { path: '/copilot', icon: Brain, label: 'Copilot' },
      { path: '/regulatory-alerts', icon: AlertCircle, label: 'Regulatory' },
      { path: '/insurance-risk', icon: AlertTriangle, label: 'Risk Score' },
      { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
      { path: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
      { path: '/team', icon: Users, label: 'Team' },
      { path: '/settings', icon: Settings, label: 'Settings' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    compliance_manager: [
      { path: '/copilot', icon: Brain, label: 'Copilot' },
      { path: '/regulatory-alerts', icon: AlertCircle, label: 'Regulatory' },
      { path: '/documents', icon: FileText, label: 'Documents' },
      { path: '/benchmarks', icon: Target, label: 'Benchmarks' },
      { path: '/insurance-risk', icon: AlertTriangle, label: 'Risk Score' },
      { path: '/settings', icon: Settings, label: 'Settings' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    chef: [
      { path: '/vendors', icon: Store, label: 'Vendors' },
      { path: '/playbooks', icon: AlertCircle, label: 'Incidents' },
      { path: '/copilot', icon: Brain, label: 'Copilot' },
      { path: '/training', icon: GraduationCap, label: 'Training' },
      { path: '/team', icon: Users, label: 'Team' },
      { path: '/settings', icon: Settings, label: 'Settings' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    facilities_manager: [
      { path: '/playbooks', icon: AlertCircle, label: 'Incidents' },
      { path: '/equipment', icon: Store, label: 'Equipment' },
      { path: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
      { path: '/settings', icon: Settings, label: 'Settings' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    kitchen_manager: [
      { path: '/vendors', icon: Store, label: 'Vendors' },
      { path: '/playbooks', icon: AlertCircle, label: 'Incidents' },
      { path: '/copilot', icon: Brain, label: 'Copilot' },
      { path: '/training', icon: GraduationCap, label: 'Training' },
      { path: '/team', icon: Users, label: 'Team' },
      { path: '/settings', icon: Settings, label: 'Settings' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    kitchen_staff: [],
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
      {/* More menu backdrop */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* More menu drawer (not shown for kitchen) */}
      {!isKitchen && (
        <div
          className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-sm transition-transform duration-300 ease-out z-40 md:hidden ${
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
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden h-14 safe-area-bottom">
        <div className="grid grid-cols-5 h-full">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => handleNavigation(tab.path)}
                className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors duration-150 active:bg-gray-50 ${
                  active ? 'bg-[#d4af37]/10' : ''
                }`}
                style={active ? { boxShadow: 'inset 0 2px 0 #d4af37' } : undefined}
              >
                <Icon
                  className={`h-5 w-5 ${active ? 'text-[#d4af37]' : 'text-gray-400'}`}
                />
                <span
                  className={`text-[10px] mt-0.5 ${active ? 'text-[#d4af37] font-semibold' : 'text-gray-500'}`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
          {/* More button — only for non-kitchen roles */}
          {!isKitchen && (
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors duration-150 active:bg-gray-50 ${
                showMoreMenu ? 'bg-[#d4af37]/10' : ''
              }`}
              style={showMoreMenu ? { boxShadow: 'inset 0 2px 0 #d4af37' } : undefined}
            >
              <MoreHorizontal className={`h-5 w-5 ${showMoreMenu ? 'text-[#d4af37]' : 'text-gray-400'}`} />
              <span className={`text-[10px] mt-0.5 ${showMoreMenu ? 'text-[#d4af37] font-semibold' : 'text-gray-500'}`}>More</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
