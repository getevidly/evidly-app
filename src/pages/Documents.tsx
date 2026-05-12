import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadFile, BUCKETS } from '../lib/storage';
import { useDocumentsByTab, type EnrichedDocument } from '../hooks/documents/useDocumentsByTab';
import { computeStats } from '../hooks/documents/useDocumentsStats';
import { DocumentsHeader } from '../components/documents/DocumentsHeader';
import { DocumentsTabs, type DocumentTabId } from '../components/documents/DocumentsTabs';
import { DocumentsToolbar } from '../components/documents/DocumentsToolbar';
import { DocumentsList } from '../components/documents/DocumentsList';
import { EmptyTabContent } from '../components/documents/EmptyTabContent';
import { DocumentDetailModal } from '../components/documents/modals/DocumentDetailModal';
import { SendToThirdPartyModal } from '../components/documents/modals/SendToThirdPartyModal';
import { SmartUploadModal, type ClassifiedFile } from '../components/SmartUploadModal';

const TAB_CATEGORIES: Record<DocumentTabId, string[]> = {
  kitchen:  ['kitchen', 'employee'],
  service:  ['service'],
  business: ['business'],
};

function pillarToCategory(pillar: string): string {
  switch (pillar) {
    case 'fire_safety': return 'service';
    case 'food_safety': return 'kitchen';
    case 'vendor':      return 'business';
    default:            return 'kitchen';
  }
}

export function DocumentsPage() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') as DocumentTabId) || 'kitchen';

  const { documents, loading, refetch } = useDocumentsByTab(orgId);

  // Filter + search state (reset on tab change)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');

  // Modal state
  const [openDoc, setOpenDoc] = useState<EnrichedDocument | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showSendWizard, setShowSendWizard] = useState(false);

  const handleTabChange = useCallback((tab: DocumentTabId) => {
    setSearchParams({ tab });
    setSearch('');
    setStatusFilter('all');
    setLocationFilter('all');
    setVendorFilter('all');
  }, [setSearchParams]);

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

  // SmartUploadModal onSave: upload to storage + INSERT into compliance_documents
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

  // Has unfiltered data for this tab (to distinguish "no docs at all" vs "no filter match")
  const hasAnyTabDocs = tabDocs.length > 0;

  return (
    <Layout title="Documents">
      <DocumentsHeader stats={stats} onSendToThirdParty={() => setShowSendWizard(true)} />
      <DocumentsTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={tabCounts}
        pendingCounts={pendingCounts}
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
      />

      {loading ? (
        <div className="text-center py-12 text-[13px] text-[#8A93A6]">Loading documents…</div>
      ) : hasAnyTabDocs ? (
        <DocumentsList documents={filtered} activeTab={activeTab} onDocClick={setOpenDoc} />
      ) : (
        <EmptyTabContent activeTab={activeTab} onUpload={() => setShowUpload(true)} />
      )}

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
    </Layout>
  );
}

export { DocumentsPage as Documents };
export default DocumentsPage;
