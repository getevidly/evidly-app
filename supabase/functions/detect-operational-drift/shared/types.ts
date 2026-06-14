// detect-operational-drift — shared types
// C2 of Dashboard v10 build sequence

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface LocationRow {
  id: string;
  organization_id: string;
  business_hours_timezone: string;
  business_hours_start: string; // HH:MM time
  business_hours_end: string;   // HH:MM time
  name: string;
  cooking_type: string | null;
}

export interface OrgRow {
  id: string;
  timezone: string;
}

export interface DmUserRow {
  id: string;
  organization_id: string;
  role: string;
}

/** Row from pl_standards_registry with the three-tier requirement jsonb. */
export interface StandardsRegistryRow {
  id: string;
  topic: string;
  requirement: {
    state?: {
      'US-CA'?: {
        frequency?: {
          cite?: string;
          value?: string;
          intervals_days?: Record<string, number>;
        };
      };
    };
  };
  pending_fields: string[];
}

export interface TriggerContext {
  supabase: SupabaseClient;
  orgId: string;
  orgTimezone: string;
  locations: LocationRow[];
  now: Date;
  /** Grounded fire-safety standards from pl_standards_registry. */
  standardsRegistry: StandardsRegistryRow[];
}

/**
 * Proportional lead-time: warn when elapsed >= interval * WARN_FRACTION.
 * The warning fires in the final (1 - WARN_FRACTION) of the cycle.
 * WARN_FRACTION = 2/3 → warning window is the last third of every cycle.
 */
export const WARN_FRACTION = 2 / 3;

export interface DriftCatchInsert {
  org_id: string;
  location_id: string;
  drift_type: DriftType;
  pillar: 'food_safety' | 'fire_safety';
  source_table: string;
  source_record_id: string | null;
  expected_value: string | null;
  actual_value: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimated_savings_cents: number;
}

export type DriftType =
  | 'temperature_out_of_range'
  | 'temperature_trend_drift'
  | 'missed_checklist'
  | 'document_expiration'
  | 'receiving_log_missing'
  | 'allergen_training_overdue'
  | 'hood_cleaning_approaching'
  | 'suppression_semi_annual_due'
  | 'extinguisher_monthly_missed'
  | 'vendor_coi_expiring'
  | 'inspection_readiness_gap'
  | 'team_miss_clustering'
  | 'streak_break';

export interface InsertedCatch extends DriftCatchInsert {
  id: string;
  detected_at: string;
}

export const DRIFT_TYPE_LABELS: Record<DriftType, string> = {
  temperature_out_of_range: 'Temperature out of range',
  temperature_trend_drift: 'Temperature trending toward limit',
  missed_checklist: 'Missed checklist',
  document_expiration: 'Document expiring soon',
  receiving_log_missing: 'No receiving log today',
  allergen_training_overdue: 'Allergen training overdue',
  hood_cleaning_approaching: 'Hood cleaning cycle approaching',
  suppression_semi_annual_due: 'Suppression service coming due',
  extinguisher_monthly_missed: 'Extinguisher monthly check missed',
  vendor_coi_expiring: 'Vendor insurance expiring',
  inspection_readiness_gap: 'Readiness gap detected',
  team_miss_clustering: 'Repeated team misses detected',
  streak_break: 'Evidence streak ended',
};

// Pillar-based notification role targets
// kitchen_manager and kitchen_staff are NEVER notified
export const PILLAR_NOTIFY_ROLES: Record<string, string[]> = {
  food_safety: ['owner_operator', 'executive', 'compliance_manager', 'chef'],
  fire_safety: ['owner_operator', 'executive', 'compliance_manager', 'facilities_manager'],
};

// Severity → notification priority mapping
export const SEVERITY_PRIORITY: Record<string, string> = {
  critical: 'urgent',
  high: 'high',
  medium: 'medium',
  low: 'low',
};
