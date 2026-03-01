import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

// ── Route-to-label mapping ──────────────────────────────────────
const ROUTE_LABELS: Record<string, string> = {
  // Core
  '/dashboard': 'Dashboard',
  '/temp-logs': 'Temperature Monitoring',
  '/checklists': 'Checklists',
  '/documents': 'Documents',
  '/document-checklist': 'Document Checklist',
  '/vendors': 'Vendor Management',
  '/marketplace': 'Marketplace',
  '/haccp': 'HACCP Management',
  '/alerts': 'Alerts',
  '/incidents': 'Incident Log',
  '/corrective-actions': 'Corrective Actions',
  '/calendar': 'Calendar',

  // Food Safety / Compliance
  '/scoring-breakdown': 'Food Safety Overview',
  '/facility-safety': 'Facility Safety',
  '/compliance-index': 'Compliance Index',
  '/insurance-risk': 'Insurance Risk',
  '/improve-score': 'Improve Score',
  '/insurance-settings': 'Insurance Settings',
  '/benchmarks': 'Benchmarks',
  '/health-dept-report': 'Health Dept Report',
  '/regulatory-alerts': 'Regulatory Updates',
  '/jurisdiction': 'Jurisdiction Settings',
  '/audit-report': 'Inspection Report',

  // Insights & Analytics
  '/ai-advisor': 'AI Advisor',
  '/analysis': 'Predictive Analytics',
  '/copilot': 'Compliance Copilot',
  '/intelligence': 'Intelligence Hub',
  '/regulatory-updates': 'Regulatory Updates',
  '/business-intelligence': 'Business Intelligence',
  '/weekly-digest': 'Weekly Digest',

  // Tools
  '/reports': 'Reports',
  '/equipment': 'Equipment Lifecycle',
  '/self-audit': 'Self-Inspection',
  '/self-inspection': 'Self-Inspection',
  '/photo-evidence': 'Photo Evidence',
  '/audit-trail': 'Audit Trail',
  '/inspector-view': 'Inspector View',
  '/services': 'Services',
  '/checkup': 'Kitchen Checkup',
  '/self-diagnosis': 'Self-Diagnosis',

  // IoT / Sensors
  '/iot-monitoring': 'IoT Dashboard',
  '/iot-platform': 'IoT Platform',
  '/sensors': 'Sensor Hub',
  '/sensors/add': 'Add Sensor',

  // Training
  '/training': 'Training',
  '/training/certificates': 'Certificates',
  '/training/courses/builder': 'Course Builder',
  '/dashboard/training': 'Training Records',
  '/dashboard/training-catalog': 'Training Catalog',

  // Playbooks
  '/playbooks': 'Incident Playbooks',
  '/playbooks/builder': 'Playbook Builder',
  '/playbooks/analytics': 'Playbook Analytics',

  // Team & Admin
  '/team': 'Team',
  '/leaderboard': 'Leaderboard',
  '/referrals': 'Referrals',
  '/org-hierarchy': 'Locations',
  '/import': 'Import Data',
  '/help': 'Help & Support',

  // Settings
  '/settings': 'Settings',
  '/settings/branding': 'Branding',
  '/settings/sensors': 'Sensors',
  '/settings/integrations': 'Integrations',
  '/settings/api-keys': 'API Keys',
  '/settings/webhooks': 'Webhooks',
  '/settings/roles-permissions': 'Roles & Permissions',
  '/integrations': 'Integrations',
  '/developers': 'Developer Portal',

  // Admin
  '/admin/onboard-client': 'Client Onboarding',
  '/admin/usage-analytics': 'Usage Analytics',
  '/admin/regulatory-changes': 'Regulatory Changes',
  '/admin/intelligence-queue': 'Intelligence Queue',
  '/admin/intelligence': 'Command Center',
  '/admin/rfp-intelligence': 'RFP Intelligence',
  '/admin/assessments': 'Assessment Leads',
  '/admin/system/edge-functions': 'Edge Functions',

  // Legal
  '/terms': 'Terms of Service',
  '/privacy': 'Privacy Policy',
};

