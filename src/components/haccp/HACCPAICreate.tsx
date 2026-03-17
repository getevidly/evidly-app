/**
 * HACCP-BUILD-01 — AI-Powered HACCP Plan Builder (7-Step FDA Wizard)
 *
 * Three phases:
 *   Phase 1: Kitchen intake (context for AI)
 *   Phase 2: 7-step FDA HACCP principle wizard with per-step AI suggestions
 *   Phase 3: Review + Generate full plan + Save to Documents + PDF export
 *
 * Demo mode: uses hardcoded AI suggestions (no API call).
 * Production: calls ai-chat edge function with per-principle prompts.
 */

import { useState, useRef, useCallback } from 'react';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  Download,
  Save,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Info,
  Wand2,
} from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useSaveDocument } from '../../hooks/useSaveDocument';
import { toast } from 'sonner';
import { parseWizardToCCPs, parseCCPsFromText } from '../../lib/haccpParser';
import { exportHACCPPlanPdf } from '../../lib/haccpPdf';

// ── Types ───────────────────────────────────────────────────────────

interface IntakeData {
  kitchenName: string;
  kitchenType: string;
  menuCategories: string[];
  cookingMethods: string[];
  equipment: string;
  allergens: string[];
  servingPopulation: string;
  dailyCovers: string;
  additionalNotes: string;
}

interface PlanSection {
  title: string;
  content: string;
}

type Phase = 'intake' | 'wizard' | 'generating' | 'review';

// ── Constants ───────────────────────────────────────────────────────

const KITCHEN_TYPES = [
  'Full-Service Restaurant',
  'Quick-Service / Fast Food',
  'Catering / Commissary',
  'Hotel / Resort Kitchen',
  'Hospital / Healthcare',
  'School / University Dining',
  'Grocery / Deli',
  'Food Truck / Mobile',
  'Bakery / Pastry',
  'Bar / Lounge with Food',
];

const MENU_CATEGORIES = [
  'Poultry', 'Beef / Pork', 'Seafood / Shellfish', 'Produce / Salads',
  'Dairy / Eggs', 'Baked Goods', 'Soups / Sauces', 'Fried Foods',
  'Sushi / Raw Fish', 'Desserts',
];

const COOKING_METHODS = [
  'Grilling', 'Frying (deep / shallow)', 'Baking / Roasting', 'Steaming',
  'Sous Vide', 'Smoking', 'Cold Prep (no cook)', 'Reheating / Holding',
];

const ALLERGEN_LIST = [
  'Peanuts', 'Tree Nuts', 'Milk / Dairy', 'Eggs',
  'Wheat / Gluten', 'Soy', 'Fish', 'Shellfish', 'Sesame',
];

const POPULATION_OPTIONS = [
  'General Public',
  'Children (K-12)',
  'Elderly / Senior Living',
  'Immunocompromised (Hospital)',
  'Mixed / Multiple Populations',
];

const DAILY_COVERS_OPTIONS = ['< 50', '50 - 200', '200 - 500', '500+'];

// ── FDA 7 Principles ────────────────────────────────────────────────

interface FDAPrinciple {
  number: number;
  name: string;
  definition: string;
  fields: { key: string; label: string; placeholder: string }[];
}

