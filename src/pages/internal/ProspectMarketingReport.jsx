import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Trash2, Loader2, ExternalLink, Shield, ChevronDown, ChevronUp, Eye, CheckCircle, Download, Search, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ProspectMarketingReport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // PMR state
  const [prospectName, setProspectName] = useState('');
  const [prospectCounty, setProspectCounty] = useState('');
  const [facts, setFacts] = useState([{ date: '', result: '', type: '' }]);
  const [counties, setCounties] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  // Partner Risk state
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [generatingRisk, setGeneratingRisk] = useState(false);
  const [riskResult, setRiskResult] = useState(null);

  // Policy Lens state
  const [plIntakes, setPlIntakes] = useState([]);
  const [plInvites, setPlInvites] = useState([]);
  const [plLoading, setPlLoading] = useState(true);
  const [expandedIntake, setExpandedIntake] = useState(null);
  const [intakeEvents, setIntakeEvents] = useState({});
  const [markingSent, setMarkingSent] = useState(null);

  // Agent License Verification state
  const [verifications, setVerifications] = useState({});
  const [savingVerify, setSavingVerify] = useState(false);
  const [reviewingVerify, setReviewingVerify] = useState(null);
  const [verifyForm, setVerifyForm] = useState({
    licensee_name: '', license_status: '', license_types: [''],
    license_issue_date: '', license_expiration_date: '',
    npn: '', regulatory_actions: '', reason: '',
  });

  useEffect(() => {
    (async () => {
      const [{ data: jurisdictions }, { data: organizations }] = await Promise.all([
        supabase.from('jurisdictions').select('county, state').order('state, county'),
        supabase.from('organizations').select('id, name').order('name'),
      ]);
      if (jurisdictions) {
        const unique = [...new Set(jurisdictions.map(j => `${j.county}, ${j.state}`))].filter(Boolean);
        setCounties(unique);
      }
      if (organizations) {
        setOrgs(organizations);
      }

      // Policy Lens data
      const [{ data: intakes }, { data: invites }] = await Promise.all([
        supabase
          .from('policy_lens_intakes')
          .select('id, created_at, contact_name, business_name, source, status, phone_verified_at, agent_email_verified_at, policy_pdf_path, organization_id, agent_name, agency_name, agent_email, agent_license_number, agent_license_status, agent_npn, agent_license_source, agent_license_verified_at, policy_lens_authorizations(status)')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('policy_lens_invites')
          .select('id, intake_id, referral_code, recipient_name, recipient_email, channel, sent_at')
          .order('sent_at', { ascending: false })
          .limit(100),
      ]);
      setPlIntakes(intakes || []);
      setPlInvites(invites || []);
      setPlLoading(false);
    })();
  }, []);

  const loadEvents = useCallback(async (intakeId) => {
    if (intakeEvents[intakeId]) return;
    const { data } = await supabase
      .from('policy_lens_events')
      .select('id, event_type, created_at, metadata')
      .eq('intake_id', intakeId)
      .order('created_at', { ascending: false });
    setIntakeEvents(prev => ({ ...prev, [intakeId]: data || [] }));
  }, [intakeEvents]);

  const loadVerifications = useCallback(async (intakeId) => {
    const { data } = await supabase
      .from('pl_agent_verifications')
      .select('*')
      .eq('intake_id', intakeId)
      .order('checked_at', { ascending: false });
    setVerifications(prev => ({ ...prev, [intakeId]: data || [] }));
  }, []);

  const handleToggleEvents = useCallback((intakeId) => {
    if (expandedIntake === intakeId) {
      setExpandedIntake(null);
    } else {
      setExpandedIntake(intakeId);
      loadEvents(intakeId);
      const intake = plIntakes.find(i => i.id === intakeId);
      if (intake?.source === 'agent') loadVerifications(intakeId);
    }
  }, [expandedIntake, loadEvents, loadVerifications, plIntakes]);

  // ── Agent License Verification helpers ──────────────────
  const namesMatch = (a, b) => {
    if (!a || !b) return false;
    const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
    return norm(a) === norm(b);
  };

  const computeVerification = useCallback((form, agentName) => {
    const nameMatch = namesMatch(form.licensee_name, agentName);
    const active = form.license_status === 'active';
    const types = form.license_types.filter(t => t.trim());
    const pcPatterns = [/property/i, /casualty/i, /p\s*&\s*c/i, /p\/c/i, /fire/i];
    const hasPcAuthority = types.some(t => pcPatterns.some(p => p.test(t)));
    const today = new Date().toISOString().split('T')[0];
    const notExpired = form.license_expiration_date ? form.license_expiration_date >= today : true;
    const hasRegulatoryActions = !!form.regulatory_actions?.trim();

    let overallResult;
    if (form.license_status === 'not_found') overallResult = 'not_found';
    else if (!active || !notExpired || !hasPcAuthority || !nameMatch) overallResult = 'failed';
    else if (hasRegulatoryActions) overallResult = 'verified_with_flags';
    else overallResult = 'verified';

    return {
      name_match: nameMatch, active, has_pc_authority: hasPcAuthority,
      not_expired: notExpired, has_regulatory_actions: hasRegulatoryActions,
      overall_result: overallResult,
    };
  }, []);

  const handleSaveVerification = useCallback(async (intake) => {
    if (!verifyForm.licensee_name.trim() && verifyForm.license_status !== 'not_found') {
      toast.error('Enter the licensee name from CDI (or select "not_found")');
      return;
    }
    if (!verifyForm.license_status) {
      toast.error('Select a license status');
      return;
    }
    setSavingVerify(true);
    try {
      const computed = computeVerification(verifyForm, intake.agent_name);
      const types = verifyForm.license_types.filter(t => t.trim());
      const now = new Date().toISOString();

      const { error: insertErr } = await supabase
        .from('pl_agent_verifications')
        .insert({
          intake_id: intake.id,
          source: 'manual_cdi',
          checked_at: now,
          query_license_number: intake.agent_license_number || null,
          query_state: 'CA',
          licensee_name: verifyForm.licensee_name.trim() || null,
          license_status: verifyForm.license_status,
          license_types: types,
          has_pc_authority: computed.has_pc_authority,
          license_issue_date: verifyForm.license_issue_date || null,
          license_expiration_date: verifyForm.license_expiration_date || null,
          expired: !computed.not_expired,
          npn: verifyForm.npn.trim() || null,
          name_match: computed.name_match,
          active: computed.active,
          not_expired: computed.not_expired,
          has_regulatory_actions: computed.has_regulatory_actions,
          regulatory_actions: verifyForm.regulatory_actions.trim()
            ? [{ note: verifyForm.regulatory_actions.trim() }] : [],
          overall_result: computed.overall_result,
          review_required: true,
          fcra_permissible_purpose: verifyForm.reason.trim() || null,
          raw_response: { ...verifyForm, license_types: types },
        });
      if (insertErr) throw new Error(insertErr.message);

      const intakeUpdate = {
        agent_license_status: computed.overall_result,
        agent_license_source: 'manual_cdi',
      };
      if (verifyForm.npn.trim()) intakeUpdate.agent_npn = verifyForm.npn.trim();
      await supabase.from('policy_lens_intakes').update(intakeUpdate).eq('id', intake.id);

      await supabase.from('policy_lens_events').insert({
        event_type: 'agent_license_verified',
        intake_id: intake.id,
        metadata: { source: 'manual_cdi', overall_result: computed.overall_result, verified_by: user?.email },
      });

      setPlIntakes(prev => prev.map(i => i.id === intake.id
        ? { ...i, agent_license_status: computed.overall_result, agent_license_source: 'manual_cdi', agent_npn: verifyForm.npn.trim() || i.agent_npn }
        : i
      ));
      setVerifyForm({
        licensee_name: '', license_status: '', license_types: [''],
        license_issue_date: '', license_expiration_date: '',
        npn: '', regulatory_actions: '', reason: '',
      });
      await loadVerifications(intake.id);
      setIntakeEvents(prev => { const n = { ...prev }; delete n[intake.id]; return n; });
      loadEvents(intake.id);
      toast.success(`Verification recorded: ${computed.overall_result.replace(/_/g, ' ')}`);
    } catch (err) {
      toast.error(err.message || 'Failed to save verification');
    } finally {
      setSavingVerify(false);
    }
  }, [verifyForm, computeVerification, user?.email, loadVerifications, loadEvents]);

  const handleReviewVerification = useCallback(async (verification, disposition) => {
    setReviewingVerify(verification.id);
    try {
      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('pl_agent_verifications')
        .update({ reviewed_at: now, reviewer: user?.email, review_required: false })
        .eq('id', verification.id);
      if (updateErr) throw new Error(updateErr.message);

      if (disposition === 'confirmed' && (verification.overall_result === 'verified' || verification.overall_result === 'verified_with_flags')) {
        await supabase
          .from('policy_lens_intakes')
          .update({ agent_license_verified_at: now })
          .eq('id', verification.intake_id);
        setPlIntakes(prev => prev.map(i => i.id === verification.intake_id
          ? { ...i, agent_license_verified_at: now }
          : i
        ));
      }

      if (disposition === 'rejected') {
        await supabase
          .from('policy_lens_intakes')
          .update({ agent_license_status: 'review_rejected' })
          .eq('id', verification.intake_id);
        setPlIntakes(prev => prev.map(i => i.id === verification.intake_id
          ? { ...i, agent_license_status: 'review_rejected' }
          : i
        ));
      }

      await supabase.from('policy_lens_events').insert({
        event_type: disposition === 'confirmed' ? 'agent_license_confirmed' : 'agent_license_rejected',
        intake_id: verification.intake_id,
        metadata: { verification_id: verification.id, reviewer: user?.email, disposition },
      });

      await loadVerifications(verification.intake_id);
      toast.success(disposition === 'confirmed' ? 'Verification confirmed' : 'Verification flagged/rejected');
    } catch (err) {
      toast.error(err.message || 'Failed to review');
    } finally {
      setReviewingVerify(null);
    }
  }, [user?.email, loadVerifications]);

  const handleOpenPdf = useCallback(async (intakeId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/pl-admin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'signed_url', intake_id: intakeId }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      window.open(json.signed_url, '_blank');
    } catch (err) {
      toast.error(err.message || 'Failed to open PDF');
    }
  }, []);

  const handleMarkSent = useCallback(async (intakeId) => {
    setMarkingSent(intakeId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/pl-admin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'mark_report_sent', intake_id: intakeId }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setPlIntakes(prev => prev.map(i => i.id === intakeId ? { ...i, status: 'report_sent' } : i));
      toast.success('Marked as report sent');
    } catch (err) {
      toast.error(err.message || 'Failed to mark sent');
    } finally {
      setMarkingSent(null);
    }
  }, []);

  const addFact = useCallback(() => {
    setFacts(prev => [...prev, { date: '', result: '', type: '' }]);
  }, []);

  const removeFact = useCallback((idx) => {
    setFacts(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateFact = useCallback((idx, field, value) => {
    setFacts(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prospectName.trim()) {
      toast.error('Prospect business name is required');
      return;
    }
    if (!user?.id) return;
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const nonEmptyFacts = facts.filter(f => f.date || f.result);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            report_type: 'internal_prospect_marketing',
            prospect_name: prospectName.trim(),
            prospect_county: prospectCounty || undefined,
            prospect_facts: nonEmptyFacts.length > 0 ? nonEmptyFacts : undefined,
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');

      if (json.report?.share_token) {
        setResult({ share_token: json.report.share_token, title: json.report.title });
        toast.success('PMR generated');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate PMR');
    } finally {
      setGenerating(false);
    }
  }, [prospectName, prospectCounty, facts, user?.id]);

  const handleGenerateRisk = useCallback(async () => {
    if (!selectedOrg) {
      toast.error('Select an organization');
      return;
    }
    if (!user?.id) return;
    setGeneratingRisk(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            report_type: 'partner_risk',
            org_id: selectedOrg,
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');

      if (json.report?.share_token) {
        setRiskResult({ share_token: json.report.share_token, title: json.report.title });
        toast.success('Partner risk report generated');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate partner risk report');
    } finally {
      setGeneratingRisk(false);
    }
  }, [selectedOrg, user?.id]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[#1E2D4D] rounded-xl px-6 py-5">
        <h1 className="text-white text-xl font-bold">Internal Reports</h1>
        <p className="text-white/70 text-sm mt-1">
          Admin-only report generation tools.
        </p>
      </div>

      {/* ── PMR Section ── */}
      <div className="bg-white rounded-lg border border-[#E5E0D8] p-6 space-y-5">
        <h2 className="text-[#1E2D4D] font-bold text-sm uppercase tracking-wide">
          Prospect Marketing Report
        </h2>

        {/* Prospect Name */}
        <div>
          <label className="block text-[#1E2D4D] text-sm font-semibold mb-1">
            Prospect Business Name
          </label>
          <input
            type="text"
            value={prospectName}
            onChange={e => setProspectName(e.target.value)}
            placeholder="e.g. Mario's Trattoria"
            className="w-full border border-[#E5E0D8] rounded-md px-3 py-2 text-sm text-[#1E2D4D] placeholder:text-[#1E2D4D]/30 focus:outline-none focus:ring-2 focus:ring-[#1E2D4D]/20"
          />
        </div>

        {/* County */}
        <div>
          <label className="block text-[#1E2D4D] text-sm font-semibold mb-1">
            County <span className="font-normal text-[#1E2D4D]/50">(optional)</span>
          </label>
          <select
            value={prospectCounty}
            onChange={e => setProspectCounty(e.target.value)}
            className="w-full border border-[#E5E0D8] rounded-md px-3 py-2 text-sm text-[#1E2D4D] focus:outline-none focus:ring-2 focus:ring-[#1E2D4D]/20"
          >
            <option value="">Select county...</option>
            {counties.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Inspection Facts */}
        <div>
          <label className="block text-[#1E2D4D] text-sm font-semibold mb-2">
            Known Inspection History <span className="font-normal text-[#1E2D4D]/50">(optional)</span>
          </label>
          <div className="space-y-2">
            {facts.map((fact, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="date"
                  value={fact.date}
                  onChange={e => updateFact(idx, 'date', e.target.value)}
                  className="border border-[#E5E0D8] rounded-md px-2 py-1.5 text-xs text-[#1E2D4D] focus:outline-none focus:ring-2 focus:ring-[#1E2D4D]/20"
                />
                <input
                  type="text"
                  value={fact.result}
                  onChange={e => updateFact(idx, 'result', e.target.value)}
                  placeholder="Result (e.g. Pass, 92/100)"
                  className="flex-1 border border-[#E5E0D8] rounded-md px-2 py-1.5 text-xs text-[#1E2D4D] placeholder:text-[#1E2D4D]/30 focus:outline-none focus:ring-2 focus:ring-[#1E2D4D]/20"
                />
                <input
                  type="text"
                  value={fact.type}
                  onChange={e => updateFact(idx, 'type', e.target.value)}
                  placeholder="Type (optional)"
                  className="w-28 border border-[#E5E0D8] rounded-md px-2 py-1.5 text-xs text-[#1E2D4D] placeholder:text-[#1E2D4D]/30 focus:outline-none focus:ring-2 focus:ring-[#1E2D4D]/20"
                />
                {facts.length > 1 && (
                  <button
                    onClick={() => removeFact(idx)}
                    className="text-[#1E2D4D]/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addFact}
            className="flex items-center gap-1 mt-2 text-xs text-[#1E2D4D]/60 hover:text-[#1E2D4D] transition-colors"
          >
            <Plus size={12} /> Add row
          </button>
        </div>

        {/* Generate PMR */}
        <button
          onClick={handleGenerate}
          disabled={generating || !prospectName.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-[#1E2D4D] text-white hover:bg-[#162340] transition-colors disabled:opacity-50"
        >
          {generating ? (
            <><Loader2 size={14} className="animate-spin" /> Generating...</>
          ) : (
            <><FileText size={14} /> Generate PMR</>
          )}
        </button>

        {/* PMR Result */}
        {result && (
          <div className="border-t border-[#E5E0D8] pt-4 mt-4">
            <h3 className="text-[#1E2D4D] font-semibold text-sm mb-2">Report Ready</h3>
            <p className="text-[#1E2D4D]/60 text-xs mb-3">{result.title}</p>
            <button
              onClick={() => navigate(`/reports/view/${result.share_token}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-[#E5E0D8] text-[#1E2D4D] hover:bg-[#FAF7F0] transition-colors"
            >
              <ExternalLink size={12} /> View Report
            </button>
          </div>
        )}
      </div>

      {/* ── Partner Risk Section ── */}
      <div className="bg-white rounded-lg border border-[#E5E0D8] p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[#1E2D4D]" />
          <h2 className="text-[#1E2D4D] font-bold text-sm uppercase tracking-wide">
            Five-Pillar Risk Intelligence
          </h2>
          <span className="text-[9px] font-medium text-[#1E2D4D]/40 uppercase tracking-wide bg-[#1E2D4D]/5 px-2 py-0.5 rounded">
            Partner / Carrier
          </span>
        </div>
        <p className="text-[#1E2D4D]/50 text-xs">
          Generate a carrier-facing risk intelligence report for an enrolled organization.
        </p>

        {/* Org selector */}
        <div>
          <label className="block text-[#1E2D4D] text-sm font-semibold mb-1">
            Organization
          </label>
          <select
            value={selectedOrg}
            onChange={e => setSelectedOrg(e.target.value)}
            className="w-full border border-[#E5E0D8] rounded-md px-3 py-2 text-sm text-[#1E2D4D] focus:outline-none focus:ring-2 focus:ring-[#1E2D4D]/20"
          >
            <option value="">Select organization...</option>
            {orgs.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* Generate Risk */}
        <button
          onClick={handleGenerateRisk}
          disabled={generatingRisk || !selectedOrg}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-[#1E2D4D] text-white hover:bg-[#162340] transition-colors disabled:opacity-50"
        >
          {generatingRisk ? (
            <><Loader2 size={14} className="animate-spin" /> Generating...</>
          ) : (
            <><Shield size={14} /> Generate Partner Risk Report</>
          )}
        </button>

        {/* Risk Result */}
        {riskResult && (
          <div className="border-t border-[#E5E0D8] pt-4 mt-4">
            <h3 className="text-[#1E2D4D] font-semibold text-sm mb-2">Report Ready</h3>
            <p className="text-[#1E2D4D]/60 text-xs mb-3">{riskResult.title}</p>
            <button
              onClick={() => navigate(`/reports/view/${riskResult.share_token}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-[#E5E0D8] text-[#1E2D4D] hover:bg-[#FAF7F0] transition-colors"
            >
              <ExternalLink size={12} /> View Report
            </button>
          </div>
        )}
      </div>

      {/* ── Policy Lens Section ── */}
      <div className="bg-white rounded-lg border border-[#E5E0D8] p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-[#1E2D4D]" />
          <h2 className="text-[#1E2D4D] font-bold text-sm uppercase tracking-wide">
            Policy Lens
          </h2>
          <span className="text-[9px] font-medium text-[#1E2D4D]/40 uppercase tracking-wide bg-[#1E2D4D]/5 px-2 py-0.5 rounded">
            Intakes
          </span>
        </div>

        {plLoading ? (
          <div className="flex items-center gap-2 text-xs text-[#1E2D4D]/50">
            <Loader2 size={12} className="animate-spin" /> Loading...
          </div>
        ) : plIntakes.length === 0 ? (
          <p className="text-[#1E2D4D]/40 text-xs">No intakes yet.</p>
        ) : (
          <div className="space-y-2">
            {plIntakes.map(intake => {
              const authRows = intake.policy_lens_authorizations || [];
              const authStatus = authRows.length > 0 ? authRows[0].status : 'none';
              const verified = intake.source === 'prospect'
                ? !!intake.phone_verified_at
                : !!intake.agent_email_verified_at;
              const hasPdf = !!intake.policy_pdf_path;
              const isExpanded = expandedIntake === intake.id;

              return (
                <div key={intake.id} className="border border-[#E5E0D8] rounded-md overflow-hidden">
                  <div className="px-3 py-2 flex items-center gap-3 text-xs">
                    <span className="text-[#1E2D4D]/40 w-[70px] flex-shrink-0">
                      {new Date(intake.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[#1E2D4D] font-medium truncate flex-1">
                      {intake.contact_name || intake.business_name || '—'}
                    </span>
                    <span className="text-[#1E2D4D]/60 truncate max-w-[120px]">
                      {intake.business_name || '—'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      intake.source === 'prospect' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {intake.source}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      intake.status === 'report_sent' ? 'bg-green-50 text-green-700'
                        : intake.status === 'review' ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-50 text-gray-600'
                    }`}>
                      {intake.status}
                    </span>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                      verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`} title={`Phone/email verified: ${verified ? 'Yes' : 'No'}`}>
                      {verified ? '✓' : '✗'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      authStatus === 'signed' || authStatus === 'attested'
                        ? 'bg-green-50 text-green-700'
                        : authStatus === 'requested' ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-50 text-gray-500'
                    }`}>
                      {authStatus}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {hasPdf && (
                        <button
                          onClick={() => handleOpenPdf(intake.id)}
                          className="p-1 rounded hover:bg-[#FAF7F0] text-[#1E2D4D]/60 hover:text-[#1E2D4D]"
                          title="Open PDF (1hr signed URL)"
                        >
                          <Download size={12} />
                        </button>
                      )}
                      {intake.status !== 'report_sent' && hasPdf && (
                        <button
                          onClick={() => handleMarkSent(intake.id)}
                          disabled={markingSent === intake.id}
                          className="p-1 rounded hover:bg-[#FAF7F0] text-[#1E2D4D]/60 hover:text-green-700 disabled:opacity-50"
                          title="Mark report sent"
                        >
                          {markingSent === intake.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleEvents(intake.id)}
                        className="p-1 rounded hover:bg-[#FAF7F0] text-[#1E2D4D]/60 hover:text-[#1E2D4D]"
                        title="View events"
                      >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-[#E5E0D8]">
                      {/* Events */}
                      <div className="bg-[#FAF7F0] px-3 py-2">
                        <div className="text-[10px] font-medium text-[#1E2D4D]/50 uppercase mb-1">Events</div>
                        {!intakeEvents[intake.id] ? (
                          <div className="text-xs text-[#1E2D4D]/40">Loading...</div>
                        ) : intakeEvents[intake.id].length === 0 ? (
                          <div className="text-xs text-[#1E2D4D]/40">No events.</div>
                        ) : (
                          <div className="space-y-0.5">
                            {intakeEvents[intake.id].map(evt => (
                              <div key={evt.id} className="flex items-center gap-2 text-xs">
                                <span className="text-[#1E2D4D]/40 w-[110px] flex-shrink-0">
                                  {new Date(evt.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </span>
                                <span className="text-[#1E2D4D]/70 font-mono">{evt.event_type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Agent License Verification Panel */}
                      {intake.source === 'agent' && (
                        <div className="bg-white px-3 py-3 space-y-3 border-t border-[#E5E0D8]">
                          <div className="flex items-center gap-2">
                            <Search size={12} className="text-[#1E2D4D]/60" />
                            <span className="text-[10px] font-medium text-[#1E2D4D]/50 uppercase">Agent License Verification</span>
                            {intake.agent_license_verified_at && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700">Confirmed</span>
                            )}
                          </div>

                          {/* 1. Agent on file */}
                          <div className="bg-[#FAF7F0] rounded-md p-2.5 text-xs space-y-1.5">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              <div><span className="text-[#1E2D4D]/40">Agent:</span> <span className="text-[#1E2D4D] font-medium">{intake.agent_name || '—'}</span></div>
                              <div><span className="text-[#1E2D4D]/40">Agency:</span> <span className="text-[#1E2D4D]">{intake.agency_name || '—'}</span></div>
                              <div><span className="text-[#1E2D4D]/40">Email:</span> <span className="text-[#1E2D4D]">{intake.agent_email || '—'}</span></div>
                              <div><span className="text-[#1E2D4D]/40">License #:</span> <span className="text-[#1E2D4D] font-mono">{intake.agent_license_number || '—'}</span></div>
                            </div>
                            <a
                              href="https://cdicloud.insurance.ca.gov/cal/LicenseNumberSearch"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                            >
                              <ExternalLink size={10} /> Look up on CA DOI
                            </a>
                          </div>

                          {/* 3. Latest result */}
                          {verifications[intake.id]?.length > 0 && (() => {
                            const latest = verifications[intake.id][0];
                            const RESULT_STYLES = {
                              verified: 'bg-green-50 text-green-700',
                              verified_with_flags: 'bg-amber-50 text-amber-700',
                              failed: 'bg-red-50 text-red-700',
                              not_found: 'bg-gray-100 text-gray-600',
                              provider_error: 'bg-red-50 text-red-700',
                              review_rejected: 'bg-red-50 text-red-700',
                            };
                            const CHECK_LABELS = [
                              { key: 'name_match', label: 'Name match' },
                              { key: 'active', label: 'Active' },
                              { key: 'has_pc_authority', label: 'P&C authority' },
                              { key: 'not_expired', label: 'Not expired' },
                              { key: 'has_regulatory_actions', label: 'Reg. actions', invert: true },
                            ];
                            return (
                              <div className="border border-[#E5E0D8] rounded-md p-2.5 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-medium text-[#1E2D4D]/50 uppercase">Latest result</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${RESULT_STYLES[latest.overall_result] || 'bg-gray-100 text-gray-600'}`}>
                                    {latest.overall_result?.replace(/_/g, ' ')}
                                  </span>
                                  {latest.reviewed_at ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-50 text-green-700">Reviewed by {latest.reviewer}</span>
                                  ) : latest.review_required ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700">Awaiting review</span>
                                  ) : null}
                                </div>
                                <div className="flex gap-1.5 flex-wrap">
                                  {CHECK_LABELS.map(({ key, label, invert }) => {
                                    const val = latest[key];
                                    const pass = invert ? !val : val;
                                    return (
                                      <span key={key} className={`px-1.5 py-0.5 rounded text-[10px] ${
                                        key === 'has_regulatory_actions' && val
                                          ? 'bg-amber-50 text-amber-700'
                                          : pass ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                                      }`}>
                                        {pass ? '✓' : key === 'has_regulatory_actions' && val ? '⚠' : '✗'} {label}
                                      </span>
                                    );
                                  })}
                                </div>
                                <div className="text-xs text-[#1E2D4D]/60 space-y-0.5">
                                  {latest.licensee_name && (
                                    <div>Licensee: <strong>{latest.licensee_name}</strong> {latest.name_match ? <span className="text-green-600">(matches)</span> : <span className="text-red-500">(mismatch)</span>}</div>
                                  )}
                                  {latest.license_types?.length > 0 && <div>LOA: {latest.license_types.join(', ')}</div>}
                                  {(latest.license_issue_date || latest.license_expiration_date) && (
                                    <div>{latest.license_issue_date || '?'} → {latest.license_expiration_date || '?'}</div>
                                  )}
                                  {latest.npn && <div>NPN: {latest.npn}</div>}
                                  {latest.has_regulatory_actions && latest.regulatory_actions?.length > 0 && (
                                    <div className="text-amber-700">Regulatory actions: {typeof latest.regulatory_actions[0] === 'object' ? latest.regulatory_actions.map(a => a.note || JSON.stringify(a)).join('; ') : JSON.stringify(latest.regulatory_actions)}</div>
                                  )}
                                  {latest.fcra_permissible_purpose && <div className="text-[#1E2D4D]/40">Reason: {latest.fcra_permissible_purpose}</div>}
                                  <div className="text-[#1E2D4D]/30">
                                    Checked: {new Date(latest.checked_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · Source: {latest.source}
                                  </div>
                                </div>

                                {/* 4. Review bar */}
                                {latest.review_required && !latest.reviewed_at && (
                                  <div className="flex items-center gap-2 pt-1.5 border-t border-[#E5E0D8]">
                                    <button
                                      onClick={() => handleReviewVerification(latest, 'confirmed')}
                                      disabled={reviewingVerify === latest.id}
                                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                    >
                                      {reviewingVerify === latest.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />} Confirm verification
                                    </button>
                                    <button
                                      onClick={() => handleReviewVerification(latest, 'rejected')}
                                      disabled={reviewingVerify === latest.id}
                                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                    >
                                      <X size={10} /> Flag / reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* 2. Record CDI result form */}
                          <details className="group">
                            <summary className="text-[10px] font-medium text-[#1E2D4D]/50 uppercase cursor-pointer hover:text-[#1E2D4D]/70 select-none list-none flex items-center gap-1">
                              <ChevronDown size={10} className="group-open:rotate-180 transition-transform" /> Record CDI result
                            </summary>
                            <div className="mt-2 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] text-[#1E2D4D]/50 mb-0.5">Licensee name (as on CDI)</label>
                                  <input type="text" value={verifyForm.licensee_name} onChange={e => setVerifyForm(f => ({ ...f, licensee_name: e.target.value }))}
                                    className="w-full border border-[#E5E0D8] rounded px-2 py-1 text-xs text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/20" />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-[#1E2D4D]/50 mb-0.5">License status</label>
                                  <select value={verifyForm.license_status} onChange={e => setVerifyForm(f => ({ ...f, license_status: e.target.value }))}
                                    className="w-full border border-[#E5E0D8] rounded px-2 py-1 text-xs text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/20">
                                    <option value="">Select...</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="expired">Expired</option>
                                    <option value="revoked">Revoked</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="not_found">Not found</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#1E2D4D]/50 mb-0.5">License types / LOA lines</label>
                                {verifyForm.license_types.map((lt, idx) => (
                                  <div key={idx} className="flex items-center gap-1 mb-1">
                                    <input type="text" value={lt}
                                      onChange={e => setVerifyForm(f => {
                                        const types = [...f.license_types];
                                        types[idx] = e.target.value;
                                        return { ...f, license_types: types };
                                      })}
                                      placeholder='e.g. "Fire & Casualty Broker-Agent"'
                                      className="flex-1 border border-[#E5E0D8] rounded px-2 py-1 text-xs text-[#1E2D4D] placeholder:text-[#1E2D4D]/20 focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/20" />
                                    {verifyForm.license_types.length > 1 && (
                                      <button onClick={() => setVerifyForm(f => ({ ...f, license_types: f.license_types.filter((_, i) => i !== idx) }))}
                                        className="text-[#1E2D4D]/30 hover:text-red-500"><Trash2 size={10} /></button>
                                    )}
                                  </div>
                                ))}
                                <button onClick={() => setVerifyForm(f => ({ ...f, license_types: [...f.license_types, ''] }))}
                                  className="flex items-center gap-0.5 text-[10px] text-[#1E2D4D]/50 hover:text-[#1E2D4D]">
                                  <Plus size={10} /> Add line
                                </button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[10px] text-[#1E2D4D]/50 mb-0.5">Issue date</label>
                                  <input type="date" value={verifyForm.license_issue_date} onChange={e => setVerifyForm(f => ({ ...f, license_issue_date: e.target.value }))}
                                    className="w-full border border-[#E5E0D8] rounded px-2 py-1 text-xs text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/20" />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-[#1E2D4D]/50 mb-0.5">Expiration date</label>
                                  <input type="date" value={verifyForm.license_expiration_date} onChange={e => setVerifyForm(f => ({ ...f, license_expiration_date: e.target.value }))}
                                    className="w-full border border-[#E5E0D8] rounded px-2 py-1 text-xs text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/20" />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-[#1E2D4D]/50 mb-0.5">NPN <span className="text-[#1E2D4D]/30">(opt)</span></label>
                                  <input type="text" value={verifyForm.npn} onChange={e => setVerifyForm(f => ({ ...f, npn: e.target.value }))}
                                    className="w-full border border-[#E5E0D8] rounded px-2 py-1 text-xs text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/20" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#1E2D4D]/50 mb-0.5">Regulatory actions <span className="text-[#1E2D4D]/30">(opt)</span></label>
                                <textarea value={verifyForm.regulatory_actions} onChange={e => setVerifyForm(f => ({ ...f, regulatory_actions: e.target.value }))}
                                  rows={2} className="w-full border border-[#E5E0D8] rounded px-2 py-1 text-xs text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/20" />
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#1E2D4D]/50 mb-0.5">Reason for check <span className="text-[#1E2D4D]/30">(opt)</span></label>
                                <input type="text" value={verifyForm.reason} onChange={e => setVerifyForm(f => ({ ...f, reason: e.target.value }))}
                                  className="w-full border border-[#E5E0D8] rounded px-2 py-1 text-xs text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/20" />
                              </div>
                              <button
                                onClick={() => handleSaveVerification(intake)}
                                disabled={savingVerify || !verifyForm.license_status}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#1E2D4D] text-white hover:bg-[#162340] disabled:opacity-50"
                              >
                                {savingVerify ? <><Loader2 size={12} className="animate-spin" /> Saving...</> : 'Save CDI result'}
                              </button>
                            </div>
                          </details>

                          {/* 5. History */}
                          {verifications[intake.id]?.length > 1 && (
                            <details className="group">
                              <summary className="text-[10px] font-medium text-[#1E2D4D]/50 uppercase cursor-pointer hover:text-[#1E2D4D]/70 select-none list-none flex items-center gap-1">
                                <Clock size={10} className="inline" /> History ({verifications[intake.id].length})
                              </summary>
                              <div className="mt-1 space-y-0.5">
                                {verifications[intake.id].map((v, idx) => (
                                  <div key={v.id} className="flex items-center gap-2 text-xs text-[#1E2D4D]/60">
                                    <span className="text-[#1E2D4D]/40 w-[110px] flex-shrink-0">
                                      {new Date(v.checked_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                    <span className="font-mono text-[10px]">{v.source}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      v.overall_result === 'verified' ? 'bg-green-50 text-green-700'
                                        : v.overall_result === 'verified_with_flags' ? 'bg-amber-50 text-amber-700'
                                        : v.overall_result === 'failed' ? 'bg-red-50 text-red-600'
                                        : 'bg-gray-50 text-gray-600'
                                    }`}>{v.overall_result?.replace(/_/g, ' ')}</span>
                                    {v.reviewed_at ? (
                                      <span className="text-green-600 text-[10px]">Reviewed: {v.reviewer}</span>
                                    ) : v.review_required ? (
                                      <span className="text-amber-600 text-[10px]">Pending review</span>
                                    ) : null}
                                    {idx === 0 && <span className="text-[10px] text-[#1E2D4D]/30">(latest)</span>}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Invites */}
        {plInvites.length > 0 && (
          <div className="pt-4 border-t border-[#E5E0D8]">
            <div className="text-[10px] font-medium text-[#1E2D4D]/50 uppercase mb-2">Invites ({plInvites.length})</div>
            <div className="space-y-1">
              {plInvites.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 text-xs text-[#1E2D4D]/60">
                  <span className="w-[70px] flex-shrink-0 text-[#1E2D4D]/40">
                    {new Date(inv.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="truncate flex-1">{inv.recipient_name}</span>
                  <span className="truncate max-w-[180px]">{inv.recipient_email}</span>
                  <span className="px-1.5 py-0.5 rounded bg-gray-50 text-[10px] text-gray-600">{inv.channel}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
