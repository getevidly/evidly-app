/**
 * Checklist hooks — barrel export.
 *
 * Architecture: master library → customer adoption → completion → responses
 */

// Master library (read-only)
export { useMasterChecklistDefinitions } from './useMasterChecklistDefinitions';
export type { MasterChecklistDefinition, MasterDefinitionFilters } from './useMasterChecklistDefinitions';

export { useMasterChecklistDefinitionItems } from './useMasterChecklistDefinitionItems';
export type { MasterChecklistItem } from './useMasterChecklistDefinitionItems';

// Customer adoption layer
export { useCustomerChecklistInstances, useDeactivateInstance, useUpdateInstance } from './useCustomerChecklistInstances';
export type { CustomerChecklistInstance, DeactivateInstanceInput, UpdateInstanceInput } from './useCustomerChecklistInstances';

export { useCustomerChecklistInstanceItems } from './useCustomerChecklistInstanceItems';
export type { InstanceItem } from './useCustomerChecklistInstanceItems';

// Adoption mutation
export { useChecklistAdoption } from './useChecklistAdoption';
export type { AdoptChecklistInput, AdoptChecklistResult } from './useChecklistAdoption';

// Execution flow
export { useStartChecklist } from './useStartChecklist';
export type { StartChecklistInput, StartChecklistResult } from './useStartChecklist';

export { useChecklistResponse, useBatchChecklistResponses } from './useChecklistResponse';
export type { SubmitResponseInput, SubmitResponseResult } from './useChecklistResponse';

export { useCompleteChecklist, useAbandonChecklist } from './useCompleteChecklist';
export type { CompleteChecklistInput, CompleteChecklistResult, AbandonChecklistInput } from './useCompleteChecklist';

// Computed / derived
export { useTodayChecklists } from './useTodayChecklists';
export type { TodayChecklist } from './useTodayChecklists';

export { useChecklistTemplateUsage } from './useChecklistTemplateUsage';
export type { TemplateUsage } from './useChecklistTemplateUsage';

// History
export { useChecklistHistory } from './useChecklistHistory';
export type { ChecklistHistoryEntry, HistoryFilters } from './useChecklistHistory';