const FDA_PRINCIPLES: FDAPrinciple[] = [
  {
    number: 1,
    name: 'Hazard Analysis',
    definition: 'Identify biological, chemical, and physical hazards that could cause illness or injury.',
    fields: [
      { key: 'biological', label: 'Biological hazards identified', placeholder: 'e.g., Salmonella in raw poultry, E. coli in ground beef, Listeria in ready-to-eat items...' },
      { key: 'chemical', label: 'Chemical hazards identified', placeholder: 'e.g., Allergen cross-contact, sanitizer residue on food-contact surfaces...' },
      { key: 'physical', label: 'Physical hazards identified', placeholder: 'e.g., Metal fragments from worn equipment, glass from broken light covers...' },
    ],
  },
  {
    number: 2,
    name: 'Critical Control Points',
    definition: 'Identify the points in the process where hazards can be prevented, eliminated, or reduced.',
    fields: [
      { key: 'ccp_1_step', label: 'CCP 1 — Process step', placeholder: 'e.g., Cooking' },
      { key: 'ccp_1_hazard', label: 'CCP 1 — Hazard addressed', placeholder: 'e.g., Survival of pathogens due to insufficient cooking' },
      { key: 'ccp_2_step', label: 'CCP 2 — Process step', placeholder: 'e.g., Hot Holding' },
      { key: 'ccp_2_hazard', label: 'CCP 2 — Hazard addressed', placeholder: 'e.g., Pathogen growth in time/temperature-abused food' },
      { key: 'ccp_3_step', label: 'CCP 3 — Process step', placeholder: 'e.g., Cold Storage' },
      { key: 'ccp_3_hazard', label: 'CCP 3 — Hazard addressed', placeholder: 'e.g., Pathogen growth in improperly stored TCS foods' },
      { key: 'ccp_4_step', label: 'CCP 4 — Process step (optional)', placeholder: 'e.g., Cooling' },
      { key: 'ccp_4_hazard', label: 'CCP 4 — Hazard addressed (optional)', placeholder: 'e.g., Pathogen growth during slow cooling' },
    ],
  },
  {
    number: 3,
    name: 'Critical Limits',
    definition: 'Establish the maximum or minimum value to which a biological, chemical, or physical hazard must be controlled.',
    fields: [
      { key: 'ccp_1_limit', label: 'CCP 1 critical limit', placeholder: 'e.g., Poultry >=165\u00B0F/15s; Ground meat >=155\u00B0F/15s; Seafood >=145\u00B0F/15s' },
      { key: 'ccp_2_limit', label: 'CCP 2 critical limit', placeholder: 'e.g., >=135\u00B0F at all times during holding' },
      { key: 'ccp_3_limit', label: 'CCP 3 critical limit', placeholder: 'e.g., <=41\u00B0F for refrigerated; <=0\u00B0F for frozen' },
      { key: 'ccp_4_limit', label: 'CCP 4 critical limit (if applicable)', placeholder: 'e.g., 135\u00B0F to 70\u00B0F in 2hrs; 70\u00B0F to 41\u00B0F in 4hrs' },
    ],
  },
  {
    number: 4,
    name: 'Monitoring Procedures',
    definition: 'Establish procedures to monitor each CCP to ensure it stays within critical limits.',
    fields: [
      { key: 'what', label: 'What will be monitored', placeholder: 'e.g., Internal temperatures of cooked items, holding unit temps, walk-in cooler temps...' },
      { key: 'how', label: 'How it will be monitored', placeholder: 'e.g., Calibrated digital thermometer inserted into thickest part of food product' },
      { key: 'frequency', label: 'How often', placeholder: 'e.g., Every batch (cooking), every 2 hours (hot holding), every 4 hours (cold storage)' },
      { key: 'who', label: 'Who is responsible', placeholder: 'e.g., Line cook for cooking temps, shift lead for holding checks, manager for daily review' },
    ],
  },
  {
    number: 5,
    name: 'Corrective Actions',
    definition: 'Establish corrective actions to take when a critical limit is not met.',
    fields: [
      { key: 'ccp_1_action', label: 'CCP 1 corrective action', placeholder: 'e.g., Continue cooking until critical limit is met; discard if quality compromised' },
      { key: 'ccp_2_action', label: 'CCP 2 corrective action', placeholder: 'e.g., Reheat to 165\u00B0F within 2 hours if below 135\u00B0F; discard if held below 135\u00B0F >4 hours' },
      { key: 'ccp_3_action', label: 'CCP 3 corrective action', placeholder: 'e.g., Move product to functioning unit; discard if above 41\u00B0F for unknown duration' },
      { key: 'ccp_4_action', label: 'CCP 4 corrective action (if applicable)', placeholder: 'e.g., If not 70\u00B0F by 2hrs: reheat to 165\u00B0F and restart cooling' },
    ],
  },
  {
    number: 6,
    name: 'Verification Procedures',
    definition: 'Establish procedures to verify that the HACCP system is working correctly.',
    fields: [
      { key: 'activities', label: 'Verification activities', placeholder: 'e.g., Manager reviews all temp logs before end of shift, weekly HACCP record audit, monthly calibration verification...' },
      { key: 'frequency', label: 'Frequency', placeholder: 'e.g., Daily log review, weekly walk-through, monthly internal audit, annual full review' },
      { key: 'who', label: 'Who verifies', placeholder: 'e.g., Kitchen manager (daily), HACCP coordinator (weekly), owner/operator (monthly)' },
    ],
  },
  {
    number: 7,
    name: 'Record-Keeping',
    definition: 'Establish procedures for record-keeping and documentation of the HACCP system.',
    fields: [
      { key: 'records', label: 'Records that will be kept', placeholder: 'e.g., Cooking temp logs, hot/cold holding logs, cooling logs, corrective action reports, calibration records...' },
      { key: 'storage', label: 'Where records are stored', placeholder: 'e.g., EvidLY platform (digital), backup binder at each station' },
      { key: 'retention', label: 'How long records are retained', placeholder: 'e.g., Minimum 1 year; retained digitally in EvidLY indefinitely' },
    ],
  },
];

// ── Demo AI suggestions per principle ────────────────────────────────

