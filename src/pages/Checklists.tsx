import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, X, Check, AlertTriangle, CheckCircle, Library, Clock, ClipboardList } from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useTranslation } from '../contexts/LanguageContext';
import { format } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';
import { Modal } from '../components/ui/Modal';
import { PhotoButton, type PhotoRecord } from '../components/PhotoEvidence';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { useNotifications } from '../contexts/NotificationContext';
import { PageEmptyState } from '../components/shared/PageStates';
import { usePageTitle } from '../hooks/usePageTitle';
import { Avatar } from '../components/ui/Avatar';
import { colors } from '../lib/designSystem';
import { ChecklistsPRPBand } from '../components/checklists/ChecklistsPRPBand';
import { ChecklistsEmptyState } from '../components/checklists/ChecklistsEmptyState';
import { ChecklistsLibraryPreview } from '../components/checklists/ChecklistsLibraryPreview';
import { ChecklistsHistoryEmptyState } from '../components/checklists/ChecklistsHistoryEmptyState';
import { ChecklistsHistoryRoadmap } from '../components/checklists/ChecklistsHistoryRoadmap';
import {
  useMasterChecklistDefinitions,
  useMasterChecklistDefinitionItems,
  useCustomerChecklistInstances,
  useCustomerChecklistInstanceItems,
  useChecklistAdoption,
  useStartChecklist,
  useBatchChecklistResponses,
  useCompleteChecklist,
  useAbandonChecklist,
  useTodayChecklists,
  useChecklistTemplateUsage,
  useChecklistHistory,
  useDeactivateInstance,
  type MasterChecklistDefinition,
  type MasterChecklistItem,
  type CustomerChecklistInstance,
  type InstanceItem,
  type TodayChecklist,
} from '../hooks/checklists';



// ── Cadence display labels ────────────────────────────────────────────────

const CADENCE_LABELS: Record<string, string> = {
  per_shift: 'Per Shift',
  multiple_daily: 'Multiple Daily',
  once_daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  on_demand: 'On Demand',
};

// ── Shift window helpers ──────────────────────────────────────────────────

interface ShiftWindow {
  label: string;
  startHour: number;
  endHour: number;
}

const DEFAULT_WINDOWS: ShiftWindow[] = [
  { label: 'AM Shift', startHour: 6, endHour: 12 },
  { label: 'PM Shift', startHour: 12, endHour: 18 },
  { label: 'Evening', startHour: 18, endHour: 22 },
  { label: 'Overnight', startHour: 22, endHour: 6 },
];

function getCurrentShiftWindow(dueWindows?: unknown[]): ShiftWindow {
  const now = new Date();
  const hour = now.getHours();

  // If instance has custom due_windows, attempt to parse them
  if (Array.isArray(dueWindows) && dueWindows.length > 0) {
    for (const w of dueWindows) {
      const win = w as { label?: string; startHour?: number; endHour?: number };
      if (
        typeof win.startHour === 'number' &&
        typeof win.endHour === 'number'
      ) {
        if (win.startHour <= win.endHour) {
          if (hour >= win.startHour && hour < win.endHour) {
            return { label: win.label ?? 'Shift', startHour: win.startHour, endHour: win.endHour };
          }
        } else {
          // Overnight wrap (e.g. 22-6)
          if (hour >= win.startHour || hour < win.endHour) {
            return { label: win.label ?? 'Shift', startHour: win.startHour, endHour: win.endHour };
          }
        }
      }
    }
  }

  // Fall back to default windows
  for (const w of DEFAULT_WINDOWS) {
    if (w.startHour <= w.endHour) {
      if (hour >= w.startHour && hour < w.endHour) return w;
    } else {
      if (hour >= w.startHour || hour < w.endHour) return w;
    }
  }
  return DEFAULT_WINDOWS[0];
}

function formatTimeRemaining(window: ShiftWindow): string {
  const now = new Date();
  const endToday = new Date();
  endToday.setHours(window.endHour, 0, 0, 0);
  if (window.endHour <= window.startHour) {
    // Overnight: end is tomorrow
    endToday.setDate(endToday.getDate() + 1);
  }
  const diffMs = endToday.getTime() - now.getTime();
  if (diffMs <= 0) return 'Due now';
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  if (diffH > 0) return `${diffH}h ${diffM}m remaining`;
  return `${diffM}m remaining`;
}

function formatTimePastDue(window: ShiftWindow): string {
  const now = new Date();
  const endToday = new Date();
  endToday.setHours(window.endHour, 0, 0, 0);
  if (window.endHour <= window.startHour && now.getHours() >= window.startHour) {
    endToday.setDate(endToday.getDate() + 1);
  }
  const diffMs = now.getTime() - endToday.getTime();
  if (diffMs <= 0) return '';
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  if (diffH > 0) return `${diffH}h ${diffM}m overdue`;
  return `${diffM}m overdue`;
}

// ── Card status derivation ───────────────────────────────────────────────

type CardStatus = 'completed' | 'in_progress' | 'overdue' | 'not_started';

function getCardStatus(tc: TodayChecklist): CardStatus {
  if (tc.latestCompletionStatus === 'completed' && !tc.isDue) return 'completed';
  if (tc.latestCompletionStatus === 'in_progress') return 'in_progress';
  if (tc.isDue) {
    // Check if past current shift window end
    const window = getCurrentShiftWindow(tc.instance.dueWindows);
    const pastDue = formatTimePastDue(window);
    if (pastDue) return 'overdue';
  }
  return 'not_started';
}

const CARD_STATUS_SORT: Record<CardStatus, number> = {
  overdue: 0,
  in_progress: 1,
  not_started: 2,
  completed: 3,
};

