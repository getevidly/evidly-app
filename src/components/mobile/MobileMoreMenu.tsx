import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRole, type UserRole } from '../../contexts/RoleContext';
import { getRoleConfig, type SidebarSection } from '../../config/sidebarConfig';
import { getRoleLabel } from '../../config/mobileProductionConfig';

interface MobileMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMoreMenu({ isOpen, onClose }: MobileMoreMenuProps) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { userRole } = useRole();

  if (!isOpen) return null;

  const config = getRoleConfig(userRole);
  const sections = config.sections.filter(
    (s: SidebarSection) => s.items.length > 0 || s.path
  );

  const handleNav = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col lg:hidden"
      style={{ background: '#F7F6F3' }}
    >
      {/* Header */}
      <div
        className="px-4 pt-[max(env(safe-area-inset-top),16px)] pb-4 flex items-center justify-between"
        style={{ background: '#1E2D4D' }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[1.2px]" style={{ color: '#A08C5A' }}>
            EVIDLY
          </p>
          <p className="text-white font-semibold text-[16px] mt-1">
            {profile?.full_name || 'User'}
          </p>
          <p className="text-white/60 text-[12px] mt-0.5">
            {getRoleLabel(userRole)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <X className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Dashboard link */}
        <button
          onClick={() => handleNav('/dashboard')}
          className="w-full flex items-center gap-3 px-4 min-h-[56px] bg-white border-b border-gray-100 active:bg-[#FAF7F0] transition-colors cursor-pointer"
        >
          <span className="text-lg w-7 text-center">🏠</span>
          <span className="flex-1 text-left text-[14px] font-semibold text-[#1E2D4D]">Dashboard</span>
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </button>

        {/* Top-level items */}
        {config.topLevelItems?.map(item => (
          <button
            key={item.id}
            onClick={() => handleNav(item.path)}
            className="w-full flex items-center gap-3 px-4 min-h-[56px] bg-white border-b border-gray-100 active:bg-[#FAF7F0] transition-colors cursor-pointer"
          >
            <span className="text-lg w-7 text-center">{item.icon}</span>
            <span className="flex-1 text-left text-[14px] font-semibold text-[#1E2D4D]">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </button>
        ))}

        {/* Sections */}
        {sections.map(section => (
          <div key={section.id} className="mt-3">
            {/* Section header */}
            <button
              onClick={() => section.path ? handleNav(section.path) : undefined}
              className={`w-full flex items-center gap-2 px-4 py-2 ${section.path ? 'cursor-pointer active:bg-gray-100' : 'cursor-default'}`}
            >
              <span className="text-sm">{section.icon}</span>
              <span className="text-xs font-bold uppercase tracking-[1px] text-[#6B7280]">
                {section.label}
              </span>
            </button>

            {/* Section items */}
            {section.items.map(item => (
              <button
                key={item.id + '-' + item.path}
                onClick={() => handleNav(item.path)}
                className="w-full flex items-center gap-3 px-4 min-h-[56px] bg-white border-b border-gray-100 active:bg-[#FAF7F0] transition-colors cursor-pointer"
              >
                <span className="text-lg w-7 text-center">{item.icon}</span>
                <span className="flex-1 text-left text-[14px] text-[#1E2D4D]">{item.label}</span>
                {item.badge && (
                  <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-[#A08C5A]/15 text-[#A08C5A]">
                    {item.badge}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        ))}

        {/* Sign Out */}
        <div className="mt-6 mb-8 px-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 min-h-[56px] rounded-xl border border-red-200 bg-red-50 active:bg-red-100 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-red-600" />
            <span className="text-[14px] font-semibold text-red-600">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
