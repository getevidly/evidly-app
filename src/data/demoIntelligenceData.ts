/**
 * INTEL-HUB-1 — Demo Intelligence Data
 *
 * Static demo data for the EvidLY Intelligence Hub.
 * All exports are consumed by useIntelligenceHub.ts.
 */

// ── Types ────────────────────────────────────────────────────────

export type SourceType = 'health_dept' | 'legislative' | 'fda_recall' | 'outbreak' | 'regulatory' | 'competitor' | 'weather' | 'osha' | 'industry' | 'nps' | 'supply_chain' | 'cdph';
export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low';
export type Urgency = 'immediate' | 'urgent' | 'standard' | 'informational';
export type MarketSignalStrength = 'strong' | 'moderate' | 'weak';

export interface PersonalizedBusinessImpact {
  relevance_score: number;
  business_context: string;
  affected_locations: { name: string; impact: string; risk_level: 'high' | 'medium' | 'low' }[];
  financial_impact_adjusted: { low: number; high: number; methodology: string };
  personalized_actions: string[];
  industry_specific_note: string;
}

export interface IntelligenceInsight {
  id: string;
  source_type: SourceType;
  category: string;
  impact_level: ImpactLevel;
  urgency: Urgency;
  title: string;
  headline: string;
  summary: string;
  full_analysis: string;
  executive_brief: string;
  action_items: string[];
  affected_pillars: string[];
  affected_counties: string[];
  confidence_score: number;
  tags: string[];
  estimated_cost_impact: { low: number; high: number; currency: string; methodology: string };
  published_at: string;
  source_name: string;
  market_signal_strength: MarketSignalStrength;
  read?: boolean;
  dismissed?: boolean;
  personalizedBusinessImpact?: PersonalizedBusinessImpact;
}

export interface RecallAlert {
  id: string;
  class: 'I' | 'II' | 'III';
  status: 'active' | 'resolved';
  product: string;
  brand: string;
  reason: string;
  distribution: string;
  lot_codes: string;
  recall_date: string;
  resolved_date?: string;
  affected_counties: string[];
  source: string;
}

export interface OutbreakAlert {
  id: string;
  pathogen: string;
  status: 'active' | 'monitoring' | 'resolved';
  case_count: number;
  county: string;
  vehicle: string;
  onset_range: string;
  source: string;
  published_at: string;
  summary: string;
}

export interface LegislativeItem {
  id: string;
  bill_number: string;
  title: string;
  status: 'introduced' | 'committee' | 'floor_vote' | 'passed' | 'signed' | 'chaptered';
  probability: number;
  compliance_deadline?: string;
  estimated_cost_per_location: { low: number; high: number };
  summary: string;
  auto_checklist_items: string[];
  tracking_url: string;
  published_at: string;
}

export interface InspectorPattern {
  id: string;
  county: string;
  strictness_percentile: number;
  focus_areas: string[];
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendation: string;
  recent_citation_rate: number;
}

export interface CompetitorEvent {
  id: string;
  type: 'closure' | 'failed_inspection' | 'citation';
  business_name: string;
  distance_miles: number;
  near_location: string;
  reason: string;
  date: string;
  source: string;
}

export interface SourceStatus {
  id: string;
  name: string;
  type: string;
  jurisdictions: string[];
  frequency: string;
  last_checked_at: string;
  next_check_at: string;
  new_events_this_week: number;
  status: 'healthy' | 'warning' | 'error';
}

export interface CorrelationFinding {
  external_event: string;
  internal_impact: string;
  strength: 'strong' | 'moderate' | 'weak';
  action: string;
}

export interface RegulatoryForecastItem {
  title: string;
  probability: number;
  compliance_deadline: string;
  estimated_cost_per_location: { low: number; high: number };
  summary: string;
}

export interface StrategicRecommendation {
  priority: number;
  recommendation: string;
  rationale: string;
  estimated_impact: string;
  timeframe: string;
  immediate: boolean;
}

export interface ExecutiveSnapshot {
  generated_at: string;
  one_liner: string;
  overall_status: 'good' | 'warning' | 'critical';
  key_metrics: {
    food_safety_score: number;
    food_safety_trend: number;
    facility_safety_score: number;
    facility_safety_trend: number;
    open_risk_items: number;
    intelligence_alerts_7d: number;
    regulatory_pipeline: number;
    financial_exposure: { low: number; high: number };
  };
  executive_summary: string;
  risk_heatmap: { dimension: string; score: number; industry_avg: number }[];
  threats: { title: string; detail: string }[];
  opportunities: { title: string; detail: string }[];
  correlation_analysis: CorrelationFinding[];
  competitor_landscape: {
    closures: number;
    failed_inspections: number;
    position: 'leading' | 'competitive' | 'lagging';
    summary: string;
  };
  regulatory_forecast: RegulatoryForecastItem[];
  financial_impact: {
    risk_exposure: { low: number; high: number };
    compliance_savings: number;
    roi_ratio: string;
    top_cost_drivers: { label: string; amount: number }[];
  };
  inspector_intelligence: InspectorPattern[];
  weather_risks: { advisory: string; counties: string[]; risk_window: string; impact: string }[];
  strategic_recommendations: StrategicRecommendation[];
  full_narrative: string;
  source_count: number;
}

// ── 15 Intelligence Insights ─────────────────────────────────────

