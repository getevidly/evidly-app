/**
 * Shared state + CTA derivation for service requests.
 * Used by RequestsTab and RequestDetail to ensure consistent mapping.
 */

export function deriveState(status: string): 'action' | 'attention' | 'current' | 'fulfilled' | 'cancelled' {
  switch (status) {
    case 'pending_vendor': return 'current';
    case 'vendor_selected': return 'attention';
    case 'vendor_proposed_alt': return 'action';
    case 'pending_operator': return 'action';
    case 'confirmed': return 'fulfilled';
    case 'canceled': return 'cancelled';
    case 'expired': return 'action';
    default: return 'current';
  }
}

export function deriveCta(status: string): { variant: 'primary' | 'secondary'; label: string } | null {
  switch (status) {
    case 'vendor_selected': return { variant: 'secondary', label: 'Review' };
    case 'vendor_proposed_alt': return { variant: 'primary', label: 'Review slots' };
    case 'pending_operator': return { variant: 'primary', label: 'Respond' };
    case 'expired': return { variant: 'primary', label: 'Resend' };
    default: return null;
  }
}
