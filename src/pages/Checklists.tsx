import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, CheckSquare, Clock, Edit2, Trash2, Play, X, Check, ChevronRight, User, AlertTriangle, CheckCircle, Shield, Building2 } from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useTranslation } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';
import { PhotoButton, type PhotoRecord } from '../components/PhotoEvidence';
import { PhotoGallery } from '../components/PhotoGallery';
import { Camera } from 'lucide-react';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { useNotifications } from '../contexts/NotificationContext';
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';
import { ErrorState, PageEmptyState } from '../components/shared/PageStates';
import { getJurisdictionForLocation } from '../data/jurisdictionChecklistData';
import { addPendingAction } from '../lib/offlineDb';
import { usePageTitle } from '../hooks/usePageTitle';
import { colors, shadows, radius, typography } from '../lib/designSystem';

interface ChecklistTemplate {
  id: string;
  name: string;
  checklist_type: string;
  frequency: string;
  is_active: boolean;
  items_count: number;
}

interface ChecklistTemplateItem {
  id: string;
  template_id: string;
  title: string;
  item_type: string;
  order: number;
  is_required: boolean;
  // FS-2: authority & HACCP CCP fields
  authority_source?: string;
  authority_section?: string | null;
  authority_note?: string;
  haccp_ccp?: string | null;
  haccp_hazard?: string;
  haccp_critical_limit?: string;
  temp_min?: number | null;
  temp_max?: number | null;
  is_critical?: boolean;
  requires_corrective_action?: boolean;
  requires_photo_on_fail?: boolean;
}

// ── Authority Labels (matches FacilitySafety.tsx pattern) ────────────
const AUTHORITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  calcode: { label: 'CalCode', color: '#0369a1', bg: '#e0f2fe' },
  nfpa_96: { label: 'NFPA 96', color: '#b91c1c', bg: '#fef2f2' },
  nfpa_10: { label: 'NFPA 10', color: '#b91c1c', bg: '#fef2f2' },
  cfc: { label: 'NFPA 96', color: '#c2410c', bg: '#fff7ed' },
  evidly_best_practice: { label: 'Best Practice', color: '#1E2D4D', bg: '#eef4f8' },
};

interface ChecklistCompletion {
  id: string;
  template_name: string;
  completed_by_name: string;
  score_percentage: number;
  completed_at: string;
}

interface ItemResponse {
  [key: string]: {
    response_value: string;
    is_pass: boolean | null;
    corrective_action: string;
  };
}

const CHECKLIST_TYPES = [
  { value: 'opening', label: 'Opening' },
  { value: 'closing', label: 'Closing' },
  { value: 'shift_change', label: 'Shift Change' },
  { value: 'receiving', label: 'Receiving' },
  { value: 'restroom', label: 'Restroom' },
  { value: 'custom', label: 'Custom' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const ITEM_TYPES = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'yes_no', label: 'Yes/No' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'text_input', label: 'Text Input' },
];

// ── Structured template item: string (legacy) or object (FS-2 CalCode) ──
type TemplateItemDef = string | {
  title: string;
  item_type?: string;
  authority_source?: string;
  authority_section?: string | null;
  authority_note?: string;
  haccp_ccp?: string | null;
  haccp_critical_limit?: string;
  temp_min?: number | null;
  temp_max?: number | null;
  is_critical?: boolean;
  requires_corrective_action?: boolean;
};

const getItemTitle = (item: TemplateItemDef): string =>
  typeof item === 'string' ? item : item.title;

const getItemDef = (item: TemplateItemDef) =>
  typeof item === 'string' ? { title: item } : item;

