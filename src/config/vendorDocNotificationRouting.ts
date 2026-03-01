// ── Vendor Document Notification Routing ─────────────────────────
// Role-based routing matrix: which roles receive notifications
// for which vendor document types.

import type { UserRole } from '../contexts/RoleContext';
import type { NotificationChannel, VendorDocNotificationType } from '../types/vendorDocuments';

export interface NotificationRoutingRule {
  documentType: string;
  label: string;
  roles: UserRole[];
  autoAcknowledge: boolean;
  channels: NotificationChannel[];
}

// ── Document Type → Role Routing Matrix ─────────────────────────
export const VENDOR_DOC_NOTIFICATION_ROUTING: NotificationRoutingRule[] = [
  // General Compliance
  { documentType: 'COI', label: 'Certificate of Insurance', roles: ['owner_operator', 'executive', 'compliance_manager', 'facilities_manager', 'platform_admin'], autoAcknowledge: false, channels: ['in_app', 'email'] },
  { documentType: 'Business License', label: 'Business License', roles: ['owner_operator', 'executive', 'compliance_manager', 'platform_admin'], autoAcknowledge: false, channels: ['in_app', 'email'] },
  { documentType: 'Contract', label: 'Contract / Agreement', roles: ['owner_operator', 'executive', 'platform_admin'], autoAcknowledge: false, channels: ['in_app', 'email'] },
  { documentType: 'W-9', label: 'W-9 / Tax Documents', roles: ['owner_operator', 'executive', 'platform_admin'], autoAcknowledge: true, channels: ['in_app'] },

  // Service-Specific
  { documentType: 'Hood Cleaning Report', label: 'Hood Cleaning Report', roles: ['owner_operator', 'compliance_manager', 'facilities_manager', 'kitchen_manager', 'platform_admin'], autoAcknowledge: true, channels: ['in_app'] },
  { documentType: 'Fire Suppression Cert', label: 'Fire Suppression Certificate', roles: ['owner_operator', 'compliance_manager', 'facilities_manager', 'kitchen_manager', 'platform_admin'], autoAcknowledge: false, channels: ['in_app', 'email'] },
  { documentType: 'Fire Extinguisher Cert', label: 'Fire Extinguisher Certificate', roles: ['owner_operator', 'compliance_manager', 'facilities_manager', 'kitchen_manager', 'platform_admin'], autoAcknowledge: false, channels: ['in_app', 'email'] },
  { documentType: 'Pest Control Report', label: 'Pest Control Report', roles: ['owner_operator', 'compliance_manager', 'facilities_manager', 'chef', 'kitchen_manager', 'platform_admin'], autoAcknowledge: true, channels: ['in_app'] },
  { documentType: 'Grease Trap Record', label: 'Grease Trap Service Record', roles: ['owner_operator', 'compliance_manager', 'facilities_manager', 'kitchen_manager', 'platform_admin'], autoAcknowledge: true, channels: ['in_app'] },
  { documentType: 'Backflow Test', label: 'Backflow Test Report', roles: ['owner_operator', 'compliance_manager', 'facilities_manager', 'platform_admin'], autoAcknowledge: true, channels: ['in_app'] },
  { documentType: 'Elevator Inspection', label: 'Elevator Inspection Certificate', roles: ['owner_operator', 'compliance_manager', 'facilities_manager', 'platform_admin'], autoAcknowledge: true, channels: ['in_app'] },

  // Personnel
  { documentType: 'Technician Cert', label: 'Technician Certification', roles: ['compliance_manager', 'facilities_manager', 'platform_admin'], autoAcknowledge: false, channels: ['in_app', 'email'] },

  // Safety
  { documentType: 'SDS', label: 'Safety Data Sheet', roles: ['compliance_manager', 'facilities_manager', 'chef', 'platform_admin'], autoAcknowledge: true, channels: ['in_app'] },

  // Other
  { documentType: 'Other', label: 'Other Document', roles: ['owner_operator', 'compliance_manager', 'platform_admin'], autoAcknowledge: true, channels: ['in_app'] },
];

// ── Expiration Alert Tiers ──────────────────────────────────────
export interface ExpirationTier {
  daysOut: number;
  type: VendorDocNotificationType;
  severity: 'info' | 'advisory' | 'urgent';
  label: string;
  channels: NotificationChannel[];
}

export const EXPIRATION_TIERS: ExpirationTier[] = [
  { daysOut: 90, type: 'expiring_90', severity: 'info', label: 'Expiring in 90 days', channels: ['email'] },
  { daysOut: 60, type: 'expiring_60', severity: 'info', label: 'Expiring in 60 days', channels: ['email'] },
  { daysOut: 30, type: 'expiring_30', severity: 'advisory', label: 'Expiring in 30 days', channels: ['email', 'in_app'] },
  { daysOut: 14, type: 'expiring_14', severity: 'urgent', label: 'Urgent — expires in 14 days', channels: ['email', 'sms', 'in_app'] },
  { daysOut: 0, type: 'expired', severity: 'urgent', label: 'EXPIRED today', channels: ['email', 'sms', 'in_app'] },
  { daysOut: -1, type: 'expired', severity: 'urgent', label: 'Compliance gap — expired', channels: ['email', 'in_app'] },
];

// ── Utility functions ───────────────────────────────────────────

export function getRoutingForDocType(docType: string): NotificationRoutingRule | undefined {
  return VENDOR_DOC_NOTIFICATION_ROUTING.find(r => r.documentType === docType);
}

export function shouldNotifyRole(docType: string, role: UserRole): boolean {
  const routing = getRoutingForDocType(docType);
  return routing ? routing.roles.includes(role) : false;
}

export function isAutoAcknowledge(docType: string): boolean {
  const routing = getRoutingForDocType(docType);
  return routing?.autoAcknowledge ?? true;
}

export function getExpirationTier(daysUntilExpiry: number): ExpirationTier | null {
  // Find the closest tier that matches
  for (const tier of EXPIRATION_TIERS) {
    if (daysUntilExpiry <= tier.daysOut) return tier;
  }
  return null;
}
