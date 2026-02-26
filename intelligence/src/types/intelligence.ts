// ============================================================
// EvidLY Intelligence — TypeScript Types
// Matches 17-table schema from 001_schema.sql
// ============================================================

// ── Enums / Unions ──────────────────────────────────────────

export type PlanTier = 'trial' | 'founder' | 'professional' | 'enterprise';

export type SourceType =
  | 'health_dept' | 'legislative' | 'fda_recall' | 'outbreak'
  | 'regulatory' | 'osha' | 'news' | 'industry_report' | 'weather' | 'fire_code';

export type CrawlMethod = 'api' | 'rss' | 'scrape' | 'webhook_receive';
export type CrawlFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'realtime';

export type EventSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type EventStatus = 'new' | 'analyzed' | 'matched' | 'delivered' | 'archived' | 'duplicate';

export type InsightType = 'risk_alert' | 'opportunity' | 'trend' | 'regulatory_change';
export type InsightStatus = 'active' | 'delivered' | 'expired' | 'dismissed';
export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low';

export type RecallClassification = 'Class I' | 'Class II' | 'Class III';
export type RecallStatus = 'ongoing' | 'terminated' | 'completed';
export type RecallAgency = 'FDA' | 'USDA' | 'STATE';

export type PathogenCategory = 'bacteria' | 'virus' | 'parasite' | 'toxin' | 'unknown';
export type OutbreakStatus = 'active' | 'resolved' | 'monitoring';

export type InspectorPatternType = 'focus_area' | 'seasonal' | 'frequency' | 'severity_trend' | 'new_emphasis';

export type LegislativeStatus =
  | 'introduced' | 'in_committee' | 'passed_committee' | 'passed_chamber'
  | 'passed_both' | 'enrolled' | 'signed' | 'vetoed' | 'chaptered' | 'dead';
export type ComplianceImpact = 'high' | 'medium' | 'low' | 'none';

export type WeatherType = 'heat_wave' | 'power_outage' | 'flood' | 'wildfire' | 'storm' | 'freeze' | 'air_quality';
export type WeatherSeverity = 'extreme' | 'severe' | 'moderate' | 'minor';
export type WeatherStatus = 'active' | 'monitoring' | 'resolved';

export type CompetitorEventType = 'violation' | 'closure' | 'downgrade' | 'upgrade' | 'award' | 'recall' | 'complaint';

export type MarketCategory =
  | 'industry_trend' | 'technology' | 'best_practice' | 'benchmark'
  | 'labor_market' | 'supply_chain' | 'consumer_sentiment';

export type SnapshotPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export type CorrelationType =
  | 'outbreak_recall' | 'weather_violation' | 'seasonal_pattern'
  | 'inspector_trend' | 'legislative_impact' | 'multi_source';
export type CorrelationStatus = 'detected' | 'confirmed' | 'dismissed' | 'expired';

export type DeliveryMethod = 'webhook' | 'digest' | 'both' | 'email';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'retrying';

export type DigestType = 'daily' | 'weekly' | 'monthly';
export type DigestStatus = 'draft' | 'compiled' | 'sent' | 'failed';

export type SourceHealthStatus = 'healthy' | 'degraded' | 'down' | 'error' | 'timeout';

// ── Table Interfaces ────────────────────────────────────────

