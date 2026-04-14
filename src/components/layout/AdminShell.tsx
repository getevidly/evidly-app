/**
 * AdminShell — Admin-only layout with dark navy sidebar (#0B1628)
 *
 * Replaces the tenant Layout for platform_admin users.
 * Dark sidebar (220px), sectioned nav, logo (E gold, vid white, LY gold), sign out.
 * Content area: warm off-white (#F4F2EE).
 */
import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEvidlyPermissions } from '../../hooks/useEvidlyPermissions';

const SIDEBAR_BG = '#0B1628';
const DIVIDER = '#2d3f5f';
const GOLD = '#A08C5A';
const NAV_INACTIVE = '#94A3B8';
const NAV_ACTIVE_BG = 'rgba(160,140,90,0.15)';
const SECTION_LABEL = '#4B5563';
const ADMIN_LABEL = '#475569';
const EMAIL_COLOR = '#475569';
const STATUS_GREEN = '#10B981';

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
    title: 'Overview',
    items: [
      { label: 'Admin Home', path: '/admin' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'EvidLY Intelligence', path: '/admin/intelligence' },
      { label: 'Intelligence Admin', path: '/admin/intelligence-admin' },
      { label: 'Jurisdiction Intel', path: '/admin/jurisdiction-intelligence' },
      { label: 'Regulatory Changes', path: '/admin/regulatory-changes' },
      { label: 'Verification', path: '/admin/verification' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { label: 'Sales Pipeline', path: '/admin/sales', salesOnly: true },
      { label: 'GTM Dashboard', path: '/admin/gtm', salesOnly: true },
      { label: 'Leads', path: '/admin/leads', salesOnly: true },
      { label: 'Campaigns', path: '/admin/campaigns', salesOnly: true },
      { label: 'Demo Generator', path: '/admin/demo-generator', salesOnly: true },
      { label: 'Demo Launcher', path: '/admin/demo-launcher', salesOnly: true },
      { label: 'Demo Pipeline', path: '/admin/demo-pipeline', salesOnly: true },
      { label: 'Demo Tours', path: '/admin/demo-tours', salesOnly: true },
      { label: 'Demo Dashboard', path: '/admin/demo/dashboard', salesOnly: true },
      { label: 'Kitchen Checkup', path: '/admin/kitchen-checkup', salesOnly: true },
      { label: 'Guided Tours', path: '/admin/guided-tours', salesOnly: true },
      { label: 'Client Onboarding', path: '/admin/onboarding', salesOnly: true },
      { label: 'Vendor Connect', path: '/admin/vendor-connect', salesOnly: true },
      { label: 'RFP Monitor', path: '/admin/rfp-monitor' },
      { label: 'K2C', path: '/admin/k2c' },
      { label: 'ScoreTable', path: '/admin/scoretable', salesOnly: true },
      { label: 'Violation Outreach', path: '/admin/violation-outreach', salesOnly: true },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Support Tickets', path: '/admin/support' },
      { label: 'Remote Connect', path: '/admin/remote-connect' },
      { label: 'System Messages', path: '/admin/messages' },
    ],
  },
  {
    title: 'Users',
    items: [
      { label: 'User Management', path: '/admin/users' },
      { label: 'User Provisioning', path: '/admin/provisioning' },
      { label: 'Staff & Roles', path: '/admin/staff' },
      { label: 'User Emulation', path: '/admin/emulate' },
      { label: 'Role Preview', path: '/admin/role-preview' },
      { label: 'Configure', path: '/admin/configure' },
      { label: 'Organizations', path: '/admin/orgs' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Billing', path: '/admin/billing' },
      { label: 'Usage Analytics', path: '/admin/usage-analytics' },
      { label: 'Reports', path: '/admin/reports' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Document Vault', path: '/admin/vault' },
      { label: 'Security', path: '/admin/security' },
      { label: 'Audit Log', path: '/admin/audit-log' },
      { label: 'Security Settings', path: '/admin/security-settings' },
      { label: 'Feature Control', path: '/admin/feature-flags' },
      { label: 'API Keys', path: '/admin/api-keys' },
      { label: 'Edge Functions', path: '/admin/system/edge-functions' },
      { label: 'Database Backup', path: '/admin/backup' },
      { label: 'Maintenance Mode', path: '/admin/maintenance' },
      { label: 'Event Log', path: '/admin/event-log' },
      { label: 'Feature Baseline', path: '/admin/feature-baseline' },
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
          background: SIDEBAR_BG,
          borderRight: `1px solid ${DIVIDER}`,
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 16px 12px', borderBottom: `1px solid ${DIVIDER}` }}>
          <div
            style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            <span style={{ color: GOLD }}>E</span>
            <span style={{ color: '#FFFFFF' }}>vid</span>
            <span style={{ color: GOLD }}>LY</span>
          </div>
          <div style={{ fontSize: 11, color: ADMIN_LABEL, fontWeight: 500, marginTop: 2 }}>
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
                    color: SECTION_LABEL,
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
                      color: active ? '#FFFFFF' : NAV_INACTIVE,
                      background: active ? NAV_ACTIVE_BG : 'transparent',
                      border: 'none',
                      borderLeft: active ? `3px solid ${GOLD}` : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
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
                <div style={{ height: 1, background: DIVIDER, margin: '6px 16px' }} />
              )}
            </div>
          ))}
        </nav>

        {/* Footer — always visible, never scrolls */}
        <div style={{ borderTop: `1px solid ${DIVIDER}`, padding: '12px 16px', flexShrink: 0 }}>
          {/* Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_GREEN }} />
            <span style={{ fontSize: 11, color: NAV_INACTIVE }}>Systems Operational</span>
          </div>
          {/* Sign Out */}
          <button
            onClick={async () => {
              await signOut();
              navigate('/admin-login');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '7px 0',
              fontSize: 13,
              fontWeight: 500,
              color: '#E57373',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#EF5350'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#E57373'; }}
          >
            <LogOut size={15} />
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
