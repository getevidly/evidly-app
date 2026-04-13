import {
  ClipboardList, Wrench, AlertTriangle, CheckSquare, BarChart3,
  DollarSign, PieChart, TrendingDown, Receipt, Timer,
  Shield, FileCheck, CalendarClock, Flame, Clock,
  Users, AlarmClock, UserCheck, Award, Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Categories ────────────────────────────────────────────────

export type ReportCategory = 'operations' | 'financial' | 'compliance' | 'team';

export const CATEGORY_META: Record<ReportCategory, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  operations: { label: 'Operations', color: '#1E2D4D', bg: '#eef4f8', icon: ClipboardList },
  financial:  { label: 'Financial',  color: '#16a34a', bg: '#f0fdf4', icon: DollarSign },
  compliance: { label: 'Compliance', color: '#7c3aed', bg: '#faf5ff', icon: Shield },
  team:       { label: 'Team',       color: '#0891b2', bg: '#ecfeff', icon: Users },
};

// ── Parameter Types ───────────────────────────────────────────

export type ParamType = 'dateRange' | 'select' | 'multiSelect' | 'status';

export interface ParameterDef {
  key: string;
  label: string;
  type: ParamType;
  options?: { value: string; label: string }[];
  required?: boolean;
}

// ── Report Definition ─────────────────────────────────────────

export interface ReportDefinition {
  slug: string;
  title: string;
  description: string;
  category: ReportCategory;
  icon: LucideIcon;
  parameters: ParameterDef[];
}

// ── Common parameters ─────────────────────────────────────────

const DATE_RANGE: ParameterDef = { key: 'dateRange', label: 'Date Range', type: 'dateRange', required: true };

const LOCATION_FILTER: ParameterDef = {
  key: 'locationIds', label: 'Locations', type: 'multiSelect',
  options: [{ value: 'all', label: 'All Locations' }],
};

const EMPLOYEE_FILTER: ParameterDef = {
  key: 'employeeIds', label: 'Employees', type: 'multiSelect',
  options: [{ value: 'all', label: 'All Employees' }],
};

