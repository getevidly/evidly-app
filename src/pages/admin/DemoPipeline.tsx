import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock, Eye, MapPin, Phone, Mail, Plus, Sparkles, RefreshCw, Trash2, ArrowRight, XCircle, Building2, Users, AlertTriangle } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { demoPipelineData, getPipelineCounts, getKitchenTypeLabel, getOperationLabel } from '../../data/demoGeneratorData';
import type { DemoSession } from '../../data/demoGeneratorData';
import { DemoConversionModal } from '../../components/demo/DemoConversionModal';
import { supabase } from '../../lib/supabase';

const NAVY = '#1E2D4D';
const GOLD = '#d4af37';

type PipelineTab = 'active' | 'expiring_soon' | 'expired' | 'converted' | 'scheduled';

const TABS: { key: PipelineTab; label: string; color: string; description: string }[] = [
  { key: 'active', label: 'Active', color: GOLD, description: 'Demo currently accessible to prospect' },
  { key: 'expiring_soon', label: 'Expiring Soon', color: '#f59e0b', description: 'Expiring within 7 days — follow up!' },
  { key: 'scheduled', label: 'Scheduled', color: '#3b82f6', description: 'Meetings booked, demos not yet generated' },
  { key: 'expired', label: 'Expired', color: '#9ca3af', description: 'Demo expired without conversion' },
  { key: 'converted', label: 'Converted', color: '#10b981', description: 'Successfully converted to live accounts' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function daysUntil(iso: string | null): number {
  if (!iso) return 999;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function StatusBadge({ status, expiresAt }: { status: string; expiresAt?: string | null }) {
  const isExpiringSoon = status === 'active' && expiresAt && daysUntil(expiresAt) <= 7;
  const colors: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
    ready: 'bg-green-50 text-green-700 border-green-200',
    active: isExpiringSoon ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200',
    converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    expired: 'bg-gray-50 text-gray-500 border-gray-200',
    generating: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  const label = isExpiringSoon ? 'Expiring Soon' : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {label}
    </span>
  );
}

function DemoCard({ session, onAction }: { session: DemoSession; onAction: (action: string, session: DemoSession) => void }) {
  const remaining = daysUntil(session.expires_at);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate" style={{ color: NAVY }}>{session.company_name}</h3>
            <StatusBadge status={session.status} expiresAt={session.expires_at} />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {session.city}, {session.state}
            </span>
            {session.county && <span>{session.county} County</span>}
          </div>
        </div>
        {session.status === 'active' && remaining <= 7 && remaining > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
            <AlertTriangle className="w-3 h-3" />
            {remaining}d left
          </span>
        )}
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
      {session.scheduled_at && session.status === 'scheduled' && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
          <Calendar className="w-3.5 h-3.5" />
          <span>Meeting: {formatDateTime(session.scheduled_at)}</span>
        </div>
      )}
      {(session.status === 'ready' || session.status === 'active') && (
        <div className="flex items-center gap-1.5 text-xs mb-3">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span className="text-green-700 font-medium">Demo ready</span>
          {session.health_authority && (
            <>
              <span className="text-gray-400 mx-1">|</span>
              <span className="text-gray-500">{session.health_authority} configured</span>
            </>
          )}
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
        {(session.status === 'ready' || session.status === 'active') && (
          <>
            <button onClick={() => onAction('convert', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white flex items-center gap-1"
              style={{ backgroundColor: '#10b981' }}>
              <CheckCircle2 className="w-3 h-3" /> Convert to Live
            </button>
            <button onClick={() => onAction('extend', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Extend 7 Days
            </button>
            <button onClick={() => onAction('preview', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 flex items-center gap-1">
              <Eye className="w-3 h-3" /> View Demo
            </button>
          </>
        )}
        {session.status === 'expired' && (
          <>
            <button onClick={() => onAction('extend', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Re-activate
            </button>
            <button onClick={() => onAction('reengage', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Re-engage Email
            </button>
            <button onClick={() => onAction('delete', session)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Archive
            </button>
          </>
        )}
        {session.status === 'converted' && (
          <button onClick={() => onAction('delete', session)}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Archive
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
  const [activeTab, setActiveTab] = useState<PipelineTab>('active');
  const [sessions, setSessions] = useState<DemoSession[]>(isDemoMode ? demoPipelineData : []);
  const [loading, setLoading] = useState(!isDemoMode);
  const [conversionTarget, setConversionTarget] = useState<DemoSession | null>(null);

  // ── Fetch real data from demo_sessions table ──────────
  const fetchSessions = useCallback(async () => {
    if (isDemoMode) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('demo_sessions')
      .select('*')
      .not('status', 'eq', 'deleted')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setSessions(data.map(row => ({
        ...row,
        pages_visited: Array.isArray(row.pages_visited) ? row.pages_visited : [],
      })) as DemoSession[]);
    }
    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const counts = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 86400000;
    return {
      active: sessions.filter(s => (s.status === 'active' || s.status === 'ready') && (!s.expires_at || new Date(s.expires_at).getTime() > now + sevenDays)).length,
      expiring_soon: sessions.filter(s => (s.status === 'active' || s.status === 'ready') && s.expires_at && new Date(s.expires_at).getTime() <= now + sevenDays && new Date(s.expires_at).getTime() > now).length,
      scheduled: sessions.filter(s => s.status === 'scheduled').length,
      expired: sessions.filter(s => s.status === 'expired').length,
      converted: sessions.filter(s => s.status === 'converted').length,
    };
  }, [sessions]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 86400000;
    switch (activeTab) {
      case 'active':
        return sessions.filter(s => (s.status === 'active' || s.status === 'ready') && (!s.expires_at || new Date(s.expires_at).getTime() > now + sevenDays));
      case 'expiring_soon':
        return sessions.filter(s => (s.status === 'active' || s.status === 'ready') && s.expires_at && new Date(s.expires_at).getTime() <= now + sevenDays && new Date(s.expires_at).getTime() > now);
      case 'scheduled':
        return sessions.filter(s => s.status === 'scheduled');
      case 'expired':
        return sessions.filter(s => s.status === 'expired');
      case 'converted':
        return sessions.filter(s => s.status === 'converted');
      default:
        return [];
    }
  }, [sessions, activeTab]);

  const handleAction = async (action: string, session: DemoSession) => {
    switch (action) {
      case 'generate':
        navigate(`/admin/demo-generator`);
        break;
      case 'preview':
        alert(`Demo preview would open for ${session.company_name}. In production, the rep shares their screen or grants temporary access.`);
        break;
      case 'convert':
        setConversionTarget(session);
        break;
      case 'extend': {
        // Extend demo by 7 days
        if (isDemoMode) {
          alert(`Demo extended by 7 days for ${session.company_name}.`);
          return;
        }
        const currentExpiry = session.expires_at ? new Date(session.expires_at) : new Date();
        const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + 7 * 86400000).toISOString();

        await supabase
          .from('demo_sessions')
          .update({ expires_at: newExpiry, status: 'active', updated_at: new Date().toISOString() })
          .eq('id', session.id);

        // Also update org expiration if linked
        if ((session as any).organization_id) {
          await supabase
            .from('organizations')
            .update({ demo_expires_at: newExpiry, updated_at: new Date().toISOString() })
            .eq('id', (session as any).organization_id);
        }

        fetchSessions();
        break;
      }
      case 'reschedule':
        alert(`Reschedule modal would open for ${session.company_name}.`);
        break;
      case 'cancel': {
        if (isDemoMode) {
          alert(`Demo session cancelled for ${session.company_name}.`);
          return;
        }
        await supabase
          .from('demo_sessions')
          .update({ status: 'deleted', deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', session.id);
        fetchSessions();
        break;
      }
      case 'reengage':
        alert(`Re-engagement email would be sent to ${session.prospect_email}. Their profile data is waiting — upgrade CTA included.`);
        break;
      case 'delete': {
        if (isDemoMode) {
          alert(`Demo archived for ${session.company_name}.`);
          return;
        }
        await supabase
          .from('demo_sessions')
          .update({ status: 'deleted', deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', session.id);
        fetchSessions();
        break;
      }
    }
  };

  const handleConvert = async (plan: string) => {
    if (!conversionTarget) return;

    if (isDemoMode) {
      alert(`${conversionTarget.company_name} converted to ${plan} plan. In production, demo data is cleared and account transitions to live.`);
      setConversionTarget(null);
      return;
    }

    // Call conversion edge function if org is linked
    const orgId = (conversionTarget as any).organization_id;
    if (orgId) {
      const { error } = await supabase.functions.invoke('demo-account-convert', {
        body: { organization_id: orgId, plan },
      });
      if (error) {
        alert(`Conversion failed: ${error.message}`);
        return;
      }
    } else {
      // No linked org — just update session status
      await supabase
        .from('demo_sessions')
        .update({ status: 'converted', converted_at: new Date().toISOString(), assigned_plan: plan, updated_at: new Date().toISOString() })
        .eq('id', conversionTarget.id);
    }

    setConversionTarget(null);
    fetchSessions();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <AdminBreadcrumb crumbs={[{ label: 'Demo Pipeline' }]} />
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
          — {TABS.find(t => t.key === activeTab)?.description}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading demo pipeline...</p>
          </div>
        ) : filtered.length === 0 ? (
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
          onConvert={handleConvert}
        />
      )}
    </div>
  );
}

export default DemoPipeline;