export const DEMO_INTELLIGENCE_INSIGHTS: IntelligenceInsight[] = [
  {
    id: 'demo-intel-001',
    source_type: 'health_dept',
    category: 'enforcement_surge',
    impact_level: 'high',
    urgency: 'urgent',
    title: 'Fresno County Hood Cleaning Citations Up 47% in Q1 2026',
    headline: 'Fresno inspectors are citing hood cleaning violations at nearly double the normal rate — review your schedule now.',
    summary: 'Fresno County Environmental Health has issued 47% more hood cleaning citations in Q1 2026 compared to Q1 2025. Three Central Valley chains have received closure warnings. Inspectors are specifically targeting grease accumulation above Type I hoods and inadequate cleaning frequency documentation.',
    full_analysis: 'Fresno County Environmental Health data from January 1 through February 15, 2026 shows 47% more hood cleaning and exhaust system citations versus the same period in 2025. This surge appears tied to a new lead inspector (Inspector Martinez, Badge #847) who has been conducting follow-up visits specifically to verify NFPA 96 compliance. Three multi-location chains in the Central Valley have received formal closure warnings after failing to produce adequate cleaning frequency documentation.\n\nThe enforcement pattern suggests a shift from visual-only inspections to documentation-heavy audits. Inspectors are requesting signed cleaning certificates with grease weight measurements — a requirement that many operators are unaware of. Operations with proper documentation are passing without issue, while those relying on verbal confirmations or informal scheduling are receiving citations at a significantly higher rate.',
    executive_brief: 'Fresno County enforcement surge creates material compliance risk for multi-location operators in the region. Financial exposure from closure orders and emergency re-cleaning ranges from $8,000-$45,000 per affected location.',
    action_items: [
      'Pull your hood cleaning logs for all Fresno locations today',
      'Verify cleaning frequency meets NFPA 96 Table 12.4 for your cooking volume',
      'Confirm your vendor has documentation of last service with grease weight recorded',
      'Schedule an unannounced self-inspection using the Facility Safety checklist this week',
      'Brief your kitchen managers on what inspectors are specifically looking for',
    ],
    affected_pillars: ['facility_safety'],
    affected_counties: ['fresno'],
    confidence_score: 0.82,
    tags: ['hood cleaning', 'NFPA 96', 'Fresno', 'enforcement', 'facility safety'],
    estimated_cost_impact: { low: 2500, high: 45000, currency: 'USD', methodology: 'Based on closure order frequency and emergency service costs' },
    published_at: '2026-02-20T08:00:00Z',
    source_name: 'Fresno County Environmental Health',
    market_signal_strength: 'strong',
    personalizedBusinessImpact: {
      relevance_score: 0.82,
      business_context: 'Fresno County\'s 47% hood cleaning enforcement surge directly impacts your Fresno Convention Center Catering operation. With hood cleaning approaching threshold at that location, you are in the primary enforcement zone during peak citation activity.',
      affected_locations: [
        { name: 'Fresno Convention Center Catering', impact: 'Direct exposure \u2014 hood cleaning approaching threshold in active enforcement zone', risk_level: 'high' },
      ],
      financial_impact_adjusted: { low: 5000, high: 90000, methodology: 'Adjusted for national park concession (2.0x multiplier) across 1 affected Fresno location' },
      personalized_actions: [
        'Pull hood cleaning logs for Fresno Convention Center today \u2014 last service may be approaching NFPA 96 threshold',
        'Verify your Fresno hood cleaning vendor has documentation with grease weight measurements',
        'Cross-check Yosemite NPS locations for similar documentation gaps before they become an issue',
      ],
      industry_specific_note: 'As a national park concession operator, facility safety documentation failures at any location can trigger NPS concession compliance review across your entire portfolio.',
    },
  },
  {
    id: 'demo-intel-002',
    source_type: 'legislative',
    category: 'legislative_update',
    impact_level: 'high',
    urgency: 'urgent',
    title: 'AB-2890 Food Handler Certification Bill Passes Senate Committee 7-2',
    headline: 'AB-2890 requiring annual food handler recertification has 73% passage probability — compliance deadline likely July 2027.',
    summary: 'AB-2890 passed the Senate Health Committee 7-2 on February 18, 2026, moving to the Senate floor with strong bipartisan support. The bill would require all food handlers to complete annual recertification rather than the current 3-year cycle. Estimated compliance cost is $45-120 per employee per year.',
    full_analysis: 'AB-2890 cleared the Senate Health Committee with a strong 7-2 bipartisan vote on February 18, 2026. The bill was authored by Assemblymember Rodriguez (D-Los Angeles) with co-sponsorship from Senator Williams (R-Fresno). The bill modifies HSC §113948 to require annual recertification for all food handlers in California. The current 3-year cycle under CalCode has been criticized after two high-profile outbreaks in 2025 were linked to knowledge gaps among long-tenured food handlers.\n\nIndustry associations estimate the compliance cost at $45-120 per employee per year depending on certification provider and delivery method (in-person vs. online). Multi-location operators can reduce per-employee costs through volume agreements with approved training providers. Early adoption before the compliance deadline could be used as a competitive differentiator and marketing point for food safety-conscious brands.',
    executive_brief: 'AB-2890 represents a significant compliance cost increase for multi-location operators. A 100-employee operation would face $4,500-$12,000 in additional annual training costs if passed as written. Recommended to begin budgeting for FY2027.',
    action_items: [
      'Add AB-2890 to your regulatory tracking watchlist',
      'Estimate total food handler headcount across all locations',
      'Calculate potential cost impact: headcount x $45-120 per person per year',
      'Contact your California Restaurant Association representative to submit comments',
      'Begin evaluating online recertification platforms that could reduce per-employee cost',
    ],
    affected_pillars: ['food_safety'],
    affected_counties: [],
    confidence_score: 0.78,
    tags: ['AB-2890', 'food handler', 'certification', 'legislation', 'California'],
    estimated_cost_impact: { low: 4500, high: 12000, currency: 'USD', methodology: 'Per-employee annual recertification cost x estimated headcount' },
    published_at: '2026-02-18T14:00:00Z',
    source_name: 'California Legislature',
    market_signal_strength: 'strong',
    personalizedBusinessImpact: {
      relevance_score: 0.78,
      business_context: 'AB-2890 annual food handler recertification would affect all 245 employees across your 7 locations. University dining operations (UC Merced, CSU Stanislaus) face the highest turnover-related recertification burden due to seasonal student workers.',
      affected_locations: [
        { name: 'UC Merced Dining Hall', impact: 'Highest impact \u2014 seasonal student worker turnover increases recertification volume', risk_level: 'high' },
        { name: 'CSU Stanislaus Food Court', impact: 'High impact \u2014 similar student worker recertification burden', risk_level: 'high' },
        { name: 'Half Dome Village Food Court', impact: 'Seasonal peak staff affected during May-September', risk_level: 'medium' },
        { name: 'Fresno Convention Center Catering', impact: 'Event-based staffing creates recertification tracking complexity', risk_level: 'medium' },
      ],
      financial_impact_adjusted: { low: 22050, high: 58800, methodology: 'Adjusted for national park concession (2.0x multiplier) across 7 locations at 35 avg employees each' },
      personalized_actions: [
        'Audit food handler certification expiration dates across all 7 locations immediately',
        'Prioritize UC Merced and CSU Stanislaus \u2014 student worker turnover creates highest gap risk',
        'Negotiate volume recertification pricing with an approved online training provider for 245+ employees',
      ],
      industry_specific_note: 'NPS concession agreements may require compliance with new state regulations ahead of the general deadline. Check your concession contract for early-adoption clauses.',
    },
  },
  {
    id: 'demo-intel-003',
    source_type: 'fda_recall',
    category: 'recall_alert',
    impact_level: 'critical',
    urgency: 'immediate',
    title: 'Class I Recall: Romaine Lettuce E.coli O157:H7 — California Distribution',
    headline: 'URGENT: Class I recall for romaine lettuce with confirmed E.coli O157:H7 contamination affects California restaurant distributors.',
    summary: 'FDA issued a Class I recall on February 21, 2026 for romaine lettuce from Salinas Valley distributed by three major California food service distributors. E.coli O157:H7 has been confirmed in 12 illness cases across California. All lot codes from January 15 - February 15 2026 are affected.',
    full_analysis: 'The FDA Class I recall (Recall #F-0847-2026) was initiated after CDC confirmed E.coli O157:H7 in 12 illness cases across California with whole genome sequencing linking all cases to romaine lettuce from a single Salinas Valley growing operation. Three major food service distributors — Sysco Northern California, US Foods Sacramento, and Performance Foodservice Fresno — have confirmed distributing affected product under multiple brand labels.\n\nThe contamination window covers lot codes dated January 15 through February 15, 2026. Given standard restaurant inventory rotation, any romaine currently in cold storage at affected locations should be treated as potentially contaminated until supplier clearance is confirmed. Similar recalls in 2018-2020 resulted in $2-8 million in industry losses from inventory disposal, supplier credit claims, and temporary menu modifications.',
    executive_brief: 'Class I recall requires immediate inventory removal. Failure to act creates HACCP documentation gaps, potential liability, and health code violations if product remains in use. Document removal for inspection records.',
    action_items: [
      'IMMEDIATELY check all romaine lettuce inventory and remove affected lot codes',
      'Contact your produce supplier to confirm if your supply chain is affected',
      'Document removal in your HACCP log with date, quantity, and disposition',
      'Notify kitchen staff to halt all romaine use until clearance confirmed',
      'Take photos of disposed product for your records',
    ],
    affected_pillars: ['food_safety'],
    affected_counties: ['fresno', 'merced', 'stanislaus', 'mariposa', 'sacramento'],
    confidence_score: 0.99,
    tags: ['recall', 'romaine', 'ecoli', 'FDA', 'Class I', 'HACCP'],
    estimated_cost_impact: { low: 500, high: 5000, currency: 'USD', methodology: 'Inventory disposal, supplier credit claim, documentation time' },
    published_at: '2026-02-21T10:00:00Z',
    source_name: 'FDA Food Safety and Inspection Service',
    market_signal_strength: 'strong',
    personalizedBusinessImpact: {
      relevance_score: 0.97,
      business_context: 'This Class I recall affects all 3 of your primary suppliers (Sysco Northern California, US Foods Sacramento, Performance Foodservice Fresno). All 7 locations are potentially exposed through your supply chain, with high-volume locations at greatest risk.',
      affected_locations: [
        { name: 'Half Dome Village Food Court', impact: 'Highest volume \u2014 600 daily covers, romaine used in multiple menu items', risk_level: 'high' },
        { name: 'UC Merced Dining Hall', impact: '1,200 daily covers \u2014 salad bar likely contains affected product', risk_level: 'high' },
        { name: 'CSU Stanislaus Food Court', impact: '800 daily covers \u2014 salad station exposure', risk_level: 'high' },
        { name: 'Yosemite Valley Lodge Dining', impact: '450 daily covers \u2014 menu includes romaine-based items', risk_level: 'high' },
        { name: 'The Ahwahnee Dining Room', impact: 'Fine dining \u2014 Caesar salad and seasonal preparations at risk', risk_level: 'medium' },
        { name: 'Fresno Convention Center Catering', impact: 'Catering menus may include affected product', risk_level: 'medium' },
      ],
      financial_impact_adjusted: { low: 7000, high: 70000, methodology: 'Adjusted for national park concession (2.0x multiplier) across 7 locations \u2014 includes inventory disposal, supplier credits, and menu modifications' },
      personalized_actions: [
        'IMMEDIATELY check romaine inventory at ALL 7 locations \u2014 contact Sysco, US Foods, and PFG for lot code verification',
        'Halt romaine use at Half Dome Village and university dining halls until supplier clearance confirmed',
        'Document removal at each location in HACCP logs \u2014 NPS requires separate documentation for Yosemite locations',
      ],
      industry_specific_note: 'NPS concession operations face additional recall documentation requirements. File NPS Incident Report Form 10-343 within 24 hours for any confirmed affected product at Yosemite locations.',
    },
  },
  {
    id: 'demo-intel-004',
    source_type: 'outbreak',
    category: 'outbreak_alert',
    impact_level: 'critical',
    urgency: 'immediate',
    title: 'Active Salmonella Investigation — Stanislaus County, 14 Cases Linked to Poultry',
    headline: 'CDPH is actively investigating 14 salmonella cases in Stanislaus County linked to poultry served at food service establishments.',
    summary: 'The California Department of Public Health is investigating a cluster of 14 Salmonella Typhimurium cases in Stanislaus County with illness onset dates between February 10-19, 2026. Epidemiological investigation suggests a food service source with poultry identified as the likely vehicle. Three locations have been identified for environmental sampling.',
    full_analysis: 'CDPH initiated investigation CDPH-2026-0234 on February 17 after receiving reports of 14 Salmonella Typhimurium cases in Stanislaus County with onset dates clustered between February 10-19. Whole genome sequencing confirms all isolates are closely related, indicating a common source. Patient interviews reveal that 12 of 14 patients consumed poultry dishes at food service establishments in the Modesto-Turlock corridor within 72 hours of symptom onset.\n\nStanislaus County DER has initiated environmental sampling at three food service locations identified through patient interviews. Historically, active outbreak investigations in Stanislaus County result in unannounced inspections of 15-25 food service operations within a 10-mile radius of identified cases. Operators should expect heightened scrutiny of poultry handling, cooking temperatures, and cross-contamination prevention protocols over the next 2-3 weeks.',
    executive_brief: 'Active outbreak investigations typically result in unannounced inspections of food service operations in the affected county. Ensure your poultry handling, cooking temperatures, and cross-contamination protocols are inspection-ready.',
    action_items: [
      'Review poultry cooking temperature logs for February 10-19 immediately',
      'Confirm all staff are following proper poultry handling and cross-contamination prevention',
      'Ensure 165°F minimum internal temperature is being verified and documented for all poultry',
      'Review your HACCP plan for poultry CCP compliance',
      'Be prepared for an unannounced health department visit in Stanislaus County this week',
    ],
    affected_pillars: ['food_safety'],
    affected_counties: ['stanislaus'],
    confidence_score: 0.91,
    tags: ['salmonella', 'outbreak', 'Stanislaus', 'poultry', 'CDPH', 'HACCP'],
    estimated_cost_impact: { low: 0, high: 25000, currency: 'USD', methodology: 'Potential inspection fines, temporary closure, legal exposure if linked' },
    published_at: '2026-02-21T09:00:00Z',
    source_name: 'California Department of Public Health',
    market_signal_strength: 'strong',
    personalizedBusinessImpact: {
      relevance_score: 0.91,
      business_context: 'The active salmonella investigation in Stanislaus County directly threatens your CSU Stanislaus Food Court, which has existing poultry temperature variance and cross-contamination vulnerabilities. Expect unannounced inspections within days.',
      affected_locations: [
        { name: 'CSU Stanislaus Food Court', impact: 'Direct exposure \u2014 active vulnerabilities for poultry temps and cross-contamination in outbreak county', risk_level: 'high' },
      ],
      financial_impact_adjusted: { low: 0, high: 50000, methodology: 'Adjusted for national park concession (2.0x multiplier) \u2014 includes potential citation, closure risk, and legal exposure' },
      personalized_actions: [
        'Review CSU Stanislaus poultry cooking temperature logs for February 10-19 immediately \u2014 existing variance issues compound risk',
        'Retrain CSU Stanislaus staff on poultry handling and 165\u00B0F verification this week',
        'Prepare CSU Stanislaus for unannounced inspection \u2014 focus on cross-contamination prevention documentation',
      ],
      industry_specific_note: 'A salmonella linkage to any Aramark university dining operation would trigger institutional review across your entire education food service portfolio.',
    },
  },
  {
    id: 'demo-intel-005',
    source_type: 'regulatory',
    category: 'regulatory_change',
    impact_level: 'high',
    urgency: 'urgent',
    title: 'NFPA 96 2025 Edition Enforcement Begins July 1, 2026 in California',
    headline: 'California fire marshals will begin enforcing NFPA 96 2025 edition requirements on July 1, 2026 — 4 key changes affect most commercial kitchens.',
    summary: 'Cal Fire has confirmed that the NFPA 96 2025 edition will become the enforced standard effective July 1, 2026, replacing the 2021 edition. Four significant changes affect commercial kitchens: updated hood listing requirements, revised grease duct clearance minimums, new inspection documentation requirements for suppression systems, and changed monthly inspection frequencies for solid-fuel cooking operations.',
    full_analysis: 'Cal Fire Office of the State Fire Marshal issued Bulletin 2026-003 on February 12 confirming adoption of NFPA 96 Standard for Ventilation Control and Fire Protection of Commercial Cooking Operations, 2025 Edition. The effective enforcement date is July 1, 2026. Key changes from the 2021 edition include: (1) Section 5.4 — updated hood listing requirements now specify UL 710B testing for all new installations; (2) Section 7.3 — revised grease duct clearance minimums increased from 18" to 24" for combustible construction; (3) Section 12.5 — new documentation requirements for suppression system inspections including photographic evidence of agent levels; (4) Table 12.4 — monthly inspection frequency now required for all solid-fuel cooking operations (previously quarterly).\n\nOperations with existing compliant installations are grandfathered for clearance requirements but must comply with documentation and inspection frequency changes by July 1. A gap assessment against the 2025 edition should be completed by April to allow adequate remediation time.',
    executive_brief: 'NFPA 96 2025 transition creates a 4-month compliance window. Operations with solid-fuel cooking equipment face the most significant changes. Recommend immediate gap assessment against 2025 edition requirements.',
    action_items: [
      'Schedule a gap assessment against NFPA 96 2025 edition before April 1',
      'Review hood listing documentation for compliance with updated requirements',
      'Confirm grease duct clearances meet 2025 edition minimums',
      'Update your facility safety checklist to reflect 2025 inspection documentation requirements',
      'Brief your hood cleaning vendor on 2025 edition changes before their next service visit',
    ],
    affected_pillars: ['facility_safety'],
    affected_counties: [],
    confidence_score: 0.88,
    tags: ['NFPA 96', '2025', 'fire code', 'Cal Fire', 'hood', 'suppression'],
    estimated_cost_impact: { low: 1500, high: 15000, currency: 'USD', methodology: 'Gap assessment, documentation updates, potential equipment modifications' },
    published_at: '2026-02-15T10:00:00Z',
    source_name: 'Cal Fire Office of the State Fire Marshal',
    market_signal_strength: 'strong',
    personalizedBusinessImpact: {
      relevance_score: 0.88,
      business_context: 'NFPA 96 2025 edition enforcement affects all 7 locations, but your 4 Yosemite NPS concession locations face dual documentation requirements from both Cal Fire and NPS. The April 1 gap assessment deadline precedes your peak season (May-September).',
      affected_locations: [
        { name: 'Half Dome Village Food Court', impact: 'Hood cleaning approaching threshold plus new documentation requirements', risk_level: 'high' },
        { name: 'Yosemite Valley Lodge Dining', impact: 'Dual jurisdiction \u2014 NPS + county fire marshal both require compliance', risk_level: 'high' },
        { name: 'The Ahwahnee Dining Room', impact: 'Historic building may have clearance challenges under new minimums', risk_level: 'medium' },
        { name: 'Fresno Convention Center Catering', impact: 'Catering kitchen subject to updated hood listing requirements', risk_level: 'medium' },
      ],
      financial_impact_adjusted: { low: 21000, high: 210000, methodology: 'Adjusted for national park concession (2.0x multiplier) across 7 locations' },
      personalized_actions: [
        'Schedule NFPA 96 2025 gap assessments for all 7 locations before April 1 \u2014 prioritize NPS locations',
        'Coordinate dual-jurisdiction documentation with both NPS and Mariposa County fire marshal',
        'The Ahwahnee historic designation may require variance requests for duct clearance changes \u2014 start now',
      ],
      industry_specific_note: 'NPS Concession Advisory CA-2026-008 already requires updated facility safety documentation. The NFPA 96 2025 transition creates a compounding compliance window. Address both simultaneously to avoid duplicated effort.',
    },
  },
  {
    id: 'demo-intel-006',
    source_type: 'competitor',
    category: 'competitor_activity',
    impact_level: 'medium',
    urgency: 'standard',
    title: 'Two Competitor Restaurant Closures Within 2 Miles of Your Downtown Location',
    headline: 'Health department closed 2 restaurants near your Downtown Fresno location — their customers are now available to you.',
    summary: 'Fresno County Environmental Health issued immediate closure orders to two food service operations within 1.8 miles of your Downtown Fresno location on February 19, 2026. One closure was due to repeat temperature violations, the other for pest infestation. Both operations have been closed for a minimum 72-hour reinspection period.',
    full_analysis: 'Fresno County Environmental Health enforcement records show two immediate closure orders issued on February 19, 2026 within the Downtown Fresno dining district: (1) "Fresh Kitchen & Grill" at 810 Van Ness Ave (1.2 miles from Downtown Kitchen) — closed for repeat critical temperature violations including walk-in cooler at 52°F and hot holding unit at 118°F. This was the second closure in 6 months. (2) "Valley Bistro" at 1245 Fulton St (1.8 miles from Downtown Kitchen) — closed for active pest infestation with evidence of rodent activity in dry storage and food preparation areas.\n\nBoth operations face 72-hour minimum closure with reinspection before reopening. Historical data shows that competitor closures in the Downtown Fresno area result in a measurable 8-15% increase in foot traffic to nearby compliant operations, with the effect lasting 2-4 weeks after the closed operation reopens.',
    executive_brief: 'Competitor closures near your Downtown location represent a short-term customer capture opportunity. Operations that maintain visible compliance certifications (QR passport, grade postings) are positioned to capture displaced customers. Estimated 200-400 displaced diners.',
    action_items: [
      'Ensure your compliance QR passport is prominently displayed at Downtown location',
      'Consider a short-term promotional offer to attract new customers this week',
      'Review your own temperature logs to confirm no similar vulnerabilities',
      'Update your Google Business profile to highlight your clean inspection record',
      'Brief front-of-house staff on your compliance story for customer questions',
    ],
    affected_pillars: ['food_safety'],
    affected_counties: ['fresno'],
    confidence_score: 0.79,
    tags: ['competitor', 'closure', 'Fresno', 'Downtown', 'opportunity'],
    estimated_cost_impact: { low: 0, high: 0, currency: 'USD', methodology: 'No direct cost — opportunity signal' },
    published_at: '2026-02-19T16:00:00Z',
    source_name: 'Fresno County Environmental Health',
    market_signal_strength: 'moderate',
    personalizedBusinessImpact: {
      relevance_score: 0.65,
      business_context: 'Two competitor closures near your Fresno Convention Center create a customer capture opportunity for catering and event dining. Your compliance documentation positions Aramark as a safer alternative for event organizers.',
      affected_locations: [
        { name: 'Fresno Convention Center Catering', impact: 'Opportunity \u2014 competitor closures within 2 miles create catering demand', risk_level: 'low' },
      ],
      financial_impact_adjusted: { low: 0, high: 0, methodology: 'No direct cost \u2014 opportunity signal for Fresno catering operation' },
      personalized_actions: [
        'Highlight Aramark\'s compliance record in upcoming Fresno Convention Center event proposals',
        'Ensure your EvidLY compliance QR passport is displayed at the Fresno location',
        'Review your own temperature logs at Fresno to confirm no similar vulnerabilities',
      ],
      industry_specific_note: 'As a national park concession operator, your brand reputation for food safety is a competitive advantage. Competitor failures in the same market reinforce the value of your compliance investment.',
    },
  },
  {
    id: 'demo-intel-007',
    source_type: 'weather',
    category: 'weather_risk',
    impact_level: 'high',
    urgency: 'urgent',
    title: 'Extreme Heat Advisory: Central Valley June 15-22 — Temperature Log Risk Window',
    headline: 'NWS forecasts 108-114\u00B0F in Central Valley June 15-22 — historical data shows 340% spike in walk-in cooler violations during this heat window.',
    summary: 'The National Weather Service has issued an Extreme Heat Advisory for Fresno, Merced, Stanislaus, and Tulare counties June 15-22, 2026, with temperatures forecast at 108-114\u00B0F. EvidLY historical analysis shows a 340% increase in walk-in cooler temperature exceedances and a 180% increase in refrigeration unit failures during comparable heat events.',
    full_analysis: 'The National Weather Service Hanford office has issued an Extreme Heat Advisory for the Central Valley corridor (Fresno, Merced, Stanislaus, Tulare, Kings, and Kern counties) for the period June 15-22, 2026. Forecast high temperatures range from 108-114\u00B0F with overnight lows remaining above 80\u00B0F, preventing overnight cooldown of kitchen facilities and refrigeration systems.\n\nEvidLY analysis of temperature log data from 847 monitored locations during comparable heat events (June 2024, July 2025) shows: 340% increase in walk-in cooler temperature exceedances above 41\u00B0F, 180% increase in refrigeration compressor failures, 67% increase in food safety incidents linked to temperature control, and average additional emergency maintenance cost of $3,200 per location. Proactive preparation — including preventive maintenance scheduling, increased monitoring frequency, and backup cooling arrangements — reduces incident rates by 60-80% during heat events.',
    executive_brief: 'The upcoming heat event creates elevated risk of temperature violations, refrigeration failures, and associated food safety incidents. Proactive preparation reduces both compliance risk and emergency maintenance costs by an estimated 60-80%.',
    action_items: [
      'Schedule preventive maintenance on all refrigeration units before June 10',
      'Increase temperature logging frequency to every 2 hours during the heat event',
      'Pre-position backup temperature monitoring (coolers, ice) at each location',
      'Ensure staff know the emergency protocol if a unit fails during service',
      'Consider pre-booking emergency refrigeration service contracts before demand spikes',
    ],
    affected_pillars: ['food_safety'],
    affected_counties: ['fresno', 'merced', 'stanislaus', 'tulare'],
    confidence_score: 0.87,
    tags: ['heat wave', 'temperature', 'walk-in cooler', 'Central Valley', 'NWS', 'refrigeration'],
    estimated_cost_impact: { low: 800, high: 12000, currency: 'USD', methodology: 'Emergency maintenance, inventory loss, increased monitoring labor costs' },
    published_at: '2026-02-20T12:00:00Z',
    source_name: 'National Weather Service \u2014 Hanford CA',
    market_signal_strength: 'strong',
    personalizedBusinessImpact: {
      relevance_score: 0.92,
      business_context: 'The June 15-22 heat advisory directly overlaps your peak season (May-September) when Yosemite visitor counts and food service volumes are at maximum. Half Dome Village Food Court already has a cooler trending warm \u2014 extreme heat will compound this vulnerability across all 7 locations.',
      affected_locations: [
        { name: 'Half Dome Village Food Court', impact: 'CRITICAL \u2014 cooler already trending warm, 600 daily covers during peak season heat', risk_level: 'high' },
        { name: 'Yosemite Valley Lodge Dining', impact: 'Peak season volume at 450 covers/day during heat event', risk_level: 'high' },
        { name: 'Fresno Convention Center Catering', impact: 'Fresno County heat epicenter \u2014 108-114\u00B0F forecast', risk_level: 'high' },
        { name: 'UC Merced Dining Hall', impact: 'Summer session dining during extreme heat period', risk_level: 'medium' },
      ],
      financial_impact_adjusted: { low: 11200, high: 168000, methodology: 'Adjusted for national park concession (2.0x multiplier) across 7 locations with peak season volume multiplier' },
      personalized_actions: [
        'PRIORITY: Schedule emergency preventive maintenance on Half Dome Village cooler before June 10 \u2014 already trending warm',
        'Pre-position backup refrigeration at all Yosemite locations for peak season heat contingency',
        'Increase temperature monitoring to every 2 hours at all locations during June 15-22 heat window',
      ],
      industry_specific_note: 'NPS locations in Yosemite have limited backup refrigeration options due to park infrastructure constraints. Pre-arrange emergency equipment staging with NPS facilities management before peak season.',
    },
  },
  {
    id: 'demo-intel-008',
    source_type: 'osha',
    category: 'enforcement_action',
    impact_level: 'medium',
    urgency: 'standard',
    title: 'CalOSHA Food Service Citations Up 28% YTD \u2014 Slip/Fall and Heat Illness Leading',
    headline: 'CalOSHA has increased food service enforcement 28% year-to-date with slip/fall hazards and heat illness prevention as top targets.',
    summary: 'CalOSHA enforcement data for January-February 2026 shows a 28% increase in citations issued to food service operations versus the same period in 2025. Slip and fall hazards (wet floors, inadequate non-slip matting) account for 34% of citations. Heat illness prevention violations, particularly the lack of written heat illness prevention plans, account for 22% of citations.',
    full_analysis: 'CalOSHA Division of Occupational Safety and Health enforcement data for January 1 through February 14, 2026 shows 28% more citations issued to NAICS code 722 (Food Services and Drinking Places) compared to the same period in 2025. Citation categories: (1) Slip/fall hazards (34%) — primarily inadequate non-slip matting in wet kitchen areas, missing "Wet Floor" signage during mopping, and grease accumulation on floor surfaces. (2) Heat illness prevention (22%) — missing or inadequate written Heat Illness Prevention Plans (required under T8 CCR §3395), insufficient shade/cooling provisions, lack of documented high-heat procedures.\n\nThe enforcement increase is consistent with CalOSHA Director Martinez\'s January 2026 memo prioritizing "hospitality and food service" for targeted enforcement in 2026. Operations can expect continued heightened scrutiny through the fiscal year. Heat illness prevention plans are a relatively low-cost compliance item (typically $0-500 to develop) that carry disproportionately high citation risk.',
    executive_brief: 'Increased CalOSHA enforcement activity creates additional compliance obligations beyond health department requirements. Heat illness prevention plans are a relatively low-cost compliance item that is frequently cited — a straightforward gap to close.',
    action_items: [
      'Verify all kitchen locations have written Heat Illness Prevention Plans',
      'Audit non-slip matting in all wet kitchen areas',
      'Ensure break room access to cool water and shade/AC during summer months',
      'Add CalOSHA heat illness prevention to your compliance checklist',
      'Check that all required safety postings are current and visible',
    ],
    affected_pillars: ['food_safety'],
    affected_counties: [],
    confidence_score: 0.84,
    tags: ['CalOSHA', 'heat illness', 'slip fall', 'food service', 'enforcement'],
    estimated_cost_impact: { low: 500, high: 8000, currency: 'USD', methodology: 'Citation fines ($2,500-$7,000 per serious violation) plus remediation costs' },
    published_at: '2026-02-18T09:00:00Z',
    source_name: 'CalOSHA',
    market_signal_strength: 'moderate',
    personalizedBusinessImpact: {
      relevance_score: 0.75,
      business_context: 'CalOSHA\'s 28% enforcement increase affects all 7 Aramark locations. Your Fresno Convention Center is missing a heat illness prevention plan, creating immediate citation risk. Yosemite locations face unique heat exposure during peak season operations.',
      affected_locations: [
        { name: 'Fresno Convention Center Catering', impact: 'Direct vulnerability \u2014 heat illness prevention plan missing', risk_level: 'high' },
        { name: 'Half Dome Village Food Court', impact: 'Outdoor quick service during peak season heat', risk_level: 'medium' },
        { name: 'UC Merced Dining Hall', impact: 'High-volume kitchen heat exposure', risk_level: 'medium' },
      ],
      financial_impact_adjusted: { low: 7000, high: 112000, methodology: 'Adjusted for national park concession (2.0x multiplier) across 7 locations \u2014 serious violation fines $5K-$14K each' },
      personalized_actions: [
        'IMMEDIATE: Develop written Heat Illness Prevention Plan for Fresno Convention Center \u2014 currently missing',
        'Audit non-slip matting in all kitchen areas across 7 locations',
        'Ensure all Yosemite locations have outdoor heat illness provisions for seasonal staff',
      ],
      industry_specific_note: 'National park concession employers face additional NPS occupational health requirements beyond CalOSHA. Ensure heat illness prevention plans reference both Cal/OSHA T8 CCR \u00A73395 and NPS Director\'s Order #50C.',
    },
  },
  // ── Insights 9-15: Additional coverage areas ──
  {
    id: 'demo-intel-009',
    source_type: 'health_dept',
    category: 'inspector_pattern',
    impact_level: 'medium',
    urgency: 'standard',
    title: 'Merced County Inspector Rotation — New Lead Inspector Focuses on Temperature Documentation',
    headline: 'Merced County assigned a new lead inspector who cites temperature log documentation gaps at 3x the previous rate.',
    summary: 'Merced County Department of Public Health rotated its lead food inspector for the Merced-Atwater corridor effective February 1, 2026. The new inspector, Inspector Chen (Badge #412), has issued 3x more citations for temperature log documentation gaps in the first two weeks compared to the previous inspector\'s monthly average.',
    full_analysis: 'Merced County DPH reassigned Inspector Chen (Badge #412) to the Merced-Atwater corridor on February 1, replacing Inspector Davis who retired after 18 years. Inspector Chen previously worked the Los Banos district where citation rates for documentation violations were consistently 40% higher than the county average. In the first 14 days of the new assignment, Chen has conducted 23 inspections and issued temperature documentation citations at 3x the rate of the previous inspector.\n\nThe pattern suggests a shift from outcome-based assessment (is the food safe?) to process-based assessment (can you prove the food was safe?). Operations with automated temperature logging or detailed manual logs are passing without issue. Key gaps being cited: missing time entries on temperature logs, logs not signed by the recorder, and no corrective action documentation when temperatures were out of range.',
    executive_brief: 'New Merced County inspector focuses heavily on temperature documentation completeness. Your Airport Cafe location should be prepared for a documentation-focused inspection within the next 30 days.',
    action_items: [
      'Audit temperature log completeness at Airport Cafe for the last 30 days',
      'Ensure all temp logs include time, recorder name, and corrective action (if out of range)',
      'Train staff on proper documentation when a reading is out of range',
      'Consider upgrading to automated temperature monitoring at Airport Cafe',
    ],
    affected_pillars: ['food_safety'],
    affected_counties: ['merced'],
    confidence_score: 0.76,
    tags: ['inspector', 'Merced', 'temperature logs', 'documentation', 'rotation'],
    estimated_cost_impact: { low: 250, high: 3000, currency: 'USD', methodology: 'Citation risk plus staff training time' },
    published_at: '2026-02-17T11:00:00Z',
    source_name: 'Merced County Department of Public Health',
    market_signal_strength: 'moderate',
    personalizedBusinessImpact: {
      relevance_score: 0.85,
      business_context: 'The new Merced County inspector\'s focus on temperature documentation directly threatens your UC Merced Dining Hall, which has existing temperature log documentation gaps. At 1,200 daily covers, this is your highest-volume location.',
      affected_locations: [
        { name: 'UC Merced Dining Hall', impact: 'Direct exposure \u2014 known temp log documentation gaps with new documentation-focused inspector', risk_level: 'high' },
      ],
      financial_impact_adjusted: { low: 500, high: 6000, methodology: 'Adjusted for national park concession (2.0x multiplier) across 1 affected location' },
      personalized_actions: [
        'Audit UC Merced temperature log completeness for the last 30 days \u2014 ensure time, recorder name, and corrective actions are documented',
        'Train UC Merced staff specifically on proper documentation when readings are out of range',
        'Consider upgrading to automated temperature monitoring at UC Merced to eliminate documentation gaps',
      ],
      industry_specific_note: 'University dining operations with high student worker turnover are particularly vulnerable to documentation inconsistencies. Standardize your temp log training across all campus locations.',
    },
  },
  {
    id: 'demo-intel-010',
    source_type: 'regulatory',
    category: 'regulatory_change',
    impact_level: 'medium',
    urgency: 'standard',
    title: 'FDA Updates Glove Use Guidance for Ready-to-Eat Foods \u2014 Effective March 2026',
    headline: 'FDA revised Food Code Section 3-301.11 guidance — new best practices for glove use with ready-to-eat foods effective March 1.',
    summary: 'The FDA issued updated guidance on February 10, 2026 clarifying acceptable glove use practices under Food Code Section 3-301.11 for bare hand contact with ready-to-eat foods. The guidance introduces a risk-based approach to glove change frequency and adds specific requirements for allergen cross-contact prevention during glove use.',
    full_analysis: 'FDA Guidance Document GD-2026-014 updates the interpretation of Food Code \u00A73-301.11 regarding bare hand contact and glove use with ready-to-eat (RTE) foods. Key changes: (1) Risk-based glove change frequency — operations handling known allergens must change gloves between allergen-containing and allergen-free food items, documented in HACCP. (2) Clarification that "single-use" gloves must not be washed and reused under any circumstance. (3) New recommendation for colored gloves (blue or black) to improve visual detection if torn during food preparation.\n\nWhile FDA guidance is not directly enforceable, California and most states incorporate FDA Food Code updates into their state codes within 12-24 months. Early adoption demonstrates due diligence and reduces transition costs when state codes are updated.',
    executive_brief: 'FDA glove guidance update is a low-cost compliance item that demonstrates proactive food safety culture. Recommend updating SOPs and training materials before March 1 to stay ahead of state code adoption.',
    action_items: [
      'Review current glove use SOPs against new FDA guidance',
      'Order colored (blue or black) gloves for all food prep stations',
      'Update allergen cross-contact prevention procedures to include glove change requirements',
      'Brief kitchen staff on updated glove practices during next team meeting',
    ],
    affected_pillars: ['food_safety'],
    affected_counties: [],
    confidence_score: 0.85,
    tags: ['FDA', 'gloves', 'ready-to-eat', 'Food Code', 'allergen', 'guidance'],
    estimated_cost_impact: { low: 100, high: 500, currency: 'USD', methodology: 'Glove procurement change, minimal training time' },
    published_at: '2026-02-10T15:00:00Z',
    source_name: 'FDA Center for Food Safety and Applied Nutrition',
    market_signal_strength: 'moderate',
    personalizedBusinessImpact: {
      relevance_score: 0.62,
      business_context: 'FDA glove guidance update affects all 7 Aramark locations. The Ahwahnee Dining Room and UC Merced Dining Hall handle the most allergen-sensitive preparations and should prioritize the glove change requirements.',
      affected_locations: [
        { name: 'The Ahwahnee Dining Room', impact: 'Fine dining with extensive allergen menu accommodations', risk_level: 'medium' },
        { name: 'UC Merced Dining Hall', impact: 'University dining with 8 major allergen stations', risk_level: 'medium' },
        { name: 'CSU Stanislaus Food Court', impact: 'Multi-station food court with allergen cross-contact risk', risk_level: 'medium' },
      ],
      financial_impact_adjusted: { low: 1400, high: 7000, methodology: 'Adjusted for national park concession (2.0x multiplier) across 7 locations' },
      personalized_actions: [
        'Order colored (blue or black) gloves for all 7 locations \u2014 standardize across the portfolio',
        'Update allergen cross-contact SOPs for The Ahwahnee and university dining halls first',
        'Brief all kitchen staff on updated glove practices during next shift meetings',
      ],
      industry_specific_note: 'NPS concession food service operations are expected to adopt FDA guidance promptly. Early adoption at Yosemite locations demonstrates regulatory leadership.',
    },
  },
  {
    id: 'demo-intel-011',
    source_type: 'industry',
    category: 'benchmark_shift',
    impact_level: 'medium',
    urgency: 'informational',
    title: 'California Food Safety Benchmark: Average Score Drops 2.3 Points Industry-Wide in Q4 2025',
    headline: 'Industry average food safety scores fell 2.3 points in Q4 2025 \u2014 your Downtown location now ranks in the 89th percentile.',
    summary: 'EvidLY\'s California food service benchmark data shows a 2.3-point decline in average food safety scores across 2,400 monitored locations in Q4 2025. The decline is attributed to holiday season staffing shortages and increased operational tempo. Your Downtown Kitchen location, with a food safety score of 96, now ranks in the 89th percentile, up from the 84th percentile in Q3.',
    full_analysis: 'EvidLY benchmark analysis across 2,400 California food service locations shows the statewide average food safety score declined from 79.2 to 76.9 (-2.3 points) in Q4 2025. Primary drivers: (1) Holiday staffing — temporary workers with less training contributed to 34% more checklist failures in November-December; (2) Increased operational tempo — higher volume during holiday season correlated with 18% more temperature exceedances; (3) Deferred maintenance — equipment service appointments were postponed 22% more frequently during the holiday period.\n\nYour organization\'s relative position improved as a result. Downtown Kitchen (96) moved from 84th to 89th percentile. Airport Cafe (84) moved from 62nd to 68th percentile. University Dining (72) remained at approximately the 41st percentile. The benchmark shift presents a marketing opportunity to emphasize your compliance position to customers and business partners.',
    executive_brief: 'Industry-wide score decline improves your relative competitive position without any operational changes. Your Downtown location is now top-decile in California. Consider leveraging this in customer-facing materials.',
    action_items: [
      'Update your QR passport to highlight 89th percentile ranking',
      'Consider a "Food Safety Excellence" marketing campaign for Q1 2026',
      'Use benchmark data in insurance renewal conversations to negotiate better rates',
      'Share the benchmark improvement with your team as a motivation and recognition tool',
    ],
    affected_pillars: ['food_safety'],
    affected_counties: [],
    confidence_score: 0.81,
    tags: ['benchmark', 'industry average', 'percentile', 'California', 'food safety'],
    estimated_cost_impact: { low: 0, high: 0, currency: 'USD', methodology: 'No direct cost — informational signal' },
    published_at: '2026-02-12T10:00:00Z',
    source_name: 'EvidLY Benchmark Engine',
    market_signal_strength: 'moderate',
    personalizedBusinessImpact: {
      relevance_score: 0.58,
      business_context: 'The industry-wide benchmark decline improves Aramark\'s relative position across all 7 locations without operational changes. The Ahwahnee (96) and Yosemite Valley Lodge (92) are now well into the top decile for California food safety.',
      affected_locations: [
        { name: 'The Ahwahnee Dining Room', impact: 'Score 96 \u2014 now top 5% in California', risk_level: 'low' },
        { name: 'Yosemite Valley Lodge Dining', impact: 'Score 92 \u2014 top 10% in California', risk_level: 'low' },
        { name: 'CSU Stanislaus Food Court', impact: 'Score 85 \u2014 now above industry average of 76.9', risk_level: 'low' },
      ],
      financial_impact_adjusted: { low: 0, high: 0, methodology: 'No direct cost \u2014 competitive positioning opportunity' },
      personalized_actions: [
        'Update Aramark\'s NPS concession renewal documentation to highlight top-decile food safety ranking',
        'Use benchmark data in upcoming university dining contract renewals at UC Merced and CSU Stanislaus',
        'Share improvement with Aramark corporate as evidence of Central Valley regional performance',
      ],
      industry_specific_note: 'NPS concession renewals heavily weight compliance performance. Top-decile positioning strengthens your competitive advantage in the upcoming concession rebid cycle.',
    },
  },
  {
    id: 'demo-intel-012',
    source_type: 'nps',
    category: 'concession_advisory',
    impact_level: 'high',
    urgency: 'urgent',
    title: 'NPS Concession Compliance Advisory \u2014 Yosemite Facility Safety Documentation Requirements Updated',
    headline: 'National Park Service updated concession facility safety documentation requirements for Yosemite — dual-jurisdiction operators must comply by April 1.',
    summary: 'The National Park Service issued Concession Advisory CA-2026-008 on February 14, 2026 updating facility safety documentation requirements for all commercial food service concessions in Yosemite National Park. The advisory adds photographic evidence requirements for monthly fire suppression inspections and mandates digital submission of all facility safety records through the NPS Concession Management System.',
    full_analysis: 'NPS Concession Advisory CA-2026-008 modifies the documentation requirements under the Concession Management Improvement Act (P.L. 105-391) for Yosemite National Park food service operations. Key changes: (1) Monthly fire suppression system inspections must include date-stamped photographic evidence of agent levels, nozzle alignment, and piping integrity; (2) All facility safety records must be submitted digitally through the NPS Concession Management System within 48 hours of inspection; (3) Annual facility safety self-certification must reference specific NFPA 96 sections and include third-party verification signatures.\n\nThis advisory creates a dual-documentation requirement for operations in Mariposa County that are also subject to county fire marshal inspections. Operators must maintain separate documentation sets for NPS and county compliance, as submission formats and timelines differ. EvidLY\'s document management system can generate both formats from a single inspection record.',
    executive_brief: 'NPS documentation update affects dual-jurisdiction operators at Yosemite. Compliance requires photographic evidence and digital submission — EvidLY already captures both. Brief your facilities team on the April 1 deadline.',
    action_items: [
      'Review NPS Concession Advisory CA-2026-008 for your Yosemite locations',
      'Ensure monthly fire suppression inspections include timestamped photos',
      'Set up digital submission workflow for NPS Concession Management System',
      'Verify your documentation meets both NPS and Mariposa County requirements',
      'Calendar the April 1, 2026 compliance deadline',
    ],
    affected_pillars: ['facility_safety'],
    affected_counties: ['mariposa'],
    confidence_score: 0.92,
    tags: ['NPS', 'Yosemite', 'concession', 'facility safety', 'dual jurisdiction', 'documentation'],
    estimated_cost_impact: { low: 500, high: 3000, currency: 'USD', methodology: 'Documentation system setup, training, photo equipment' },
    published_at: '2026-02-14T08:00:00Z',
    source_name: 'National Park Service — Yosemite',
    market_signal_strength: 'strong',
    personalizedBusinessImpact: {
      relevance_score: 0.98,
      business_context: 'This NPS advisory directly targets your Yosemite concession operations. All 4 Mariposa County NPS locations must comply by April 1 with new photographic evidence and digital submission requirements — on top of existing county fire marshal obligations.',
      affected_locations: [
        { name: 'Yosemite Valley Lodge Dining', impact: 'NPS concession — must comply with CA-2026-008 by April 1', risk_level: 'high' },
        { name: 'The Ahwahnee Dining Room', impact: 'NPS concession — dual documentation for NPS + county fire marshal', risk_level: 'high' },
        { name: 'Half Dome Village Food Court', impact: 'NPS concession — existing documentation gap compounds new requirements', risk_level: 'high' },
        { name: 'Yosemite Gateway Lodge Restaurant', impact: 'Mariposa County fire marshal jurisdiction overlaps NPS territory', risk_level: 'medium' },
      ],
      financial_impact_adjusted: { low: 4000, high: 24000, methodology: 'Adjusted for national park concession (2.0x multiplier) across 4 Mariposa County locations with dual documentation requirements' },
      personalized_actions: [
        'Review NPS Concession Advisory CA-2026-008 with your Yosemite facilities team this week',
        'Set up photographic evidence workflow for monthly fire suppression inspections at all 4 NPS locations',
        'Register for NPS Concession Management System digital submission — April 1 deadline is non-negotiable',
      ],
      industry_specific_note: 'This advisory is specifically written for your operation type. Non-compliance risks concession agreement penalties, including potential non-renewal. Prioritize this above other facility safety items.',
    },
  },
  {
    id: 'demo-intel-013',
    source_type: 'supply_chain',
    category: 'supply_disruption',
    impact_level: 'medium',
    urgency: 'standard',
    title: 'Central Valley Poultry Supply Disruption — Avian Flu Detected in Two Farms',
    headline: 'USDA confirmed avian influenza at two Central Valley poultry farms — expect 15-20% price increase and potential supply gaps in March.',
    summary: 'USDA APHIS confirmed highly pathogenic avian influenza (HPAI) at two commercial poultry farms in Fresno and Merced counties on February 16, 2026. Combined, the farms house approximately 800,000 birds. Depopulation and quarantine protocols will reduce regional poultry supply by an estimated 12-18% over the next 4-6 weeks.',
    full_analysis: 'USDA APHIS confirmed HPAI H5N1 detections at Sunrise Poultry (Fresno County, 500,000 birds) and Valley Fresh Farms (Merced County, 300,000 birds) on February 16, 2026. Both operations are under mandatory quarantine with depopulation underway. A 10-kilometer control zone has been established around each farm.\n\nRegional poultry distributors are already reporting 8-12% price increases for fresh chicken and turkey products. Food service operators in the Central Valley should expect 15-20% price increases and potential allocation limits from primary distributors by early March. Operations with frozen poultry inventory have a 2-3 week buffer before the supply impact is felt. This is the second HPAI event in the Central Valley in 18 months.',
    executive_brief: 'Poultry supply disruption will increase food costs 15-20% for March-April. Recommend locking in current pricing with suppliers where possible and adjusting menu costing. No direct compliance impact but inventory management practices should be documented.',
    action_items: [
      'Contact your poultry supplier to lock in current pricing for the next 30 days',
      'Review menu items dependent on poultry and prepare alternative protein options',
      'Increase frozen poultry inventory buffer if storage capacity allows',
      'Monitor USDA APHIS for additional farm detections in the region',
    ],
    affected_pillars: [],
    affected_counties: ['fresno', 'merced'],
    confidence_score: 0.88,
    tags: ['avian flu', 'HPAI', 'poultry', 'supply chain', 'USDA', 'Central Valley'],
    estimated_cost_impact: { low: 2000, high: 8000, currency: 'USD', methodology: 'Estimated food cost increase across locations for 4-6 week disruption period' },
    published_at: '2026-02-16T14:00:00Z',
    source_name: 'USDA APHIS',
    market_signal_strength: 'moderate',
    personalizedBusinessImpact: {
      relevance_score: 0.84,
      business_context: 'HPAI detections at farms supplying Sysco NorCal and Performance Foodservice Fresno directly affect your supply chain. Peak season (May-September) poultry demand for 7 locations amplifies the pricing impact — lock in pricing now before seasonal demand compounds the disruption.',
      affected_locations: [
        { name: 'UC Merced Dining Hall', impact: '1,200 daily covers — highest poultry consumption across portfolio', risk_level: 'high' },
        { name: 'Half Dome Village Food Court', impact: 'Peak season quick service relies heavily on poultry menu items', risk_level: 'high' },
        { name: 'CSU Stanislaus Food Court', impact: 'University dining with significant poultry-based menu items', risk_level: 'medium' },
        { name: 'Fresno Convention Center Catering', impact: 'Catering menus frequently feature poultry — price increases affect margins', risk_level: 'medium' },
      ],
      financial_impact_adjusted: { low: 28000, high: 112000, methodology: 'Adjusted for national park concession (2.0x multiplier) across 7 locations with peak season volume consideration' },
      personalized_actions: [
        'Contact Sysco NorCal and Performance Foodservice Fresno to lock in poultry pricing for the next 60 days',
        'Review university dining and NPS concession menus for alternative protein options during disruption',
        'Increase frozen poultry inventory at Yosemite locations before peak season begins in May',
      ],
      industry_specific_note: 'NPS concession menu changes require prior approval under your concession agreement. Begin the menu modification approval process now if poultry substitutions may be needed during peak season.',
    },
  },
  {
    id: 'demo-intel-014',
    source_type: 'cdph',
    category: 'regulatory_advisory',
    impact_level: 'medium',
    urgency: 'standard',
    title: 'CDPH Walk-in Cooler Advisory: 41\u00B0F Threshold Enforcement Clarification',
    headline: 'CDPH clarified that 41\u00B0F walk-in cooler threshold is measured at warmest point \u2014 not at the thermostat.',
    summary: 'CDPH issued Advisory CDPH-EH-2026-012 on February 13, 2026 clarifying that the 41\u00B0F cold holding temperature threshold under CalCode \u00A7113996 is measured at the warmest point of the storage unit, typically the door-side shelf at the top of the unit. This clarification is expected to increase citation rates by 10-15% at operations using thermostat readings as their compliance reference.',
    full_analysis: 'CDPH Environmental Health Branch advisory CDPH-EH-2026-012 provides enforcement guidance to local health departments on cold holding temperature measurements. The advisory clarifies that the 41\u00B0F threshold under CalCode \u00A7113996 must be verified at the "warmest point of the refrigerated space under normal operating conditions" — not at the thermostat or at the coldest point near the evaporator coil. Common warmest points include: top shelf near the door (most common), areas adjacent to the door seal, and shelves above the compressor exhaust.\n\nHistorical enforcement data shows that 22% of walk-in coolers that read 38-40\u00B0F at the thermostat exceed 41\u00B0F at the warmest point. Operations that log temperatures at the thermostat only are at elevated citation risk. EvidLY recommends placing monitoring sensors at both the thermostat and the identified warmest point for comprehensive coverage.',
    executive_brief: 'Walk-in cooler temperature enforcement at warmest point will catch operations that only monitor at the thermostat. Recommend adding a second monitoring point at the warmest location in each unit.',
    action_items: [
      'Identify the warmest point in each walk-in cooler (typically top shelf near door)',
      'Place a secondary thermometer or sensor at the warmest point',
      'Adjust thermostat setpoints to ensure warmest point stays below 41\u00B0F',
      'Update temperature logging procedures to record warmest-point readings',
    ],
    affected_pillars: ['food_safety'],
    affected_counties: [],
    confidence_score: 0.86,
    tags: ['CDPH', 'walk-in cooler', '41F', 'temperature', 'CalCode', 'enforcement'],
    estimated_cost_impact: { low: 50, high: 500, currency: 'USD', methodology: 'Secondary thermometer cost plus minor thermostat adjustment' },
    published_at: '2026-02-13T10:00:00Z',
    source_name: 'CDPH Environmental Health Branch',
    market_signal_strength: 'moderate',
    personalizedBusinessImpact: {
      relevance_score: 0.86,
      business_context: 'CDPH\'s warmest-point measurement clarification directly threatens your Half Dome Village Food Court, which already has a cooler trending warm. With 600 daily covers during peak season, a cooler failure is a high-impact food safety event.',
      affected_locations: [
        { name: 'Half Dome Village Food Court', impact: 'CRITICAL — cooler already trending warm, warmest-point standard increases citation risk', risk_level: 'high' },
        { name: 'UC Merced Dining Hall', impact: 'High-volume dining — verify warmest-point compliance in all walk-in coolers', risk_level: 'medium' },
        { name: 'Yosemite Valley Lodge Dining', impact: 'Seasonal temperature swings in Yosemite affect cooler performance', risk_level: 'medium' },
      ],
      financial_impact_adjusted: { low: 700, high: 7000, methodology: 'Adjusted for national park concession (2.0x multiplier) across 7 locations' },
      personalized_actions: [
        'PRIORITY: Place secondary thermometer at warmest point in Half Dome Village cooler — existing warm trend creates immediate risk',
        'Survey all walk-in coolers across 7 locations and identify warmest points (top shelf near door)',
        'Adjust cooler setpoints at Yosemite locations to account for summer ambient temperature increases',
      ],
      industry_specific_note: 'Yosemite locations face unique ambient temperature challenges that affect cooler performance. NPS environmental restrictions may limit refrigerant options — verify with NPS facilities management.',
    },
  },
  {
    id: 'demo-intel-015',
    source_type: 'legislative',
    category: 'legislative_update',
    impact_level: 'medium',
    urgency: 'informational',
    title: 'California Minimum Wage Increase to $17.50/hr Effective January 1, 2027 \u2014 Impact on Staffing and Compliance',
    headline: 'California minimum wage increases to $17.50/hr in 2027 \u2014 expected to accelerate kitchen staff turnover by 12-18% in the transition period.',
    summary: 'Governor Newsom signed SB-1456 on January 15, 2026 increasing the California minimum wage to $17.50/hr effective January 1, 2027, up from $16.50/hr. EvidLY analysis of previous minimum wage increases shows a 12-18% spike in food service staff turnover in the 3 months following implementation, with corresponding declines in checklist completion rates and temperature log compliance.',
    full_analysis: 'SB-1456 was signed into law on January 15, 2026, establishing the California minimum wage at $17.50/hour effective January 1, 2027. This represents a $1.00/hour increase (6.1%) from the current $16.50/hour rate. For food service operations, the fast food minimum ($20.00/hr under AB-1228) is unaffected.\n\nEvidLY historical analysis of compliance metrics during the January 2024 ($16.00 increase) and January 2025 ($16.50 increase) transitions shows consistent patterns: (1) Staff turnover increases 12-18% in Q4 before the increase as employees seek higher-paying positions; (2) New hire food handler certification gaps create 15-25% more documentation violations in Q1 after the increase; (3) Checklist completion rates decline 8-12% during the transition period due to training gaps. Operations that proactively adjust wages ahead of the mandate and invest in training retention see 60% less compliance disruption.',
    executive_brief: 'Minimum wage increase will compress margins and drive turnover. The compliance impact of turnover is often larger than the direct wage cost. Recommend proactive wage adjustments and training investment to minimize compliance disruption.',
    action_items: [
      'Model the wage increase impact on your labor costs across all locations',
      'Consider proactive wage adjustments in Q3-Q4 2026 to reduce turnover spike',
      'Ensure all food handler certifications are current before the transition period',
      'Budget for increased training costs in Q4 2026 and Q1 2027',
    ],
    affected_pillars: ['food_safety'],
    affected_counties: [],
    confidence_score: 0.90,
    tags: ['minimum wage', 'SB-1456', 'staffing', 'turnover', 'compliance impact', 'California'],
    estimated_cost_impact: { low: 15000, high: 45000, currency: 'USD', methodology: 'Annualized labor cost increase across locations plus turnover-related compliance costs' },
    published_at: '2026-02-10T08:00:00Z',
    source_name: 'California Legislature',
    market_signal_strength: 'strong',
    personalizedBusinessImpact: {
      relevance_score: 0.72,
      business_context: 'The minimum wage increase to $17.50/hr affects approximately 245 employees across your 7 locations. University dining locations (UC Merced, CSU Stanislaus) face the highest turnover risk as student workers are most price-sensitive. Compliance disruption during the transition will compound at Yosemite locations entering peak season.',
      affected_locations: [
        { name: 'UC Merced Dining Hall', impact: 'Highest turnover risk — student workers most sensitive to wage changes', risk_level: 'high' },
        { name: 'CSU Stanislaus Food Court', impact: 'Student worker retention risk during transition period', risk_level: 'high' },
        { name: 'Half Dome Village Food Court', impact: 'Seasonal hiring costs increase, peak season staffing affected', risk_level: 'medium' },
        { name: 'Fresno Convention Center Catering', impact: 'Event staff wage compression across roles', risk_level: 'medium' },
      ],
      financial_impact_adjusted: { low: 210000, high: 630000, methodology: 'Adjusted for national park concession (2.0x multiplier) across 7 locations at 35 employees average — includes wage increase plus turnover-related compliance costs' },
      personalized_actions: [
        'Model wage increase impact across all 7 locations — prioritize university dining for proactive adjustments',
        'Ensure all food handler certifications are current at UC Merced and CSU Stanislaus before Q4 turnover spike',
        'Budget for increased Yosemite seasonal hiring costs in 2027 peak season planning',
      ],
      industry_specific_note: 'NPS concession labor costs are factored into franchise fee calculations. Begin the NPS concession fee adjustment request process early to reflect the mandatory wage increase.',
    },
  },
];

