export interface Vendor {
  id: string;
  name: string;
  category: string;
  phone: string;
  email: string;
  contactName?: string;
  evidlyPartner: boolean;
  preferredContact: 'text' | 'email' | 'both';
  notes?: string;
}

export const DEMO_VENDORS: Vendor[] = [
  {
    id: 'cpp',
    name: 'Cleaning Pros Plus',
    category: 'hood_cleaning',
    phone: '2096366116',
    email: 'info@cleaningprosplus.com',
    contactName: 'Arthur Haggerty',
    evidlyPartner: true,
    preferredContact: 'both',
    notes: 'IKECA-Certified \u00b7 Central Valley & NorCal \u00b7 EvidLY-Integrated',
  },
  {
    id: 'hvac_demo',
    name: 'Central Valley HVAC Services',
    category: 'hvac',
    phone: '5595550100',
    email: 'service@cvhvac.com',
    contactName: 'Service Dispatch',
    evidlyPartner: false,
    preferredContact: 'text',
  },
  {
    id: 'pest_demo',
    name: 'Valley Pest Control',
    category: 'pest',
    phone: '5595550101',
    email: 'schedule@valleypest.com',
    contactName: 'Scheduling',
    evidlyPartner: false,
    preferredContact: 'email',
  },
  {
    id: 'plumbing_demo',
    name: 'First Call Plumbing',
    category: 'plumbing',
    phone: '5595550102',
    email: 'dispatch@firstcallplumbing.com',
    contactName: 'Dispatch',
    evidlyPartner: false,
    preferredContact: 'both',
  },
  {
    id: 'roofing_demo',
    name: 'Sierra Commercial Roofing',
    category: 'roofing',
    phone: '5595550103',
    email: 'service@sierraroofing.com',
    contactName: 'Service Team',
    evidlyPartner: false,
    preferredContact: 'email',
  },
  {
    id: 'fire_demo',
    name: 'Valley Fire Protection',
    category: 'fire_suppression',
    phone: '5595550104',
    email: 'service@valleyfire.com',
    contactName: 'Fire Prevention Dept',
    evidlyPartner: false,
    preferredContact: 'both',
  },
  {
    id: 'elevator_demo',
    name: 'SafeLift Elevators',
    category: 'elevator_inspection',
    phone: '5556789012',
    email: 'mark@safelift.com',
    contactName: 'Mark Chen',
    evidlyPartner: false,
    preferredContact: 'email',
  },
  {
    id: 'grease_trap_demo',
    name: 'Central Valley Grease Services',
    category: 'grease_trap',
    phone: '5595550106',
    email: 'dispatch@cvgrease.com',
    contactName: 'Dispatch',
    evidlyPartner: false,
    preferredContact: 'both',
    notes: 'Licensed FOG hauler · Monthly pumping · Manifests provided',
  },
  {
    id: 'backflow_demo',
    name: 'Valley Backflow Testing',
    category: 'backflow',
    phone: '5595550107',
    email: 'schedule@valleybackflow.com',
    contactName: 'Testing Scheduler',
    evidlyPartner: false,
    preferredContact: 'email',
    notes: 'ABPA-Certified · Annual testing · Reports filed with water district',
  },
];

export const CATEGORY_VENDOR_MAP: Record<string, string[]> = {
  hood:           ['hood_cleaning'],
  fire_suppression: ['fire_suppression', 'hood_cleaning'],
  refrigeration:  ['refrigeration', 'hvac', 'general'],
  cooking:        ['general'],
  grease_drain:   ['plumbing', 'hood_cleaning'],
  grease_trap:    ['grease_trap', 'plumbing'],
  backflow:       ['backflow', 'plumbing'],
  rooftop:        ['roofing', 'hood_cleaning'],
  hvac:           ['hvac'],
  pest:           ['pest'],
  plumbing:       ['plumbing'],
  elevator:       ['elevator_inspection'],
};

export const getVendorsForCategory = (categoryId: string, allVendors: Vendor[]): Vendor[] => {
  const relevantCategories = CATEGORY_VENDOR_MAP[categoryId] || ['general'];
  return allVendors.filter(v =>
    relevantCategories.includes(v.category) || v.category === 'general'
  );
};

export const buildNotificationMessage = (
  result: { title: string; severity: string; equipment: string; immediateSteps: string[] },
  locationName: string,
  orgName: string,
  hasVideo: boolean,
  hasPhotos?: boolean,
  photoCount?: number,
): string => {
  const severityLabel = result.severity === 'critical' ? 'URGENT' :
                        result.severity === 'urgent'   ? 'URGENT' :
                        result.severity === 'warning'  ? 'ACTION NEEDED' : 'FYI';

  const attachments: string[] = [];
  if (hasVideo) attachments.push('Video attached \u2014 shows the issue');
  if (hasPhotos && photoCount) attachments.push(`${photoCount} photo${photoCount !== 1 ? 's' : ''} attached`);
  const attachmentLine = attachments.length > 0 ? `\n[${attachments.join(' | ')}]` : '';

  return `${severityLabel} \u2014 Kitchen Equipment Issue

Location: ${locationName}
Issue: ${result.title}
Severity: ${result.severity.toUpperCase()}
Equipment: ${result.equipment}

Immediate steps taken:
${result.immediateSteps.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n')}${attachmentLine}

Please contact us as soon as possible.
\u2014 ${orgName}

Sent via EvidLY Kitchen Self-Diagnosis`;
};
