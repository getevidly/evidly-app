import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

// ── Parent-chain route hierarchy ─────────────────────────
// Every route has a label and optional parent route.
// buildBreadcrumb() walks up the parent chain to produce crumbs.

const ROUTE_HIERARCHY: Record<string, { label: string; parent?: string }> = {
  '/dashboard': { label: 'Dashboard' },

  // ── Category hubs (parent = dashboard) ──
  '/food-safety': { label: 'Food Safety', parent: '/dashboard' },
  '/facility-safety': { label: 'Facility Safety', parent: '/dashboard' },
  '/compliance': { label: 'Compliance', parent: '/dashboard' },
  '/insights': { label: 'Insights', parent: '/dashboard' },
  '/tools': { label: 'Tools', parent: '/dashboard' },
  '/admin': { label: 'Administration', parent: '/dashboard' },

  // ── Food Safety children ──
  '/temp-logs': { label: 'Temperature Monitoring', parent: '/food-safety' },
  '/checklists': { label: 'Checklists', parent: '/food-safety' },
  '/haccp': { label: 'HACCP Management', parent: '/food-safety' },
  '/corrective-actions': { label: 'Corrective Actions', parent: '/food-safety' },
  '/scoring-breakdown': { label: 'Food Safety Overview', parent: '/food-safety' },

  // ── Compliance children ──
  '/compliance-index': { label: 'Compliance Index', parent: '/compliance' },
  '/documents': { label: 'Documents', parent: '/compliance' },
  '/document-checklist': { label: 'Document Checklist', parent: '/compliance' },
  '/incidents': { label: 'Incident Log', parent: '/compliance' },
  '/insurance-risk': { label: 'Insurance Risk', parent: '/compliance' },
  '/improve-score': { label: 'Improve Score', parent: '/insurance-risk' },
  '/insurance-settings': { label: 'Insurance Settings', parent: '/insurance-risk' },
  '/regulatory-alerts': { label: 'Regulatory Updates', parent: '/compliance' },
  '/reports': { label: 'Reports', parent: '/compliance' },
  '/self-audit': { label: 'Self-Inspection', parent: '/compliance' },
  '/self-inspection': { label: 'Self-Inspection', parent: '/compliance' },
  '/services': { label: 'Vendor Services', parent: '/compliance' },
  '/jurisdiction': { label: 'Jurisdiction Settings', parent: '/compliance' },
  '/health-dept-report': { label: 'Health Dept Report', parent: '/compliance' },
  '/audit-report': { label: 'Inspection Report', parent: '/compliance' },

  // ── Insights children ──
  '/ai-advisor': { label: 'AI Advisor', parent: '/insights' },
  '/analysis': { label: 'Analytics', parent: '/insights' },
  '/benchmarks': { label: 'Benchmarks', parent: '/insights' },
  '/intelligence': { label: 'Intelligence Hub', parent: '/insights' },
  '/copilot': { label: 'Compliance Copilot', parent: '/insights' },
  '/business-intelligence': { label: 'Business Intelligence', parent: '/insights' },
  '/regulatory-updates': { label: 'Regulatory Updates', parent: '/insights' },
  '/iot-monitoring': { label: 'IoT Dashboard', parent: '/insights' },
  '/audit-trail': { label: 'Audit Trail', parent: '/insights' },
  '/weekly-digest': { label: 'Weekly Digest', parent: '/insights' },
  '/sensors': { label: 'Sensor Hub', parent: '/insights' },
  '/sensors/add': { label: 'Add Sensor', parent: '/sensors' },
  '/iot-platform': { label: 'IoT Platform', parent: '/insights' },

  // ── Tools children ──
  '/calendar': { label: 'Calendar', parent: '/tools' },
  '/vendors': { label: 'Vendor Management', parent: '/tools' },
  '/marketplace': { label: 'Marketplace', parent: '/tools' },
  '/equipment': { label: 'Equipment Lifecycle', parent: '/tools' },
  '/checkup': { label: 'Kitchen Checkup', parent: '/tools' },
  '/self-diagnosis': { label: 'Self-Diagnosis', parent: '/tools' },
  '/inspector-view': { label: 'Inspector View', parent: '/tools' },
  '/photo-evidence': { label: 'Photo Evidence', parent: '/tools' },
  '/playbooks': { label: 'Incident Playbooks', parent: '/tools' },
  '/playbooks/builder': { label: 'Playbook Builder', parent: '/playbooks' },
  '/playbooks/analytics': { label: 'Playbook Analytics', parent: '/playbooks' },
  '/alerts': { label: 'Alerts', parent: '/tools' },

  // ── Administration children ──
  '/team': { label: 'Team', parent: '/admin' },
  '/settings': { label: 'Settings', parent: '/admin' },
  '/settings/branding': { label: 'Branding', parent: '/settings' },
  '/settings/sensors': { label: 'Sensors', parent: '/settings' },
  '/settings/integrations': { label: 'Integrations', parent: '/settings' },
  '/settings/api-keys': { label: 'API Keys', parent: '/settings' },
  '/settings/webhooks': { label: 'Webhooks', parent: '/settings' },
  '/settings/roles-permissions': { label: 'Roles & Permissions', parent: '/settings' },
  '/integrations': { label: 'Integrations', parent: '/admin' },
  '/developers': { label: 'Developer Portal', parent: '/admin' },
  '/org-hierarchy': { label: 'Locations', parent: '/admin' },
  '/import': { label: 'Import Data', parent: '/admin' },
  '/leaderboard': { label: 'Leaderboard', parent: '/admin' },
  '/referrals': { label: 'Referrals', parent: '/admin' },
  '/training': { label: 'Training Hub', parent: '/admin' },
  '/training/certificates': { label: 'Certificates', parent: '/training' },
  '/training/courses/builder': { label: 'Course Builder', parent: '/training' },
  '/dashboard/training': { label: 'Training Records', parent: '/admin' },
  '/dashboard/training-catalog': { label: 'Training Catalog', parent: '/dashboard/training' },
  '/help': { label: 'Help & Support', parent: '/dashboard' },

  // ── Admin-only routes ──
  '/admin/onboard-client': { label: 'Client Onboarding', parent: '/admin' },
  '/admin/usage-analytics': { label: 'Usage Analytics', parent: '/admin' },
  '/admin/regulatory-changes': { label: 'Regulatory Changes', parent: '/admin' },
  '/admin/intelligence-queue': { label: 'Intelligence Queue', parent: '/admin' },
  '/admin/intelligence': { label: 'Command Center', parent: '/admin' },
  '/admin/rfp-intelligence': { label: 'RFP Intelligence', parent: '/admin' },
  '/admin/assessments': { label: 'Assessment Leads', parent: '/admin' },
  '/admin/system/edge-functions': { label: 'Edge Functions', parent: '/admin/intelligence' },

  // ── Legal ──
  '/terms': { label: 'Terms of Service', parent: '/dashboard' },
  '/privacy': { label: 'Privacy Policy', parent: '/dashboard' },
};

