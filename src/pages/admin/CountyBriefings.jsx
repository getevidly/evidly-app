import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';

const STATUS_BADGE = {
  approved:  { bg: '#E3ECE1', text: '#3E5E4B', label: 'Approved' },
  lapsed:    { bg: '#F7EDD3', text: '#8A6412', label: 'Lapsed' },
  blocked:   { bg: '#F6E3DF', text: '#8E332B' },
  pending:   { bg: '#F0EADC', text: '#5F6875', label: 'Not reviewed' },
};

function Badge({ status, reason }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.pending;
  const label = s.label || reason || 'Blocked';
  return (
    <span title={reason || ''} style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 4,
      fontSize: 12, fontWeight: 600, background: s.bg, color: s.text,
    }}>
      {label}{status === 'lapsed' && reason ? ` — ${reason}` : ''}
    </span>
  );
}

function getStatus(c) {
  if (!c.sendable && c.block_reason) return 'blocked';
  if (c.lapsed) return 'lapsed';
  if (c.approved) return 'approved';
  return 'pending';
}

export default function CountyBriefings() {
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewCounty, setPreviewCounty] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addCounty, setAddCounty] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addFirstName, setAddFirstName] = useState('');
  const [addOrgName, setAddOrgName] = useState('');
  const [addVariant, setAddVariant] = useState('cold');
  const [message, setMessage] = useState(null);

  const loadCounties = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: { action: 'list' },
    });
    if (error) { console.error(error); setLoading(false); return; }
    setCounties(data?.counties || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCounties(); }, [loadCounties]);

  const flash = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  const handlePreview = async (county) => {
    setActionLoading(`preview-${county}`);
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: { action: 'preview', county },
    });
    setActionLoading(null);
    if (error || !data?.preview_html) {
      flash(`Preview failed: ${error?.message || data?.error || 'Unknown error'}`);
      return;
    }
    setPreviewHtml(data.preview_html);
    setPreviewCounty(county);
  };

  const handleApprove = async (county) => {
    setActionLoading(`approve-${county}`);
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: { action: 'approve', county },
    });
    setActionLoading(null);
    if (error || !data?.approval_id) {
      flash(`Approve failed: ${error?.message || data?.error || 'Unknown error'}`);
      return;
    }
    flash(`${county} approved`);
    loadCounties();
  };

  const handleSend = async (county, queuedCount) => {
    if (!confirm(`Send ${queuedCount} queued briefing(s) for ${county} County?`)) return;
    setActionLoading(`send-${county}`);
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: { action: 'send', county },
    });
    setActionLoading(null);
    if (error) {
      flash(`Send failed: ${error.message || data?.error || 'Unknown error'}`);
      return;
    }
    flash(`${county}: ${data.sent} sent, ${data.failed} failed, ${data.held} held`);
    loadCounties();
  };

  const handleAddRecipient = async (e) => {
    e.preventDefault();
    if (!addEmail || !addCounty) return;
    setActionLoading('add');
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: {
        action: 'add-recipients',
        recipients: [{
          email: addEmail, first_name: addFirstName || undefined,
          org_name: addOrgName || undefined, county: addCounty, variant: addVariant,
        }],
      },
    });
    setActionLoading(null);
    if (error || !data?.inserted) {
      flash(`Add failed: ${error?.message || data?.error || 'Unknown error'}`);
      return;
    }
    flash(`Added ${addEmail} for ${addCounty}`);
    setAddEmail(''); setAddFirstName(''); setAddOrgName('');
    setShowAddForm(false);
    loadCounties();
  };

  const inputStyle = {
    padding: '8px 12px', border: '1px solid #E4DBC8', borderRadius: 6,
    fontSize: 14, fontFamily: "'Instrument Sans', system-ui, sans-serif",
    outline: 'none', width: '100%',
  };
  const btnStyle = (bg, fg) => ({
    padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, background: bg, color: fg,
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
  });

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <AdminBreadcrumb crumbs={[{ label: 'County Briefings' }]} />
        <p style={{ color: '#5F6875' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <AdminBreadcrumb crumbs={[{ label: 'County Briefings' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C2A3A', margin: 0,
          fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
          County Briefings
        </h1>
        <button style={btnStyle('#1C2A3A', '#FFF')} onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : '+ Add Recipient'}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '10px 16px', borderRadius: 6, marginBottom: 16,
          background: '#E3ECE1', color: '#3E5E4B', fontSize: 14,
          fontFamily: "'Instrument Sans', system-ui, sans-serif",
        }}>
          {message}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddRecipient} style={{
          background: '#FBF9F2', border: '1px solid #EEE7D9', borderRadius: 8,
          padding: 20, marginBottom: 20, display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr auto auto', gap: 12, alignItems: 'end',
        }}>
          <div>
            <label style={{ fontSize: 11, color: '#5F6875', display: 'block', marginBottom: 4 }}>Email *</label>
            <input type="email" required value={addEmail} onChange={e => setAddEmail(e.target.value)}
              placeholder="name@example.com" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#5F6875', display: 'block', marginBottom: 4 }}>First name</label>
            <input value={addFirstName} onChange={e => setAddFirstName(e.target.value)}
              placeholder="Optional" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#5F6875', display: 'block', marginBottom: 4 }}>Org name</label>
            <input value={addOrgName} onChange={e => setAddOrgName(e.target.value)}
              placeholder="Optional" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#5F6875', display: 'block', marginBottom: 4 }}>County *</label>
            <select value={addCounty} onChange={e => setAddCounty(e.target.value)} required
              style={{ ...inputStyle, background: '#FFF' }}>
              <option value="">Select county</option>
              {counties.map(c => <option key={c.county} value={c.county}>{c.county}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#5F6875', display: 'block', marginBottom: 4 }}>Variant</label>
            <select value={addVariant} onChange={e => setAddVariant(e.target.value)}
              style={{ ...inputStyle, background: '#FFF' }}>
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
            </select>
          </div>
          <button type="submit" disabled={actionLoading === 'add'} style={btnStyle('#B24A2E', '#FFF')}>
            {actionLoading === 'add' ? 'Adding...' : 'Add'}
          </button>
        </form>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse', fontSize: 14,
          fontFamily: "'Instrument Sans', system-ui, sans-serif",
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E4DBC8' }}>
              {['County', 'Status', 'Queued', 'Sent', 'Held', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '10px 12px', textAlign: 'left', fontSize: 11,
                  fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#5F6875', fontWeight: 600,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {counties.map(c => {
              const status = getStatus(c);
              return (
                <tr key={c.county} style={{ borderBottom: '1px solid #EEE7D9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1C2A3A' }}>{c.county}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge status={status} reason={status === 'blocked' ? c.block_reason : c.lapse_reason} />
                  </td>
                  <td style={{ padding: '10px 12px', color: '#5F6875' }}>{c.queued}</td>
                  <td style={{ padding: '10px 12px', color: '#3E5E4B' }}>{c.sent}</td>
                  <td style={{ padding: '10px 12px', color: '#8A6412' }}>{c.held}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        style={btnStyle('#F0EADC', '#1C2A3A')}
                        disabled={!!actionLoading}
                        onClick={() => handlePreview(c.county)}
                      >
                        {actionLoading === `preview-${c.county}` ? '...' : 'Preview'}
                      </button>
                      {status !== 'blocked' && status !== 'approved' && (
                        <button
                          style={btnStyle('#E3ECE1', '#3E5E4B')}
                          disabled={!!actionLoading}
                          onClick={() => handleApprove(c.county)}
                        >
                          {actionLoading === `approve-${c.county}` ? '...' : 'Approve'}
                        </button>
                      )}
                      {status === 'approved' && c.queued > 0 && (
                        <button
                          style={btnStyle('#1C2A3A', '#FFF')}
                          disabled={!!actionLoading}
                          onClick={() => handleSend(c.county, c.queued)}
                        >
                          {actionLoading === `send-${c.county}` ? '...' : `Send (${c.queued})`}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {counties.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#5F6875' }}>
                No counties found.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Preview modal */}
      {previewHtml && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }} onClick={() => { setPreviewHtml(null); setPreviewCounty(null); }}>
          <div style={{
            background: '#FFF', borderRadius: 12, maxWidth: 660, width: '95vw',
            maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 24px', borderBottom: '1px solid #EEE7D9',
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1C2A3A',
                fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>
                {previewCounty} County — Preview
              </span>
              <button onClick={() => { setPreviewHtml(null); setPreviewCounty(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#5F6875' }}>
                &times;
              </button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      )}
    </div>
  );
}
