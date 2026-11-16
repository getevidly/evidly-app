/**
 * ProofCertifications — /proof/:token (mock screen 2)
 *
 * Public, no login. One link per estimate, made by the HoodOps API
 * (hoodops-estimate-proof, proof_link.create). Shows every certification the
 * company has on file in EvidLY with its number, holder, expiry and status. An
 * expired certification never shows as Current. Each page load and each
 * certificate opened is logged for the company by proof-access.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Bar, Button, C, callProof, LINK_NOT_FOUND, Loading, MessageCard, openFile, Page, Row, Small, StatusPill,
} from './proofUi';

export default function ProofCertifications() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  const [opening, setOpening] = useState(null);
  const [fileError, setFileError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await callProof('proof-access', { action: 'certifications', token });
      if (cancelled) return;
      if (error) setState({ status: 'error' });
      else if (data?.status !== 'ok') setState({ status: 'not_found' });
      else setState({ status: 'ok', data });
    })();
    return () => { cancelled = true; };
  }, [token]);

  const view = useCallback(async (id) => {
    setOpening(id);
    setFileError(null);
    const { data, error } = await callProof('proof-access', { action: 'certification_file', token, item_id: id });
    setOpening(null);
    if (error || !data?.url) {
      setFileError(id);
      return;
    }
    openFile(data.url);
  }, [token]);

  if (state.status === 'loading') return <Loading label="Loading Certifications..." />;
  if (state.status === 'error') {
    return <MessageCard title="Something Went Wrong" message="We could not load these certifications. Please try again in a moment." />;
  }
  if (state.status === 'not_found') return <MessageCard {...LINK_NOT_FOUND} />;

  const { company_name: companyName, location_name: locationName, certifications, approved } = state.data;

  return (
    <Page title={`${companyName} · Certifications`}>
      <Bar companyName={companyName} subtitle="Certifications · verified in EvidLY" right={`Shared with ${locationName}`} />
      <div style={{ padding: '18px 24px 22px' }}>
        {certifications.length === 0 && (
          <p style={{ color: C.ink2, fontSize: 14 }}>{companyName} has no certifications on file in EvidLY yet.</p>
        )}
        {certifications.map((c) => {
          const detail = [c.number ? `#${c.number}` : null, c.holder, c.expires ? `Expires ${c.expires}` : null]
            .filter(Boolean).join(' · ');
          return (
            <Row key={c.id}>
              <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                {detail && <Small>{detail}</Small>}
                {fileError === c.id && <Small style={{ color: C.red }}>The certificate could not be opened. Please try again.</Small>}
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <StatusPill status={c.status} />
                {c.has_file && c.status === 'current' && (
                  <Button disabled={opening === c.id} onClick={() => view(c.id)}>
                    {opening === c.id ? 'Opening...' : 'View Certificate'}
                  </Button>
                )}
              </span>
            </Row>
          );
        })}
        <Small style={{ marginTop: 12 }}>
          A certification that has expired never shows as Current. Certificates open in the browser; each view is logged for the company.
        </Small>
        {approved && (
          <div style={{ marginTop: 16 }}>
            <Link to={`/proof/${token}/insurance`} style={{ color: C.blue, fontWeight: 700, fontSize: 14 }}>
              View Our Insurance and Tell Us What You Require
            </Link>
          </div>
        )}
      </div>
    </Page>
  );
}