/** 1. intelligence_clients */
export interface IntelligenceClient {
  id: string;
  app_org_id: string;
  name: string;
  plan_tier: PlanTier;
  jurisdictions: string[];
  active: boolean;
  webhook_url: string | null;
  webhook_secret: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 2. intelligence_sources */
export interface IntelligenceSource {
  id: string;
  slug: string;
  name: string;
  source_type: SourceType;
  base_url: string | null;
  api_key_env: string | null;
  crawl_method: CrawlMethod;
  crawl_frequency: CrawlFrequency;
  jurisdiction: string | null;
  state_code: string | null;
  active: boolean;
  last_crawl_at: string | null;
  last_success_at: string | null;
  error_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 3. intelligence_events */
export interface IntelligenceEvent {
  id: string;
  source_id: string;
  external_id: string | null;
  event_type: string;
  title: string;
  summary: string | null;
  raw_data: Record<string, unknown>;
  url: string | null;
  published_at: string | null;
  crawled_at: string;
  jurisdiction: string | null;
  state_code: string | null;
  severity: EventSeverity | null;
  status: EventStatus;
  dedup_hash: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** 4. intelligence_insights */
export interface IntelligenceInsight {
  id: string;
  event_id: string | null;
  source_id: string;
  insight_type: InsightType;
  title: string;
  body: string;
  relevance_score: number;
  confidence: number;
  impact_level: ImpactLevel | null;
  affected_pillars: string[];
  jurisdictions: string[];
  recommended_actions: unknown[];
  expires_at: string | null;
  status: InsightStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 5. recall_alerts */
export interface RecallAlert {
  id: string;
  event_id: string | null;
  recall_number: string | null;
  recalling_firm: string;
  product_desc: string;
  reason: string;
  classification: RecallClassification;
  status: RecallStatus;
  distribution: string | null;
  quantity: string | null;
  initiated_date: string | null;
  report_date: string | null;
  source_agency: RecallAgency;
  affected_states: string[];
  product_codes: string[];
  severity: EventSeverity | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 6. outbreak_alerts */
export interface OutbreakAlert {
  id: string;
  event_id: string | null;
  outbreak_id: string | null;
  pathogen: string;
  pathogen_category: PathogenCategory | null;
  vehicle: string | null;
  case_count: number;
  hospitalized: number;
  deaths: number;
  affected_states: string[];
  status: OutbreakStatus;
  cdc_investigation: boolean;
  source_url: string | null;
  first_illness: string | null;
  last_illness: string | null;
  severity: EventSeverity | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 7. inspector_patterns */
export interface InspectorPattern {
  id: string;
  source_id: string | null;
  jurisdiction: string;
  inspector_name: string | null;
  inspector_id: string | null;
  pattern_type: InspectorPatternType;
  description: string;
  focus_areas: string[];
  avg_violations: number | null;
  avg_severity: number | null;
  inspection_count: number;
  date_range_start: string | null;
  date_range_end: string | null;
  confidence: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 8. legislative_items */
export interface LegislativeItem {
  id: string;
  event_id: string | null;
  bill_number: string;
  title: string;
  summary: string;
  body_name: string;
  jurisdiction: string;
  state_code: string | null;
  status: LegislativeStatus;
  impact_areas: string[];
  effective_date: string | null;
  last_action: string | null;
  last_action_date: string | null;
  sponsor: string | null;
  compliance_impact: ComplianceImpact | null;
  source_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 9. weather_risk_events */
export interface WeatherRiskEvent {
  id: string;
  event_id: string | null;
  weather_type: WeatherType;
  severity: WeatherSeverity;
  affected_area: string;
  affected_coords: { lat: number; lng: number; radius_miles: number } | null;
  affected_states: string[];
  affected_counties: string[];
  start_time: string;
  end_time: string | null;
  food_safety_impact: string;
  recommended_actions: unknown[];
  nws_alert_id: string | null;
  source_url: string | null;
  status: WeatherStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 10. competitor_events */
export interface CompetitorEvent {
  id: string;
  event_id: string | null;
  business_name: string;
  business_type: string | null;
  event_type: CompetitorEventType;
  jurisdiction: string;
  description: string;
  severity: EventSeverity | null;
  source_url: string | null;
  event_date: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** 11. market_intelligence */
export interface MarketIntelligence {
  id: string;
  event_id: string | null;
  category: MarketCategory;
  title: string;
  summary: string;
  source_name: string;
  source_url: string | null;
  relevance_score: number;
  published_at: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

/** 12. executive_snapshots */
export interface ExecutiveSnapshot {
  id: string;
  client_id: string;
  snapshot_date: string;
  period: SnapshotPeriod;
  summary: string;
  key_risks: Array<{ title: string; severity: string; description: string }>;
  key_opportunities: Array<{ title: string; impact: string; description: string }>;
  regulatory_changes: Array<{ bill: string; status: string; impact: string }>;
  recall_summary: { active_count: number; new_this_period: number; critical_count: number };
  outbreak_summary: { active_count: number; nearby: number; pathogen_list: string[] };
  weather_risks: unknown[];
  action_items: Array<{ priority: string; action: string; deadline: string }>;
  ai_confidence: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** 13. intelligence_correlations */
export interface IntelligenceCorrelation {
  id: string;
  event_ids: string[];
  insight_id: string | null;
  correlation_type: CorrelationType;
  description: string;
  strength: number;
  evidence: unknown[];
  status: CorrelationStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 14. client_subscriptions */
export interface ClientSubscription {
  id: string;
  client_id: string;
  source_id: string | null;
  source_type: string | null;
  jurisdictions: string[];
  severity_filter: string[];
  active: boolean;
  delivery_method: DeliveryMethod;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 15. insight_deliveries */
export interface InsightDelivery {
  id: string;
  insight_id: string;
  client_id: string;
  delivery_method: DeliveryMethod;
  webhook_url: string | null;
  status: DeliveryStatus;
  http_status: number | null;
  response_body: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** 16. intelligence_digests */
export interface IntelligenceDigest {
  id: string;
  client_id: string;
  digest_type: DigestType;
  period_start: string;
  period_end: string;
  insight_count: number;
  insight_ids: string[];
  summary: string;
  sections: Record<string, unknown>;
  html_content: string | null;
  status: DigestStatus;
  sent_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** 17. source_health_log */
export interface SourceHealthLog {
  id: string;
  source_id: string;
  check_time: string;
  status: SourceHealthStatus;
  response_time_ms: number | null;
  http_status: number | null;
  error_message: string | null;
  events_found: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Webhook Payload Types ───────────────────────────────────

/** Payload sent from Intelligence → Main App via webhook */
export interface IntelligenceBridgePayload {
  type: 'insight' | 'recall' | 'outbreak' | 'weather' | 'digest';
  client_app_org_id: string;
  timestamp: string;
  data: IntelligenceInsight | RecallAlert | OutbreakAlert | WeatherRiskEvent | IntelligenceDigest;
  metadata: {
    source_slug: string;
    intelligence_event_id: string | null;
    delivery_id: string;
  };
}

/** Webhook verification handshake */
export interface WebhookVerification {
  challenge: string;
  webhook_secret_hash: string;
}
