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

  const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: isActive ? 600 : 500,
    color: isActive ? '#FFFFFF' : BODY_TEXT,
    background: isActive ? NAVY : 'transparent',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div style={{ ...FONT }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: BODY_TEXT, margin: '0 0 4px' }}>
          Settings
        </h1>
        <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>
          Manage your EvidLY workspace
        </p>
      </div>

      {/* Mobile: horizontal scrollable tabs */}
      <div
        className="lg:hidden"
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 12,
          marginBottom: 16,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...navLinkStyle(isActive),
              padding: '8px 14px',
              fontSize: 13,
              borderRadius: 20,
              border: `1px solid ${isActive ? NAVY : CARD_BORDER}`,
              flexShrink: 0,
            })}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Desktop: 2-column layout */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Sidebar nav (desktop only) */}
        <nav
          className="hidden lg:block"
          style={{
            width: 240,
            flexShrink: 0,
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 12,
            boxShadow: CARD_SHADOW,
            padding: 8,
            position: 'sticky' as const,
            top: 80,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {visibleItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => navLinkStyle(isActive)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Content area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </div>
      </div>

      {showUpgrade && (
        <DemoUpgradePrompt onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  );
}
