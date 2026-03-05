/**
 * System Messages — Broadcast announcements to users
 * Route: /admin/messages
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const BG = '#0F1629';
const CARD = '#1A2540';
const GOLD = '#A08C5A';
const TEXT = '#F0EBE0';
const TEXT_DIM = '#8A9AB8';
const TEXT_MUTED = '#4A5C7A';
const BORDER = '#1E2D4D';

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
  <div style={{ textAlign: 'center', padding: '60px 20px', color: TEXT_MUTED }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_DIM, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: TEXT_MUTED, maxWidth: 400, margin: '0 auto' }}>{subtitle}</div>
  </div>
);

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div style={{ width: w, height: h, background: BORDER, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  info:     { bg: '#0f3326', text: '#34D399' },
  warning:  { bg: '#3b2f10', text: '#FBBF24' },
  critical: { bg: '#3b1414', text: '#F87171' },
  feature:  { bg: '#1a2540', text: '#60A5FA' },
};

export default function SystemMessages() {
  const navigate = useNavigate();
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
      alert(`Error: ${error.message}`);
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

  const inputStyle: React.CSSProperties = { padding: '8px 12px', background: '#0A0F1E', border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 13, width: '100%' };

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 40px', fontFamily: 'Inter, sans-serif' }}>
      <button onClick={() => navigate('/admin')} style={{ marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', color: GOLD, fontSize: 13 }}>&larr; Admin</button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0 }}>System Messages</h1>
        <button onClick={() => setShowCompose(!showCompose)}
          style={{ padding: '8px 20px', background: GOLD, border: 'none', borderRadius: 8, color: '#1E2D4D', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {showCompose ? 'Cancel' : '+ Compose Message'}
        </button>
      </div>

      {/* Compose form */}
      {showCompose && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 16 }}>New Message</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="Message title" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Type</label>
              <select value={msgType} onChange={e => setMsgType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="feature">Feature</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Display Style</label>
              <select value={displayStyle} onChange={e => setDisplayStyle(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="banner">Banner</option>
                <option value="modal">Modal</option>
                <option value="toast">Toast</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Target Audience</label>
              <select value={target} onChange={e => setTarget(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="all">All Users</option>
                <option value="owners">Owners Only</option>
                <option value="admins">Admins Only</option>
                <option value="trial">Trial Users</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Body *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Message body..." />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT_DIM, cursor: 'pointer' }}>
              <input type="checkbox" checked={dismissible} onChange={e => setDismissible(e.target.checked)} />
              Dismissible
            </label>
            <button onClick={() => setPreview(!preview)}
              style={{ padding: '4px 12px', background: '#0A0F1E', border: `1px solid ${BORDER}`, borderRadius: 4, color: TEXT_DIM, fontSize: 11, cursor: 'pointer' }}>
              {preview ? 'Hide Preview' : 'Preview'}
            </button>
          </div>

          {/* Preview */}
          {preview && title && body && (
            <div style={{
              marginBottom: 16, padding: '12px 16px', borderRadius: 8,
              background: displayStyle === 'banner' ? (TYPE_COLORS[msgType]?.bg || CARD) : CARD,
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Preview ({displayStyle})</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: TYPE_COLORS[msgType]?.text || TEXT, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 13, color: TEXT_DIM }}>{body}</div>
            </div>
          )}

          <button onClick={sendMessage} disabled={sending || !title || !body}
            style={{ padding: '8px 20px', background: sending ? BORDER : GOLD, border: 'none', borderRadius: 6, color: '#1E2D4D', fontSize: 13, fontWeight: 700, cursor: sending ? 'default' : 'pointer' }}>
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      )}

      {/* Active messages */}
      <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Active Messages ({active.length})</h3>
      <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden', marginBottom: 24 }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h={32} />)}
          </div>
        ) : active.length === 0 ? (
          <EmptyState icon="📢" title="No active messages" subtitle="No messages sent yet. Use the form to broadcast an announcement to all users." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Title', 'Type', 'Style', 'Target', 'Views', 'Dismissed', 'Created', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: TEXT_DIM, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map(m => {
                const tc = TYPE_COLORS[m.message_type] || TYPE_COLORS.info;
                return (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '10px 14px', color: TEXT, fontWeight: 600 }}>{m.title}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.text }}>{m.message_type}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{m.display_style}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{m.target_audience}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{m.views_count}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{m.dismissals_count}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12 }}>{new Date(m.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => deactivate(m.id)} style={{ padding: '4px 10px', background: '#3b1414', border: 'none', borderRadius: 4, color: '#F87171', fontSize: 11, cursor: 'pointer' }}>Deactivate</button>
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
          <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 12 }}>History ({inactive.length})</h3>
          <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {inactive.slice(0, 20).map(m => (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '10px 14px', color: TEXT_MUTED }}>{m.title}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_MUTED, fontSize: 12 }}>{m.message_type}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_MUTED, fontSize: 12 }}>Views: {m.views_count}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_MUTED, fontSize: 12 }}>{new Date(m.created_at).toLocaleDateString()}</td>
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