// ── Parent routes for nested pages ──────────────────────────────
const PARENT_ROUTES: Record<string, { label: string; href: string }[]> = {
  '/settings/branding': [{ label: 'Settings', href: '/settings' }],
  '/settings/sensors': [{ label: 'Settings', href: '/settings' }],
  '/settings/integrations': [{ label: 'Settings', href: '/settings' }],
  '/settings/api-keys': [{ label: 'Settings', href: '/settings' }],
  '/settings/webhooks': [{ label: 'Settings', href: '/settings' }],
  '/settings/roles-permissions': [{ label: 'Settings', href: '/settings' }],
  '/admin/onboard-client': [{ label: 'Administration', href: '/team' }],
  '/admin/usage-analytics': [{ label: 'Administration', href: '/team' }],
  '/admin/regulatory-changes': [{ label: 'Administration', href: '/team' }],
  '/admin/intelligence-queue': [{ label: 'Administration', href: '/team' }],
  '/admin/intelligence': [{ label: 'Administration', href: '/team' }],
  '/admin/rfp-intelligence': [{ label: 'Administration', href: '/team' }],
  '/admin/assessments': [{ label: 'Administration', href: '/team' }],
  '/admin/system/edge-functions': [{ label: 'Administration', href: '/team' }, { label: 'System', href: '/admin/intelligence' }],
  '/training/certificates': [{ label: 'Training', href: '/training' }],
  '/training/courses/builder': [{ label: 'Training', href: '/training' }],
  '/dashboard/training': [{ label: 'Dashboard', href: '/dashboard' }],
  '/dashboard/training-catalog': [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Training Records', href: '/dashboard/training' }],
  '/playbooks/builder': [{ label: 'Incident Playbooks', href: '/playbooks' }],
  '/playbooks/analytics': [{ label: 'Incident Playbooks', href: '/playbooks' }],
  '/sensors/add': [{ label: 'Sensor Hub', href: '/sensors' }],
  '/improve-score': [{ label: 'Insurance Risk', href: '/insurance-risk' }],
  '/insurance-settings': [{ label: 'Insurance Risk', href: '/insurance-risk' }],
};

// ── Dynamic route patterns (with :params) ───────────────────────
const DYNAMIC_PATTERNS: { pattern: RegExp; parents: { label: string; href: string }[]; label: string }[] = [
  { pattern: /^\/vendors\/[^/]+$/, parents: [{ label: 'Vendor Management', href: '/vendors' }], label: 'Vendor Detail' },
  { pattern: /^\/marketplace\/[^/]+$/, parents: [{ label: 'Marketplace', href: '/marketplace' }], label: 'Vendor Profile' },
  { pattern: /^\/training\/course\/[^/]+$/, parents: [{ label: 'Training', href: '/training' }], label: 'Course' },
  { pattern: /^\/training\/employee\/[^/]+$/, parents: [{ label: 'Training', href: '/training' }], label: 'Employee Certifications' },
  { pattern: /^\/playbooks\/active\/[^/]+$/, parents: [{ label: 'Incident Playbooks', href: '/playbooks' }], label: 'Active Playbook' },
  { pattern: /^\/playbooks\/history\/[^/]+$/, parents: [{ label: 'Incident Playbooks', href: '/playbooks' }], label: 'Playbook History' },
  { pattern: /^\/sensors\/(?!add)[^/]+$/, parents: [{ label: 'Sensor Hub', href: '/sensors' }], label: 'Sensor Detail' },
  { pattern: /^\/dashboard\/training\/[^/]+$/, parents: [{ label: 'Training Records', href: '/dashboard/training' }], label: 'Employee Profile' },
  { pattern: /^\/reports\/[^/]+$/, parents: [{ label: 'Reports', href: '/reports' }], label: 'Report' },
  { pattern: /^\/equipment\/[^/]+\/service\/new$/, parents: [{ label: 'Equipment Lifecycle', href: '/equipment' }], label: 'New Service Record' },
  { pattern: /^\/equipment\/[^/]+$/, parents: [{ label: 'Equipment Lifecycle', href: '/equipment' }], label: 'Equipment Detail' },
];

// ── Query-parameter context labels ──────────────────────────────
const QUERY_CONTEXT_PARAMS: Record<string, Record<string, string>> = {
  category: {
    hood_cleaning: 'Hood Cleaning',
    fire_suppression: 'Fire Suppression',
    pest_control: 'Pest Control',
    grease_trap: 'Grease Trap',
    hvac: 'HVAC',
    equipment: 'Equipment',
    general: 'General',
  },
  location: {
    downtown: 'Downtown',
    airport: 'Airport',
    university: 'University',
  },
  tab: {
    current: 'Current Readings',
    receiving: 'Receiving',
    holding: 'Hot/Cold Holding',
    cooldown: 'Cooldown',
    iot: 'IoT Live View',
    analytics: 'Analytics',
    history: 'History',
  },
};

function getQueryContext(search: string): string | null {
  const params = new URLSearchParams(search);
  for (const [paramKey, labelMap] of Object.entries(QUERY_CONTEXT_PARAMS)) {
    const val = params.get(paramKey);
    if (val && labelMap[val]) return labelMap[val];
  }
  return null;
}

export function AutoBreadcrumb() {
  const location = useLocation();
  const pathname = location.pathname;

  // Build breadcrumb items: always start with Dashboard home
  const items: { label: string; href?: string }[] = [];

  // Dashboard is home — if we're ON dashboard, just show it as current (non-linked)
  if (pathname === '/dashboard') {
    items.push({ label: 'Dashboard' });

    const ctx = getQueryContext(location.search);
    if (ctx) {
      items[0].href = '/dashboard';
      items.push({ label: ctx });
    }

    return <BreadcrumbNav items={items} />;
  }

  // Everything else starts with a linked Dashboard
  items.push({ label: 'Dashboard', href: '/dashboard' });

  // Check for dynamic routes first
  const dynamicMatch = DYNAMIC_PATTERNS.find(dp => dp.pattern.test(pathname));
  if (dynamicMatch) {
    for (const parent of dynamicMatch.parents) {
      items.push({ label: parent.label, href: parent.href });
    }
    items.push({ label: dynamicMatch.label });
  } else {
    // Check for parent routes
    const parents = PARENT_ROUTES[pathname];
    if (parents) {
      for (const parent of parents) {
        items.push({ label: parent.label, href: parent.href });
      }
    }

    // Current page label
    const label = ROUTE_LABELS[pathname];
    if (label) {
      // Avoid duplicating if the last parent has the same label
      const lastItem = items[items.length - 1];
      if (lastItem && lastItem.label === label) {
        // Remove href to make it the current (non-clickable) item
        delete lastItem.href;
      } else {
        items.push({ label });
      }
    } else {
      // Fallback: titleize last path segment
      const segments = pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1] || '';
      items.push({ label: last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) });
    }
  }

  // Append query parameter context to the last item
  const ctx = getQueryContext(location.search);
  if (ctx) {
    const last = items[items.length - 1];
    last.label = `${last.label} (${ctx})`;
  }

  return <BreadcrumbNav items={items} />;
}

function BreadcrumbNav({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center flex-wrap gap-y-0.5 pb-3"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && (
            <ChevronRight
              className="mx-1.5 flex-shrink-0"
              style={{ width: 14, height: 14, color: '#D1D5DB' }}
            />
          )}
          {item.href ? (
            <Link
              to={item.href}
              className="flex items-center gap-1 cursor-pointer hover:underline transition-colors"
              style={{ fontSize: '0.875rem', color: '#6B7280' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#1e4d6b'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B7280'; }}
            >
              {i === 0 && <Home style={{ width: 16, height: 16 }} />}
              {item.label}
            </Link>
          ) : (
            <span
              className="flex items-center gap-1"
              style={{
                fontSize: '0.875rem',
                color: '#1E2D4D',
                fontWeight: 600,
              }}
            >
              {i === 0 && <Home style={{ width: 16, height: 16 }} />}
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
