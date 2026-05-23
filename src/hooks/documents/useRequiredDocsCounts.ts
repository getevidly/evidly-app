/**
 * useRequiredDocsCounts — computes required-doc counts per tab from
 * COMMON_REQUIRED_RECORDS static data, then cross-references with uploaded
 * documents to produce tab-level indicators.
 */
import { useMemo } from 'react';
import type { EnrichedDocument } from './useDocumentsByTab';
import type { DocumentTabId, RequiredCountEntry } from '../../components/documents/DocumentsTabs';
import { COMMON_REQUIRED_RECORDS, TAB_TO_SUBTAB } from '../../data/commonRequiredRecords';

const TAB_CATEGORIES: Record<DocumentTabId, string[]> = {
  kitchen:  ['kitchen', 'employee'],
  service:  ['service'],
  business: ['business'],
};

export function useRequiredDocsCounts(
  prpEnabled: boolean,
  documents: EnrichedDocument[],
): Record<DocumentTabId, RequiredCountEntry | null> | undefined {
  return useMemo(() => {
    if (!prpEnabled) return undefined;

    const tabIds: DocumentTabId[] = ['kitchen', 'service', 'business'];
    const result: Record<DocumentTabId, RequiredCountEntry> = {
      kitchen: { required: 0, uploaded: 0 },
      service: { required: 0, uploaded: 0 },
      business: { required: 0, uploaded: 0 },
    };

    for (const tabId of tabIds) {
      const subTabKey = TAB_TO_SUBTAB[tabId];
      const requiredForTab = COMMON_REQUIRED_RECORDS.filter((r) => r.tab === subTabKey);
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
      for (const rec of requiredForTab) {
        if (uploadedTypes.has(rec.id.toLowerCase())) {
          onFile++;
        }
      }
      result[tabId].uploaded = onFile;
    }

    return result;
  }, [prpEnabled, documents]);
}
