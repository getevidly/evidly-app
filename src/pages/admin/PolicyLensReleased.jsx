/**
 * PolicyLensReleased — Admin view of all sealed & released Policy Lens reports.
 * Route: /admin/policy-lens/released
 * READ-ONLY render. No mutations.
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, ExternalLink } from 'lucide-react';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { KpiTile } from '../../components/admin/KpiTile';
import { EmptyState } from '../../components/EmptyState';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const MUTE = '#6B7280';

export default function PolicyLensReleased() {
  usePageTitle('Admin | Released Reports');
  const navigate = useNavigate();
  const [seals, setSeals] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [runs, setRuns] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [sRes, iRes, rRes, gRes] = await Promise.all([
      supabase
        .from('pl_sealed_reports')
        .select('id, run_id, intake_id, content_hash, sealed_at, sealed_by')
        .order('sealed_at', { ascending: false }),
      supabase
        .from('policy_lens_intakes')
        .select('id, carrier, business_name, agent_name, agency_name, source, policy_type'),
      supabase
        .from('pl_extraction_runs')
        .select('id, intake_id, released_at, released_by, release_status'),
      supabase
        .from('pl_report_grants')
        .select('id, run_id, intake_id, recipient_party_id, expires_at, door'),
    ]);
    if (sRes.data) setSeals(sRes.data);
    if (iRes.data) setIntakes(iRes.data);
    if (rRes.data) setRuns(rRes.data);
    if (gRes.data) setGrants(gRes.data);
    setLoading(false);
  }

  const rows = useMemo(() => {
    const intakeMap = Object.fromEntries(intakes.map(i => [i.id, i]));
    const runMap = Object.fromEntries(runs.map(r => [r.id, r]));
    const grantMap = {};
    for (const g of grants) {
      if (!grantMap[g.run_id]) grantMap[g.run_id] = g;
    }
    return seals.map(s => {
      const intake = intakeMap[s.intake_id] || {};
      const run = runMap[s.run_id] || {};
      const grant = grantMap[s.run_id] || null;
      return { ...s, intake, run, grant };
    });
  }, [seals, intakes, runs, grants]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      (r.intake.carrier || '').toLowerCase().includes(q) ||
      (r.intake.business_name || '').toLowerCase().includes(q) ||
      (r.intake.agent_name || '').toLowerCase().includes(q) ||
      (r.intake.agency_name || '').toLowerCase().includes(q) ||
      (r.content_hash || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      total: rows.length,
      thisMonth: rows.filter(r => new Date(r.sealed_at) >= monthStart).length,
      withGrant: rows.filter(r => r.grant?.door === 'agent').length,
      insuredOnly: rows.filter(r => r.grant?.door === 'kitchen').length,
    };
  }, [rows]);

  function fmtDate(iso) {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtHash(h) {
    if (!h) return '\u2014';
    return h.slice(0, 8) + '\u2026' + h.slice(-6);
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 40px' }}>
      <AdminBreadcrumb crumbs={[
        { label: 'Policy Lens', path: '/admin/policy-lens' },
        { label: 'Released Reports' },
      ]} />

      <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 22, color: NAVY, margin: '8px 0 20px' }}>
        Released Reports
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KpiTile label="Total sealed" value={stats.total} valueColor="navy" />
        <KpiTile label="This month" value={stats.thisMonth} valueColor="green" />
        <KpiTile label="Broker path" value={stats.withGrant} valueColor="gold" />
        <KpiTile label="Insured-only" value={stats.insuredOnly} valueColor="navy" />
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: MUTE }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search carrier, business, agent, hash\u2026"
          style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none' }}
        />
      </div>

      {loading ? (
        <p style={{ color: MUTE, fontSize: 13, padding: 24 }}>Loading\u2026</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Shield size={32} />} title="No released reports" message="Reports will appear here after they are sealed and released." />
      ) : (
        <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 120px 160px 36px', gap: 0, background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: MUTE, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <span>Carrier / Business</span>
            <span>Agent / Agency</span>
            <span>Path</span>
            <span>Sealed</span>
            <span>Content hash</span>
            <span></span>
          </div>
          {filtered.map(r => (
            <div
              key={r.id}
              onClick={() => navigate(`/admin/policy-lens/${r.intake_id}`)}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 120px 160px 36px', gap: 0, padding: '12px 16px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', fontSize: 13, alignItems: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FAFAF8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div>
                <div style={{ fontWeight: 600, color: NAVY }}>{r.intake.carrier || 'No carrier'}</div>
                <div style={{ fontSize: 11, color: MUTE }}>{r.intake.business_name || '\u2014'}</div>
              </div>
              <div>
                <div style={{ color: NAVY }}>{r.intake.agent_name || '\u2014'}</div>
                <div style={{ fontSize: 11, color: MUTE }}>{r.intake.agency_name || ''}</div>
              </div>
              <div>
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '2px 8px', borderRadius: 3,
                  background: r.grant ? '#FBF3E0' : '#EEF1F6',
                  color: r.grant ? GOLD : NAVY,
                }}>
                  {r.grant?.door === 'agent' ? 'Broker' : r.grant ? 'Insured' : '\u2014'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: MUTE }}>{fmtDate(r.sealed_at)}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: MUTE }}>{fmtHash(r.content_hash)}</div>
              <div style={{ textAlign: 'right' }}>
                <ExternalLink size={14} style={{ color: MUTE }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
