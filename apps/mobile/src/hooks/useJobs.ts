import { useState } from 'react';

interface Job {
  id: string;
  customer_name: string;
  address: string;
  service_type: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string;
  scheduled_time: string;
  technician_id?: string;
  notes?: string;
}

const DEMO_JOBS: Job[] = [
  { id: 'j1', customer_name: 'Mario\'s Italian Kitchen', address: '123 Main St', service_type: 'KEC', status: 'in_progress', scheduled_date: '2026-03-15', scheduled_time: '08:00' },
  { id: 'j2', customer_name: 'Golden Dragon Restaurant', address: '456 Oak Ave', service_type: 'KEC', status: 'scheduled', scheduled_date: '2026-03-15', scheduled_time: '11:00' },
  { id: 'j3', customer_name: 'Burger Palace', address: '789 Elm St', service_type: 'FSI', status: 'scheduled', scheduled_date: '2026-03-15', scheduled_time: '14:00' },
  { id: 'j4', customer_name: 'The Sushi Bar', address: '321 Pine Rd', service_type: 'KEC', status: 'scheduled', scheduled_date: '2026-03-16', scheduled_time: '08:00' },
  { id: 'j5', customer_name: 'Casa de Tacos', address: '654 Maple Dr', service_type: 'FPM', status: 'scheduled', scheduled_date: '2026-03-16', scheduled_time: '10:30' },
  { id: 'j6', customer_name: 'Cafe Parisien', address: '987 Walnut Blvd', service_type: 'KEC', status: 'completed', scheduled_date: '2026-03-14', scheduled_time: '08:00' },
  { id: 'j7', customer_name: 'BBQ Smokehouse', address: '147 Cedar Ln', service_type: 'KEC', status: 'completed', scheduled_date: '2026-03-14', scheduled_time: '11:00' },
  { id: 'j8', customer_name: 'Thai Orchid', address: '258 Birch Way', service_type: 'GFX', status: 'scheduled', scheduled_date: '2026-03-17', scheduled_time: '09:00' },
];

export function useJobs() {
  const [jobs] = useState<Job[]>(DEMO_JOBS);
  return {
    jobs,
    todayJobs: jobs.filter(j => j.scheduled_date === '2026-03-15'),
    loading: false,
    error: null,
    getJob: (id: string) => jobs.find(j => j.id === id) || null,
    updateJobStatus: async (_id: string, _status: string) => { throw new Error('Not implemented in demo mode'); },
  };
}
