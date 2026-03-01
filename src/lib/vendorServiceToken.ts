// ── Vendor Service Token — validation & submission utilities ─────────
// Demo mode uses DEMO_TOKEN_MAP; production calls edge function.

export interface ServiceTokenData {
  valid: boolean;
  error?: string;
  serviceRecordId: string;
  vendorName: string;
  vendorEmail: string;
  serviceType: string;
  serviceName: string;
  locationName: string;
  dueDate: string;
  organizationName: string;
  tokenType: 'service_update' | 'verification';
  expiresAt: string;
}

export interface ServiceUpdateData {
  updateType: 'completed' | 'rescheduled' | 'canceled';
  technicianName?: string;
  completionDate?: string;
  rescheduleDate?: string;
  rescheduleReason?: string;
  cancelReason?: string;
  notes?: string;
}

export interface ServiceUpdateResult {
  success: boolean;
  error?: string;
  updateId?: string;
}

// ── Demo token map ──────────────────────────────────────────────────
const DEMO_TOKEN_MAP: Record<string, ServiceTokenData> = {
  'demo-token-1': {
    valid: true,
    serviceRecordId: 'sr-demo-1',
    vendorName: 'ABC Fire Protection',
    vendorEmail: 'service@abcfire.com',
    serviceType: 'kitchen_exhaust',
    serviceName: 'Hood Cleaning',
    locationName: 'Downtown Kitchen',
    dueDate: '2026-03-15',
    organizationName: 'Demo Restaurant Group',
    tokenType: 'service_update',
    expiresAt: '2026-04-15T00:00:00Z',
  },
  'demo-token-2': {
    valid: true,
    serviceRecordId: 'sr-demo-2',
    vendorName: 'Pacific Pest Control',
    vendorEmail: 'dispatch@pacificpest.com',
    serviceType: 'pest_control',
    serviceName: 'Pest Control Service',
    locationName: 'Airport Cafe',
    dueDate: '2026-02-28',
    organizationName: 'Demo Restaurant Group',
    tokenType: 'service_update',
    expiresAt: '2026-03-28T00:00:00Z',
  },
  'demo-token-3': {
    valid: true,
    serviceRecordId: 'sr-demo-3',
    vendorName: 'CleanAir HVAC',
    vendorEmail: 'schedule@cleanairhvac.com',
    serviceType: 'hvac',
    serviceName: 'HVAC Service & Maintenance',
    locationName: 'University Dining',
    dueDate: '2026-03-05',
    organizationName: 'Demo Restaurant Group',
    tokenType: 'service_update',
    expiresAt: '2026-04-05T00:00:00Z',
  },
  'demo-token-4': {
    valid: true,
    serviceRecordId: 'sr-demo-4',
    vendorName: 'Valley Fire Systems',
    vendorEmail: 'mike@valleyfire.com',
    serviceType: 'fire_suppression',
    serviceName: 'Fire Suppression Inspection & Service',
    locationName: 'Downtown Kitchen',
    dueDate: '2026-02-24',
    organizationName: 'Demo Restaurant Group',
    tokenType: 'service_update',
    expiresAt: '2026-03-24T00:00:00Z',
  },
  'demo-token-5': {
    valid: true,
    serviceRecordId: 'sr-demo-5',
    vendorName: 'Metro Backflow Testing',
    vendorEmail: 'testing@metrobackflow.com',
    serviceType: 'backflow',
    serviceName: 'Backflow Prevention Testing',
    locationName: 'Airport Cafe',
    dueDate: '2026-03-20',
    organizationName: 'Demo Restaurant Group',
    tokenType: 'service_update',
    expiresAt: '2026-04-20T00:00:00Z',
  },
};

/**
 * Validate a service update token.
 * Demo mode returns mock data from DEMO_TOKEN_MAP.
 * Production calls the vendor-service-token edge function.
 */
export async function validateServiceToken(token: string): Promise<ServiceTokenData> {
  // Check demo tokens first
  const demoData = DEMO_TOKEN_MAP[token];
  if (demoData) {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 600));
    return demoData;
  }

  // Production: call edge function
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vendor-service-token/validate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }
    );
    if (!response.ok) {
      return { valid: false, error: 'Invalid or expired link' } as ServiceTokenData;
    }
    return await response.json();
  } catch {
    return { valid: false, error: 'Unable to validate link. Please contact your client.' } as ServiceTokenData;
  }
}

/**
 * Submit a service status update (completed/rescheduled/canceled).
 * Demo mode returns success immediately.
 * Production calls the vendor-service-token edge function.
 */
export async function submitServiceUpdate(
  token: string,
  data: ServiceUpdateData
): Promise<ServiceUpdateResult> {
  // Demo tokens always succeed
  if (DEMO_TOKEN_MAP[token]) {
    await new Promise(r => setTimeout(r, 800));
    return { success: true, updateId: `update-demo-${Date.now()}` };
  }

  // Production: call edge function
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vendor-service-token/update`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...data }),
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.error || 'Update failed' };
    }
    return await response.json();
  } catch {
    return { success: false, error: 'Update failed. Please try again.' };
  }
}
