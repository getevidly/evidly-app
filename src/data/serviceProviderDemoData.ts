/**
 * SERVICE-PROVIDER-1 — Demo data for Service Provider Account Setup + Client Invitation Flow.
 *
 * Provider: Cleaning Pros Plus, LLC (Arthur's company)
 * Services: Hood Cleaning, Fan Performance, Grease Filter Exchange, Rooftop Grease Containment
 */

// ── Types ────────────────────────────────────────────────────

export interface ServiceProviderProfile {
  id: string;
  vendorId: string;
  companyName: string;
  dba: string | null;
  services: string[]; // category IDs from vendorCategories.ts
  subServices: string[]; // service IDs within categories
  phone: string;
  email: string;
  website: string | null;
  serviceArea: string;
  setupCompleted: boolean;
  setupCompletedAt: string | null;
  preferredWindow: string;
  serviceReportRequirements: string[];
  createdAt: string;
}

export interface ServiceProviderDocument {
  id: string;
  vendorId: string;
  type: 'certification' | 'insurance_coi' | 'insurance_workers_comp' | 'insurance_auto' | 'license' | 'other';
  name: string;
  fileName: string | null;
  providerName: string | null;
  policyNumber: string | null;
  coverageAmount: number | null;
  certNumber: string | null;
  certState: string | null;
  expirationDate: string | null;
  status: 'uploaded' | 'verified' | 'expiring' | 'expired';
  autoShareWithClients: boolean;
  uploadedAt: string;
}

export interface ServiceDefault {
  serviceId: string;
  serviceName: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
}

export interface SPTeamMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'technician' | 'office_admin' | 'manager';
  status: 'active' | 'invited';
}

export interface ClientInvitation {
  id: string;
  vendorId: string;
  inviteCode: string;
  contactName: string;
  businessName: string;
  email: string;
  phone: string | null;
  role: string | null;
  servicesProvided: string[];
  frequency: string | null;
  numLocations: number;
  k2cReferral: boolean;
  message: string | null;
  status: 'sent' | 'delivered' | 'opened' | 'signed_up' | 'bounced';
  sentAt: string;
  openedAt: string | null;
  signedUpAt: string | null;
  reminderCount: number;
  lastReminderAt: string | null;
}

export interface ServiceProviderClientLink {
  id: string;
  vendorId: string;
  orgId: string;
  orgName: string;
  contactName: string;
  locationCount: number;
  servicesProvided: string[];
  coiShared: boolean;
  certsShared: boolean;
  linkedAt: string;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  status: 'current' | 'overdue';
}

// ── Constants ────────────────────────────────────────────────

export const SERVICE_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
] as const;

export const PREFERRED_WINDOWS = [
  { value: 'during_business', label: 'During Business Hours' },
  { value: 'after_close', label: 'After Close' },
  { value: 'before_open', label: 'Before Open' },
  { value: 'overnight', label: 'Overnight' },
  { value: 'weekends', label: 'Weekends Only' },
] as const;

export const SP_TEAM_ROLES = [
  { value: 'technician', label: 'Technician', description: 'Service + upload reports' },
  { value: 'office_admin', label: 'Office Admin', description: 'Scheduling + documents' },
  { value: 'manager', label: 'Manager', description: 'Full access' },
] as const;

export const SERVICE_REPORT_OPTIONS = [
  { id: 'before_after_photos', label: 'Before/after photos required' },
  { id: 'grease_depth', label: 'Grease depth measurement' },
  { id: 'filter_condition', label: 'Filter condition documented' },
  { id: 'fan_duct_inspection', label: 'Fan/duct access panel inspection' },
  { id: 'nfpa96_sticker', label: 'NFPA 96 compliance sticker applied' },
] as const;

