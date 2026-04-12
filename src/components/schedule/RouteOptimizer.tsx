/**
 * RouteOptimizer — Widget showing optimized job route for a technician on a given day.
 */
import { useState } from 'react';
import { Route, Zap, Clock, MapPin, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import type { ScheduledJob, Technician } from '../../hooks/api/useSchedule';
import { useOptimizeRoute } from '../../hooks/api/useSchedule';
import { NAVY, CARD_BG, CARD_BORDER, TEXT_TERTIARY, CARD_SHADOW } from '../dashboard/shared/constants';

interface RouteOptimizerProps {
  technician: Technician;
  jobs: ScheduledJob[];
  date: string;
}

export function RouteOptimizer({ technician, jobs, date }: RouteOptimizerProps) {
  const { mutate: optimize, isPending } = useOptimizeRoute();
  const [expanded, setExpanded] = useState(false);
  const [optimized, setOptimized] = useState(false);

  const sortedJobs = [...jobs].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const totalMinutes = jobs.reduce((sum, j) => sum + j.durationMinutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const handleOptimize = () => {
    optimize({
      technicianId: technician.id,
      date,
      jobIds: jobs.map(j => j.id),
    });
    setOptimized(true);
  };

  if (jobs.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF' }}>
            <Route className="w-4 h-4" style={{ color: '#1E2D4D' }} />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold" style={{ color: NAVY }}>{technician.name}'s Route</p>
            <p className="text-xs" style={{ color: TEXT_TERTIARY }}>
              {jobs.length} stop{jobs.length !== 1 ? 's' : ''} · {hours}h{mins > 0 ? ` ${mins}m` : ''} total
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
        )}
      </button>

      {expanded && (
        <div className="border-t" style={{ borderColor: CARD_BORDER }}>
          {/* Optimize button */}
          <div className="px-4 py-2.5 border-b" style={{ borderColor: CARD_BORDER }}>
            <button
              onClick={handleOptimize}
              disabled={isPending || optimized}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              style={{
                background: optimized ? '#F0FFF4' : '#1E2D4D',
                color: optimized ? '#16A34A' : 'white',
                border: optimized ? '1px solid #BBF7D0' : 'none',
              }}
            >
              {isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Optimizing...
                </>
              ) : optimized ? (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Route Optimized
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Optimize Route
                </>
              )}
            </button>
          </div>

          {/* Route timeline */}
          <div className="px-4 py-3 space-y-0">
            {sortedJobs.map((job, idx) => (
              <div key={job.id} className="flex gap-3">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: '#1E2D4D' }}
                  >
                    {idx + 1}
                  </div>
                  {idx < sortedJobs.length - 1 && (
                    <div className="w-px flex-1 my-1" style={{ background: CARD_BORDER }} />
                  )}
                </div>

                {/* Stop info */}
                <div className="pb-3 min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate" style={{ color: NAVY }}>
                    {job.customerName}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5" style={{ color: TEXT_TERTIARY }}>
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span className="text-xs">{job.startTime} – {job.endTime}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5" style={{ color: TEXT_TERTIARY }}>
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="text-xs truncate">{job.locationName}</span>
                  </div>
                  {job.serviceTypes.length > 0 && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: TEXT_TERTIARY }}>
                      {job.serviceTypes.join(', ')}
                    </p>
                  )}

                  {/* Travel estimate between stops */}
                  {idx < sortedJobs.length - 1 && (
                    <div className="flex items-center gap-1 mt-1.5 px-2 py-1 rounded" style={{ background: '#F8FAFC' }}>
                      <ArrowRight className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
                      <span className="text-[9px] font-medium" style={{ color: TEXT_TERTIARY }}>
                        Travel to next stop
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
