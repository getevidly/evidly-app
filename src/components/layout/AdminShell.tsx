/**
 * AdminShell — Admin-only layout with dark navy sidebar (#0B1628)
 *
 * Replaces the tenant Layout for platform_admin users.
 * Dark sidebar (220px), sectioned nav, logo (E gold, vid white, LY gold), sign out.
 * Content area: cream (#FAF7F0).
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
  perm?:
    | 'canBilling'
    | 'canSecurity'
    | 'canEmulate'
    | 'canConfigure'
    | 'canSupportTickets'
    | 'canCrawlManage'
    | 'canRemoteConnect'
    | 'canIntelligence'
    | 'canStaffManage';
  hidden?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// ═══════════════════════════════════════════════════════════
// NAV_SECTIONS — admin sidebar menu
//
// 27 → 16 items (culled 2026-06-22).  Cut items are in the
// KILLED block below.  Pages, routes, tables, and edge
// functions are NOT deleted — cut pages remain reachable by
// direct URL.
// ═══════════════════════════════════════════════════════════
const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Tenants',
    items: [
      { label: 'Organizations',       path: '/admin/orgs' },
      { label: 'Users',               path: '/admin/users' },
      { label: 'Staff & Roles',       path: '/admin/staff',              perm: 'canStaffManage' },
      { label: 'Client Onboarding',   path: '/admin/onboarding' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Admin Home',          path: '/admin' },
      { label: 'Configure',           path: '/admin/configure',          perm: 'canConfigure' },
      { label: 'Support Tickets',     path: '/admin/support',            perm: 'canSupportTickets' },
      { label: 'Billing',             path: '/admin/billing',            perm: 'canBilling' },
    ],
  },
  {
    title: 'Content & Intelligence',
    items: [
      { label: 'EvidLY Intelligence',       path: '/admin/intelligence',              perm: 'canIntelligence' },
      { label: 'ScoreTable Admin',          path: '/admin/scoretable' },
    ],
  },
  {
    title: 'System Status',
    items: [
      { label: 'Status Rollup',       path: '/admin/dashboard' },
      { label: 'Audit Log',           path: '/admin/audit-log',          perm: 'canSecurity' },
      { label: 'Edge Functions',      path: '/admin/system/edge-functions' },
      { label: 'Feature Flags',       path: '/admin/feature-flags' },
    ],
  },
  {
    title: 'Security',
    items: [
      { label: 'Security',            path: '/admin/security',           perm: 'canSecurity' },
      { label: 'Security Settings',   path: '/admin/security-settings',  perm: 'canSecurity' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// KILLED — removed from nav.  Pages/routes/tables still
// exist; re-enable by moving back into NAV_SECTIONS.
//
// SALES / GTM (cut 2026-06-22):
//   { label: 'Sales Pipeline',      path: '/admin/sales',              salesOnly: true },
//   { label: 'Demo Pipeline',       path: '/admin/demo-pipeline',      salesOnly: true },
//   { label: 'Kitchen Checkup',     path: '/admin/kitchen-checkup',    salesOnly: true },
//   { label: 'Marketing Campaigns', path: '/admin/campaigns',          salesOnly: true },
//
// CONTENT / INTEL — NOT DAILY USE (cut 2026-06-22):
//   { label: 'Intelligence Curation',     path: '/admin/intelligence-admin',        perm: 'canIntelligence' },
//   { label: 'Regulatory Changes',        path: '/admin/regulatory-changes',        perm: 'canIntelligence' },
//   { label: 'RFP Monitor',               path: '/admin/rfp-monitor',               perm: 'canIntelligence' },
//   { label: 'Vendor Connect Admin',      path: '/admin/vendor-connect' },
//
// OTHER (cut 2026-06-22):
//   { label: 'K2C Program',         path: '/admin/k2c' },
//   { label: 'Reports',             path: '/admin/reports' },
//   { label: 'Carrier API Keys',    path: '/admin/api-keys',           perm: 'canSecurity' },
//
// MERGED into EvidLY Intelligence (page stays at URL):
//   { label: 'Jurisdiction Intelligence', path: '/admin/jurisdiction-intelligence', perm: 'canIntelligence' },
//
// BROKEN / SUPERSEDED:
//   { label: 'GTM Dashboard',       path: '/admin/gtm',                salesOnly: true },   // queries non-existent sales_pipeline_deals table
//   { label: 'Usage Analytics',     path: '/admin/usage-analytics' },                        // 100% hardcoded fake data; real-data rebuild is separate project
//   { label: 'Trial Health',        path: '/admin/trial-health',       salesOnly: true },    // calls non-existent edge function
//
// DEMO TOOLING:
//   { label: 'Demo Generator',      path: '/admin/demo-generator',     salesOnly: true },
//   { label: 'Demo Launcher',       path: '/admin/demo-launcher',      salesOnly: true },
//   { label: 'Demo Tours',          path: '/admin/demo-tours',         salesOnly: true },
//   { label: 'Demo Dashboard',      path: '/admin/demo/dashboard',     salesOnly: true },
//   { label: 'Partner Demos',       path: '/admin/partner-demos',      salesOnly: true },
//   { label: 'Guided Tours',        path: '/admin/guided-tours',       salesOnly: true },
//
// DUPLICATES / OVERLAP:
//   { label: 'Event Log',           path: '/admin/event-log' },                              // overlaps Audit Log
//   { label: 'Crawl Monitor',       path: '/admin/crawl-monitor',      perm: 'canCrawlManage' },  // intel plumbing; page stays at URL
//   { label: 'Provisioning',        path: '/admin/provisioning' },                           // overlaps Users + Client Onboarding
//   { label: 'User Emulation',      path: '/admin/emulate',            perm: 'canEmulate' }, // may re-enable for support
//   { label: 'Role Preview',        path: '/admin/role-preview',       perm: 'canEmulate' },
//
// LOW-USE (pages stay at URL):
//   { label: 'Command Center',      path: '/admin/command-center' },
//   { label: 'Remote Connect',      path: '/admin/remote-connect',     perm: 'canRemoteConnect' },
//   { label: 'EvidLY Vault',        path: '/admin/evidly-vault',       hidden: true },
//   { label: 'Verification',        path: '/admin/verification' },
//   { label: 'Feature Baseline',    path: '/admin/feature-baseline' },
//   { label: 'Maintenance Mode',    path: '/admin/maintenance' },
//   { label: 'Database Backup',     path: '/admin/backup' },
//   { label: 'System Messages',     path: '/admin/messages' },
//   { label: 'Email Sequences',     path: '/admin/email-sequences',    salesOnly: true },
//   { label: 'Violation Outreach',  path: '/admin/violation-outreach', salesOnly: true },
//   { label: 'Testimonials',        path: '/admin/testimonials',       salesOnly: true },
// ═══════════════════════════════════════════════════════════

export function AdminShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const perms = useEvidlyPermissions();

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  // Filter out salesOnly items when user lacks sales/marketing access
  const visibleSections = NAV_SECTIONS
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (item.hidden) return false;
        if (item.salesOnly && !perms.canSeeSalesMarketing) return false;
        if (item.perm && !perms[item.perm]) return false;
        return true;
      }),
    }))
    .filter(section => section.items.length > 0);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAF7F0' }}>
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