const DEMO_SUGGESTIONS: Record<number, Record<string, string>> = {
  1: {
    biological: 'Salmonella spp. in raw poultry \u2014 control: cooking to \u2265165\u00B0F for 15 seconds\nE. coli O157:H7 in ground beef \u2014 control: cooking to \u2265155\u00B0F for 15 seconds\nVibrio spp. in raw shellfish \u2014 control: cooking to \u2265145\u00B0F; proper cold storage\nListeria monocytogenes in ready-to-eat items \u2014 control: cold holding \u226441\u00B0F, date marking\nNorovirus from infected staff \u2014 control: handwashing, exclusion policy',
    chemical: 'Allergen cross-contact (peanuts, shellfish, gluten) \u2014 control: dedicated prep areas, labeling\nSanitizer residue on food-contact surfaces \u2014 control: test strips, proper dilution',
    physical: 'Metal fragments from worn equipment \u2014 control: equipment inspection, can opener maintenance\nGlass from broken light covers \u2014 control: shatter-resistant bulbs in prep areas',
  },
  2: {
    ccp_1_step: 'Cooking', ccp_1_hazard: 'Survival of pathogens due to insufficient cooking',
    ccp_2_step: 'Hot Holding', ccp_2_hazard: 'Pathogen growth in time/temperature-abused cooked food',
    ccp_3_step: 'Cold Storage', ccp_3_hazard: 'Pathogen growth in improperly stored TCS foods',
    ccp_4_step: 'Cooling', ccp_4_hazard: 'Pathogen growth during slow cooling of cooked foods',
  },
  3: {
    ccp_1_limit: 'Poultry \u2265165\u00B0F/15s; Ground meats \u2265155\u00B0F/15s; Seafood/whole cuts \u2265145\u00B0F/15s',
    ccp_2_limit: '\u2265135\u00B0F at all times during holding',
    ccp_3_limit: '\u226441\u00B0F for refrigerated storage; \u22640\u00B0F for frozen storage',
    ccp_4_limit: '135\u00B0F to 70\u00B0F within 2 hours; 70\u00B0F to 41\u00B0F within next 4 hours (total 6 hours)',
  },
  4: {
    what: 'Internal cooking temps for each batch, hot holding temps every 2 hours, cold storage temps every 4 hours, cooling items at 2-hour and 6-hour marks',
    how: 'Calibrated digital thermometer inserted into thickest part of food product; walk-in/reach-in external thermometer reading',
    frequency: 'Every batch (cooking), every 2 hours (hot holding), every 4 hours (cold storage), at cooling milestones',
    who: 'Line cook for cooking temps, shift lead for holding/storage checks, kitchen manager for daily review',
  },
  5: {
    ccp_1_action: 'Continue cooking until critical limit is met; discard if quality is compromised',
    ccp_2_action: 'Reheat to 165\u00B0F within 2 hours if below 135\u00B0F; discard if held below 135\u00B0F for >4 hours',
    ccp_3_action: 'Move product to functioning unit; evaluate for safety if above 41\u00B0F for unknown duration; discard TCS food if >4 hours above 41\u00B0F',
    ccp_4_action: 'If not 70\u00B0F by 2 hours: reheat to 165\u00B0F and restart cooling with smaller portions or ice bath; discard if not 41\u00B0F by 6 hours total',
  },
  6: {
    activities: 'Manager reviews all temperature logs before end of shift\nWeekly HACCP record audit by HACCP coordinator\nMonthly internal audit of HACCP records for completeness and accuracy\nAnnual full HACCP plan review and update\nThermometer calibration check (ice point 32\u00B0F \u00B12\u00B0F) daily',
    frequency: 'Daily log review, weekly walk-through observation, monthly internal audit, annual third-party review',
    who: 'Kitchen manager (daily), HACCP coordinator (weekly), owner/operator (monthly), third-party auditor (annual)',
  },
  7: {
    records: 'Cooking temperature logs (daily)\nHot holding temperature logs (daily)\nCold storage temperature logs (daily)\nCooling logs (as needed)\nCorrective action reports (as needed)\nThermometer calibration records (daily/monthly)\nEmployee training records (ongoing)\nSupplier verification documents (as received)\nHACCP plan review records (annual)',
    storage: 'EvidLY platform (primary digital storage), backup binder at each station for inspector access',
    retention: 'Minimum 1 year; retained digitally in EvidLY indefinitely; paper backups retained 1 year',
  },
};

// ── Demo generated plan ──────────────────────────────────────────────

