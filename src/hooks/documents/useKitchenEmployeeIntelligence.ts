import { useMemo } from 'react';
import type { EnrichedDocument } from './useDocumentsByTab';

export interface KitchenEmployeeSignal {
  id: string;
  name: string;
  type: string | null;
  status: string;
  expiry_date: string | null;
  days_until_expiry: number | null;
}

export interface KitchenEmployeeIntelligence {
  expiring: KitchenEmployeeSignal[];
  expired: KitchenEmployeeSignal[];
  totalCurrent: number;
  hasSignals: boolean;
}

/** Derives intelligence signals from already-fetched kitchen+employee docs */
export function useKitchenEmployeeIntelligence(
  docs: EnrichedDocument[],
): KitchenEmployeeIntelligence {
  return useMemo(() => {
    const kitchenDocs = docs.filter(
      (d) => d.category === 'kitchen' || d.category === 'employee',
    );

    const expiring: KitchenEmployeeSignal[] = [];
    const expired: KitchenEmployeeSignal[] = [];
    let totalCurrent = 0;

    for (const d of kitchenDocs) {
      const sig: KitchenEmployeeSignal = {
        id: d.id,
        name: d.name,
        type: d.type,
        status: d.status,
        expiry_date: d.expiry_date,
        days_until_expiry: d.days_until_expiry,
      };
      if (d.status === 'expiring') expiring.push(sig);
      else if (d.status === 'expired') expired.push(sig);
      else if (d.status === 'current') totalCurrent++;
    }

    // Sort by urgency (soonest expiry first)
    expiring.sort((a, b) => (a.days_until_expiry ?? 999) - (b.days_until_expiry ?? 999));

    return {
      expiring,
      expired,
      totalCurrent,
      hasSignals: expiring.length > 0 || expired.length > 0,
    };
  }, [docs]);
}
