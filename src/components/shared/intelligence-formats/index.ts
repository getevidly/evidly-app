// ── Shared Intelligence Format Components ────────────────────────────────
// Barrel re-export from src/components/insights/business-intelligence/
// Both user-side (BusinessIntelligence.tsx) and admin-side (IntelligenceAdmin.tsx)
// import from this single location.

// Format tabs
export { ExecFormat } from '../../insights/business-intelligence/ExecFormat';
export { FormalFormat } from '../../insights/business-intelligence/FormalFormat';
export { PrintFormat } from '../../insights/business-intelligence/PrintFormat';
export { RegisterFormat } from '../../insights/business-intelligence/RegisterFormat';

// Shared sub-components
export { SevBadge } from '../../insights/business-intelligence/SevBadge';
export { RiskCards } from '../../insights/business-intelligence/RiskCards';
export { ReportHeader } from '../../insights/business-intelligence/ReportHeader';
export { ReportFooter } from '../../insights/business-intelligence/ReportFooter';

// Types + constants
export type { BISignal, RiskPlan, FormatTab } from '../../insights/business-intelligence/types';
export { DIMENSIONS, LEVEL_COLORS, SEV_ORDER, getHighestSeverity } from '../../insights/business-intelligence/types';

// Demo data
export { DEMO_SIGNALS } from '../../insights/business-intelligence/demoData';
