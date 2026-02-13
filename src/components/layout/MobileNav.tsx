import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Thermometer, CheckSquare, FileText, Menu, X } from 'lucide-react';

export function MobileNav() {
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Temp', href: '/temp-logs', icon: Thermometer },
    { name: 'Lists', href: '/checklists', icon: CheckSquare },
    { name: 'Docs', href: '/documents', icon: FileText },
  ];

  const moreMenuItems = [
    { name: 'Vendors', href: '/vendors' },
    { name: 'Compliance', href: '/compliance' },
    { name: 'HACCP', href: '/haccp' },
    { name: 'AI Advisor', href: '/ai-advisor' },
    { name: 'Leaderboard', href: '/leaderboard' },
    { name: 'Team', href: '/team' },
    { name: 'Alerts', href: '/alerts' },
    { name: 'Settings', href: '/settings' },
  ];

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden" onClick={() => setShowMoreMenu(false)}>
          <div className="fixed bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">More Options</h3>
              <button onClick={() => setShowMoreMenu(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 max-h-96 overflow-y-auto">
              {moreMenuItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setShowMoreMenu(false)}
                  className="p-4 text-center rounded-lg border border-gray-200 hover:border-[#1e4d6b] hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-40">
        <nav className="flex justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center py-3 px-3 text-xs font-medium transition-colors ${
                  isActive ? 'text-[#1e4d6b]' : 'text-gray-600'
                }`}
              >
                <item.icon className={`h-6 w-6 mb-1 ${isActive ? 'text-[#1e4d6b]' : 'text-gray-500'}`} />
                {item.name}
              </Link>
            );
          })}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="flex flex-col items-center py-3 px-3 text-xs font-medium text-gray-600 transition-colors"
          >
            <Menu className="h-6 w-6 mb-1 text-gray-500" />
            More
          </button>
        </nav>
      </div>
    </>
  );
}
