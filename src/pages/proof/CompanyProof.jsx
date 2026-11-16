/**
 * CompanyProof — /company-proof/:token (mock screens 5 and 6, EvidLY side)
 *
 * A HoodOps company's own Estimate Proof area, no password: the token is a
 * 7-day company_area_links link from HoodOps (Settings › Certifications and
 * Insurance, or an insurance request task), a reminder or request email, or
 * /company-proof (Email Me a Link).
 *
 *   Insurance Requests            what each client requires, against what the
 *                                 company has; Email the Request to My Broker;
 *                                 Upload Updated Certificate
 *   Certifications and Insurance  add, update and remove; broker email; reminders
 *   Link Views                    every view of every proof link
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ACCEPT_FILES, Bar, Button, C, callProof, fileToPayload, Loading, MAX_FILE_BYTES, MessageCard, openFile,
  Page, Pill, Row, Small,
} from './proofUi';

const TABS = [
  ['requests', 'Insurance Requests'],
  ['records', 'Certifications and Insurance'],
  ['views', 'Link Views'],
];

const REMINDER_CHOICES = [90, 60, 45, 30, 14, 7];

const PAGE_LABELS = {
  certifications: 'Certifications Page',
  insurance: 'Insurance Page',
  certification_file: 'Certification Certificate',
  policy_file: 'Insurance Certificate',
  updated_certificate_file: 'Updated Certificate',
};

const input = {
  border: '1px solid #C5D3DC', borderRadius: 8, padding: '8px 10px', fontSize: 14, color: C.ink,
  background: '#fff', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
};
const label = { fontSize: 12, color: C.muted, fontWeight: 600, margin: '8px 0 4px' };

function formatDay(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function formatWhen(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function Box({ title, children }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px', margin: '14px 0', background: '#fff' }}>
      {title && <h2 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: C.navy }}>{title}</h2>}
      {children}
    </div>
  );
}

function FilePicker({ file, onChange, prompt }) {
  return (
    <label style={{ ...input, display: 'block', color: C.muted, cursor: 'pointer' }}>
      {file ? file.name : prompt}
      <input type="file" accept={ACCEPT_FILES} style={{ display: 'none' }} onChange={(e) => onChange(e.target.files?.[0] || null)} />
    </label>
  );
}

async function readFile(file) {
  if (!file) return { payload: undefined };
  if (file.size > MAX_FILE_BYTES) return { error: 'The file is larger than 10 MB.' };
  try {
    return { payload: await fileToPayload(file) };
  } catch {
    return { error: 'The file could not be read.' };
  }
}

// ── Insurance Requests ───────────────────────────────────────

function RequestCard({ r, token, onChanged }) {
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState(null);
  const [error, setError] = useState(null);

  const open = async (kind) => {
    setError(null);
    const { data, error: e } = await callProof('proof-access', { action: 'company.file', token, kind, id: r.request_id });
    if (e || !data?.url) setError('The file could not be opened.');
    else openFile(data.url);
  };

  const emailBroker = async () => {
    setBusy('broker'); setError(null); setNote(null);
    const { data, error: e } = await callProof('proof-access', { action: 'company.email_broker', token, request_id: r.request_id });
    setBusy(null);
    if (e || !data?.sent) setError(e || 'The email could not be sent.');
    else { setNote(`Sent to ${data.to}.`); onChanged(); }
  };

  const upload = async (file) => {
    if (!file) return;
    setError(null); setNote(null);
    const read = await readFile(file);
    if (read.error) { setError(read.error); return; }
    setBusy('upload');
    const { data, error: e } = await callProof('proof-access', { action: 'company.answer', token, request_id: r.request_id, file: read.payload });
    setBusy(null);
    if (e || !data?.answered) { setError(e || 'The certificate could not be uploaded.'); return; }
    setNote(data.client_notified
      ? 'Uploaded. The client has been emailed that it is ready, and it is on their insurance page.'
      : 'Uploaded. It is on the client\'s insurance page. No client email is on file for this estimate, so no email was sent.');
    onChanged();
  };

  const statusPill = r.status === 'open'
    ? <Pill tone="amber">Needs Updated Certificate</Pill>
    : <Pill tone="green">Updated Certificate Sent</Pill>;

  return (
    <div style={{ marginBottom: 18 }}>
      <Row>
        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <div style={{ fontWeight: 700 }}>{r.location_name}</div>
          <Small>
            {['Requested ' + formatDay(r.requested_at), r.who_is_asking, r.certificate_holder ? `Certificate holder ${r.certificate_holder}` : null]
              .filter(Boolean).join(' · ')}
          </Small>
          {r.certificate_holder_address && <Small>{r.certificate_holder_address}</Small>}
        </div>
        {statusPill}
      </Row>
      <Box title="What They Require, Against What You Have">
        {r.lines.map((l) => (
          <Row key={`${l.kind}:${l.code}`}>
            <span style={{ fontSize: 14 }}>{l.text}</span>
            {l.meets ? <Pill tone="green">You Meet This</Pill> : <Pill tone="amber">Ask Your Broker</Pill>}
          </Row>
        ))}
        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button disabled={!!busy} onClick={emailBroker}>{busy === 'broker' ? 'Sending...' : 'Email the Request to My Broker'}</Button>
          <label>
            <span style={{
              minHeight: 40, padding: '0 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'inline-flex',
              alignItems: 'center', background: C.bar, color: '#fff', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.65 : 1,
            }}>
              {busy === 'upload' ? 'Uploading...' : 'Upload Updated Certificate'}
            </span>
            <input type="file" accept={ACCEPT_FILES} disabled={!!busy} style={{ display: 'none' }}
              onChange={(e) => { upload(e.target.files?.[0] || null); e.target.value = ''; }} />
          </label>
          {r.has_requirements_file && <Button onClick={() => open('requirements')}>View Their Requirements</Button>}
          {r.has_updated_certificate && <Button onClick={() => open('updated_certificate')}>View Updated Certificate</Button>}
        </div>
        <Small style={{ marginTop: 8 }}>
          Uploading sends the client an email that the updated certificate is ready, and it appears on their EvidLY insurance page.
          {r.broker_emailed_at ? ` Emailed to your broker ${formatDay(r.broker_emailed_at)}.` : ''}
        </Small>
        {note && <Small style={{ marginTop: 6, color: C.green }}>{note}</Small>}
        {error && <Small style={{ marginTop: 6, color: C.red }}>{error}</Small>}
      </Box>
    </div>
  );
}

// ── Certifications and Insurance ─────────────────────────────

const EMPTY_CERT = { name: '', number: '', holder: '', expiration_date: '' };
const EMPTY_POLICY = {
  coverage_code: '', carrier: '', policy_number: '', per_occurrence_limit: '', aggregate_limit: '',
  limits_text: '', endorsements: [], notice_of_cancellation_days: '', expiration_date: '',
};

function CertForm({ initial, token, onDone, onCancel }) {
  const [v, setV] = useState(initial);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const save = async () => {
    setError(null);
    const read = await readFile(file);
    if (read.error) { setError(read.error); return; }
    setBusy(true);
    const { data, error: e } = await callProof('proof-access', {
      action: 'company.save_certification', token, certification: { ...v, file: read.payload },
    });
    setBusy(false);
    if (e || !data?.id) setError(e || 'Could not save.');
    else onDone();
  };
  return (
    <Box title={v.id ? 'Update Certification' : 'Add a Certification'}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <div><div style={label}>Certification</div><input style={input} value={v.name} onChange={set('name')} placeholder="Certified Exhaust System Inspector (CESI)" /></div>
        <div><div style={label}>Number</div><input style={input} value={v.number || ''} onChange={set('number')} /></div>
        <div><div style={label}>Holder</div><input style={input} value={v.holder || ''} onChange={set('holder')} /></div>
        <div><div style={label}>Expiration Date</div><input type="date" style={input} value={v.expiration_date || ''} onChange={set('expiration_date')} /></div>
      </div>
      <div style={label}>Certificate (PDF or Photo)</div>
      <FilePicker file={file} onChange={setFile} prompt={v.id ? 'Replace the certificate (optional)' : 'Add the certificate'} />
      {error && <Small style={{ color: C.red, marginTop: 6 }}>{error}</Small>}
      <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
        <Button kind="dark" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save Certification'}</Button>
        <Button disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </Box>
  );
}

function PolicyForm({ initial, options, token, onDone, onCancel }) {
  const [v, setV] = useState(initial);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const toggle = (code) => setV((s) => ({
    ...s,
    endorsements: s.endorsements.includes(code) ? s.endorsements.filter((c) => c !== code) : [...s.endorsements, code],
  }));
  const save = async () => {
    setError(null);
    const read = await readFile(file);
    if (read.error) { setError(read.error); return; }
    setBusy(true);
    const { data, error: e } = await callProof('proof-access', {
      action: 'company.save_policy', token, policy: { ...v, file: read.payload },
    });
    setBusy(false);
    if (e || !data?.id) setError(e || 'Could not save.');
    else onDone();
  };
  const endorsementChoices = options.endorsement_options.filter((o) => o.code !== 'other' && o.code !== 'additional_insured');
  return (
    <Box title={v.id ? 'Update Policy' : 'Add a Policy'}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <div>
          <div style={label}>Type</div>
          <select style={input} value={v.coverage_code} onChange={set('coverage_code')}>
            <option value="">Choose</option>
            {options.coverage_options.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
        </div>
        <div><div style={label}>Carrier</div><input style={input} value={v.carrier || ''} onChange={set('carrier')} /></div>
        <div><div style={label}>Policy Number</div><input style={input} value={v.policy_number || ''} onChange={set('policy_number')} /></div>
        <div><div style={label}>Expiration Date</div><input type="date" style={input} value={v.expiration_date || ''} onChange={set('expiration_date')} /></div>
        <div><div style={label}>Per Occurrence or Each Accident Limit ($)</div><input style={input} inputMode="decimal" value={v.per_occurrence_limit ?? ''} onChange={set('per_occurrence_limit')} /></div>
        <div><div style={label}>Aggregate Limit ($)</div><input style={input} inputMode="decimal" value={v.aggregate_limit ?? ''} onChange={set('aggregate_limit')} /></div>
        <div><div style={label}>Limits as Shown to Clients (Optional)</div><input style={input} value={v.limits_text || ''} onChange={set('limits_text')} placeholder="Statutory" /></div>
        <div><div style={label}>Notice of Cancellation (Days)</div><input style={input} inputMode="numeric" value={v.notice_of_cancellation_days ?? ''} onChange={set('notice_of_cancellation_days')} /></div>
      </div>
      <div style={label}>Endorsements This Policy Carries</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {endorsementChoices.map((o) => (
          <label key={o.code} style={{ fontSize: 14, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={v.endorsements.includes(o.code)} onChange={() => toggle(o.code)} style={{ accentColor: C.blue }} />
            {o.label}
          </label>
        ))}
      </div>
      <div style={label}>Certificate of Insurance (PDF or Photo)</div>
      <FilePicker file={file} onChange={setFile} prompt={v.id ? 'Replace the certificate (optional)' : 'Add the certificate'} />
      {error && <Small style={{ color: C.red, marginTop: 6 }}>{error}</Small>}
      <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
        <Button kind="dark" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save Policy'}</Button>
        <Button disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </Box>
  );
}

function ItemPill({ item }) {
  const text = `${item.status === 'current' ? 'Current' : 'Expired'}${item.expires ? ` · Expires ${item.expires}` : ''}`;
  return <Pill tone={item.status === 'current' ? 'green' : 'red'}>{text}</Pill>;
}

function Records({ d, token, reload }) {
  const [editing, setEditing] = useState(null); // {kind, value}
  const [broker, setBroker] = useState(d.broker_email || '');
  const [days, setDays] = useState(d.reminder_days);
  const [msg, setMsg] = useState(null);

  const open = async (kind, id) => {
    const { data } = await callProof('proof-access', { action: 'company.file', token, kind, id });
    if (data?.url) openFile(data.url);
  };
  const remove = async (kind, id) => {
    await callProof('proof-access', { action: 'company.archive', token, kind, id });
    reload();
  };
  const saveSettings = async () => {
    setMsg(null);
    const { data, error } = await callProof('proof-access', {
      action: 'company.save_settings', token, settings: { broker_email: broker, reminder_days: days },
    });
    setMsg(error || !data?.saved ? { error: error || 'Could not save.' } : { ok: 'Saved.' });
    if (data?.saved) reload();
  };
  const done = () => { setEditing(null); reload(); };

  return (
    <>
      <Box title="Certifications">
        {d.certifications.length === 0 && <Small>No certifications on file yet.</Small>}
        {d.certifications.map((c) => (
          <Row key={c.id}>
            <span style={{ fontSize: 14, flex: '1 1 260px' }}>
              {[c.name, c.number ? `#${c.number}` : null, c.holder].filter(Boolean).join(' · ')}
            </span>
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <ItemPill item={c} />
              {c.has_file && <Button onClick={() => open('certification', c.id)}>View</Button>}
              <Button onClick={() => setEditing({ kind: 'cert', value: { id: c.id, name: c.name, number: c.number, holder: c.holder, expiration_date: c.expiration_date } })}>Update</Button>
              <Button onClick={() => remove('certification', c.id)}>Remove</Button>
            </span>
          </Row>
        ))}
        {editing?.kind === 'cert'
          ? <CertForm initial={editing.value} token={token} onDone={done} onCancel={() => setEditing(null)} />
          : <div style={{ marginTop: 10 }}><Button onClick={() => setEditing({ kind: 'cert', value: EMPTY_CERT })}>Add a Certification</Button></div>}
      </Box>

      <Box title="Insurance">
        {d.policies.length === 0 && <Small>No insurance policies on file yet.</Small>}
        {d.policies.map((p) => (
          <Row key={p.id}>
            <span style={{ fontSize: 14, flex: '1 1 260px' }}>
              {[p.type, p.carrier, p.policy_number ? `Policy ${p.policy_number}` : null, p.limits].filter(Boolean).join(' · ')}
            </span>
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <ItemPill item={p} />
              {p.has_file && <Button onClick={() => open('policy', p.id)}>View</Button>}
              <Button onClick={() => setEditing({
                kind: 'policy',
                value: {
                  ...EMPTY_POLICY, id: p.id, coverage_code: p.coverage_code, carrier: p.carrier, policy_number: p.policy_number,
                  per_occurrence_limit: p.per_occurrence_limit ?? '', aggregate_limit: p.aggregate_limit ?? '',
                  limits_text: p.limits_text ?? '',
                  endorsements: p.endorsements, notice_of_cancellation_days: p.notice_of_cancellation_days ?? '',
                  expiration_date: p.expiration_date,
                },
              })}>Update</Button>
              <Button onClick={() => remove('policy', p.id)}>Remove</Button>
            </span>
          </Row>
        ))}
        {editing?.kind === 'policy'
          ? <PolicyForm initial={editing.value} options={d} token={token} onDone={done} onCancel={() => setEditing(null)} />
          : <div style={{ marginTop: 10 }}><Button onClick={() => setEditing({ kind: 'policy', value: EMPTY_POLICY })}>Add a Policy</Button></div>}
      </Box>

      <Box title="Settings">
        <div style={label}>Broker Email for Requests</div>
        <input style={{ ...input, maxWidth: 360 }} type="email" value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="broker@example.com" />
        <div style={label}>Reminders Before Anything Expires (Days)</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {REMINDER_CHOICES.map((n) => (
            <label key={n} style={{ fontSize: 14, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={days.includes(n)} style={{ accentColor: C.blue }}
                onChange={() => setDays((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))} />
              {n}
            </label>
          ))}
        </div>
        <Small style={{ marginTop: 6 }}>Reminders go to {d.company_email || 'the email on file'}.</Small>
        <div style={{ marginTop: 10 }}><Button kind="dark" onClick={saveSettings}>Save Settings</Button></div>
        {msg?.ok && <Small style={{ color: C.green, marginTop: 6 }}>{msg.ok}</Small>}
        {msg?.error && <Small style={{ color: C.red, marginTop: 6 }}>{msg.error}</Small>}
      </Box>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function CompanyProof() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  const [tab, setTab] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await callProof('proof-access', { action: 'company.load', token });
    if (error) setState({ status: 'error' });
    else if (data?.status !== 'ok') setState({ status: 'expired' });
    else setState({ status: 'ok', data });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (state.status === 'loading') return <Loading label="Loading Your Records..." />;
  if (state.status === 'error') {
    return <MessageCard title="Something Went Wrong" message="We could not load your records. Please try again in a moment." />;
  }
  if (state.status === 'expired') {
    return (
      <MessageCard title="This Link Has Expired" message="Links to your records work for 7 days. Open Certifications and Insurance from HoodOps Settings, or ask for a new link by email.">
        <p style={{ marginTop: 16 }}><Link to="/company-proof" style={{ color: C.blue, fontWeight: 700, fontSize: 14 }}>Email Me a New Link</Link></p>
      </MessageCard>
    );
  }

  const d = state.data;
  const openCount = d.requests.filter((r) => r.status === 'open').length;
  const active = tab || (openCount > 0 ? 'requests' : 'records');

  return (
    <Page title={`${d.company_name} · Certifications and Insurance`}>
      <Bar companyName={d.company_name} subtitle="EvidLY · Certifications and Insurance" right={openCount ? `${openCount} Open Insurance Request${openCount === 1 ? '' : 's'}` : null} />
      <div style={{ display: 'flex', gap: 4, padding: '10px 24px 0', borderBottom: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
        {TABS.map(([id, text]) => (
          <button key={id} type="button" onClick={() => setTab(id)} style={{
            border: 'none', background: 'none', padding: '10px 12px', fontSize: 14, cursor: 'pointer',
            fontWeight: active === id ? 700 : 500, color: active === id ? C.navy : C.muted,
            borderBottom: active === id ? `2px solid ${C.orange}` : '2px solid transparent',
          }}>
            {text}
          </button>
        ))}
      </div>
      <div style={{ padding: '14px 24px 24px' }}>
        {active === 'requests' && (
          <>
            {d.requests.length === 0 && <Small>No insurance requests yet. When a client tells you what insurance it requires, it shows here.</Small>}
            {d.requests.map((r) => <RequestCard key={r.request_id} r={r} token={token} onChanged={load} />)}
          </>
        )}
        {active === 'records' && <Records d={d} token={token} reload={load} />}
        {active === 'views' && (
          <>
            {d.views.length === 0 && <Small>No one has opened a proof link yet.</Small>}
            {d.views.map((v, i) => (
              <Row key={i}>
                <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{v.location_name || 'Unknown Location'} · {PAGE_LABELS[v.page] || v.page}</div>
                  <Small>{[v.estimate_id ? `Estimate ${v.estimate_id}` : null, v.ip, v.user_agent].filter(Boolean).join(' · ')}</Small>
                </div>
                <Small>{formatWhen(v.viewed_at)}</Small>
              </Row>
            ))}
          </>
        )}
      </div>
    </Page>
  );
}