const DEMO_PLAN_SECTIONS: PlanSection[] = [
  { title: '1. Product Description', content: 'This HACCP plan covers the preparation and service of cooked protein items (poultry, beef, seafood), cold salads, and reheated/held items in a full-service restaurant kitchen. Products are prepared on-site from raw ingredients, cooked to required internal temperatures, and served hot or held for service. Cold items (salads, sushi) are prepared from pre-washed produce and maintained at or below 41\u00B0F.' },
  { title: '2. Hazard Analysis', content: 'Biological Hazards:\n\u2022 Salmonella spp. in raw poultry \u2014 control: cooking to \u2265165\u00B0F for 15 seconds\n\u2022 E. coli O157:H7 in ground beef \u2014 control: cooking to \u2265155\u00B0F for 15 seconds\n\u2022 Vibrio spp. in raw shellfish \u2014 control: cooking to \u2265145\u00B0F; proper cold storage\n\u2022 Listeria monocytogenes in ready-to-eat items \u2014 control: cold holding \u226441\u00B0F, date marking\n\u2022 Norovirus from infected staff \u2014 control: handwashing, exclusion policy\n\nChemical Hazards:\n\u2022 Allergen cross-contact \u2014 control: dedicated prep areas, labeling\n\u2022 Sanitizer residue \u2014 control: test strips, proper dilution\n\nPhysical Hazards:\n\u2022 Metal fragments \u2014 control: equipment inspection\n\u2022 Glass \u2014 control: shatter-resistant bulbs' },
  { title: '3. Critical Control Points (CCPs)', content: 'CCP-1: COOKING\n\u2022 Critical Limit: Poultry \u2265165\u00B0F/15s; Ground meats \u2265155\u00B0F/15s; Seafood \u2265145\u00B0F/15s\n\u2022 Monitoring: Check internal temp with calibrated thermometer for each batch\n\u2022 Corrective Action: Continue cooking until limit met; discard if quality compromised\n\nCCP-2: HOT HOLDING\n\u2022 Critical Limit: \u2265135\u00B0F at all times\n\u2022 Monitoring: Check every 2 hours\n\u2022 Corrective Action: Reheat to 165\u00B0F if below 135\u00B0F; discard if >4 hours\n\nCCP-3: COLD STORAGE\n\u2022 Critical Limit: \u226441\u00B0F refrigerated; \u22640\u00B0F frozen\n\u2022 Monitoring: Check every 4 hours\n\u2022 Corrective Action: Move product; evaluate safety\n\nCCP-4: COOLING\n\u2022 Critical Limit: 135\u00B0F\u219270\u00B0F in 2hrs; 70\u00B0F\u219241\u00B0F in 4hrs\n\u2022 Monitoring: Record at 2-hour and 6-hour marks\n\u2022 Corrective Action: Reheat to 165\u00B0F and restart' },
  { title: '4. Monitoring Procedures', content: 'Daily Schedule:\n\u2022 Opening: Verify cold storage temps\n\u2022 Every 2 hours: Check hot holding temps\n\u2022 Every 4 hours: Check cold storage temps\n\u2022 Each batch: Measure internal cooking temp\n\u2022 End of shift: Record cooling items\n\nEquipment Calibration:\n\u2022 Thermometers: Ice-point calibration daily (32\u00B0F \u00B12\u00B0F)\n\u2022 Sanitizer test strips: Verify concentration each use' },
  { title: '5. Corrective Action Procedures', content: 'When a critical limit is not met:\n1. Immediately isolate the affected product\n2. Determine if product can be safely corrected\n3. If not correctable, discard and document\n4. Identify and correct root cause\n5. Document in HACCP corrective action log\n6. Notify manager on duty within 30 minutes\n7. Review with affected staff within 24 hours\n\nResponsible: Shift lead initiates; kitchen manager verifies; owner reviews weekly.' },
  { title: '6. Verification Activities', content: 'Daily: Manager reviews temp logs before end of shift; thermometer calibration check\nWeekly: HACCP coordinator reviews corrective action log; walk-through observation\nMonthly: Internal audit of HACCP records; equipment calibration verification\nAnnually: Full HACCP plan review; third-party audit comparison' },
  { title: '7. Record-Keeping', content: 'Records maintained for minimum 1 year:\n\u2022 Cooking temperature logs (daily)\n\u2022 Hot/cold holding temperature logs (daily)\n\u2022 Cooling logs (as needed)\n\u2022 Corrective action reports (as needed)\n\u2022 Thermometer calibration records (daily/monthly)\n\u2022 Employee training records (ongoing)\n\u2022 Supplier verification documents (as received)\n\u2022 HACCP plan review records (annual)\n\nAll records stored in EvidLY and available for inspector review on demand.' },
  { title: '8. Allergen Control Program', content: 'Controls:\n\u2022 Dedicated cutting boards and utensils for allergen-free prep (color-coded)\n\u2022 Allergen ingredient matrix posted at each prep station\n\u2022 Staff trained on allergen awareness during onboarding and annually\n\u2022 Server communication protocol for allergen questions\n\u2022 Deep-clean between allergen/non-allergen prep on shared equipment\n\u2022 Supplier spec sheets reviewed for hidden allergens' },
];

// ── Pill button helper ──────────────────────────────────────────────

function PillButton({ label, selected, onClick, colorScheme = 'gold' }: {
  label: string; selected: boolean; onClick: () => void; colorScheme?: 'gold' | 'red';
}) {
  const styles = colorScheme === 'red'
    ? { border: selected ? '#991B1B' : '#D1D9E6', bg: selected ? 'rgba(153,27,27,0.08)' : '#fff', text: selected ? '#991B1B' : '#3D5068' }
    : { border: selected ? '#A08C5A' : '#D1D9E6', bg: selected ? 'rgba(160,140,90,0.12)' : '#fff', text: selected ? '#7A6C3A' : '#3D5068' };

  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full border text-sm font-medium transition-colors"
      style={{ borderColor: styles.border, backgroundColor: styles.bg, color: styles.text }}
    >
      {selected ? '\u2713 ' : ''}{label}
    </button>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────

function WizardProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full flex-1 transition-colors"
          style={{
            backgroundColor: i < currentStep ? '#A08C5A' : i === currentStep ? '#1e4d6b' : '#E5E7EB',
          }}
        />
      ))}
    </div>
  );
}

