import { useCitation } from '../../hooks/useCitation';
import { Modal } from '../ui/Modal';

interface CitationModalProps {
  citationId: string;
  onClose: () => void;
}

export function CitationModal({ citationId, onClose }: CitationModalProps) {
  const { citation, loading, error } = useCitation(citationId);

  return (
    <Modal isOpen={true} onClose={onClose} size="lg">
      {/* Header — navy bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#0B1628] text-white rounded-t-xl">
        <div className="min-w-0">
          {loading ? (
            <div className="h-5 w-40 bg-white/20 rounded animate-pulse" />
          ) : citation ? (
            <>
              <h3 className="text-lg font-semibold">
                {citation.code_family} §{citation.section_number}
              </h3>
              <p className="text-sm text-white/70 truncate">{citation.short_title}</p>
            </>
          ) : (
            <h3 className="text-lg font-semibold">Citation</h3>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 ml-4 flex-shrink-0"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body — cream */}
      <div className="px-6 py-5 bg-[#FAF7F0]">
        {loading && (
          <div className="space-y-3">
            <div className="h-4 w-full bg-[#1E2D4D]/10 rounded animate-pulse" />
            <div className="h-4 w-[90%] bg-[#1E2D4D]/10 rounded animate-pulse" />
            <div className="h-4 w-[75%] bg-[#1E2D4D]/10 rounded animate-pulse" />
          </div>
        )}

        {error && !citation && (
          <p className="text-sm text-[#1E2D4D]/60">
            Unable to load citation details. The reference may have been updated.
          </p>
        )}

        {citation && (
          <>
            {citation.full_text ? (
              <div className="text-sm text-[#0B1628] leading-relaxed whitespace-pre-line max-h-[50vh] overflow-y-auto">
                {citation.full_text}
              </div>
            ) : (
              <p className="text-sm text-[#1E2D4D]/60 italic">
                Full text not available for this section.
              </p>
            )}

            {/* Metadata row */}
            <div className="mt-4 pt-3 border-t border-[#1E2D4D]/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#1E2D4D]/50">
              {citation.current_edition_year && (
                <span>{citation.current_edition_year} Edition</span>
              )}
              {citation.effective_date && (
                <span>
                  Effective{' '}
                  {new Date(citation.effective_date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
              {citation.applies_to_pillar && (
                <span className="capitalize">
                  {citation.applies_to_pillar.replace('_', ' ')}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E2D4D]/10 bg-white rounded-b-xl">
        {citation?.source_url ? (
          <a
            href={citation.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#A08C5A] hover:text-[#8A7548] transition-colors"
          >
            View on leginfo.legislature.ca.gov &rarr;
          </a>
        ) : (
          <span />
        )}
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm border border-[#D1D9E6] rounded-xl hover:bg-[#1E2D4D]/5 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