const TEMPLATE_CATEGORIES = [
  {
    category: 'Daily Operations',
    templates: [
      {
        key: 'opening',
        name: 'Opening Checklist',
        itemCount: 9,
        estimatedTime: '15-20 min',
        role: 'Kitchen Staff',
        items: [
          { title: 'Handwashing station stocked (soap, towels, warm water)', item_type: 'checkbox', authority_source: 'calcode', authority_section: '§113953', authority_note: 'Handwashing facilities shall be provided with soap, single-use towels, and warm water' },
          { title: 'Employee health screening completed (illness, symptoms)', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§113949.2', authority_note: 'Employees with symptoms of illness shall be excluded or restricted' },
          { title: 'Sanitizer concentration verified (test strips, correct ppm)', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§113980', authority_note: 'Chemical sanitizer concentration must meet minimum requirements' },
          { title: 'Prep surface sanitized and clean', item_type: 'checkbox', authority_source: 'calcode', authority_section: '§114097', authority_note: 'Food-contact surfaces shall be clean and sanitized' },
          { title: 'Walk-in cooler temp check (must be ≤41°F)', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113996', authority_note: 'Cold holding at 41°F or below', haccp_ccp: 'CCP-01', haccp_critical_limit: '≤41°F', temp_max: 41, is_critical: true },
          { title: 'Walk-in freezer temp check (must be ≤0°F)', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113996', authority_note: 'Frozen food storage at 0°F or below', haccp_ccp: 'CCP-01', haccp_critical_limit: '≤0°F', temp_max: 0, is_critical: true },
          { title: 'Hot holding equipment pre-heated (must reach ≥135°F)', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113996', authority_note: 'Hot holding at 135°F or above', temp_min: 135 },
          { title: 'Pest evidence check (droppings, gnaw marks, live pests)', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§114259', authority_note: 'Premises shall be maintained free of vermin' },
          { title: 'Food storage order verified (raw below ready-to-eat)', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§114047', authority_note: 'Raw animal foods stored below ready-to-eat foods' },
        ] as TemplateItemDef[],
      },
      {
        key: 'closing',
        name: 'Closing Checklist',
        itemCount: 8,
        estimatedTime: '15-20 min',
        role: 'Kitchen Staff',
        items: [
          { title: 'Final walk-in cooler temp (≤41°F)', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113996', haccp_ccp: 'CCP-01', haccp_critical_limit: '≤41°F', temp_max: 41, is_critical: true },
          { title: 'Final walk-in freezer temp (≤0°F)', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113996', haccp_ccp: 'CCP-01', haccp_critical_limit: '≤0°F', temp_max: 0, is_critical: true },
          { title: 'All cooling items completed to 41°F', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§114002', authority_note: 'Cooling to 41°F within required timeframe', haccp_ccp: 'CCP-03', haccp_critical_limit: '135→70°F in 2hrs, 70→41°F in 4hrs', requires_corrective_action: true },
          { title: 'Food storage order verified', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§114047' },
          { title: 'Prep surfaces sanitized', item_type: 'checkbox', authority_source: 'calcode', authority_section: '§114097' },
          { title: 'Floor drains cleared', item_type: 'checkbox', authority_source: 'evidly_best_practice' },
          { title: 'Exterior doors/windows sealed', item_type: 'checkbox', authority_source: 'evidly_best_practice' },
          { title: 'Equipment powered down or set for overnight', item_type: 'checkbox', authority_source: 'evidly_best_practice' },
        ] as TemplateItemDef[],
      },
      {
        key: 'midday',
        name: 'Mid-Shift Check',
        itemCount: 6,
        estimatedTime: '10-15 min',
        role: 'Kitchen Staff',
        items: [
          { title: 'Hot holding temps ≥135°F (every 2 hours)', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113996', haccp_ccp: 'CCP-02', haccp_critical_limit: '≥135°F', temp_min: 135, is_critical: true },
          { title: 'Cold holding temps ≤41°F (every 2 hours)', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113996', haccp_ccp: 'CCP-02', haccp_critical_limit: '≤41°F', temp_max: 41, is_critical: true },
          { title: 'Cooling items progressing (135→70 in 2hrs, 70→41 in 4hrs)', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§114002', haccp_ccp: 'CCP-03', haccp_critical_limit: '135→70°F in 2hrs, 70→41°F in 4hrs' },
          { title: 'Handwashing observed', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§113953' },
          { title: 'Glove changes observed', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§113961', authority_note: 'Gloves shall be changed between handling raw and ready-to-eat foods' },
          { title: 'Cross-contamination prevention (separate boards, utensils)', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§113986', authority_note: 'Food shall be protected from cross-contamination' },
        ] as TemplateItemDef[],
      },
      {
        key: 'receiving',
        name: 'Receiving Checklist',
        itemCount: 8,
        estimatedTime: '10-15 min',
        role: 'Manager',
        items: [
          { title: 'Delivery vehicle clean and at temp', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§113980' },
          { title: 'Poultry received ≤41°F', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113980', haccp_ccp: 'CCP-04', haccp_critical_limit: '≤41°F', temp_max: 41, is_critical: true },
          { title: 'Ground beef received ≤41°F', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113980', haccp_ccp: 'CCP-04', haccp_critical_limit: '≤41°F', temp_max: 41, is_critical: true },
          { title: 'Seafood received ≤41°F', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113980', haccp_ccp: 'CCP-04', haccp_critical_limit: '≤41°F', temp_max: 41, is_critical: true },
          { title: 'Frozen items received ≤0°F', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113980', haccp_ccp: 'CCP-04', haccp_critical_limit: '≤0°F', temp_max: 0, is_critical: true },
          { title: 'Dairy received ≤41°F', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113980', haccp_ccp: 'CCP-04', haccp_critical_limit: '≤41°F', temp_max: 41, is_critical: true },
          { title: 'Reject and document any out-of-range items', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§113980', requires_corrective_action: true },
          { title: 'Date-mark all TCS items', item_type: 'checkbox', authority_source: 'calcode', authority_section: '§114059', authority_note: 'Time/temperature control for safety foods must be date-marked' },
        ] as TemplateItemDef[],
      },
    ],
  },
  {
    category: 'HACCP Checklists',
    templates: [
      {
        key: 'cooking_temp',
        name: 'Cooking Temperature Log',
        itemCount: 6,
        estimatedTime: '10 min',
        role: 'Kitchen Staff',
        items: [
          { title: 'Verify internal temp of each protein type', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113996', haccp_ccp: 'CCP-05', haccp_critical_limit: 'Poultry ≥165°F, Ground ≥155°F, Whole cuts ≥145°F', is_critical: true, requires_corrective_action: true },
          { title: 'Check cooking equipment calibration', item_type: 'checkbox', authority_source: 'evidly_best_practice' },
          { title: 'Document any corrective actions', item_type: 'text_input', authority_source: 'calcode', authority_section: '§113996', requires_corrective_action: true },
          { title: 'Verify thermometer accuracy', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§114157' },
          { title: 'Record cook time', item_type: 'text_input', authority_source: 'evidly_best_practice' },
          { title: 'Supervisor verification', item_type: 'checkbox', authority_source: 'evidly_best_practice' },
        ] as TemplateItemDef[],
      },
      {
        key: 'cooling_log',
        name: 'Cooling Log',
        itemCount: 8,
        estimatedTime: '5 min per check',
        role: 'Kitchen Staff',
        items: [
          { title: 'Record start temp and time — clock starts NOW (CA: from cooked temp, not 135°F)', item_type: 'temperature', authority_source: 'calcode', authority_section: '§114002', haccp_ccp: 'CCP-03', haccp_critical_limit: '135→70°F in 2hrs, 70→41°F in 4hrs', is_critical: true },
          { title: 'FDA Stage 1: 135°F → 70°F within 2 hours', item_type: 'temperature', authority_source: 'calcode', authority_section: '§114002', haccp_ccp: 'CCP-03', haccp_critical_limit: '≤70°F at 2hr mark', temp_max: 70, is_critical: true, requires_corrective_action: true },
          { title: 'CA Stage 1 (eff. Apr 1, 2026): Cooked temp → 70°F within 2 hours (stricter — clock starts at actual cooked temp)', item_type: 'temperature', authority_source: 'calcode', authority_section: '§114002', haccp_ccp: 'CCP-03', haccp_critical_limit: '≤70°F at 2hr mark (from cooked temp)', temp_max: 70, is_critical: true, requires_corrective_action: true },
          { title: 'Check temp at 2-hour mark (must be at or below 70°F)', item_type: 'temperature', authority_source: 'calcode', authority_section: '§114002', haccp_ccp: 'CCP-03', haccp_critical_limit: '≤70°F', temp_max: 70, is_critical: true },
          { title: 'Stage 2: 70°F → 41°F within 4 additional hours (6 hours total)', item_type: 'temperature', authority_source: 'calcode', authority_section: '§114002', haccp_ccp: 'CCP-03', haccp_critical_limit: '≤41°F at 6hr mark', temp_max: 41, is_critical: true, requires_corrective_action: true },
          { title: 'Check temp at 6-hour mark (must be at or below 41°F)', item_type: 'temperature', authority_source: 'calcode', authority_section: '§114002', haccp_ccp: 'CCP-03', haccp_critical_limit: '≤41°F', temp_max: 41, is_critical: true },
          { title: 'Document cooling method used (ice bath, blast chiller, shallow pans)', item_type: 'text_input', authority_source: 'evidly_best_practice' },
          { title: 'Corrective action if temps not met — discard food or re-heat to 165°F and re-cool', item_type: 'text_input', authority_source: 'calcode', authority_section: '§114002', requires_corrective_action: true },
        ] as TemplateItemDef[],
      },
      {
        key: 'hot_holding',
        name: 'Hot Holding Monitoring',
        itemCount: 4,
        estimatedTime: '5 min',
        role: 'Kitchen Staff',
        items: [
          { title: 'Verify all items above 135°F', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113996', haccp_ccp: 'CCP-02', haccp_critical_limit: '≥135°F', temp_min: 135, is_critical: true, requires_corrective_action: true },
          { title: 'Check food covers in place', item_type: 'checkbox', authority_source: 'evidly_best_practice' },
          { title: 'Verify holding time labels', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§114000' },
          { title: 'Document any items discarded', item_type: 'text_input', authority_source: 'evidly_best_practice', requires_corrective_action: true },
        ] as TemplateItemDef[],
      },
      {
        key: 'cold_holding',
        name: 'Cold Holding Monitoring',
        itemCount: 4,
        estimatedTime: '5 min',
        role: 'Facilities',
        items: [
          { title: 'Verify all items below 41°F', item_type: 'temperature', authority_source: 'calcode', authority_section: '§113996', haccp_ccp: 'CCP-01', haccp_critical_limit: '≤41°F', temp_max: 41, is_critical: true, requires_corrective_action: true },
          { title: 'Check cooler door seals', item_type: 'checkbox', authority_source: 'evidly_best_practice' },
          { title: 'Verify date labels current', item_type: 'yes_no', authority_source: 'calcode', authority_section: '§114059' },
          { title: 'Document any items discarded', item_type: 'text_input', authority_source: 'evidly_best_practice', requires_corrective_action: true },
        ] as TemplateItemDef[],
      },
    ],
  },
  {
    category: 'Equipment Maintenance',
    templates: [
      {
        key: 'ice_machine_weekly',
        name: 'Ice Machine Weekly Cleaning',
        itemCount: 5,
        estimatedTime: '20-30 min',
        role: 'Kitchen Staff',
        items: [
          'Empty ice bin completely — discard all ice',
          'Wash bin interior with warm water and food-safe sanitizer',
          'Wipe door gaskets and exterior surfaces',
          'Inspect water filter indicator — replace if due',
          'Refill bin — verify first batch ice quality after restart',
        ],
      },
      {
        key: 'ice_machine_monthly',
        name: 'Ice Machine Monthly Service (FDA §4-602.11)',
        itemCount: 7,
        estimatedTime: '45-60 min',
        role: 'Manager',
        items: [
          'Run manufacturer-recommended cleaning cycle with approved ice machine cleaner',
          'Run sanitizer cycle after cleaning cycle completes',
          'Inspect condenser coils — clean if dusty or dirty',
          'Check water inlet valve and lines for leaks or mineral buildup',
          'Inspect drain line — clear any blockages',
          'Verify ice quality after cleaning (clear, odorless, proper size)',
          'Document cleaning in equipment maintenance log — FDA §4-602.11(D)',
        ],
      },
      {
        key: 'exhaust_fan_monthly',
        name: 'Exhaust Fan Monthly Inspection (NFPA 96)',
        itemCount: 5,
        estimatedTime: '15-20 min',
        role: 'Facilities',
        items: [
          'Inspect fan belt tension and condition — replace if cracked or glazed',
          'Check grease containment and drain — clear any blockages',
          'Test hinge kit operation — fan opens fully for cleaning access (NFPA 96 Chapter 7)',
          'Verify fan interlock — fan starts with hood, stops when hood is off (IMC §507.2.1)',
          'Check for excessive vibration — indicates imbalance or bearing wear',
        ],
      },
      {
        key: 'exhaust_fan_quarterly',
        name: 'Exhaust Fan Quarterly Service (NFPA 96 Table 12.4)',
        itemCount: 6,
        estimatedTime: '30-45 min',
        role: 'Manager',
        items: [
          'Clean fan blades and housing — remove all grease buildup',
          'Lubricate bearings per manufacturer specifications',
          'Check motor amperage — compare to nameplate rating',
          'Inspect roof curb seal and flashing — no leaks',
          'Verify wiring and disconnect — accessible, properly rated',
          'Document service in equipment maintenance log — link to hood cleaning record',
        ],
      },
      {
        key: 'equipment_weekly',
        name: 'Equipment Weekly Inspection',
        itemCount: 7,
        estimatedTime: '15-20 min',
        role: 'Facilities',
        items: [
          'Walk-in cooler: check door seals, clean condenser if accessible',
          'Walk-in freezer: verify defrost cycle, check for ice buildup',
          'Ice machine: weekly bin cleaning (see Ice Machine Weekly checklist)',
          'Exhaust fan: visual check for grease drips on roof curb, listen for noise',
          'Prep cooler: clean interior shelves, check door gasket',
          'Dishwasher: verify rinse temp, clean spray arms and filters',
          'Grease trap: check level, schedule pump-out if needed',
        ],
      },
    ],
  },
];

const DEMO_TODAY_CHECKLISTS = [
  {
    id: 't1',
    name: 'Opening Checklist',
    completed: 9,
    total: 9,
    status: 'complete' as const,
    assignee: 'Marcus J.',
    completedAt: '6:15 AM',
    location: 'Location 1', // demo
  },
  {
    id: 't2',
    name: 'Mid-Shift Check',
    completed: 4,
    total: 6,
    status: 'in_progress' as const,
    assignee: 'Sarah T.',
    completedAt: '',
    location: 'Location 1', // demo
  },
  {
    id: 't3',
    name: 'Closing Checklist',
    completed: 0,
    total: 8,
    status: 'not_started' as const,
    assignee: 'Evening Shift',
    completedAt: '',
    location: 'Location 1', // demo
  },
];

const DEMO_HISTORY = (() => {
  const now = new Date();
  const entries: { id: string; date: string; name: string; completedBy: string; score: number; status: 'complete' | 'incomplete' | 'missed'; detail?: string }[] = [];
  const checklists = ['Opening Checklist', 'Mid-Day Food Safety Check', 'Closing Checklist', 'Receiving Inspection', 'Cooking Temperature Log', 'Hot Holding Monitoring', 'Cold Holding Monitoring', 'Cooling Log'];
  const people = ['Marcus J.', 'Sarah T.', 'Emma D.', 'David P.', 'Mike R.', 'Alex K.', 'Lisa W.'];
  // Deterministic seed for consistent data
  const pRand = (seed: number) => { const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x); };
  let id = 1;
  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    // More checklists on weekdays (3-5), fewer on weekends (2-3)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const count = isWeekend ? 2 + Math.floor(pRand(day * 7) * 2) : 3 + Math.floor(pRand(day * 7 + 1) * 3);
    for (let j = 0; j < count; j++) {
      const seed = day * 100 + j * 13;
      const r = pRand(seed);
      const checklistIdx = Math.floor(pRand(seed + 3) * checklists.length);
      const personIdx = Math.floor(pRand(seed + 7) * people.length);
      let score: number;
      let status: 'complete' | 'incomplete' | 'missed';
      let detail: string | undefined;
      if (r < 0.06) {
        // ~6% missed
        score = 0;
        status = 'missed';
        detail = 'MISSED — not completed';
      } else if (r < 0.18) {
        // ~12% incomplete
        const completed = 5 + Math.floor(pRand(seed + 11) * 6);
        const total = completed + 1 + Math.floor(pRand(seed + 13) * 4);
        score = Math.round((completed / total) * 100);
        status = 'incomplete';
        detail = `Incomplete ${completed}/${total}`;
      } else {
        // ~82% complete
        score = 85 + Math.floor(pRand(seed + 17) * 16);
        status = 'complete';
      }
      // Vary the time of day
      const hour = 6 + Math.floor(pRand(seed + 19) * 14); // 6am - 8pm
      const minute = Math.floor(pRand(seed + 23) * 60);
      const entryDate = new Date(date);
      entryDate.setHours(hour, minute, 0, 0);
      entries.push({
        id: String(id++),
        date: entryDate.toISOString(),
        name: checklists[checklistIdx],
        completedBy: status === 'missed' ? '—' : people[personIdx],
        score,
        status,
        detail,
      });
    }
  }
  return entries;
})();

const PREBUILT_TEMPLATES = {
  opening: {
    name: 'Opening Checklist',
    type: 'opening',
    frequency: 'daily',
    items: TEMPLATE_CATEGORIES[0].templates[0].items.map(item => {
      const d = getItemDef(item);
      return { title: d.title, type: d.item_type || 'checkbox', required: true, ...d };
    }),
  },
  closing: {
    name: 'Closing Checklist',
    type: 'closing',
    frequency: 'daily',
    items: TEMPLATE_CATEGORIES[0].templates[1].items.map(item => {
      const d = getItemDef(item);
      return { title: d.title, type: d.item_type || 'checkbox', required: true, ...d };
    }),
  },
  midday: {
    name: 'Mid-Shift Check',
    type: 'shift_change',
    frequency: 'daily',
    items: TEMPLATE_CATEGORIES[0].templates[2].items.map(item => {
      const d = getItemDef(item);
      return { title: d.title, type: d.item_type || 'checkbox', required: true, ...d };
    }),
  },
  receiving: {
    name: 'Receiving Checklist',
    type: 'receiving',
    frequency: 'daily',
    items: TEMPLATE_CATEGORIES[0].templates[3].items.map(item => {
      const d = getItemDef(item);
      return { title: d.title, type: d.item_type || 'checkbox', required: true, ...d };
    }),
  },
  // HACCP Checklists
  cooking_temp: {
    name: 'Cooking Temperature Log',
    type: 'custom',
    frequency: 'daily',
    items: TEMPLATE_CATEGORIES[1].templates[0].items.map(item => {
      const d = getItemDef(item);
      return { title: d.title, type: d.item_type || 'checkbox', required: true, ...d };
    }),
  },
  cooling_log: {
    name: 'Cooling Log',
    type: 'custom',
    frequency: 'daily',
    items: TEMPLATE_CATEGORIES[1].templates[1].items.map(item => {
      const d = getItemDef(item);
      return { title: d.title, type: d.item_type || 'checkbox', required: true, ...d };
    }),
  },
  hot_holding: {
    name: 'Hot Holding Monitoring',
    type: 'custom',
    frequency: 'daily',
    items: TEMPLATE_CATEGORIES[1].templates[2].items.map(item => {
      const d = getItemDef(item);
      return { title: d.title, type: d.item_type || 'checkbox', required: true, ...d };
    }),
  },
  cold_holding: {
    name: 'Cold Holding Monitoring',
    type: 'custom',
    frequency: 'daily',
    items: TEMPLATE_CATEGORIES[1].templates[3].items.map(item => {
      const d = getItemDef(item);
      return { title: d.title, type: d.item_type || 'checkbox', required: true, ...d };
    }),
  },
  // Equipment Maintenance
  ice_machine_weekly: {
    name: 'Ice Machine Weekly Cleaning',
    type: 'custom',
    frequency: 'weekly',
    items: TEMPLATE_CATEGORIES[2].templates[0].items.map(item => {
      const d = getItemDef(item);
      return { title: d.title, type: d.item_type || 'checkbox', required: true, ...d };
    }),
  },
  ice_machine_monthly: {
    name: 'Ice Machine Monthly Service (FDA §4-602.11)',
    type: 'custom',
    frequency: 'monthly',
    items: TEMPLATE_CATEGORIES[2].templates[1].items.map(item => {
      const d = getItemDef(item);
      return { title: d.title, type: d.item_type || 'checkbox', required: true, ...d };
    }),
  },
  exhaust_fan_monthly: {
    name: 'Exhaust Fan Monthly Inspection (NFPA 96)',
    type: 'custom',
    frequency: 'monthly',
    items: TEMPLATE_CATEGORIES[2].templates[2].items.map(item => {
      const d = getItemDef(item);
      return { title: d.title, type: d.item_type || 'checkbox', required: true, ...d };
    }),
  },
  exhaust_fan_quarterly: {
    name: 'Exhaust Fan Quarterly Service (NFPA 96 Table 12.4)',
    type: 'custom',
    frequency: 'monthly',
    items: TEMPLATE_CATEGORIES[2].templates[3].items.map(item => {
      const d = getItemDef(item);
      return { title: d.title, type: d.item_type || 'checkbox', required: true, ...d };
    }),
  },
  equipment_weekly: {
    name: 'Equipment Weekly Inspection',
    type: 'custom',
    frequency: 'weekly',
    items: TEMPLATE_CATEGORIES[2].templates[4].items.map(item => {
      const d = getItemDef(item);
      return { title: d.title, type: d.item_type || 'checkbox', required: true, ...d };
    }),
  },
};

// ── HACCP Summary Card (demo data — mirrors HACCP.tsx CCPs) ─────

interface HACCPSummaryCCP {
  name: string;
  limit: string;
  status: 'in_limit' | 'deviation' | 'no_data';
  deviationTime?: string;       // e.g. '11:30 AM'
  caCreated?: boolean;           // corrective action exists for today
  locationName?: string;         // for multi-location display
}

const DEMO_HACCP_SUMMARY: HACCPSummaryCCP[] = [
  { name: 'Cooking Temperature', limit: '165°F+', status: 'in_limit' },
  { name: 'Cold Holding', limit: '41°F−', status: 'in_limit' },
  { name: 'Hot Holding', limit: '135°F+', status: 'deviation', deviationTime: '11:30 AM', caCreated: true, locationName: 'Location 2' }, // demo
  { name: 'Cooling', limit: '2hr rule', status: 'in_limit' },
  { name: 'Sanitizer Concentration', limit: '200ppm+', status: 'in_limit' },
];

function HACCPSummaryCard({ isDemoMode }: { isDemoMode: boolean }) {
  const nav = useNavigate();

  // Only show demo HACCP data in demo mode
  if (!isDemoMode) return null;

  const deviations = DEMO_HACCP_SUMMARY.filter(c => c.status === 'deviation').length;
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div
      className="bg-white rounded-xl overflow-hidden"
      style={{ border: '1px solid #e5e7eb' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid #F0F0F0' }}
      >
        <div className="flex items-center gap-2">
          <Shield size={16} style={{ color: '#1E2D4D' }} />
          <h3 className="text-sm font-semibold" style={{ color: '#0B1628' }}>
            HACCP Control Points
          </h3>
        </div>
        <span className="text-xs text-[#1E2D4D]/50">Today, {todayStr.split(', ').slice(1).join(', ')}</span>
      </div>

      {/* CCP rows */}
      <div className="px-5 py-3 space-y-2">
        {DEMO_HACCP_SUMMARY.map(ccp => {
          const isDev = ccp.status === 'deviation';
          return (
            <div
              key={ccp.name}
              className="flex items-center justify-between py-1"
              style={isDev ? { color: '#dc2626' } : undefined}
            >
              <div className="flex items-center gap-2">
                {isDev
                  ? <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  : <CheckCircle size={14} className="text-green-500 shrink-0" />
                }
                <span className={`text-sm ${isDev ? 'font-semibold text-red-700' : 'text-[#1E2D4D]/90'}`}>
                  {ccp.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#1E2D4D]/50 w-16 text-right">{ccp.limit}</span>
                <span className={`text-xs font-semibold w-20 text-right ${isDev ? 'text-red-600' : 'text-green-600'}`}>
                  {isDev ? 'DEVIATION' : 'IN LIMIT'}
                </span>
                {isDev && (
                  <span className="text-xs text-[#1E2D4D]/50 whitespace-nowrap">
                    {ccp.locationName && <>{ccp.locationName} · </>}
                    {ccp.deviationTime && <>{ccp.deviationTime} · </>}
                    {ccp.caCreated
                      ? <span className="text-green-700 font-medium">CA Created ✓</span>
                      : <span className="text-red-600 font-medium">CA Pending</span>
                    }
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderTop: '1px solid #F0F0F0', backgroundColor: deviations > 0 ? '#fef2f2' : '#f0fdf4' }}
      >
        <span className={`text-xs font-medium ${deviations > 0 ? 'text-red-700' : 'text-green-700'}`}>
          {deviations > 0
            ? (() => {
                const allCACreated = DEMO_HACCP_SUMMARY
                  .filter(c => c.status === 'deviation')
                  .every(c => c.caCreated);
                return `${deviations} deviation${deviations > 1 ? 's' : ''} — corrective action ${allCACreated ? 'created' : 'required'}`;
              })()
            : 'All control points in limit'
          }
        </span>
        <button
          type="button"
          onClick={() => nav('/haccp')}
          className="text-xs font-semibold transition-colors hover:underline"
          style={{ color: '#1E2D4D' }}
        >
          View &rarr;
        </button>
      </div>
    </div>
  );
}

export function Checklists() {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { t } = useTranslation();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  usePageTitle('Checklists');
  const [searchParams] = useSearchParams();
  const locationParam = searchParams.get('location') || '';
  // Enforcement emphasis data is demo-only; production operators get jurisdiction from DB
  const jurisdictionConfig = isDemoMode ? getJurisdictionForLocation(locationParam) : null;
  const [pageError, setPageError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'templates' | 'today' | 'history'>('today');
  const [demoItemsMap, setDemoItemsMap] = useState<Record<string, ChecklistTemplateItem[]>>({});
  const [todayChecklists, setTodayChecklists] = useState(isDemoMode ? DEMO_TODAY_CHECKLISTS : []);
  const [ccpMappingResults, setCcpMappingResults] = useState<{ ccp: string; value: string; pass: boolean; limit: string }[]>([]);
  const { notifications, setNotifications } = useNotifications();
  const [historyRange, setHistoryRange] = useState('7days');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [completions, setCompletions] = useState<ChecklistCompletion[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [templateItems, setTemplateItems] = useState<ChecklistTemplateItem[]>([]);
  const [itemResponses, setItemResponses] = useState<ItemResponse>({});
  const [itemPhotos, setItemPhotos] = useState<Record<string, PhotoRecord[]>>({});
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);

  // Template form state
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('');
  const [templateFrequency, setTemplateFrequency] = useState('daily');
  const [items, setItems] = useState<{ title: string; type: string; required: boolean }[]>([]);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemType, setNewItemType] = useState('checkbox');

  // i18n lookup maps for data defined outside the component
  const templateNameMap: Record<string, string> = {
    'Opening Checklist': t('checklists.openingChecklist'),
    'Closing Checklist': t('checklists.closingChecklist'),
    'Mid-Day Food Safety Check': t('checklists.midDayCheck'),
    'Cooking Temperature Log': t('checklists.cookingTempLog'),
    'Cooling Log': t('checklists.coolingLog'),
    'Receiving Inspection': t('checklists.receivingInspection'),
    'Hot Holding Monitoring': t('checklists.hotHoldingMonitoring'),
    'Cold Holding Monitoring': t('checklists.coldHoldingMonitoring'),
  };

  const checklistItemMap: Record<string, string> = {
    'Check sanitizer concentration': t('checklists.checkSanitizerConcentration'),
    'Verify hot water temp': t('checklists.verifyHotWaterTemp'),
    'Inspect handwash stations': t('checklists.inspectHandwashStations'),
    'Verify internal temp of each protein type': t('checklists.verifyInternalTemp'),
    'Record start temp and time': t('checklists.recordStartTempAndTime'),
    'Check walk-in cooler temperature': t('checklists.checkWalkInCoolerTemp'),
    'Clean and sanitize prep surfaces': t('checklists.cleanAndSanitize'),
    'Check hot holding temperatures': t('checklists.checkHotHoldingTemps'),
    'Verify dish machine sanitizer levels': t('checklists.verifyDishMachineSanitizer'),
    'Inspect restrooms': t('checklists.inspectRestrooms'),
    'Empty grease traps': t('checklists.emptyGreaseTraps'),
    'Log receiving temperatures': t('checklists.logReceivingTemps'),
    'Complete cooling log': t('checklists.completeCoolingLog'),
  };

  const categoryMap: Record<string, string> = {
    'Daily Operations': t('checklists.dailyOperations'),
    'HACCP Checklists': t('checklists.haccpChecklists'),
    'Equipment Maintenance': t('checklists.equipmentMaintenance'),
  };

  const roleMap: Record<string, string> = {
    'Kitchen Staff': t('checklists.kitchenStaff'),
    'Manager': t('checklists.manager'),
    'Facilities': t('checklists.facilities'),
  };

  const frequencyLabelMap: Record<string, string> = {
    'Daily': t('checklists.daily'),
    'Weekly': t('checklists.weekly'),
    'Monthly': t('checklists.monthly'),
  };

  const itemTypeLabelMap: Record<string, string> = {
    'Checkbox': t('checklists.checkbox'),
    'Yes/No': t('checklists.yesNo'),
    'Temperature': t('checklists.temperature'),
    'Text Input': t('checklists.textInput'),
  };

  useEffect(() => {
    if (!isDemoMode && profile?.organization_id) {
      fetchTemplates();
      fetchCompletions();
    }
  }, [profile, isDemoMode]);

  useEffect(() => {
    if (templateItems.length > 0) {
      const answered = Object.keys(itemResponses).length;
      setCurrentProgress(Math.round((answered / templateItems.length) * 100));
    }
  }, [itemResponses, templateItems]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*, checklist_template_items(count)')
        .eq('organization_id', profile?.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedTemplates = data.map((template: any) => ({
          id: template.id,
          name: template.name,
          checklist_type: template.checklist_type,
          frequency: template.frequency,
          is_active: template.is_active,
          items_count: template.checklist_template_items?.[0]?.count || 0,
        }));
        setTemplates(formattedTemplates);
      }
    } catch (err) {
      console.error('Failed to load checklist templates:', err);
      toast.error('Failed to load checklist templates');
    }
  };

  const fetchCompletions = async () => {
    try {
      // Query 1: flat select — no PostgREST embeds (FK chains are broken)
      const { data, error } = await supabase
        .from('checklist_template_completions')
        .select('id, completed_at, completed_by, template_id, score_percentage')
        .eq('organization_id', profile?.organization_id)
        .order('completed_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Query 2: batch-fetch user names
      const userIds = [...new Set((data ?? []).map((c: any) => c.completed_by).filter(Boolean))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', userIds);
        if (profiles) {
          userMap = Object.fromEntries(profiles.map((p: any) => [p.id, p.full_name ?? 'Unknown']));
        }
      }

      // Query 3: batch-fetch template names
      const templateIds = [...new Set((data ?? []).map((c: any) => c.template_id).filter(Boolean))];
      let templateMap: Record<string, string> = {};
      if (templateIds.length > 0) {
        const { data: tpls } = await supabase
          .from('checklist_templates')
          .select('id, name')
          .in('id', templateIds);
        if (tpls) {
          templateMap = Object.fromEntries(tpls.map((t: any) => [t.id, t.name ?? 'Unknown']));
        }
      }

      // Merge
      if (data) {
        const formattedCompletions = data.map((completion: any) => ({
          id: completion.id,
          template_name: templateMap[completion.template_id as string] || 'Unknown',
          completed_by_name: userMap[completion.completed_by as string] || 'Unknown',
          score_percentage: completion.score_percentage || 0,
          completed_at: completion.completed_at,
        }));
        setCompletions(formattedCompletions);
      }
    } catch (err) {
      console.error('Failed to load checklist completions:', err);
      toast.error('Failed to load checklist completions');
    }
  };

  const createPrebuiltTemplate = async (templateKey: keyof typeof PREBUILT_TEMPLATES) => {
    const template = PREBUILT_TEMPLATES[templateKey];
    setLoading(true);

    // Demo mode: use local state only
    if (isDemoMode || !profile?.organization_id) {
      const newId = `demo-${Date.now()}`;
      const newTemplate: ChecklistTemplate = {
        id: newId,
        name: template.name,
        checklist_type: template.type,
        frequency: template.frequency,
        is_active: true,
        items_count: template.items.length,
      };
      setTemplates(prev => [newTemplate, ...prev]);
      const newItems: ChecklistTemplateItem[] = template.items.map((item, idx) => ({
        id: `${newId}-item-${idx}`,
        template_id: newId,
        title: item.title,
        item_type: item.type,
        order: idx,
        is_required: item.required,
      }));
      setDemoItemsMap(prev => ({ ...prev, [newId]: newItems }));
      // Add to today's checklists and switch tab
      const userName = profile?.full_name || 'You';
      setTodayChecklists(prev => [{
        id: `today-${Date.now()}`,
        name: template.name,
        completed: 0,
        total: template.items.length,
        status: 'not_started' as const,
        assignee: userName,
        completedAt: 'Just now',
        location: 'Location 1', // demo
      }, ...prev]);
      setLoading(false);
      setActiveView('today');
      return;
    }

    try {
      const { data: templateData, error: templateError } = await supabase
        .from('checklist_templates')
        .insert({
          organization_id: profile?.organization_id,
          name: template.name,
          checklist_type: template.type,
          frequency: template.frequency,
          is_active: true,
        })
        .select()
        .single();

      if (templateError) {
        console.error('Template creation error:', templateError);
        setLoading(false);
        toast.error(`Error creating template: ${templateError.message}`);
        return;
      }

      if (!templateData) {
        setLoading(false);
        toast.error('No data returned after creating template');
        return;
      }

      const itemsToInsert = template.items.map((item, index) => ({
        template_id: templateData.id,
        title: item.title,
        item_type: item.type,
        order: index,
        is_required: item.required,
        authority_source: item.authority_source || null,
        authority_section: item.authority_section || null,
        authority_note: item.authority_note || null,
        haccp_ccp: item.haccp_ccp || null,
        haccp_hazard: item.haccp_hazard || null,
        haccp_critical_limit: item.haccp_critical_limit || null,
        temp_min: item.temp_min ?? null,
        temp_max: item.temp_max ?? null,
        is_critical: item.is_critical || false,
        requires_corrective_action: item.requires_corrective_action || false,
        requires_photo_on_fail: item.requires_photo_on_fail || false,
      }));

      const { error: itemsError } = await supabase
        .from('checklist_template_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Items creation error:', itemsError);
        toast.error(`Error creating template items: ${itemsError.message}`);
      } else {
        toast.success('Template created');
      }

      setLoading(false);
      fetchTemplates();
    } catch (error) {
      console.error('Unexpected error:', error);
      setLoading(false);
      toast.error('An unexpected error occurred');
    }
  };

  const handleAddItem = () => {
    if (!newItemTitle.trim()) return;

    setItems([
      ...items,
      {
        title: newItemTitle,
        type: newItemType,
        required: true,
      },
    ]);

    setNewItemTitle('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.warning('Please add at least one item to the checklist');
      return;
    }

    setLoading(true);

    // Demo mode: use local state only
    if (isDemoMode || !profile?.organization_id) {
      const newId = `demo-${Date.now()}`;
      const newTemplate: ChecklistTemplate = {
        id: newId,
        name: templateName,
        checklist_type: templateType,
        frequency: templateFrequency,
        is_active: true,
        items_count: items.length,
      };
      setTemplates(prev => [newTemplate, ...prev]);
      const newItems: ChecklistTemplateItem[] = items.map((item, idx) => ({
        id: `${newId}-item-${idx}`,
        template_id: newId,
        title: item.title,
        item_type: item.type,
        order: idx,
        is_required: item.required,
      }));
      setDemoItemsMap(prev => ({ ...prev, [newId]: newItems }));
      // Add to today's checklists and switch tab
      const userName = profile?.full_name || 'You';
      setTodayChecklists(prev => [{
        id: `today-${Date.now()}`,
        name: templateName,
        completed: 0,
        total: items.length,
        status: 'not_started' as const,
        assignee: userName,
        completedAt: 'Just now',
        location: 'Location 1', // demo
      }, ...prev]);
      setLoading(false);
      setShowTemplateModal(false);
      setTemplateName('');
      setTemplateType('');
      setItems([]);
      setActiveView('today');
      return;
    }

    try {
      const { data: templateData, error: templateError } = await supabase
        .from('checklist_templates')
        .insert({
          organization_id: profile?.organization_id,
          name: templateName,
          checklist_type: templateType,
          frequency: templateFrequency,
          is_active: true,
        })
        .select()
        .single();

      if (templateError) {
        console.error('Template creation error:', templateError);
        setLoading(false);
        toast.error(`Error creating template: ${templateError.message}`);
        return;
      }

      if (!templateData) {
        setLoading(false);
        toast.error('No data returned after creating template');
        return;
      }

      const itemsToInsert = items.map((item, index) => ({
        template_id: templateData.id,
        title: item.title,
        item_type: item.type,
        order: index,
        is_required: item.required,
      }));

      const { error: itemsError } = await supabase
        .from('checklist_template_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Items creation error:', itemsError);
        toast.error(`Error creating template items: ${itemsError.message}`);
      } else {
        toast.success('Template created');
      }

      setLoading(false);
      setShowTemplateModal(false);
      setTemplateName('');
      setTemplateType('');
      setItems([]);
      fetchTemplates();
    } catch (error) {
      console.error('Unexpected error:', error);
      setLoading(false);
      toast.error('An unexpected error occurred');
    }
  };

  const handleStartChecklist = async (template: ChecklistTemplate) => {
    setSelectedTemplate(template);

    // Demo mode: use local items map
    if (isDemoMode || !profile?.organization_id) {
      const localItems = demoItemsMap[template.id] || [];
      setTemplateItems(localItems);
      setItemResponses({});
      setShowCompleteModal(true);
      return;
    }

    const { data } = await supabase
      .from('checklist_template_items')
      .select('*')
      .eq('template_id', template.id)
      .order('order');

    if (data) {
      setTemplateItems(data);
      setItemResponses({});
      setShowCompleteModal(true);
    }
  };

  const handleItemResponse = (itemId: string, value: string, isPass: boolean | null, correctiveAction = '') => {
    // Auto-evaluate temperature items against temp_min/temp_max
    const item = templateItems.find(i => i.id === itemId);
    if (item?.item_type === 'temperature' && value) {
      const numVal = parseFloat(value);
      if (!isNaN(numVal)) {
        if (item.temp_max != null && numVal > item.temp_max) isPass = false;
        else if (item.temp_min != null && numVal < item.temp_min) isPass = false;
        else if (item.temp_max != null || item.temp_min != null) isPass = true;
      }
    }
    setItemResponses({
      ...itemResponses,
      [itemId]: {
        response_value: value,
        is_pass: isPass,
        corrective_action: correctiveAction,
      },
    });

    // Persist to IndexedDB for offline resilience (fire-and-forget)
    try {
      addPendingAction({
        id: crypto.randomUUID(),
        type: 'update',
        table: 'checklist_item_responses',
        payload: { itemId, response_value: value, is_pass: isPass, corrective_action: correctiveAction },
        timestamp: Date.now(),
        status: 'pending',
        retries: 0,
      });
    } catch { /* silent — offline persistence is best-effort */ }
  };

  const handleSubmitCompletion = async () => {
    if (!selectedTemplate) return;

    const requiredItems = templateItems.filter((item) => item.is_required);
    const answeredRequired = requiredItems.filter((item) => itemResponses[item.id]);

    if (answeredRequired.length < requiredItems.length) {
      toast.warning('Please complete all required items');
      return;
    }

    // Block if any failed item requires photo evidence but none attached
    const failedMissingPhoto = templateItems.filter(item => {
      if (!item.requires_photo_on_fail) return false;
      const resp = itemResponses[item.id];
      return resp?.is_pass === false && !(itemPhotos[item.id]?.length > 0);
    });
    if (failedMissingPhoto.length > 0) {
      toast.warning('Photo evidence required for failed items — please attach photos before submitting');
      return;
    }

    // Block if any CCP-tagged item failed without corrective action
    const failedCCPsMissingCA = templateItems.filter(item => {
      if (!item.haccp_ccp) return false;
      const resp = itemResponses[item.id];
      return resp?.is_pass === false && !resp.corrective_action?.trim();
    });
    if (failedCCPsMissingCA.length > 0) {
      toast.warning('Corrective action required for all out-of-limit CCP items');
      return;
    }

    const passedItems = Object.values(itemResponses).filter(
      (r) => r.is_pass === null || r.is_pass === true
    ).length;
    const scorePercentage = Math.round((passedItems / templateItems.length) * 100);

    // Demo mode: update local state only
    if (isDemoMode || !profile?.organization_id) {
      // Simulate CCP auto-mapping
      const ccpResults = templateItems
        .filter(item => item.haccp_ccp && itemResponses[item.id])
        .map(item => ({
          ccp: item.haccp_ccp!,
          value: itemResponses[item.id].response_value,
          pass: itemResponses[item.id].is_pass !== false,
          limit: item.haccp_critical_limit || '',
        }));

      setShowCompleteModal(false);
      setItemResponses({});

      if (ccpResults.length > 0) {
        setCcpMappingResults(ccpResults);
        toast.success(`${ccpResults.length} CCP monitoring log(s) auto-populated`);
        // Create alerts for out-of-limit CCPs
        const failedCCPs = ccpResults.filter(r => !r.pass);
        if (failedCCPs.length > 0) {
          const newNotifs = failedCCPs.map(r => ({
            id: `ccp-alert-${Date.now()}-${r.ccp}`,
            title: `CCP Out of Limit: ${r.ccp} — ${r.value}°F (limit: ${r.limit})`,
            time: new Date().toISOString(),
            link: '/haccp',
            type: 'alert' as const,
            locationId: '1',
          }));
          setNotifications([...newNotifs, ...notifications]);
          toast.warning('Out-of-limit CCP detected — manager notified');
        }
      } else if (scorePercentage === 100) {
        navigator.vibrate?.(100);
        setTimeout(() => toast.success('Checklist completed with 100% score'), 100);
      } else {
        navigator.vibrate?.(100);
        toast.success(`Checklist submitted — score: ${scorePercentage}%`);
      }
      return;
    }

    setLoading(true);

    const { data: locationData } = await supabase
      .from('locations')
      .select('id')
      .eq('organization_id', profile?.organization_id)
      .limit(1)
      .maybeSingle();

    const { data: completionData, error: completionError } = await supabase
      .from('checklist_template_completions')
      .insert({
        template_id: selectedTemplate.id,
        organization_id: profile?.organization_id,
        location_id: locationData?.id,
        completed_by: profile?.id,
        score_percentage: scorePercentage,
      })
      .select()
      .single();

    if (completionError || !completionData) {
      setLoading(false);
      toast.error('Error saving checklist completion');
      return;
    }

    const itemMap = new Map(templateItems.map(i => [i.id, i]));
    const responsesToInsert = Object.entries(itemResponses).map(([itemId, response]) => {
      const item = itemMap.get(itemId);
      return {
        completion_id: completionData.id,
        template_item_id: itemId,
        response_value: response.response_value,
        is_pass: response.is_pass,
        corrective_action: response.corrective_action || null,
        response_type: item?.item_type || 'checkbox',
        response_passed: response.is_pass,
        temperature_reading: item?.item_type === 'temperature' ? parseFloat(response.response_value) || null : null,
        responded_at: new Date().toISOString(),
      };
    });

    await supabase.from('checklist_responses').insert(responsesToInsert);

    // Query auto-generated HACCP monitoring logs from DB trigger
    const { data: ccpLogs } = await supabase
      .from('haccp_monitoring_logs')
      .select('*')
      .eq('source_checklist_completion_id', completionData.id);

    if (ccpLogs && ccpLogs.length > 0) {
      const ccpResults = ccpLogs.map(log => ({
        ccp: log.ccp_number || log.ccp_id || '',
        value: log.monitored_value || '',
        pass: log.is_within_limit !== false,
        limit: log.critical_limit || '',
      }));
      setCcpMappingResults(ccpResults);
      toast.success(`${ccpResults.length} CCP monitoring log(s) auto-populated`);

      const failedCCPs = ccpResults.filter(r => !r.pass);
      if (failedCCPs.length > 0) {
        toast.warning('Out-of-limit CCP detected — manager notified');

        // Insert alerts for out-of-limit CCPs
        if (profile?.organization_id) {
          const alertRows = failedCCPs.map(r => ({
            organization_id: profile.organization_id,
            alert_type: 'critical',
            category: 'haccp_failure',
            title: `HACCP CCP Failure: ${r.ccp} out of limit`,
            description: `${r.ccp} recorded ${r.value} — critical limit is ${r.limit}. Corrective action required.`,
            location_id: selectedTemplate?.id ? undefined : undefined,
            is_resolved: false,
          }));
          await supabase.from('alerts').insert(alertRows);
        }
      }
    }

    setLoading(false);
    setShowCompleteModal(false);
    setItemResponses({});
    fetchCompletions();

    if ((!ccpLogs || ccpLogs.length === 0) && scorePercentage === 100) {
      navigator.vibrate?.(100);
      setTimeout(() => toast.success('Checklist completed with 100% score'), 100);
    } else if (!ccpLogs || ccpLogs.length === 0) {
      navigator.vibrate?.(100);
      toast.success(`Checklist submitted — score: ${scorePercentage}%`);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    guardAction('delete', 'checklist templates', async () => {
      // Demo mode: remove from local state
      if (isDemoMode || !profile?.organization_id) {
        setTemplates(prev => prev.filter(t => t.id !== templateId));
        setDemoItemsMap(prev => {
          const copy = { ...prev };
          delete copy[templateId];
          return copy;
        });
        toast.success('Template deleted');
        return;
      }

      await supabase.from('checklist_templates').delete().eq('id', templateId);
      toast.success('Template deleted');
      fetchTemplates();
    });
  };

  const handleEditTemplate = async (template: ChecklistTemplate) => {
    // Pre-fill the template modal with existing data
    setTemplateName(template.name);
    setTemplateType(template.checklist_type);
    setTemplateFrequency(template.frequency);

    // Load items
    if (isDemoMode || !profile?.organization_id) {
      const localItems = demoItemsMap[template.id] || [];
      setItems(localItems.map(i => ({ title: i.title, type: i.item_type, required: i.is_required })));
    } else {
      const { data } = await supabase
        .from('checklist_template_items')
        .select('*')
        .eq('template_id', template.id)
        .order('order');
      if (data) {
        setItems(data.map((i: any) => ({ title: i.title, type: i.item_type, required: i.is_required })));
      }
    }

    // Delete the old template first, then open modal to create updated version
    if (isDemoMode || !profile?.organization_id) {
      setTemplates(prev => prev.filter(t => t.id !== template.id));
      setDemoItemsMap(prev => {
        const copy = { ...prev };
        delete copy[template.id];
        return copy;
      });
    } else {
      await supabase.from('checklist_templates').delete().eq('id', template.id);
      fetchTemplates();
    }

    setShowTemplateModal(true);
  };

  // ── Authority badge + CCP tag helper ──
  const renderAuthBadges = (item: ChecklistTemplateItem) => (
    <span className="inline-flex items-center gap-1 ml-1 align-middle">
      {item.authority_source && (() => {
        const auth = AUTHORITY_LABELS[item.authority_source!];
        return auth ? (
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{ color: auth.color, backgroundColor: auth.bg }}>
            {auth.label}{item.authority_section ? ` ${item.authority_section}` : ''}
          </span>
        ) : null;
      })()}
      {item.haccp_ccp && (
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
          {item.haccp_ccp}
        </span>
      )}
      {item.is_critical && (
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700">Critical</span>
      )}
    </span>
  );

  const renderItemInput = (item: ChecklistTemplateItem) => {
    const response = itemResponses[item.id];

    switch (item.item_type) {
      case 'checkbox':
        return (
          <div>
            <label className="flex items-center space-x-3 cursor-pointer min-h-[44px] py-1">
              <input
                type="checkbox"
                checked={response?.response_value === 'checked'}
                onChange={(e) =>
                  handleItemResponse(item.id, e.target.checked ? 'checked' : 'unchecked', e.target.checked, '')
                }
                className="h-7 w-7 text-[#A08C5A] focus:ring-[#A08C5A] border-[#1E2D4D]/15 rounded"
              />
              <span className="text-lg text-[#1E2D4D]">
                {checklistItemMap[item.title] || item.title}
                {renderAuthBadges(item)}
              </span>
              {item.is_required && <span className="text-red-600">*</span>}
            </label>
            {item.authority_note && (
              <p className="text-xs text-[#1E2D4D]/30 mt-1 ml-9">{item.authority_note}</p>
            )}
            <div className="mt-2">
              <PhotoButton
                photos={itemPhotos[item.id] || []}
                onChange={(photos) => setItemPhotos(prev => ({ ...prev, [item.id]: photos }))}
              />
            </div>
          </div>
        );

      case 'yes_no':
        return (
          <div>
            <p className="text-lg text-[#1E2D4D] mb-1">
              {checklistItemMap[item.title] || item.title}
              {renderAuthBadges(item)}
              {item.is_required && <span className="text-red-600 ml-1">*</span>}
            </p>
            {item.authority_note && (
              <p className="text-xs text-[#1E2D4D]/30 mb-3">{item.authority_note}</p>
            )}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => handleItemResponse(item.id, 'yes', true, '')}
                className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all ${
                  response?.response_value === 'yes'
                    ? 'bg-green-500 text-white'
                    : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/80 hover:bg-[#1E2D4D]/10'
                }`}
              >
                {t('common.yes')}
              </button>
              <button
                type="button"
                onClick={() => handleItemResponse(item.id, 'no', false, '')}
                className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all ${
                  response?.response_value === 'no'
                    ? 'bg-red-500 text-white'
                    : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/80 hover:bg-[#1E2D4D]/10'
                }`}
              >
                {t('common.no')}
              </button>
            </div>
            {response?.response_value === 'no' && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#1E2D4D]/80">{t('common.correctiveActionRequired')}</label>
                  <AIAssistButton
                    fieldLabel="Corrective Action"
                    context={{ itemName: checklistItemMap[item.title] || item.title, checklistName: selectedTemplate?.name || '', jurisdictionName: jurisdictionConfig?.ehdName, enforcementNote: jurisdictionConfig?.aiContextNote, codeSection: item.authority_section }}
                    currentValue={response.corrective_action}
                    onGenerated={(text) => { handleItemResponse(item.id, 'no', false, text); setAiFields(prev => new Set(prev).add(`corrective_${item.id}`)); }}
                  />
                </div>
                <textarea
                  value={response.corrective_action}
                  onChange={(e) => {
                    handleItemResponse(item.id, 'no', false, e.target.value);
                    setAiFields(prev => { const s = new Set(prev); s.delete(`corrective_${item.id}`); return s; });
                  }}
                  rows={2}
                  className="w-full px-4 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                  placeholder="Describe the corrective action..."
                />
                {aiFields.has(`corrective_${item.id}`) && <AIGeneratedIndicator />}
              </div>
            )}
            <div className="mt-2">
              <PhotoButton
                photos={itemPhotos[item.id] || []}
                onChange={(photos) => setItemPhotos(prev => ({ ...prev, [item.id]: photos }))}
                highlight={response?.response_value === 'no'}
                highlightText={response?.response_value === 'no' ? 'Add photo evidence' : undefined}
              />
            </div>
          </div>
        );

      case 'temperature':
        return (
          <div>
            <label className="block text-lg text-[#1E2D4D] mb-1">
              {checklistItemMap[item.title] || item.title}
              {renderAuthBadges(item)}
              {item.is_required && <span className="text-red-600 ml-1">*</span>}
            </label>
            {item.authority_note && (
              <p className="text-xs text-[#1E2D4D]/30 mb-3">{item.authority_note}</p>
            )}
            <input
              type="number"
              step="0.1"
              value={response?.response_value || ''}
              onChange={(e) => handleItemResponse(item.id, e.target.value, null, '')}
              className="w-full px-4 py-3 text-2xl font-bold tracking-tight border-2 border-[#1E2D4D]/15 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
              placeholder="00.0°F"
            />
            {/* Pass/Fail feedback for temperature items */}
            {response?.response_value && (item.temp_max != null || item.temp_min != null) && (() => {
              const numVal = parseFloat(response.response_value);
              if (isNaN(numVal)) return null;
              const pass = response.is_pass !== false;
              const limitStr = item.haccp_critical_limit || (item.temp_max != null ? `≤${item.temp_max}°F` : `≥${item.temp_min}°F`);
              return (
                <div className={`mt-2 flex items-center gap-2 text-sm font-semibold ${pass ? 'text-green-600' : 'text-red-600'}`}>
                  {pass ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  {pass ? `PASS — within limit (${limitStr})` : `FAIL — exceeds limit (${limitStr})`}
                </div>
              );
            })()}
            {/* Required corrective action for failed CCP items */}
            {response?.is_pass === false && item.haccp_ccp && (
              <div className="mt-3 border-l-4 border-red-500 pl-3 bg-red-50 rounded-r-lg py-2 pr-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-red-700 flex items-center gap-1">
                    <AlertTriangle size={14} /> Corrective Action Required *
                  </label>
                  <AIAssistButton
                    fieldLabel="Corrective Action"
                    context={{ itemName: checklistItemMap[item.title] || item.title, checklistName: selectedTemplate?.name || '', jurisdictionName: jurisdictionConfig?.ehdName, enforcementNote: jurisdictionConfig?.aiContextNote, codeSection: item.authority_section, ccpNumber: item.haccp_ccp, criticalLimit: item.haccp_critical_limit }}
                    currentValue={response.corrective_action}
                    onGenerated={(text) => { handleItemResponse(item.id, response.response_value, false, text); setAiFields(prev => new Set(prev).add(`ccp_corrective_${item.id}`)); }}
                  />
                </div>
                <textarea
                  value={response.corrective_action}
                  onChange={(e) => {
                    handleItemResponse(item.id, response.response_value, false, e.target.value);
                    setAiFields(prev => { const s = new Set(prev); s.delete(`ccp_corrective_${item.id}`); return s; });
                  }}
                  rows={2}
                  className="w-full px-3 py-2 border border-red-300 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-red-400 text-sm"
                  placeholder="Describe corrective action taken..."
                />
                {aiFields.has(`ccp_corrective_${item.id}`) && <AIGeneratedIndicator />}
              </div>
            )}
            <div className="mt-2">
              <PhotoButton
                photos={itemPhotos[item.id] || []}
                onChange={(photos) => setItemPhotos(prev => ({ ...prev, [item.id]: photos }))}
                highlight={response?.is_pass === false}
                highlightText={response?.is_pass === false ? 'Photo evidence recommended' : undefined}
              />
            </div>
          </div>
        );

      case 'text_input':
        return (
          <div>
            <label className="block text-lg text-[#1E2D4D] mb-1">
              {checklistItemMap[item.title] || item.title}
              {renderAuthBadges(item)}
              {item.is_required && <span className="text-red-600 ml-1">*</span>}
            </label>
            {item.authority_note && (
              <p className="text-xs text-[#1E2D4D]/30 mb-3">{item.authority_note}</p>
            )}
            <input
              type="text"
              value={response?.response_value || ''}
              onChange={(e) => handleItemResponse(item.id, e.target.value, null, '')}
              className="w-full px-4 py-3 border-2 border-[#1E2D4D]/15 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
              placeholder="Enter your response..."
            />
            <div className="mt-2">
              <PhotoButton
                photos={itemPhotos[item.id] || []}
                onChange={(photos) => setItemPhotos(prev => ({ ...prev, [item.id]: photos }))}
              />
            </div>
          </div>
        );

      case 'photo':
        return (
          <div>
            <p className="text-lg text-[#1E2D4D] mb-1">
              {checklistItemMap[item.title] || item.title}
              {renderAuthBadges(item)}
              {item.is_required && <span className="text-red-600 ml-1">*</span>}
            </p>
            {item.authority_note && (
              <p className="text-xs text-[#1E2D4D]/30 mb-3">{item.authority_note}</p>
            )}
            <PhotoButton
              photos={itemPhotos[item.id] || []}
              onChange={(photos) => {
                setItemPhotos(prev => ({ ...prev, [item.id]: photos }));
                if (photos.length > 0) {
                  handleItemResponse(item.id, `${photos.length} photo(s)`, true, '');
                }
              }}
              highlight
              highlightText="Capture photo evidence"
            />
            {(itemPhotos[item.id]?.length || 0) > 0 && (
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-green-600">
                <CheckCircle size={16} />
                {itemPhotos[item.id].length} photo(s) captured
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const reloadData = () => {
    setPageError(null);
    if (!isDemoMode && profile?.organization_id) {
      fetchTemplates();
      fetchCompletions();
    }
  };

  if (pageError) {
    return <ErrorState error={pageError} onRetry={reloadData} />;
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: t('checklists.title') }]} />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D]">{t('checklists.title')}</h1>
          <p className="text-sm text-[#1E2D4D]/70 mt-1">{t('checklists.subtitle')}</p>
        </div>

        {/* Jurisdiction Header */}
        {jurisdictionConfig && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[#eef4f8] border border-[#b8d4e8]">
            <Building2 size={18} className="text-[#1E2D4D] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-[#1E2D4D]">{jurisdictionConfig.ehdName}</span>
                <span className="text-xs text-[#1E2D4D]/30">·</span>
                <span className="text-xs text-[#1E2D4D]/70">{jurisdictionConfig.foodCodeVersion}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {jurisdictionConfig.enforcementFocus
                  .filter(f => f.priority === 'high')
                  .map(f => (
                    <span
                      key={f.codeSection}
                      className="text-xs font-semibold px-1.5 py-0.5 rounded"
                      style={{ color: '#0369a1', backgroundColor: '#e0f2fe' }}
                    >
                      {f.description} ({f.codeSection})
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* View Tabs */}
        <div className="flex space-x-2 border-b border-[#1E2D4D]/10 overflow-x-auto">
          <button
            onClick={() => setActiveView('today')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeView === 'today'
                ? 'border-b-2 border-[#A08C5A] text-[#1E2D4D]'
                : 'text-[#1E2D4D]/70 hover:text-[#1E2D4D]'
            }`}
          >
            {t('checklists.todaysChecklists')}
          </button>
          <button
            onClick={() => setActiveView('templates')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeView === 'templates'
                ? 'border-b-2 border-[#A08C5A] text-[#1E2D4D]'
                : 'text-[#1E2D4D]/70 hover:text-[#1E2D4D]'
            }`}
          >
            {t('checklists.templates')}
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeView === 'history'
                ? 'border-b-2 border-[#A08C5A] text-[#1E2D4D]'
                : 'text-[#1E2D4D]/70 hover:text-[#1E2D4D]'
            }`}
          >
            History
          </button>
        </div>

        {/* Today's Checklists View */}
        {activeView === 'today' && (
          <div className="space-y-6">
            {/* CCP Auto-Mapping Results Banner */}
            {ccpMappingResults.length > 0 && (
              <div className="bg-[#eef4f8] border border-[#b8d4e8] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-[#1E2D4D] flex items-center gap-1.5">
                    <EvidlyIcon size={14} /> HACCP Logs Auto-Populated
                  </h3>
                  <button onClick={() => setCcpMappingResults([])} className="text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70"><X size={16} /></button>
                </div>
                <div className="space-y-1">
                  {ccpMappingResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {r.pass
                        ? <CheckCircle size={14} className="text-green-600 shrink-0" />
                        : <AlertTriangle size={14} className="text-red-600 shrink-0" />}
                      <span className="font-semibold text-[#1E2D4D]">{r.ccp}</span>
                      <span className="text-[#1E2D4D]/70">
                        {r.value}°F — {r.pass ? 'Within limit' : <span className="text-red-600 font-semibold">OUT OF LIMIT</span>}
                        {r.limit && <span className="text-[#1E2D4D]/30 ml-1">({r.limit})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-xl font-bold text-[#1E2D4D]">{t('checklists.todaysChecklists')}</h2>
              <span className="text-sm text-[#1E2D4D]/50">{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
            </div>

            {todayChecklists.length === 0 && (
              <PageEmptyState
                title="No checklists for today"
                description="Add a template from the Templates tab to get started."
                action={{ label: 'View Templates', onClick: () => setActiveView('templates') }}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {todayChecklists.map((cl) => {
                const pct = cl.total > 0 ? Math.round((cl.completed / cl.total) * 100) : 0;
                const statusColor = cl.status === 'complete' ? 'green' : cl.status === 'in_progress' ? 'yellow' : 'gray';
                const statusLabel = cl.status === 'complete' ? t('common.completed') : cl.status === 'in_progress' ? t('common.inProgress') : t('common.notStarted');
                const statusBg = cl.status === 'complete' ? 'bg-emerald-50 text-emerald-700' : cl.status === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/70';
                const barColor = cl.status === 'complete' ? '#22c55e' : cl.status === 'in_progress' ? '#eab308' : '#d1d5db';
                const iconBg = cl.status === 'complete' ? 'bg-green-100' : cl.status === 'in_progress' ? 'bg-yellow-100' : 'bg-[#1E2D4D]/5';
                const iconColor = cl.status === 'complete' ? 'text-green-600' : cl.status === 'in_progress' ? 'text-yellow-600' : 'text-[#1E2D4D]/30';

                return (
                  <div
                    key={cl.id}
                    className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 cursor-pointer transition-all hover:shadow-md hover:border-[#1E2D4D]/15"
                    onClick={() => {
                      // Find a matching template from user templates or demo items map
                      const match = templates.find(t => t.name === cl.name);
                      if (match) {
                        handleStartChecklist(match);
                      } else {
                        // Check demo items map for prebuilt templates
                        const demoMatch = Object.entries(demoItemsMap).find(([, items]) => items.length > 0 && todayChecklists.find(tc => tc.id === cl.id));
                        if (demoMatch) {
                          handleStartChecklist({ id: demoMatch[0], name: cl.name, checklist_type: 'custom', frequency: 'daily', is_active: true, items_count: cl.total });
                        } else {
                          toast.info(`${templateNameMap[cl.name] || cl.name} — ${cl.completed}/${cl.total} items complete`);
                        }
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-lg ${iconBg}`}>
                          {cl.status === 'complete' ? <Check className={`h-6 w-6 ${iconColor}`} /> : <CheckSquare className={`h-6 w-6 ${iconColor}`} />}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">{templateNameMap[cl.name] || cl.name}</h3>
                          <p className="text-sm text-[#1E2D4D]/50">{cl.location}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#1E2D4D]/70">{cl.completed}/{cl.total} {t('common.items')}</span>
                        <span className="font-semibold" style={{ color: barColor }}>{pct}%</span>
                      </div>
                      <div className="w-full bg-[#1E2D4D]/8 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-[#1E2D4D]/70 mb-4">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{cl.assignee}</span>
                      </div>
                      {cl.completedAt && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{cl.completedAt}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusBg}`}>{statusLabel}</span>
                        {cl.status === 'complete' && (
                          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-[#1E2D4D]/5 text-[#1E2D4D]/70">
                            <Camera className="h-3 w-3" />
                            {cl.completed > 3 ? 3 : 2} {t('common.photos')}
                          </span>
                        )}
                      </div>
                      {cl.status !== 'complete' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const match = templates.find(t => t.name === cl.name);
                            if (match) {
                              handleStartChecklist(match);
                            } else {
                              const demoMatch = Object.entries(demoItemsMap).find(([, items]) => items.length > 0 && todayChecklists.find(tc => tc.id === cl.id));
                              if (demoMatch) {
                                handleStartChecklist({ id: demoMatch[0], name: cl.name, checklist_type: 'custom', frequency: 'daily', is_active: true, items_count: cl.total });
                              } else {
                                toast.info(`${templateNameMap[cl.name] || cl.name} opened`);
                              }
                            }
                          }}
                          className="px-4 py-2 bg-[#1E2D4D] text-white text-sm rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] font-medium"
                        >
                          {cl.status === 'in_progress' ? t('common.continue') : t('common.start')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Templates View */}
        {activeView === 'templates' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-xl font-bold text-[#1E2D4D]">{t('checklists.checklistTemplates')}</h2>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] font-medium shadow-sm"
              >
                <Plus className="h-5 w-5" />
                <span>{t('checklists.newTemplate')}</span>
              </button>
            </div>

            {TEMPLATE_CATEGORIES.map((cat) => (
              <div key={cat.category}>
                <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-4 flex items-center space-x-2">
                  <CheckSquare className="h-5 w-5 text-[#1E2D4D]" />
                  <span>{categoryMap[cat.category] || cat.category}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cat.templates.map((tmpl) => {
                    const roleBg = tmpl.role === 'Manager' ? 'bg-purple-100 text-purple-700' : tmpl.role === 'Facilities' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700';
                    return (
                      <div key={tmpl.key} className="bg-white rounded-xl p-6 border border-[#1E2D4D]/10 hover:border-[#1E2D4D] transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-[#1E2D4D] text-base">{templateNameMap[tmpl.name] || tmpl.name}</h4>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleBg}`}>{roleMap[tmpl.role] || tmpl.role}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-[#1E2D4D]/50 mb-4">
                          <span>{tmpl.itemCount} {t('common.items')}</span>
                          <span>·</span>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{tmpl.estimatedTime}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5 mb-4 max-h-40 overflow-y-auto">
                          {tmpl.items.map((item, idx) => {
                            const title = getItemTitle(item);
                            const def = getItemDef(item);
                            return (
                              <div key={idx} className="flex items-start space-x-2 text-sm text-[#1E2D4D]/70">
                                <span className="text-[#1E2D4D]/30 flex-shrink-0 mt-0.5">○</span>
                                <span>
                                  {checklistItemMap[title] || title}
                                  {def.authority_source && (() => {
                                    const auth = AUTHORITY_LABELS[def.authority_source!];
                                    return auth ? (
                                      <span className="text-[11px] font-semibold px-1 py-0.5 rounded ml-1.5 inline-block"
                                        style={{ color: auth.color, backgroundColor: auth.bg }}>
                                        {auth.label}{def.authority_section ? ` ${def.authority_section}` : ''}
                                      </span>
                                    ) : null;
                                  })()}
                                  {def.haccp_ccp && (
                                    <span className="text-[11px] font-semibold px-1 py-0.5 rounded bg-amber-100 text-amber-800 ml-1 inline-block">
                                      {def.haccp_ccp}
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {PREBUILT_TEMPLATES[tmpl.key as keyof typeof PREBUILT_TEMPLATES] && (
                          <button
                            onClick={() => createPrebuiltTemplate(tmpl.key as keyof typeof PREBUILT_TEMPLATES)}
                            disabled={loading}
                            className="w-full px-4 py-2 border-2 border-[#1E2D4D] text-[#1E2D4D] rounded-lg hover:bg-[#1E2D4D] hover:text-white transition-colors font-medium text-sm disabled:opacity-50"
                          >
                            {t('checklists.useTemplate')}
                          </button>
                        )}
                        {/* CCP info for HACCP templates */}
                        {cat.category === 'HACCP Checklists' && (() => {
                          const ccpItems = tmpl.items.filter(item => {
                            const d = getItemDef(item);
                            return !!d.haccp_ccp;
                          });
                          const uniqueCcps = [...new Set(ccpItems.map(item => getItemDef(item).haccp_ccp))];
                          if (uniqueCcps.length === 0) return null;
                          return (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {uniqueCcps.map(ccp => {
                                const ccpItem = ccpItems.find(item => getItemDef(item).haccp_ccp === ccp);
                                const def = ccpItem ? getItemDef(ccpItem) : null;
                                return (
                                  <span key={ccp} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200" title={def?.haccp_critical_limit || ''}>
                                    <Shield size={10} />
                                    {ccp}
                                    {def?.haccp_critical_limit && <span className="text-amber-600 font-normal ml-0.5">{def.haccp_critical_limit}</span>}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        })()}
                        {/* CA Stage 1 callout for cooling_log */}
                        {tmpl.key === 'cooling_log' && (() => {
                          const isActive = new Date() >= new Date('2026-04-01');
                          return (
                            <div className={`mt-2 text-xs rounded-lg px-3 py-2 ${isActive ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                              <span className="font-bold">{isActive ? 'NOW IN EFFECT' : 'Effective Apr 1, 2026'}:</span>{' '}
                              CA Stage 1 — cooling clock starts at actual cooked temp, not 135°F. Stricter than FDA rule.
                              {isActive && <span className="font-semibold"> This template reflects the CA requirement.</span>}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Custom Templates */}
            {templates.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-4">Your Templates</h3>
                <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#1E2D4D]/10">
                    <thead className="bg-[#FAF7F0]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">{t('common.type')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">{t('common.items')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">{t('common.status')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-[#1E2D4D]/50 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#1E2D4D]/10">
                      {templates.map((template) => (
                        <tr key={template.id} className="hover:bg-[#FAF7F0]">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1E2D4D]">{templateNameMap[template.name] || template.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E2D4D]/70 capitalize hidden sm:table-cell">{template.checklist_type.replace('_', ' ')}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E2D4D]/70 hidden sm:table-cell">{template.items_count}</td>
                          <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${template.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/70'}`}>
                              {template.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleStartChecklist(template)} className="text-[#1E2D4D] hover:text-[#141E33]" title="Start checklist">
                                <Play className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleEditTemplate(template)} className="text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80" title="Edit template">
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDeleteTemplate(template.id)} className="text-red-600 hover:text-red-900" title="Delete template">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History View */}
        {activeView === 'history' && (() => {
          const now = new Date();
          const demoEntries = isDemoMode
            ? DEMO_HISTORY
            : completions.map(c => ({ id: c.id, date: c.completed_at, name: c.template_name, completedBy: c.completed_by_name, score: c.score_percentage, status: 'complete' as const, detail: undefined as string | undefined }));
          // Filter by date range
          const filteredEntries = demoEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            if (historyRange === 'today') {
              return entryDate.toDateString() === now.toDateString();
            } else if (historyRange === '7days') {
              return entryDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (historyRange === '14days') {
              return entryDate >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            } else if (historyRange === '30days') {
              return entryDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            } else if (historyRange === '90days') {
              return entryDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            } else if (historyRange === 'custom' && historyFrom && historyTo) {
              const from = new Date(historyFrom);
              const to = new Date(historyTo);
              to.setHours(23, 59, 59, 999);
              return entryDate >= from && entryDate <= to;
            }
            return true;
          });
          const rangeLabel = historyRange === 'today' ? 'Today' : historyRange === '7days' ? t('checklists.last7Days') : historyRange === '14days' ? t('checklists.last14Days') : historyRange === '30days' ? t('checklists.last30Days') : historyRange === '90days' ? t('checklists.last90Days') : t('checklists.customRange');

          return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-xl font-bold text-[#1E2D4D]">{t('checklists.checklistHistory')} — {rangeLabel}</h2>
              <div data-demo-allow className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Date Range</label>
                  <select
                    value={historyRange}
                    onChange={(e) => setHistoryRange(e.target.value)}
                    className="px-4 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] text-sm min-h-[44px]"
                  >
                    <option value="today">Today</option>
                    <option value="7days">{t('checklists.last7Days')}</option>
                    <option value="14days">{t('checklists.last14Days')}</option>
                    <option value="30days">{t('checklists.last30Days')}</option>
                    <option value="90days">{t('checklists.last90Days')}</option>
                    <option value="custom">{t('checklists.customRange')}</option>
                  </select>
                </div>
                {historyRange === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">From</label>
                      <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} className="px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] text-sm min-h-[44px]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">To</label>
                      <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} className="px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] text-sm min-h-[44px]" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="text-sm text-[#1E2D4D]/50">{filteredEntries.length} {t('checklists.entries')}</div>

            <div className="bg-white border border-[#1E2D4D]/10 rounded-xl overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-[#1E2D4D]/10">
                <thead className="bg-[#FAF7F0]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">{t('common.date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">{t('checklists.checklist')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">{t('common.completedBy')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">{t('common.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">{t('checklists.score')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#1E2D4D]/10">
                  {filteredEntries.map((entry) => {
                    const statusBadge = entry.status === 'missed'
                      ? 'bg-red-50 text-red-700'
                      : entry.status === 'incomplete'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-700';
                    const statusLabel = entry.status === 'missed' ? t('checklists.missed') : entry.status === 'incomplete' ? t('checklists.incomplete') : t('common.completed');
                    return (
                    <tr key={entry.id} className="hover:bg-[#FAF7F0]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E2D4D]">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                        <span className="text-[#1E2D4D]/30 ml-1 text-xs">{format(new Date(entry.date), 'h:mm a')}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1E2D4D]">
                        {templateNameMap[entry.name] || entry.name}
                        {entry.detail && <span className="block text-xs text-[#1E2D4D]/50">{entry.detail}</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E2D4D]/70 hidden sm:table-cell">
                        {entry.completedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge}`}>{statusLabel}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {entry.status === 'missed' ? (
                          <span className="text-sm font-medium text-red-600">--</span>
                        ) : (
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-[#1E2D4D]/8 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                entry.score >= 90 ? 'bg-green-500' : entry.score >= 70 ? 'bg-yellow-500' : 'bg-red-500' /* thresholds: 90/70 */
                              }`}
                              style={{ width: `${entry.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-[#1E2D4D]">{entry.score}%</span>
                        </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <PageEmptyState
                          title={t('checklists.noEntries')}
                          description="Try adjusting the date range filter."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {/* HACCP Control Points Summary — below checklists (checklists feed HACCP) */}
        <HACCPSummaryCard isDemoMode={isDemoMode} />
      </div>

      {/* Create Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto modal-content-enter">
            <h3 className="text-2xl font-bold tracking-tight mb-6">{t('checklists.createTemplate')}</h3>

            <form onSubmit={handleCreateTemplate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('checklists.templateName')}</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] min-h-[44px]"
                  placeholder="e.g., Morning Opening Checklist"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('common.type')}</label>
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] min-h-[44px]"
                  >
                    <option value="">Select type...</option>
                    {CHECKLIST_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('checklists.frequency')}</label>
                  <select
                    value={templateFrequency}
                    onChange={(e) => setTemplateFrequency(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] min-h-[44px]"
                  >
                    {FREQUENCIES.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {frequencyLabelMap[freq.label] || freq.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">{t('checklists.checklistItems')}</label>
                <div className="space-y-2 mb-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-[#FAF7F0] rounded-lg">
                      <span className="text-sm text-[#1E2D4D] flex-1">{item.title}</span>
                      <span className="text-xs text-[#1E2D4D]/50 capitalize">{item.type.replace('_', ' ')}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    className="flex-1 min-w-0 px-4 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] min-h-[44px]"
                    placeholder={t('checklists.itemTitle')}
                  />
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value)}
                    className="px-4 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] min-h-[44px]"
                  >
                    {ITEM_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {itemTypeLabelMap[type.label] || type.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-4 py-2 bg-[#1E2D4D]/10 text-[#1E2D4D]/80 rounded-lg hover:bg-[#1E2D4D]/15 transition-colors min-h-[44px]"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-6 py-3 border-2 border-[#1E2D4D] rounded-xl text-lg font-medium text-[#1E2D4D] hover:bg-[#FAF7F0] transition-colors bg-white min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-[#1E2D4D] text-white rounded-lg text-lg font-bold hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 shadow-sm min-h-[44px]"
                >
                  {loading ? t('checklists.creating') : t('checklists.createTemplate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Checklist Modal */}
      {showCompleteModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto modal-content-enter">
            <div className="mb-6">
              <h3 className="text-2xl font-bold tracking-tight text-[#1E2D4D]">{templateNameMap[selectedTemplate.name] || selectedTemplate.name}</h3>
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm text-[#1E2D4D]/70 mb-2">
                  <span>{t('checklists.progress')}</span>
                  <span className="font-medium">{currentProgress}%</span>
                </div>
                <div className="w-full bg-[#1E2D4D]/8 rounded-full h-3">
                  <div
                    className="bg-[#A08C5A] h-3 rounded-full transition-all duration-300"
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {templateItems.map((item, index) => (
                <div key={item.id} className="p-4 border border-[#1E2D4D]/10 rounded-xl">
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#1E2D4D] text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">{renderItemInput(item)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="px-6 py-3 border-2 border-[#1E2D4D] rounded-xl text-lg font-medium text-[#1E2D4D] hover:bg-[#FAF7F0] transition-colors bg-white min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCompletion}
                disabled={loading || currentProgress < 100}
                className="px-6 py-3 bg-[#1E2D4D] text-white rounded-lg text-lg font-bold hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 shadow-sm min-h-[44px]"
              >
                {loading ? t('common.submitting') : t('checklists.submitChecklist')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );
}