// ── Role check for create permission ────────────────────────────────

const CREATE_ROLES = ['owner_operator', 'compliance_manager', 'chef', 'kitchen_manager', 'platform_admin'];

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function HACCPAICreate() {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const { userRole } = useRole();

  // Phase management
  const [phase, setPhase] = useState<Phase>('intake');

  // Intake form
  const [intake, setIntake] = useState<IntakeData>({
    kitchenName: '',
    kitchenType: '',
    menuCategories: [],
    cookingMethods: [],
    equipment: '',
    allergens: [],
    servingPopulation: '',
    dailyCovers: '',
    additionalNotes: '',
  });

  // Wizard state (Phase 2)
  const [wizardStep, setWizardStep] = useState(0); // 0-indexed (0 = Principle 1)
  const [principleData, setPrincipleData] = useState<Record<number, Record<string, string>>>({});
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Generation
  const [streamText, setStreamText] = useState('');
  const [generating, setGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Plan review
  const [planSections, setPlanSections] = useState<PlanSection[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Role guard ─────────────────────────────────────────────────
  if (!CREATE_ROLES.includes(userRole)) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
        <p className="text-sm text-gray-500">You do not have permission to create HACCP plans.</p>
      </div>
    );
  }

  // ── Toggle helpers ─────────────────────────────────────────────

  const toggleMulti = useCallback((field: 'menuCategories' | 'cookingMethods' | 'allergens', value: string) => {
    setIntake(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }, []);

  const toggleSection = useCallback((idx: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  // ── Validation ─────────────────────────────────────────────────

  const canProceedToWizard = intake.kitchenType && intake.menuCategories.length > 0 && intake.cookingMethods.length > 0;

  // ── Wizard field update ────────────────────────────────────────

  const updatePrincipleField = useCallback((principle: number, key: string, value: string) => {
    setPrincipleData(prev => ({
      ...prev,
      [principle]: { ...(prev[principle] || {}), [key]: value },
    }));
  }, []);

  // ── AI Suggestion per principle ────────────────────────────────

  const handleApplySuggestion = useCallback(async (principleNumber: number) => {
    setLoadingSuggestion(true);

    if (isDemoMode) {
      // Demo: use hardcoded suggestions
      await new Promise(r => setTimeout(r, 600));
      const suggestion = DEMO_SUGGESTIONS[principleNumber];
      if (suggestion) {
        setPrincipleData(prev => ({
          ...prev,
          [principleNumber]: { ...(prev[principleNumber] || {}), ...suggestion },
        }));
      }
      setLoadingSuggestion(false);
      toast.success('AI suggestion applied');
      return;
    }

    // Production: call AI for this specific principle
    try {
      const prompt = buildPrinciplePrompt(principleNumber, intake);
      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'You are a HACCP plan expert. Return ONLY the requested data as key:value pairs, one per line. No markdown, no headers, no explanations.',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const result = await response.json();
      const text = result.text || '';
      // Parse response into field values
      const principle = FDA_PRINCIPLES[principleNumber - 1];
      const parsed: Record<string, string> = {};
      for (const field of principle.fields) {
        // Try to find relevant content in the AI response
        parsed[field.key] = text;
      }
      setPrincipleData(prev => ({
        ...prev,
        [principleNumber]: { ...(prev[principleNumber] || {}), ...parsed },
      }));
      toast.success('AI suggestion applied');
    } catch {
      toast.error('AI suggestion failed. Try again or fill in manually.');
    } finally {
      setLoadingSuggestion(false);
    }
  }, [isDemoMode, intake]);

  // ── Generate full plan ─────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setPhase('generating');
    setGenerating(true);
    setStreamText('');
    setPlanSections([]);

    if (isDemoMode) {
      let accumulated = '';
      for (const section of DEMO_PLAN_SECTIONS) {
        const sectionText = `## ${section.title}\n\n${section.content}\n\n`;
        for (let i = 0; i < sectionText.length; i += 8) {
          accumulated += sectionText.slice(i, i + 8);
          setStreamText(accumulated);
          await new Promise(r => setTimeout(r, 12));
        }
      }
      setPlanSections(DEMO_PLAN_SECTIONS);
      setGenerating(false);
      setPhase('review');
      return;
    }

    // Production: call AI
    const systemPrompt = buildFinalPlanPrompt(intake, principleData);
    try {
      abortRef.current = new AbortController();
      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: 'user', content: buildFinalUserMessage(intake, principleData) }],
          stream: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const text = parsed.delta?.text || parsed.text || '';
              if (text) { accumulated += text; setStreamText(accumulated); }
            } catch {
              if (data.trim()) { accumulated += data; setStreamText(accumulated); }
            }
          }
        }
      }

      const sections = parseGeneratedPlan(accumulated);
      setPlanSections(sections);
      setPhase('review');
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast.error('Failed to generate HACCP plan. Please try again.');
      setPhase('wizard');
    } finally {
      setGenerating(false);
    }
  }, [isDemoMode, intake, principleData]);

  // ── Save Plan ──────────────────────────────────────────────────

  const { saveDocument } = useSaveDocument();

  const handleSave = useCallback(async () => {
    if (isDemoMode) {
      toast.success('Your HACCP plan is complete. It\u2019s filed in your Documents and ready for any inspector who asks.');
      setSaved(true);
      return;
    }

    setSaving(true);
    try {
      const planContent = planSections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n');

      const success = await saveDocument({
        organization_id: profile?.organization_id || '',
        title: `HACCP Plan \u2014 ${intake.kitchenName || intake.kitchenType}`,
        category: 'HACCP',
        status: 'active',
        tags: ['haccp', 'ai-generated', intake.kitchenType.toLowerCase().replace(/[^a-z0-9]+/g, '-')],
        file_type: 'text/markdown',
        notes: planContent,
      });

      if (!success) throw new Error('Save failed');
      toast.success('Your HACCP plan is complete. It\u2019s filed in your Documents and ready for any inspector who asks.');
      setSaved(true);
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [isDemoMode, planSections, profile, intake]);

  // ── PDF Export ─────────────────────────────────────────────────

  const handleExportPDF = useCallback(() => {
    const ccps = parseWizardToCCPs(principleData);
    const fallbackCcps = ccps.length > 0 ? ccps : parseCCPsFromText(planSections.map(s => s.content).join('\n'));

    exportHACCPPlanPdf(
      {
        name: intake.kitchenName || intake.kitchenType || 'HACCP Plan',
        generated_plan: planSections.map(s => `${s.title}\n\n${s.content}`).join('\n\n'),
        intake_data: intake,
        created_at: new Date().toISOString(),
      },
      fallbackCcps,
      planSections,
    );
    toast.success('HACCP plan exported. That\u2019s your proof \u2014 keep it ready.');
  }, [planSections, intake, principleData]);

  // ═════════════════════════════════════════════════════════════════
  // RENDER: Phase 1 — Kitchen Intake
  // ═════════════════════════════════════════════════════════════════

  if (phase === 'intake') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(160,140,90,0.15)' }}>
              <Sparkles className="h-5 w-5" style={{ color: '#A08C5A' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Build your HACCP plan</h2>
              <p className="text-sm text-gray-500">The foundation every safe kitchen is built on.</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            EvidLY walks you through all 7 FDA principles. Your answers, your kitchen, your plan.
          </p>
          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              AI-generated plans are a <strong>starting point only</strong>. The output must be reviewed and validated by a qualified food safety professional.
            </p>
          </div>
        </div>

        {/* Kitchen Name */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-2">Kitchen / Location Name</label>
          <input
            type="text"
            value={intake.kitchenName}
            onChange={e => setIntake(prev => ({ ...prev, kitchenName: e.target.value }))}
            placeholder="e.g., Downtown Kitchen, Main Commissary..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
          />
        </div>

        {/* Kitchen Type */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-2">Kitchen Type *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {KITCHEN_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setIntake(prev => ({ ...prev, kitchenType: type }))}
                className="px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left"
                style={{
                  borderColor: intake.kitchenType === type ? '#A08C5A' : '#D1D9E6',
                  backgroundColor: intake.kitchenType === type ? 'rgba(160,140,90,0.1)' : '#fff',
                  color: intake.kitchenType === type ? '#7A6C3A' : '#3D5068',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Categories */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Menu Categories *</label>
          <p className="text-xs text-gray-500 mb-2">Select all food types your kitchen handles</p>
          <div className="flex flex-wrap gap-2">
            {MENU_CATEGORIES.map(cat => (
              <PillButton key={cat} label={cat} selected={intake.menuCategories.includes(cat)} onClick={() => toggleMulti('menuCategories', cat)} />
            ))}
          </div>
        </div>

        {/* Cooking Methods */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Cooking Methods *</label>
          <p className="text-xs text-gray-500 mb-2">Select all methods used in your kitchen</p>
          <div className="flex flex-wrap gap-2">
            {COOKING_METHODS.map(method => (
              <PillButton key={method} label={method} selected={intake.cookingMethods.includes(method)} onClick={() => toggleMulti('cookingMethods', method)} />
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Major Equipment</label>
          <textarea
            value={intake.equipment}
            onChange={e => setIntake(prev => ({ ...prev, equipment: e.target.value }))}
            placeholder="e.g., 2 commercial grills, 1 deep fryer, walk-in cooler, walk-in freezer, 3 reach-in refrigerators, steam table..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
          />
        </div>

        {/* Allergens */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Allergens Present</label>
          <div className="flex flex-wrap gap-2">
            {ALLERGEN_LIST.map(a => (
              <PillButton key={a} label={a} selected={intake.allergens.includes(a)} onClick={() => toggleMulti('allergens', a)} colorScheme="red" />
            ))}
          </div>
        </div>

        {/* Serving Population */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-2">Serving Population</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {POPULATION_OPTIONS.map(pop => (
              <button
                key={pop}
                type="button"
                onClick={() => setIntake(prev => ({ ...prev, servingPopulation: pop }))}
                className="px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left"
                style={{
                  borderColor: intake.servingPopulation === pop ? '#A08C5A' : '#D1D9E6',
                  backgroundColor: intake.servingPopulation === pop ? 'rgba(160,140,90,0.1)' : '#fff',
                  color: intake.servingPopulation === pop ? '#7A6C3A' : '#3D5068',
                }}
              >
                {pop}
              </button>
            ))}
          </div>
        </div>

        {/* Daily Covers */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-2">Daily Covers</label>
          <div className="flex flex-wrap gap-2">
            {DAILY_COVERS_OPTIONS.map(opt => (
              <PillButton key={opt} label={opt} selected={intake.dailyCovers === opt} onClick={() => setIntake(prev => ({ ...prev, dailyCovers: opt }))} />
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-1">Additional Notes</label>
          <textarea
            value={intake.additionalNotes}
            onChange={e => setIntake(prev => ({ ...prev, additionalNotes: e.target.value }))}
            placeholder="Any specific concerns, unique processes, or regulatory requirements..."
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
          />
        </div>

        {/* Continue Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setPhase('wizard'); setWizardStep(0); }}
            disabled={!canProceedToWizard}
            className="inline-flex items-center px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: canProceedToWizard ? '#1e4d6b' : '#94A3B8' }}
          >
            Continue to Plan Builder
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // RENDER: Phase 2 — 7-Step FDA Wizard
  // ═════════════════════════════════════════════════════════════════

  if (phase === 'wizard') {
    const principle = FDA_PRINCIPLES[wizardStep];
    const stepData = principleData[principle.number] || {};

    return (
      <div className="space-y-4">
        {/* Progress */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Principle {principle.number} of 7</span>
            <span className="text-xs text-gray-400">{intake.kitchenType}</span>
          </div>
          <WizardProgress currentStep={wizardStep} totalSteps={7} />
        </div>

        {/* Principle Card */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Principle {principle.number}: {principle.name}
              </h2>
              <p className="text-xs text-gray-500 mt-1">{principle.definition}</p>
            </div>
            <span className="text-2xl font-bold shrink-0" style={{ color: '#A08C5A' }}>{principle.number}</span>
          </div>

          {/* AI Suggestion button */}
          <button
            type="button"
            onClick={() => handleApplySuggestion(principle.number)}
            disabled={loadingSuggestion}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed text-sm font-medium transition-colors mb-5"
            style={{
              borderColor: '#A08C5A',
              color: '#A08C5A',
              backgroundColor: 'rgba(160,140,90,0.04)',
            }}
          >
            {loadingSuggestion ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Generating suggestion...</>
            ) : (
              <><Wand2 className="h-4 w-4" />Here&apos;s what strong kitchens do for this step &rarr;</>
            )}
          </button>

          {/* Fields */}
          <div className="space-y-4">
            {principle.fields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <textarea
                  value={stepData[field.key] || ''}
                  onChange={e => updatePrincipleField(principle.number, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={field.key.includes('ccp_') && field.key.includes('_step') ? 1 : 3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => wizardStep === 0 ? setPhase('intake') : setWizardStep(prev => prev - 1)}
            className="inline-flex items-center text-sm font-medium transition-colors"
            style={{ color: '#1e4d6b' }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {wizardStep === 0 ? 'Back to Intake' : `Principle ${wizardStep}`}
          </button>

          {wizardStep < 6 ? (
            <button
              type="button"
              onClick={() => setWizardStep(prev => prev + 1)}
              className="inline-flex items-center px-5 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#1e4d6b' }}
            >
              Next: Principle {wizardStep + 2}
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center px-5 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#A08C5A' }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Full HACCP Plan
            </button>
          )}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // RENDER: Generating Phase
  // ═════════════════════════════════════════════════════════════════

  if (phase === 'generating') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#A08C5A' }} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Generating Your HACCP Plan</h2>
              <p className="text-xs text-gray-500">{intake.kitchenType} \u2014 {intake.menuCategories.length} menu categories, {intake.cookingMethods.length} cooking methods</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[200px] max-h-[500px] overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{streamText}<span className="animate-pulse">|</span></pre>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // RENDER: Phase 3 — Review + Save
  // ═════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Review Required</p>
          <p className="text-xs text-amber-800 mt-0.5">
            This AI-generated HACCP plan is a <strong>starting point</strong>. It must be reviewed and validated by a qualified food safety professional before implementation.
          </p>
        </div>
      </div>

      {/* Plan header */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Your HACCP plan is complete.</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {intake.kitchenName || intake.kitchenType} \u2014 Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            {saved && (
              <p className="text-xs mt-2" style={{ color: '#166534' }}>
                It&apos;s filed in your Documents and ready for any inspector who asks.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ borderColor: '#A08C5A', color: '#A08C5A' }}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saved}
              className="inline-flex items-center px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60"
              style={{ backgroundColor: saved ? '#166534' : '#1e4d6b' }}
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving...</>
              ) : saved ? (
                <><CheckCircle className="h-4 w-4 mr-1.5" />Saved to Documents</>
              ) : (
                <><Save className="h-4 w-4 mr-1.5" />Save to Documents</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Plan sections */}
      {planSections.map((section, idx) => {
        const isExpanded = expandedSections.has(idx);
        return (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(idx)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-900">{section.title}</span>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {isExpanded && (
              <div className="px-5 pb-4 border-t border-gray-100">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed mt-3">{section.content}</pre>
              </div>
            )}
          </div>
        );
      })}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPhase('wizard')}
          className="inline-flex items-center text-sm font-medium transition-colors"
          style={{ color: '#1e4d6b' }}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Wizard
        </button>
        <button
          type="button"
          onClick={() => {
            if (expandedSections.size === planSections.length) setExpandedSections(new Set());
            else setExpandedSections(new Set(planSections.map((_, i) => i)));
          }}
          className="text-xs font-medium transition-colors"
          style={{ color: '#6B7F96' }}
        >
          {expandedSections.size === planSections.length ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
        <Info className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-gray-500">
          Generated by EvidLY AI. This is not a substitute for professional food safety consultation.
        </p>
      </div>
    </div>
  );
}

// ── Prompt Builders ──────────────────────────────────────────────────

function buildPrinciplePrompt(principleNumber: number, intake: IntakeData): string {
  return `You are a food safety expert helping write a HACCP plan.

Kitchen context:
- Name: ${intake.kitchenName || 'N/A'}
- Type: ${intake.kitchenType}
- Menu categories: ${intake.menuCategories.join(', ')}
- Cooking methods: ${intake.cookingMethods.join(', ')}
- Equipment: ${intake.equipment || 'N/A'}
- Allergens: ${intake.allergens.join(', ') || 'None identified'}
- Serving population: ${intake.servingPopulation || 'General public'}

Write the content for HACCP Principle ${principleNumber} (${FDA_PRINCIPLES[principleNumber - 1].name}) for this specific kitchen.
Be specific, practical, and FDA-compliant.
Use plain language that kitchen staff can understand and follow.
Return only the content for this principle.`;
}

function buildFinalPlanPrompt(intake: IntakeData, _principleData: Record<number, Record<string, string>>): string {
  return `You are a certified food safety expert. Write a complete, FDA-compliant HACCP plan.

STRUCTURE YOUR RESPONSE WITH THESE EXACT SECTION HEADERS (use ## markdown headers):
## 1. Product Description
## 2. Hazard Analysis
## 3. Critical Control Points (CCPs)
## 4. Monitoring Procedures
## 5. Corrective Action Procedures
## 6. Verification Activities
## 7. Record-Keeping
## 8. Allergen Control Program

IMPORTANT RULES:
- Use FDA Food Code temperature standards
- Be specific with temperatures, times, and procedures
- Include monitoring frequency
- If the kitchen serves vulnerable populations, apply stricter controls
- Keep language professional but accessible to kitchen managers
- Do not fabricate regulatory citations you are not certain about`;
}

function buildFinalUserMessage(intake: IntakeData, principleData: Record<number, Record<string, string>>): string {
  let msg = `Generate a complete HACCP plan for:\n\n`;
  msg += `Kitchen: ${intake.kitchenName || intake.kitchenType}\n`;
  msg += `Type: ${intake.kitchenType}\n`;
  msg += `Menu: ${intake.menuCategories.join(', ')}\n`;
  msg += `Methods: ${intake.cookingMethods.join(', ')}\n`;
  if (intake.equipment) msg += `Equipment: ${intake.equipment}\n`;
  if (intake.allergens.length > 0) msg += `Allergens: ${intake.allergens.join(', ')}\n`;
  if (intake.servingPopulation) msg += `Population: ${intake.servingPopulation}\n`;
  if (intake.dailyCovers) msg += `Daily volume: ${intake.dailyCovers} covers\n`;

  // Include wizard principle data
  for (let p = 1; p <= 7; p++) {
    const data = principleData[p];
    if (data && Object.values(data).some(v => v?.trim())) {
      msg += `\nPrinciple ${p} (${FDA_PRINCIPLES[p - 1].name}) input:\n`;
      for (const [key, value] of Object.entries(data)) {
        if (value?.trim()) msg += `  ${key}: ${value}\n`;
      }
    }
  }

  return msg;
}

function parseGeneratedPlan(text: string): PlanSection[] {
  const lines = text.split('\n');
  const sections: PlanSection[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)/);
    if (headerMatch) {
      if (currentTitle) sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
      currentTitle = headerMatch[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentTitle) sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
  if (sections.length === 0 && text.trim()) sections.push({ title: 'HACCP Plan', content: text.trim() });

  return sections;
}