const STATUS_FILTER: ParameterDef = {
  key: 'status', label: 'Status', type: 'select',
  options: [
    { value: 'all', label: 'All' },
    { value: 'completed', label: 'Completed' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
};

// ── Report Definitions (20 total) ─────────────────────────────

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  // ── Operations (5) ────────────────────────────
  {
    slug: 'jobs-summary',
    title: 'Jobs Summary',
    description: 'Jobs by status, date range, and technician.',
    category: 'operations',
    icon: ClipboardList,
    parameters: [DATE_RANGE, LOCATION_FILTER, EMPLOYEE_FILTER, STATUS_FILTER],
  },
  {
    slug: 'service-history',
    title: 'Service History',
    description: 'All services by location and date range.',
    category: 'operations',
    icon: Wrench,
    parameters: [DATE_RANGE, LOCATION_FILTER],
  },
  {
    slug: 'equipment-status',
    title: 'Equipment Status',
    description: 'Equipment conditions across all locations.',
    category: 'operations',
    icon: CheckSquare,
    parameters: [LOCATION_FILTER],
  },
  {
    slug: 'deficiency-report',
    title: 'Deficiency Report',
    description: 'Open and resolved deficiencies with details.',
    category: 'operations',
    icon: AlertTriangle,
    parameters: [DATE_RANGE, LOCATION_FILTER, { key: 'severity', label: 'Severity', type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'critical', label: 'Critical' }, { value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }] }],
  },
  {
    slug: 'qa-review',
    title: 'QA Review Report',
    description: 'QA pass/fail rates by technician.',
    category: 'operations',
    icon: BarChart3,
    parameters: [DATE_RANGE, EMPLOYEE_FILTER],
  },

  // ── Financial (5) ─────────────────────────────
  {
    slug: 'revenue',
    title: 'Revenue Report',
    description: 'Revenue by period, customer, and service type.',
    category: 'financial',
    icon: DollarSign,
    parameters: [DATE_RANGE, LOCATION_FILTER],
  },
  {
    slug: 'job-costing',
    title: 'Job Costing Report',
    description: 'Cost breakdown by job with labor and materials.',
    category: 'financial',
    icon: Receipt,
    parameters: [DATE_RANGE, LOCATION_FILTER],
  },
  {
    slug: 'profitability',
    title: 'Profitability Report',
    description: 'Margin analysis — flags jobs and customers below 60%.',
    category: 'financial',
    icon: PieChart,
    parameters: [DATE_RANGE, LOCATION_FILTER, { key: 'showUnprofitableOnly', label: 'Show Unprofitable Only', type: 'select', options: [{ value: 'false', label: 'All Jobs' }, { value: 'true', label: 'Below 60% Only' }] }],
  },
  {
    slug: 'accounts-receivable',
    title: 'Accounts Receivable',
    description: 'Outstanding invoices and aging summary.',
    category: 'financial',
    icon: TrendingDown,
    parameters: [DATE_RANGE],
  },
  {
    slug: 'tech-productivity',
    title: 'Technician Productivity',
    description: 'Revenue per technician hour with efficiency metrics.',
    category: 'financial',
    icon: Timer,
    parameters: [DATE_RANGE, EMPLOYEE_FILTER],
  },

  // ── Compliance (5) ────────────────────────────
  {
    slug: 'compliance-status',
    title: 'Compliance Status',
    description: 'All locations compliance summary with scores.',
    category: 'compliance',
    icon: Shield,
    parameters: [LOCATION_FILTER],
  },
  {
    slug: 'certificate-report',
    title: 'Certificate Report',
    description: 'Certificates issued by date range and type.',
    category: 'compliance',
    icon: FileCheck,
    parameters: [DATE_RANGE, LOCATION_FILTER],
  },
  {
    slug: 'upcoming-services',
    title: 'Upcoming Services',
    description: 'Services due in next 30, 60, or 90 days.',
    category: 'compliance',
    icon: CalendarClock,
    parameters: [{ key: 'horizon', label: 'Look-Ahead', type: 'select', required: true, options: [{ value: '30', label: '30 Days' }, { value: '60', label: '60 Days' }, { value: '90', label: '90 Days' }] }, LOCATION_FILTER],
  },
  {
    slug: 'nfpa96-compliance',
    title: 'NFPA 96 Compliance',
    description: 'Hood cleaning compliance by Table 12.4 schedule.',
    category: 'compliance',
    icon: Flame,
    parameters: [LOCATION_FILTER],
  },
  {
    slug: 'deficiency-aging',
    title: 'Deficiency Aging',
    description: 'Open deficiencies grouped by age and severity.',
    category: 'compliance',
    icon: Clock,
    parameters: [LOCATION_FILTER],
  },

  // ── Team (5) ──────────────────────────────────
  {
    slug: 'timecard-summary',
    title: 'Timecard Summary',
    description: 'Hours by employee and pay period with OT breakdown.',
    category: 'team',
    icon: Users,
    parameters: [DATE_RANGE, EMPLOYEE_FILTER],
  },
  {
    slug: 'overtime',
    title: 'Overtime Report',
    description: 'OT hours and estimated cost by employee.',
    category: 'team',
    icon: AlarmClock,
    parameters: [DATE_RANGE, EMPLOYEE_FILTER],
  },
  {
    slug: 'attendance',
    title: 'Attendance Report',
    description: 'Clock in/out patterns and punctuality metrics.',
    category: 'team',
    icon: UserCheck,
    parameters: [DATE_RANGE, EMPLOYEE_FILTER],
  },
  {
    slug: 'cert-expiry',
    title: 'Certification Expiry',
    description: 'Expiring employee certifications by date.',
    category: 'team',
    icon: Award,
    parameters: [{ key: 'horizon', label: 'Look-Ahead', type: 'select', required: true, options: [{ value: '30', label: '30 Days' }, { value: '60', label: '60 Days' }, { value: '90', label: '90 Days' }] }, EMPLOYEE_FILTER],
  },
  {
    slug: 'performance-scorecard',
    title: 'Performance Scorecard',
    description: 'Key metrics and scores by technician.',
    category: 'team',
    icon: Target,
    parameters: [DATE_RANGE, EMPLOYEE_FILTER],
  },
];

// ── Helpers ───────────────────────────────────────────────────

export function getReportBySlug(slug: string): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find(r => r.slug === slug);
}

export function getReportsByCategory(cat: ReportCategory): ReportDefinition[] {
  return REPORT_DEFINITIONS.filter(r => r.category === cat);
}

export function getAllReportSlugs(): string[] {
  return REPORT_DEFINITIONS.map(r => r.slug);
}
