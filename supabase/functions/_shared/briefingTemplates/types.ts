// briefingTemplates/types.ts — shared type definitions for the briefing engine

export type AdvisorType = 'compliance_officer' | 'food_safety' | 'fire_safety';
export type Posture = 'solid' | 'watch' | 'alarm';
export type Pillar = 'food_safety' | 'fire_safety';
export type Urgency = 'urgent' | 'pulling' | 'review';

export interface BriefingInput {
  org_id: string;
  advisor_type: AdvisorType;
  location_id: string | null; // null = portfolio-wide
}

export interface OpenItem {
  source:
    | 'drift_catch'
    | 'owner_decision'
    | 'corrective_action'
    | 'document_expiration'
    | 'vendor_document_expiration'
    | 'service_record_due'
    | 'inspection_window';
  source_id: string;
  pillar: Pillar | null; // null = pillar-agnostic (unmapped document category)
  urgency: Urgency;
  title: string;
  location_id: string | null;
  detected_at: string; // ISO timestamp
}

export interface CitationResolution {
  text: string;
  source_url: string | null;
  verified: boolean;
}

export interface DataSnapshot {
  open_items: OpenItem[];
  recent_drift_count_30d: number;
  active_proven_drift_count: number;
  expiring_documents_30d: number;
  upcoming_service_due_30d: number;
  upcoming_inspections_30d: number;
  open_corrective_actions: number;
  scope: {
    advisor_type: AdvisorType;
    location_id: string | null;
    pillar_filter: Pillar | null;
  };
}

export interface BriefingResult {
  briefing_text: string;
  posture: Posture;
  open_items: OpenItem[];
  data_snapshot: DataSnapshot;
  template_version: number; // integer per PROD schema. C5a = 1.
}
