import { useState } from 'react';

interface Report {
  id: string;
  job_id: string;
  status: 'draft' | 'generated' | 'submitted' | 'approved';
  pdf_url?: string;
  generated_at?: string;
  submitted_at?: string;
  approved_at?: string;
}

const DEMO_REPORTS: Report[] = [
  {
    id: 'r1',
    job_id: 'j6',
    status: 'approved',
    pdf_url: 'https://placeholder.com/report-j6.pdf',
    generated_at: '2026-03-14T13:00:00Z',
    submitted_at: '2026-03-14T13:30:00Z',
    approved_at: '2026-03-14T15:00:00Z',
  },
];

export function useReports() {
  const [reports] = useState<Report[]>(DEMO_REPORTS);

  return {
    reports,
    generateReport: async (_jobId: string) => {
      throw new Error('Not implemented in demo mode');
    },
    getReportByJob: (jobId: string) => reports.find(r => r.job_id === jobId) || null,
    loading: false,
  };
}
