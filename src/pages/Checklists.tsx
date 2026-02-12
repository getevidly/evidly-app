import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, CheckSquare, Clock, Edit2, Trash2, Play, X, Check, ChevronRight, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useTranslation } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';
import { PhotoButton, type PhotoRecord } from '../components/PhotoEvidence';
import { PhotoGallery } from '../components/PhotoGallery';
import { Camera } from 'lucide-react';

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
}

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

const TEMPLATE_CATEGORIES = [
  {
    category: 'Daily Operations',
    templates: [
      {
        key: 'opening',
        name: 'Opening Checklist',
        itemCount: 14,
        estimatedTime: '15-20 min',
        role: 'Kitchen Staff',
        items: [
          'Check sanitizer concentration',
          'Verify hot water temp',
          'Inspect handwash stations',
          'Check first aid kit',
          'Verify pest traps',
          'Temp check walk-in cooler',
          'Temp check walk-in freezer',
          'Temp check prep cooler',
          'Check dry storage',
          'Inspect prep surfaces',
          'Verify date labels',
          'Check FIFO rotation',
          'Review daily specials/allergens',
          'Verify staff certifications on duty',
        ],
      },
      {
        key: 'closing',
        name: 'Closing Checklist',
        itemCount: 11,
        estimatedTime: '20-25 min',
        role: 'Kitchen Staff',
        items: [
          'Final temp check all units',
          'Verify all active cooldowns on track (CA: 2hr from cooked temp to 70°F, then 4hr to 41°F)',
          'Clean and sanitize all prep surfaces',
          'Empty and clean grease traps',
          'Check floor drains',
          'Secure chemical storage',
          'Set pest control devices',
          'Check all doors/windows sealed',
          'Equipment shut down properly',
          'Waste removal complete',
          'Closing manager sign-off',
        ],
      },
      {
        key: 'midday',
        name: 'Mid-Day Food Safety Check',
        itemCount: 8,
        estimatedTime: '10-15 min',
        role: 'Kitchen Staff',
        items: [
          'Hot holding temps above 135°F',
          'Cold holding temps below 41°F',
          'Check sanitizer buckets refreshed',
          'Handwashing compliance spot check',
          'Cross-contamination check',
          'Date label compliance',
          'Employee hygiene check',
          'Corrective action review',
        ],
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
          'Verify internal temp of each protein type',
          'Check cooking equipment calibration',
          'Document any corrective actions',
          'Verify thermometer accuracy',
          'Record cook time',
          'Supervisor verification',
        ],
      },
      {
        key: 'cooling_log',
        name: 'Cooling Log',
        itemCount: 8,
        estimatedTime: '5 min per check',
        role: 'Kitchen Staff',
        items: [
          'Record start temp and time — clock starts NOW (CA: from cooked temp, not 135°F)',
          'FDA Stage 1: 135°F → 70°F within 2 hours',
          'CA Stage 1 (eff. Apr 1, 2026): Cooked temp → 70°F within 2 hours (stricter — clock starts at actual cooked temp)',
          'Check temp at 2-hour mark (must be at or below 70°F)',
          'Stage 2: 70°F → 41°F within 4 additional hours (6 hours total)',
          'Check temp at 6-hour mark (must be at or below 41°F)',
          'Document cooling method used (ice bath, blast chiller, shallow pans)',
          'Corrective action if temps not met — discard food or re-heat to 165°F and re-cool',
        ],
      },
      {
        key: 'receiving',
        name: 'Receiving Inspection',
        itemCount: 8,
        estimatedTime: '10-15 min',
        role: 'Manager',
        items: [
          'Check delivery truck temp',
          'Inspect packaging integrity',
          'Verify product temps (cold <41°F, frozen <0°F)',
          'Check date codes and expiration',
          'Inspect for pest evidence',
          'Verify order matches invoice',
          'Check for damaged goods',
          'Sign delivery receipt',
        ],
      },
      {
        key: 'hot_holding',
        name: 'Hot Holding Monitoring',
        itemCount: 4,
        estimatedTime: '5 min',
        role: 'Kitchen Staff',
        items: [
          'Verify all items above 135°F',
          'Check food covers in place',
          'Verify holding time labels',
          'Document any items discarded',
        ],
      },
      {
        key: 'cold_holding',
        name: 'Cold Holding Monitoring',
        itemCount: 4,
        estimatedTime: '5 min',
        role: 'Facilities',
        items: [
          'Verify all items below 41°F',
          'Check cooler door seals',
          'Verify date labels current',
          'Document any items discarded',
        ],
      },
    ],
  },
];