// ── Executive Snapshot ────────────────────────────────────────────

export const DEMO_EXECUTIVE_SNAPSHOT: ExecutiveSnapshot = {
  generated_at: new Date().toISOString(),
  one_liner: 'Pacific Coast Dining is operationally compliant with 2 critical external alerts requiring immediate action and 1 regulatory change requiring Q2 preparation.',
  overall_status: 'warning',
  key_metrics: {
    food_safety_score: 84,
    food_safety_trend: +2.1,
    facility_safety_score: 77,
    facility_safety_trend: -1.3,
    open_risk_items: 7,
    intelligence_alerts_7d: 9,
    regulatory_pipeline: 4,
    financial_exposure: { low: 125000, high: 380000 },
  },
  executive_summary: 'Pacific Coast Dining\'s compliance posture is stable with improving food safety metrics (+2.1 points, 30-day trend) offset by a facility safety decline (-1.3 points) driven by overdue equipment inspections at University Dining. Two critical external intelligence alerts require immediate action: an FDA Class I romaine lettuce recall affecting your supply chain, and an active salmonella investigation in Stanislaus County that will likely trigger unannounced inspections at your University Dining location this week.\n\nYour competitive position is strengthening — two competitor closures near Downtown and an industry-wide benchmark decline have moved your Downtown location into the 89th percentile. However, regulatory headwinds are building: NFPA 96 2025 edition enforcement begins July 1 (4-month preparation window), and AB-2890 food handler recertification is advancing with 73% passage probability. Financial exposure across all locations ranges from $125,000 to $380,000 if identified risks materialize without mitigation. Recommended immediate actions focus on recall response, Stanislaus County inspection readiness, and hood cleaning documentation at Fresno locations.',
  risk_heatmap: [
    { dimension: 'Food Safety', score: 84, industry_avg: 77 },
    { dimension: 'Facility Safety', score: 77, industry_avg: 74 },
    { dimension: 'Documentation', score: 82, industry_avg: 68 },
    { dimension: 'Regulatory', score: 71, industry_avg: 65 },
    { dimension: 'Market', score: 88, industry_avg: 72 },
    { dimension: 'Operational', score: 79, industry_avg: 73 },
  ],
  threats: [
    { title: 'FDA Class I Romaine Recall', detail: 'Active E.coli O157:H7 recall affecting California distributors — requires immediate inventory check and HACCP documentation.' },
    { title: 'Stanislaus County Salmonella Investigation', detail: '14 cases linked to poultry — expect unannounced inspections at University Dining within days.' },
    { title: 'Fresno Hood Cleaning Enforcement Surge', detail: '47% citation increase — your Downtown location is in the enforcement zone.' },
  ],
  opportunities: [
    { title: 'Competitor Closures Near Downtown', detail: 'Two closures within 2 miles create short-term customer capture opportunity (200-400 displaced diners).' },
    { title: 'Benchmark Position Improvement', detail: 'Industry-wide score decline moved Downtown to 89th percentile — leverage in marketing and insurance negotiations.' },
    { title: 'Insurance Premium Negotiation Window', detail: 'Strong compliance documentation supports a 10-15% premium reduction request at next renewal.' },
  ],
  correlation_analysis: [
    { external_event: 'Fresno hood cleaning enforcement surge (+47%)', internal_impact: 'Downtown hood cleaning logs show last service 67 days ago (within compliance but approaching threshold)', strength: 'strong', action: 'Schedule hood cleaning at Downtown within 10 days to stay ahead of enforcement window' },
    { external_event: 'Stanislaus County salmonella investigation (14 cases)', internal_impact: 'University Dining poultry temp logs show 2 readings at 162\u00B0F (below 165\u00B0F minimum) last week', strength: 'strong', action: 'Immediately retrain University Dining staff on poultry cooking temperature verification' },
    { external_event: 'Industry benchmark decline (-2.3 points)', internal_impact: 'Your food safety trend is +2.1 points — widening competitive gap', strength: 'moderate', action: 'Leverage improved percentile ranking in QR passport and marketing materials' },
    { external_event: 'Central Valley heat advisory (June 15-22)', internal_impact: 'Airport Cafe walk-in cooler already trending warm — heat event will exacerbate', strength: 'moderate', action: 'Schedule preventive maintenance on Airport Cafe cooler before May 30' },
  ],
  competitor_landscape: {
    closures: 2,
    failed_inspections: 3,
    position: 'competitive',
    summary: 'Two competitor closures within 2 miles of Downtown (Fresh Kitchen & Grill, Valley Bistro). Three failed inspections in Merced County in the last 30 days. Your operations are in a competitive compliance position with Downtown ranking 89th percentile and Airport Cafe at 68th percentile.',
  },
  regulatory_forecast: [
    { title: 'NFPA 96 2025 Edition Enforcement', probability: 0.95, compliance_deadline: '2026-07-01', estimated_cost_per_location: { low: 500, high: 5000 }, summary: 'Confirmed by Cal Fire. Gap assessment recommended before April 1.' },
    { title: 'AB-2890 Annual Food Handler Recertification', probability: 0.73, compliance_deadline: '2027-07-01', estimated_cost_per_location: { low: 1500, high: 4000 }, summary: 'Passed Senate committee 7-2. Would require annual recertification for all food handlers.' },
    { title: 'FDA Glove Use Guidance Update', probability: 0.60, compliance_deadline: '2026-03-01', estimated_cost_per_location: { low: 50, high: 200 }, summary: 'FDA guidance effective March 1. State code adoption expected within 12-24 months.' },
  ],
  financial_impact: {
    risk_exposure: { low: 125000, high: 380000 },
    compliance_savings: 47000,
    roi_ratio: '3.8x',
    top_cost_drivers: [
      { label: 'Potential closure orders (facility safety)', amount: 85000 },
      { label: 'Recall-related costs (food safety)', amount: 45000 },
      { label: 'Regulatory fines (documentation gaps)', amount: 32000 },
      { label: 'Staffing turnover (compliance disruption)', amount: 28000 },
      { label: 'Emergency maintenance (heat event)', amount: 18000 },
    ],
  },
  inspector_intelligence: [
    { id: 'ip-1', county: 'Fresno', strictness_percentile: 78, focus_areas: ['hood cleaning', 'temperature logs', 'documentation'], trend: 'increasing', recommendation: 'Ensure hood cleaning documentation includes grease weight measurements. New inspector (Martinez, #847) is documentation-focused.', recent_citation_rate: 2.3 },
    { id: 'ip-2', county: 'Merced', strictness_percentile: 62, focus_areas: ['temperature logs', 'corrective actions', 'signage'], trend: 'increasing', recommendation: 'New inspector (Chen, #412) is 3x more likely to cite temperature log documentation gaps. Ensure all entries include time, name, and corrective action.', recent_citation_rate: 1.8 },
    { id: 'ip-3', county: 'Stanislaus', strictness_percentile: 71, focus_areas: ['documentation', 'food handling', 'cross-contamination'], trend: 'stable', recommendation: 'Active salmonella investigation will increase inspection frequency. Focus on poultry handling documentation and cooking temperature verification.', recent_citation_rate: 2.1 },
  ],
  weather_risks: [
    { advisory: 'Extreme Heat Advisory', counties: ['fresno', 'merced', 'stanislaus', 'tulare'], risk_window: 'June 15-22, 2026', impact: '340% increase in walk-in cooler violations historically during comparable heat events. 180% increase in refrigeration failures.' },
  ],
  strategic_recommendations: [
    { priority: 1, recommendation: 'Respond to FDA Class I romaine lettuce recall immediately', rationale: 'Active recall with confirmed E.coli cases. Failure to act creates liability exposure and HACCP documentation gaps.', estimated_impact: 'Eliminates $5,000-$25,000 liability risk', timeframe: 'Today', immediate: true },
    { priority: 2, recommendation: 'Prepare University Dining for unannounced Stanislaus County inspection', rationale: 'Active salmonella investigation in the county will trigger increased inspections. Two poultry temp readings below 165\u00B0F last week create vulnerability.', estimated_impact: 'Prevents potential citation ($2,500-$7,000) and closure risk', timeframe: 'This week', immediate: true },
    { priority: 3, recommendation: 'Schedule hood cleaning at Downtown Kitchen within 10 days', rationale: 'Fresno County enforcement surge (+47% citations) combined with last service 67 days ago creates elevated risk.', estimated_impact: 'Prevents $8,000-$45,000 closure and emergency service costs', timeframe: '10 days', immediate: false },
    { priority: 4, recommendation: 'Complete NFPA 96 2025 gap assessment for all locations', rationale: 'July 1 enforcement deadline with 4-month preparation window. Documentation changes affect all locations.', estimated_impact: 'Ensures compliance by deadline, avoids $1,500-$15,000 remediation costs', timeframe: 'By April 1', immediate: false },
    { priority: 5, recommendation: 'Schedule preventive maintenance on Airport Cafe refrigeration', rationale: 'Walk-in cooler trending warm and CDPH clarified warmest-point measurement standard. Heat event in June will compound the issue.', estimated_impact: 'Prevents $3,200 average emergency maintenance cost during heat event', timeframe: 'Before May 30', immediate: false },
  ],
  full_narrative: 'EVIDLY INTELLIGENCE EXECUTIVE BRIEF\nPacific Coast Dining — February 22, 2026\n\nOVERVIEW\nPacific Coast Dining operates three food service locations in the Central Valley: Downtown Kitchen (Fresno), Airport Cafe (Merced), and University Dining (Stanislaus). Overall compliance posture is stable with food safety trending positively (+2.1 points) and facility safety declining slightly (-1.3 points).\n\nCRITICAL ALERTS\nTwo critical alerts require immediate executive attention: (1) An FDA Class I recall for romaine lettuce with confirmed E.coli O157:H7 contamination affects California distributors serving all three locations. Immediate inventory verification and HACCP documentation are required. (2) An active salmonella investigation in Stanislaus County involving 14 cases linked to poultry will likely trigger unannounced inspections at University Dining. Two recent poultry temperature readings at University Dining were below the 165\u00B0F minimum, creating inspection vulnerability.\n\nENFORCEMENT LANDSCAPE\nFresno County has increased hood cleaning citations by 47% in Q1 2026, targeting documentation completeness. Merced County has rotated its lead inspector; the new inspector (Chen, #412) cites temperature log documentation gaps at 3x the previous rate. Stanislaus County enforcement will intensify due to the active outbreak investigation.\n\nREGULATORY FORECAST\nNFPA 96 2025 edition enforcement begins July 1, 2026, requiring gap assessments at all locations. AB-2890 food handler annual recertification has a 73% passage probability with a July 2027 compliance deadline. FDA has updated glove use guidance effective March 2026.\n\nFINANCIAL EXPOSURE\nTotal risk exposure ranges from $125,000 to $380,000 across all locations if identified risks materialize without mitigation. The primary cost drivers are potential facility safety closure orders ($85K), recall-related costs ($45K), and regulatory fines for documentation gaps ($32K). Current compliance investment generates an estimated 3.8x ROI through avoided incidents, fines, and insurance premium reductions.\n\nCOMPETITIVE POSITION\nTwo competitor closures near Downtown and an industry-wide benchmark decline have improved your relative competitive position. Downtown Kitchen now ranks in the 89th percentile for California food safety, up from the 84th percentile in Q3 2025.\n\nSTRATEGIC RECOMMENDATIONS\n1. [IMMEDIATE] Respond to romaine lettuce recall — verify inventory at all locations today\n2. [IMMEDIATE] Prepare University Dining for Stanislaus County inspection — focus on poultry temps\n3. [10 DAYS] Schedule hood cleaning at Downtown — ahead of Fresno enforcement surge\n4. [BY APRIL 1] Complete NFPA 96 2025 gap assessment at all locations\n5. [BY MAY 30] Schedule preventive maintenance on Airport Cafe refrigeration ahead of heat event',
  source_count: 20,
};

