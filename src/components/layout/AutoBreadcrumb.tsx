import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

// Comprehensive route-to-label mapping for all authenticated pages
const ROUTE_LABELS: Record<string, string> = {
  '/temp-logs': 'Temperatures',
  '/checklists': 'Checklists',
  '/documents': 'Documents',
  '/document-checklist': 'Document Checklist',
  '/vendors': 'Vendors',
  '/marketplace': 'Marketplace',
  '/haccp': 'Hazard Analysis Critical Control Points',
  '/alerts': 'Alerts',
  '/incidents': 'Incidents',
  '/ai-advisor': 'Artificial Intelligence Advisor',
  '/leaderboard': 'Leaderboard',
  '/referrals': 'Referrals',
  '/analysis': 'Predictive Analytics',
  '/team': 'Team',
  '/reports': 'Reporting',
  '/settings': 'Settings',
  '/import': 'Import Data',
  '/calendar': 'Calendar',
  '/help': 'Help & Support',
  '/weekly-digest': 'Weekly Digest',
  '/audit-report': 'Inspection Report',
  '/equipment': 'Equipment',
  '/regulatory-alerts': 'Regulatory Updates',
  '/jurisdiction': 'Jurisdiction Settings',
  '/health-dept-report': 'Health Dept Report',
  '/scoring-breakdown': 'Food Safety Overview',
  '/benchmarks': 'Benchmarks',
  '/org-hierarchy': 'Locations',
  '/compliance-index': 'Compliance Index',
  '/insurance-risk': 'Insurance Risk',
  '/improve-score': 'Improve Score',
  '/insurance-settings': 'Insurance Settings',
  '/business-intelligence': 'Business Intelligence',
  '/admin/onboard-client': 'Client Onboarding',
  '/admin/usage-analytics': 'Usage Analytics',
  '/admin/regulatory-changes': 'Regulatory Changes',
  '/iot-platform': 'Internet of Things Platform',
  '/sensors': 'Sensor Hub',
  '/sensors/add': 'Add Sensor',
  '/integrations': 'Integrations',
  '/settings/branding': 'Branding',
  '/settings/sensors': 'Sensors',
  '/settings/integrations': 'Integrations',
  '/settings/api-keys': 'Application Programming Interface Keys',
  '/settings/webhooks': 'Webhooks',
  '/developers': 'Developer Portal',
  '/training': 'Training',
  '/training/certificates': 'Certificates',
  '/training/courses/builder': 'Course Builder',
  '/playbooks': 'Incident Playbooks',
  '/playbooks/builder': 'Playbook Builder',
  '/playbooks/analytics': 'Playbook Analytics',
  '/inspector-view': 'Inspector View',
  '/self-audit': 'Self-Inspection',
  '/self-inspection': 'Self-Inspection',
  '/photo-evidence': 'Photo Evidence',
  '/audit-trail': 'Inspection Trail & Chain of Custody',
  '/copilot': 'Compliance Copilot',
  '/terms': 'Terms of Service',
  '/privacy': 'Privacy Policy',
  '/corrective-actions': 'Corrective Actions',
  '/self-diagnosis': 'Self-Diagnosis',
  '/iot-monitoring': 'Internet of Things Dashboard',
  '/jurisdiction-intelligence': 'Jurisdiction Intelligence',
  '/settings/roles-permissions': 'Role Permissions',
};

// Parent routes for nested pages
const PARENT_ROUTES: Record<string, { label: string; href: string }> = {
  '/settings/branding': { label: 'Settings', href: '/settings' },
  '/settings/sensors': { label: 'Settings', href: '/settings' },
  '/settings/integrations': { label: 'Settings', href: '/settings' },
  '/settings/api-keys': { label: 'Settings', href: '/settings' },
  '/settings/webhooks': { label: 'Settings', href: '/settings' },
  '/settings/roles-permissions': { label: 'Settings', href: '/settings' },
  '/admin/onboard-client': { label: 'Administration', href: '/admin/onboard-client' },
  '/admin/usage-analytics': { label: 'Administration', href: '/admin/usage-analytics' },
  '/admin/regulatory-changes': { label: 'Administration', href: '/admin/regulatory-changes' },
  '/training/certificates': { label: 'Training', href: '/training' },
  '/training/courses/builder': { label: 'Training', href: '/training' },
  '/playbooks/builder': { label: 'Incident Playbooks', href: '/playbooks' },
  '/playbooks/analytics': { label: 'Incident Playbooks', href: '/playbooks' },
  '/sensors/add': { label: 'Sensor Hub', href: '/sensors' },
  '/improve-score': { label: 'Insurance Risk', href: '/insurance-risk' },
  '/insurance-settings': { label: 'Insurance Risk', href: '/insurance-risk' },
};

// Dynamic route patterns (with :params)
const DYNAMIC_PATTERNS: { pattern: RegExp; parent: { label: string; href: string }; label: string }[] = [
  { pattern: /^\/vendors\/[^/]+$/, parent: { label: 'Vendors', href: '/vendors' }, label: 'Vendor Detail' },
  { pattern: /^\/marketplace\/[^/]+$/, parent: { label: 'Marketplace', href: '/marketplace' }, label: 'Vendor Profile' },
  { pattern: /^\/training\/course\/[^/]+$/, parent: { label: 'Training', href: '/training' }, label: 'Course' },
  { pattern: /^\/playbooks\/active\/[^/]+$/, parent: { label: 'Incident Playbooks', href: '/playbooks' }, label: 'Active Playbook' },
  { pattern: /^\/playbooks\/history\/[^/]+$/, parent: { label: 'Incident Playbooks', href: '/playbooks' }, label: 'Playbook History' },
  { pattern: /^\/sensors\/[^/]+$/, parent: { label: 'Sensor Hub', href: '/sensors' }, label: 'Sensor Detail' },
];

export function AutoBreadcrumb() {
  const location = useLocation();
  const pathname = location.pathname;

  // Don't show breadcrumbs on dashboard (it's home)
  if (pathname === '/dashboard') return null;

  // Build breadcrumb items
  const items: { label: string; href?: string }[] = [
    { label: 'Dashboard', href: '/dashboard' },
  ];

  // Check for dynamic routes first
  const dynamicMatch = DYNAMIC_PATTERNS.find(dp => dp.pattern.test(pathname));
  if (dynamicMatch) {
    items.push({ label: dynamicMatch.parent.label, href: dynamicMatch.parent.href });
    items.push({ label: dynamicMatch.label });
  } else {
    // Check for parent route
    const parent = PARENT_ROUTES[pathname];
    if (parent) {
      items.push({ label: parent.label, href: parent.href });
    }

    // Current page label
    const label = ROUTE_LABELS[pathname];
    if (label) {
      // For parent routes, don't duplicate if the parent label and current label are the same
      if (parent && parent.label === label) {
        // Skip — parent already shows this
      } else {
        items.push({ label });
      }
    } else {
      // Fallback: use last path segment, formatted
      const segments = pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1] || '';
      items.push({ label: last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) });
    }
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 pb-3 text-[13px]"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />}
          {item.href ? (
            <Link
              to={item.href}
              className="flex items-center gap-1 text-gray-500 hover:text-[#1e4d6b] hover:underline transition-colors"
            >
              {i === 0 && <Home className="h-3.5 w-3.5" />}
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
