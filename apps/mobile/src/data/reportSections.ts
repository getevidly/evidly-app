export type FieldType = 'select' | 'micron' | 'boolean' | 'text' | 'condition';

export interface FieldOption {
  label: string;
  value: string;
  deficiency?: boolean;
}

export interface SectionField {
  key: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];
  nfpaRef?: string;
  deficiencyTrigger?: { value: string; nfpaSection: string; text: string; corrective: string; severity: 'critical' | 'major' | 'minor' };
  disabledWhen?: { field: string; value: string };
  setsValue?: { field: string; value: string; when: string };
  disables?: { field: string; when: string };
}

export interface ReportSection {
  id: string;
  number: number;
  title: string;
  dbColumn: string;
  serviceTypes?: string[];
  defaultEnabled?: boolean;
  fields: SectionField[];
}

export const GREASE_COMPONENTS = [
  'filter_tract', 'hood_interior', 'vertical_duct', 'horizontal_duct', 'plenum', 'fan_blades', 'fan_bowl'
] as const;

export const REPORT_SECTIONS: ReportSection[] = [
  {
    id: 'grease_levels',
    number: 1,
    title: 'Grease Levels',
    dbColumn: 'grease_levels',
    fields: GREASE_COMPONENTS.map(component => ({
      key: component,
      label: component.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      type: 'micron' as FieldType,
      nfpaRef: component === 'fan_bowl' ? 'NFPA 96 §12.6.1.1.4' : 'NFPA 96 §12.6.1.1.3',
      deficiencyTrigger: component === 'fan_bowl'
        ? { value: '>3175', nfpaSection: '12.6.1.1.4', text: 'Fan bowl grease exceeds 3175 microns.', corrective: 'Clean to 50 microns.', severity: 'major' as const }
        : { value: '>2000', nfpaSection: '12.6.1.1.3', text: 'Grease exceeds 2000 microns.', corrective: 'Clean to 50 microns.', severity: 'major' as const },
    })),
  },
  {
    id: 'hood',
    number: 2,
    title: 'Hood',
    dbColumn: 'hood_data',
    fields: [
      { key: 'hood_condition', label: 'Hood Condition', type: 'condition' },
      { key: 'hood_lights', label: 'Hood Lights', type: 'select', options: [{ label: 'Working', value: 'working' }, { label: 'Not Working', value: 'not_working', deficiency: true }, { label: 'N/A', value: 'na' }], nfpaRef: 'NFPA 96 §9.2.3.1.1', deficiencyTrigger: { value: 'not_working', nfpaSection: '9.2.3.1.1', text: 'Hood lights not working.', corrective: 'Fix or replace lights.', severity: 'minor' } },
      { key: 'drip_tray', label: 'Drip Tray', type: 'select', options: [{ label: 'Present', value: 'present' }, { label: 'Missing', value: 'missing', deficiency: true }, { label: 'Damaged', value: 'damaged', deficiency: true }], nfpaRef: 'NFPA 96 §6.2.4.2', deficiencyTrigger: { value: 'missing', nfpaSection: '6.2.4.2', text: 'Drip pans not installed.', corrective: 'Install drip pans.', severity: 'major' } },
      { key: 'access_panels', label: 'Access Panels', type: 'boolean', nfpaRef: 'NFPA 96 §7.4.1', deficiencyTrigger: { value: 'false', nfpaSection: '7.4.1', text: 'Access panels not installed.', corrective: 'Install 20x20 inch or every 12 feet.', severity: 'major' }, disables: { field: 'panels_accessible', when: 'false' } },
      { key: 'panels_accessible', label: 'Panels Accessible', type: 'boolean', nfpaRef: 'NFPA 96 §4.1.8', deficiencyTrigger: { value: 'false', nfpaSection: '4.1.8', text: 'Interior surfaces not accessible for cleaning.', corrective: 'Install access panels per 7.4.1', severity: 'major' }, disabledWhen: { field: 'access_panels', value: 'false' } },
    ],
  },
  {
    id: 'filters',
    number: 3,
    title: 'Filters',
    dbColumn: 'filter_data',
    fields: [
      { key: 'filter_type', label: 'Filter Type', type: 'select', options: [{ label: 'Baffle', value: 'baffle' }, { label: 'Mesh', value: 'mesh' }, { label: 'Cartridge', value: 'cartridge' }, { label: 'Other', value: 'other' }] },
      { key: 'filter_condition', label: 'Filter Condition', type: 'condition' },
      { key: 'filter_compliance', label: 'UL 1046 Listed', type: 'boolean', nfpaRef: 'NFPA 96 §6.1.2', deficiencyTrigger: { value: 'false', nfpaSection: '6.1.2', text: 'Filters not UL 1046 listed.', corrective: 'Purchase UL 1046 filters.', severity: 'major' } },
    ],
  },
  {
    id: 'ductwork',
    number: 4,
    title: 'Ductwork',
    dbColumn: 'duct_data',
    fields: [
      { key: 'duct_condition', label: 'Duct Condition', type: 'condition' },
      { key: 'leak_test', label: 'Leak-Free', type: 'boolean', nfpaRef: 'NFPA 96 §7.5.2.1', deficiencyTrigger: { value: 'false', nfpaSection: '7.5.2.1', text: 'Exhaust system not leak-free.', corrective: 'Have ducts fixed by contractor.', severity: 'major' } },
      { key: 'access_panels_duct', label: 'Access Panels Present', type: 'boolean', nfpaRef: 'NFPA 96 §7.4.1' },
      { key: 'cleanout_ports', label: 'Clean-out Ports', type: 'boolean', nfpaRef: 'NFPA 96 §8.1.6.3.1', deficiencyTrigger: { value: 'false', nfpaSection: '8.1.6.3.1', text: 'No clean-out port.', corrective: 'Install 3x5 or 4 inch port.', severity: 'major' } },
    ],
  },
  {
    id: 'fan_mechanical',
    number: 5,
    title: 'Fan — Mechanical',
    dbColumn: 'fan_mechanical',
    fields: [
      { key: 'hinge_installed', label: 'Hinge Installed', type: 'boolean', nfpaRef: 'NFPA 96 §8.1.2.1', deficiencyTrigger: { value: 'false', nfpaSection: '8.1.2.1', text: 'Upblast fan not hinged.', corrective: 'Install hinge for safe cleaning.', severity: 'major' }, disables: { field: 'hinge_functional', when: 'false' } },
      { key: 'hinge_functional', label: 'Hinge Functional', type: 'boolean', disabledWhen: { field: 'hinge_installed', value: 'false' } },
      { key: 'belt_tension', label: 'Belt Tension', type: 'select', options: [{ label: 'Good', value: 'good' }, { label: 'Loose', value: 'loose' }, { label: 'Tight', value: 'tight' }, { label: 'Direct Drive', value: 'direct_drive' }], setsValue: { field: 'belt_condition', value: 'Direct Drive', when: 'direct_drive' } },
      { key: 'belt_condition', label: 'Belt Condition', type: 'condition' },
      { key: 'bearings', label: 'Bearings', type: 'condition' },
      { key: 'containment_device', label: 'Grease Containment', type: 'boolean', nfpaRef: 'NFPA 96 §8.1.2.3', deficiencyTrigger: { value: 'false', nfpaSection: '8.1.2.3', text: 'No rooftop grease containment.', corrective: 'Install grease receptacle.', severity: 'major' } },
    ],
  },
  {
    id: 'fan_electrical',
    number: 6,
    title: 'Fan — Electrical',
    dbColumn: 'fan_electrical',
    fields: [
      { key: 'disconnect_present', label: 'Disconnect Present', type: 'boolean' },
      { key: 'disconnect_functional', label: 'Disconnect Functional', type: 'boolean' },
      { key: 'wiring_condition', label: 'Wiring Condition', type: 'condition' },
      { key: 'fan_operational', label: 'Fan Operational', type: 'boolean', nfpaRef: 'NFPA 96 §8.2.2.3', deficiencyTrigger: { value: 'false', nfpaSection: '8.2.2.3', text: 'Exhaust fan not operational.', corrective: 'Cease cooking until repaired.', severity: 'critical' } },
    ],
  },
  {
    id: 'solid_fuel',
    number: 7,
    title: 'Solid Fuel',
    dbColumn: 'solid_fuel',
    defaultEnabled: false,
    fields: [
      { key: 'solid_fuel_buildup', label: 'Solid Fuel Buildup', type: 'select', options: [{ label: 'None', value: 'none' }, { label: 'Light', value: 'light' }, { label: 'Moderate', value: 'moderate' }, { label: 'Heavy', value: 'heavy' }] },
      { key: 'hearth_condition', label: 'Hearth Condition', type: 'condition' },
      { key: 'chimney_condition', label: 'Chimney Condition', type: 'condition' },
    ],
  },
  {
    id: 'post_cleaning',
    number: 8,
    title: 'Post Cleaning',
    dbColumn: 'post_cleaning',
    serviceTypes: ['KEC'],
    fields: [
      ...GREASE_COMPONENTS.map(component => ({
        key: `post_${component}`,
        label: `Post — ${component.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}`,
        type: 'micron' as FieldType,
      })),
      { key: 'final_inspection_pass', label: 'Final Inspection Pass', type: 'boolean' },
    ],
  },
  {
    id: 'fire_safety',
    number: 9,
    title: 'Fire Safety (Courtesy)',
    dbColumn: '_fire_safety',
    fields: [
      { key: 'suppression_system_type', label: 'Suppression System Type', type: 'select', options: [{ label: 'Ansul', value: 'ansul' }, { label: 'Kidde', value: 'kidde' }, { label: 'Range Guard', value: 'range_guard' }, { label: 'Pyro-Chem', value: 'pyro_chem' }, { label: 'Other', value: 'other' }, { label: 'None', value: 'none' }] },
      { key: 'suppression_inspection_current', label: 'Inspection Current', type: 'boolean' },
      { key: 'suppression_nozzle_caps', label: 'Nozzle Caps In Place', type: 'boolean' },
      { key: 'suppression_nozzles_clean', label: 'Nozzles Clean', type: 'boolean' },
      { key: 'suppression_notes', label: 'Suppression Notes', type: 'text' },
    ],
  },
];