const STATUS_CONFIG: Record<CardStatus, {
  borderColor: string;
  iconBg: string;
  iconColor: string;
  pillBg: string;
  pillText: string;
  pillLabel: string;
  btnBg: string;
  btnText: string;
  btnBorder?: string;
  btnLabel: string;
}> = {
  completed: {
    borderColor: '#059669',
    iconBg: '#D1FAE5',
    iconColor: '#059669',
    pillBg: '#059669',
    pillText: '#FFFFFF',
    pillLabel: 'COMPLETED',
    btnBg: '#FFFFFF',
    btnText: '#1E2D4D',
    btnBorder: '1px solid #E5E0D8',
    btnLabel: 'View',
  },
  in_progress: {
    borderColor: '#D97706',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    pillBg: '#FEF3C7',
    pillText: '#D97706',
    pillLabel: 'IN PROGRESS',
    btnBg: '#D97706',
    btnText: '#FFFFFF',
    btnLabel: 'Continue',
  },
  overdue: {
    borderColor: '#DC2626',
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    pillBg: '#DC2626',
    pillText: '#FFFFFF',
    pillLabel: 'OVERDUE',
    btnBg: '#DC2626',
    btnText: '#FFFFFF',
    btnLabel: 'Start Late',
  },
  not_started: {
    borderColor: '#E5E0D8',
    iconBg: '#FAF7F0',
    iconColor: '#1E2D4D',
    pillBg: '#F0EDE6',
    pillText: '#94A3B8',
    pillLabel: 'NOT STARTED',
    btnBg: '#1E2D4D',
    btnText: '#FAF7F0',
    btnLabel: 'Start',
  },
};

// ── Item response local state ─────────────────────────────────────────────

interface ItemResponseState {
  [masterItemId: string]: {
    responseValue: string;
    isPass: boolean | null;
    correctiveAction: string;
  };
}

// ── Main Component ────────────────────────────────────────────────────────

