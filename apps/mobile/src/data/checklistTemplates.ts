export interface ChecklistItem {
  id: string;
  label: string;
  type: 'pass_fail' | 'yes_no' | 'rating' | 'text' | 'photo_required' | 'measurement';
  required: boolean;
  photo_required: boolean;
  min_photos: number;
  help_text: string;
  fail_creates_deficiency: boolean;
  deficiency_severity?: 'critical' | 'major' | 'minor';
  options?: string[];
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  service_type: string;
  phase: 'pre' | 'during' | 'post';
  items: ChecklistItem[];
}

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'kec-pre',
    name: 'KEC Pre-Cleaning Inspection',
    service_type: 'KEC',
    phase: 'pre',
    items: [
      { id: 'kp1', label: 'Hood surfaces accessible for inspection', type: 'yes_no', required: true, photo_required: false, min_photos: 0, help_text: 'Verify all hood surfaces can be accessed', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'kp2', label: 'Grease buildup level — hood interior', type: 'rating', required: true, photo_required: true, min_photos: 1, help_text: 'Rate 1-5: 1=Clean, 5=Excessive', fail_creates_deficiency: false, options: ['1 - Clean', '2 - Light', '3 - Moderate', '4 - Heavy', '5 - Excessive'] },
      { id: 'kp3', label: 'Filters in place and condition', type: 'pass_fail', required: true, photo_required: true, min_photos: 1, help_text: 'Check all filters are present and UL 1046 listed', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'kp4', label: 'Drip trays present and functional', type: 'pass_fail', required: true, photo_required: false, min_photos: 0, help_text: 'Check for proper drainage', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'kp5', label: 'Access panels installed', type: 'yes_no', required: true, photo_required: true, min_photos: 1, help_text: 'Per NFPA 96 §7.4.1 — 20x20" or every 12ft', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'kp6', label: 'Hood lights operational', type: 'pass_fail', required: true, photo_required: false, min_photos: 0, help_text: 'Per NFPA 96 §9.2.3.1.1', fail_creates_deficiency: true, deficiency_severity: 'minor' },
      { id: 'kp7', label: 'Fan hinge installed and operational', type: 'pass_fail', required: true, photo_required: true, min_photos: 1, help_text: 'Upblast fan must be hinged per NFPA 96 §8.1.2.1', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'kp8', label: 'Rooftop grease containment present', type: 'yes_no', required: true, photo_required: true, min_photos: 1, help_text: 'Per NFPA 96 §8.1.2.3', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'kp9', label: 'Exhaust fan operational', type: 'pass_fail', required: true, photo_required: false, min_photos: 0, help_text: 'CRITICAL: Per NFPA 96 §8.2.2.3', fail_creates_deficiency: true, deficiency_severity: 'critical' },
      { id: 'kp10', label: 'Pre-cleaning notes', type: 'text', required: false, photo_required: false, min_photos: 0, help_text: 'Any additional observations', fail_creates_deficiency: false },
    ],
  },
  {
    id: 'kec-post',
    name: 'KEC Post-Cleaning Verification',
    service_type: 'KEC',
    phase: 'post',
    items: [
      { id: 'ko1', label: 'Hood interior cleaned to bare metal', type: 'pass_fail', required: true, photo_required: true, min_photos: 2, help_text: 'All interior surfaces ≤50 microns', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'ko2', label: 'Filters cleaned/replaced', type: 'pass_fail', required: true, photo_required: true, min_photos: 1, help_text: 'Filters free of grease', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'ko3', label: 'Ductwork cleaned — vertical', type: 'pass_fail', required: true, photo_required: true, min_photos: 1, help_text: '≤50 microns per NFPA 96 §12.6.1.1.3', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'ko4', label: 'Ductwork cleaned — horizontal', type: 'pass_fail', required: true, photo_required: true, min_photos: 1, help_text: '≤50 microns', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'ko5', label: 'Fan blades and bowl cleaned', type: 'pass_fail', required: true, photo_required: true, min_photos: 1, help_text: 'Fan bowl ≤50 microns per §12.6.1.1.4', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'ko6', label: 'Post-cleaning grease measurement', type: 'measurement', required: true, photo_required: false, min_photos: 0, help_text: 'Measure microns at worst point', fail_creates_deficiency: false },
      { id: 'ko7', label: 'Area cleaned and restored', type: 'pass_fail', required: true, photo_required: true, min_photos: 1, help_text: 'Work area returned to pre-service condition', fail_creates_deficiency: false },
      { id: 'ko8', label: 'Equipment operational after service', type: 'pass_fail', required: true, photo_required: false, min_photos: 0, help_text: 'Fan, lights, suppression system all functional', fail_creates_deficiency: true, deficiency_severity: 'critical' },
      { id: 'ko9', label: 'Certificate of service posted', type: 'yes_no', required: true, photo_required: true, min_photos: 1, help_text: 'Per NFPA 96 §12.6.13', fail_creates_deficiency: true, deficiency_severity: 'minor' },
      { id: 'ko10', label: 'Post-cleaning notes', type: 'text', required: false, photo_required: false, min_photos: 0, help_text: 'Final observations', fail_creates_deficiency: false },
    ],
  },
  {
    id: 'fsi-pre',
    name: 'FSI Pre-Inspection',
    service_type: 'FSI',
    phase: 'pre',
    items: [
      { id: 'fp1', label: 'Suppression system tag current', type: 'yes_no', required: true, photo_required: true, min_photos: 1, help_text: 'Check inspection tag date', fail_creates_deficiency: true, deficiency_severity: 'critical' },
      { id: 'fp2', label: 'Nozzle caps in place', type: 'pass_fail', required: true, photo_required: true, min_photos: 1, help_text: 'All nozzles must have caps', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'fp3', label: 'Nozzles aligned with cooking appliances', type: 'pass_fail', required: true, photo_required: false, min_photos: 0, help_text: 'Verify nozzle positioning', fail_creates_deficiency: true, deficiency_severity: 'critical' },
      { id: 'fp4', label: 'Manual pull station accessible', type: 'pass_fail', required: true, photo_required: true, min_photos: 1, help_text: 'Unobstructed access to pull station', fail_creates_deficiency: true, deficiency_severity: 'critical' },
      { id: 'fp5', label: 'Fire extinguishers present and current', type: 'pass_fail', required: true, photo_required: true, min_photos: 1, help_text: 'Check type, size, inspection date', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'fp6', label: 'K-class extinguisher present', type: 'yes_no', required: true, photo_required: false, min_photos: 0, help_text: 'Required for commercial kitchens', fail_creates_deficiency: true, deficiency_severity: 'major' },
      { id: 'fp7', label: 'Gas shutoff accessible', type: 'pass_fail', required: true, photo_required: false, min_photos: 0, help_text: 'Emergency gas valve reachable', fail_creates_deficiency: true, deficiency_severity: 'critical' },
    ],
  },
  {
    id: 'fsi-post',
    name: 'FSI Post-Inspection Summary',
    service_type: 'FSI',
    phase: 'post',
    items: [
      { id: 'fo1', label: 'Suppression system functional', type: 'pass_fail', required: true, photo_required: false, min_photos: 0, help_text: 'System passes operational test', fail_creates_deficiency: true, deficiency_severity: 'critical' },
      { id: 'fo2', label: 'All deficiencies documented', type: 'yes_no', required: true, photo_required: false, min_photos: 0, help_text: 'Confirm all findings recorded', fail_creates_deficiency: false },
      { id: 'fo3', label: 'Customer notified of findings', type: 'yes_no', required: true, photo_required: false, min_photos: 0, help_text: 'Discuss results with manager on duty', fail_creates_deficiency: false },
      { id: 'fo4', label: 'Courtesy fire safety report provided', type: 'yes_no', required: false, photo_required: false, min_photos: 0, help_text: 'Optional courtesy report for customer', fail_creates_deficiency: false },
      { id: 'fo5', label: 'Next service date confirmed', type: 'yes_no', required: true, photo_required: false, min_photos: 0, help_text: 'Verify next appointment scheduled', fail_creates_deficiency: false },
      { id: 'fo6', label: 'Final inspection notes', type: 'text', required: false, photo_required: false, min_photos: 0, help_text: 'Summary of inspection findings', fail_creates_deficiency: false },
      { id: 'fo7', label: 'New inspection tag placed', type: 'yes_no', required: true, photo_required: true, min_photos: 1, help_text: 'New tag with date and company info', fail_creates_deficiency: true, deficiency_severity: 'minor' },
    ],
  },
];

export function getTemplatesByServiceType(serviceType: string): ChecklistTemplate[] {
  return CHECKLIST_TEMPLATES.filter(t => t.service_type === serviceType);
}

export function getTemplateByPhase(serviceType: string, phase: 'pre' | 'during' | 'post'): ChecklistTemplate | undefined {
  return CHECKLIST_TEMPLATES.find(t => t.service_type === serviceType && t.phase === phase);
}