const DEMO_TODAY_CHECKLISTS = [
  {
    id: 't1',
    name: 'Opening Checklist',
    completed: 14,
    total: 14,
    status: 'complete' as const,
    assignee: 'Marcus J.',
    completedAt: '6:15 AM',
    location: 'Downtown Kitchen',
  },
  {
    id: 't2',
    name: 'Mid-Day Food Safety Check',
    completed: 5,
    total: 8,
    status: 'in_progress' as const,
    assignee: 'Sarah T.',
    completedAt: '',
    location: 'Downtown Kitchen',
  },
  {
    id: 't3',
    name: 'Closing Checklist',
    completed: 0,
    total: 10,
    status: 'not_started' as const,
    assignee: 'Evening Shift',
    completedAt: '',
    location: 'Downtown Kitchen',
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
    items: TEMPLATE_CATEGORIES[0].templates[0].items.map(title => ({ title, type: 'checkbox', required: true })),
  },
  closing: {
    name: 'Closing Checklist',
    type: 'closing',
    frequency: 'daily',
    items: TEMPLATE_CATEGORIES[0].templates[1].items.map(title => ({ title, type: 'checkbox', required: true })),
  },
  receiving: {
    name: 'Receiving Inspection',
    type: 'receiving',
    frequency: 'daily',
    items: TEMPLATE_CATEGORIES[1].templates[2].items.map(title => ({ title, type: 'checkbox', required: true })),
  },
};

