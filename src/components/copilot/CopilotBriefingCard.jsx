/**
 * CopilotBriefingCard — AI-COPILOT-PROACTIVE-01
 *
 * Morning briefing card that appears on the Dashboard.
 * Shows a greeting, top role-filtered copilot insights,
 * and CTAs to the AI Advisor and Copilot Insights pages.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ChevronRight } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import {
  copilotInsights,
  locations,
} from '../../data/demoData';

// Severity dot colors per spec
const SEV_DOT = { critical: '#991B1B', warning: '#A08C5A', info: '#1E2D4D' };
const SEV_BG  = { critical: '#FEF2F2', warning: '#FFFBEB', info: '#F0F4F8' };

// Source modules visible per role (role filtering)
const ROLE_MODULES = {
  kitchen_staff:      ['temperature', 'checklist'],
  facilities_manager: ['equipment', 'vendor'],
  // all other roles see everything
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function CopilotBriefingCard() {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { isDemoMode, companyName } = useDemo();

  // Demo first name
  const firstName = isDemoMode ? 'there' : 'there';

  const insights = useMemo(() => {
    let filtered = copilotInsights.filter(i => i.status !== 'dismissed');

    // Role filtering
    const allowedModules = ROLE_MODULES[userRole];
    if (allowedModules) {
      filtered = filtered.filter(i => allowedModules.includes(i.sourceModule));
    }

    // Sort: critical first, then warning, then info
    const sevOrder = { critical: 0, warning: 1, info: 2 };
    filtered.sort((a, b) => {
      const so = sevOrder[a.severity] - sevOrder[b.severity];
      if (so !== 0) return so;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return filtered.slice(0, 3);
  }, [userRole]);

  // Don't render if no insights
  if (insights.length === 0) return null;

  const newCount = copilotInsights.filter(i => i.status === 'new').length;

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--border, #D1D9E6)',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 16,
    }}>
      {/* Header row */}
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
              {getGreeting()}{firstName !== 'there' ? `, ${firstName}` : ''}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary, #6B7F96)' }}>
              {newCount > 0 ? `${newCount} new insights from your AI Copilot` : 'Your AI Copilot summary'}
            </div>
          </div>
        </div>
      </div>

      {/* Insight rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {insights.map(insight => {
          const dotColor = SEV_DOT[insight.severity] || SEV_DOT.info;
          const bgColor = SEV_BG[insight.severity] || SEV_BG.info;
          const loc = locations.find(l => l.id === insight.locationId);

          return (
            <div
              key={insight.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: bgColor,
              }}
            >
              {/* Severity dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: dotColor, marginTop: 5, flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0B1628)', marginBottom: 2 }}>
                  {insight.title}
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--text-secondary, #3D5068)',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {insight.message}
                </div>
                {loc && (
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary, #6B7F96)', marginTop: 3 }}>
                    {loc.name}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTAs */}
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