// ── Recall Alerts ─────────────────────────────────────────────────

export const DEMO_RECALL_ALERTS: RecallAlert[] = [
  {
    id: 'recall-001',
    class: 'I',
    status: 'active',
    product: 'Romaine Lettuce (whole heads and chopped)',
    brand: 'Salinas Valley Fresh / Pacific Greens / ValleySelect',
    reason: 'E.coli O157:H7 contamination — 12 confirmed cases',
    distribution: 'California food service distributors (Sysco NorCal, US Foods Sacramento, Performance Foodservice Fresno)',
    lot_codes: 'All lots January 15 - February 15, 2026',
    recall_date: '2026-02-21',
    affected_counties: ['fresno', 'merced', 'stanislaus', 'sacramento', 'mariposa'],
    source: 'FDA FSIS',
  },
  {
    id: 'recall-002',
    class: 'II',
    status: 'active',
    product: 'Frozen chicken tenders (5 lb bags)',
    brand: 'Valley Pride Foods',
    reason: 'Undeclared soy allergen — mislabeled packaging',
    distribution: 'Central California food service and retail',
    lot_codes: 'VP-CT-2026-0118 through VP-CT-2026-0204',
    recall_date: '2026-02-19',
    affected_counties: ['fresno', 'merced', 'tulare'],
    source: 'FDA FSIS',
  },
  {
    id: 'recall-003',
    class: 'I',
    status: 'resolved',
    product: 'Ground beef (various pack sizes)',
    brand: 'Central Valley Meats',
    reason: 'Salmonella Dublin contamination — 6 confirmed cases',
    distribution: 'Northern and Central California food service',
    lot_codes: 'CVM-GB-1205 through CVM-GB-1218',
    recall_date: '2026-01-28',
    resolved_date: '2026-02-10',
    affected_counties: ['fresno', 'sacramento', 'stanislaus'],
    source: 'USDA FSIS',
  },
];

