/**
 * intelligenceBridge.ts — One-way data push from live EvidLY app to EvidLY Intelligence
 *
 * This module pushes data TO the Intelligence project. It never imports from Intelligence.
 * Intelligence pushes back via the intelligence-webhook edge function.
 *
 * Design principles:
 *   - Fire-and-forget: never throws, never blocks the live app
 *   - Graceful degradation: silently no-ops if BRIDGE_URL is not configured
 *   - 5-second hard timeout on all requests
 */

const BRIDGE_URL = import.meta.env.VITE_INTELLIGENCE_BRIDGE_URL as string | undefined;
const BRIDGE_SECRET = import.meta.env.VITE_INTELLIGENCE_WEBHOOK_SECRET as string | undefined;

// ── Internal transport ────────────────────────────────────

async function bridgePost(payload: object): Promise<void> {
  if (!BRIDGE_URL) return; // graceful degradation — Intelligence not configured

  try {
    await fetch(BRIDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-evidly-bridge-secret': BRIDGE_SECRET || '',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // 5-second timeout max
    });
  } catch {
    /* silent fail — Intelligence sync must never break the live app */
  }
}

// ── Public API ────────────────────────────────────────────

export interface ComplianceSnapshot {
  foodSafety: number;
  fireSafety: number;
  openItems: number;
  lastInspectionDate?: string | null;
}

/** Push full org profile to Intelligence (called on login) */
export async function syncOrgToIntelligence(params: {
  orgId: string;
  orgName: string;
  subscriptionTier: string;
  jurisdictionIds: string[];
  locationCounties: string[];
  locationNames: string[];
  complianceSnapshot?: ComplianceSnapshot | null;
}): Promise<void> {
  await bridgePost({
    event: 'org_sync',
    live_org_id: params.orgId,
    org_name: params.orgName,
    subscription_tier: params.subscriptionTier,
    jurisdiction_ids: params.jurisdictionIds,
    location_counties: params.locationCounties,
    location_names: params.locationNames,
    compliance_snapshot: params.complianceSnapshot || null,
  });
}

/** Push a compliance score delta when scores change significantly */
export async function pushComplianceUpdate(
  orgId: string,
  snapshot: { foodSafety: number; fireSafety: number; openItems: number },
): Promise<void> {
  await bridgePost({
    event: 'compliance_update',
    live_org_id: orgId,
    compliance_snapshot: snapshot,
  });
}

/** Notify Intelligence that an org has been deactivated */
export async function deactivateOrgInIntelligence(orgId: string): Promise<void> {
  await bridgePost({
    event: 'org_deactivated',
    live_org_id: orgId,
  });
}

/** Called from Intelligence Hub when user clicks "Generate Executive Brief" */
export async function requestExecutiveSnapshot(
  orgId: string,
  snapshotType: string = 'weekly_review',
): Promise<void> {
  await bridgePost({
    event: 'request_snapshot',
    live_org_id: orgId,
    snapshot_type: snapshotType,
  });
}
