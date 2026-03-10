import { useNavigate, useLocation } from 'react-router-dom';

interface Crumb {
  label: string;
  path?: string;
}

interface AdminBreadcrumbProps {
  crumbs: Crumb[];
}

/** Maps admin paths to their sidebar section title */
const SECTION_MAP: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/intelligence': 'Intelligence',
  '/admin/verification': 'Intelligence',
  '/admin/sales': 'Growth',
  '/admin/gtm': 'Growth',
  '/admin/leads': 'Growth',
  '/admin/campaigns': 'Growth',
  '/admin/demo-launcher': 'Growth',
  '/admin/demo-pipeline': 'Growth',
  '/admin/kitchen-checkup': 'Growth',
  '/admin/guided-tours': 'Growth',
  '/admin/onboarding': 'Growth',
  '/admin/rfp-monitor': 'Growth',
  '/admin/k2c': 'Growth',
  '/admin/scoretable': 'Growth',
  '/admin/support': 'Operations',
  '/admin/remote-connect': 'Operations',
  '/admin/users': 'Users',
  '/admin/staff': 'Users',
  '/admin/emulate': 'Users',
  '/admin/configure': 'Users',
  '/admin/billing': 'Finance',
  '/admin/usage-analytics': 'Finance',
  '/admin/reports': 'Finance',
  '/admin/vault': 'System',
  '/admin/security-settings': 'System',
  '/admin/api-keys': 'System',
  '/admin/system/edge-functions': 'System',
  '/admin/backup': 'System',
  '/admin/maintenance': 'System',
  '/admin/event-log': 'System',
  // Pages not in current nav but still accessible
  '/admin/crawl-monitor': 'Intelligence',
  '/admin/intelligence-admin': 'Intelligence',
  '/admin/jurisdiction-intelligence': 'Intelligence',
  '/admin/regulatory-changes': 'Intelligence',
  '/admin/command-center': 'Operations',
  '/admin/demo-generator': 'Growth',
  '/admin/demos': 'Growth',
  '/admin/assessments': 'Growth',
  '/admin/dashboard': 'System',
  '/admin/messages': 'System',
  '/admin/demo/dashboard': 'Growth',
};

const SEP_COLOR = '#D1D5DB';
const LINK_COLOR = '#6B7280';
const CURRENT_COLOR = '#A08C5A';

export default function AdminBreadcrumb({ crumbs = [] }: AdminBreadcrumbProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Find section for current path
  const section = SECTION_MAP[location.pathname] || null;
  const isHome = location.pathname === '/admin';

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12, color: '#9CA3AF', marginBottom: 20,
    }}>
      {/* Admin link */}
      <span
        onClick={() => navigate('/admin')}
        style={{ cursor: 'pointer', color: LINK_COLOR }}
        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
      >
        Admin
      </span>

      {/* Section (auto-derived from path) */}
      {section && (
        <>
          <span style={{ color: SEP_COLOR }}>{'›'}</span>
          {isHome ? (
            <span style={{ color: CURRENT_COLOR, fontWeight: 600 }}>{section}</span>
          ) : (
            <span style={{ color: LINK_COLOR }}>{section}</span>
          )}
        </>
      )}

      {/* Page crumbs (skip if home since section already shows) */}
      {!isHome && crumbs.map((crumb, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: SEP_COLOR }}>{'›'}</span>
          {crumb.path && i < crumbs.length - 1 ? (
            <span
              onClick={() => navigate(crumb.path!)}
              style={{ cursor: 'pointer', color: LINK_COLOR }}
              onMouseEnter={e => (e.currentTarget.style.color = '#1E2D4D')}
              onMouseLeave={e => (e.currentTarget.style.color = LINK_COLOR)}
            >
              {crumb.label}
            </span>
          ) : (
            <span style={{ color: CURRENT_COLOR, fontWeight: 600 }}>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