export interface ExtinguisherItem {
  location: string;
  type: string;
  size: string;
  last_inspection: string;
  expiry: string;
  condition: string;
  tag_current: boolean;
}

export function getSectionsForServiceType(serviceType: string): ReportSection[] {
  return REPORT_SECTIONS.filter(s => !s.serviceTypes || s.serviceTypes.includes(serviceType));
}

export function getDeficiencyTrigger(sectionId: string, fieldKey: string, value: string) {
  const section = REPORT_SECTIONS.find(s => s.id === sectionId);
  if (!section) return null;
  const field = section.fields.find(f => f.key === fieldKey);
  if (!field?.deficiencyTrigger) return null;
  const trigger = field.deficiencyTrigger;
  if (trigger.value.startsWith('>')) {
    const threshold = parseInt(trigger.value.slice(1), 10);
    if (parseInt(value, 10) > threshold) return trigger;
    return null;
  }
  return value === trigger.value ? trigger : null;
}

export function getDisabledFields(sectionId: string, formData: Record<string, string>): Set<string> {
  const disabled = new Set<string>();
  const section = REPORT_SECTIONS.find(s => s.id === sectionId);
  if (!section) return disabled;
  for (const field of section.fields) {
    if (field.disabledWhen && formData[field.disabledWhen.field] === field.disabledWhen.value) {
      disabled.add(field.key);
    }
  }
  return disabled;
}

export function getForcedValues(sectionId: string, formData: Record<string, string>): Record<string, string> {
  const forced: Record<string, string> = {};
  const section = REPORT_SECTIONS.find(s => s.id === sectionId);
  if (!section) return forced;
  for (const field of section.fields) {
    if (field.setsValue && formData[field.key] === field.setsValue.when) {
      forced[field.setsValue.field] = field.setsValue.value;
    }
    if (field.disables && formData[field.key] === field.disables.when) {
      forced[field.disables.field] = 'N/A';
    }
  }
  return forced;
}
