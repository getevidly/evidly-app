import { useState } from 'react';

interface QAReview {
  id: string;
  report_id: string;
  job_id: string;
  customer_name: string;
  service_type: string;
  technician_name: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  deficiency_count: number;
  photo_count: number;
}

const DEMO_PENDING_REVIEWS: QAReview[] = [
  {
    id: 'qa1',
    report_id: 'r2',
    job_id: 'j6',
    customer_name: 'Cafe Parisien',
    service_type: 'KEC',
    technician_name: 'Mike Torres',
    submitted_at: '2026-03-14T13:30:00Z',
    status: 'pending',
    deficiency_count: 1,
    photo_count: 8,
  },
  {
    id: 'qa2',
    report_id: 'r3',
    job_id: 'j7',
    customer_name: 'BBQ Smokehouse',
    service_type: 'KEC',
    technician_name: 'Sarah Chen',
    submitted_at: '2026-03-14T16:00:00Z',
    status: 'pending',
    deficiency_count: 0,
    photo_count: 18,
  },
  {
    id: 'qa3',
    report_id: 'r4',
    job_id: 'j9',
    customer_name: 'Lakeside Grill',
    service_type: 'KEC',
    technician_name: 'Mike Torres',
    submitted_at: '2026-03-13T14:00:00Z',
    status: 'pending',
    deficiency_count: 2,
    photo_count: 14,
  },
  {
    id: 'qa4',
    report_id: 'r5',
    job_id: 'j10',
    customer_name: 'Harbor Seafood',
    service_type: 'KEC',
    technician_name: 'David Park',
    submitted_at: '2026-03-13T17:00:00Z',
    status: 'pending',
    deficiency_count: 4,
    photo_count: 22,
  },
];

export function useQA() {
  const [pendingReviews] = useState<QAReview[]>(DEMO_PENDING_REVIEWS);

  return {
    pendingReviews,
    approveReport: async (_reviewId: string) => {
      throw new Error('Not implemented in demo mode');
    },
    rejectReport: async (_reviewId: string, _reason: string) => {
      throw new Error('Not implemented in demo mode');
    },
    loading: false,
  };
}
