import type { EnrichedDocument } from '../../hooks/documents/useDocumentsByTab';
import type { DocumentTabId } from './DocumentsTabs';
import { DocumentCard } from './DocumentCard';

interface DocumentsListProps {
  documents: EnrichedDocument[];
  activeTab: DocumentTabId;
  onDocClick: (doc: EnrichedDocument) => void;
}

export function DocumentsList({ documents, activeTab, onDocClick }: DocumentsListProps) {
  if (documents.length === 0) {
    return (
      <div className="bg-white border border-dashed border-[#E2DDD4] rounded-lg p-8 text-center text-[#8A93A6] text-[13px]">
        No documents match these filters.
      </div>
    );
  }

  return (
    <div className="grid gap-2.5">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} doc={doc} activeTab={activeTab} onClick={onDocClick} />
      ))}
    </div>
  );
}
