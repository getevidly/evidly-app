import type { EnrichedDocument } from './useDocumentsByTab';

export interface DocumentsStats {
  total: number;
  current: number;
  expiring: number;
  expired: number;
}

export function computeStats(docs: EnrichedDocument[]): DocumentsStats {
  return {
    total: docs.length,
    current: docs.filter(d => d.status === 'current').length,
    expiring: docs.filter(d => d.status === 'expiring').length,
    expired: docs.filter(d => d.status === 'expired' || d.status === 'overdue').length,
  };
}
