export interface HelpDoc {
  id: string;
  title: string;
  steps: string[];
  tips: string;
}

export const helpDocs: Record<string, HelpDoc> = {
  temperature: {
    id: 'temperature',
    title: 'Temperature Logging',
    steps: [
      'Navigate to Temperature Logs from the sidebar',
      'Click "Log Temp" to record a new temperature reading',
      'Select the equipment (Walk-in Cooler, Freezer, etc.)',
      'Enter the temperature reading in °F',
      'Click Save — the reading is logged with timestamp and your name',
      'Out-of-range readings are flagged automatically with corrective action prompts',
    ],
    tips: 'FDA Food Code requires cold holding at 41°F or below. Log temps at least 3 times daily: opening, midday, and closing.',
  },
  checklists: {
    id: 'checklists',
    title: 'Daily Checklists',
    steps: [
      'Navigate to Daily Checklists from the sidebar',
      'Select the current checklist (Opening, Midday, or Closing)',
      'Work through each item — check off as you complete',
      'Add notes or photos for any item that needs documentation',
      'Once all items are checked, the checklist is marked complete',
      'View checklist history to track completion rates over time',
    ],
    tips: 'Completing checklists on time directly improves your compliance score. Missed checklists are flagged in your weekly digest.',
  },
  compliance: {
    id: 'compliance',
    title: 'Compliance Score',
    steps: [
      'Your score is calculated automatically from three pillars',
      'Food Safety (45%): temperature logs, checklists, corrective actions',
      'Fire Safety (35%): hood cleaning, fire suppression, extinguisher records',
      'Vendor Compliance (20%): vendor certifications and service schedules',
      'View the breakdown on the Compliance Score page',
      'Click "Improve Score" for specific recommendations',
    ],
    tips: 'Scores above 90% mean you are inspection-ready. Focus on the lowest-scoring pillar for the biggest improvement.',
  },
  documents: {
    id: 'documents',
    title: 'Documents',
    steps: [
      'Navigate to Documents from the sidebar',
      'Click "Upload Document" to add a new compliance document',
      'Documents are auto-classified by type (license, permit, certificate, etc.)',
      'Track expiration dates — EvidLY alerts you before they expire',
      'Use "Share" to send documents directly to inspectors or insurance companies',
      'Filter documents by category, location, or status',
    ],
    tips: 'Upload documents as soon as you receive them. EvidLY sends alerts at 30, 14, 7, and 1 day before expiration.',
  },
  equipment: {
    id: 'equipment',
    title: 'Equipment Management',
    steps: [
      'Navigate to Equipment from the sidebar',
      'Click "Add Equipment" to register a new piece of equipment',
      'Enter make, model, serial number, and installation date',
      'Set maintenance intervals (monthly, quarterly, annual)',
      'Track warranty information and service history',
      'Connect IoT sensors for automatic temperature monitoring',
    ],
    tips: 'Keep warranty information up to date. EvidLY tracks useful life and suggests replacement timing.',
  },
  incidents: {
    id: 'incidents',
    title: 'Incident Reporting',
    steps: [
      'Navigate to Incident Log from the sidebar or report from any page',
      'Click "Report Incident" and select the type and severity',
      'Provide a description and take a photo of the issue',
      'The incident is auto-assigned to the location manager',
      'Take corrective action and document it with photos',
      'Manager verifies the resolution to close the incident',
    ],
    tips: 'Documenting incidents and corrective actions shows inspectors you take issues seriously. Always include before and after photos.',
  },
  aiAdvisor: {
    id: 'aiAdvisor',
    title: 'AI Compliance Advisor',
    steps: [
      'Navigate to AI Advisor from the sidebar',
      'Ask questions about food code, compliance requirements, or best practices',
      'Upload documents for AI-powered analysis',
      'Get predictive alerts about potential compliance risks',
      'Review weekly AI insights in your digest',
    ],
    tips: 'The AI Advisor is trained on FDA Food Code, state regulations, and industry best practices. Use it to prepare for inspections.',
  },
  vendors: {
    id: 'vendors',
    title: 'Vendor Management',
    steps: [
      'Navigate to Vendor Management from the sidebar',
      'Add vendors who service your kitchen (hood cleaning, pest control, etc.)',
      'Track service schedules and upcoming due dates',
      'Store vendor certificates of insurance (COI)',
      'EvidLY alerts you when vendor documents are expiring',
      'Rate vendor performance to track service quality',
    ],
    tips: 'Keep vendor COIs current. Expired vendor insurance can impact your compliance score and insurance rates.',
  },
  haccp: {
    id: 'haccp',
    title: 'HACCP Plans',
    steps: [
      'Navigate to Food Safety (HACCP) from the sidebar',
      'Review existing HACCP plans for your operation',
      'Monitor Critical Control Points (CCPs) in real-time',
      'Log CCP checks and document any deviations',
      'Use the HACCP template to create new plans',
      'Track corrective actions for any CCP failures',
    ],
    tips: 'HACCP plans are required for certain food processing operations. Even if not required, they demonstrate a systematic approach to food safety.',
  },
  selfAudit: {
    id: 'selfAudit',
    title: 'Self-Inspection',
    steps: [
      'Navigate to Self-Inspection from the sidebar',
      'Select the inspection type (full inspection, focused inspection, etc.)',
      'Work through each section as an inspector would',
      'Take photos of any issues found',
      'Document corrective actions for each finding',
      'Generate a report to track improvement over time',
    ],
    tips: 'Run a self-inspection monthly or before a scheduled inspection. Fix issues found to improve your compliance score before the real inspection.',
  },
  benchmarks: {
    id: 'benchmarks',
    title: 'Industry Benchmarks',
    steps: [
      'Navigate to Benchmarks from the Reports section',
      'View how your scores compare to industry averages',
      'Filter by region, operation type, and time period',
      'Identify areas where you lead and where you can improve',
      'Track your ranking trends over time',
    ],
    tips: 'Benchmarks help you understand where you stand relative to peers. Use insights to prioritize improvement efforts.',
  },
};

