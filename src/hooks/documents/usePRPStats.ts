/**
 * usePRPStats — computes Predict / Prove card values.
 * Uses static COMMON_REQUIRED_RECORDS for the "required not on file" count.
 */
import { useMemo } from 'react';
import type { EnrichedDocument } from './useDocumentsByTab';
import { COMMON_REQUIRED_RECORDS } from '../../data/commonRequiredRecords';

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
): PRPStats {
  return useMemo(() => {
    const expiringIn30Days = documents.filter(d => d.status === 'expiring').length;

    let requiredNotOnFile: number | null = null;

    if (prpEnabled) {
      // Build set of document types currently on file (any non-archived status)
      const uploadedTypes = new Set(
        documents
          .filter(d => d.status !== 'archived' && d.status !== 'cancelled')
          .map(d => (d.type || '').toLowerCase()),
      );

      // Count required records whose id is not represented in uploaded types
      let missing = 0;
      for (const rec of COMMON_REQUIRED_RECORDS) {
        if (!uploadedTypes.has(rec.id.toLowerCase())) {
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
  }, [documents, prpEnabled]);
}