export const CLIENT_ROLE_OPTIONS = [
  { value: 'Owner', label: 'Owner' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Chef', label: 'Chef' },
  { value: 'Facility Manager', label: 'Facility Manager' },
  { value: 'Other', label: 'Other' },
] as const;

// ── Demo Provider Profile ────────────────────────────────────

export const DEMO_SP_PROFILE: ServiceProviderProfile = {
  id: 'sp-1',
  vendorId: 'v-cpp-1',
  companyName: 'Cleaning Pros Plus, LLC',
  dba: null,
  services: ['kitchen_exhaust'],
  subServices: ['hood_cleaning', 'fan_performance', 'grease_filter', 'rooftop_grease'],
  phone: '(209) 636-6116',
  email: 'service@cprosplus.com',
  website: 'www.cleaningprosplus.com',
  serviceArea: 'Central Valley, Northern California',
  setupCompleted: true,
  setupCompletedAt: '2026-02-25T14:30:00Z',
  preferredWindow: 'after_close',
  serviceReportRequirements: ['before_after_photos', 'grease_depth', 'filter_condition', 'fan_duct_inspection', 'nfpa96_sticker'],
  createdAt: '2026-02-25T14:00:00Z',
};

// ── Demo Documents ───────────────────────────────────────────

export const DEMO_SP_DOCUMENTS: ServiceProviderDocument[] = [
  {
    id: 'spd-1',
    vendorId: 'v-cpp-1',
    type: 'certification',
    name: 'IKECA Certification',
    fileName: 'ikeca-cert-cpp.pdf',
    providerName: 'IKECA',
    policyNumber: null,
    coverageAmount: null,
    certNumber: 'IKECA-2024-0847',
    certState: null,
    expirationDate: '2027-03-15',
    status: 'verified',
    autoShareWithClients: true,
    uploadedAt: '2026-02-25T14:10:00Z',
  },
  {
    id: 'spd-2',
    vendorId: 'v-cpp-1',
    type: 'license',
    name: 'Contractor License (California)',
    fileName: 'ca-contractor-license.pdf',
    providerName: null,
    policyNumber: null,
    coverageAmount: null,
    certNumber: 'C-61/D-34 #1042857',
    certState: 'California',
    expirationDate: '2028-01-31',
    status: 'verified',
    autoShareWithClients: true,
    uploadedAt: '2026-02-25T14:12:00Z',
  },
  {
    id: 'spd-3',
    vendorId: 'v-cpp-1',
    type: 'insurance_coi',
    name: 'General Liability COI',
    fileName: 'cpp-coi-2026.pdf',
    providerName: 'Hartford Insurance',
    policyNumber: 'GL-2026-44891',
    coverageAmount: 2000000,
    certNumber: null,
    certState: null,
    expirationDate: '2026-12-31',
    status: 'verified',
    autoShareWithClients: true,
    uploadedAt: '2026-02-25T14:15:00Z',
  },
  {
    id: 'spd-4',
    vendorId: 'v-cpp-1',
    type: 'insurance_workers_comp',
    name: "Workers' Compensation",
    fileName: 'cpp-workers-comp.pdf',
    providerName: 'State Fund',
    policyNumber: 'WC-2026-11234',
    coverageAmount: null,
    certNumber: null,
    certState: 'California',
    expirationDate: '2026-06-30',
    status: 'verified',
    autoShareWithClients: true,
    uploadedAt: '2026-02-25T14:17:00Z',
  },
  {
    id: 'spd-5',
    vendorId: 'v-cpp-1',
    type: 'insurance_auto',
    name: 'Commercial Auto Insurance',
    fileName: 'cpp-auto-insurance.pdf',
    providerName: 'Progressive Commercial',
    policyNumber: 'CA-2026-78320',
    coverageAmount: 1000000,
    certNumber: null,
    certState: null,
    expirationDate: '2026-09-15',
    status: 'verified',
    autoShareWithClients: true,
    uploadedAt: '2026-02-25T14:19:00Z',
  },
];

// ── Demo Service Defaults ────────────────────────────────────

export const DEMO_SP_DEFAULTS: ServiceDefault[] = [
  { serviceId: 'hood_cleaning', serviceName: 'Hood Cleaning / Exhaust Cleaning', frequency: 'quarterly' },
  { serviceId: 'fan_performance', serviceName: 'Fan Performance Management', frequency: 'semi_annual' },
  { serviceId: 'grease_filter', serviceName: 'Grease Filter Exchange', frequency: 'monthly' },
  { serviceId: 'rooftop_grease', serviceName: 'Rooftop Grease Containment', frequency: 'quarterly' },
];

// ── Demo Team ────────────────────────────────────────────────

export const DEMO_SP_TEAM: SPTeamMember[] = [
  { id: 'spt-1', name: 'Miguel Hernandez', email: 'miguel@cprosplus.com', phone: '(209) 555-0101', role: 'technician', status: 'active' },
  { id: 'spt-2', name: 'Jessica Park', email: 'jessica@cprosplus.com', phone: '(209) 555-0102', role: 'office_admin', status: 'active' },
  { id: 'spt-3', name: 'David Nguyen', email: 'david@cprosplus.com', phone: '(209) 555-0103', role: 'technician', status: 'active' },
];

// ── Demo Client Invitations ──────────────────────────────────

export const DEMO_CLIENT_INVITATIONS: ClientInvitation[] = [
  {
    id: 'ci-1',
    vendorId: 'v-cpp-1',
    inviteCode: 'cpp-inv-downtown',
    contactName: 'James Chen',
    businessName: 'Downtown Kitchen',
    email: 'james@downtownkitchen.com',
    phone: '(209) 555-1001',
    role: 'Owner',
    servicesProvided: ['hood_cleaning', 'fan_performance'],
    frequency: 'quarterly',
    numLocations: 3,
    k2cReferral: true,
    message: null,
    status: 'signed_up',
    sentAt: '2026-02-26T09:00:00Z',
    openedAt: '2026-02-26T10:15:00Z',
    signedUpAt: '2026-03-01T11:00:00Z',
    reminderCount: 0,
    lastReminderAt: null,
  },
  {
    id: 'ci-2',
    vendorId: 'v-cpp-1',
    inviteCode: 'cpp-inv-harbor',
    contactName: 'Lisa Patel',
    businessName: 'Harbor Grill',
    email: 'lisa@harborgrill.com',
    phone: '(209) 555-1002',
    role: 'Owner',
    servicesProvided: ['hood_cleaning'],
    frequency: 'quarterly',
    numLocations: 1,
    k2cReferral: false,
    message: null,
    status: 'signed_up',
    sentAt: '2026-02-26T09:05:00Z',
    openedAt: '2026-02-27T08:30:00Z',
    signedUpAt: '2026-02-28T14:00:00Z',
    reminderCount: 0,
    lastReminderAt: null,
  },
  {
    id: 'ci-3',
    vendorId: 'v-cpp-1',
    inviteCode: 'cpp-inv-sunrise',
    contactName: 'Maria Gonzalez',
    businessName: 'Sunrise Cafe',
    email: 'maria@sunrisecafe.net',
    phone: '(209) 555-1003',
    role: 'Manager',
    servicesProvided: ['hood_cleaning', 'grease_filter'],
    frequency: 'quarterly',
    numLocations: 1,
    k2cReferral: true,
    message: null,
    status: 'opened',
    sentAt: '2026-02-25T14:30:00Z',
    openedAt: '2026-02-26T09:45:00Z',
    signedUpAt: null,
    reminderCount: 1,
    lastReminderAt: '2026-03-04T09:00:00Z',
  },
  {
    id: 'ci-4',
    vendorId: 'v-cpp-1',
    inviteCode: 'cpp-inv-central',
    contactName: 'Tom Harrison',
    businessName: 'Central Kitchen Co.',
    email: 'tom@centralkitchen.com',
    phone: null,
    role: 'Owner',
    servicesProvided: ['hood_cleaning'],
    frequency: 'quarterly',
    numLocations: 2,
    k2cReferral: false,
    message: null,
    status: 'sent',
    sentAt: '2026-02-25T14:35:00Z',
    openedAt: null,
    signedUpAt: null,
    reminderCount: 0,
    lastReminderAt: null,
  },
  {
    id: 'ci-5',
    vendorId: 'v-cpp-1',
    inviteCode: 'cpp-inv-bad',
    contactName: 'Unknown',
    businessName: 'Old Contact',
    email: 'noreply@invalid-domain-xyz.com',
    phone: null,
    role: null,
    servicesProvided: ['hood_cleaning'],
    frequency: null,
    numLocations: 1,
    k2cReferral: false,
    message: null,
    status: 'bounced',
    sentAt: '2026-02-25T14:40:00Z',
    openedAt: null,
    signedUpAt: null,
    reminderCount: 0,
    lastReminderAt: null,
  },
];

// ── Demo Client Links (signed-up clients) ────────────────────

export const DEMO_CLIENT_LINKS: ServiceProviderClientLink[] = [
  {
    id: 'cl-1',
    vendorId: 'v-cpp-1',
    orgId: 'org-downtown',
    orgName: 'Downtown Kitchen',
    contactName: 'James Chen',
    locationCount: 3,
    servicesProvided: ['hood_cleaning', 'fan_performance'],
    coiShared: true,
    certsShared: true,
    linkedAt: '2026-03-01T11:00:00Z',
    lastServiceDate: null,
    nextServiceDate: '2026-03-15',
    status: 'current',
  },
  {
    id: 'cl-2',
    vendorId: 'v-cpp-1',
    orgId: 'org-harbor',
    orgName: 'Harbor Grill',
    contactName: 'Lisa Patel',
    locationCount: 1,
    servicesProvided: ['hood_cleaning'],
    coiShared: true,
    certsShared: true,
    linkedAt: '2026-02-28T14:00:00Z',
    lastServiceDate: null,
    nextServiceDate: '2026-03-22',
    status: 'current',
  },
];

// ── Computed Stats ────────────────────────────────────────────

export function getInvitationStats(invitations: ClientInvitation[]) {
  return {
    total: invitations.length,
    sent: invitations.filter(i => i.status === 'sent' || i.status === 'delivered').length,
    opened: invitations.filter(i => i.status === 'opened').length,
    signedUp: invitations.filter(i => i.status === 'signed_up').length,
    bounced: invitations.filter(i => i.status === 'bounced').length,
  };
}

// ── Role-based message templates for service provider invites ──

export function getServiceProviderInviteMessage(
  role: string,
  contactName: string,
  senderName: string,
  senderBusiness: string,
  inviteLink: string,
): string {
  const name = contactName.trim() || '[Contact Name]';
  const link = inviteLink || '[Invite Link]';

  switch (role) {
    case 'Owner':
      return `Hey ${name},

This is ${senderName} from ${senderBusiness}. We're rolling out a new system to make our service relationship smoother \u2014 EvidLY.

With EvidLY, you'll have:
\u2022 All your compliance records in one place (food safety + facility safety)
\u2022 Your hood cleaning schedule, service reports, and our COI \u2014 always up to date
\u2022 Automatic reminders when services are due or documents are expiring
\u2022 A real-time compliance score so you know where you stand before any inspection

I've already set up our side \u2014 your COI and certifications are ready to go. Once you sign up, ${senderBusiness} will be linked as your hood cleaning vendor automatically.

It takes about 10 minutes to set up: ${link}

${senderName}
${senderBusiness}`;

    case 'Manager':
      return `Hey ${name},

${senderName} from ${senderBusiness} here. We're using a new platform called EvidLY to manage our service records, and I'd like to get your kitchen set up so you have direct access to everything \u2014 service reports, our COI, scheduling, and compliance tracking.

Once you're on EvidLY, you'll see our service history, upcoming cleanings, and all documentation in one place. No more emailing back and forth for reports.

Sign up here and we'll be linked automatically: ${link}

${senderName}
${senderBusiness}`;

    case 'Chef':
    case 'Facility Manager':
    default:
      return `Hey ${name},

This is ${senderName} from ${senderBusiness}. We're setting up on EvidLY \u2014 a platform that tracks food safety and facility safety for commercial kitchens.

For you, it means our hood cleaning reports, COI, and service schedule will all be in one place alongside your other compliance records. No more filing paper reports.

Takes about 10 minutes to set up: ${link}

${senderName}
${senderBusiness}`;
  }
}

// ── CSV template columns for bulk import ─────────────────────

export const BULK_CSV_COLUMNS = [
  { header: 'business_name', required: true, description: 'Client business name' },
  { header: 'contact_name', required: true, description: 'Primary contact name' },
  { header: 'email', required: true, description: 'Contact email address' },
  { header: 'phone', required: false, description: 'Contact phone number' },
  { header: 'role', required: false, description: 'owner / manager / chef / facility_manager' },
  { header: 'service_type', required: false, description: 'hood_cleaning, fan_performance, etc.' },
  { header: 'frequency', required: false, description: 'weekly / monthly / quarterly / semi_annual / annual' },
  { header: 'locations', required: false, description: 'Number of locations (default: 1)' },
] as const;

export function generateCSVTemplate(): string {
  const headers = BULK_CSV_COLUMNS.map(c => c.header).join(',');
  const example = 'Downtown Kitchen,James Chen,james@downtownkitchen.com,(209) 555-1001,owner,hood_cleaning,quarterly,3';
  return `${headers}\n${example}`;
}
