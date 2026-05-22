/**
 * useRequiredDocsForTab — returns required documents for the active tab.
 */
import { useMemo } from 'react';
import { getDocumentsForState, type OnboardingDocument } from '../../data/onboardingDocuments';
import { pillarToCategory } from '../../lib/documents/pillarToCategory';
import type { DocumentTabId } from '../../components/documents/DocumentsTabs';

export interface RequiredDocsForTab {
  requiredDocs: OnboardingDocument[];
  requiredCount: number;
  hasReference: boolean;
}

export function useRequiredDocsForTab(
  stateCode: string | null,
  activeTab: DocumentTabId,
): RequiredDocsForTab {
  return useMemo(() => {
    if (!stateCode) {
      return { requiredDocs: [], requiredCount: 0, hasReference: false };
    }

    const allDocs = getDocumentsForState(stateCode);
    const tabDocs = allDocs.filter(d => {
      const cat = pillarToCategory(d.pillar);
      if (activeTab === 'kitchen') return cat === 'kitchen';
      if (activeTab === 'service') return cat === 'service';
      if (activeTab === 'business') return cat === 'business';
      return false;
    });

    const requiredDocs = tabDocs.filter(d => d.required);

    return {
      requiredDocs,
      requiredCount: requiredDocs.length,
      hasReference: true,
    };
  }, [stateCode, activeTab]);
}
