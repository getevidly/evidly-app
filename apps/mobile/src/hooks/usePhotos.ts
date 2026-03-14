import { useState } from 'react';

interface Photo {
  id: string;
  job_id: string;
  phase: 'before' | 'during' | 'after';
  uri: string;
  caption?: string;
  component?: string;
  ai_analysis?: string;
  captured_at: string;
}

const DEMO_PHOTOS: Photo[] = [
  {
    id: 'p1',
    job_id: 'j1',
    phase: 'before',
    uri: 'https://placeholder.com/hood-before.jpg',
    caption: 'Hood interior - heavy grease buildup',
    component: 'hood',
    captured_at: '2026-03-15T08:15:00Z',
  },
  {
    id: 'p2',
    job_id: 'j1',
    phase: 'during',
    uri: 'https://placeholder.com/duct-during.jpg',
    caption: 'Vertical duct section mid-clean',
    component: 'duct',
    captured_at: '2026-03-15T09:30:00Z',
  },
  {
    id: 'p3',
    job_id: 'j1',
    phase: 'after',
    uri: 'https://placeholder.com/filter-after.jpg',
    caption: 'Filters reinstalled after cleaning',
    component: 'filter',
    captured_at: '2026-03-15T10:45:00Z',
  },
];

export function usePhotos() {
  const [photos] = useState<Photo[]>(DEMO_PHOTOS);

  return {
    photos,
    capturePhoto: async (_jobId: string, _phase: string, _component?: string) => {
      throw new Error('Not implemented in demo mode');
    },
    getPhotosByPhase: (jobId: string, phase: string) =>
      photos.filter(p => p.job_id === jobId && p.phase === phase),
    analyzePhoto: async (_photoId: string) => {
      throw new Error('Not implemented in demo mode');
    },
    loading: false,
  };
}
