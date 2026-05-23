import { useNavigate } from 'react-router-dom';
import type { CalendarPRPStats } from '../../hooks/calendar/useCalendarPRPStats';
import type { DueNotScheduledItem } from '../../hooks/calendar/useDueNotScheduled';

interface CalendarSidebarProps {
  stats: CalendarPRPStats;
  dueNotScheduled: DueNotScheduledItem[];
}

export function CalendarSidebar({ stats, dueNotScheduled }: CalendarSidebarProps) {
  const navigate = useNavigate();

  return (
    <div
      className="w-full lg:w-[320px]"
      style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      {/* Today card */}
      <div style={{
        backgroundColor: '#1E2D4D', borderRadius: '12px', padding: '16px',
        color: 'white', textAlign: 'center',
      }}>
        <h3 style={{
          fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.7)',
          margin: '0 0 8px 0', fontFamily: "'DM Sans', sans-serif",
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          Today
        </h3>
        <div style={{
          fontSize: '32px', fontWeight: 800,
          fontFamily: "'DM Sans', sans-serif", marginBottom: '4px',
        }}>
          {stats.todayCount}
        </div>
        <div style={{
          fontSize: '12px', color: 'rgba(255,255,255,0.7)',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          services scheduled
        </div>
      </div>

      {/* Due, not scheduled — hidden when predictCount = 0 */}
      {stats.predictCount > 0 && (
        <div style={{
          backgroundColor: 'white', border: '1px solid #E2DDD4',
          borderRadius: '12px', padding: '16px',
        }}>
          <h3 style={{
            fontSize: '13px', fontWeight: 700, color: '#B45309',
            margin: '0 0 12px 0', fontFamily: "'DM Sans', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            Due, not scheduled
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dueNotScheduled.slice(0, 5).map((item) => (
              <div
                key={item.cadenceId}
                style={{
                  padding: '10px', borderRadius: '8px',
                  backgroundColor: '#FFFBEB', borderLeft: '3px solid #B45309',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <div style={{
                  fontWeight: 600, fontSize: '12px',
                  color: '#111827', marginBottom: '2px',
                }}>
                  {item.displayName}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                  {item.neverCompleted
                    ? 'Never completed'
                    : item.daysOverdue > 0
                      ? `${item.daysOverdue} day${item.daysOverdue !== 1 ? 's' : ''} overdue`
                      : 'Due now'}
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/vendors')}
                  style={{
                    marginTop: '6px', fontSize: '11px', fontWeight: 700,
                    color: '#1E2D4D', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  + Schedule {'\u2192'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* This Month — two tiles */}
      <div style={{
        backgroundColor: 'white', border: '1px solid #E2DDD4',
        borderRadius: '12px', padding: '16px',
      }}>
        <h3 style={{
          fontSize: '13px', fontWeight: 700, color: '#111827',
          margin: '0 0 12px 0', fontFamily: "'DM Sans', sans-serif",
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          This Month
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{
            textAlign: 'center', padding: '8px',
            borderRadius: '8px', backgroundColor: '#f9fafb',
          }}>
            <div style={{
              fontSize: '20px', fontWeight: 800, color: '#1E2D4D',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {stats.monthServicesCount}
            </div>
            <div style={{
              fontSize: '11px', color: '#6b7280', fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Total services
            </div>
          </div>
          <div style={{
            textAlign: 'center', padding: '8px',
            borderRadius: '8px', backgroundColor: '#f9fafb',
          }}>
            <div style={{
              fontSize: '20px', fontWeight: 800, color: '#2E7D32',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {stats.monthWithRecordsCount}
            </div>
            <div style={{
              fontSize: '11px', color: '#6b7280', fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              With records
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
