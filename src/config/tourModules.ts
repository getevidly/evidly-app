/**
 * ALL_MODULES — single source of truth for every feature in EvidLY
 * Group order matches tenant sidebar: daily tasks first, admin last.
 * Used in guided tour templates and setup form module toggles.
 */

export const ALL_MODULES = [
  {
    group: 'Daily Tasks',
    description: 'What staff do every single day',
    modules: [
      { id: 'temp_logging', label: 'Temperature Logging', description: 'Log probe temps for hot/cold hold, cooling, cooking, receiving' },
      { id: 'daily_checklists', label: 'Daily Checklists', description: 'Opening, closing, cleaning, and shift checklists' },
      { id: 'corrective_actions', label: 'Corrective Actions', description: 'Log and resolve out-of-range readings and violations' },
      { id: 'issue_reporting', label: 'Issue Reporting', description: 'Staff submit issues — equipment, safety, cleanliness' },
      { id: 'quick_actions', label: 'Quick Actions Bar', description: 'Persistent Log Temp / Checklist / Upload / Report Issue bar' },
    ],
  },
  {
    group: 'Food Safety',
    description: 'FDA Food Code and CalCode food handling compliance',
    modules: [
      { id: 'receiving_inspection', label: 'Receiving Inspection', description: 'Log temps and conditions for deliveries' },
      { id: 'haccp', label: 'HACCP Management', description: 'Hazard analysis, CCPs, monitoring records' },
      { id: 'allergen_management', label: 'Allergen Management', description: 'Track and document allergen controls per menu item' },
      { id: 'food_handler_certs', label: 'Food Handler Certifications', description: 'Track employee food handler card expiration' },
      { id: 'date_labeling', label: 'Date Labeling & FIFO', description: 'Prep and discard date tracking' },
      { id: 'pest_control', label: 'Pest Control Log', description: 'Log inspections, findings, and treatment records' },
      { id: 'water_testing', label: 'Water & Ice Testing', description: 'Water temp and ice machine sanitation logs' },
    ],
  },
  {
    group: 'Fire Safety',
    description: 'Fire safety, equipment, and physical plant compliance',
    modules: [
      { id: 'fire_safety', label: 'Fire Safety', description: 'Hood cleaning schedule, NFPA 96 compliance, AHJ info, fire suppression' },
      { id: 'hood_cleaning', label: 'Hood Cleaning Schedule', description: 'NFPA 96 Table 12.4 frequency tracking per appliance type' },
      { id: 'fire_suppression', label: 'Fire Suppression System', description: 'Semi-annual inspection tracking and certificate storage' },
      { id: 'portable_extinguishers', label: 'Portable Fire Extinguishers', description: 'Monthly visual checks and annual inspection logs' },
      { id: 'equipment_maintenance', label: 'Equipment Maintenance', description: 'Preventive maintenance logs and service history per asset' },
      { id: 'equipment_calibration', label: 'Equipment Calibration', description: 'Thermometer and probe calibration records' },
      { id: 'cleaning_schedules', label: 'Cleaning Schedules', description: 'Deep cleaning task assignments and completion tracking' },
      { id: 'emergency_procedures', label: 'Emergency Procedures', description: 'Evacuation plans, emergency contacts, incident documentation' },
    ],
  },
  {
    group: 'Compliance',
    description: 'Inspection readiness and jurisdictional requirements',
    modules: [
      { id: 'self_inspections', label: 'Self-Inspections', description: 'Jurisdiction-specific pre-inspection walkthroughs' },
      { id: 'jie_score', label: 'Jurisdiction Intelligence', description: 'How this jurisdiction scores inspections — methodology, weights, grading' },
      { id: 'score_table', label: 'ScoreTable', description: 'The Score Behind Every Table — jurisdiction profile reference' },
      { id: 'regulatory_updates', label: 'Regulatory Updates', description: 'Live alerts when jurisdiction rules change' },
      { id: 'document_management', label: 'Document Management', description: 'Store permits, licenses, certifications, and inspection reports' },
      { id: 'corrective_action_tracking', label: 'Corrective Action Tracking', description: 'Open/closed CA log with due dates and assignment' },
      { id: 'violation_history', label: 'Violation History', description: 'Historical inspection results from jurisdiction database' },
      { id: 'sb1383', label: 'SB 1383 Compliance', description: 'California organic waste reduction tracking (separate module)' },
      { id: 'k12_usda', label: 'K-12 USDA Overlay', description: 'School nutrition compliance on top of core food safety' },
    ],
  },
  {
    group: 'Insights & Benchmarking',
    description: 'Strategic visibility and performance analytics',
    modules: [
      { id: 'dashboard_overview', label: 'Dashboard Overview', description: 'Compliance health at a glance — scores, open items, trends' },
      { id: 'benchmarking', label: 'Benchmarking', description: 'Compare location performance across the portfolio' },
      { id: 'leaderboard', label: 'Location Leaderboard', description: 'Ranked performance across all locations' },
      { id: 'risk_analysis', label: 'Risk Analysis', description: 'Revenue, Liability, Cost, and Operational risk dimensions' },
      { id: 'trend_analytics', label: 'Trend Analytics', description: '30/60/90/180/365-day compliance trend views' },
      { id: 'business_intelligence', label: 'Business Intelligence', description: 'Executive-level portfolio insights and KPI dashboards' },
      { id: 'compliance_score_engine', label: 'Compliance Score Engine', description: 'Inspection Readiness + Benchmarking Index + Insurance Risk Score' },
      { id: 'insurance_risk_score', label: 'Insurance Risk Score', description: 'Configurable-weight risk score for insurance premium reduction' },
    ],
  },
  {
    group: 'Reporting',
    description: 'Exports, summaries, and audit-ready documentation',
    modules: [
      { id: 'compliance_reports', label: 'Compliance Reports', description: 'Auto-generated inspection-ready report packages' },
      { id: 'data_export', label: 'Data Export', description: 'CSV/Excel export of any dataset on demand or scheduled' },
      { id: 'audit_trail', label: 'Audit Trail', description: 'Full log of who did what and when across all locations' },
      { id: 'k2c_reporting', label: 'K2C Impact Report', description: 'Kitchen to Community meal contribution reporting' },
    ],
  },
  {
    group: 'Vendors & Operations',
    description: 'Third-party service providers and operational tools',
    modules: [
      { id: 'vendor_management', label: 'Vendor Management', description: 'Track service vendors — hood cleaning, pest control, HVAC, etc.' },
      { id: 'vendor_certifications', label: 'Vendor Certifications', description: 'Store and track expiration of vendor certs and licenses' },
      { id: 'vendor_ecosystem', label: 'Vendor Ecosystem', description: 'EvidLY-verified vendors in your jurisdiction (marketplace)' },
      { id: 'calendar', label: 'Compliance Calendar', description: 'Day/week/month view of all tasks, deadlines, inspections' },
      { id: 'qr_codes', label: 'QR Code Access', description: 'Mobile/tablet QR for quick access to location checklists' },
    ],
  },
  {
    group: 'Administration',
    description: 'Account, users, and platform configuration',
    modules: [
      { id: 'user_management', label: 'User Management', description: 'Add staff, assign roles, manage location access' },
      { id: 'org_profile', label: 'Organization Profile', description: 'Company info, jurisdiction assignment, contact details' },
      { id: 'location_management', label: 'Location Management', description: 'Add/edit locations, assign jurisdictions, set location types' },
      { id: 'integrations', label: 'Integrations', description: 'Connect POS, IoT sensors, CRM, insurance, and 20+ more' },
      { id: 'billing_subscription', label: 'Billing & Subscription', description: 'Plan management, invoice history, payment method' },
      { id: 'notifications', label: 'Notification Settings', description: 'Configure alerts — email, SMS, in-app per event type' },
    ],
  },
] as const;

export type ModuleId = typeof ALL_MODULES[number]['modules'][number]['id'];