// ── Outbreak Alerts ───────────────────────────────────────────────

export const DEMO_OUTBREAK_ALERTS: OutbreakAlert[] = [
  {
    id: 'outbreak-001',
    pathogen: 'Salmonella Typhimurium',
    status: 'active',
    case_count: 14,
    county: 'Stanislaus',
    vehicle: 'Poultry (chicken dishes)',
    onset_range: 'February 10-19, 2026',
    source: 'CDPH',
    published_at: '2026-02-21T09:00:00Z',
    summary: '14 confirmed cases with WGS-linked isolates. Three food service locations identified for environmental sampling. Unannounced inspections expected in the Modesto-Turlock corridor.',
  },
  {
    id: 'outbreak-002',
    pathogen: 'Norovirus GII.4',
    status: 'monitoring',
    case_count: 8,
    county: 'Sacramento',
    vehicle: 'Unknown (under investigation)',
    onset_range: 'February 15-20, 2026',
    source: 'Sacramento County DPH',
    published_at: '2026-02-20T14:00:00Z',
    summary: '8 cases of norovirus GII.4 reported in Sacramento County. Epidemiological investigation is ongoing to identify a common source. No food service linkage confirmed at this time.',
  },
];

// ── Legislative Items ─────────────────────────────────────────────

export const DEMO_LEGISLATIVE_ITEMS: LegislativeItem[] = [
  {
    id: 'leg-001',
    bill_number: 'AB-2890',
    title: 'Annual Food Handler Recertification',
    status: 'committee',
    probability: 0.73,
    compliance_deadline: '2027-07-01',
    estimated_cost_per_location: { low: 1500, high: 4000 },
    summary: 'Requires annual food handler recertification instead of 3-year cycle. Passed Senate Health Committee 7-2.',
    auto_checklist_items: ['Audit food handler certification expiration dates', 'Evaluate online recertification platforms', 'Budget for annual recertification costs'],
    tracking_url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260AB2890',
    published_at: '2026-02-18T14:00:00Z',
  },
  {
    id: 'leg-002',
    bill_number: 'SB-1456',
    title: 'Minimum Wage Increase to $17.50/hr',
    status: 'signed',
    probability: 1.0,
    compliance_deadline: '2027-01-01',
    estimated_cost_per_location: { low: 5000, high: 15000 },
    summary: 'Signed by Governor Newsom on January 15, 2026. Increases minimum wage to $17.50/hr effective January 1, 2027.',
    auto_checklist_items: ['Model labor cost impact', 'Adjust budget forecasts', 'Review wage compression across roles', 'Plan proactive wage adjustments to reduce turnover'],
    tracking_url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB1456',
    published_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'leg-003',
    bill_number: 'AB-1234',
    title: 'Commercial Kitchen Grease Trap Monitoring Requirements',
    status: 'introduced',
    probability: 0.35,
    compliance_deadline: '2028-01-01',
    estimated_cost_per_location: { low: 200, high: 800 },
    summary: 'Would require electronic monitoring of grease trap levels with automated alerts when capacity reaches 25%. Introduced February 5, 2026.',
    auto_checklist_items: ['Evaluate grease trap monitoring systems', 'Get quotes from approved vendors', 'Review current grease trap service frequency'],
    tracking_url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260AB1234',
    published_at: '2026-02-05T10:00:00Z',
  },
  {
    id: 'leg-004',
    bill_number: 'AB-660',
    title: 'Food Safety Modernization — Digital Record Keeping',
    status: 'chaptered',
    probability: 1.0,
    compliance_deadline: '2026-06-01',
    estimated_cost_per_location: { low: 0, high: 100 },
    summary: 'Allows digital record keeping in place of paper records for all food safety documentation. Already compliant if using EvidLY.',
    auto_checklist_items: ['Confirm digital records meet format requirements', 'Ensure records are exportable in required formats'],
    tracking_url: 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260AB660',
    published_at: '2025-10-01T10:00:00Z',
  },
];

