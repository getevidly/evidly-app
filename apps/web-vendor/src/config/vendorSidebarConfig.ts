import {
  LayoutDashboard, TrendingUp, Kanban, FileSignature, Phone,
  DoorOpen, Map, Megaphone, AlertTriangle, GitBranch, FileText,
  BarChart3, RefreshCw, Calculator
} from 'lucide-react';

export interface VendorNavItem {
  label: string;
  path: string;
  icon: any;
  badge?: number;
}

export interface VendorNavSection {
  section: string;
  items: VendorNavItem[];
}

export const vendorSidebarSections: VendorNavSection[] = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Sales & Marketing',
    items: [
      { label: 'Sales Dashboard', path: '/sales', icon: TrendingUp },
      { label: 'Pipeline', path: '/sales/pipeline', icon: Kanban },
      { label: 'Agreements', path: '/agreements', icon: FileSignature },
      { label: 'Call List', path: '/sales/calls', icon: Phone },
      { label: 'Door Knock', path: '/sales/door-knock', icon: DoorOpen },
      { label: 'Territory Map', path: '/sales/map', icon: Map },
      { label: 'Quote Generator', path: '/sales/quote', icon: Calculator },
      { label: 'Campaigns', path: '/marketing/campaigns', icon: Megaphone },
      { label: 'Violation Outreach', path: '/marketing/violations', icon: AlertTriangle },
      { label: 'Sequences', path: '/marketing/sequences', icon: GitBranch },
      { label: 'Templates', path: '/marketing/templates', icon: FileText },
    ],
  },
  {
    section: 'Agreements',
    items: [
      { label: 'All Agreements', path: '/agreements', icon: FileSignature },
      { label: 'Templates', path: '/agreements/templates', icon: FileText },
      { label: 'Renewals', path: '/agreements/renewals', icon: RefreshCw },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { label: 'Sales Analytics', path: '/sales/analytics', icon: BarChart3 },
      { label: 'Marketing Analytics', path: '/marketing/analytics', icon: BarChart3 },
      { label: 'Competitors', path: '/sales/competitors', icon: TrendingUp },
    ],
  },
];
