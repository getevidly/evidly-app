/**
 * AdminShell — Admin-only layout with white sidebar
 *
 * Replaces the tenant Layout for platform_admin users.
 * White sidebar (220px), sectioned nav, logo, sign out.
 * Content area: warm off-white (#F4F2EE).
 */
import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEvidlyPermissions } from '../../hooks/useEvidlyPermissions';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';

const SIDEBAR_W = 220;

interface NavItem {
  label: string;
  path: string;
  salesOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: '',
    items: [
      { label: 'Admin Home', path: '/admin' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { label: 'Demo Launcher', path: '/admin/demo-launcher', salesOnly: true },
      { label: 'Sales Pipeline', path: '/admin/sales', salesOnly: true },
      { label: 'Campaigns', path: '/admin/campaigns', salesOnly: true },
      { label: 'Guided Tours', path: '/admin/guided-tours', salesOnly: true },
      { label: 'Client Onboarding', path: '/admin/onboarding', salesOnly: true },
      { label: 'Leads', path: '/admin/leads', salesOnly: true },
      { label: 'GTM Dashboard', path: '/admin/gtm', salesOnly: true },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Command Center', path: '/admin/command-center' },
      { label: 'User Emulation', path: '/admin/emulate' },
      { label: 'Support Tickets', path: '/admin/support' },
      { label: 'Remote Connect', path: '/admin/remote-connect' },
    ],
  },
  {
    title: 'Users',
    items: [
      { label: 'User Provisioning', path: '/admin/users' },
      { label: 'Staff & Roles', path: '/admin/staff' },
      { label: 'Configure', path: '/admin/configure' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'EvidLY Intelligence', path: '/admin/intelligence' },
      { label: 'Crawl Monitor', path: '/admin/crawl-monitor' },
      { label: 'RFP Monitor', path: '/admin/rfp-monitor' },
      { label: 'Regulatory Changes', path: '/admin/regulatory-changes' },
      { label: 'Intelligence Queue', path: '/admin/intelligence-queue' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Billing', path: '/admin/billing' },
      { label: 'Usage Analytics', path: '/admin/usage-analytics' },
    ],
  },
  {
    title: 'Reporting',
    items: [
      { label: 'Reports', path: '/admin/reports' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'System Messages', path: '/admin/messages' },
      { label: 'API Keys', path: '/admin/api-keys' },
      { label: 'K2C', path: '/admin/k2c' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Security Settings', path: '/admin/security-settings' },
      { label: 'Database Backup', path: '/admin/backup' },
      { label: 'Maintenance Mode', path: '/admin/maintenance' },
      { label: 'Edge Functions', path: '/admin/system/edge-functions' },
      { label: 'Event Log', path: '/admin/event-log' },
      { label: 'Document Vault', path: '/admin/vault' },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { canSeeSalesMarketing } = useEvidlyPermissions();

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  // Filter out salesOnly items when user lacks sales/marketing access
  const visibleSections = NAV_SECTIONS
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.salesOnly || canSeeSalesMarketing),
    }))
    .filter(section => section.items.length > 0);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F4F2EE' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: SIDEBAR_W,
          flexShrink: 0,
          background: '#FFFFFF',
          borderRight: '1px solid #E2D9C8',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #E2D9C8' }}>
          <div
            style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 20,
              fontWeight: 800,
              color: NAVY,
              letterSpacing: '-0.02em',
            }}
          >
            EvidLY
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 500, marginTop: 2 }}>
            Admin Console
          </div>
        </div>

        {/* Nav sections */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {visibleSections.map((section, si) => (
            <div key={si}>
              {section.title && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: TEXT_MUTED,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '12px 16px 4px',
                  }}
                >
                  {section.title}
                </div>
              )}
              {section.items.map(item => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 16px',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active ? NAVY : TEXT_SEC,
                      background: active ? '#F4F2EE' : 'transparent',
                      border: 'none',
                      borderLeft: active ? `3px solid ${GOLD}` : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!active) e.currentTarget.style.background = '#F9F8F6';
                    }}
                    onMouseLeave={e => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
              {si < visibleSections.length - 1 && (
                <div style={{ height: 1, background: '#E2D9C8', margin: '6px 16px' }} />
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #E2D9C8', padding: '12px 16px' }}>
          {/* Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }} />
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>Systems Operational</span>
          </div>
          {/* User email */}
          <div
            style={{
              fontSize: 12,
              color: TEXT_SEC,
              marginBottom: 8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.email || 'admin'}
          </div>
          <button
            onClick={() => signOut()}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px 0',
              fontSize: 12,
              fontWeight: 600,
              color: '#DC2626',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        style={{
          marginLeft: SIDEBAR_W,
          flex: 1,
          padding: '36px 44px',
          minHeight: '100vh',
        }}
      >
        {children}
      </main>
    </div>
  );
}
