import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
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
  Wrench,
  Calendar,
  TrendingUp,
  Lightbulb,
  Snowflake,
  Flame,
  Scale,
  Shield,
  GraduationCap,
} from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  getBottomNavItems,
  getBottomNavPaths,
} from '../../config/navConfig';
import { getRoleConfig } from '../../config/sidebarConfig';

// ── Path → Lucide icon mapping for More drawer ──────────
const PATH_ICON: Record<string, any> = {
  '/corrective-actions': AlertCircle,
  '/documents': FileText,
  '/facility-safety': Flame,
  '/haccp': ClipboardCheck,
  '/incidents': AlertTriangle,
  '/regulatory-alerts': AlertCircle,
  '/reports': BarChart3,
  '/self-inspection': ClipboardCheck,
  '/services': Wrench,
  '/vendor-certifications': FileText,
  '/ai-advisor': Brain,
  '/intelligence': Brain,
  '/analysis': TrendingUp,
  '/audit-trail': ClipboardList,
  '/benchmarks': Target,
  '/business-intelligence': Lightbulb,
  '/business-intelligence?view=financial': TrendingUp,
  '/iot-monitoring': Thermometer,
  '/jurisdiction': Network,
  '/regulatory-updates': Scale,
  '/scoring-breakdown': Target,
  '/violation-trends': TrendingUp,
  '/checkup': ClipboardCheck,
  '/self-diagnosis': Wrench,
  '/export-center': FileText,
  '/calendar': Calendar,
  '/inspector-view': Camera,
  '/billing': FileText,
  '/equipment': Settings,
  '/equipment/hood-exhaust': Settings,
  '/equipment/hvac': Snowflake,
  '/equipment/ice-machines': Settings,
  '/equipment/refrigeration': Thermometer,
  '/equipment/suppression-systems': Flame,
  '/org-hierarchy': Network,
  '/settings': Settings,
  '/team': Users,
  '/dashboard/training': GraduationCap,
  '/vendors': Store,
  '/help': HelpCircle,
  '/insurance-risk': Shield,
  '/allergen-tracking': AlertTriangle,
  '/cooling-logs': Snowflake,
  '/receiving-log': FileText,
  '/checklists': ClipboardList,
  '/temp-logs': Thermometer,
};

function getIconForPath(path: string): any {
  return PATH_ICON[path] || PATH_ICON[path.split('?')[0]] || HelpCircle;
}

export function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { userRole } = useRole();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const isKitchen = userRole === 'kitchen_staff';

  const mainTabs = getBottomNavItems(userRole);

  // Build More drawer sections from sidebar config, filtering out bottom-bar items
  const moreSections = useMemo(() => {
    if (isKitchen) return [];
    const config = getRoleConfig(userRole);
    const bottomPaths = getBottomNavPaths(userRole);
    return config.sections
      .map(s => ({
        ...s,
        items: s.items.filter(item => !bottomPaths.has(item.path)),
      }))
      .filter(s => s.items.length > 0);
  }, [userRole, isKitchen]);

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
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* More menu drawer (not shown for kitchen staff) */}
      {!isKitchen && (
        <div
          className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-sm transition-transform duration-300 ease-out z-40 lg:hidden ${
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
            {moreSections.map((sec) => (
              <div key={sec.id} className="mb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                  {sec.label}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {sec.items.map((item) => {
                    const Icon = getIconForPath(item.path);
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigation(item.path)}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg min-h-[72px] transition-all duration-150 ${
                          active ? 'bg-[#d4af37]/10' : 'hover:bg-gray-100'
                        }`}
                        style={active ? { boxShadow: 'inset 0 -2px 0 #d4af37' } : undefined}
                      >
                        <Icon
                          className={`h-5 w-5 mb-1.5 ${active ? 'text-[#d4af37]' : 'text-gray-400'}`}
                        />
                        <span
                          className={`text-[10px] font-medium text-center leading-tight ${
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
            ))}
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

      {/* Bottom tab bar — visible below lg (1024px) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 lg:hidden h-14 safe-area-bottom">
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
