import { useState } from 'react';

interface ReportPhoto {
  id: string;
  report_id: string;
  system_id: string;
  component: string;
  phase: 'before' | 'during' | 'after';
  photo_url: string;
  no_access: boolean;
  no_access_reason: string | null;
  ai_analysis: string | null;
  captured_at: string;
}

const DEMO_PHOTOS: ReportPhoto[] = [
  {
    id: 'rp1',
    report_id: 'sr1',
    system_id: 'sys1',
    component: 'hood_interior',
    phase: 'before',
    photo_url: 'https://placeholder.com/sys1-hood-before.jpg',
    no_access: false,
    no_access_reason: null,
    ai_analysis: 'Heavy grease accumulation detected on hood plenum. Estimated depth >2mm.',
    captured_at: '2026-03-15T08:20:00Z',
  },
  {
    id: 'rp2',
    report_id: 'sr1',
    system_id: 'sys1',
    component: 'hood_interior',
    phase: 'after',
    photo_url: 'https://placeholder.com/sys1-hood-after.jpg',
    no_access: false,
    no_access_reason: null,
    ai_analysis: 'Hood interior cleaned to bare metal. No visible grease residue.',
    captured_at: '2026-03-15T10:00:00Z',
  },
  {
    id: 'rp3',
    report_id: 'sr1',
    system_id: 'sys1',
    component: 'duct_vertical',
    phase: 'before',
    photo_url: 'https://placeholder.com/sys1-duct-before.jpg',
    no_access: false,
    no_access_reason: null,
    ai_analysis: 'Significant grease deposits in vertical duct section. Fire hazard noted.',
    captured_at: '2026-03-15T08:35:00Z',
  },
  {
    id: 'rp4',
    report_id: 'sr1',
    system_id: 'sys1',
    component: 'duct_vertical',
    phase: 'after',
    photo_url: 'https://placeholder.com/sys1-duct-after.jpg',
    no_access: false,
    no_access_reason: null,
    ai_analysis: 'Duct section cleaned. Light residue remains in seam areas.',
    captured_at: '2026-03-15T10:10:00Z',
  },
  {
    id: 'rp5',
    report_id: 'sr1',
    system_id: 'sys2',
    component: 'hood_interior',
    phase: 'before',
    photo_url: 'https://placeholder.com/sys2-hood-before.jpg',
    no_access: false,
    no_access_reason: null,
    ai_analysis: 'Light grease film on hood surfaces. Within acceptable range.',
    captured_at: '2026-03-15T08:50:00Z',
  },
  {
    id: 'rp6',
    report_id: 'sr1',
    system_id: 'sys2',
    component: 'fan',
    phase: 'before',
    photo_url: '',
    no_access: true,
    no_access_reason: 'Roof access restricted by building management. Photo taken from access panel below.',
    ai_analysis: null,
    captured_at: '2026-03-15T09:00:00Z',
  },
];

export function useReportPhotos() {
  const [photos] = useState<ReportPhoto[]>(DEMO_PHOTOS);

  return {
    photos,
    getPhotosBySystem: (systemId: string) => photos.filter(p => p.system_id === systemId),
    getPhotosByPhase: (reportId: string, phase: string) =>
      photos.filter(p => p.report_id === reportId && p.phase === phase),
    addPhoto: async (_data: Omit<ReportPhoto, 'id'>) => {
      throw new Error('Not implemented in demo mode');
    },
    markNoAccess: async (_reportId: string, _systemId: string, _component: string, _reason: string) => {
      throw new Error('Not implemented in demo mode');
    },
    loading: false,
  };
}
