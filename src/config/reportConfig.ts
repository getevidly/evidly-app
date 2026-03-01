// ── Report Config — Central registry for all 12 report types ─────────────
// Each report has a slug (URL param), display metadata, role access, and category.

import type { LucideIcon } from 'lucide-react';
import {
  BarChart3, ClipboardCheck, Handshake, FileText, Wrench,
  Thermometer, AlertTriangle, Shield, GraduationCap, Droplets,
  Heart, GitCompareArrows,
} from 'lucide-react';

export type ReportCategory = 'overview' | 'compliance' | 'operations' | 'team' | 'community';

export interface ReportTypeConfig {
  slug: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  category: ReportCategory;
  allowedRoles: string[];
  locationScoped: boolean;
}

export const REPORT_TYPES: ReportTypeConfig[] = [
  {
    slug: 'executive-summary',
    title: 'Where You Stand',
    subtitle: 'Overall compliance scores, trends, and top items needing attention',
    icon: BarChart3,
    category: 'overview',
    allowedRoles: ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef'],
    locationScoped: false,
  },
  {
    slug: 'inspection-readiness',
    title: 'Inspection Readiness',
    subtitle: 'If the inspector walked in right now — what would they find?',
    icon: ClipboardCheck,
    category: 'compliance',
    allowedRoles: ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef'],
    locationScoped: true,
  },
  {
    slug: 'vendor-service-summary',
    title: 'Vendor Service Summary',
    subtitle: 'Vendor visit history, service status, and document compliance',
    icon: Handshake,
    category: 'operations',
    allowedRoles: ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'facilities_manager'],
    locationScoped: true,
  },
  {
    slug: 'document-status',
    title: 'Document Status',
    subtitle: 'Every document across both pillars — what is current, coming due, or missing',
    icon: FileText,
    category: 'compliance',
    allowedRoles: ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'facilities_manager'],
    locationScoped: true,
  },
  {
    slug: 'equipment-service-history',
    title: 'Equipment Service History',
    subtitle: 'Service records, next-due dates, and maintenance tracking by equipment',
    icon: Wrench,
    category: 'operations',
    allowedRoles: ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'facilities_manager'],
    locationScoped: true,
  },
  {
    slug: 'temperature-log-summary',
    title: 'Temperature Log Summary',
    subtitle: 'Temperature readings, compliance rates, and deviation tracking',
    icon: Thermometer,
    category: 'compliance',
    allowedRoles: ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef'],
    locationScoped: true,
  },
  {
    slug: 'haccp-summary',
    title: 'HACCP Summary',
    subtitle: 'Control points, deviations, and corrective action tracking',
    icon: AlertTriangle,
    category: 'compliance',
    allowedRoles: ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager', 'chef'],
    locationScoped: true,
  },
  {
    slug: 'insurance-documentation',
    title: 'Insurance Documentation',
    subtitle: 'Everything an insurance carrier would ask for, in one view',
    icon: Shield,
    category: 'operations',
    allowedRoles: ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'facilities_manager'],
    locationScoped: true,
  },
  {
    slug: 'training-certification',
    title: 'Training & Certification',
    subtitle: 'Employee certifications, training completion, and renewal tracking',
    icon: GraduationCap,
    category: 'team',
    allowedRoles: ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'kitchen_manager'],
    locationScoped: true,
  },
  {
    slug: 'grease-trap-fog',
    title: 'Grease Trap / FOG',
    subtitle: 'Pumping history, disposal chain of custody, and schedule compliance',
    icon: Droplets,
    category: 'operations',
    allowedRoles: ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'facilities_manager'],
    locationScoped: true,
  },
  {
    slug: 'kitchen-to-community',
    title: 'Kitchen to Community Impact',
    subtitle: 'Meals funded, donation history, and referral activity',
    icon: Heart,
    category: 'community',
    allowedRoles: ['platform_admin', 'owner_operator', 'executive'],
    locationScoped: false,
  },
  {
    slug: 'location-comparison',
    title: 'Location Comparison',
    subtitle: 'Side-by-side scores and metrics across all locations',
    icon: GitCompareArrows,
    category: 'overview',
    allowedRoles: ['platform_admin', 'owner_operator', 'executive', 'compliance_manager'],
    locationScoped: false,
  },
];

export function getReportsForRole(role: string): ReportTypeConfig[] {
  if (role === 'platform_admin') return REPORT_TYPES;
  return REPORT_TYPES.filter(r => r.allowedRoles.includes(role));
}

export function getReportBySlug(slug: string): ReportTypeConfig | undefined {
  return REPORT_TYPES.find(r => r.slug === slug);
}

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  overview: 'Overview',
  compliance: 'Compliance',
  operations: 'Operations',
  team: 'Team',
  community: 'Community',
};
