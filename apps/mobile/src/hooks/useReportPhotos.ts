import { useState, useMemo } from 'react';

interface ReportPhoto {
  id: string;
  report_id: string;
  system_id: string | null;
  component: string;
  phase: 'before' | 'during' | 'after';
  photo_url: string;
  no_access: boolean;
  no_access_reason: string | null;
  ai_analysis: any | null;
  captured_at: string;
}

const DEMO_PHOTOS: ReportPhoto[] = [
  { id: 'rp1', report_id: 'sr1', system_id: 'sys1', component: 'filter_tract', phase: 'before', photo_url: 'placeholder', no_access: false, no_access_reason: null, ai_analysis: null, captured_at: '2026-03-15T08:30:00Z' },
  { id: 'rp2', report_id: 'sr1', system_id: 'sys1', component: 'filter_tract', phase: 'after', photo_url: 'placeholder', no_access: false, no_access_reason: null, ai_analysis: null, captured_at: '2026-03-15T10:30:00Z' },
  { id: 'rp3', report_id: 'sr1', system_id: 'sys1', component: 'hood_interior', phase: 'before', photo_url: 'placeholder', no_access: false, no_access_reason: null, ai_analysis: null, captured_at: '2026-03-15T08:32:00Z' },
  { id: 'rp4', report_id: 'sr1', system_id: 'sys1', component: 'hood_interior', phase: 'after', photo_url: 'placeholder', no_access: false, no_access_reason: null, ai_analysis: null, captured_at: '2026-03-15T10:32:00Z' },
  { id: 'rp5', report_id: 'sr1', system_id: 'sys1', component: 'vertical_duct', phase: 'before', photo_url: 'placeholder', no_access: false, no_access_reason: null, ai_analysis: null, captured_at: '2026-03-15T08:34:00Z' },
  { id: 'rp6', report_id: 'sr1', system_id: 'sys1', component: 'vertical_duct', phase: 'after', photo_url: 'placeholder', no_access: false, no_access_reason: null, ai_analysis: null, captured_at: '2026-03-15T10:34:00Z' },
  { id: 'rp7', report_id: 'sr1', system_id: 'sys1', component: 'horizontal_duct', phase: 'before', photo_url: 'placeholder', no_access: false, no_access_reason: null, ai_analysis: null, captured_at: '2026-03-15T08:36:00Z' },
  { id: 'rp8', report_id: 'sr1', system_id: 'sys1', component: 'horizontal_duct', phase: 'after', photo_url: 'placeholder', no_access: false, no_access_reason: null, ai_analysis: null, captured_at: '2026-03-15T10:36:00Z' },
  { id: 'rp9', report_id: 'sr1', system_id: 'sys1', component: 'fan_bowl', phase: 'before', photo_url: 'placeholder', no_access: false, no_access_reason: null, ai_analysis: null, captured_at: '2026-03-15T08:38:00Z' },
  { id: 'rp10', report_id: 'sr1', system_id: 'sys1', component: 'fan_bowl', phase: 'after', photo_url: 'placeholder', no_access: false, no_access_reason: null, ai_analysis: null, captured_at: '2026-03-15T10:38:00Z' },
  // fan_blades: before only (missing after)
  { id: 'rp11', report_id: 'sr1', system_id: 'sys1', component: 'fan_blades', phase: 'before', photo_url: 'placeholder', no_access: false, no_access_reason: null, ai_analysis: null, captured_at: '2026-03-15T08:40:00Z' },
  // plenum: no photos (both missing)
];

// No-access components
const NO_ACCESS_COMPONENTS: Record<string, string> = {};

const ALL_COMPONENTS = ['filter_tract', 'hood_interior', 'vertical_duct', 'horizontal_duct', 'plenum', 'fan_bowl', 'fan_blades'];

export function useReportPhotos(reportId: string) {
  const [photos] = useState<ReportPhoto[]>(DEMO_PHOTOS);
  const [noAccess] = useState<Record<string, string>>(NO_ACCESS_COMPONENTS);
  return {
    photos,
    noAccess,
    loading: false,
    error: null,
    getPhotosBySystem: (systemId: string) => photos.filter(p => p.system_id === systemId),
    getPhotosByPhase: (phase: string) => photos.filter(p => p.phase === phase),
    getPhotosByComponent: (component: string) => photos.filter(p => p.component === component),
  };
}

export function useCapturePhoto(reportId: string, systemId: string, component: string, phase: string) {
  return {
    capturePhoto: async () => { throw new Error('Not implemented in demo mode'); },
    loading: false,
  };
}

export function useMarkNoAccess(reportId: string, systemId: string, component: string, reason: string) {
  return {
    markNoAccess: async () => { throw new Error('Not implemented in demo mode'); },
    loading: false,
  };
}

export function usePhotoProgress(reportId: string): { captured: number; required: number; complete: boolean } {
  const { photos, noAccess } = useReportPhotos(reportId);

  let captured = 0;
  let required = 0;

  for (const comp of ALL_COMPONENTS) {
    if (noAccess[comp]) continue; // skip no-access components
    required += 2; // before + after
    const before = photos.find(p => p.component === comp && p.phase === 'before');
    const after = photos.find(p => p.component === comp && p.phase === 'after');
    if (before) captured++;
    if (after) captured++;
  }

  return { captured, required, complete: captured >= required };
}
