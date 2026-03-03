import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock, Eye, MapPin, Phone, Mail, Plus, Sparkles, RefreshCw, Trash2, ArrowRight, XCircle, Building2, Users } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { demoPipelineData, getPipelineCounts, getKitchenTypeLabel, getOperationLabel } from '../../data/demoGeneratorData';
import type { DemoSession } from '../../data/demoGeneratorData';
import { DemoConversionModal } from '../../components/demo/DemoConversionModal';

const NAVY = '#1E2D4D';
const GOLD = '#d4af37';

type PipelineTab = 'scheduled' | 'ready' | 'active' | 'converted' | 'expired';

const TABS: { key: PipelineTab; label: string; color: string }[] = [
  { key: 'scheduled', label: 'Scheduled', color: '#3b82f6' },
  { key: 'ready', label: 'Ready', color: '#22c55e' },
  { key: 'active', label: 'Active', color: GOLD },
  { key: 'converted', label: 'Converted', color: '#10b981' },
  { key: 'expired', label: 'Expired', color: '#9ca3af' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
    ready: 'bg-green-50 text-green-700 border-green-200',
    active: 'bg-amber-50 text-amber-700 border-amber-200',
    converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    expired: 'bg-gray-50 text-gray-500 border-gray-200',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function DemoCard({ session, onAction }: { session: DemoSession; onAction: (action: string, session: DemoSession) => void }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate" style={{ color: NAVY }}>{session.company_name}</h3>
            <StatusBadge status={session.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {session.city}, {session.state}
            </span>
            <span>{session.county} County</span>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {session.prospect_name}
        </span>
        <span className="flex items-center gap-1">
          <Mail className="w-3 h-3" />
          {session.prospect_email}
        </span>
        {session.prospect_phone && (
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {session.prospect_phone}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
        <span>{getKitchenTypeLabel(session.company_type)}</span>
        <span className="text-gray-300">|</span>
        <span>{getOperationLabel(session.operation_type)} volume</span>
        <span className="text-gray-300">|</span>
        <span>{session.num_locations} location{session.num_locations > 1 ? 's' : ''}</span>
      </div>

      {/* Schedule / Jurisdiction info */}
      {session.scheduled_at && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
          <Calendar className="w-3.5 h-3.5" />
          <span>Meeting: {formatDateTime(session.scheduled_at)}</span>
        </div>
      )}
      {(session.status === 'ready' || session.status === 'active') && (
        <div className="flex items-center gap-1.5 text-xs mb-3">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span className="text-green-700 font-medium">Demo ready</span>
          <span className="text-gray-400 mx-1">|</span>
          <span className="text-gray-500">{session.health_authority} configured</span>
        </div>
      )}
      {session.status === 'active' && session.total_logins > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          <Eye className="w-3.5 h-3.5" />
          <span>{session.total_logins} logins, {session.pages_visited.length} pages visited</span>
        </div>
      )}
      {session.status === 'converted' && session.converted_at && (
        <div className="flex items-center gap-1.5 text-xs text-green-700 mb-3">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Converted on {formatDate(session.converted_at)}</span>
        </div>
      )}
      {session.status === 'expired' && session.expires_at && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>Expired on {formatDate(session.expires_at)}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        {session.status === 'scheduled' && (
          <>
            <button onClick={() => onAction('generate', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white flex items-center gap-1"
              style={{ backgroundColor: NAVY }}>
              <Sparkles className="w-3 h-3" /> Generate Demo
            </button>
            <button onClick={() => onAction('reschedule', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Reschedule
            </button>
            <button onClick={() => onAction('cancel', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Cancel
            </button>
          </>
        )}
        {session.status === 'ready' && (
          <>
            <button onClick={() => onAction('preview', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Preview Demo
            </button>
            <button onClick={() => onAction('start', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white flex items-center gap-1"
              style={{ backgroundColor: NAVY }}>
              <ArrowRight className="w-3 h-3" /> Start Live Demo
            </button>
            <button onClick={() => onAction('reschedule', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Reschedule
            </button>
          </>
        )}
        {session.status === 'active' && (
          <>
            <button onClick={() => onAction('convert', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white flex items-center gap-1"
              style={{ backgroundColor: '#10b981' }}>
              <CheckCircle2 className="w-3 h-3" /> Convert to Live
            </button>
            <button onClick={() => onAction('preview', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 flex items-center gap-1">
              <Eye className="w-3 h-3" /> View Demo
            </button>
          </>
        )}
        {(session.status === 'expired' || session.status === 'converted') && (
          <button onClick={() => onAction('delete', session)}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        )}
      </div>
    </div>
  );
}

export function DemoPipeline() {
  useDemoGuard();
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PipelineTab>('scheduled');
  const [sessions] = useState<DemoSession[]>(demoPipelineData);
  const [conversionTarget, setConversionTarget] = useState<DemoSession | null>(null);

  const counts = useMemo(() => getPipelineCounts(sessions), [sessions]);

  const filtered = useMemo(() =>
    sessions.filter(s => s.status === activeTab),
    [sessions, activeTab]
  );

  const handleAction = (action: string, session: DemoSession) => {
    switch (action) {
      case 'generate':
        alert(`Demo data generation would start for ${session.company_name}. In production, this calls the generation engine.`);
        break;
      case 'preview':
      case 'start':
        alert(`Demo preview/live mode would open for ${session.company_name}. In production, the rep shares their screen or grants temporary access.`);
        break;
      case 'convert':
        setConversionTarget(session);
        break;
      case 'reschedule':
        alert(`Reschedule modal would open for ${session.company_name}.`);
        break;
      case 'cancel':
        alert(`Cancel demo session for ${session.company_name}? In production, this updates the status.`);
        break;
      case 'delete':
        alert(`Delete demo data for ${session.company_name}? This action cannot be undone.`);
        break;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${NAVY}10` }}>
            <Building2 className="w-5 h-5" style={{ color: NAVY }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: NAVY }}>Demo Pipeline</h1>
            <p className="text-sm text-gray-500">Manage personalized prospect demos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin/demo-generator')}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-1.5"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="w-4 h-4" /> Generate New Demo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`p-3 rounded-lg border text-center transition-colors ${
              activeTab === tab.key ? 'border-gray-400 shadow-sm' : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{ backgroundColor: activeTab === tab.key ? `${tab.color}08` : 'white' }}
          >
            <div className="text-2xl font-bold" style={{ color: tab.color }}>
              {counts[tab.key as keyof typeof counts]}
            </div>
            <div className="text-xs font-medium text-gray-600">{tab.label}</div>
          </button>
        ))}
      </div>

      {/* Tab heading */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {TABS.find(t => t.key === activeTab)?.label}
        </h2>
        <span className="text-xs text-gray-400">
          {activeTab === 'scheduled' && '— Meetings booked, demos not yet generated'}
          {activeTab === 'ready' && '— Demo generated, waiting for meeting'}
          {activeTab === 'active' && '— Demo being presented or temporarily accessible'}
          {activeTab === 'converted' && '— Successfully converted to live accounts'}
          {activeTab === 'expired' && '— Demo expired without conversion'}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">No demos in this stage.</p>
          </div>
        ) : (
          filtered.map(session => (
            <DemoCard key={session.id} session={session} onAction={handleAction} />
          ))
        )}
      </div>

      {/* Conversion Modal */}
      {conversionTarget && (
        <DemoConversionModal
          session={conversionTarget}
          onClose={() => setConversionTarget(null)}
          onConvert={(plan) => {
            alert(`${conversionTarget.company_name} converted to ${plan} plan. In production, demo data is deleted and account transitions to live.`);
            setConversionTarget(null);
          }}
        />
      )}
    </div>
  );
}

export default DemoPipeline;