// ── Inspector Patterns ────────────────────────────────────────────

export const DEMO_INSPECTOR_PATTERNS: InspectorPattern[] = [
  { id: 'ip-1', county: 'Fresno', strictness_percentile: 78, focus_areas: ['hood cleaning', 'temperature logs', 'documentation'], trend: 'increasing', recommendation: 'Ensure hood cleaning documentation includes grease weight measurements. New inspector (Martinez, #847) is documentation-focused.', recent_citation_rate: 2.3 },
  { id: 'ip-2', county: 'Merced', strictness_percentile: 62, focus_areas: ['temperature logs', 'corrective actions', 'signage'], trend: 'increasing', recommendation: 'New inspector (Chen, #412) is 3x more likely to cite temperature log documentation gaps. Ensure all entries include time, name, and corrective action.', recent_citation_rate: 1.8 },
  { id: 'ip-3', county: 'Stanislaus', strictness_percentile: 71, focus_areas: ['documentation', 'food handling', 'cross-contamination'], trend: 'stable', recommendation: 'Active salmonella investigation will increase inspection frequency. Focus on poultry handling documentation and cooking temperature verification.', recent_citation_rate: 2.1 },
];

// ── Competitor Events ─────────────────────────────────────────────

export const DEMO_COMPETITOR_EVENTS: CompetitorEvent[] = [
  { id: 'comp-001', type: 'closure', business_name: 'Fresh Kitchen & Grill', distance_miles: 1.2, near_location: 'Downtown Kitchen', reason: 'Repeat critical temperature violations (walk-in 52\u00B0F, hot hold 118\u00B0F)', date: '2026-02-19', source: 'Fresno County EH' },
  { id: 'comp-002', type: 'closure', business_name: 'Valley Bistro', distance_miles: 1.8, near_location: 'Downtown Kitchen', reason: 'Active pest infestation — rodent activity in dry storage and prep areas', date: '2026-02-19', source: 'Fresno County EH' },
  { id: 'comp-003', type: 'failed_inspection', business_name: 'Sunrise Diner', distance_miles: 3.4, near_location: 'Airport Cafe', reason: '6 critical violations including improper food storage and handwashing', date: '2026-02-15', source: 'Merced County DPH' },
  { id: 'comp-004', type: 'citation', business_name: 'Campus Eats', distance_miles: 0.8, near_location: 'University Dining', reason: 'Fire suppression system expired, hood cleaning overdue by 3 months', date: '2026-02-12', source: 'Stanislaus County DER' },
];