export const featureExplanations: Record<string, string> = {
  '/temp-logs': 'Track every cooler, freezer, and hot-holding unit. FDA requires cold foods at 41°F or below. EvidLY flags out-of-range readings instantly and builds a compliance record for inspections.',
  '/checklists': 'Structured daily tasks ensure nothing gets missed. Opening, midday, and closing checklists replace paper logs and create a digital inspection trail.',
  '/scoring-breakdown': 'Your real-time compliance health score across food safety, fire safety, and vendor management. Scores above 90% mean you are inspection-ready.',
  '/documents': 'Store and track all compliance documents — health permits, hood cleaning certificates, fire inspections. EvidLY alerts you before they expire.',
  '/equipment': 'Register every temperature-monitored piece of equipment. Track warranty, service history, and connect IoT sensors for automatic monitoring.',
  '/incidents': 'When something goes wrong — a temperature excursion, a failed inspection item — log it here with corrective actions. Shows inspectors you take issues seriously.',
  '/ai-advisor': 'Your AI compliance advisor. Ask questions about food code, get predictive alerts about expiring documents, and receive weekly compliance insights.',
  '/vendors': 'Track your service providers — hood cleaning, pest control, fire suppression. See when services are due and manage certifications.',
  '/haccp': 'Hazard Analysis Critical Control Points documentation. Required for certain food processing operations. EvidLY provides templates and tracking.',
  '/self-audit': 'Run a mock inspection before the real one. See exactly what an inspector would see and fix issues proactively.',
  '/benchmarks': 'See how your kitchen compares to others in your region and industry. Identify areas where you are leading and where you can improve.',
  '/dashboard': 'Your compliance command center. At a glance, see your overall score, urgent items, and today\'s progress across all locations.',
  '/calendar': 'View upcoming deadlines, scheduled services, document expirations, and checklist schedules in a calendar format.',
  '/marketplace': 'Find and connect with vetted service providers in your area. Compare ratings, pricing, and availability.',
  '/reports': 'Generate compliance reports for inspectors, insurance companies, and internal review. Download or share directly from EvidLY.',
  '/health-dept-report': 'Generate inspection-ready reports formatted for your local health department. Includes all required documentation.',
  '/audit-trail': 'Every action in EvidLY is logged. View who did what, when, for complete accountability and inspection readiness.',
  '/insurance-risk': 'See how your compliance posture affects your insurance risk profile. Better compliance can lead to lower premiums.',
  '/training': 'Access training courses for your team on food safety, compliance procedures, and best practices.',
  '/playbooks': 'Pre-built response procedures for common incidents. When something goes wrong, follow the playbook step by step.',
};
