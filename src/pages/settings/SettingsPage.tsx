import { Outlet, NavLink } from 'react-router-dom';
import { Building2, Shield, Wrench, Plug, Bell, CreditCard } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../../components/DemoUpgradePrompt';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED, NAVY, FONT,
} from '../../components/dashboard/shared/constants';

const NAV_ITEMS = [
  { path: '/settings/company', label: 'Company Profile', icon: Building2, roles: null },
  { path: '/settings/team-roles', label: 'Team & Roles', icon: Shield, roles: ['owner_operator', 'executive'] },
  { path: '/settings/service-types', label: 'Service Types', icon: Wrench, roles: ['owner_operator', 'executive'] },
  { path: '/settings/integrations', label: 'Integrations', icon: Plug, roles: ['owner_operator', 'executive'] },
  { path: '/settings/notifications', label: 'Notifications', icon: Bell, roles: null },
  { path: '/settings/billing', label: 'Billing', icon: CreditCard, roles: ['owner_operator'] },
] as const;

export function SettingsPage() {
  const { userRole } = useRole();
  const { showUpgrade, setShowUpgrade } = useDemoGuard();

  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles === null || (item.roles as readonly string[]).includes(userRole),
  );

  const navLinkClasses = (isActive: boolean) =>
    `flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm no-underline cursor-pointer transition-[background,color] duration-150 whitespace-nowrap ${isActive ? 'font-semibold text-white bg-navy-muted' : 'font-medium text-navy-deeper bg-transparent'}`;

  return (
    <div style={{ ...FONT }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-navy-deeper mb-1 mt-0">
          Settings
        </h1>
        <p className="text-navy-mid text-sm m-0">
          Manage your EvidLY workspace
        </p>
      </div>

      {/* Mobile: horizontal scrollable tabs */}
      <div className="lg:hidden flex gap-1.5 overflow-x-auto pb-3 mb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${navLinkClasses(isActive)} !py-2 !px-3.5 !text-[13px] !rounded-[20px] shrink-0 ${isActive ? 'border border-navy-muted' : 'border border-border_ui-cool'}`
            }
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Desktop: 2-column layout */}
      <div className="flex gap-6 items-start">
        {/* Sidebar nav (desktop only) */}
        <nav className="hidden lg:block w-60 shrink-0 bg-white border border-border_ui-cool rounded-xl shadow-[0_1px_3px_rgba(11,22,40,.06),0_1px_2px_rgba(11,22,40,.04)] p-2 sticky top-20">
          <div className="flex flex-col gap-0.5">
            {visibleItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>

      {showUpgrade && (
        <DemoUpgradePrompt onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  );
}
