/**
 * SERVICE_OPTIONS — canonical service list for modals and cadence UI.
 * Interim constant until service_catalog table ships (Prompt 2).
 *
 * pillar       = customer-facing column (Fire Safety / Food Safety)
 * managed_by   = operational routing team; defaults to pillar if omitted
 */

export interface ServiceOption {
  code: string;
  label: string;
  sub: string;
  pillar: 'fire_safety' | 'food_safety';
  managed_by?: string;
}

export const SERVICE_OPTIONS: ServiceOption[] = [
  // Fire Safety pillar
  { code: 'kec', label: 'Kitchen Exhaust Cleaning', sub: 'NFPA 96', pillar: 'fire_safety' },
  { code: 'gfx', label: 'Grease Filter Exchange (GFX)', sub: 'NFPA 96 \u00b7 CWA-required', pillar: 'fire_safety' },
  { code: 'fpm', label: 'Fan Performance Management (FPM)', sub: 'NFPA 96', pillar: 'fire_safety' },
  { code: 'rgc', label: 'Rooftop Grease Containment (RGC)', sub: 'NFPA 96', pillar: 'fire_safety' },
  { code: 'fire_suppression', label: 'Fire Suppression', sub: 'NFPA 17A \u00b7 NFPA 96 \u00b7 PSE-required', pillar: 'fire_safety' },
  { code: 'fire_alarm', label: 'Automatic Fire Alarm', sub: 'NFPA 72 \u00b7 PSE-required', pillar: 'fire_safety' },
  { code: 'fire_sprinkler', label: 'Fire Sprinkler', sub: 'NFPA 25 \u00b7 PSE-required', pillar: 'fire_safety' },
  { code: 'fire_extinguisher', label: 'Fire Extinguishers', sub: 'NFPA 10', pillar: 'fire_safety' },
  // Food Safety pillar
  { code: 'pest_control', label: 'Pest Control', sub: 'CalCode \u00a7114259.1', pillar: 'food_safety', managed_by: 'facility_services' },
  { code: 'grease_trap', label: 'Grease Trap Service', sub: 'Local FOG ordinance', pillar: 'food_safety', managed_by: 'facility_services' },
];

/** Group SERVICE_OPTIONS by pillar */
export function getServicesByPillar(): Record<string, ServiceOption[]> {
  const map: Record<string, ServiceOption[]> = {};
  for (const svc of SERVICE_OPTIONS) {
    if (!map[svc.pillar]) map[svc.pillar] = [];
    map[svc.pillar].push(svc);
  }
  return map;
}

/** Pillar display labels */
export const PILLAR_LABELS: Record<string, string> = {
  fire_safety: 'Fire Safety',
  food_safety: 'Food Safety',
};
