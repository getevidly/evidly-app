import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadFile, BUCKETS } from '../lib/storage';
import { useDocumentsByTab, type EnrichedDocument } from '../hooks/documents/useDocumentsByTab';
import { computeStats } from '../hooks/documents/useDocumentsStats';
import { useVendorBusinessIntelligence } from '../hooks/documents/useVendorBusinessIntelligence';
import { useVendorServiceIntelligence } from '../hooks/documents/useVendorServiceIntelligence';
import { useKitchenEmployeeIntelligence } from '../hooks/documents/useKitchenEmployeeIntelligence';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useOrgLocationContext } from '../hooks/documents/useOrgLocationContext';
import { usePRPStats } from '../hooks/documents/usePRPStats';
import { useRequiredDocsForTab } from '../hooks/documents/useRequiredDocsForTab';
import { pillarToCategory } from '../lib/documents/pillarToCategory';
import { getDocumentsForState } from '../data/onboardingDocuments';
import { DocumentsHeader } from '../components/documents/DocumentsHeader';
import { DocumentsTabs, type DocumentTabId, type RequiredCountEntry } from '../components/documents/DocumentsTabs';
import { DocumentsToolbar } from '../components/documents/DocumentsToolbar';
import { DocumentsList } from '../components/documents/DocumentsList';
import { EmptyTabContent } from '../components/documents/EmptyTabContent';
import { VendorBusinessIntelligenceState } from '../components/documents/VendorBusinessIntelligenceState';
import { VendorServiceIntelligenceState } from '../components/documents/VendorServiceIntelligenceState';
import { KitchenEmployeeIntelligenceBanner } from '../components/documents/KitchenEmployeeIntelligenceBanner';
import { DocumentDetailModal } from '../components/documents/modals/DocumentDetailModal';
import { SendToThirdPartyModal } from '../components/documents/modals/SendToThirdPartyModal';
import { AddVendorDocumentModal } from '../components/documents/modals/AddVendorDocumentModal';
import { RequestFromVendorModal } from '../components/documents/modals/RequestFromVendorModal';
import { SmartUploadModal, type ClassifiedFile } from '../components/SmartUploadModal';

const TAB_CATEGORIES: Record<DocumentTabId, string[]> = {
  kitchen:  ['kitchen', 'employee'],
  service:  ['service'],
  business: ['business'],
};

