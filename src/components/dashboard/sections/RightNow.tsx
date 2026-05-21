/**
 * RightNow — C15 dispatcher
 *
 * Kitchen_staff only — current task + next task preview.
 * Job aid block deferred to C16+ (pending task_definitions.job_aid column).
 */

import { useRole } from '../../../contexts/RoleContext';
import { useRightNow } from '../../../hooks/useRightNow';

export function RightNow() {
  const { userRole } = useRole();

  if (userRole !== 'kitchen_staff') return null;

  return <RightNowInner />;
}

function RightNowInner() {
  const { current, next, loading, error } = useRightNow();

  if (loading) {
    return (
      <div>
        <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Right now</span>
        </div>
        <div className="rightnow">
          <div className="skeleton" style={{ width: '100%', height: 80, borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  if (error) {
    console.error('[RightNow] failed to load:', error);
    return (
      <div className="rightnow" style={{ padding: '14px 18px', color: 'var(--muted)', fontSize: 12 }}>
        Unable to load. Try refreshing.
      </div>
    );
  }

  return (
    <div>
      <div className="section-h" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>Right now</span>
      </div>
      <div className="rightnow">
        {!current ? (
          <div style={{ padding: '20px 18px', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              No pending tasks right now.
            </p>
          </div>
        ) : (
          <>
            <div className="rightnow-eyebrow">
              <span>{current.due_relative}</span>
              {current.location_name && (
                <span style={{ marginLeft: 8, color: 'var(--muted)' }}>
                  <i className="fa-solid fa-location-dot" style={{ fontSize: 10, marginRight: 4 }} />
                  {current.location_name}
                </span>
              )}
            </div>
            <div className="rightnow-task">{current.title}</div>
            {/* TODO C16+: job aid block from task_definitions.job_aid */}
            <div className="rightnow-cta">
              <button
                type="button"
                className="rightnow-start"
                onClick={() => {/* TODO: navigate to task */}}
              >
                Start task
              </button>
            </div>
          </>
        )}
        {next && (
          <div className="rightnow-next">
            <strong>Up next:</strong> {next.title}
            <span className="rightnow-meta">{next.due_relative}</span>
          </div>
        )}
      </div>
    </div>
  );
}
