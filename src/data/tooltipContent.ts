import type { UserRole } from '../contexts/RoleContext';

export type TooltipSection =
  | 'overallScore'
  | 'fireSafety'
  | 'urgentItems'
  | 'todaysProgress'
  | 'locationCards';

export const tooltipContent: Record<TooltipSection, Record<UserRole, string>> = {
  overallScore: {
    management:
      'Your combined food safety and fire safety score across all locations, weighted by each jurisdiction\'s verified methodology. This is what regulators and auditors see.',
    executive:
      'Aggregate compliance posture across your portfolio. Drill into individual locations to identify where risk is concentrated.',
    compliance_manager:
      'Jurisdiction-weighted score combining food safety violations and fire safety pass/fail status. Reflects your current standing under active enforcement methodology.',
    facilities:
      'Your fire safety systems directly impact this score. All four systems — Permit, Hood, Extinguisher, and Ansul — must pass at every location.',
    kitchen_manager:
      'Your location\'s current compliance score. Completing daily checklists and addressing flagged items moves this number in real time.',
    kitchen:
      'This shows how your location is doing on health and safety. Complete your assigned tasks to keep it green.',
  },
  fireSafety: {
    management:
      'Pass/Fail status per NFPA 96 (2024) for each Authority Having Jurisdiction. One red bar at any location is a compliance failure.',
    executive:
      'Fire safety is binary — Pass or Fail. A single failed system exposes the entire location to permit suspension or closure.',
    compliance_manager:
      'Verified against NFPA 96 (2024) Table 12.4. Each AHJ is mapped to your specific location — no generic defaults.',
    facilities:
      'Your primary dashboard. Permit = operational permit current. Hood = last cleaning within NFPA 96 interval. Ext = extinguisher inspected. Ansul = suppression system serviced.',
    kitchen_manager:
      'All four systems must show green for your location to pass fire inspection. Contact your Facilities Manager if any bar is red.',
    kitchen:
      'Green means your kitchen\'s fire safety systems are current. If you see red, tell your manager immediately.',
  },
  urgentItems: {
    management:
      'High-priority items across all locations requiring immediate action. These carry the greatest regulatory and liability risk.',
    executive:
      'Unresolved critical items by location. Each open item represents potential inspection failure or enforcement action.',
    compliance_manager:
      'Violations and documentation gaps flagged as high-priority under your active jurisdiction\'s enforcement criteria.',
    facilities:
      'Overdue maintenance, expired permits, or failed system checks. These must be resolved before your next inspection window.',
    kitchen_manager:
      'Tasks and checklist items flagged as urgent for your location today. Resolve these before your next service period.',
    kitchen:
      'These are your most important tasks right now. Complete them first before moving on to other assignments.',
  },
  todaysProgress: {
    management:
      'Daily checklist completion rate across all locations. Resets at midnight local time.',
    executive:
      'Operational compliance activity for today. Consistent daily completion correlates with higher inspection scores.',
    compliance_manager:
      'Today\'s checklist submissions versus required tasks. Gaps here create documentation risk during audits.',
    facilities:
      'Equipment checks and maintenance tasks scheduled for today. Incomplete items carry forward as overdue.',
    kitchen_manager:
      'Your team\'s progress on today\'s assigned checklists. Tap any item to complete or flag for follow-up.',
    kitchen:
      'Here\'s what\'s on your list for today. Check off each task as you complete it.',
  },
  locationCards: {
    management:
      'Each card reflects that location\'s active jurisdiction, verified scoring methodology, and current compliance posture.',
    executive:
      'Location-level snapshot. Click any card to see inspection history, score trends, and open items.',
    compliance_manager:
      'Jurisdiction and scoring methodology are verified per location — no assumptions. Click to view enforcement agency details and scoring weights.',
    facilities:
      'Shows fire AHJ, permit status, and equipment compliance per location. Click to manage assets and maintenance schedules.',
    kitchen_manager:
      'Your location\'s current standing. Click to view today\'s checklists, open items, and recent inspection results.',
    kitchen:
      'This is your location. Tap to see your tasks for today.',
  },
};
