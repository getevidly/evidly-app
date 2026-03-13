/**
 * CopilotBriefingCard — AI-COPILOT-PROACTIVE-01
 *
 * Morning briefing card that appears on the Dashboard.
 * In production, shows real signals from Supabase (is_published=true, org_id scoped).
 * When no signals exist, shows an empty state.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ChevronRight } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';

// Severity dot colors per spec
const SEV_DOT = { critical: '#991B1B', warning: '#A08C5A', info: '#1E2D4D' };
const SEV_BG  = { critical: '#FEF2F2', warning: '#FFFBEB', info: '#F0F4F8' };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function CopilotBriefingCard() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSignals() {
      if (isDemoMode) {
        // No fake data — show empty state in demo mode
        setSignals([]);
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) { setLoading(false); return; }

        const orgId = session.user.user_metadata?.org_id;
        if (!orgId) { setLoading(false); return; }

        const { data, error } = await supabase
          .from('intelligence_signals')
          .select('id, title, summary, severity, signal_type, created_at')
          .eq('org_id', orgId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!cancelled && !error && data) {
          setSignals(data);
        }
      } catch {
        // Silent fail — briefing card is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSignals();
    return () => { cancelled = true; };
  }, [isDemoMode]);

  // Loading skeleton
  if (loading) {
    return (
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border, #D1D9E6)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#E8EDF4', animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <div>
            <div style={{ width: 160, height: 14, borderRadius: 4, background: '#E8EDF4', marginBottom: 6 }} />
            <div style={{ width: 120, height: 10, borderRadius: 4, background: '#E8EDF4' }} />
          </div>
        </div>
      </div>
    );
  }

  // Empty state — no signals available
  if (signals.length === 0) {
    return (
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border, #D1D9E6)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#FDF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot style={{ width: 20, height: 20, color: '#d4af37' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #0B1628)' }}>
              {getGreeting()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary, #6B7F96)' }}>
              Your AI Copilot summary
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, #3D5068)', margin: '0 0 12px 0' }}>
          No insights yet — your AI Copilot will surface signals as data is collected.
        </p>
        <button
          onClick={() => navigate('/ai-advisor')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 8,
            background: '#1e4d6b', border: 'none',
            fontSize: 12, fontWeight: 600, color: '#fff',
            cursor: 'pointer',
          }}
        >
          Ask EvidLY AI
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    );
  }

  // Real signals from Supabase
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--border, #D1D9E6)',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#FDF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot style={{ width: 20, height: 20, color: '#d4af37' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #0B1628)' }}>
              {getGreeting()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary, #6B7F96)' }}>
              {signals.length} insight{signals.length !== 1 ? 's' : ''} from your AI Copilot
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {signals.map(signal => {
          const sev = signal.severity || 'info';
          const dotColor = SEV_DOT[sev] || SEV_DOT.info;
          const bgColor = SEV_BG[sev] || SEV_BG.info;

          return (
            <div
              key={signal.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: bgColor,
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: dotColor, marginTop: 5, flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0B1628)', marginBottom: 2 }}>
                  {signal.title}
                </div>
                {signal.summary && (
                  <div style={{
                    fontSize: 11, color: 'var(--text-secondary, #3D5068)',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {signal.summary}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/ai-advisor')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 8,
            background: '#1e4d6b', border: 'none',
            fontSize: 12, fontWeight: 600, color: '#fff',
            cursor: 'pointer',
          }}
        >
          Ask EvidLY AI
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
        <button
          onClick={() => navigate('/copilot')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 8,
            background: '#fff', border: '1px solid var(--border, #D1D9E6)',
            fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #0B1628)',
            cursor: 'pointer',
          }}
        >
          View All Insights
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}
