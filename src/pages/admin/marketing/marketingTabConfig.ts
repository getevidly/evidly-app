/**
 * marketingTabConfig — 15-tab definition for the Marketing console.
 *
 * Single source of truth for tab id, label, icon, and route slug.
 * Used by MarketingConsole (tab bar + switchTab) and can be imported
 * by anything that needs to know the tab set.
 *
 * PRP Attribution removed — Predict/Reduce/Prove is a product-level
 * lens, not a marketing channel tab. Network remains routable but is
 * not surfaced in the tab bar.
 */
import {
  LayoutDashboard, Radio, MapPin, Building2,
  Layers, ClipboardList, Calendar, Flame, GitBranch,
  Users, Mail, Search, TrendingUp, Megaphone, FileBarChart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface MarketingTab {
  id: MarketingTabId;
  label: string;
  Icon: LucideIcon;
  route: string;          // slug after /admin/marketing/
}

export const MARKETING_TABS: MarketingTab[] = [
  { id: 'overview',  label: 'Overview',           Icon: LayoutDashboard, route: 'overview' },
  { id: 'accounts',  label: 'Accounts',            Icon: Building2,       route: 'accounts' },
  { id: 'sequence',  label: 'Outreach',           Icon: Mail,            route: 'email-sequence' },
  { id: 'calls',     label: 'Outbound Calls',     Icon: Radio,           route: 'outbound-calls' },
  { id: 'field',     label: 'In Person',           Icon: MapPin,          route: 'in-person' },
  { id: 'schedule',  label: 'Content Schedule',    Icon: Calendar,        route: 'content-schedule' },
  { id: 'survey',    label: 'Survey',              Icon: ClipboardList,   route: 'survey' },
  { id: 'funnel',    label: 'Funnel',              Icon: GitBranch,       route: 'funnel' },
  { id: 'segments',  label: 'Segments',            Icon: Users,           route: 'segments' },
  { id: 'channels',  label: 'Channels',            Icon: Layers,          route: 'channels' },
  { id: 'founder',   label: 'Founder Window',      Icon: Flame,           route: 'founder-window' },
  { id: 'seo',       label: 'SEO',                 Icon: Search,          route: 'seo' },
  { id: 'serp',      label: 'SERP',                Icon: TrendingUp,      route: 'serp' },
  { id: 'ads',       label: 'Google Ads',          Icon: Megaphone,       route: 'google-ads' },
  { id: 'forecast',  label: 'Forecast vs Actual',  Icon: FileBarChart,    route: 'forecast' },
];

export type MarketingTabId =
  | 'overview' | 'calls' | 'field' | 'accounts' | 'network'
  | 'channels' | 'survey' | 'schedule' | 'founder' | 'funnel'
  | 'segments' | 'sequence' | 'seo' | 'serp' | 'ads' | 'forecast';

/** Map tab id → route path */
export function tabRoute(id: MarketingTabId): string {
  const tab = MARKETING_TABS.find(t => t.id === id);
  return `/admin/marketing/${tab?.route ?? id}`;
}