export function Checklists() {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { t } = useTranslation();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  usePageTitle('Checklists');
  const { notifications, setNotifications } = useNotifications();

  // ── Tab state ───────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<'today' | 'library' | 'history'>('today');

  // ── Hooks: Master library ───────────────────────────────────────────────
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCadence, setLibraryCadence] = useState('');
  const { data: masterDefinitions, isLoading: masterLoading } = useMasterChecklistDefinitions({
    search: librarySearch || undefined,
    cadence: libraryCadence || undefined,
  });

  // ── Hooks: Customer instances ───────────────────────────────────────────
  const { data: instances, isLoading: instancesLoading, refetch: refetchInstances } = useCustomerChecklistInstances();
  const { isAdopted, getInstanceForDefinition } = useChecklistTemplateUsage(instances ?? []);
  const { todayChecklists: computedTodayChecklists, isLoading: todayLoading, refetch: refetchToday } = useTodayChecklists(instances ?? []);

  // ── Hooks: Mutations ────────────────────────────────────────────────────
  const { mutate: adoptChecklist, isLoading: adoptLoading } = useChecklistAdoption();
  const { mutate: startChecklist } = useStartChecklist();
  const { mutate: submitResponses } = useBatchChecklistResponses();
  const { mutate: completeChecklist } = useCompleteChecklist();
  const { mutate: abandonChecklist } = useAbandonChecklist();
  const { mutate: deactivateInstance } = useDeactivateInstance();

  // ── Hooks: History ──────────────────────────────────────────────────────
  const [historyRange, setHistoryRange] = useState('7days');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [historyInstanceFilter, setHistoryInstanceFilter] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');
  const historyDateFrom = useMemo(() => {
    if (historyRange === '7days') return new Date(Date.now() - 7 * 86400000).toISOString();
    if (historyRange === '30days') return new Date(Date.now() - 30 * 86400000).toISOString();
    return historyFrom || undefined;
  }, [historyRange, historyFrom]);
  const historyDateTo = useMemo(() => {
    return historyRange === 'custom' ? historyTo || undefined : undefined;
  }, [historyRange, historyTo]);
  const { data: historyData, isLoading: historyLoading } = useChecklistHistory({
    dateFrom: historyDateFrom,
    dateTo: historyDateTo,
    instanceId: historyInstanceFilter || undefined,
    status: historyStatusFilter || undefined,
  });

  // ── Adoption modal state ────────────────────────────────────────────────
  const [adoptModal, setAdoptModal] = useState<MasterChecklistDefinition | null>(null);
  const [adoptModalItems, setAdoptModalItems] = useState<MasterChecklistItem[]>([]);
  const adoptItemsQuery = useMasterChecklistDefinitionItems(adoptModal?.id);

  useEffect(() => {
    if (adoptItemsQuery.data) setAdoptModalItems(adoptItemsQuery.data);
  }, [adoptItemsQuery.data]);

  // ── Execution modal state ───────────────────────────────────────────────
  const [execInstance, setExecInstance] = useState<CustomerChecklistInstance | null>(null);
  const [execCompletionId, setExecCompletionId] = useState<string | null>(null);
  const [execItems, setExecItems] = useState<InstanceItem[]>([]);
  const [itemResponses, setItemResponses] = useState<ItemResponseState>({});
  const [itemPhotos, setItemPhotos] = useState<Record<string, PhotoRecord[]>>({});
  const [execLoading, setExecLoading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [ccpMappingResults, setCcpMappingResults] = useState<{ ccp: string; value: string; pass: boolean; limit: string }[]>([]);

  const execItemsQuery = useCustomerChecklistInstanceItems(execInstance?.id);
  useEffect(() => {
    if (execItemsQuery.data && execItemsQuery.data.length > 0) {
      setExecItems(execItemsQuery.data);
    }
  }, [execItemsQuery.data]);

  // ── Progress computation ────────────────────────────────────────────────
  useEffect(() => {
    if (execItems.length > 0) {
      const answered = Object.keys(itemResponses).length;
      setCurrentProgress(Math.round((answered / execItems.length) * 100));
    } else {
      setCurrentProgress(0);
    }
  }, [itemResponses, execItems]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleAdopt = async () => {
    if (!adoptModal) return;

    guardAction('adopt', 'checklist library', async () => {
      try {
        const result = await adoptChecklist({
          masterDefinitionId: adoptModal.id,
        });
        toast.success(`"${adoptModal.name}" adopted (${result.itemCount} items)`);
        setAdoptModal(null);
        refetchInstances();
        refetchToday();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to adopt checklist');
      }
    });
  };

  const handleStartExecution = async (todayItem: TodayChecklist) => {
    const inst = todayItem.instance;
    setExecInstance(inst);
    setItemResponses({});
    setItemPhotos({});
    setExecItems([]);
    setExecCompletionId(null);

    if (isDemoMode || !profile?.organization_id) {
      // Demo mode: open modal with empty execution
      return;
    }

    try {
      const result = await startChecklist({
        instanceId: inst.id,
        locationId: profile?.organization_id ?? '', // fallback; real location should come from context
        masterVersionSnapshot: inst.masterVersionPinned ?? '1.0.0',
      });
      setExecCompletionId(result.completionId);
    } catch (err) {
      toast.error('Failed to start checklist');
      setExecInstance(null);
    }
  };

  const handleItemResponse = (masterItemId: string, value: string, isPass: boolean | null, correctiveAction = '') => {
    const item = execItems.find(i => i.masterItemId === masterItemId);
    if (item?.promptType === 'temp_reading' && value) {
      const numVal = parseFloat(value);
      if (!isNaN(numVal)) {
        if (item.tempMax != null && numVal > item.tempMax) isPass = false;
        else if (item.tempMin != null && numVal < item.tempMin) isPass = false;
        else if (item.tempMax != null || item.tempMin != null) isPass = true;
      }
    }
    setItemResponses(prev => ({
      ...prev,
      [masterItemId]: { responseValue: value, isPass, correctiveAction },
    }));
  };

  const handleSubmitExecution = async () => {
    if (!execInstance) return;

    // Validate required items
    const required = execItems.filter(i => i.isRequired);
    const answeredRequired = required.filter(i => itemResponses[i.masterItemId]);
    if (answeredRequired.length < required.length) {
      toast.warning('Please complete all required items');
      return;
    }

    // Validate photo evidence for failed items
    const failedMissingPhoto = execItems.filter(item => {
      if (!item.requiresPhotoOnFail) return false;
      const resp = itemResponses[item.masterItemId];
      return resp?.isPass === false && !(itemPhotos[item.masterItemId]?.length > 0);
    });
    if (failedMissingPhoto.length > 0) {
      toast.warning('Photo evidence required for failed items');
      return;
    }

    // Validate corrective actions for failed CCP items
    const failedCCPsMissingCA = execItems.filter(item => {
      if (!item.haccpCcp) return false;
      const resp = itemResponses[item.masterItemId];
      return resp?.isPass === false && !resp.correctiveAction?.trim();
    });
    if (failedCCPsMissingCA.length > 0) {
      toast.warning('Corrective action required for all out-of-limit CCP items');
      return;
    }

    setExecLoading(true);

    // Demo mode: simulate submission
    if (isDemoMode || !profile?.organization_id) {
      const ccpResults = execItems
        .filter(item => item.haccpCcp && itemResponses[item.masterItemId])
        .map(item => ({
          ccp: item.haccpCcp!,
          value: itemResponses[item.masterItemId].responseValue,
          pass: itemResponses[item.masterItemId].isPass !== false,
          limit: item.haccpCriticalLimit || '',
        }));

      if (ccpResults.length > 0) {
        setCcpMappingResults(ccpResults);
        toast.success(`${ccpResults.length} CCP monitoring log(s) auto-populated`);
        const failedCCPs = ccpResults.filter(r => !r.pass);
        if (failedCCPs.length > 0) {
          const newNotifs = failedCCPs.map(r => ({
            id: `ccp-alert-${Date.now()}-${r.ccp}`,
            title: `CCP Out of Limit: ${r.ccp} — ${r.value}°F (limit: ${r.limit})`,
            time: new Date().toISOString(),
            link: '/haccp',
            type: 'alert' as const,
          }));
          setNotifications([...newNotifs, ...notifications]);
        }
      }
      setExecInstance(null);
      setExecLoading(false);
      setItemResponses({});
      return;
    }

    // Production: submit responses then complete
    try {
      if (!execCompletionId) throw new Error('No active completion');

      const responses = execItems
        .filter(i => itemResponses[i.masterItemId])
        .map(i => {
          const resp = itemResponses[i.masterItemId];
          const numTemp = i.promptType === 'temp_reading' && resp.responseValue
            ? parseFloat(resp.responseValue)
            : undefined;
          return {
            completionId: execCompletionId,
            masterItemId: i.masterItemId,
            responseValue: resp.responseValue,
            responseType: i.promptType,
            isPass: resp.isPass ?? undefined,
            temperatureReading: numTemp && !isNaN(numTemp) ? numTemp : undefined,
            correctiveAction: resp.correctiveAction || undefined,
            photoUrl: itemPhotos[i.masterItemId]?.[0]?.url || undefined,
          };
        });

      await submitResponses(responses);
      const result = await completeChecklist({ completionId: execCompletionId });

      toast.success(`Checklist completed — ${result.scorePercentage ?? 100}% score`);
      setExecInstance(null);
      setExecCompletionId(null);
      setItemResponses({});
      setItemPhotos({});
      refetchToday();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit checklist');
    } finally {
      setExecLoading(false);
    }
  };

  const handleCancelExecution = async () => {
    if (execCompletionId && !isDemoMode) {
      try {
        await abandonChecklist({ completionId: execCompletionId });
      } catch { /* silent */ }
    }
    setExecInstance(null);
    setExecCompletionId(null);
    setItemResponses({});
    setItemPhotos({});
  };

  const handleDeactivate = (instanceId: string) => {
    guardAction('deactivate', 'checklist instance', async () => {
      try {
        await deactivateInstance({ instanceId });
        toast.success('Checklist deactivated');
        refetchInstances();
        refetchToday();
      } catch (err) {
        toast.error('Failed to deactivate');
      }
    });
  };

  // ── Render item input by prompt_type ────────────────────────────────────
  // Handles all 7 CHECK constraint values: yes_no, temp_reading, photo,
  // text, multi_select, date, numeric

  const renderItemInput = (item: InstanceItem) => {
    const resp = itemResponses[item.masterItemId];
    const displayLabel = item.displayLabel ?? item.prompt;
    const expected = item.expectedResponse as Record<string, unknown> | null;

    switch (item.promptType) {
      case 'yes_no':
        return (
          <div>
            <label className="block text-sm font-medium text-[#1E2D4D] mb-1">
              {displayLabel}
              {item.isCritical && <span className="ml-1 text-xs text-red-600 font-bold">CCP</span>}
            </label>
            {item.helpText && <p className="text-xs text-[#1E2D4D]/50 mb-1">{item.helpText}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleItemResponse(item.masterItemId, 'yes', true)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  resp?.responseValue === 'yes'
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/70 hover:bg-[#1E2D4D]/10'
                }`}
              >
                Pass
              </button>
              <button
                type="button"
                onClick={() => handleItemResponse(item.masterItemId, 'no', false)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  resp?.responseValue === 'no'
                    ? 'bg-red-100 text-red-700 border-2 border-red-300'
                    : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/70 hover:bg-[#1E2D4D]/10'
                }`}
              >
                Fail
              </button>
            </div>
            {resp?.isPass === false && item.requiresCorrectiveAction && (
              <input
                type="text"
                placeholder="Corrective action taken..."
                value={resp?.correctiveAction ?? ''}
                onChange={(e) => handleItemResponse(item.masterItemId, resp.responseValue, resp.isPass, e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            )}
            {resp?.isPass === false && item.requiresPhotoOnFail && (
              <div className="mt-2">
                <PhotoButton
                  photos={itemPhotos[item.masterItemId] ?? []}
                  onPhotosChange={(photos) => setItemPhotos(prev => ({ ...prev, [item.masterItemId]: photos }))}
                />
              </div>
            )}
          </div>
        );

      case 'temp_reading':
        return (
          <div>
            <label className="block text-sm font-medium text-[#1E2D4D] mb-1">
              {displayLabel}
              {item.isCritical && <span className="ml-1 text-xs text-red-600 font-bold">CCP</span>}
            </label>
            {item.helpText && <p className="text-xs text-[#1E2D4D]/50 mb-1">{item.helpText}</p>}
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="°F"
                value={resp?.responseValue ?? ''}
                onChange={(e) => handleItemResponse(item.masterItemId, e.target.value, null)}
                className="w-24 px-3 py-2 border border-[#1E2D4D]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/50"
              />
              <span className="text-sm text-[#1E2D4D]/50">°{item.tempUnit ?? 'F'}</span>
              {item.haccpCriticalLimit && (
                <span className="text-xs text-[#1E2D4D]/40 ml-2">Limit: {item.haccpCriticalLimit}</span>
              )}
              {resp?.isPass === false && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              {resp?.isPass === true && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            {item.tempMin != null && item.tempMax != null && (
              <p className="text-xs text-[#1E2D4D]/40 mt-1">Acceptable range: {item.tempMin}–{item.tempMax}°{item.tempUnit ?? 'F'}</p>
            )}
            {resp?.isPass === false && item.requiresCorrectiveAction && (
              <input
                type="text"
                placeholder="Corrective action taken..."
                value={resp?.correctiveAction ?? ''}
                onChange={(e) => handleItemResponse(item.masterItemId, resp.responseValue, resp.isPass, e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            )}
            {resp?.isPass === false && item.requiresPhotoOnFail && (
              <div className="mt-2">
                <PhotoButton
                  photos={itemPhotos[item.masterItemId] ?? []}
                  onPhotosChange={(photos) => setItemPhotos(prev => ({ ...prev, [item.masterItemId]: photos }))}
                />
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div>
            <label className="block text-sm font-medium text-[#1E2D4D] mb-1">
              {displayLabel}
              {item.isCritical && <span className="ml-1 text-xs text-red-600 font-bold">CCP</span>}
            </label>
            {item.helpText && <p className="text-xs text-[#1E2D4D]/50 mb-1">{item.helpText}</p>}
            <textarea
              value={resp?.responseValue ?? ''}
              onChange={(e) => handleItemResponse(item.masterItemId, e.target.value, e.target.value.trim().length > 0)}
              className="w-full px-3 py-2 border border-[#1E2D4D]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/50 resize-y min-h-[60px]"
              placeholder="Enter response..."
              rows={2}
            />
            <p className="text-xs text-[#1E2D4D]/30 mt-0.5 text-right">{(resp?.responseValue ?? '').length} chars</p>
          </div>
        );

      case 'numeric':
        return (
          <div>
            <label className="block text-sm font-medium text-[#1E2D4D] mb-1">
              {displayLabel}
              {item.isCritical && <span className="ml-1 text-xs text-red-600 font-bold">CCP</span>}
            </label>
            {item.helpText && <p className="text-xs text-[#1E2D4D]/50 mb-1">{item.helpText}</p>}
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                value={resp?.responseValue ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  let pass: boolean | null = val.trim().length > 0;
                  const numVal = parseFloat(val);
                  if (!isNaN(numVal) && expected) {
                    const min = typeof expected.min === 'number' ? expected.min : null;
                    const max = typeof expected.max === 'number' ? expected.max : null;
                    if (min != null && numVal < min) pass = false;
                    if (max != null && numVal > max) pass = false;
                  }
                  handleItemResponse(item.masterItemId, val, pass);
                }}
                className="w-32 px-3 py-2 border border-[#1E2D4D]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/50"
                placeholder="Enter number..."
              />
              {expected?.min != null && expected?.max != null && (
                <span className="text-xs text-[#1E2D4D]/40">Range: {String(expected.min)}–{String(expected.max)}</span>
              )}
              {resp?.isPass === false && <AlertTriangle className="h-4 w-4 text-red-500" />}
              {resp?.isPass === true && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
          </div>
        );

      case 'date':
        return (
          <div>
            <label className="block text-sm font-medium text-[#1E2D4D] mb-1">
              {displayLabel}
              {item.isCritical && <span className="ml-1 text-xs text-red-600 font-bold">CCP</span>}
            </label>
            {item.helpText && <p className="text-xs text-[#1E2D4D]/50 mb-1">{item.helpText}</p>}
            <input
              type="date"
              value={resp?.responseValue ?? ''}
              onChange={(e) => handleItemResponse(item.masterItemId, e.target.value, e.target.value.length > 0)}
              min={typeof expected?.min === 'string' ? expected.min : undefined}
              max={typeof expected?.max === 'string' ? expected.max : new Date().toISOString().split('T')[0]}
              className="px-3 py-2 border border-[#1E2D4D]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/50"
            />
          </div>
        );

      case 'multi_select': {
        const options: string[] = Array.isArray(expected?.options) ? (expected.options as string[]) : [];
        let selected: string[] = [];
        try { selected = resp?.responseValue ? JSON.parse(resp.responseValue) : []; } catch { selected = []; }
        return (
          <div>
            <label className="block text-sm font-medium text-[#1E2D4D] mb-1">
              {displayLabel}
              {item.isCritical && <span className="ml-1 text-xs text-red-600 font-bold">CCP</span>}
            </label>
            {item.helpText && <p className="text-xs text-[#1E2D4D]/50 mb-1">{item.helpText}</p>}
            <div className="space-y-1.5 mt-1">
              {options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...selected, opt]
                        : selected.filter(s => s !== opt);
                      const pass = updated.length > 0;
                      handleItemResponse(item.masterItemId, JSON.stringify(updated), pass);
                    }}
                    className="w-4 h-4 rounded border-[#1E2D4D]/30 text-[#A08C5A] focus:ring-[#A08C5A]/50"
                  />
                  <span className="text-sm text-[#1E2D4D]">{opt}</span>
                </label>
              ))}
              {options.length === 0 && (
                <p className="text-xs text-[#1E2D4D]/40 italic">No options configured for this item.</p>
              )}
            </div>
          </div>
        );
      }

      case 'photo':
        // TODO: Wire to storage bucket upload once photo storage is configured
        return (
          <div>
            <label className="block text-sm font-medium text-[#1E2D4D] mb-1">
              {displayLabel}
              {item.isCritical && <span className="ml-1 text-xs text-red-600 font-bold">CCP</span>}
            </label>
            {item.helpText && <p className="text-xs text-[#1E2D4D]/50 mb-1">{item.helpText}</p>}
            <div className="bg-[#FAF7F0] border border-[#1E2D4D]/10 rounded-lg p-4">
              <p className="text-sm font-medium text-[#1E2D4D] mb-1">Photo capture required</p>
              <p className="text-xs text-[#1E2D4D]/60 mb-3">
                Photo upload coming soon. Tap below to mark this item as &ldquo;evidence pending&rdquo; for now.
              </p>
              {resp?.responseValue === 'evidence_pending' ? (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                  <CheckCircle className="h-3 w-3" /> Marked as evidence pending
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleItemResponse(
                    item.masterItemId,
                    'evidence_pending',
                    item.isRequired ? null : true,
                  )}
                  className="px-4 py-2 bg-[#1E2D4D] text-white text-sm rounded-lg hover:bg-[#162340] transition-colors font-medium"
                >
                  Mark as Evidence Pending
                </button>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div>
            <label className="block text-sm font-medium text-[#1E2D4D] mb-1">
              {displayLabel}
              {item.isCritical && <span className="ml-1 text-xs text-red-600 font-bold">CCP</span>}
            </label>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              Unsupported prompt type: <code className="font-mono">{item.promptType}</code>. Contact support.
            </div>
          </div>
        );
    }
  };

  // ── JSX ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6 max-w-7xl mx-auto pb-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Checklists' }]} />

        {/* PRP subtitle */}
        <p className="text-sm" style={{ color: colors.textSecondary }}>
          <span className="font-semibold" style={{ color: colors.navy }}>Predict</span> the missed check.{' '}
          <span className="font-semibold" style={{ color: colors.navy }}>Reduce</span> the failed item.{' '}
          <span className="font-semibold" style={{ color: colors.navy }}>Prove</span> the completion.
        </p>

        {/* PRP Band */}
        <ChecklistsPRPBand todayChecklists={computedTodayChecklists} loading={todayLoading} />

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-[#1E2D4D]/10 overflow-x-auto">
          <button
            onClick={() => setActiveView('today')}
            className={`px-4 py-2 font-medium whitespace-nowrap flex items-center ${
              activeView === 'today'
                ? 'border-b-2 border-[#A08C5A] text-[#1E2D4D]'
                : 'text-[#1E2D4D]/70 hover:text-[#1E2D4D]'
            }`}
          >
            <span style={{ fontSize: 14, marginRight: 7 }}>{'\uD83D\uDCCB'}</span>
            {t('checklists.todaysChecklists')}
          </button>
          <button
            onClick={() => setActiveView('library')}
            className={`px-4 py-2 font-medium whitespace-nowrap flex items-center ${
              activeView === 'library'
                ? 'border-b-2 border-[#A08C5A] text-[#1E2D4D]'
                : 'text-[#1E2D4D]/70 hover:text-[#1E2D4D]'
            }`}
          >
            <span style={{ fontSize: 14, marginRight: 7 }}>{'\uD83D\uDCDA'}</span>
            Templates
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 font-medium whitespace-nowrap flex items-center ${
              activeView === 'history'
                ? 'border-b-2 border-[#A08C5A] text-[#1E2D4D]'
                : 'text-[#1E2D4D]/70 hover:text-[#1E2D4D]'
            }`}
          >
            <span style={{ fontSize: 14, marginRight: 7 }}>{'\uD83D\uDD50'}</span>
            History
          </button>
        </div>

        {/* ═══ TODAY'S CHECKLISTS TAB ══════════════════════════════════════ */}
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

            {!todayLoading && computedTodayChecklists.length === 0 && (
              <>
                <ChecklistsEmptyState onBrowseLibrary={() => setActiveView('library')} />
                <ChecklistsLibraryPreview
                  definitions={masterDefinitions ?? []}
                  onViewAll={() => setActiveView('library')}
                />
              </>
            )}

            {computedTodayChecklists.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...computedTodayChecklists]
                  .sort((a, b) => {
                    const sa = CARD_STATUS_SORT[getCardStatus(a)];
                    const sb = CARD_STATUS_SORT[getCardStatus(b)];
                    if (sa !== sb) return sa - sb;
                    return a.displayName.localeCompare(b.displayName);
                  })
                  .map((tc) => {
                    const status = getCardStatus(tc);
                    const cfg = STATUS_CONFIG[status];
                    const shiftWindow = getCurrentShiftWindow(tc.instance.dueWindows);
                    const itemCount = tc.instance.itemCount ?? 0;
                    const cadenceLabel = CADENCE_LABELS[tc.cadence] ?? tc.cadence;
                    const calcodeSection = tc.instance.firstCalcodeSection;
                    const haccpCcp = tc.instance.firstHaccpCcp;
                    const scoreDisplay = tc.latestScorePercentage != null ? `${tc.latestScorePercentage}%` : '';

                    // Time / progress line
                    let timeLine: React.ReactNode = null;
                    if (status === 'overdue') {
                      const pastDue = formatTimePastDue(shiftWindow);
                      timeLine = (
                        <span className="text-xs" style={{ color: '#DC2626' }}>
                          Due {shiftWindow.label} &middot; <span className="font-bold">Now {pastDue}</span>
                        </span>
                      );
                    } else if (status === 'not_started') {
                      const remaining = formatTimeRemaining(shiftWindow);
                      timeLine = (
                        <span className="text-xs" style={{ color: colors.navy }}>
                          Due {shiftWindow.label} &middot; <span className="font-bold">{remaining}</span>
                        </span>
                      );
                    } else if (status === 'in_progress') {
                      const pct = scoreDisplay || '0%';
                      timeLine = (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-[#1E2D4D]/8 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{ width: pct, backgroundColor: cfg.borderColor }}
                            />
                          </div>
                          <span className="text-xs text-[#1E2D4D]/50 shrink-0">{pct}</span>
                        </div>
                      );
                    } else if (status === 'completed') {
                      timeLine = (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-[#1E2D4D]/8 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: '100%', backgroundColor: cfg.borderColor }}
                            />
                          </div>
                          <span className="text-xs text-[#1E2D4D]/50 shrink-0">{itemCount} / {itemCount} &middot; 100%</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={tc.instance.id}
                        className="border transition-all hover:shadow-md cursor-pointer"
                        style={{
                          backgroundColor: status === 'completed' ? '#F0FDF4' : '#FFFFFF',
                          borderColor: '#E5E0D8',
                          borderRadius: 10,
                          borderLeftWidth: 4,
                          borderLeftColor: cfg.borderColor,
                          padding: '16px 18px',
                        }}
                        onClick={() => tc.isDue && handleStartExecution(tc)}
                      >
                        <div className="flex gap-3.5">
                          {/* Left icon */}
                          <div
                            className="flex-shrink-0 flex items-center justify-center"
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              backgroundColor: cfg.iconBg,
                            }}
                          >
                            {status === 'completed' && <Check style={{ color: '#FFFFFF', width: 22, height: 22 }} />}
                            {status === 'in_progress' && <Clock style={{ color: cfg.iconColor, width: 22, height: 22 }} />}
                            {status === 'overdue' && <AlertTriangle style={{ color: cfg.iconColor, width: 22, height: 22 }} />}
                            {status === 'not_started' && <ClipboardList style={{ color: cfg.iconColor, width: 22, height: 22 }} />}
                          </div>

                          {/* Middle column */}
                          <div className="flex-1 min-w-0">
                            {/* Line 1: Name */}
                            <h3
                              className="font-bold tracking-tight leading-tight truncate"
                              style={{ color: colors.navy, fontSize: 15, fontFamily: "'Montserrat', sans-serif" }}
                            >
                              {tc.displayName}
                            </h3>

                            {/* Line 2: Citation + CCP + item count */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {calcodeSection && (
                                <span
                                  className="inline-block font-bold"
                                  style={{
                                    backgroundColor: colors.warningSoft,
                                    color: colors.warning,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: 3,
                                  }}
                                >
                                  CalCode {calcodeSection}
                                </span>
                              )}
                              {haccpCcp && (
                                <span
                                  className="inline-block font-bold"
                                  style={{
                                    backgroundColor: colors.borderLight,
                                    color: colors.navy,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: 3,
                                  }}
                                >
                                  CCP-{haccpCcp}
                                </span>
                              )}
                              <span className="text-[10.5px]" style={{ color: colors.textMuted }}>
                                {itemCount > 0 ? `${itemCount} items` : ''}{itemCount > 0 ? ' \u00B7 ' : ''}{cadenceLabel}
                              </span>
                            </div>

                            {/* Line 3: Time / progress */}
                            {timeLine && <div className="mt-1.5">{timeLine}</div>}

                            {/* Line 4: Accountability */}
                            {(status === 'completed' || status === 'in_progress') && tc.instance.createdBy && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Avatar name={tc.instance.createdBy} size={18} userId={tc.instance.createdBy} />
                                <span className="text-[10.5px]" style={{ color: colors.textMuted }}>
                                  {status === 'completed' ? 'Completed' : 'Started'}
                                  {tc.todayCompletionCount > 0 && ` \u00B7 ${tc.todayCompletionCount}x today`}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Right column */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {/* Status pill */}
                            <span
                              className="font-bold uppercase text-center"
                              style={{
                                backgroundColor: cfg.pillBg,
                                color: cfg.pillText,
                                fontSize: '10px',
                                padding: '3px 8px',
                                borderRadius: 9999,
                                letterSpacing: '0.04em',
                              }}
                            >
                              {cfg.pillLabel}
                            </span>

                            {/* Action button */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleStartExecution(tc); }}
                              className="font-bold transition-all duration-150 active:scale-[0.98]"
                              style={{
                                backgroundColor: cfg.btnBg,
                                color: cfg.btnText,
                                border: cfg.btnBorder ?? 'none',
                                padding: '8px 16px',
                                borderRadius: 6,
                                fontSize: '12.5px',
                                fontWeight: 700,
                              }}
                            >
                              {cfg.btnLabel}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ═══ LIBRARY TAB ═════════════════════════════════════════════════ */}
        {activeView === 'library' && (
          <div className="space-y-6">
            {/* Adopted Instances */}
            {(instances ?? []).filter(i => i.isActive).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-4">Your Active Checklists</h3>
                <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#1E2D4D]/10">
                    <thead className="bg-[#FAF7F0]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Cadence</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Items</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-[#1E2D4D]/50 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#1E2D4D]/10">
                      {(instances ?? []).filter(i => i.isActive).map((inst) => (
                        <tr key={inst.id} className="hover:bg-[#FAF7F0]">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1E2D4D]">
                            {inst.nameOverride ?? inst.masterDefinitionName ?? 'Untitled'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E2D4D]/70 hidden sm:table-cell">
                            {CADENCE_LABELS[inst.cadenceOverride ?? inst.masterDefinitionCadence ?? 'on_demand']}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E2D4D]/70 hidden sm:table-cell">
                            {inst.itemCount ?? '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => handleDeactivate(inst.id)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium"
                            >
                              Deactivate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Master Library Browser */}
            <div>
              <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
                <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D] flex items-center gap-2">
                  <Library className="h-5 w-5" />
                  Master Checklist Library
                </h3>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Search checklists..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="px-3 py-2 border border-[#1E2D4D]/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/50 w-64"
                />
                <select
                  value={libraryCadence}
                  onChange={(e) => setLibraryCadence(e.target.value)}
                  className="px-3 py-2 border border-[#1E2D4D]/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/50"
                >
                  <option value="">All cadences</option>
                  <option value="per_shift">Per Shift</option>
                  <option value="once_daily">Daily</option>
                  <option value="on_demand">On Demand</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {masterLoading && (
                <div className="text-center py-8 text-[#1E2D4D]/50">Loading library...</div>
              )}

              {!masterLoading && (masterDefinitions ?? []).length === 0 && (
                <PageEmptyState
                  title="No checklists found"
                  description={librarySearch ? 'Try a different search term.' : 'The master library is empty.'}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(masterDefinitions ?? []).map((def) => {
                  const adopted = isAdopted(def.id);
                  return (
                    <div
                      key={def.id}
                      className={`bg-white rounded-xl p-5 border transition-colors ${
                        adopted ? 'border-green-200 bg-green-50/30' : 'border-[#1E2D4D]/10 hover:border-[#1E2D4D]/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-[#1E2D4D] text-sm leading-tight">{def.name}</h4>
                        {adopted && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 shrink-0 ml-2">
                            Adopted
                          </span>
                        )}
                      </div>
                      {def.description && (
                        <p className="text-xs text-[#1E2D4D]/60 mb-3 line-clamp-2">{def.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-[#1E2D4D]/50 mb-3">
                        <span className="px-2 py-0.5 bg-[#1E2D4D]/5 rounded">{CADENCE_LABELS[def.cadence] ?? def.cadence}</span>
                        <span>v{def.version}</span>
                      </div>
                      {!adopted ? (
                        <button
                          onClick={() => setAdoptModal(def)}
                          className="w-full px-3 py-2 bg-[#1E2D4D] text-white text-sm rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] font-medium"
                        >
                          <Plus className="h-4 w-4 inline mr-1" />
                          Adopt
                        </button>
                      ) : (
                        <button
                          onClick={() => setAdoptModal(def)}
                          className="w-full px-3 py-2 border border-[#1E2D4D]/15 text-[#1E2D4D]/70 text-sm rounded-lg hover:bg-[#FAF7F0] transition-colors font-medium"
                        >
                          View Items
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ HISTORY TAB ═════════════════════════════════════════════════ */}
        {activeView === 'history' && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-[#1E2D4D]">Completion History</h2>

            {/* ── Filter bar ──────────────────────────────────────────── */}
            <div
              className="bg-white border rounded-[10px] flex flex-wrap items-end gap-3"
              style={{ borderColor: colors.border, padding: '14px 18px' }}
            >
              {/* Date Range */}
              <div className="flex flex-col gap-1" style={{ minWidth: 140 }}>
                <span className="text-[11px] font-bold uppercase" style={{ color: colors.navy, letterSpacing: '0.04em' }}>Date Range</span>
                <select
                  value={historyRange}
                  onChange={(e) => setHistoryRange(e.target.value)}
                  className="px-3 py-2 border border-[#1E2D4D]/15 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/50"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {historyRange === 'custom' && (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase" style={{ color: colors.navy, letterSpacing: '0.04em' }}>From</span>
                    <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} className="px-3 py-2 border border-[#1E2D4D]/15 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/50" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase" style={{ color: colors.navy, letterSpacing: '0.04em' }}>To</span>
                    <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} className="px-3 py-2 border border-[#1E2D4D]/15 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/50" />
                  </div>
                </>
              )}

              {/* Checklist */}
              <div className="flex flex-col gap-1" style={{ minWidth: 140 }}>
                <span className="text-[11px] font-bold uppercase" style={{ color: colors.navy, letterSpacing: '0.04em' }}>Checklist</span>
                <select
                  value={historyInstanceFilter}
                  onChange={(e) => setHistoryInstanceFilter(e.target.value)}
                  className="px-3 py-2 border border-[#1E2D4D]/15 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/50"
                >
                  <option value="">All checklists</option>
                  {(instances ?? []).filter(i => i.isActive).map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.nameOverride ?? inst.masterDefinitionName ?? 'Untitled'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1" style={{ minWidth: 140 }}>
                <span className="text-[11px] font-bold uppercase" style={{ color: colors.navy, letterSpacing: '0.04em' }}>Status</span>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-[#1E2D4D]/15 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#A08C5A]/50"
                >
                  <option value="">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">Partial</option>
                  <option value="abandoned">Failed</option>
                </select>
              </div>

              {/* Right side action buttons */}
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => toast.info('Inspection packet PDF coming soon. We\u2019ll bundle all completions, gaps, and linked CAs into a single inspector-ready document. Want early access? Contact founders@getevidly.com')}
                  className="font-bold transition-colors"
                  style={{
                    backgroundColor: colors.white,
                    color: colors.navy,
                    border: `1px solid ${colors.border}`,
                    padding: '9px 16px',
                    borderRadius: 6,
                    fontSize: '12.5px',
                    fontWeight: 700,
                  }}
                >
                  {'\u2B07'} Inspection Packet
                </button>
                <button
                  type="button"
                  onClick={() => toast.info('CSV export coming soon.')}
                  className="font-bold transition-colors"
                  style={{
                    backgroundColor: colors.navy,
                    color: colors.cream,
                    border: 'none',
                    padding: '9px 16px',
                    borderRadius: 6,
                    fontSize: '12.5px',
                    fontWeight: 700,
                  }}
                >
                  {'\u2B07'} Export CSV
                </button>
              </div>
            </div>

            {/* ── Content ─────────────────────────────────────────────── */}
            {historyLoading && <div className="text-center py-8 text-[#1E2D4D]/50">Loading history...</div>}

            {!historyLoading && (historyData ?? []).length === 0 && (
              <>
                <ChecklistsHistoryEmptyState onStartChecklist={() => setActiveView('today')} />
                <ChecklistsHistoryRoadmap />
              </>
            )}

            {!historyLoading && (historyData ?? []).length > 0 && (
              <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden overflow-x-auto">
                <table className="min-w-full divide-y divide-[#1E2D4D]/10">
                  <thead className="bg-[#FAF7F0]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Checklist</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase hidden sm:table-cell">Completed By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#1E2D4D]/10">
                    {(historyData ?? []).map((entry) => (
                      <tr key={entry.id} className="hover:bg-[#FAF7F0]">
                        <td className="px-6 py-3 text-sm text-[#1E2D4D]/70">
                          {entry.completedAt ? format(new Date(entry.completedAt), 'MMM d, h:mm a') : format(new Date(entry.startedAt), 'MMM d, h:mm a')}
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-[#1E2D4D]">
                          {entry.checklistName}
                          {entry.loggedRetroactively && (
                            <span className="ml-1 text-xs text-amber-600">(retro)</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-[#1E2D4D]/70 hidden sm:table-cell">{entry.completedByName ?? entry.startedByName ?? '—'}</td>
                        <td className="px-6 py-3 text-sm font-semibold">
                          {entry.scorePercentage != null ? (
                            <span className={entry.scorePercentage >= 95 ? 'text-green-600' : entry.scorePercentage >= 80 ? 'text-amber-600' : 'text-red-600'}>
                              {entry.scorePercentage}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            entry.status === 'completed' ? 'bg-emerald-50 text-emerald-700'
                            : entry.status === 'in_progress' ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-600'
                          }`}>
                            {entry.status === 'completed' ? 'Complete' : entry.status === 'in_progress' ? 'In Progress' : 'Abandoned'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ ADOPTION MODAL ══════════════════════════════════════════════ */}
      {adoptModal && (
        <Modal isOpen onClose={() => setAdoptModal(null)} size="lg">
          <div className="p-6">
            <h3 className="text-xl font-bold text-[#1E2D4D] mb-1">{adoptModal.name}</h3>
            {adoptModal.description && (
              <p className="text-sm text-[#1E2D4D]/60 mb-4">{adoptModal.description}</p>
            )}
            <div className="flex gap-3 mb-4 text-sm text-[#1E2D4D]/50">
              <span className="px-2 py-0.5 bg-[#1E2D4D]/5 rounded">{CADENCE_LABELS[adoptModal.cadence] ?? adoptModal.cadence}</span>
              <span>v{adoptModal.version}</span>
              <span>{adoptModalItems.length} items</span>
            </div>

            {/* Item preview */}
            <div className="max-h-64 overflow-y-auto border border-[#1E2D4D]/10 rounded-lg mb-6">
              {adoptItemsQuery.isLoading && (
                <div className="p-4 text-center text-sm text-[#1E2D4D]/50">Loading items...</div>
              )}
              {adoptModalItems.map((item, idx) => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-2.5 border-b border-[#1E2D4D]/5 last:border-b-0">
                  <span className="text-xs text-[#1E2D4D]/30 mt-0.5 font-mono w-5 shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#1E2D4D]">{item.displayLabel ?? item.prompt}</span>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] text-[#1E2D4D]/40 uppercase">{item.promptType.replace('_', '/')}</span>
                      {item.haccpCcp && (
                        <span className="text-[10px] text-red-500 font-bold">{item.haccpCcp}</span>
                      )}
                      {item.isCritical && (
                        <span className="text-[10px] text-red-500 font-bold">CRITICAL</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setAdoptModal(null)}
                className="flex-1 px-4 py-3 border border-[#1E2D4D]/15 text-[#1E2D4D] rounded-lg font-medium hover:bg-[#FAF7F0] transition-colors"
              >
                Cancel
              </button>
              {!isAdopted(adoptModal.id) ? (
                <button
                  onClick={handleAdopt}
                  disabled={adoptLoading}
                  className="flex-1 px-4 py-3 bg-[#1E2D4D] text-white rounded-lg font-bold hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
                >
                  {adoptLoading ? 'Adopting...' : 'Adopt Checklist'}
                </button>
              ) : (
                <button
                  onClick={() => setAdoptModal(null)}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-bold cursor-default"
                  disabled
                >
                  Already Adopted
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ═══ EXECUTION MODAL ═════════════════════════════════════════════ */}
      {execInstance && (
        <Modal isOpen onClose={handleCancelExecution} size="lg">
          <div className="p-4 sm:p-6">
            <div className="mb-6">
              <h3 className="text-2xl font-bold tracking-tight text-[#1E2D4D]">
                {execInstance.nameOverride ?? execInstance.masterDefinitionName ?? 'Checklist'}
              </h3>
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm text-[#1E2D4D]/70 mb-2">
                  <span>Progress</span>
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

            {execItemsQuery.isLoading && (
              <div className="text-center py-8 text-[#1E2D4D]/50">Loading items...</div>
            )}

            <div className="space-y-6">
              {execItems.map((item, index) => (
                <div key={item.id} className="p-4 border border-[#1E2D4D]/10 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#1E2D4D] text-white rounded-full flex items-center justify-center font-bold text-sm">
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
                onClick={handleCancelExecution}
                className="px-6 py-3 border-2 border-[#1E2D4D] rounded-xl text-lg font-medium text-[#1E2D4D] hover:bg-[#FAF7F0] transition-colors bg-white min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitExecution}
                disabled={execLoading || currentProgress < 100}
                className="px-6 py-3 bg-[#1E2D4D] text-white rounded-lg text-lg font-bold hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 shadow-sm min-h-[44px]"
              >
                {execLoading ? 'Submitting...' : 'Submit Checklist'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );
}
