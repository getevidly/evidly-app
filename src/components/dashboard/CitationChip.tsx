import { useState } from 'react';
import { CitationModal } from './CitationModal';

interface CitationChipProps {
  citationId: string;
  children: string;
}

export function CitationChip({ citationId, children }: CitationChipProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="citation-chip"
        onClick={() => setOpen(true)}
        title="View statute details"
      >
        {children}
      </button>
      {open && <CitationModal citationId={citationId} onClose={() => setOpen(false)} />}
    </>
  );
}
