import type { UserRole } from '../contexts/RoleContext';

export type TooltipSection =
  | 'overallScore'
  | 'fireSafety'
  | 'urgentItems'
  | 'todaysProgress'
  | 'locationCards'
  | 'locationScoreCard'
  | 'checklistCard'
  | 'incidentCard'
  | 'equipmentCard'
  | 'vendorCard'
  | 'reportsCard'
  | 'jurisdictionCard'
  | 'teamCard'
  | 'auditLogCard'
  | 'alertBanner'
  | 'bottomBarActions'
  | 'scheduleCalendar';

export const tooltipContent: Record<TooltipSection, Record<UserRole, string>> = {
  // ── TOOLTIPS-1 (original 5 sections) ──────────────────────
  overallScore: {
    owner_operator:
      'Your combined food safety and fire safety score across all locations, weighted by each jurisdiction\'s verified methodology. This is what regulators and auditors see.',
    executive:
      'Aggregate compliance posture across your portfolio. Drill into individual locations to identify where risk is concentrated.',
    compliance_manager:
      'Jurisdiction-weighted score combining food safety violations and fire safety pass/fail status. Reflects your current standing under active enforcement methodology.',
    chef:
      'Your location\'s current compliance score. Completing daily checklists and addressing flagged items moves this number in real time.',
    facilities_manager:
      'Your fire safety systems directly impact this score. All four systems — Permit, Hood, Extinguisher, and Ansul — must pass at every location.',
    kitchen_manager:
      'Your location\'s current compliance score. Completing daily checklists and addressing flagged items moves this number in real time.',
    kitchen_staff:
      'This shows how your location is doing on health and safety. Complete your assigned tasks to keep it green.',
  },
  fireSafety: {
    owner_operator:
      'Pass/Fail status per NFPA 96 (2024) for each Authority Having Jurisdiction. One red bar at any location is a compliance failure.',
    executive:
      'Fire safety is binary — Pass or Fail. A single failed system exposes the entire location to permit suspension or closure.',
    compliance_manager:
      'Verified against NFPA 96 (2024) Table 12.4. Each AHJ is mapped to your specific location — no generic defaults.',
    chef:
      'All four systems must show green for your location to pass fire inspection. Contact your Facilities Manager if any bar is red.',
    facilities_manager:
      'Your primary dashboard. Permit = operational permit current. Hood = last cleaning within NFPA 96 interval. Ext = extinguisher inspected. Ansul = suppression system serviced.',
    kitchen_manager:
      'All four systems must show green for your location to pass fire inspection. Contact your Facilities Manager if any bar is red.',
    kitchen_staff:
      'Green means your kitchen\'s fire safety systems are current. If you see red, tell your manager immediately.',
  },
  urgentItems: {
    owner_operator:
      'High-priority items across all locations requiring immediate action. These carry the greatest regulatory and liability risk.',
    executive:
      'Unresolved critical items by location. Each open item represents potential inspection failure or enforcement action.',
    compliance_manager:
      'Violations and documentation gaps flagged as high-priority under your active jurisdiction\'s enforcement criteria.',
    chef:
      'Tasks and checklist items flagged as urgent for your location today. Resolve these before your next service period.',
    facilities_manager:
      'Overdue maintenance, expired permits, or failed system checks. These must be resolved before your next inspection window.',
    kitchen_manager:
      'Tasks and checklist items flagged as urgent for your location today. Resolve these before your next service period.',
    kitchen_staff:
      'These are your most important tasks right now. Complete them first before moving on to other assignments.',
  },
  todaysProgress: {
    owner_operator:
      'Daily checklist completion rate across all locations. Resets at midnight local time.',
    executive:
      'Operational compliance activity for today. Consistent daily completion correlates with higher inspection scores.',
    compliance_manager:
      'Today\'s checklist submissions versus required tasks. Gaps here create documentation risk during audits.',
    chef:
      'Your team\'s progress on today\'s assigned checklists. Tap any item to complete or flag for follow-up.',
    facilities_manager:
      'Equipment checks and maintenance tasks scheduled for today. Incomplete items carry forward as overdue.',
    kitchen_manager:
      'Your team\'s progress on today\'s assigned checklists. Tap any item to complete or flag for follow-up.',
    kitchen_staff:
      'Here\'s what\'s on your list for today. Check off each task as you complete it.',
  },
  locationCards: {
    owner_operator:
      'Each card reflects that location\'s active jurisdiction, verified scoring methodology, and current compliance posture.',
    executive:
      'Location-level snapshot. Click any card to see inspection history, score trends, and open items.',
    compliance_manager:
      'Jurisdiction and scoring methodology are verified per location — no assumptions. Click to view enforcement agency details and scoring weights.',
    chef:
      'Your location\'s current standing. Click to view today\'s checklists, open items, and recent inspection results.',
    facilities_manager:
      'Shows fire AHJ, permit status, and equipment compliance per location. Click to manage assets and maintenance schedules.',
    kitchen_manager:
      'Your location\'s current standing. Click to view today\'s checklists, open items, and recent inspection results.',
    kitchen_staff:
      'This is your location. Tap to see your tasks for today.',
  },

  // ── TOOLTIPS-2 (11 new sections) ──────────────────────────

  locationScoreCard: {
    owner_operator:
      'This location\'s combined food and fire compliance score under its active jurisdiction. Tap to drill into inspection history and open items.',
    executive:
      'Location-level compliance posture. Each location is scored under its own jurisdiction methodology \u2014 scores are not directly comparable across counties.',
    compliance_manager:
      'Jurisdiction-weighted score for this location. Reflects current standing under the active enforcement methodology \u2014 not a generic or estimated score.',
    chef:
      'Your kitchen\'s current compliance score. Completing daily checklists and addressing flagged items improves this in real time.',
    facilities_manager:
      'Fire safety systems contribute directly to this score. All four \u2014 Permit, Hood, Ext, Ansul \u2014 must pass.',
    kitchen_manager:
      'Your location\'s compliance score. Tap to see what\'s driving it and what tasks will move it.',
    kitchen_staff:
      'This is how your kitchen is doing. Green is good \u2014 complete your tasks to keep it that way.',
  },
  checklistCard: {
    owner_operator:
      'Daily operational checklists across all locations. Completion rates feed into compliance documentation and inspection readiness.',
    executive:
      'Aggregate checklist completion rate. Consistent daily completion is the leading indicator of inspection performance.',
    compliance_manager:
      'Checklist submissions create the audit trail regulators review during inspections. Gaps here are documentation risk.',
    chef:
      'Your team\'s daily task list. Each completed checklist item is logged and timestamped for compliance records.',
    facilities_manager:
      'Equipment and safety checks scheduled for today. Incomplete items carry forward as overdue and affect your compliance score.',
    kitchen_manager:
      'Today\'s checklists for your location. Tap to assign, complete, or flag items for follow-up.',
    kitchen_staff:
      'Your tasks for today. Check off each one as you go \u2014 your manager can see your progress.',
  },
  incidentCard: {
    owner_operator:
      'Logged incidents across all locations. Each incident creates a compliance record \u2014 unresolved incidents are flagged during inspections.',
    executive:
      'Open incident count by location. High frequency or long resolution times are leading indicators of inspection risk.',
    compliance_manager:
      'Incident records are part of your regulatory documentation. Ensure each has a resolution timestamp and corrective action logged.',
    chef:
      'Incidents logged in your kitchen. Report anything unusual \u2014 unlogged incidents create compliance gaps.',
    facilities_manager:
      'Equipment failures, safety events, and maintenance incidents. Document and resolve before your next inspection window.',
    kitchen_manager:
      'Incidents at your location. Log new incidents and track open items to resolution.',
    kitchen_staff:
      'If something goes wrong in the kitchen, log it here. Your manager will follow up.',
  },
  equipmentCard: {
    owner_operator:
      'Equipment assets across all locations with maintenance status. Overdue service on fire suppression or hood systems creates compliance risk.',
    executive:
      'Asset health summary by location. Deferred maintenance on critical equipment is a liability and a fire safety compliance issue.',
    compliance_manager:
      'Equipment service records are reviewed during fire safety and health inspections. Ensure all service dates are current and documented.',
    chef:
      'Kitchen equipment assigned to your location. Flag anything that needs repair \u2014 overdue equipment affects inspection scores.',
    facilities_manager:
      'Your primary asset register. Tracks service intervals, vendor assignments, and next-due dates per NFPA 96 (2024) requirements.',
    kitchen_manager:
      'Equipment at your location and its current service status. Tap to log a maintenance request or view service history.',
    kitchen_staff:
      'If a piece of equipment isn\'t working right, tap here to report it.',
  },
  vendorCard: {
    owner_operator:
      'Vendors servicing your locations \u2014 hood cleaning, grease management, fire suppression, and more. Service records feed directly into compliance documentation.',
    executive:
      'Vendor relationships and contract status by location. Lapsed service contracts are a compliance exposure.',
    compliance_manager:
      'Vendor service certificates and dates are required documentation for fire safety inspections. Verify all are current.',
    chef:
      'The service vendors scheduled for your location. You\'ll be notified before scheduled visits.',
    facilities_manager:
      'Manage vendor assignments, service schedules, and certificate tracking. Service gaps trigger compliance alerts.',
    kitchen_manager:
      'Vendors scheduled to service your location. Confirm access and log completed visits here.',
    kitchen_staff:
      'Vendors may be on-site for scheduled maintenance. Your manager will let you know in advance.',
  },
  reportsCard: {
    owner_operator:
      'Compliance reports across all locations \u2014 inspection history, score trends, and documentation exports for audits or lender review.',
    executive:
      'Portfolio-level compliance reporting. Export for board review, lender diligence, or insurance purposes.',
    compliance_manager:
      'Regulatory documentation exports, inspection summaries, and violation history. Your primary audit defense materials.',
    chef:
      'Reports for your location are available here. Your manager controls what you can view and export.',
    facilities_manager:
      'Fire safety service reports, equipment maintenance logs, and AHJ correspondence \u2014 all exportable for inspection prep.',
    kitchen_manager:
      'Location-level compliance reports. Export inspection history or checklist completion records as needed.',
    kitchen_staff:
      'You don\'t have access to reports. Ask your manager if you need documentation.',
  },
  jurisdictionCard: {
    owner_operator:
      'Each location is mapped to its actual enforcement jurisdiction. Scores reflect that agency\'s verified methodology \u2014 not a generic standard.',
    executive:
      'Confirms which regulatory body governs each location and how they score. Different counties grade differently \u2014 this shows the rules for each.',
    compliance_manager:
      'Verified jurisdiction data for this location \u2014 enforcement agency, scoring methodology, and contact information. Nothing assumed.',
    chef:
      'This shows which county health department and fire department oversees your kitchen.',
    facilities_manager:
      'Your fire AHJ details \u2014 the authority that issues your operational permit and conducts fire safety inspections.',
    kitchen_manager:
      'The regulatory agencies that inspect your location and what they look for.',
    kitchen_staff:
      'This shows who inspects your kitchen and what the rules are.',
  },
  teamCard: {
    owner_operator:
      'Staff assignments and role access across all locations. Control who can view, edit, or export compliance data.',
    executive:
      'Staffing overview by location. Team gaps can be a compliance risk if critical roles are unfilled.',
    compliance_manager:
      'Team member roles and their system access. Ensure the right people have the right permissions.',
    chef:
      'Your kitchen team and their assigned tasks. Contact your manager to update team assignments.',
    facilities_manager:
      'Maintenance staff and vendor contacts assigned to your locations.',
    kitchen_manager:
      'Manage your team\'s roles, task assignments, and system access here.',
    kitchen_staff:
      'Your team and their contact information.',
  },
  auditLogCard: {
    owner_operator:
      'A timestamped record of every action taken in your compliance system \u2014 who did what and when. Immutable and exportable for regulatory review.',
    executive:
      'Audit trail for compliance activity across the portfolio. Demonstrates due diligence during inspections or litigation.',
    compliance_manager:
      'The full activity log for your locations. Regulators may request this during inspections \u2014 ensure it is complete.',
    chef:
      'A log of compliance activity in your kitchen. This is read-only.',
    facilities_manager:
      'Equipment service actions, vendor visits, and maintenance logs \u2014 all timestamped here.',
    kitchen_manager:
      'A record of checklist completions, incident logs, and team actions at your location.',
    kitchen_staff:
      'You don\'t have access to the audit log.',
  },
  alertBanner: {
    owner_operator:
      'Active alerts across all locations. Critical alerts require immediate action and affect your compliance standing.',
    executive:
      'Portfolio-level alerts. Critical items represent inspection or enforcement risk.',
    compliance_manager:
      'Regulatory alerts and upcoming inspection deadlines. Critical items must be addressed before your next inspection window.',
    chef:
      'Alerts for your kitchen. Red alerts need attention now \u2014 check with your manager.',
    facilities_manager:
      'Equipment and permit alerts. Red alerts may indicate a failing system or lapsed certification.',
    kitchen_manager:
      'Alerts for your location. Assign critical items to your team and track resolution here.',
    kitchen_staff:
      'If you see a red alert, tell your manager right away.',
  },
  bottomBarActions: {
    owner_operator:
      'Quick actions for your most common tasks \u2014 scan a QR code, log an incident, or start a checklist.',
    executive:
      'Quick access to your most-used views.',
    compliance_manager:
      'Shortcuts to your most frequent compliance tasks.',
    chef:
      'Your daily quick actions \u2014 start a checklist, log an incident, or scan a QR code.',
    facilities_manager:
      'Quick access to equipment checks and maintenance logging.',
    kitchen_manager:
      'One-tap access to today\'s checklists, QR scan, and incident logging for your team.',
    kitchen_staff:
      'Your daily actions \u2014 tap to start a checklist, scan a station QR code, or report an issue.',
  },
  scheduleCalendar: {
    owner_operator:
      'Upcoming maintenance deadlines, vendor visits, permit renewals, and inspection windows across all locations.',
    executive:
      'Portfolio-level schedule of inspections, permit renewals, and vendor service windows.',
    compliance_manager:
      'Inspection calendar, permit renewal deadlines, and self-inspection schedules by location.',
    chef:
      'Upcoming vendor visits and equipment maintenance scheduled for your kitchen.',
    facilities_manager:
      'Upcoming maintenance deadlines, vendor visits, permit renewals, and inspection windows across all locations.',
    kitchen_manager:
      'Scheduled vendor visits and equipment maintenance that may affect kitchen operations.',
    kitchen_staff:
      'Scheduled events that may affect your shift \u2014 vendor visits and equipment maintenance.',
  },
};

