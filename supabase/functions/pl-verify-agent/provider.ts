/**
 * Agent license verification provider adapter.
 *
 * Isolates all vendor-specific HTTP calls and field mapping.
 * Select provider via env PROVIDER = stub | agentsync | trustlayer | nipr.
 */

import { logger } from "../_shared/logger.ts";

// ── Normalized result shape ─────────────────────────────────

export interface NormalizedProviderResult {
  found: boolean;
  npn?: string;
  licensee_name?: string;
  license_status?: string;
  license_types: string[];
  has_pc_authority: boolean;
  license_issue_date?: string;
  license_expiration_date?: string;
  regulatory_actions: unknown[];
  raw: unknown;
}

// ── Provider interface ──────────────────────────────────────

export interface AgentLicenseProvider {
  verify(args: {
    licenseNumber?: string;
    npn?: string;
    state: string;
  }): Promise<NormalizedProviderResult>;
}

// ── Stub provider (deploys inert) ───────────────────────────

const stubProvider: AgentLicenseProvider = {
  verify() {
    throw new Error("PROVIDER_NOT_CONFIGURED");
  },
};

// ── AgentSync adapter ───────────────────────────────────────
// TODO: Fill endpoint path and field mapping from AgentSync API docs.

const agentSyncProvider: AgentLicenseProvider = {
  async verify(args) {
    const baseUrl = Deno.env.get("PROVIDER_BASE_URL");
    const apiKey = Deno.env.get("PROVIDER_API_KEY");
    if (!baseUrl || !apiKey) throw new Error("PROVIDER_BASE_URL or PROVIDER_API_KEY not set");

    // TODO: Replace with actual AgentSync endpoint path
    const url = new URL("/v1/licenses/search", baseUrl);
    // TODO: Map query params per AgentSync API docs
    if (args.npn) url.searchParams.set("npn", args.npn);
    if (args.licenseNumber) url.searchParams.set("license_number", args.licenseNumber);
    url.searchParams.set("state", args.state);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error("[provider:agentsync] API error", `${res.status} ${text}`);
      throw new Error(`AgentSync API returned ${res.status}`);
    }

    const data = await res.json();

    // TODO: Map AgentSync response fields to NormalizedProviderResult.
    // The field names below are placeholders — replace with actual field
    // paths from the AgentSync response schema.
    const _record = data; // TODO: e.g. data.results?.[0]
    void _record;
    throw new Error("AGENTSYNC_FIELD_MAPPING_NOT_IMPLEMENTED");
  },
};

// ── TrustLayer adapter ──────────────────────────────────────
// TODO: Fill endpoint path and field mapping from TrustLayer API docs.

const trustLayerProvider: AgentLicenseProvider = {
  async verify(args) {
    const baseUrl = Deno.env.get("PROVIDER_BASE_URL");
    const apiKey = Deno.env.get("PROVIDER_API_KEY");
    if (!baseUrl || !apiKey) throw new Error("PROVIDER_BASE_URL or PROVIDER_API_KEY not set");

    // TODO: Replace with actual TrustLayer endpoint path
    const url = new URL("/api/v1/producer-licenses", baseUrl);
    // TODO: Map query params per TrustLayer API docs
    if (args.npn) url.searchParams.set("npn", args.npn);
    if (args.licenseNumber) url.searchParams.set("license_number", args.licenseNumber);
    url.searchParams.set("state", args.state);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error("[provider:trustlayer] API error", `${res.status} ${text}`);
      throw new Error(`TrustLayer API returned ${res.status}`);
    }

    const data = await res.json();

    // TODO: Map TrustLayer response fields to NormalizedProviderResult.
    // The field names below are placeholders — replace with actual field
    // paths from the TrustLayer response schema.
    const _record = data; // TODO: e.g. data.license
    void _record;
    throw new Error("TRUSTLAYER_FIELD_MAPPING_NOT_IMPLEMENTED");
  },
};

// ── NIPR adapter ────────────────────────────────────────────
// TODO: Fill endpoint path and field mapping from NIPR PDB API docs.

const niprProvider: AgentLicenseProvider = {
  async verify(args) {
    const baseUrl = Deno.env.get("PROVIDER_BASE_URL");
    const apiKey = Deno.env.get("PROVIDER_API_KEY");
    if (!baseUrl || !apiKey) throw new Error("PROVIDER_BASE_URL or PROVIDER_API_KEY not set");

    // TODO: Replace with actual NIPR PDB endpoint path
    const url = new URL("/pdb-service/api/v1/license", baseUrl);
    // TODO: Map query params per NIPR PDB API docs
    if (args.npn) url.searchParams.set("npn", args.npn);
    if (args.licenseNumber) url.searchParams.set("licenseNumber", args.licenseNumber);
    url.searchParams.set("state", args.state);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error("[provider:nipr] API error", `${res.status} ${text}`);
      throw new Error(`NIPR API returned ${res.status}`);
    }

    const data = await res.json();

    // TODO: Map NIPR PDB response fields to NormalizedProviderResult.
    // The field names below are placeholders — replace with actual field
    // paths from the NIPR PDB response schema.
    const _record = data; // TODO: e.g. data.producer
    void _record;
    throw new Error("NIPR_FIELD_MAPPING_NOT_IMPLEMENTED");
  },
};

// ── Provider registry ───────────────────────────────────────

const PROVIDERS: Record<string, AgentLicenseProvider> = {
  stub: stubProvider,
  agentsync: agentSyncProvider,
  trustlayer: trustLayerProvider,
  nipr: niprProvider,
};

export function getProvider(): AgentLicenseProvider {
  const name = (Deno.env.get("PROVIDER") || "stub").toLowerCase();
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown PROVIDER: ${name}. Valid: ${Object.keys(PROVIDERS).join(", ")}`);
  }
  return provider;
}
