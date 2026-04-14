/**
 * System Messages — Broadcast announcements to users
 * Route: /admin/messages
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import Button from '../../components/ui/Button';
import { useDemoGuard } from '../../hooks/useDemoGuard';

interface SystemMessage {
  id: string;
  title: string;
  body: string;
  message_type: string;
  display_style: string;
  target_audience: string;
  is_active: boolean;
  is_dismissible: boolean;
  views_count: number;
  dismissals_count: number;
  scheduled_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="text-center py-[60px] px-5 bg-cream-warm border-2 border-dashed border-border_ui-warm rounded-xl mx-4">
    <div className="text-[40px] mb-4">{icon}</div>
    <div className="text-base font-bold text-navy mb-2">{title}</div>
    <div className="text-[13px] text-slate_ui max-w-[400px] mx-auto">{subtitle}</div>
  </div>
);

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div className="bg-gray-200 rounded-md animate-pulse" style={{ width: w, height: h }} />
);

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  info:     { bg: 'bg-green-50', text: 'text-emerald-600' },
  warning:  { bg: 'bg-amber-50', text: 'text-amber-600' },
  critical: { bg: 'bg-red-50', text: 'text-red-600' },
  feature:  { bg: 'bg-blue-50', text: 'text-blue-600' },
};

export default function SystemMessages() {
  useDemoGuard();
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(false);

  // Compose form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [displayStyle, setDisplayStyle] = useState('banner');
  const [target, setTarget] = useState('all');
  const [dismissible, setDismissible] = useState(true);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('system_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setMessages(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const sendMessage = async () => {
    if (!title || !body) return;
    setSending(true);
    const { error } = await supabase.from('system_messages').insert({
      title, body,
      message_type: msgType,
      display_style: displayStyle,
      target_audience: target,
      is_active: true,
      is_dismissible: dismissible,
      views_count: 0,
      dismissals_count: 0,
    });
    if (error) {
      toast.error(`Failed to send message: ${error.message}`);
    } else {
      setTitle(''); setBody(''); setMsgType('info'); setDisplayStyle('banner');
      setShowCompose(false);
      await loadMessages();
    }
    setSending(false);
  };

  const deactivate = async (id: string) => {
    await supabase.from('system_messages').update({ is_active: false }).eq('id', id);
    await loadMessages();
  };

  const active = messages.filter(m => m.is_active);
  const inactive = messages.filter(m => !m.is_active);

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'System Messages' }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-navy">System Messages</h1>
        <Button variant="gold" size="sm" onClick={() => setShowCompose(!showCompose)}>
          {showCompose ? 'Cancel' : '+ Compose Message'}
        </Button>
      </div>

      {/* Compose form */}
      {showCompose && (
        <div className="bg-white border border-border_ui-warm rounded-xl p-5">
          <h3 className="text-sm font-bold text-navy mb-4">New Message</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[11px] text-slate_ui block mb-1">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full" placeholder="Message title" />
            </div>
            <div>
              <label className="text-[11px] text-slate_ui block mb-1">Type</label>
              <select value={msgType} onChange={e => setMsgType(e.target.value)} className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full cursor-pointer">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="feature">Feature</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate_ui block mb-1">Display Style</label>
              <select value={displayStyle} onChange={e => setDisplayStyle(e.target.value)} className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full cursor-pointer">
                <option value="banner">Banner</option>
                <option value="modal">Modal</option>
                <option value="toast">Toast</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate_ui block mb-1">Target Audience</label>
              <select value={target} onChange={e => setTarget(e.target.value)} className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full cursor-pointer">
                <option value="all">All Users</option>
                <option value="owners">Owners Only</option>
                <option value="admins">Admins Only</option>
                <option value="trial">Trial Users</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[11px] text-slate_ui block mb-1">Body *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full resize-y" placeholder="Message body..." />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-1.5 text-xs text-slate_ui cursor-pointer">
              <input type="checkbox" checked={dismissible} onChange={e => setDismissible(e.target.checked)} />
              Dismissible
            </label>
            <Button variant="secondary" size="sm" onClick={() => setPreview(!preview)}>
              {preview ? 'Hide Preview' : 'Preview'}
            </Button>
          </div>

          {/* Preview */}
          {preview && title && body && (() => {
            const tc = TYPE_COLORS[msgType] || TYPE_COLORS.info;
            return (
              <div className={`mb-4 px-4 py-3 rounded-lg border border-border_ui-warm ${tc.bg}`}>
                <div className="text-[11px] text-gray-400 mb-1">Preview ({displayStyle})</div>
                <div className={`text-sm font-bold mb-1 ${tc.text}`}>{title}</div>
                <div className="text-[13px] text-slate_ui">{body}</div>
              </div>
            );
          })()}

          <Button variant="gold" size="sm" onClick={sendMessage} disabled={sending || !title || !body}>
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      )}

      {/* Active messages */}
      <h3 className="text-sm font-bold text-navy">Active Messages ({active.length})</h3>
      <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : active.length === 0 ? (
          <EmptyState icon="📢" title="No active messages" subtitle="No messages sent yet. Use the form to broadcast an announcement to all users." />
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border_ui-warm">
                {['Title', 'Type', 'Style', 'Target', 'Views', 'Dismissed', 'Created', ''].map(h => (
                  <th key={h} className="text-left px-3.5 py-2.5 text-slate_ui font-semibold text-[11px] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map(m => {
                const tc = TYPE_COLORS[m.message_type] || TYPE_COLORS.info;
                return (
                  <tr key={m.id} className="border-b border-border_ui-warm">
                    <td className="px-3.5 py-2.5 text-navy font-semibold">{m.title}</td>
                    <td className="px-3.5 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tc.bg} ${tc.text}`}>{m.message_type}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate_ui text-xs">{m.display_style}</td>
                    <td className="px-3.5 py-2.5 text-slate_ui text-xs">{m.target_audience}</td>
                    <td className="px-3.5 py-2.5 text-slate_ui text-xs">{m.views_count}</td>
                    <td className="px-3.5 py-2.5 text-slate_ui text-xs">{m.dismissals_count}</td>
                    <td className="px-3.5 py-2.5 text-slate_ui text-xs">{new Date(m.created_at).toLocaleDateString()}</td>
                    <td className="px-3.5 py-2.5">
                      <Button variant="destructive" size="sm" onClick={() => deactivate(m.id)}>Deactivate</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Message history */}
      {inactive.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-navy">History ({inactive.length})</h3>
          <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
              <tbody>
                {inactive.slice(0, 20).map(m => (
                  <tr key={m.id} className="border-b border-border_ui-warm">
                    <td className="px-3.5 py-2.5 text-gray-400">{m.title}</td>
                    <td className="px-3.5 py-2.5 text-gray-400 text-xs">{m.message_type}</td>
                    <td className="px-3.5 py-2.5 text-gray-400 text-xs">Views: {m.views_count}</td>
                    <td className="px-3.5 py-2.5 text-gray-400 text-xs">{new Date(m.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
