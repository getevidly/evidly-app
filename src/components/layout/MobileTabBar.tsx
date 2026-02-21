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
  BarChart3,
  Users,
  Settings,
  X,
  HelpCircle,
  LogOut,
  AlertCircle,
  ClipboardCheck,
  Target,
  Network,
  Camera,
  GraduationCap,
  Wrench,
  Calendar,
  TrendingUp,
  Lightbulb,
  Snowflake,
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

  // Role-specific primary tabs (per NAV-SPEC-1)
  // Kitchen staff: 5 dedicated tabs, no More button
  // All other roles: 4 tabs + More button
  const tabsByRole: Record<UserRole, { path: string; icon: any; label: string }[]> = {
    kitchen_staff: [
      { path: '/dashboard', icon: Home, label: 'Today' },
      { path: '/checklists', icon: ClipboardList, label: 'Checklists' },
      { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
      { path: '/self-diagnosis', icon: Wrench, label: 'Diagnosis' },
      { path: '/incidents', icon: AlertTriangle, label: 'Report' },
    ],
    chef: [
      { path: '/dashboard', icon: Home, label: 'Kitchen' },
      { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
      { path: '/cooling-logs', icon: Snowflake, label: 'Cooling' },
      { path: '/checklists', icon: ClipboardList, label: 'Lists' },
    ],
    kitchen_manager: [
      { path: '/dashboard', icon: Home, label: 'Dashboard' },
      { path: '/checklists', icon: ClipboardList, label: 'Lists' },
      { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
      { path: '/self-diagnosis', icon: Wrench, label: 'Diagnosis' },
    ],
    compliance_manager: [
      { path: '/dashboard', icon: Home, label: 'Dashboard' },
      { path: '/corrective-actions', icon: AlertCircle, label: 'Actions' },
      { path: '/self-inspection', icon: ClipboardCheck, label: 'Inspect' },
      { path: '/business-intelligence', icon: Lightbulb, label: 'Insights' },
    ],
    facilities_manager: [
      { path: '/dashboard', icon: Home, label: 'Equipment' },
      { path: '/calendar', icon: Calendar, label: 'Calendar' },
      { path: '/vendors', icon: Store, label: 'Vendors' },
      { path: '/self-diagnosis', icon: Wrench, label: 'Diagnosis' },
    ],
    owner_operator: [
      { path: '/dashboard', icon: Home, label: 'Portfolio' },
      { path: '/business-intelligence', icon: Lightbulb, label: 'Intel' },
      { path: '/scoring-breakdown', icon: Target, label: 'Scores' },
      { path: '/self-diagnosis', icon: Wrench, label: 'Diagnosis' },
    ],
    executive: [
      { path: '/dashboard', icon: Home, label: 'Insights' },
      { path: '/business-intelligence', icon: Lightbulb, label: 'Intel' },
      { path: '/scoring-breakdown', icon: Target, label: 'Scores' },
      { path: '/analysis', icon: TrendingUp, label: 'Analytics' },
    ],
  };

  // Role-specific "More" items (kitchen_staff has none — all 5 tabs are primary)
  const moreByRole: Record<UserRole, { path: string; icon: any; label: string }[]> = {
    kitchen_staff: [],
    chef: [
      { path: '/haccp', icon: ClipboardCheck, label: 'HACCP' },
      { path: '/allergen-tracking', icon: AlertTriangle, label: 'Allergens' },
      { path: '/receiving-log', icon: FileText, label: 'Receiving' },
      { path: '/incidents', icon: AlertCircle, label: 'Incidents' },
      { path: '/self-diagnosis', icon: Wrench, label: 'Diagnosis' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    kitchen_manager: [
      { path: '/incidents', icon: AlertCircle, label: 'Incidents' },
      { path: '/documents', icon: FileText, label: 'Documents' },
      { path: '/reports', icon: BarChart3, label: 'Reporting' },
      { path: '/self-inspection', icon: ClipboardCheck, label: 'Inspect' },
      { path: '/team', icon: Users, label: 'Team' },
      { path: '/settings', icon: Settings, label: 'Settings' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    compliance_manager: [
      { path: '/documents', icon: FileText, label: 'Documents' },
      { path: '/regulatory-alerts', icon: AlertCircle, label: 'Regulatory' },
      { path: '/reports', icon: BarChart3, label: 'Reporting' },
      { path: '/audit-trail', icon: ClipboardList, label: 'Audit Log' },
      { path: '/iot-monitoring', icon: Thermometer, label: 'IoT' },
      { path: '/self-diagnosis', icon: Wrench, label: 'Diagnosis' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    facilities_manager: [
      { path: '/equipment', icon: Settings, label: 'Equipment' },
      { path: '/documents', icon: FileText, label: 'Documents' },
      { path: '/reports', icon: BarChart3, label: 'Reporting' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    owner_operator: [
      { path: '/checklists', icon: ClipboardList, label: 'Checklists' },
      { path: '/temp-logs', icon: Thermometer, label: 'Temps' },
      { path: '/incidents', icon: AlertCircle, label: 'Incidents' },
      { path: '/documents', icon: FileText, label: 'Documents' },
      { path: '/reports', icon: BarChart3, label: 'Reporting' },
      { path: '/self-inspection', icon: ClipboardCheck, label: 'Inspect' },
      { path: '/audit-trail', icon: ClipboardList, label: 'Audit Log' },
      { path: '/vendors', icon: Store, label: 'Vendors' },
      { path: '/team', icon: Users, label: 'Team' },
      { path: '/settings', icon: Settings, label: 'Settings' },
      { path: '/help', icon: HelpCircle, label: 'Help' },
    ],
    executive: [
      { path: '/audit-trail', icon: ClipboardList, label: 'Audit Log' },
      { path: '/regulatory-alerts', icon: AlertCircle, label: 'Regulatory' },
      { path: '/reports', icon: BarChart3, label: 'Reporting' },
      { path: '/billing', icon: FileText, label: 'Billing' },
      { path: '/settings', icon: Settings, label: 'Settings' },
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
