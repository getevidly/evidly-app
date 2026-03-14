import { useState, useCallback } from 'react';

interface ReportSection {
  id: string;
  title: string;
  complete: boolean;
  data: Record<string, any>;
}

interface ServiceReportDetail {
  id: string;
  certificate_id: string;
  job_id: string;
  service_type: string;
  service_date: string;
  frequency: string;
  next_due_date: string | null;
  overall_status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'sent';
  customer_name: string;
  lead_tech_id: string | null;
  lead_tech_signature_url: string | null;
  reviewer_signature_url: string | null;
  customer_signature_url: string | null;
  technician_notes: string | null;
  qa_status: string;
  sections: ReportSection[];
  systems_count: number;
  deficiencies_count: number;
  photos_count: number;
}

const DEMO_REPORT: ServiceReportDetail = {
  id: 'sr1',
  certificate_id: 'CERT-2026-0342',
  job_id: 'j1',
  service_type: 'KEC',
  service_date: '2026-03-15',
  frequency: 'Quarterly',
  next_due_date: '2026-06-15',
  overall_status: 'in_progress',
  customer_name: 'Mario\'s Italian Kitchen',
  lead_tech_id: 'tech1',
  lead_tech_signature_url: null,
  reviewer_signature_url: null,
  customer_signature_url: null,
  technician_notes: null,
  qa_status: 'pending',
  sections: [
    { id: 'grease_levels', title: 'Grease Levels', complete: true, data: {} },
    { id: 'hood', title: 'Hood', complete: true, data: {} },
    { id: 'filters', title: 'Filters', complete: true, data: {} },
    { id: 'ductwork', title: 'Duct', complete: false, data: {} },
    { id: 'fan_mechanical', title: 'Fan — Mechanical', complete: false, data: {} },
    { id: 'fan_electrical', title: 'Fan — Electrical', complete: false, data: {} },
    { id: 'solid_fuel', title: 'Solid Fuel', complete: false, data: {} },
    { id: 'post_cleaning', title: 'Post Cleaning', complete: false, data: {} },
    { id: 'fire_safety', title: 'Fire Safety', complete: false, data: {} },
    { id: 'photos_sign', title: 'Photos & Sign', complete: false, data: {} },
  ],
  systems_count: 2,
  deficiencies_count: 3,
  photos_count: 12,
};

export function useServiceReport(reportId: string) {
  const [report] = useState<ServiceReportDetail>(DEMO_REPORT);
  const [loading] = useState(false);

  return {
    report,
    loading,
    error: null,
    completedSections: report.sections.filter(s => s.complete).length,
    totalSections: report.sections.length,
    isComplete: report.sections.every(s => s.complete),
  };
}

export function useCreateReport(jobId: string) {
  return {
    createReport: async () => { throw new Error('Not implemented in demo mode'); },
    loading: false,
  };
}

export function useUpdateReportSection(reportId: string, section: string) {
  return {
    updateSection: async (_data: Record<string, any>) => { throw new Error('Not implemented in demo mode'); },
    loading: false,
  };
}
