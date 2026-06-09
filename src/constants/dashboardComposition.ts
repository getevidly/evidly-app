import type { UserRole } from '../contexts/RoleContext';

/**
 * Every unique section key in the dashboard.
 * Each key maps 1:1 to a component in src/components/dashboard/sections/.
 */
export type SectionKey =
  | 'prp_header'
  | 'location_heat_map'
  | 'yesterday_caught_line'
  | 'inspection_package'
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
 * Composition matrix — C18 Phase 3 reorder.
 * Order: PRP spine → Tasks dominant → Location heat map →
 * active sections → quiet tier (Decisions, On-record, Team).
 */
export const DASHBOARD_COMPOSITION: Record<DashboardRole, SectionKey[]> = {
  owner_operator: [
    'prp_header',
    'today_list',
    'drifts_caught',
    'advisor_pair',
    'decisions_queue',
    'inspection_package',
    'county_readiness',
    'team_grid',
    'intelligence_slot',
  ],
  executive: [
    'prp_header',
    'today_list',
    'drifts_caught',
    'advisor_pair',
    'decisions_queue',
    'portfolio_snapshot',
    'inspection_package',
    'county_readiness',
    'team_grid',
    'intelligence_slot',
  ],
  compliance_manager: [
    'prp_header',
    'today_list',
    'drifts_caught_audit',
    'advisor_pair',
    'inspection_package',
    'county_readiness',
    'team_grid',
    'intelligence_slot',
  ],
  facilities_manager: [
    'prp_header',
    'today_list',
    'drifts_caught',
    'advisor_single_fire',
    'decisions_queue',
    'facility_services_bucket',
    'intelligence_slot',
  ],
  chef: [
    'prp_header',
    'today_list',
    'drifts_caught',
    'advisor_single_food',
    'checklists_block',
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
