import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Siren,
  Zap,
  AlertTriangle,
  Flame,
  ClipboardCheck,
  Wrench,
  UserX,
  Droplets,
  Wind,
  Clock,
  Play,
  CheckCircle2,
  FileText,
  Search,
  ChevronRight,
  BarChart3,
  Timer,
  Plus,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import {
  playbookTemplates,
  activeIncidentPlaybooks,
  demoCustomPlaybooks,
  type PlaybookTemplate,
  type ActiveIncidentPlaybook,
  type PlaybookSeverity,
  type PlaybookCategory,
} from '../data/demoData';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { useDemo } from '../contexts/DemoContext';

// ── Icon map ────────────────────────────────────────────────
const ICON_MAP: Record<string, typeof Zap> = {
  Zap, AlertTriangle, Flame, ClipboardCheck, Wrench, UserX, Droplets, Wind,
};

// ── Severity config ─────────────────────────────────────────
const SEVERITY_CONFIG: Record<PlaybookSeverity, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'Critical', bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  high:     { label: 'High',     bg: '#fff7ed', text: '#9a3412', border: '#fdba74' },
  medium:   { label: 'Medium',   bg: '#fefce8', text: '#854d0e', border: '#fde047' },
  low:      { label: 'Low',      bg: '#f0fdf4', text: '#166534', border: '#86efac' },
};

const CATEGORY_LABELS: Record<PlaybookCategory, string> = {
  environmental: 'Environmental',
  health_safety: 'Health & Safety',
  regulatory: 'Regulatory',
  equipment: 'Equipment',
};

type Tab = 'library' | 'active' | 'completed';

