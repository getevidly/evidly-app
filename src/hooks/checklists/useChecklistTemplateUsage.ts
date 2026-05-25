/**
 * useChecklistTemplateUsage — tracks which master definitions
 * have already been adopted by the current organization.
 *
 * Used by the adoption modal to disable "already adopted" items.
 */

import { useCallback, useMemo } from 'react';
import type { CustomerChecklistInstance } from './useCustomerChecklistInstances';

// ── Types ─────────────────────────────────────────────────────

export interface TemplateUsage {
  adoptedDefinitionIds: Set<string>;
  isAdopted: (masterDefinitionId: string) => boolean;
  getInstanceForDefinition: (masterDefinitionId: string) => CustomerChecklistInstance | undefined;
}

// ── Hook ──────────────────────────────────────────────────────

export function useChecklistTemplateUsage(
  instances: CustomerChecklistInstance[],
): TemplateUsage {
  const adoptedMap = useMemo(() => {
    const map = new Map<string, CustomerChecklistInstance>();
    for (const inst of instances) {
      if (inst.masterDefinitionId) {
        map.set(inst.masterDefinitionId, inst);
      }
    }
    return map;
  }, [instances]);

  const adoptedDefinitionIds = useMemo(
    () => new Set(adoptedMap.keys()),
    [adoptedMap],
  );

  const isAdopted = useCallback(
    (masterDefinitionId: string) => adoptedMap.has(masterDefinitionId),
    [adoptedMap],
  );

  const getInstanceForDefinition = useCallback(
    (masterDefinitionId: string) => adoptedMap.get(masterDefinitionId),
    [adoptedMap],
  );

  return { adoptedDefinitionIds, isAdopted, getInstanceForDefinition };
}