export function DocumentsPage() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') as DocumentTabId) || 'kitchen';

  const { documents, loading, refetch } = useDocumentsByTab(orgId);

  // Feature flag: PRP layout
  const { enabled: prpEnabled } = useFeatureFlag('documents_prp_layout_v1');

  // Org location context for county-dependent features
  const { stateCode, county } = useOrgLocationContext();

  // PRP stats (only computed when flag is on, but hooks can't be conditional)
  const prpStats = usePRPStats(documents, prpEnabled ? stateCode : null);

  // Required docs for active tab
  const { requiredDocs, requiredCount, hasReference } = useRequiredDocsForTab(
    prpEnabled ? stateCode : null,
    activeTab,
  );

  // Intelligence hooks
  const businessIntel = useVendorBusinessIntelligence(orgId);
  const serviceIntel = useVendorServiceIntelligence(orgId);
  const kitchenIntel = useKitchenEmployeeIntelligence(documents);

  // Filter + search state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');

  // Modal state
  const [openDoc, setOpenDoc] = useState<EnrichedDocument | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showSendWizard, setShowSendWizard] = useState(false);
  const [showAddVendorDoc, setShowAddVendorDoc] = useState(false);
  const [showRequestFromVendor, setShowRequestFromVendor] = useState(false);
  const [preSelectedVendor, setPreSelectedVendor] = useState<{ id: string; name: string; email: string } | null>(null);

  const handleTabChange = useCallback((tab: DocumentTabId) => {
    setSearchParams({ tab });
    setSearch('');
    setStatusFilter('all');
    setLocationFilter('all');
    setVendorFilter('all');
  }, [setSearchParams]);

  // Deep-link: ?doc=<id> opens detail modal and switches to correct tab
  useEffect(() => {
    const docId = searchParams.get('doc');
    if (!docId || loading || documents.length === 0) return;

    const target = documents.find((d) => d.id === docId);
    if (!target) return;

    // Resolve which tab owns this document's category
    const targetTab = (Object.entries(TAB_CATEGORIES) as [DocumentTabId, string[]][])
      .find(([, cats]) => cats.includes(target.category))?.[0] || 'kitchen';

    // Switch tab if needed (without resetting filters — direct setSearchParams)
    if (activeTab !== targetTab) {
      setSearchParams({ tab: targetTab });
    }

    setOpenDoc(target);

    // Clear ?doc= so refresh doesn't re-open
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('doc');
      return next;
    }, { replace: true });
  }, [searchParams, documents, loading, activeTab, setSearchParams]);

  // Split docs by tab
  const tabDocs = useMemo(() => {
    const cats = TAB_CATEGORIES[activeTab];
    return documents.filter((d) => cats.includes(d.category));
  }, [documents, activeTab]);

  // Filtered docs
  const filtered = useMemo(() => {
    return tabDocs.filter((d) => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (locationFilter !== 'all' && (d.location_name || '') !== locationFilter) return false;
      if (vendorFilter !== 'all' && (d.vendor_name || '') !== vendorFilter) return false;
      return true;
    });
  }, [tabDocs, search, statusFilter, locationFilter, vendorFilter]);

  // Stats across all docs
  const stats = useMemo(() => computeStats(documents), [documents]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    kitchen:  documents.filter((d) => d.category === 'kitchen' || d.category === 'employee').length,
    service:  documents.filter((d) => d.category === 'service').length,
    business: documents.filter((d) => d.category === 'business').length,
  }), [documents]);

  // Pending counts (red badge)
  const pendingCounts = useMemo(() => {
    const kitchenDocs = documents.filter((d) => d.category === 'kitchen' || d.category === 'employee');
    const serviceDocs = documents.filter((d) => d.category === 'service');
    const businessDocs = documents.filter((d) => d.category === 'business');
    return {
      kitchen:  kitchenDocs.filter((d) => d.status === 'expiring' || d.status === 'expired').length,
      service:  serviceDocs.filter((d) => d.status === 'pending_review' || d.status === 'overdue').length,
      business: businessDocs.filter((d) => d.status === 'pending_review' || d.status === 'expiring').length,
    };
  }, [documents]);

  // Required-docs counts per tab (for tab indicator tags)
  const requiredCounts = useMemo<Record<DocumentTabId, RequiredCountEntry | null> | undefined>(() => {
    if (!prpEnabled || !stateCode) return undefined;

    const allDocs = getDocumentsForState(stateCode);
    const result: Record<DocumentTabId, RequiredCountEntry> = {
      kitchen: { required: 0, uploaded: 0 },
      service: { required: 0, uploaded: 0 },
      business: { required: 0, uploaded: 0 },
    };

    // Count required docs per tab from reference
    for (const doc of allDocs) {
      if (!doc.required) continue;
      const cat = pillarToCategory(doc.pillar) as DocumentTabId;
      const tab = cat === ('employee' as string) ? 'kitchen' : cat;
      if (result[tab]) result[tab].required++;
    }

    // Count uploaded (current or expiring) docs per tab as "on file"
    for (const doc of documents) {
      if (doc.status === 'current' || doc.status === 'expiring') {
        for (const [tabId, tabCats] of Object.entries(TAB_CATEGORIES)) {
          if (tabCats.includes(doc.category)) {
            const t = tabId as DocumentTabId;
            if (result[t]) {
              result[t].uploaded = Math.min(result[t].uploaded + 1, result[t].required);
            }
          }
        }
      }
    }

    return result;
  }, [prpEnabled, stateCode, documents]);

  // County helper text for tab body
  const countyHelperText = useMemo(() => {
    if (!prpEnabled || !hasReference || !county || requiredCount === 0) return undefined;
    return `Your county (${county}) requires ${requiredCount} record type${requiredCount !== 1 ? 's' : ''} for this tab.`;
  }, [prpEnabled, hasReference, county, requiredCount]);

  // Smart empty state data
  const smartEmptyData = useMemo(() => {
    if (!prpEnabled || !hasReference || !county || !stateCode || requiredDocs.length === 0) return undefined;
    return { county, stateAbbr: stateCode, requiredDocs };
  }, [prpEnabled, hasReference, county, stateCode, requiredDocs]);

  // PREDICT card click → filter to expiring + missing
  const handlePredictClick = useCallback(() => {
    setStatusFilter('expiring');
  }, []);

  // Unique locations and vendors for filter dropdowns
  const locations = useMemo(() => {
    const set = new Set<string>();
    tabDocs.forEach((d) => { if (d.location_name) set.add(d.location_name); });
    return Array.from(set).sort();
  }, [tabDocs]);

  const vendors = useMemo(() => {
    const set = new Set<string>();
    tabDocs.forEach((d) => { if (d.vendor_name) set.add(d.vendor_name); });
    return Array.from(set).sort();
  }, [tabDocs]);

  // SmartUploadModal onSave
  const handleUploadSave = useCallback(async (files: ClassifiedFile[]) => {
    setShowUpload(false);
    if (!orgId) return;

    for (const cf of files) {
      try {
        const category = pillarToCategory(cf.overrides.pillar);
        const storagePath = `${orgId}/${Date.now()}-${cf.file.name}`;

        await uploadFile(BUCKETS.DOCUMENTS, storagePath, cf.file, {
          contentType: cf.file.type || undefined,
        });

        await supabase.from('compliance_documents').insert({
          organization_id: orgId,
          category,
          type: cf.overrides.documentType || null,
          name: cf.overrides.documentLabel || cf.file.name,
          status: 'current',
          storage_path: storagePath,
          expiry_date: cf.overrides.expiryDate || null,
          notes: cf.overrides.notes || null,
          mime_type: cf.file.type || null,
        });
      } catch {
        toast.error(`Failed to upload ${cf.file.name}`);
      }
    }

    toast.success(`${files.length} document${files.length > 1 ? 's' : ''} uploaded`);
    refetch();
  }, [orgId, refetch]);

  const openRequestModal = useCallback(() => {
    setShowAddVendorDoc(false);
    setShowRequestFromVendor(true);
  }, []);

  const hasAnyTabDocs = tabDocs.length > 0;

  // Render intelligence state for vendor tabs when no docs exist (replaces basic EmptyTabContent)
  const renderTabContent = () => {
    if (loading) {
      return <div className="text-center py-12 text-[13px] text-[#8A93A6]">Loading documents…</div>;
    }

    // Kitchen tab: show intelligence banner above list when populated
    if (activeTab === 'kitchen') {
      if (!hasAnyTabDocs) {
        return (
          <EmptyTabContent
            activeTab={activeTab}
            onUpload={() => setShowUpload(true)}
            onAddVendorDoc={() => setShowAddVendorDoc(true)}
            smartEmptyData={smartEmptyData}
          />
        );
      }
      return (
        <>
          <KitchenEmployeeIntelligenceBanner intel={kitchenIntel} />
          <DocumentsList documents={filtered} activeTab={activeTab} onDocClick={setOpenDoc} />
        </>
      );
    }

    // Service tab: intelligence state replaces empty, banner above list when populated
    if (activeTab === 'service') {
      if (serviceIntel.state === 'empty' || serviceIntel.state === 'no_docs') {
        return <VendorServiceIntelligenceState intel={serviceIntel} onSendRequest={openRequestModal} onVendorAdded={() => { serviceIntel.refetch(); refetch(); }} />;
      }
      if (!hasAnyTabDocs) {
        return (
          <EmptyTabContent
            activeTab={activeTab}
            onUpload={() => setShowUpload(true)}
            onAddVendorDoc={() => setShowAddVendorDoc(true)}
            smartEmptyData={smartEmptyData}
          />
        );
      }
      return (
        <>
          {serviceIntel.urgentCount > 0 && (
            <VendorServiceIntelligenceState intel={serviceIntel} onSendRequest={openRequestModal} onVendorAdded={() => { serviceIntel.refetch(); refetch(); }} />
          )}
          <DocumentsList documents={filtered} activeTab={activeTab} onDocClick={setOpenDoc} />
        </>
      );
    }

    // Business tab: same pattern
    if (activeTab === 'business') {
      if (businessIntel.state === 'empty' || businessIntel.state === 'no_docs') {
        return <VendorBusinessIntelligenceState intel={businessIntel} onSendRequest={openRequestModal} onVendorAdded={() => { businessIntel.refetch(); refetch(); }} />;
      }
      if (!hasAnyTabDocs) {
        return (
          <EmptyTabContent
            activeTab={activeTab}
            onUpload={() => setShowUpload(true)}
            onAddVendorDoc={() => setShowAddVendorDoc(true)}
            smartEmptyData={smartEmptyData}
          />
        );
      }
      return (
        <>
          {businessIntel.urgentCount > 0 && (
            <VendorBusinessIntelligenceState intel={businessIntel} onSendRequest={openRequestModal} onVendorAdded={() => { businessIntel.refetch(); refetch(); }} />
          )}
          <DocumentsList documents={filtered} activeTab={activeTab} onDocClick={setOpenDoc} />
        </>
      );
    }

    return null;
  };

  return (
    <>
      <DocumentsHeader
        stats={stats}
        onSendToThirdParty={() => setShowSendWizard(true)}
        prpEnabled={prpEnabled}
        prpStats={prpStats}
        onPredictClick={handlePredictClick}
      />
      <DocumentsTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={tabCounts}
        pendingCounts={pendingCounts}
        requiredCounts={requiredCounts}
        countyHelperText={countyHelperText}
      />
      <DocumentsToolbar
        activeTab={activeTab}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        vendorFilter={vendorFilter}
        onVendorFilterChange={setVendorFilter}
        locations={locations}
        vendors={vendors}
        onUpload={() => setShowUpload(true)}
        onAddVendorDoc={() => setShowAddVendorDoc(true)}
      />

      {renderTabContent()}

      {openDoc && (
        <DocumentDetailModal doc={openDoc} onClose={() => setOpenDoc(null)} onRefresh={refetch} />
      )}

      <SmartUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSave={handleUploadSave}
        batchMode
      />

      {showSendWizard && (
        <SendToThirdPartyModal onClose={() => setShowSendWizard(false)} />
      )}

      {showAddVendorDoc && (
        <AddVendorDocumentModal
          onClose={() => setShowAddVendorDoc(false)}
          onUploadSelf={() => { setShowAddVendorDoc(false); setShowUpload(true); }}
          onRequestFromVendor={(vendor) => { setShowAddVendorDoc(false); setPreSelectedVendor(vendor || null); setShowRequestFromVendor(true); }}
        />
      )}

      {showRequestFromVendor && (
        <RequestFromVendorModal
          onClose={() => { setShowRequestFromVendor(false); setPreSelectedVendor(null); }}
          onComplete={refetch}
          sourceTab={activeTab === 'kitchen' ? 'service' : (activeTab as 'service' | 'business')}
          preSelectedVendor={preSelectedVendor}
        />
      )}
    </>
  );
}

export { DocumentsPage as Documents };
export default DocumentsPage;
