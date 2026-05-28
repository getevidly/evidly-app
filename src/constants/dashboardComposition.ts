import type { UserRole } from '../contexts/RoleContext';

/**
 * Every unique section key in the v10 dashboard mockup.
 * Each key maps 1:1 to a stub component in src/components/dashboard/sections/.
 */
export type SectionKey =
  | 'metric_cards'
  | 'prp_header'
  | 'yesterday_caught_line'
  | 'inspection_package'
  | 'compliance_briefing'
  | 'advisor_pair'
  | 'advisor_single_fire'
  | 'advisor_single_food'
  | 'advisor_flag_strip'
  | 'portfolio_snapshot'
  | 'facility_services_bucket'
  | 'checklists_block'
  | 'checklists_block_readonly'
  | 'drifts_caught'
  | 'drifts_caught_audit'
  | 'county_readiness'
  | 'decisions_queue'
  | 'approval_queue'
  | 'overdue_items'
  | 'team_grid'
  | 'intelligence_slot'
  | 'today_list'
  | 'right_now'
  | 'team_heads_up'
  | 'escalation_card';

/** Roles that render a dashboard view. platform_admin falls through to owner_operator. */
export type DashboardRole = Exclude<UserRole, 'platform_admin'>;

/**
 * Locked composition matrix — extracted from evidly-dashboard-mockup-v10.html.
 * Order within each array is render order (top → bottom).
 * Do NOT reorder without updating the mockup.
 */
export const DASHBOARD_COMPOSITION: Record<DashboardRole, SectionKey[]> = {
  owner_operator: [
    'today_list',
    'metric_cards',
    'prp_header',
    'yesterday_caught_line',
    'inspection_package',
    'compliance_briefing',
    'advisor_pair',
    'checklists_block',
    'drifts_caught',
    'county_readiness',
    'decisions_queue',
    'team_grid',
    'intelligence_slot',
  ],
  executive: [
    'today_list',
    'metric_cards',
    'prp_header',
    'yesterday_caught_line',
    'inspection_package',
    'compliance_briefing',
    'advisor_pair',
    'portfolio_snapshot',
    'checklists_block',
    'drifts_caught',
    'county_readiness',
    'decisions_queue',
    'team_grid',
    'intelligence_slot',
  ],
  compliance_manager: [
    'today_list',
    'metric_cards',
    'prp_header',
    'yesterday_caught_line',
    'inspection_package',
    'compliance_briefing',
    'advisor_pair',
    'checklists_block',
    'drifts_caught_audit',
    'county_readiness',
    'team_grid',
    'intelligence_slot',
  ],
  facilities_manager: [
    'today_list',
    'prp_header',
    'yesterday_caught_line',
    'advisor_single_fire',
    'facility_services_bucket',
    'drifts_caught',
    'decisions_queue',
    'intelligence_slot',
  ],
  chef: [
    'today_list',
    'prp_header',
    'yesterday_caught_line',
    'advisor_single_food',
    'checklists_block',
    'drifts_caught',
    'intelligence_slot',
  ],
  kitchen_manager: [
    'advisor_flag_strip',
    'checklists_block',
    'approval_queue',
    'overdue_items',
    'team_grid',
    'today_list',
  ],
  kitchen_staff: [
    'right_now',
    'checklists_block_readonly',
    'today_list',
    'team_heads_up',
    'escalation_card',
  ],
};
