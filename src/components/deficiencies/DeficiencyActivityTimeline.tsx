import type { DeficiencyTimelineEntry } from '../../data/deficienciesDemoData';
import type { DeficiencyResolutionPlan } from '../../hooks/deficiencies/useDeficiencyResolutionPlan';

const NAVY = '#1E2D4D';

function formatDate(iso: string): string {
  return new Date(iso.includes('T') ? iso : iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getDotColor(status: string): string {
  if (status === 'resolved') return '#2f7a4d';
  if (status === 'ai_plan') return '#c2731a';
  return NAVY;
}

interface TimelineEvent {
  date: string;
  label: string;
  by: string;
  notes?: string;
  dotType: 'navy' | 'amber' | 'green';
}

interface DeficiencyActivityTimelineProps {
  timeline: DeficiencyTimelineEntry[];
  plan?: DeficiencyResolutionPlan | null;
}

export function DeficiencyActivityTimeline({
  timeline,
  plan,
}: DeficiencyActivityTimelineProps) {
  const events: TimelineEvent[] = [];

  // Build events from timeline entries
  for (const entry of timeline) {
    const statusLabels: Record<string, string> = {
      open: 'Deficiency reported',
      acknowledged: 'Acknowledged',
      in_progress: 'Work started',
      resolved: 'Corrected',
      deferred: 'Deferred',
    };

    events.push({
      date: entry.date,
      label: statusLabels[entry.status] || entry.status,
      by: entry.by,
      notes: entry.notes,
      dotType: entry.status === 'resolved' ? 'green' : 'navy',
    });
  }

  // Add plan events if available
  if (plan) {
    events.push({
      date: plan.created_at,
      label: 'AI resolution plan drafted',
      by: 'AI',
      dotType: 'amber',
    });
    if (plan.accepted_at) {
      events.push({
        date: plan.accepted_at,
        label: 'Plan accepted — CA created',
        by: plan.accepted_by || 'User',
        dotType: 'green',
      });
    }
  }

  // Sort by date
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const dotColors = {
    navy: NAVY,
    amber: '#c2731a',
    green: '#2f7a4d',
  };

  return (
    <div className="bg-white rounded-xl border border-[#E2DDD4] p-5">
      <h3 className="text-sm font-bold mb-3" style={{ color: NAVY }}>
        Activity
      </h3>
      <div className="relative">
        {events.map((event, i) => (
          <div key={i} className="flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: dotColors[event.dotType] }}
              />
              {i < events.length - 1 && (
                <div className="w-px flex-1 bg-[#E2DDD4] mt-1" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium" style={{ color: NAVY }}>
                {event.label}
              </p>
              <p className="text-[11px] text-[#8A93A6]">
                {formatDate(event.date)} · {event.by}
              </p>
              {event.notes && (
                <p className="text-[11px] text-[#6B7F96] mt-0.5 leading-relaxed">
                  {event.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
