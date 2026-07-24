/**
 * marketingTabConfig — 17-tab definition for the Marketing console.
 *
 * Single source of truth for tab id, label, icon, and route slug.
 * Used by MarketingConsole (tab bar + switchTab) and can be imported
 * by anything that needs to know the tab set.
 */
import {
  LayoutDashboard, Radio, MapPin, Building2, Handshake,
  Layers, ClipboardList, Calendar, Flame, GitBranch,
  Users, Mail, Target, Search, TrendingUp, Megaphone, FileBarChart,
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
  { id: 'calls',     label: 'Outbound Calls',     Icon: Radio,           route: 'outbound-calls' },
  { id: 'field',     label: 'In Person',           Icon: MapPin,          route: 'in-person' },
  { id: 'accounts',  label: 'Accounts',            Icon: Building2,       route: 'accounts' },
  { id: 'network',   label: 'Network',             Icon: Handshake,       route: 'network' },
  { id: 'channels',  label: 'Channels',            Icon: Layers,          route: 'channels' },
  { id: 'survey',    label: 'Survey',              Icon: ClipboardList,   route: 'survey' },
  { id: 'schedule',  label: 'Content Schedule',    Icon: Calendar,        route: 'content-schedule' },
  { id: 'founder',   label: 'Founder Window',      Icon: Flame,           route: 'founder-window' },
  { id: 'funnel',    label: 'Funnel',              Icon: GitBranch,       route: 'funnel' },
  { id: 'segments',  label: 'Segments',            Icon: Users,           route: 'segments' },
  { id: 'sequence',  label: 'Email Sequence',      Icon: Mail,            route: 'email-sequence' },
  { id: 'prp',       label: 'PRP Attribution',     Icon: Target,          route: 'prp-attribution' },
  { id: 'seo',       label: 'SEO',                 Icon: Search,          route: 'seo' },
  { id: 'serp',      label: 'SERP',                Icon: TrendingUp,      route: 'serp' },
  { id: 'ads',       label: 'Google Ads',          Icon: Megaphone,       route: 'google-ads' },
  { id: 'forecast',  label: 'Forecast vs Actual',  Icon: FileBarChart,    route: 'forecast' },
];

export type MarketingTabId =
  | 'overview' | 'calls' | 'field' | 'accounts' | 'network'
  | 'channels' | 'survey' | 'schedule' | 'founder' | 'funnel'
  | 'segments' | 'sequence' | 'prp' | 'seo' | 'serp' | 'ads' | 'forecast';

/** Map tab id → route path */
export function tabRoute(id: MarketingTabId): string {
  const tab = MARKETING_TABS.find(t => t.id === id);
  return `/admin/marketing/${tab?.route ?? id}`;
}
