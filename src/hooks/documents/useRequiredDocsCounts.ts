/**
 * useRequiredDocsCounts — computes required-doc counts per tab from
 * the pillar_requirements catalog, then cross-references with uploaded
 * documents to produce tab-level indicators.
 */
import { useMemo } from 'react';
import type { EnrichedDocument } from './useDocumentsByTab';
import type { DocumentTabId, RequiredCountEntry } from '../../components/documents/DocumentsTabs';
import type { CatalogRequirement } from '../useLocationRequirements';
import { PILLAR_TO_TAB } from '../useLocationRequirements';

const TAB_CATEGORIES: Record<DocumentTabId, string[]> = {
  kitchen:  ['kitchen', 'employee'],
  service:  ['service'],
  business: ['business'],
};

export function useRequiredDocsCounts(
  prpEnabled: boolean,
  documents: EnrichedDocument[],
  catalog?: CatalogRequirement[],
): Record<DocumentTabId, RequiredCountEntry | null> | undefined {
  return useMemo(() => {
    if (!prpEnabled || !catalog) return undefined;

    const tabIds: DocumentTabId[] = ['kitchen', 'service', 'business'];
    const result: Record<DocumentTabId, RequiredCountEntry> = {
      kitchen: { required: 0, uploaded: 0 },
      service: { required: 0, uploaded: 0 },
      business: { required: 0, uploaded: 0 },
    };

    // Only count catalog rows where counts_toward_total = true
    const countingReqs = catalog.filter(r => r.counts_toward_total);

    for (const tabId of tabIds) {
      // Map catalog pillar → tab
      const requiredForTab = countingReqs.filter(r => PILLAR_TO_TAB[r.pillar] === tabId);
      result[tabId].required = requiredForTab.length;

      // Build set of uploaded doc type keys for this tab
      const uploadedTypes = new Set<string>();
      for (const doc of documents) {
        if (
          (doc.status === 'current' || doc.status === 'expiring') &&
          TAB_CATEGORIES[tabId].includes(doc.category)
        ) {
          if (doc.type) uploadedTypes.add(doc.type.toLowerCase());
        }
      }

      // Count how many required record types have at least one uploaded doc
      let onFile = 0;
      for (const req of requiredForTab) {
        if (uploadedTypes.has(req.requirement_code.toLowerCase())) {
          onFile++;
        }
      }
      result[tabId].uploaded = onFile;
    }

    return result;
  }, [prpEnabled, documents, catalog]);
}