// ── Dynamic route patterns ───────────────────────────────
const DYNAMIC_PATTERNS: { pattern: RegExp; parent: string; label: string }[] = [
  { pattern: /^\/vendors\/[^/]+$/, parent: '/vendors', label: 'Vendor Detail' },
  { pattern: /^\/marketplace\/[^/]+$/, parent: '/marketplace', label: 'Vendor Profile' },
  { pattern: /^\/training\/course\/[^/]+$/, parent: '/training', label: 'Course' },
  { pattern: /^\/training\/employee\/[^/]+$/, parent: '/training', label: 'Employee Certifications' },
  { pattern: /^\/playbooks\/active\/[^/]+$/, parent: '/playbooks', label: 'Active Playbook' },
  { pattern: /^\/playbooks\/history\/[^/]+$/, parent: '/playbooks', label: 'Playbook History' },
  { pattern: /^\/sensors\/(?!add)[^/]+$/, parent: '/sensors', label: 'Sensor Detail' },
  { pattern: /^\/dashboard\/training\/[^/]+$/, parent: '/dashboard/training', label: 'Employee Profile' },
  { pattern: /^\/reports\/[^/]+$/, parent: '/reports', label: 'Report' },
  { pattern: /^\/equipment\/[^/]+\/service\/new$/, parent: '/equipment', label: 'New Service Record' },
  { pattern: /^\/equipment\/[^/]+$/, parent: '/equipment', label: 'Equipment Detail' },
];

// ── Query-parameter context labels ──────────────────────
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

// ── Build breadcrumb by walking up parent chain ─────────

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function buildBreadcrumb(pathname: string, search: string): BreadcrumbItem[] {
  // Resolve current route — check static hierarchy first, then dynamic patterns
  let currentLabel: string | null = null;
  let currentParent: string | undefined;

  const staticEntry = ROUTE_HIERARCHY[pathname];
  if (staticEntry) {
    currentLabel = staticEntry.label;
    currentParent = staticEntry.parent;
  } else {
    const dynamicMatch = DYNAMIC_PATTERNS.find(dp => dp.pattern.test(pathname));
    if (dynamicMatch) {
      currentLabel = dynamicMatch.label;
      currentParent = dynamicMatch.parent;
    }
  }

  // Fallback: titleize last path segment
  if (!currentLabel) {
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || '';
    currentLabel = last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    // Try to guess parent from path
    if (segments.length > 1) {
      const parentPath = '/' + segments.slice(0, -1).join('/');
      if (ROUTE_HIERARCHY[parentPath]) {
        currentParent = parentPath;
      }
    }
  }

  // Dashboard special case
  if (pathname === '/dashboard') {
    const dashItems: BreadcrumbItem[] = [{ label: 'Dashboard' }];
    const ctx = getQueryContext(search);
    if (ctx) {
      dashItems[0].href = '/dashboard';
      dashItems.push({ label: ctx });
    }
    return dashItems;
  }

  // Walk up parent chain to build items (bottom-up, then reverse)
  const items: BreadcrumbItem[] = [];

  // Current page (non-clickable, bold)
  let label = currentLabel;
  const ctx = getQueryContext(search);
  if (ctx) label = `${label} (${ctx})`;
  items.push({ label });

  // Walk up parents (stop before dashboard — we prepend it manually)
  let parentPath = currentParent;
  const visited = new Set<string>();
  while (parentPath && parentPath !== '/dashboard' && !visited.has(parentPath)) {
    visited.add(parentPath);
    const parentEntry = ROUTE_HIERARCHY[parentPath];
    if (!parentEntry) break;
    items.push({ label: parentEntry.label, href: parentPath });
    parentPath = parentEntry.parent;
  }

  // Reverse so root is first
  items.reverse();

  // Prepend Dashboard as linked root
  items.unshift({ label: 'Dashboard', href: '/dashboard' });

  return items;
}

// ── Component ───────────────────────────────────────────

export function AutoBreadcrumb() {
  const location = useLocation();

  // Don't render on dashboard home — it's the root, breadcrumb is redundant
  if (location.pathname === '/dashboard') return null;

  const items = buildBreadcrumb(location.pathname, location.search);

  return <BreadcrumbNav items={items} />;
}

function BreadcrumbNav({ items }: { items: BreadcrumbItem[] }) {
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
