import { useRole } from '../../contexts/RoleContext';
import { DASHBOARD_COMPOSITION, type DashboardRole, type SectionKey } from '../../constants/dashboardComposition';
import { MetricCards } from './sections/MetricCards';
import { PrpHeader } from './sections/PrpHeader';
import { YesterdayCaughtLine } from './sections/YesterdayCaughtLine';
import { InspectionPackage } from './sections/InspectionPackage';
import { ComplianceBriefing } from './sections/ComplianceBriefing';
import { AdvisorPair } from './sections/AdvisorPair';
import { AdvisorSingleFire } from './sections/AdvisorSingleFire';
import { AdvisorSingleFood } from './sections/AdvisorSingleFood';
import { AdvisorFlagStrip } from './sections/AdvisorFlagStrip';
import { PortfolioSnapshot } from './sections/PortfolioSnapshot';
import { FacilityServicesBucket } from './sections/FacilityServicesBucket';
import { ChecklistsBlock } from './sections/ChecklistsBlock';
import { ChecklistsBlockReadonly } from './sections/ChecklistsBlockReadonly';
import { DriftsCaught } from './sections/DriftsCaught';
import { DriftsCaughtAudit } from './sections/DriftsCaughtAudit';
import { CountyReadiness } from './sections/CountyReadiness';
import { DecisionsQueue } from './sections/DecisionsQueue';
import { ApprovalQueue } from './sections/ApprovalQueue';
import { OverdueItems } from './sections/OverdueItems';
import { TeamGrid } from './sections/TeamGrid';
import { IntelligenceSlot } from './sections/IntelligenceSlot';
import { TodayList } from './sections/TodayList';
import { RightNow } from './sections/RightNow';
import { TeamHeadsUp } from './sections/TeamHeadsUp';
import { EscalationCard } from './sections/EscalationCard';

const SECTION_COMPONENTS: Record<SectionKey, React.ComponentType> = {
  metric_cards: MetricCards,
  prp_header: PrpHeader,
  yesterday_caught_line: YesterdayCaughtLine,
  inspection_package: InspectionPackage,
  compliance_briefing: ComplianceBriefing,
  advisor_pair: AdvisorPair,
  advisor_single_fire: AdvisorSingleFire,
  advisor_single_food: AdvisorSingleFood,
  advisor_flag_strip: AdvisorFlagStrip,
  portfolio_snapshot: PortfolioSnapshot,
  facility_services_bucket: FacilityServicesBucket,
  checklists_block: ChecklistsBlock,
  checklists_block_readonly: ChecklistsBlockReadonly,
  drifts_caught: DriftsCaught,
  drifts_caught_audit: DriftsCaughtAudit,
  county_readiness: CountyReadiness,
  decisions_queue: DecisionsQueue,
  approval_queue: ApprovalQueue,
  overdue_items: OverdueItems,
  team_grid: TeamGrid,
  intelligence_slot: IntelligenceSlot,
  today_list: TodayList,
  right_now: RightNow,
  team_heads_up: TeamHeadsUp,
  escalation_card: EscalationCard,
};

function renderSection(key: SectionKey) {
  const Component = SECTION_COMPONENTS[key];
  if (!Component) {
    return (
      <div key={key} className="v10-section v10-section-missing">
        <p className="v10-section-label">unknown section</p>
        <p className="v10-section-placeholder">{key}</p>
      </div>
    );
  }
  return <Component key={key} />;
}

export function DashboardComposition() {
  const { userRole } = useRole();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;
  const sections = DASHBOARD_COMPOSITION[role];

  if (!sections) {
    return <div className="v10-dashboard-error">Unknown role: {userRole}</div>;
  }

  return (
    <div className="v10-dashboard">
      {sections.map(renderSection)}
    </div>
  );
}
