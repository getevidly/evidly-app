/**
 * usePRPStats — computes Predict / Prove card values.
 * Uses pillar_requirements catalog for the "required not on file" count.
 */
import { useMemo } from 'react';
import type { EnrichedDocument } from './useDocumentsByTab';
import type { CatalogRequirement } from '../useLocationRequirements';

export interface PRPStats {
  predict: {
    expiringIn30Days: number;
    requiredNotOnFile: number | null;
    total: number;
  };
  prove: {
    currentCount: number;
  };
}

export function usePRPStats(
  documents: EnrichedDocument[],
  prpEnabled: boolean,
  catalog?: CatalogRequirement[],
): PRPStats {
  return useMemo(() => {
    const expiringIn30Days = documents.filter(d => d.status === 'expiring').length;

    let requiredNotOnFile: number | null = null;

    if (prpEnabled && catalog) {
      // Only count catalog rows where counts_toward_total = true
      const countingReqs = catalog.filter(r => r.counts_toward_total);

      // Build set of document types currently on file (any non-archived status)
      const uploadedTypes = new Set(
        documents
          .filter(d => d.status !== 'archived' && d.status !== 'cancelled')
          .map(d => (d.type || '').toLowerCase()),
      );

      // Count required records whose requirement_code is not represented
      let missing = 0;
      for (const req of countingReqs) {
        if (!uploadedTypes.has(req.requirement_code.toLowerCase())) {
          missing++;
        }
      }
      requiredNotOnFile = missing;
    }

    const total = expiringIn30Days + (requiredNotOnFile || 0);
    const currentCount = documents.filter(d => d.status === 'current').length;

    return {
      predict: { expiringIn30Days, requiredNotOnFile, total },
      prove: { currentCount },
    };
  }, [documents, prpEnabled, catalog]);
}