const TABS: { key: Tab; label: string }[] = [
  { key: 'library', label: 'Library' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

// ── Time helpers ────────────────────────────────────────────
function getElapsedMinutes(startIso: string): number {
  const diff = Date.now() - new Date(startIso).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ── Playbook Card (Library) ─────────────────────────────────
function PlaybookCard({ template, onActivate, isCustom }: { template: PlaybookTemplate; onActivate: () => void; isCustom?: boolean }) {
  const Icon = ICON_MAP[template.icon] || Siren;
  const sev = SEVERITY_CONFIG[template.defaultSeverity];
  const cat = CATEGORY_LABELS[template.category];

  return (
    <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
      {/* Color banner */}
      <div style={{ height: 6, background: template.color }} />
      <div style={{ padding: '16px 16px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: template.color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={22} color={template.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3 }}>{template.title}</h3>
              {isCustom && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#d4af37', color: 'white', whiteSpace: 'nowrap' }}>CUSTOM</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>{sev.label}</span>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 9999, background: '#f3f4f6', color: '#4b5563' }}>{cat}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, margin: '0 0 12px', flex: 1 }}>{template.shortDescription}</p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 12, color: '#6b7280' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={14} /> {template.stepCount} steps
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={14} /> ~{formatDuration(template.estimatedMinutes)}
          </span>
        </div>

        {/* Regulatory basis */}
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 14, padding: '6px 8px', background: '#f9fafb', borderRadius: 6, lineHeight: 1.4 }}>
          <EvidlyIcon size={12} className="inline align-middle mr-1" />
          {template.regulatoryBasis}
        </div>

        {/* Activate button */}
        <button
          onClick={onActivate}
          style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: template.color, color: 'white', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}
        >
          <Play size={14} /> Activate Playbook
        </button>
      </div>
    </div>
  );
}

// ── Active Incident Card ────────────────────────────────────
function ActiveIncidentCard({ incident, onContinue }: { incident: ActiveIncidentPlaybook; onContinue: () => void }) {
  const template = playbookTemplates.find(t => t.id === incident.templateId);
  const Icon = template ? ICON_MAP[template.icon] || Siren : Siren;
  const color = template?.color || '#1e4d6b';
  const sev = SEVERITY_CONFIG[incident.severity];
  const progress = Math.round((incident.currentStepNumber / incident.totalSteps) * 100);
  const elapsed = getElapsedMinutes(incident.initiatedAt);

  return (
    <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
      <div style={{ height: 4, background: color }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{incident.templateTitle}</h3>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{incident.location}</p>
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>{sev.label}</span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
            <span>Step {incident.currentStepNumber} of {incident.totalSteps}</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: color, borderRadius: 3, transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Timer size={13} /> {formatDuration(elapsed)} elapsed
          </span>
          <span>By {incident.initiatedBy}</span>
        </div>

        <button
          onClick={onContinue}
          style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: '#1e4d6b', color: 'white', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}
        >
          Continue <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Completed Incident Card ─────────────────────────────────
function CompletedIncidentCard({ incident, onViewReport, guardAction }: { incident: ActiveIncidentPlaybook; onViewReport: () => void; guardAction: (action: string, feature: string, cb: () => void) => void }) {
  const template = playbookTemplates.find(t => t.id === incident.templateId);
  const Icon = template ? ICON_MAP[template.icon] || Siren : Siren;
  const color = template?.color || '#1e4d6b';
  const durationMin = incident.completedAt
    ? Math.round((new Date(incident.completedAt).getTime() - new Date(incident.initiatedAt).getTime()) / 60000)
    : 0;

  return (
    <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{incident.templateTitle}</h3>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{incident.location}</p>
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: '#f0fdf4', color: '#166534', border: '1px solid #86efac' }}>Completed</span>
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={13} /> Duration: {formatDuration(durationMin)}
          </span>
          <span>{formatDate(incident.initiatedAt)}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={onViewReport}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #1e4d6b', background: '#eef4f8', color: '#1e4d6b', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 40, fontFamily: "'DM Sans', sans-serif" }}
          >
            <FileText size={13} /> View Report
          </button>
          <button
            onClick={() => guardAction('download', 'playbook documents', () => toast.info('PDF download coming soon'))}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 40, fontFamily: "'DM Sans', sans-serif" }}
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
export function IncidentPlaybooks() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<PlaybookCategory | 'all'>('all');

  const activeIncidents = activeIncidentPlaybooks.filter(i => i.status === 'active');
  const completedIncidents = activeIncidentPlaybooks.filter(i => i.status === 'completed');

  // Auto-switch to active tab if incidents exist on first load
  useEffect(() => {
    if (activeIncidents.length > 0) setActiveTab('active');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Non-demo mode: show empty state (no hardcoded data for authenticated users)
  if (!isDemoMode) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Siren size={24} color="#1e4d6b" />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Incident Playbooks</h1>
        </div>
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 48, textAlign: 'center' }}>
          <Siren size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>No Playbooks Yet</h2>
          <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 400, margin: '0 auto' }}>
            Create incident response playbooks to guide your team through emergencies.
          </p>
        </div>
      </div>
    );
  }

  // Filter library
  const filteredTemplates = playbookTemplates.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Build custom playbook cards as PlaybookTemplate-like objects for rendering
  const customPlaybookCards: PlaybookTemplate[] = demoCustomPlaybooks.map(cp => ({
    id: cp.title.toLowerCase().replace(/\s+/g, '-'),
    title: cp.title,
    shortDescription: cp.description,
    icon: cp.category === 'health_safety' ? 'AlertTriangle' : 'ClipboardCheck',
    color: cp.severity === 'high' ? '#dc2626' : '#d4af37',
    defaultSeverity: cp.severity as PlaybookSeverity,
    category: cp.category as PlaybookCategory,
    stepCount: cp.steps.length,
    estimatedMinutes: cp.steps.reduce((sum, s) => sum + (s.timeLimitMinutes || 10), 0),
    regulatoryBasis: 'Custom protocol — ' + cp.category.replace('_', ' '),
    steps: [],
  }));

  const filteredCustom = customPlaybookCards.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleActivate = (template: PlaybookTemplate) => {
    toast.info(`Playbook "${template.title}" activated (demo)`);
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: 1200, margin: '0 auto' }}>
      {/* Emergency Alert Banner */}
      {activeIncidents.length > 0 && (
        <div style={{
          padding: '12px 20px',
          borderRadius: 10,
          background: '#fef2f2',
          border: '2px solid #fca5a5',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }`}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Siren size={20} color="#dc2626" />
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#991b1b' }}>{activeIncidents.length} Active Incident{activeIncidents.length > 1 ? 's' : ''}</span>
              <span style={{ fontSize: 13, color: '#b91c1c', marginLeft: 8 }}>
                {activeIncidents.map(i => i.templateTitle).join(', ')}
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('active')}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 40, fontFamily: "'DM Sans', sans-serif" }}
          >
            <ChevronRight size={14} /> View Active
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Siren size={24} color="#1e4d6b" />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Response Playbooks</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/playbooks/builder')}
              style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #d4af37', background: '#fffbeb', color: '#92400e', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 40, fontFamily: "'DM Sans', sans-serif" }}
            >
              <Plus size={14} /> Create Custom Playbook
            </button>
            <button
              onClick={() => navigate('/playbooks/analytics')}
              style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 40, fontFamily: "'DM Sans', sans-serif" }}
            >
              <TrendingUp size={14} /> Analytics
            </button>
          </div>
        </div>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>Guided crisis response protocols with auto-documentation and legal defense file generation</p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Available Playbooks', value: playbookTemplates.length + customPlaybookCards.length, icon: FileText, color: '#1e4d6b' },
          { label: 'Active Incidents', value: activeIncidents.length, icon: Siren, color: activeIncidents.length > 0 ? '#dc2626' : '#22c55e' },
          { label: 'Completed This Month', value: completedIncidents.length, icon: CheckCircle2, color: '#22c55e' },
          { label: 'Avg Response Time', value: '47m', icon: BarChart3, color: '#d4af37' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'white', borderRadius: 10, padding: '16px 18px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <kpi.icon size={16} color={kpi.color} />
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb', overflowX: 'auto' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const count = tab.key === 'active' ? activeIncidents.length : tab.key === 'completed' ? completedIncidents.length : playbookTemplates.length + customPlaybookCards.length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#1e4d6b' : '#6b7280',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #1e4d6b' : '2px solid transparent',
                marginBottom: -2,
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
              {tab.key === 'active' && activeIncidents.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 9999, background: '#dc2626', color: 'white' }}>{count}</span>
              )}
              {(tab.key !== 'active' || activeIncidents.length === 0) && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: 9999,
                  background: isActive ? '#1e4d6b' : '#e5e7eb',
                  color: isActive ? 'white' : '#6b7280',
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Library Tab */}
      {activeTab === 'library' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search playbooks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as PlaybookCategory | 'all')}
              style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: 'white', color: '#374151', cursor: 'pointer' }}
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* System Playbooks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 16 }}>
            {filteredTemplates.map(t => (
              <PlaybookCard key={t.id} template={t} onActivate={() => handleActivate(t)} />
            ))}
          </div>

          {/* Custom Playbooks Section */}
          {filteredCustom.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 32, marginBottom: 16 }}>
                <Sparkles size={16} color="#d4af37" />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Custom Playbooks</h2>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: '#d4af37', color: 'white' }}>{filteredCustom.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 16 }}>
                {filteredCustom.map(t => (
                  <PlaybookCard key={t.id} template={t} onActivate={() => handleActivate(t)} isCustom />
                ))}
              </div>
            </>
          )}

          {filteredTemplates.length === 0 && filteredCustom.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
              <Search size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>No playbooks match your search.</p>
            </div>
          )}
        </>
      )}

      {/* Active Tab */}
      {activeTab === 'active' && (
        <>
          {activeIncidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>No active incidents. All clear!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 16 }}>
              {activeIncidents.map(incident => (
                <ActiveIncidentCard
                  key={incident.id}
                  incident={incident}
                  onContinue={() => navigate(`/playbooks/active/${incident.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Completed Tab */}
      {activeTab === 'completed' && (
        <>
          {completedIncidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
              <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>No completed incidents yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 16 }}>
              {completedIncidents.map(incident => (
                <CompletedIncidentCard
                  key={incident.id}
                  incident={incident}
                  onViewReport={() => navigate(`/playbooks/history/${incident.id}`)}
                  guardAction={guardAction}
                />
              ))}
            </div>
          )}
        </>
      )}

      <DemoUpgradePrompt
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={upgradeFeature}
        action={upgradeAction}
       
      />
    </div>
  );
}

export default IncidentPlaybooks;
