import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Plus, CheckSquare, Clock, Edit2, Trash2, Play, X, Check, ChevronRight, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';

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
        itemCount: 10,
        estimatedTime: '20-25 min',
        role: 'Kitchen Staff',
        items: [
          'Final temp check all units',
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
        itemCount: 5,
        estimatedTime: '5 min per check',
        role: 'Kitchen Staff',
        items: [
          'Record start temp and time',
          'Check temp at 2-hour mark (must reach 70°F)',
          'Check temp at 6-hour mark (must reach 41°F)',
          'Document cooling method used',
          'Corrective action if temps not met',
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
  const entries: { id: string; date: string; name: string; completedBy: string; score: number }[] = [];
  const checklists = ['Opening Checklist', 'Mid-Day Food Safety Check', 'Closing Checklist', 'Receiving Inspection', 'Cooking Temperature Log'];
  const people = ['Marcus J.', 'Sarah T.', 'Emma D.', 'David P.', 'Mike R.'];
  let id = 1;
  for (let day = 0; day < 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    const count = day === 0 ? 2 : 3;
    for (let j = 0; j < count; j++) {
      entries.push({
        id: String(id++),
        date: date.toISOString(),
        name: checklists[(day + j) % checklists.length],
        completedBy: people[(day + j) % people.length],
        score: day === 0 && j === 0 ? 100 : 85 + Math.floor(Math.random() * 16),
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
  const [activeView, setActiveView] = useState<'templates' | 'today' | 'history'>('today');
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [completions, setCompletions] = useState<ChecklistCompletion[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [templateItems, setTemplateItems] = useState<ChecklistTemplateItem[]>([]);
  const [itemResponses, setItemResponses] = useState<ItemResponse>({});
  const [loading, setLoading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);

  // Template form state
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('');
  const [templateFrequency, setTemplateFrequency] = useState('daily');
  const [items, setItems] = useState<{ title: string; type: string; required: boolean }[]>([]);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemType, setNewItemType] = useState('checkbox');

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
        alert(`Error creating template: ${templateError.message}`);
        return;
      }

      if (!templateData) {
        setLoading(false);
        alert('Error: No data returned after creating template');
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
        alert(`Error creating template items: ${itemsError.message}`);
      } else {
        alert('Template created!');
      }

      setLoading(false);
      fetchTemplates();
    } catch (error) {
      console.error('Unexpected error:', error);
      setLoading(false);
      alert('An unexpected error occurred');
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
      alert('Please add at least one item to the checklist');
      return;
    }

    setLoading(true);

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
        alert(`Error creating template: ${templateError.message}`);
        return;
      }

      if (!templateData) {
        setLoading(false);
        alert('Error: No data returned after creating template');
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
        alert(`Error creating template items: ${itemsError.message}`);
      } else {
        alert('Template created!');
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
      alert('An unexpected error occurred');
    }
  };

  const handleStartChecklist = async (template: ChecklistTemplate) => {
    setSelectedTemplate(template);

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
      alert('Please complete all required items');
      return;
    }

    setLoading(true);

    const { data: locationData } = await supabase
      .from('locations')
      .select('id')
      .eq('organization_id', profile?.organization_id)
      .limit(1)
      .maybeSingle();

    const passedItems = Object.values(itemResponses).filter(
      (r) => r.is_pass === null || r.is_pass === true
    ).length;
    const scorePercentage = Math.round((passedItems / templateItems.length) * 100);

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
      alert('Error saving checklist completion');
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
      setTimeout(() => alert('🎉 Checklist completed with 100% score!'), 100);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    await supabase.from('checklist_templates').delete().eq('id', templateId);
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
              <span className="text-lg text-gray-900">{item.title}</span>
              {item.is_required && <span className="text-red-600">*</span>}
            </label>
          </div>
        );

      case 'yes_no':
        return (
          <div>
            <p className="text-lg text-gray-900 mb-3">
              {item.title}
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
                Yes
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
                No
              </button>
            </div>
            {response?.response_value === 'no' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Corrective Action Required</label>
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
          </div>
        );

      case 'temperature':
        return (
          <div>
            <label className="block text-lg text-gray-900 mb-3">
              {item.title}
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
          </div>
        );

      case 'text_input':
        return (
          <div>
            <label className="block text-lg text-gray-900 mb-3">
              {item.title}
              {item.is_required && <span className="text-red-600 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={response?.response_value || ''}
              onChange={(e) => handleItemResponse(item.id, e.target.value, null, '')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              placeholder="Enter your response..."
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout title="Checklists">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Checklists' }]} />
      <div className="space-y-6">
        {/* View Tabs */}
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setActiveView('today')}
            className={`px-4 py-2 font-medium ${
              activeView === 'today'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Today's Checklists
          </button>
          <button
            onClick={() => setActiveView('templates')}
            className={`px-4 py-2 font-medium ${
              activeView === 'templates'
                ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 font-medium ${
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
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Today's Checklists</h2>
              <span className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {DEMO_TODAY_CHECKLISTS.map((cl) => {
                const pct = cl.total > 0 ? Math.round((cl.completed / cl.total) * 100) : 0;
                const statusColor = cl.status === 'complete' ? 'green' : cl.status === 'in_progress' ? 'yellow' : 'gray';
                const statusLabel = cl.status === 'complete' ? 'Complete' : cl.status === 'in_progress' ? 'In Progress' : 'Not Started';
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
                          <h3 className="text-lg font-semibold text-gray-900">{cl.name}</h3>
                          <p className="text-sm text-gray-500">{cl.location}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{cl.completed}/{cl.total} items</span>
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
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusBg}`}>{statusLabel}</span>
                      {cl.status !== 'complete' && (
                        <button className="px-4 py-2 bg-[#1e4d6b] text-white text-sm rounded-lg hover:bg-[#2a6a8f] transition-colors font-medium">
                          {cl.status === 'in_progress' ? 'Continue' : 'Start'}
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
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Checklist Templates</h2>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] transition-colors font-medium shadow-sm"
              >
                <Plus className="h-5 w-5" />
                <span>New Template</span>
              </button>
            </div>

            {TEMPLATE_CATEGORIES.map((cat) => (
              <div key={cat.category}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <CheckSquare className="h-5 w-5 text-[#1e4d6b]" />
                  <span>{cat.category}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cat.templates.map((tmpl) => {
                    const roleBg = tmpl.role === 'Manager' ? 'bg-purple-100 text-purple-700' : tmpl.role === 'Facilities' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
                    return (
                      <div key={tmpl.key} className="bg-white rounded-lg shadow p-5 border border-gray-200 hover:border-[#1e4d6b] transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 text-base">{tmpl.name}</h4>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleBg}`}>{tmpl.role}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-gray-500 mb-4">
                          <span>{tmpl.itemCount} items</span>
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
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                        {PREBUILT_TEMPLATES[tmpl.key as keyof typeof PREBUILT_TEMPLATES] && (
                          <button
                            onClick={() => createPrebuiltTemplate(tmpl.key as keyof typeof PREBUILT_TEMPLATES)}
                            disabled={loading}
                            className="w-full px-4 py-2 border-2 border-[#1e4d6b] text-[#1e4d6b] rounded-lg hover:bg-[#1e4d6b] hover:text-white transition-colors font-medium text-sm disabled:opacity-50"
                          >
                            Use Template
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
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {templates.map((template) => (
                        <tr key={template.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{template.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{template.checklist_type.replace('_', ' ')}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{template.items_count}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
        {activeView === 'history' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Checklist History — Last 7 Days</h2>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checklist</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(profile?.organization_id ? completions.map(c => ({
                    id: c.id,
                    date: c.completed_at,
                    name: c.template_name,
                    completedBy: c.completed_by_name,
                    score: c.score_percentage,
                  })) : DEMO_HISTORY).map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entry.completedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                entry.score >= 90 ? 'bg-green-500' : entry.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${entry.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{entry.score}%</span>
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

      {/* Create Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">Create Checklist Template</h3>

            <form onSubmit={handleCreateTemplate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder="e.g., Morning Opening Checklist"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                  <select
                    value={templateFrequency}
                    onChange={(e) => setTemplateFrequency(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    {FREQUENCIES.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Checklist Items</label>
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

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    placeholder="Item title..."
                  />
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  >
                    {ITEM_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-6 py-3 border-2 border-[#1e4d6b] rounded-lg text-lg font-medium text-[#1e4d6b] hover:bg-gray-50 transition-colors bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-[#1e4d6b] text-white rounded-lg text-lg font-bold hover:bg-[#2a6a8f] transition-colors disabled:opacity-50 shadow-sm"
                >
                  {loading ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Checklist Modal */}
      {showCompleteModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h3>
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
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

            <div className="grid grid-cols-2 gap-4 mt-6">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="px-6 py-3 border-2 border-[#1e4d6b] rounded-lg text-lg font-medium text-[#1e4d6b] hover:bg-gray-50 transition-colors bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCompletion}
                disabled={loading || currentProgress < 100}
                className="px-6 py-3 bg-[#1e4d6b] text-white rounded-lg text-lg font-bold hover:bg-[#2a6a8f] transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? 'Submitting...' : 'Submit Checklist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
