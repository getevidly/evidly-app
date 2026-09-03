/**
 * marketingTabConfig — 21-tab definition for the Marketing console.
 *
 * Single source of truth for tab id, label, icon, and route slug.
 * Used by MarketingConsole (tab bar + switchTab) and can be imported
 * by anything that needs to know the tab set.
 *
 * PRP Attribution removed — Predict/Reduce/Prove is a product-level
 * lens, not a marketing channel tab.
 *
 * MarketingTabId carries 22 ids against the 21 in MARKETING_TABS. The
 * extra one is `network`: it is routable (/admin/marketing/network) and
 * the console renders it, but it is deliberately kept out of the tab bar.
 * The id has to stay in the union for that route to typecheck.
 */
import {
  LayoutDashboard, Radio, MapPin, Building2,
  Layers, ClipboardList, Calendar, Flame, GitBranch,
  Users, Mail, Search, TrendingUp, Megaphone, FileBarChart,
  Ticket, Target, ScanSearch, CheckSquare, Handshake,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface MarketingTab {
  id: MarketingTabId;
  label: string;
  Icon: LucideIcon;
  route: string;          // slug after /admin/marketing/
}

export const MARKETING_TABS: MarketingTab[] = [
  { id: 'weekly-cadence', label: 'Weekly Cadence', Icon: Calendar,        route: 'weekly-cadence' },
  { id: 'followups', label: 'Follow-ups',         Icon: CheckSquare,     route: 'follow-ups' },
  { id: 'overview',  label: 'Overview',           Icon: LayoutDashboard, route: 'overview' },
  { id: 'planner',   label: 'Planner',            Icon: Target,          route: 'planner' },
  { id: 'schedule',  label: 'Content Schedule',    Icon: Calendar,        route: 'content-schedule' },
  { id: 'policylens', label: 'Policy Lens',        Icon: ScanSearch,      route: 'policy-lens' },
  { id: 'sequence',  label: 'Outreach',           Icon: Mail,            route: 'email-sequence' },
  { id: 'briefings', label: 'Briefings',           Icon: Mail,            route: 'briefings' },
  { id: 'calls',     label: 'Outbound Calls',     Icon: Radio,           route: 'outbound-calls' },
  { id: 'field',     label: 'In Person',           Icon: MapPin,          route: 'in-person' },
  { id: 'shows',     label: 'Shows',               Icon: Ticket,          route: 'shows' },
  { id: 'survey',    label: 'Survey',              Icon: ClipboardList,   route: 'survey' },
  { id: 'funnel',    label: 'Funnel',              Icon: GitBranch,       route: 'funnel' },
  { id: 'accounts',  label: 'Accounts',            Icon: Building2,       route: 'accounts' },
  { id: 'segments',  label: 'Segments',            Icon: Users,           route: 'segments' },
  { id: 'partners',  label: 'Partners',            Icon: Handshake,       route: 'partners' },
  { id: 'channels',  label: 'Channels',            Icon: Layers,          route: 'channels' },
  { id: 'founder',   label: 'Founder Window',      Icon: Flame,           route: 'founder-window' },
  { id: 'seo',       label: 'SEO',                 Icon: Search,          route: 'seo' },
  { id: 'serp',      label: 'SERP',                Icon: TrendingUp,      route: 'serp' },
  { id: 'ads',       label: 'Google Ads',          Icon: Megaphone,       route: 'google-ads' },
  { id: 'forecast',  label: 'Forecast vs Actual',  Icon: FileBarChart,    route: 'forecast' },
];

export type MarketingTabId =
  | 'weekly-cadence' | 'followups' | 'overview' | 'planner' | 'calls' | 'field' | 'shows' | 'accounts' | 'network'
  | 'channels' | 'survey' | 'schedule' | 'founder' | 'funnel'
  | 'segments' | 'partners' | 'sequence' | 'briefings' | 'seo' | 'serp' | 'ads' | 'forecast' | 'policylens';

/** Map tab id → route path */
export function tabRoute(id: MarketingTabId): string {
  const tab = MARKETING_TABS.find(t => t.id === id);
  return `/admin/marketing/${tab?.route ?? id}`;
}

/**
 * Top-level grouping for the tab bar.
 *
 * Purely presentational: every member is an existing MARKETING_TABS id and
 * keeps its own route. Grouping changes how the bar is drawn, not where
 * anything lives. `network` is absent because it is route-only and
 * deliberately not surfaced in the bar.
 */
export const MARKETING_GROUPS: { id: string; label: string; members: MarketingTabId[] }[] = [
  { id: 'plan',     label: 'Plan',             members: ['weekly-cadence', 'planner'] },
  { id: 'outreach', label: 'Outreach',         members: ['sequence', 'briefings', 'calls', 'field', 'shows', 'followups'] },
  { id: 'content',  label: 'Content Schedule', members: ['schedule'] },
  { id: 'programs', label: 'Programs',         members: ['policylens', 'survey', 'partners'] },
  { id: 'pipeline', label: 'Pipeline',         members: ['overview', 'funnel', 'segments', 'accounts'] },
  { id: 'channels', label: 'Channels',         members: ['channels', 'forecast'] },
  { id: 'founder',  label: 'Founder Window',   members: ['founder'] },
  { id: 'growth',   label: 'Growth',           members: ['seo', 'serp', 'ads'] },
];

/** The group that owns a tab, or undefined for a route-only tab such as `network`. */
export function groupForTab(id: MarketingTabId) {
  return MARKETING_GROUPS.find(g => g.members.includes(id));
}
