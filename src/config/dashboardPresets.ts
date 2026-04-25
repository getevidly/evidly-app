export type CardSection = 'operations' | 'compliance' | 'strategy';
export type CardNature = 'ops' | 'comp' | 'strat';

export interface CardSpec {
  id: string;
  section: CardSection;
  nature: CardNature;
  label: string;
}

export const ALL_CARDS: CardSpec[] = [
  { id: 'todays_operations',    section: 'operations', nature: 'ops',   label: "Today's Operations" },
  { id: 'team_tasks',           section: 'operations', nature: 'ops',   label: 'Team Tasks' },
  { id: 'attention_items',      section: 'operations', nature: 'comp',  label: 'Attention Items' },
  { id: 'services_due_soon',    section: 'operations', nature: 'ops',   label: 'Services Due Soon' },
  { id: 'portfolio_health',     section: 'compliance', nature: 'comp',  label: 'Portfolio Health' },
  { id: 'location_standing',    section: 'compliance', nature: 'comp',  label: 'Location Standing' },
  { id: 'rescore_alerts',       section: 'compliance', nature: 'comp',  label: 'Re-Score Alerts' },
  { id: 'pse_coverage_risk',    section: 'compliance', nature: 'comp',  label: 'PSE Coverage Risk' },
  { id: 'confidence_banner',    section: 'strategy',   nature: 'strat', label: 'Confidence Banner' },
  { id: 'intelligence_feed',    section: 'strategy',   nature: 'strat', label: 'Intelligence Feed' },
  { id: 'portfolio_risk',       section: 'strategy',   nature: 'strat', label: 'Portfolio Risk' },
  { id: 'annual_vendor_spend',  section: 'strategy',   nature: 'comp',  label: 'Annual Vendor Spend' },
  { id: 'portfolio_expense',    section: 'strategy',   nature: 'strat', label: 'Portfolio Expense' },
  { id: 'share_standing',       section: 'strategy',   nature: 'strat', label: 'Share My Standing' },
  { id: 'k2c',                  section: 'strategy',   nature: 'strat', label: 'Kitchen to Community' },
];

export const ROLE_PRESETS: Record<string, string[]> = {
  owner_operator: ALL_CARDS.map(c => c.id),
  executive: ALL_CARDS.map(c => c.id),
  compliance_officer: [
    'todays_operations', 'attention_items',
    'portfolio_health', 'location_standing', 'rescore_alerts', 'pse_coverage_risk', 'services_due_soon',
    'confidence_banner', 'intelligence_feed', 'portfolio_risk',
  ],
  facilities: [
    'attention_items', 'location_standing',
    'services_due_soon', 'pse_coverage_risk',
  ],
  chef: [
    'todays_operations', 'team_tasks', 'attention_items',
  ],
  kitchen_manager: [
    'todays_operations', 'team_tasks', 'attention_items',
  ],
  kitchen_staff: [
    'todays_operations',
  ],
};

const NATURE_ORDER: Record<CardNature, number> = { ops: 0, comp: 1, strat: 2 };
const SECTION_ORDER: Record<CardSection, number> = { operations: 0, compliance: 1, strategy: 2 };

export function sortCardsForDisplay(cardIds: string[]): CardSpec[] {
  const cardMap = new Map(ALL_CARDS.map(c => [c.id, c]));
  return cardIds
    .map(id => cardMap.get(id))
    .filter((c): c is CardSpec => Boolean(c))
    .sort((a, b) => {
      if (a.section !== b.section) return SECTION_ORDER[a.section] - SECTION_ORDER[b.section];
      return NATURE_ORDER[a.nature] - NATURE_ORDER[b.nature];
    });
}