// ── TOOLTIPS-2: Sidebar item tooltips (role-neutral) ────────

export interface SidebarTooltipItem {
  label: string;
  description: string;
}

export const sidebarTooltipContent: Record<string, SidebarTooltipItem> = {
  // Ungrouped
  'dashboard':        { label: 'Dashboard',           description: 'Your compliance overview \u2014 scores, alerts, and daily progress at a glance.' },
  'my-tasks':         { label: 'My Tasks',            description: 'Your assigned checklists, temp logs, and action items for today.' },
  'calendar':         { label: 'Calendar',            description: 'Upcoming inspections, vendor visits, permit renewals, and team schedules.' },

  // Daily Operations
  'checklists':       { label: 'Checklists',          description: 'Daily task lists for food safety, temperature logs, and opening/closing procedures.' },
  'temperatures':     { label: 'Temperatures',        description: 'Manual, QR, or IoT-based temperature recording for receiving, storage, and cooking.' },
  'log-temp':         { label: 'Log Temp',            description: 'Quick-log a temperature reading for your station.' },
  'iot-monitoring':   { label: 'IoT Monitoring',      description: 'Live sensor data from connected temperature probes and equipment monitors.' },
  'fire-safety':      { label: 'Fire Safety',         description: 'NFPA 96 compliance status \u2014 permits, hood cleaning, extinguishers, and suppression systems.' },
  'incidents':        { label: 'Incidents',           description: 'Log and track safety or compliance incidents. Each entry creates a timestamped compliance record.' },

  // Records & Assets
  'documents':        { label: 'Documents',           description: 'Compliance certificates, inspection reports, and permit documentation for all locations.' },
  'equipment':        { label: 'Equipment',           description: 'Asset register for all kitchen equipment with service history and next-due maintenance dates.' },
  'haccp':            { label: 'HACCP',               description: 'Hazard Analysis and Critical Control Points \u2014 food safety plans and monitoring records.' },
  'vendors':          { label: 'Vendors',             description: 'Service providers assigned to your locations \u2014 hood cleaning, grease management, fire suppression, and more.' },
  'photos':           { label: 'Photos',              description: 'Photo evidence for inspections, incidents, and compliance documentation.' },
  'training':         { label: 'Training',            description: 'Staff training courses, certifications, and compliance education tracking.' },

  // Compliance & Insights
  'compliance':       { label: 'Compliance Overview',  description: 'Jurisdiction-verified scoring breakdown for food safety and fire safety across all locations.' },
  'self-inspection':  { label: 'Self-Inspection',     description: 'Run a self-inspection using the same criteria your health department or fire AHJ applies.' },
  'inspector':        { label: 'Inspector View',      description: 'See your location through an inspector\'s eyes \u2014 the same view they use during walkthroughs.' },
  'ai-copilot':       { label: 'AI Copilot',          description: 'AI-powered compliance assistant for answering questions and generating action plans.' },
  'regulatory':       { label: 'Regulatory Updates',  description: 'Track upcoming inspection windows, permit renewals, and regulatory changes by jurisdiction.' },
  'reporting':        { label: 'Reporting',           description: 'Export compliance summaries, inspection history, and documentation packages for audits.' },
  'alerts':           { label: 'Alerts',              description: 'Active compliance alerts and notifications requiring attention across your locations.' },

  // Enterprise
  'locations':        { label: 'Locations',           description: 'Add, edit, or configure locations including jurisdiction mapping and scoring methodology.' },
  'benchmarks':       { label: 'Benchmarks',          description: 'Compare compliance performance across locations, regions, or time periods.' },
  'risk-score':       { label: 'Risk Score',          description: 'Insurance risk assessment based on compliance posture, incident history, and equipment status.' },
  'leaderboard':      { label: 'Leaderboard',         description: 'Location and team rankings by compliance performance and daily task completion.' },
  'marketplace':      { label: 'Marketplace',         description: 'Browse and connect with verified compliance service vendors in your area.' },

  // Admin
  'team':             { label: 'Team',                description: 'Manage staff roles, access levels, and location assignments.' },
  'system-admin':     { label: 'System Admin',        description: 'Platform administration, client onboarding, and system configuration.' },
  'settings':         { label: 'Settings',            description: 'Account preferences, notification settings, and platform configuration.' },
  'help':             { label: 'Help & Support',      description: 'Documentation, tutorials, and contact support for assistance.' },
  'usage-analytics':  { label: 'Usage Analytics',     description: 'Platform usage metrics, adoption rates, and engagement analytics.' },
};
