import { Link } from 'react-router-dom';
import { Plus, Zap, GitBranch, UserPlus, RotateCcw, Star } from 'lucide-react';
import { useSequences } from '@/hooks/api/useMarketing';

interface Sequence {
  id: string;
  name: string;
  trigger_type: string;
  is_active: boolean;
  step_count: number;
}

const TRIGGER_STYLES: Record<string, { bg: string; text: string }> = {
  new_lead: { bg: '#DBEAFE', text: '#1E40AF' },
  form_submit: { bg: '#DCFCE7', text: '#166534' },
  tag_added: { bg: '#EDE9FE', text: '#6D28D9' },
  manual: { bg: '#FFEDD5', text: '#C2410C' },
  violation_found: { bg: '#FEE2E2', text: '#991B1B' },
  appointment_booked: { bg: '#CCFBF1', text: '#0F766E' },
  job_completed: { bg: '#FEF9C3', text: '#854D0E' },
};

const SUGGESTED_SEQUENCES = [
  { name: 'New Lead Follow-up', description: 'Automatically nurture new leads with a 5-step email and call sequence', steps: 5, icon: UserPlus },
  { name: 'Lapsed Customer Re-engagement', description: 'Win back customers who have not booked in 6+ months', steps: 4, icon: RotateCcw },
  { name: 'Post-Job Review Request', description: 'Request reviews and referrals after completing a service', steps: 3, icon: Star },
];

export function SequencesPage() {
  const { data, isLoading } = useSequences();
  const sequences: Sequence[] = data?.sequences ?? [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6FA' }}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0B1628' }}>Sequences</h1>
            <p className="mt-1 text-sm" style={{ color: '#6B7F96' }}>Automated multi-step outreach campaigns</p>
          </div>
          <Link to="/marketing/sequences/new" className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors" style={{ backgroundColor: '#1e4d6b' }}><Plus className="h-4 w-4" /> Create Sequence</Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><p className="text-sm" style={{ color: '#6B7F96' }}>Loading sequences...</p></div>
        ) : sequences.length === 0 ? (
          <div>
            <div className="mb-8 flex flex-col items-center justify-center rounded-lg border bg-white py-12" style={{ borderColor: '#D1D9E6' }}>
              <GitBranch className="mb-3 h-10 w-10" style={{ color: '#D1D9E6' }} />
              <p className="text-sm font-medium" style={{ color: '#0B1628' }}>No outreach sequences yet.</p>
              <p className="mt-1 text-xs" style={{ color: '#6B7F96' }}>Create your first automation!</p>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold" style={{ color: '#0B1628' }}>Suggested Sequences</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {SUGGESTED_SEQUENCES.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Link key={s.name} to="/marketing/sequences/new" className="rounded-lg border bg-white p-5 transition-shadow hover:shadow-md" style={{ borderColor: '#D1D9E6' }}>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: '#1e4d6b10' }}>
                          <Icon className="h-4 w-4" style={{ color: '#1e4d6b' }} />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: '#0B1628' }}>{s.name}</h3>
                      </div>
                      <p className="mb-3 text-xs" style={{ color: '#6B7F96' }}>{s.description}</p>
                      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#1e4d6b' }}><Zap className="h-3.5 w-3.5" />{s.steps} steps</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sequences.map((seq) => {
              const triggerStyle = TRIGGER_STYLES[seq.trigger_type] ?? { bg: '#F3F4F6', text: '#6B7280' };
              return (
                <Link key={seq.id} to={} className="rounded-lg border bg-white p-5 transition-shadow hover:shadow-md" style={{ borderColor: '#D1D9E6' }}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold" style={{ color: '#0B1628' }}>{seq.name}</h3>
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: seq.is_active ? '#DCFCE7' : '#F3F4F6', color: seq.is_active ? '#166534' : '#6B7280' }}>{seq.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize" style={{ backgroundColor: triggerStyle.bg, color: triggerStyle.text }}>{seq.trigger_type.replace(/_/g, ' ')}</span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#6B7F96' }}><Zap className="h-3 w-3" />{seq.step_count} step{seq.step_count !== 1 ? 's' : ''}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default SequencesPage;