// ── Source Status ─────────────────────────────────────────────────

export const DEMO_SOURCE_STATUS: SourceStatus[] = [
  { id: 'src-01', name: 'FDA Food Safety Recalls', type: 'federal', jurisdictions: ['National'], frequency: 'Real-time', last_checked_at: '2026-02-22T07:45:00Z', next_check_at: '2026-02-22T08:00:00Z', new_events_this_week: 2, status: 'healthy' },
  { id: 'src-02', name: 'USDA FSIS Recalls', type: 'federal', jurisdictions: ['National'], frequency: 'Real-time', last_checked_at: '2026-02-22T07:50:00Z', next_check_at: '2026-02-22T08:00:00Z', new_events_this_week: 1, status: 'healthy' },
  { id: 'src-03', name: 'CDPH Outbreak Investigations', type: 'state', jurisdictions: ['California'], frequency: 'Every 4 hours', last_checked_at: '2026-02-22T06:00:00Z', next_check_at: '2026-02-22T10:00:00Z', new_events_this_week: 2, status: 'healthy' },
  { id: 'src-04', name: 'California Legislature (Bills)', type: 'legislative', jurisdictions: ['California'], frequency: 'Daily', last_checked_at: '2026-02-22T05:00:00Z', next_check_at: '2026-02-23T05:00:00Z', new_events_this_week: 1, status: 'healthy' },
  { id: 'src-05', name: 'Cal Fire OSFM Bulletins', type: 'regulatory', jurisdictions: ['California'], frequency: 'Daily', last_checked_at: '2026-02-22T06:00:00Z', next_check_at: '2026-02-23T06:00:00Z', new_events_this_week: 0, status: 'healthy' },
  { id: 'src-06', name: 'Fresno County EH Enforcement', type: 'county', jurisdictions: ['Fresno'], frequency: 'Every 6 hours', last_checked_at: '2026-02-22T06:00:00Z', next_check_at: '2026-02-22T12:00:00Z', new_events_this_week: 3, status: 'healthy' },
  { id: 'src-07', name: 'Merced County DPH', type: 'county', jurisdictions: ['Merced'], frequency: 'Every 6 hours', last_checked_at: '2026-02-22T06:00:00Z', next_check_at: '2026-02-22T12:00:00Z', new_events_this_week: 1, status: 'healthy' },
  { id: 'src-08', name: 'Stanislaus County DER', type: 'county', jurisdictions: ['Stanislaus'], frequency: 'Every 6 hours', last_checked_at: '2026-02-22T06:00:00Z', next_check_at: '2026-02-22T12:00:00Z', new_events_this_week: 2, status: 'healthy' },
  { id: 'src-09', name: 'CalOSHA Food Service', type: 'state', jurisdictions: ['California'], frequency: 'Daily', last_checked_at: '2026-02-22T05:00:00Z', next_check_at: '2026-02-23T05:00:00Z', new_events_this_week: 0, status: 'healthy' },
  { id: 'src-10', name: 'NPS Yosemite Concessions', type: 'federal', jurisdictions: ['Mariposa'], frequency: 'Daily', last_checked_at: '2026-02-22T06:00:00Z', next_check_at: '2026-02-23T06:00:00Z', new_events_this_week: 1, status: 'healthy' },
  { id: 'src-11', name: 'NWS Central Valley Weather', type: 'weather', jurisdictions: ['Fresno', 'Merced', 'Stanislaus', 'Tulare'], frequency: 'Every 2 hours', last_checked_at: '2026-02-22T07:00:00Z', next_check_at: '2026-02-22T09:00:00Z', new_events_this_week: 1, status: 'healthy' },
  { id: 'src-12', name: 'USDA APHIS Avian Flu', type: 'federal', jurisdictions: ['California'], frequency: 'Every 4 hours', last_checked_at: '2026-02-22T06:00:00Z', next_check_at: '2026-02-22T10:00:00Z', new_events_this_week: 1, status: 'healthy' },
  { id: 'src-13', name: 'FDA Food Code Updates', type: 'federal', jurisdictions: ['National'], frequency: 'Weekly', last_checked_at: '2026-02-21T10:00:00Z', next_check_at: '2026-02-28T10:00:00Z', new_events_this_week: 1, status: 'healthy' },
  { id: 'src-14', name: 'CDPH EH Advisories', type: 'state', jurisdictions: ['California'], frequency: 'Daily', last_checked_at: '2026-02-22T05:00:00Z', next_check_at: '2026-02-23T05:00:00Z', new_events_this_week: 1, status: 'healthy' },
  { id: 'src-15', name: 'EvidLY Benchmark Engine', type: 'internal', jurisdictions: ['California'], frequency: 'Weekly', last_checked_at: '2026-02-21T10:00:00Z', next_check_at: '2026-02-28T10:00:00Z', new_events_this_week: 1, status: 'healthy' },
  { id: 'src-16', name: 'Fresno Competitor Monitor', type: 'competitor', jurisdictions: ['Fresno'], frequency: 'Every 6 hours', last_checked_at: '2026-02-22T06:00:00Z', next_check_at: '2026-02-22T12:00:00Z', new_events_this_week: 2, status: 'healthy' },
  { id: 'src-17', name: 'Merced Competitor Monitor', type: 'competitor', jurisdictions: ['Merced'], frequency: 'Every 6 hours', last_checked_at: '2026-02-22T06:00:00Z', next_check_at: '2026-02-22T12:00:00Z', new_events_this_week: 1, status: 'warning' },
  { id: 'src-18', name: 'Stanislaus Competitor Monitor', type: 'competitor', jurisdictions: ['Stanislaus'], frequency: 'Every 6 hours', last_checked_at: '2026-02-22T06:00:00Z', next_check_at: '2026-02-22T12:00:00Z', new_events_this_week: 1, status: 'healthy' },
  { id: 'src-19', name: 'Mariposa County Fire Marshal', type: 'county', jurisdictions: ['Mariposa'], frequency: 'Daily', last_checked_at: '2026-02-22T06:00:00Z', next_check_at: '2026-02-23T06:00:00Z', new_events_this_week: 0, status: 'healthy' },
  { id: 'src-20', name: 'Sacramento County DPH', type: 'county', jurisdictions: ['Sacramento'], frequency: 'Every 6 hours', last_checked_at: '2026-02-21T18:00:00Z', next_check_at: '2026-02-22T00:00:00Z', new_events_this_week: 1, status: 'warning' },
  { id: 'src-21', name: 'CalRecycle Organics / SB 1383 Enforcement', type: 'state', jurisdictions: ['California'], frequency: 'Daily', last_checked_at: '2026-02-22T06:00:00Z', next_check_at: '2026-02-23T06:00:00Z', new_events_this_week: 1, status: 'healthy' },
  { id: 'src-22', name: 'USDA Food and Nutrition Service (FNS)', type: 'federal', jurisdictions: ['National'], frequency: 'Daily', last_checked_at: '2026-02-22T05:00:00Z', next_check_at: '2026-02-23T05:00:00Z', new_events_this_week: 0, status: 'healthy' },
];
