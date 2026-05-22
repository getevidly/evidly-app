/**
 * usePRPStats — computes Predict / Reduce / Prove card values.
 */
import { useMemo } from 'react';
import type { EnrichedDocument } from './useDocumentsByTab';
import { getDocumentsForState } from '../../data/onboardingDocuments';
import { pillarToCategory } from '../../lib/documents/pillarToCategory';

export interface PRPStats {
  predict: {
    expiringIn30Days: number;
    requiredNotOnFile: number | null;
    total: number;
  };
  reduce: {
    state: 'pending';
    dollarRange: null;
  };
  prove: {
    currentCount: number;
  };
}

export function usePRPStats(
  documents: EnrichedDocument[],
  stateCode: string | null,
): PRPStats {
  return useMemo(() => {
    const expiringIn30Days = documents.filter(d => d.status === 'expiring').length;

    let requiredNotOnFile: number | null = null;

    if (stateCode) {
      const allRequired = getDocumentsForState(stateCode).filter(d => d.required);
      // Build set of document types currently on file (any non-archived status)
      const uploadedTypes = new Set(
        documents
          .filter(d => d.status !== 'archived' && d.status !== 'cancelled')
          .map(d => (d.type || '').toLowerCase()),
      );

      // Count required docs whose id is not represented in uploaded types
      let missing = 0;
      for (const req of allRequired) {
        // Match by id (e.g. 'hood_cleaning_cert') or name similarity
        const idMatch = uploadedTypes.has(req.id.toLowerCase());
        const nameMatch = uploadedTypes.has(req.name.toLowerCase());
        if (!idMatch && !nameMatch) {
          missing++;
        }
      }
      requiredNotOnFile = missing;
    }

    const total = expiringIn30Days + (requiredNotOnFile || 0);

    const currentCount = documents.filter(d => d.status === 'current').length;

    return {
      predict: { expiringIn30Days, requiredNotOnFile, total },
      reduce: { state: 'pending' as const, dollarRange: null },
      prove: { currentCount },
    };
  }, [documents, stateCode]);
}
