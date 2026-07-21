/**
 * Server-side notification routing config for document uploads.
 * Mirrors src/config/vendorDocNotificationRouting.ts for use in
 * Deno edge functions (no React type imports).
 *
 * Maps compliance_documents.type → eligible roles + channels.
 */

export interface RoutingRule {
  roles: string[];
  channels: string[]; // 'email' | 'in_app' | 'sms'
}

const ROUTING_MAP: Record<string, RoutingRule> = {
  // General Compliance
  "COI":                   { roles: ["owner_operator", "executive", "compliance_manager", "facilities_manager", "platform_admin"], channels: ["in_app", "email"] },
  "Business License":      { roles: ["owner_operator", "executive", "compliance_manager", "platform_admin"], channels: ["in_app", "email"] },
  "Contract":              { roles: ["owner_operator", "executive", "platform_admin"], channels: ["in_app", "email"] },
  "W-9":                   { roles: ["owner_operator", "executive", "platform_admin"], channels: ["in_app"] },

  // Service-Specific
  "Hood Cleaning Report":  { roles: ["owner_operator", "compliance_manager", "facilities_manager", "kitchen_manager", "platform_admin"], channels: ["in_app"] },
  "Fire Suppression Cert": { roles: ["owner_operator", "compliance_manager", "facilities_manager", "kitchen_manager", "platform_admin"], channels: ["in_app", "email"] },
  "Fire Extinguisher Cert":{ roles: ["owner_operator", "compliance_manager", "facilities_manager", "kitchen_manager", "platform_admin"], channels: ["in_app", "email"] },
  "Pest Control Report":   { roles: ["owner_operator", "compliance_manager", "facilities_manager", "chef", "kitchen_manager", "platform_admin"], channels: ["in_app"] },
  "Grease Trap Record":    { roles: ["owner_operator", "compliance_manager", "facilities_manager", "kitchen_manager", "platform_admin"], channels: ["in_app"] },
  "Backflow Test":         { roles: ["owner_operator", "compliance_manager", "facilities_manager", "platform_admin"], channels: ["in_app"] },
  "Elevator Inspection":   { roles: ["owner_operator", "compliance_manager", "facilities_manager", "platform_admin"], channels: ["in_app"] },

  // Personnel
  "Technician Cert":       { roles: ["compliance_manager", "facilities_manager", "platform_admin"], channels: ["in_app", "email"] },

  // Safety
  "SDS":                   { roles: ["compliance_manager", "facilities_manager", "chef", "platform_admin"], channels: ["in_app"] },
};

/** Fallback for document types not in the routing map. */
const DEFAULT_RULE: RoutingRule = {
  roles: ["owner_operator", "compliance_manager", "platform_admin"],
  channels: ["in_app", "email"],
};

/**
 * Look up routing rule for a document type.
 * Returns the matching rule or a permissive default.
 */
export function getServerRoutingForDocType(docType: string | null): RoutingRule {
  if (!docType) return DEFAULT_RULE;
  return ROUTING_MAP[docType] || DEFAULT_RULE;
}
