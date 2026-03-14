import { useState } from 'react';

interface ServiceReport {
  id: string;
  vendor_id: string;
  job_id: string;
  certificate_id: string;
  service_type: string;
  service_date: string;
  frequency: string;
  next_due_date: string | null;
  overall_status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'sent';
  technician_notes: string | null;
  lead_tech_id: string | null;
  lead_tech_signature_url: string | null;
  customer_name: string | null;
  customer_signature_url: string | null;
  pdf_url: string | null;
  qa_status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  sent_to_customer: boolean;
  created_at: string;
  updated_at: string;
  systems_count?: number;
  deficiencies_count?: number;
  photos_count?: number;
}

const DEMO_REPORTS: ServiceReport[] = [
  {
    id: 'sr1', vendor_id: 'v1', job_id: 'j1', certificate_id: 'CERT-2026-0342',
    service_type: 'KEC', service_date: '2026-03-15', frequency: 'Quarterly',
    next_due_date: '2026-06-15', overall_status: 'in_progress',
    technician_notes: 'Heavy grease buildup in vertical duct',
    lead_tech_id: 'tech1', lead_tech_signature_url: null,
    customer_name: 'Mario Rossi', customer_signature_url: null,
    pdf_url: null, qa_status: 'pending', sent_to_customer: false,
    created_at: '2026-03-15T08:30:00Z', updated_at: '2026-03-15T10:15:00Z',
    systems_count: 2, deficiencies_count: 3, photos_count: 12,
  },
  {
    id: 'sr2', vendor_id: 'v1', job_id: 'j6', certificate_id: 'CERT-2026-0341',
    service_type: 'KEC', service_date: '2026-03-14', frequency: 'Monthly',
    next_due_date: '2026-04-14', overall_status: 'completed',
    technician_notes: null,
    lead_tech_id: 'tech1', lead_tech_signature_url: 'https://placeholder/sig1.png',
    customer_name: 'Pierre Dupont', customer_signature_url: 'https://placeholder/sig2.png',
    pdf_url: 'https://placeholder/report.pdf', qa_status: 'approved', sent_to_customer: true,
    created_at: '2026-03-14T08:00:00Z', updated_at: '2026-03-14T14:00:00Z',
    systems_count: 1, deficiencies_count: 1, photos_count: 8,
  },
  {
    id: 'sr3', vendor_id: 'v1', job_id: 'j7', certificate_id: 'CERT-2026-0340',
    service_type: 'KEC', service_date: '2026-03-14', frequency: 'Quarterly',
    next_due_date: '2026-06-14', overall_status: 'approved',
    technician_notes: 'All systems clean. No deficiencies.',
    lead_tech_id: 'tech2', lead_tech_signature_url: 'https://placeholder/sig3.png',
    customer_name: 'Jim Johnson', customer_signature_url: 'https://placeholder/sig4.png',
    pdf_url: 'https://placeholder/report2.pdf', qa_status: 'approved', sent_to_customer: true,
    created_at: '2026-03-14T11:00:00Z', updated_at: '2026-03-14T16:00:00Z',
    systems_count: 3, deficiencies_count: 0, photos_count: 18,
  },
];

export function useServiceReports() {
  const [reports] = useState<ServiceReport[]>(DEMO_REPORTS);
  return {
    reports,
    loading: false,
    error: null,
    getReport: (id: string) => reports.find(r => r.id === id) || null,
    getReportByJob: (jobId: string) => reports.find(r => r.job_id === jobId) || null,
    createReport: async (_data: Partial<ServiceReport>) => { throw new Error('Not implemented in demo mode'); },
    updateReport: async (_id: string, _data: Partial<ServiceReport>) => { throw new Error('Not implemented in demo mode'); },
    submitForQA: async (_id: string) => { throw new Error('Not implemented in demo mode'); },
    generatePdf: async (_id: string) => { throw new Error('Not implemented in demo mode'); },
    sendToCustomer: async (_id: string, _email: string) => { throw new Error('Not implemented in demo mode'); },
  };
}
