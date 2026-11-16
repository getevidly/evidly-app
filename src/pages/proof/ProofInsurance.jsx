/**
 * ProofInsurance — /proof/:token/insurance (mock screen 4)
 *
 * Public, no login. Unlocked only after HoodOps reports the estimate Approved
 * (hoodops-estimate-proof, proof_link.approve). Shows every current certificate
 * of insurance, any updated certificate the company has sent for this estimate,
 * and "What Insurance Do You Require?". The coverage and endorsement lists come
 * from settings (proof_requirement_options), not from this file.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ACCEPT_FILES, Bar, Button, C, callProof, fileToPayload, LINK_NOT_FOUND, Loading, MAX_FILE_BYTES,
  MessageCard, openFile, Page, Row, Small, StatusPill,
} from './proofUi';

const inputStyle = {
  border: '1px solid #C5D3DC', borderRadius: 8, padding: '9px 10px', fontSize: 14, color: C.ink,
  background: '#fff', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
};
const smallInput = { ...inputStyle, width: 150, padding: '4px 8px', display: 'inline-block' };
const fieldLabel = { fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 };

const FIELD_LABELS = {
  per_occurrence: 'minimum per occurrence',
  aggregate: 'aggregate',
  minimum: 'minimum',
  name: '(name exactly as it should appear)',
  days: 'days',
  text: '',
};
const FIELD_PLACEHOLDERS = {
  per_occurrence: '$ amount', aggregate: '$ amount', minimum: '$ amount', name: 'Name', days: '30', text: 'Describe',
};

function Checkbox({ checked, onChange, children }) {
  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', cursor: 'pointer', fontSize: 14 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18, marginTop: 2, accentColor: C.blue, flex: 'none' }} />
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>{children}</span>
    </label>
  );
}

function OptionLine({ option, value, onChange }) {
  const checked = !!value;
  const set = (patch) => onChange({ ...(value || {}), ...patch });
  return (
    <Checkbox checked={checked} onChange={(on) => onChange(on ? (value || {}) : null)}>
      <span>{option.label}</span>
      {option.fields.map((f) => (
        <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {FIELD_LABELS[f] && <span style={{ color: C.muted }}>· {FIELD_LABELS[f]}</span>}
          <input
            style={f === 'name' || f === 'text' ? { ...smallInput, width: 220 } : smallInput}
            inputMode={f === 'days' || f === 'name' || f === 'text' ? (f === 'days' ? 'numeric' : 'text') : 'decimal'}
            placeholder={FIELD_PLACEHOLDERS[f]}
            value={value?.[f] ?? ''}
            onFocus={() => { if (!checked) onChange({}); }}
            onChange={(e) => set({ [f]: e.target.value })}
            aria-label={`${option.label} ${FIELD_LABELS[f] || f}`}
          />
        </span>
      ))}
    </Checkbox>
  );
}

export default function ProofInsurance() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  const [opening, setOpening] = useState(null);
  const [fileError, setFileError] = useState(null);

  const [holderName, setHolderName] = useState('');
  const [holderAddress, setHolderAddress] = useState('');
  const [who, setWho] = useState('our_company');
  const [whoOther, setWhoOther] = useState('');
  const [coverages, setCoverages] = useState({});
  const [endorsements, setEndorsements] = useState({});
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [formError, setFormError] = useState(null);
  const [done, setDone] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await callProof('proof-access', { action: 'insurance', token });
    if (error) setState({ status: 'error' });
    else if (data?.status === 'locked') setState({ status: 'locked', data });
    else if (data?.status !== 'ok') setState({ status: 'not_found' });
    else setState({ status: 'ok', data });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const view = useCallback(async (action, idKey, id) => {
    setOpening(id);
    setFileError(null);
    const { data, error } = await callProof('proof-access', { action, token, [idKey]: id });
    setOpening(null);
    if (error || !data?.url) {
      setFileError(id);
      return;
    }
    openFile(data.url);
  }, [token]);

  const send = async () => {
    setFormError(null);
    const requirements = {
      holder_name: holderName,
      holder_address: holderAddress,
      who_is_asking: who,
      who_is_asking_other: who === 'other' ? whoOther : '',
      coverages: Object.entries(coverages).filter(([, v]) => v).map(([code, v]) => ({ code, ...v })),
      endorsements: Object.entries(endorsements).filter(([, v]) => v).map(([code, v]) => ({ code, ...v })),
    };
    let filePayload;
    if (file) {
      if (file.size > MAX_FILE_BYTES) {
        setFormError('The file is larger than 10 MB.');
        return;
      }
      try {
        filePayload = await fileToPayload(file);
      } catch {
        setFormError('The file could not be read.');
        return;
      }
    }
    setSubmitting('send');
    const { data, error } = await callProof('proof-access', {
      action: 'submit_requirements', token, requirements, file: filePayload,
    });
    setSubmitting(null);
    if (error || data?.status !== 'sent') {
      setFormError(error || 'Your requirements could not be sent. Please try again.');
      return;
    }
    setDone('sent');
    load();
  };

  const enough = async () => {
    setFormError(null);
    setSubmitting('enough');
    const { data, error } = await callProof('proof-access', { action: 'current_enough', token });
    setSubmitting(null);
    if (error || data?.status !== 'recorded') {
      setFormError(error || 'That could not be saved. Please try again.');
      return;
    }
    setDone('enough');
    load();
  };

  if (state.status === 'loading') return <Loading label="Loading Insurance..." />;
  if (state.status === 'error') {
    return <MessageCard title="Something Went Wrong" message="We could not load this insurance. Please try again in a moment." />;
  }
  if (state.status === 'not_found') return <MessageCard {...LINK_NOT_FOUND} />;
  if (state.status === 'locked') {
    const { company_name: companyName } = state.data;
    return (
      <MessageCard
        title="Insurance Is Shared After Approval"
        message={`${companyName} shares its certificates of insurance here once you approve your estimate.`}
      >
        <p style={{ marginTop: 16 }}>
          <Link to={`/proof/${token}`} style={{ color: C.blue, fontWeight: 700, fontSize: 14 }}>View Our Certifications</Link>
        </p>
      </MessageCard>
    );
  }

  const d = state.data;
  const answered = d.requests.filter((r) => r.has_updated_certificate);

  return (
    <Page title={`${d.company_name} · Insurance`}>
      <Bar companyName={d.company_name} subtitle="Insurance · verified in EvidLY" right={`Shared with ${d.location_name}`} />
      <div style={{ padding: '18px 24px 24px' }}>
        {d.policies.length === 0 && (
          <p style={{ color: C.ink2, fontSize: 14 }}>{d.company_name} has no current certificates of insurance on file in EvidLY yet.</p>
        )}
        {d.policies.map((p) => {
          const detail = [p.carrier, p.policy_number ? `Policy ${p.policy_number}` : null, p.limits,
            p.expires ? `Expires ${p.expires}` : null].filter(Boolean).join(' · ');
          return (
            <Row key={p.id}>
              <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.type}</div>
                {detail && <Small>{detail}</Small>}
                {fileError === p.id && <Small style={{ color: C.red }}>The certificate could not be opened. Please try again.</Small>}
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <StatusPill status={p.status} />
                {p.has_file && (
                  <Button disabled={opening === p.id} onClick={() => view('policy_file', 'item_id', p.id)}>
                    {opening === p.id ? 'Opening...' : 'View Certificate'}
                  </Button>
                )}
              </span>
            </Row>
          );
        })}

        {answered.map((r) => (
          <Row key={r.request_id}>
            <div style={{ minWidth: 0, flex: '1 1 260px' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Updated Certificate{r.certificate_holder ? ` for ${r.certificate_holder}` : ''}</div>
              <Small>Sent in answer to your request</Small>
              {fileError === r.request_id && <Small style={{ color: C.red }}>The certificate could not be opened. Please try again.</Small>}
            </div>
            <Button disabled={opening === r.request_id} onClick={() => view('updated_certificate_file', 'request_id', r.request_id)}>
              {opening === r.request_id ? 'Opening...' : 'View Certificate'}
            </Button>
          </Row>
        ))}

        <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px', marginTop: 18 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: C.navy }}>What Insurance Do You Require?</h2>
          {done ? (
            <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.6 }}>
              {done === 'sent'
                ? `Thank you. ${d.company_name} has your requirements and will send updated certificates here. We'll email you when they're ready.`
                : `Thank you. ${d.company_name} has noted that its current certificates are enough.`}
              <div style={{ marginTop: 10 }}>
                <Button onClick={() => { setDone(null); setCoverages({}); setEndorsements({}); setFile(null); }}>
                  Send Another Request
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Small style={{ marginBottom: 12 }}>
                Tell us what your company, landlord or property manager requires. We'll send updated certificates here and email you when they're ready.
              </Small>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                <div>
                  <div style={fieldLabel}>Certificate Holder (Name and Address)</div>
                  <input style={inputStyle} placeholder="Name" value={holderName} onChange={(e) => setHolderName(e.target.value)} aria-label="Certificate holder name" />
                  <textarea style={{ ...inputStyle, marginTop: 6, minHeight: 58, resize: 'vertical' }}
                    placeholder="Street, city, state, ZIP" value={holderAddress}
                    onChange={(e) => setHolderAddress(e.target.value)} aria-label="Certificate holder address" />
                </div>
                <div>
                  <div style={fieldLabel}>Who Is Asking</div>
                  <select style={inputStyle} value={who} onChange={(e) => setWho(e.target.value)} aria-label="Who is asking">
                    {d.who_is_asking_options.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
                  </select>
                  {who === 'other' && (
                    <input style={{ ...inputStyle, marginTop: 6 }} placeholder="Who is asking" value={whoOther}
                      onChange={(e) => setWhoOther(e.target.value)} aria-label="Who is asking, other" />
                  )}
                </div>
              </div>

              <div style={{ ...fieldLabel, margin: '16px 0 2px' }}>Coverage Required</div>
              {d.coverage_options.map((o) => (
                <OptionLine key={o.code} option={o} value={coverages[o.code]}
                  onChange={(v) => setCoverages((s) => ({ ...s, [o.code]: v }))} />
              ))}

              <div style={{ ...fieldLabel, margin: '16px 0 2px' }}>Endorsements Required</div>
              {d.endorsement_options.map((o) => (
                <OptionLine key={o.code} option={o} value={endorsements[o.code]}
                  onChange={(v) => setEndorsements((s) => ({ ...s, [o.code]: v }))} />
              ))}

              <div style={{ ...fieldLabel, margin: '16px 0 4px' }}>Upload Your Requirements (Optional)</div>
              <label style={{ ...inputStyle, display: 'block', color: C.muted, cursor: 'pointer' }}>
                {file ? file.name : 'Add your insurance requirements or contract page (PDF or photo)'}
                <input type="file" accept={ACCEPT_FILES} style={{ display: 'none' }}
                  onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>

              {formError && <p style={{ color: C.red, fontSize: 13, margin: '12px 0 0' }}>{formError}</p>}

              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button kind="dark" disabled={!!submitting} onClick={send}>
                  {submitting === 'send' ? 'Sending...' : 'Send Requirements'}
                </Button>
                <Button disabled={!!submitting} onClick={enough}>
                  {submitting === 'enough' ? 'Saving...' : 'Our Current Certificates Are Enough'}
                </Button>
              </div>
            </>
          )}
        </div>

        <Small style={{ marginTop: 14 }}>
          Certificates open in the browser; each view is logged for the company. An expired policy is never shown as Current.
        </Small>
        <div style={{ marginTop: 12 }}>
          <Link to={`/proof/${token}`} style={{ color: C.blue, fontWeight: 700, fontSize: 13 }}>View Our Certifications</Link>
        </div>
      </div>
    </Page>
  );
}