export function Checklists() {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<'templates' | 'today' | 'history'>('today');
  const [demoItemsMap, setDemoItemsMap] = useState<Record<string, ChecklistTemplateItem[]>>({});
  const [todayChecklists, setTodayChecklists] = useState(DEMO_TODAY_CHECKLISTS);
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
    if (profile?.organization_id) {
      fetchTemplates();
      fetchCompletions();
    }
  }, [profile]);

  useEffect(() => {
    if (templateItems.length > 0) {
      const answered = Object.keys(itemResponses).length;
      setCurrentProgress(Math.round((answered / templateItems.length) * 100));
    }
  }, [itemResponses, templateItems]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('checklist_templates')
      .select('*, checklist_template_items(count)')
      .eq('organization_id', profile?.organization_id)
      .order('created_at', { ascending: false });

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
  };

  const fetchCompletions = async () => {
    const { data } = await supabase
      .from('checklist_template_completions')
      .select(`
        id,
        completed_at,
        score_percentage,
        checklist_templates!inner(name),
        user_profiles!checklist_template_completions_completed_by_fkey(full_name)
      `)
      .eq('organization_id', profile?.organization_id)
      .order('completed_at', { ascending: false })
      .limit(20);

    if (data) {
      const formattedCompletions = data.map((completion: any) => ({
        id: completion.id,
        template_name: completion.checklist_templates.name,
        completed_by_name: completion.user_profiles?.full_name || 'Unknown',
        score_percentage: completion.score_percentage || 0,
        completed_at: completion.completed_at,
      }));
      setCompletions(formattedCompletions);
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
        location: 'Downtown Kitchen',
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
        location: 'Downtown Kitchen',
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
    setItemResponses({
      ...itemResponses,
      [itemId]: {
        response_value: value,
        is_pass: isPass,
        corrective_action: correctiveAction,
      },
    });
  };

  const handleSubmitCompletion = async () => {
    if (!selectedTemplate) return;

    const requiredItems = templateItems.filter((item) => item.is_required);
    const answeredRequired = requiredItems.filter((item) => itemResponses[item.id]);

    if (answeredRequired.length < requiredItems.length) {
      toast.warning('Please complete all required items');
      return;
    }

    const passedItems = Object.values(itemResponses).filter(
      (r) => r.is_pass === null || r.is_pass === true
    ).length;
    const scorePercentage = Math.round((passedItems / templateItems.length) * 100);

    // Demo mode: update local state only
    if (isDemoMode || !profile?.organization_id) {
      setShowCompleteModal(false);
      setItemResponses({});
      if (scorePercentage === 100) {
        setTimeout(() => toast.success('Checklist completed with 100% score'), 100);
      } else {
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

    const responsesToInsert = Object.entries(itemResponses).map(([itemId, response]) => ({
      completion_id: completionData.id,
      template_item_id: itemId,
      response_value: response.response_value,
      is_pass: response.is_pass,
      corrective_action: response.corrective_action || null,
    }));

    await supabase.from('checklist_responses').insert(responsesToInsert);

    setLoading(false);
    setShowCompleteModal(false);
    setItemResponses({});
    fetchCompletions();

    if (scorePercentage === 100) {
      setTimeout(() => toast.success('Checklist completed with 100% score'), 100);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
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
  };

  const renderItemInput = (item: ChecklistTemplateItem) => {
    const response = itemResponses[item.id];

    switch (item.item_type) {
      case 'checkbox':
        return (
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={response?.response_value === 'checked'}
                onChange={(e) =>
                  handleItemResponse(item.id, e.target.checked ? 'checked' : 'unchecked', e.target.checked, '')
                }
                className="h-6 w-6 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
              />
              <span className="text-lg text-gray-900">{checklistItemMap[item.title] || item.title}</span>
              {item.is_required && <span className="text-red-600">*</span>}
            </label>
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
            <p className="text-lg text-gray-900 mb-3">
              {checklistItemMap[item.title] || item.title}
              {item.is_required && <span className="text-red-600 ml-1">*</span>}
            </p>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => handleItemResponse(item.id, 'yes', true, '')}
                className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all ${
                  response?.response_value === 'yes'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('common.no')}
              </button>
            </div>
            {response?.response_value === 'no' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.correctiveActionRequired')}</label>
                <textarea
                  value={response.corrective_action}
                  onChange={(e) =>
                    handleItemResponse(item.id, 'no', false, e.target.value)
                  }
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder="Describe the corrective action..."
                />
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
            <label className="block text-lg text-gray-900 mb-3">
              {checklistItemMap[item.title] || item.title}
              {item.is_required && <span className="text-red-600 ml-1">*</span>}
            </label>
            <input
              type="number"
              step="0.1"
              value={response?.response_value || ''}
              onChange={(e) => handleItemResponse(item.id, e.target.value, null, '')}
              className="w-full px-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              placeholder="00.0°F"
            />
            <div className="mt-2">
              <PhotoButton
                photos={itemPhotos[item.id] || []}
                onChange={(photos) => setItemPhotos(prev => ({ ...prev, [item.id]: photos }))}
              />
            </div>
          </div>
        );

      case 'text_input':
        return (
          <div>
            <label className="block text-lg text-gray-900 mb-3">
              {checklistItemMap[item.title] || item.title}
              {item.is_required && <span className="text-red-600 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={response?.response_value || ''}
              onChange={(e) => handleItemResponse(item.id, e.target.value, null, '')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
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

      default:
        return null;
    }
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: t('checklists.title') }]} />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('checklists.title')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('checklists.subtitle')}</p>
        </div>

        {/* View Tabs */}
        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveView('today')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeView === 'today'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('checklists.todaysChecklists')}
          </button>
          <button
            onClick={() => setActiveView('templates')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeView === 'templates'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('checklists.templates')}
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeView === 'history'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            History
          </button>
        </div>

        {/* Today's Checklists View */}
        {activeView === 'today' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-xl font-bold text-gray-900">{t('checklists.todaysChecklists')}</h2>
              <span className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {todayChecklists.map((cl) => {
                const pct = cl.total > 0 ? Math.round((cl.completed / cl.total) * 100) : 0;
                const statusColor = cl.status === 'complete' ? 'green' : cl.status === 'in_progress' ? 'yellow' : 'gray';
                const statusLabel = cl.status === 'complete' ? t('common.completed') : cl.status === 'in_progress' ? t('common.inProgress') : t('common.notStarted');
                const statusBg = cl.status === 'complete' ? 'bg-green-100 text-green-800' : cl.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600';
                const barColor = cl.status === 'complete' ? '#22c55e' : cl.status === 'in_progress' ? '#eab308' : '#d1d5db';
                const iconBg = cl.status === 'complete' ? 'bg-green-100' : cl.status === 'in_progress' ? 'bg-yellow-100' : 'bg-gray-100';
                const iconColor = cl.status === 'complete' ? 'text-green-600' : cl.status === 'in_progress' ? 'text-yellow-600' : 'text-gray-400';

                return (
                  <div key={cl.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-lg ${iconBg}`}>
                          {cl.status === 'complete' ? <Check className={`h-6 w-6 ${iconColor}`} /> : <CheckSquare className={`h-6 w-6 ${iconColor}`} />}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{templateNameMap[cl.name] || cl.name}</h3>
                          <p className="text-sm text-gray-500">{cl.location}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{cl.completed}/{cl.total} {t('common.items')}</span>
                        <span className="font-semibold" style={{ color: barColor }}>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
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
                          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            <Camera className="h-3 w-3" />
                            {cl.completed > 3 ? 3 : 2} {t('common.photos')}
                          </span>
                        )}
                      </div>
                      {cl.status !== 'complete' && (
                        <button
                          onClick={() => toast.info(`${templateNameMap[cl.name] || cl.name} opened`)}
                          className="px-4 py-2 bg-[#1e4d6b] text-white text-sm rounded-lg hover:bg-[#163a52] transition-colors font-medium"
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
          <div className="space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-xl font-bold text-gray-900">{t('checklists.checklistTemplates')}</h2>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-medium shadow-sm"
              >
                <Plus className="h-5 w-5" />
                <span>{t('checklists.newTemplate')}</span>
              </button>
            </div>

            {TEMPLATE_CATEGORIES.map((cat) => (
              <div key={cat.category}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <CheckSquare className="h-5 w-5 text-[#1e4d6b]" />
                  <span>{categoryMap[cat.category] || cat.category}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cat.templates.map((tmpl) => {
                    const roleBg = tmpl.role === 'Manager' ? 'bg-purple-100 text-purple-700' : tmpl.role === 'Facilities' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
                    return (
                      <div key={tmpl.key} className="bg-white rounded-lg shadow p-5 border border-gray-200 hover:border-[#1e4d6b] transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 text-base">{templateNameMap[tmpl.name] || tmpl.name}</h4>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleBg}`}>{roleMap[tmpl.role] || tmpl.role}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-gray-500 mb-4">
                          <span>{tmpl.itemCount} {t('common.items')}</span>
                          <span>·</span>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{tmpl.estimatedTime}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5 mb-4 max-h-40 overflow-y-auto">
                          {tmpl.items.map((item, idx) => (
                            <div key={idx} className="flex items-start space-x-2 text-sm text-gray-600">
                              <span className="text-gray-400 flex-shrink-0 mt-0.5">○</span>
                              <span>{checklistItemMap[item] || item}</span>
                            </div>
                          ))}
                        </div>
                        {PREBUILT_TEMPLATES[tmpl.key as keyof typeof PREBUILT_TEMPLATES] && (
                          <button
                            onClick={() => createPrebuiltTemplate(tmpl.key as keyof typeof PREBUILT_TEMPLATES)}
                            disabled={loading}
                            className="w-full px-4 py-2 border-2 border-[#1e4d6b] text-[#1e4d6b] rounded-lg hover:bg-[#1e4d6b] hover:text-white transition-colors font-medium text-sm disabled:opacity-50"
                          >
                            {t('checklists.useTemplate')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Custom Templates */}
            {templates.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Templates</h3>
                <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">{t('common.type')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">{t('common.items')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">{t('common.status')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {templates.map((template) => (
                        <tr key={template.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{templateNameMap[template.name] || template.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize hidden sm:table-cell">{template.checklist_type.replace('_', ' ')}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">{template.items_count}</td>
                          <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {template.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onClick={() => handleDeleteTemplate(template.id)} className="text-red-600 hover:text-red-900">
                              <Trash2 className="h-4 w-4" />
                            </button>
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
          const demoEntries = profile?.organization_id
            ? completions.map(c => ({ id: c.id, date: c.completed_at, name: c.template_name, completedBy: c.completed_by_name, score: c.score_percentage, status: 'complete' as const, detail: undefined as string | undefined }))
            : DEMO_HISTORY;
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
              <h2 className="text-xl font-bold text-gray-900">{t('checklists.checklistHistory')} — {rangeLabel}</h2>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <select
                    value={historyRange}
                    onChange={(e) => setHistoryRange(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-sm min-h-[44px]"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                      <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-sm min-h-[44px]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                      <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-sm min-h-[44px]" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-500">{filteredEntries.length} {t('checklists.entries')}</div>

            <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('checklists.checklist')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">{t('common.completedBy')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">{t('common.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('checklists.score')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEntries.map((entry) => {
                    const statusBadge = entry.status === 'missed'
                      ? 'bg-red-100 text-red-800'
                      : entry.status === 'incomplete'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800';
                    const statusLabel = entry.status === 'missed' ? t('checklists.missed') : entry.status === 'incomplete' ? t('checklists.incomplete') : t('common.completed');
                    return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                        <span className="text-gray-400 ml-1 text-xs">{format(new Date(entry.date), 'h:mm a')}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {templateNameMap[entry.name] || entry.name}
                        {entry.detail && <span className="block text-xs text-gray-500">{entry.detail}</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">
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
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                entry.score >= 90 ? 'bg-green-500' : entry.score >= 70 ? 'bg-yellow-500' : 'bg-red-500' /* thresholds: 90/70 */
                              }`}
                              style={{ width: `${entry.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{entry.score}%</span>
                        </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        {t('checklists.noEntries')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}
      </div>

      {/* Create Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">{t('checklists.createTemplate')}</h3>

            <form onSubmit={handleCreateTemplate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('checklists.templateName')}</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] min-h-[44px]"
                  placeholder="e.g., Morning Opening Checklist"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.type')}</label>
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] min-h-[44px]"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('checklists.frequency')}</label>
                  <select
                    value={templateFrequency}
                    onChange={(e) => setTemplateFrequency(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] min-h-[44px]"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('checklists.checklistItems')}</label>
                <div className="space-y-2 mb-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-900 flex-1">{item.title}</span>
                      <span className="text-xs text-gray-500 capitalize">{item.type.replace('_', ' ')}</span>
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
                    className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] min-h-[44px]"
                    placeholder={t('checklists.itemTitle')}
                  />
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] min-h-[44px]"
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
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors min-h-[44px]"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-6 py-3 border-2 border-[#1e4d6b] rounded-lg text-lg font-medium text-[#1e4d6b] hover:bg-gray-50 transition-colors bg-white min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-[#1e4d6b] text-white rounded-lg text-lg font-bold hover:bg-[#163a52] transition-colors disabled:opacity-50 shadow-sm min-h-[44px]"
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
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{templateNameMap[selectedTemplate.name] || selectedTemplate.name}</h3>
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>{t('checklists.progress')}</span>
                  <span className="font-medium">{currentProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-[#d4af37] h-3 rounded-full transition-all duration-300"
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {templateItems.map((item, index) => (
                <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#1e4d6b] text-white rounded-full flex items-center justify-center font-bold">
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
                className="px-6 py-3 border-2 border-[#1e4d6b] rounded-lg text-lg font-medium text-[#1e4d6b] hover:bg-gray-50 transition-colors bg-white min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCompletion}
                disabled={loading || currentProgress < 100}
                className="px-6 py-3 bg-[#1e4d6b] text-white rounded-lg text-lg font-bold hover:bg-[#163a52] transition-colors disabled:opacity-50 shadow-sm min-h-[44px]"
              >
                {loading ? t('common.submitting') : t('checklists.submitChecklist')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
