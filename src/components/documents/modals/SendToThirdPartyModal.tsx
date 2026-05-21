import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Upload } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { SmartUploadModal, type ClassifiedFile } from '../../SmartUploadModal';
import { uploadFile, BUCKETS } from '../../../lib/storage';

interface SendToThirdPartyModalProps {
  onClose: () => void;
}

interface Recipient {
  v: string;
  l: string;
  purposes: string[];
}

const RECIPIENTS: Recipient[] = [
  { v: 'government',        l: 'Environmental Health Dept.',            purposes: ['Annual renewal', 'Inspection follow-up', 'Variance request'] },
  { v: 'fire_authority',    l: 'Authority Having Jurisdiction (Fire)',  purposes: ['Annual fire inspection', 'Plan check', 'Permit renewal'] },
  { v: 'insurance_broker',  l: 'Insurance Broker',                     purposes: ['Annual renewal', 'Claim documentation', 'Underwriting review'] },
  { v: 'insurance_carrier', l: 'Insurance Carrier',                    purposes: ['Claim submission', 'Coverage verification'] },
  { v: 'auditor',           l: 'Auditor / Regulator',                  purposes: ['Compliance audit', 'Investigation'] },
  { v: 'legal',             l: 'Client / Legal',                       purposes: ['Discovery', 'Contract compliance'] },
];

const CUSTOM_PURPOSES = ['Compliance documentation', 'Contract requirement', 'Insurance claim', 'Legal discovery', 'Other'];

interface OrgDoc {
  id: string;
  name: string;
  type: string | null;
  status: string;
}

interface RecentRecipient {
  id: string;
  recipient_type: string;
  name: string;
  organization_label: string | null;
  email: string;
}

interface PriorSend {
  purpose: string;
  sent_at: string;
  cover_message: string | null;
}

const STEP_LABELS = ['Recipient', 'Purpose', 'Documents', 'Send'];

export function SendToThirdPartyModal({ onClose }: SendToThirdPartyModalProps) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [step, setStep] = useState(1);
  const [recipientType, setRecipientType] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientOrg, setRecipientOrg] = useState('');
  const [purpose, setPurpose] = useState('');
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [coverMsg, setCoverMsg] = useState('');
  const [orgDocs, setOrgDocs] = useState<OrgDoc[]>([]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ portalUrl: string; emailSent: boolean; note?: string } | null>(null);

  // AI memory state
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipient[]>([]);
  const [priorSend, setPriorSend] = useState<PriorSend | null>(null);
  const [priorDocIds, setPriorDocIds] = useState<string[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customOrg, setCustomOrg] = useState('');
  const [customLabel, setCustomLabel] = useState('');

  // Upload affordance
  const [showInlineUpload, setShowInlineUpload] = useState(false);

  const currentRecipient = RECIPIENTS.find((r) => r.v === recipientType);

  // Fetch recent recipients (AI memory)
  useEffect(() => {
    if (!orgId) return;
    supabase
      .from('recipient_profiles')
      .select('id, recipient_type, name, organization_label, email')
      .eq('organization_id', orgId)
      .order('last_used_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data && data.length > 0) setRecentRecipients(data as RecentRecipient[]);
      });
  }, [orgId]);

  // Fetch current docs for step 3
  useEffect(() => {
    if (!orgId) return;
    supabase
      .from('v_documents_enriched')
      .select('id, name, type, status')
      .eq('organization_id', orgId)
      .eq('status', 'current')
      .order('name')
      .then(({ data }) => { if (data) setOrgDocs(data as OrgDoc[]); });
  }, [orgId]);

  // Fetch prior send when recipient is selected (for Step 2 hint)
  useEffect(() => {
    if (!orgId || !recipientName) return;
    supabase
      .from('compliance_document_send_records')
      .select('purpose, sent_at, cover_message')
      .eq('organization_id', orgId)
      .eq('recipient_name', recipientName)
      .order('sent_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setPriorSend(data[0] as PriorSend);
        else setPriorSend(null);
      });
  }, [orgId, recipientName]);

  // Fetch prior send docs when purpose is selected (for Step 3 hint)
  useEffect(() => {
    if (!orgId || !recipientName || !purpose) { setPriorDocIds([]); return; }
    supabase
      .from('compliance_document_send_records')
      .select('id')
      .eq('organization_id', orgId)
      .eq('recipient_name', recipientName)
      .eq('purpose', purpose)
      .order('sent_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          supabase
            .from('compliance_document_send_items')
            .select('document_id')
            .eq('send_record_id', data[0].id)
            .then(({ data: items }) => {
              if (items) setPriorDocIds(items.map((i: { document_id: string }) => i.document_id));
            });
        } else {
          setPriorDocIds([]);
        }
      });
  }, [orgId, recipientName, purpose]);

  const togglePick = (id: string) => setPicked((p) => ({ ...p, [id]: !p[id] }));

  const usePriorSet = () => {
    const newPicked: Record<string, boolean> = {};
    for (const id of priorDocIds) newPicked[id] = true;
    setPicked(newPicked);
  };

  const selectRecentRecipient = (r: RecentRecipient) => {
    setRecipientType(r.recipient_type);
    setRecipientName(r.name);
    setRecipientEmail(r.email);
    setRecipientOrg(r.organization_label || '');
    setStep(2);
  };

  const submitCustomRecipient = async () => {
    if (!customName.trim() || !customEmail.trim() || !customLabel.trim()) return;
    setRecipientType('custom');
    setRecipientName(customName.trim());
    setRecipientEmail(customEmail.trim());
    setRecipientOrg(customOrg.trim());

    if (orgId) {
      await supabase.from('recipient_profiles').insert({
        organization_id: orgId,
        recipient_type: 'custom',
        name: customName.trim(),
        email: customEmail.trim(),
        organization_label: customOrg.trim() || null,
        default_purpose: customLabel.trim(),
      });
    }
    setStep(2);
  };

  const draftCover = () => {
    if (priorSend?.cover_message) {
      setCoverMsg(priorSend.cover_message);
      return;
    }
    const orgName = profile?.organization_name || 'our organization';
    setCoverMsg(
      `Hello,\n\nPlease find attached the requested compliance documentation for ${purpose ? purpose.toLowerCase() : 'your records'}. ` +
      `All documents are current as of ${new Date().toLocaleDateString()}. The secure link will expire in 14 days.\n\n` +
      `Reach out if anything additional is needed.\n\n${profile?.full_name || 'Team'}\n${orgName}`
    );
  };

  const handleInlineUploadSave = useCallback(async (files: ClassifiedFile[]) => {
    setShowInlineUpload(false);
    if (!orgId) return;

    const newIds: string[] = [];
    for (const cf of files) {
      try {
        const storagePath = `${orgId}/${Date.now()}-${cf.file.name}`;
        await uploadFile(BUCKETS.DOCUMENTS, storagePath, cf.file, {
          contentType: cf.file.type || undefined,
        });
        const { data } = await supabase.from('compliance_documents').insert({
          organization_id: orgId,
          category: 'kitchen',
          type: cf.overrides.documentType || null,
          name: cf.overrides.documentLabel || cf.file.name,
          status: 'current',
          storage_path: storagePath,
          expiry_date: cf.overrides.expiryDate || null,
          notes: cf.overrides.notes || null,
          mime_type: cf.file.type || null,
        }).select('id').single();
        if (data) newIds.push(data.id);
      } catch {
        toast.error(`Failed to upload ${cf.file.name}`);
      }
    }

    // Refresh docs list
    const { data } = await supabase
      .from('v_documents_enriched')
      .select('id, name, type, status')
      .eq('organization_id', orgId)
      .eq('status', 'current')
      .order('name');
    if (data) setOrgDocs(data as OrgDoc[]);

    // Auto-check newly uploaded
    setPicked((prev) => {
      const next = { ...prev };
      for (const id of newIds) next[id] = true;
      return next;
    });

    if (newIds.length > 0) toast.success(`${newIds.length} document${newIds.length > 1 ? 's' : ''} uploaded`);
  }, [orgId]);

  const handleSend = useCallback(async () => {
    if (!orgId) return;
    setSending(true);

    const docIds = Object.keys(picked).filter((k) => picked[k]);

    try {
      const secureToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Insert send record
      const { data: sendRec, error: sendErr } = await supabase
        .from('compliance_document_send_records')
        .insert({
          organization_id: orgId,
          sent_by: profile?.id || null,
          recipient_type: recipientType,
          recipient_name: recipientName,
          recipient_email: recipientEmail || null,
          recipient_org: recipientOrg || null,
          purpose,
          cover_message: coverMsg || null,
          cover_message_ai_original: null,
          secure_token: secureToken,
          secure_token_expires_at: expiresAt,
        })
        .select('id')
        .single();

      if (sendErr || !sendRec) {
        toast.error('Failed to create send record');
        setSending(false);
        return;
      }

      // 2. Insert send items
      if (docIds.length > 0) {
        await supabase.from('compliance_document_send_items').insert(
          docIds.map((docId) => ({
            send_record_id: sendRec.id,
            document_id: docId,
            recommendation_tier: 'manual',
          }))
        );
      }

      // 3. Update recipient_profiles use_count
      if (recipientName && orgId) {
        const { data: existing } = await supabase
          .from('recipient_profiles')
          .select('id, use_count')
          .eq('organization_id', orgId)
          .eq('name', recipientName)
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase.from('recipient_profiles')
            .update({ use_count: (existing[0].use_count || 0) + 1, last_used_at: new Date().toISOString() })
            .eq('id', existing[0].id);
        }
      }

      // 4. Invoke send-portal-link edge function (sends email + returns portal URL)
      const portalUrl = `${window.location.origin}/portal/${secureToken}`;
      let emailSent = false;
      let note: string | undefined;

      try {
        const { data: sendData } = await supabase.functions.invoke('send-portal-link', {
          body: { send_record_id: sendRec.id },
        });
        if (sendData?.portal_url) {
          // Edge function may return a canonical portal URL
        }
        emailSent = sendData?.email_sent === true;
        if (sendData?.note) note = sendData.note as string;
      } catch {
        // Email delivery failed — still show success with manual share
        note = 'Email delivery failed. Share the link manually.';
      }

      setSendResult({ portalUrl, emailSent, note });
      setStep(5);
    } catch {
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  }, [orgId, profile, recipientType, recipientName, recipientEmail, recipientOrg, purpose, coverMsg, picked]);

  const purposes = recipientType === 'custom' ? CUSTOM_PURPOSES : (currentRecipient?.purposes || []);

  const canNext =
    (step === 1 && !!recipientType) ||
    (step === 2 && !!purpose) ||
    step === 3 ||
    step === 4;

  return (
    <Modal isOpen onClose={onClose} size="lg">
      {/* Header */}
      <div className="px-5 py-4 rounded-t-xl" style={{ backgroundColor: '#1E2D4D', color: '#FFF' }}>
        <div className="text-[11px] font-semibold tracking-wider" style={{ color: '#C9B97A' }}>
          SEND TO THIRD PARTY
        </div>
        <div className="text-[17px] font-bold mt-1">
          {step <= 4
            ? `Step ${step} of 4 ${'\u2014'} ${STEP_LABELS[step - 1]}`
            : 'Sent!'}
        </div>
        <div className="flex gap-1 mt-2.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="flex-1 h-[3px] rounded-sm"
              style={{ backgroundColor: n <= step ? '#A08C5A' : 'rgba(255,255,255,0.2)' }}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {step === 1 && (
          <>
            {/* AI memory: recent recipients */}
            {recentRecipients.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2">
                  You{'\u2019'}ve sent to before
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentRecipients.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => selectRecentRecipient(r)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#1E2D4D] border border-[#E2DDD4] hover:border-[#A08C5A] hover:bg-[#FAF7F0]/50 transition-colors"
                    >
                      {r.name}{r.organization_label ? ` \u00B7 ${r.organization_label}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2.5">
              Who are you sending to?
            </div>
            <div className="grid gap-2">
              {RECIPIENTS.map((r) => (
                <button
                  key={r.v}
                  type="button"
                  onClick={() => { setRecipientType(r.v); setRecipientName(r.l); }}
                  className="text-left px-3.5 py-3 rounded-md text-[13px] font-semibold text-[#1E2D4D] cursor-pointer"
                  style={{
                    background: recipientType === r.v ? '#FAF7F0' : '#FFF',
                    border: `2px solid ${recipientType === r.v ? '#A08C5A' : '#E2DDD4'}`,
                  }}
                >
                  {r.l}
                </button>
              ))}
            </div>

            {/* Custom recipient */}
            <div className="mt-4 pt-4 border-t border-dashed border-[#E2DDD4]">
              <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2">
                Or send to someone else
              </div>
              {!showCustomForm ? (
                <button
                  type="button"
                  onClick={() => setShowCustomForm(true)}
                  className="w-full text-left px-3.5 py-3 rounded-md border-2 border-dashed border-[#E2DDD4] text-[13px] font-semibold text-[#1E2D4D] hover:border-[#A08C5A] transition-colors"
                >
                  <Plus size={14} className="inline mr-2" />
                  Custom recipient
                  <span className="block text-[11px] text-[#8A93A6] font-normal mt-0.5">
                    Anyone {'\u2014'} lawyer, landlord, franchisor, accountant, business partner
                  </span>
                </button>
              ) : (
                <div className="border border-[#E2DDD4] rounded-md p-3.5 space-y-2.5">
                  <input
                    type="text"
                    placeholder="Recipient name *"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2DDD4] rounded-md text-[13px] text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30"
                  />
                  <input
                    type="text"
                    placeholder="Organization (optional)"
                    value={customOrg}
                    onChange={(e) => setCustomOrg(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2DDD4] rounded-md text-[13px] text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30"
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2DDD4] rounded-md text-[13px] text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30"
                  />
                  <input
                    type="text"
                    placeholder="Relationship label * (e.g. Franchisor)"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2DDD4] rounded-md text-[13px] text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30"
                  />
                  <button
                    type="button"
                    onClick={submitCustomRecipient}
                    disabled={!customName.trim() || !customEmail.trim() || !customLabel.trim()}
                    className="px-4 py-2 bg-[#1E2D4D] text-[#FAF7F0] text-[12px] font-bold rounded-md hover:opacity-90 disabled:opacity-40"
                  >
                    Continue {'\u2192'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {/* AI memory hint */}
            {priorSend && (
              <div className="mb-3.5 p-3 rounded-md text-[12px]" style={{ backgroundColor: '#FAF7F0', border: '1px solid #E2DDD4' }}>
                Last time you sent to <strong>{recipientName}</strong> it was for{' '}
                <strong>{priorSend.purpose}</strong> in{' '}
                {new Date(priorSend.sent_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
              </div>
            )}

            <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2.5">
              Purpose of this send
            </div>
            <div className="grid gap-2">
              {purposes.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurpose(p)}
                  className="text-left px-3.5 py-2.5 rounded-md text-[13px] font-semibold text-[#1E2D4D] cursor-pointer"
                  style={{
                    background: purpose === p ? '#FAF7F0' : '#FFF',
                    border: `2px solid ${purpose === p ? '#A08C5A' : '#E2DDD4'}`,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-[#8A93A6]">
              Purpose drives which documents we recommend in the next step.
            </div>
          </>
        )}

        {step === 3 && (
          <>
            {/* AI memory: prior docs hint */}
            {priorDocIds.length > 0 && (
              <div className="mb-3.5 p-3 rounded-md text-[12px] flex items-center justify-between" style={{ backgroundColor: '#FAF7F0', border: '1px solid #E2DDD4' }}>
                <span>
                  Last <strong>{recipientName}</strong> {purpose.toLowerCase()} you sent {priorDocIds.length} doc{priorDocIds.length > 1 ? 's' : ''}. Same set this time?
                </span>
                <button
                  type="button"
                  onClick={usePriorSet}
                  className="ml-3 flex-shrink-0 px-3 py-1 text-[11px] font-bold rounded-md bg-[#1E2D4D] text-[#FAF7F0] hover:opacity-90"
                >
                  Use same set
                </button>
              </div>
            )}

            <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2.5">
              Select documents to include
            </div>
            <div className="grid gap-2 max-h-[260px] overflow-y-auto">
              {orgDocs.map((d) => (
                <label
                  key={d.id}
                  className="border border-[#E2DDD4] rounded-md p-3 cursor-pointer"
                  style={{
                    background: picked[d.id] ? '#FAF7F0' : '#FFF',
                    borderLeft: '4px solid #1E2D4D',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={!!picked[d.id]}
                      onChange={() => togglePick(d.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-[13px] font-bold text-[#1E2D4D]">{d.name}</div>
                      {d.type && (
                        <div className="text-[11px] text-[#8A93A6] mt-1">{d.type}</div>
                      )}
                    </div>
                  </div>
                </label>
              ))}
              {orgDocs.length === 0 && (
                <div className="text-[13px] text-[#8A93A6] text-center py-6">
                  No current documents found.
                </div>
              )}
            </div>

            {/* Upload affordance */}
            <button
              type="button"
              onClick={() => setShowInlineUpload(true)}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#E2DDD4] rounded-md text-[13px] font-semibold text-[#1E2D4D] hover:border-[#A08C5A] transition-colors"
            >
              <Upload size={14} />
              Upload a new document to include
            </button>
            <SmartUploadModal
              isOpen={showInlineUpload}
              onClose={() => setShowInlineUpload(false)}
              onSave={handleInlineUploadSave}
              batchMode
            />
          </>
        )}

        {step === 4 && (
          <>
            <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2.5">
              Cover message
            </div>
            <div className="mb-2.5">
              <button
                type="button"
                onClick={draftCover}
                className="px-3.5 py-2 rounded-md text-[12px] font-bold cursor-pointer"
                style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
              >
                {priorSend?.cover_message ? 'Use prior message' : '\u2728 AI draft cover message'}
              </button>
              {priorSend?.cover_message && (
                <span className="ml-2 text-[11px] text-[#8A93A6]">Drafted based on your past sends</span>
              )}
            </div>
            <textarea
              value={coverMsg}
              onChange={(e) => setCoverMsg(e.target.value)}
              placeholder="Write a note for the recipient\u2026"
              rows={6}
              className="w-full px-3 py-3 border border-[#E2DDD4] rounded-md text-[13px] text-[#1E2D4D] resize-y font-[inherit] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30"
            />
            <div
              className="mt-3.5 p-3 rounded-md text-[12px] text-[#1E2D4D]"
              style={{ backgroundColor: '#FAF7F0', border: '1px solid #E2DDD4' }}
            >
              <div className="font-bold text-[#1E2D4D] mb-1">How this works</div>
              Recipient gets an EvidLY-branded email with a secure link. Link is valid 14 days,
              tracked (open / download), revocable any time. Documents are NOT email attachments
              {'\u2014'} viewers see them in a portal-style page.
            </div>
          </>
        )}

        {step === 5 && sendResult && (
          <>
            <div className="text-center mb-5">
              <div
                className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-[22px]"
                style={{ backgroundColor: sendResult.emailSent ? '#DEF7EC' : '#FEF3C7', color: sendResult.emailSent ? '#059669' : '#D97706' }}
              >
                {sendResult.emailSent ? '\u2713' : '\u21AA'}
              </div>
              <h2 className="text-[17px] font-bold text-[#1E2D4D] mb-1">
                {sendResult.emailSent ? 'Link Sent' : 'Link Created'}
              </h2>
              <p className="text-[13px] text-[#8A93A6]">
                {sendResult.emailSent
                  ? `An email with the portal link was sent to ${recipientEmail}.`
                  : (sendResult.note || 'Share the link below with the recipient.')}
              </p>
            </div>

            <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2">
              Portal Link
            </div>
            <div
              className="flex items-center gap-2 p-3 rounded-md border border-[#E2DDD4]"
              style={{ backgroundColor: '#FAF7F0' }}
            >
              <code className="flex-1 text-[12px] text-[#1E2D4D] break-all select-all font-mono">
                {sendResult.portalUrl}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(sendResult.portalUrl);
                  toast.success('Link copied');
                }}
                className="flex-shrink-0 px-3 py-1.5 bg-[#1E2D4D] text-[#FAF7F0] text-[11px] font-bold rounded-md hover:opacity-90"
              >
                Copy
              </button>
            </div>

            <div className="mt-3 text-[11px] text-[#8A93A6]">
              This link expires in 14 days. You can revoke it any time from the send history.
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#E2DDD4] flex justify-between bg-[#FAFBFD] rounded-b-xl">
        {step === 5 ? (
          <>
            <div />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1E2D4D] text-[#FAF7F0] text-[12px] font-bold rounded-md hover:opacity-90"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50"
            >
              Cancel
            </button>
            <div className="flex gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              {step < 4 && (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={!canNext}
                  className="px-4 py-2 bg-[#1E2D4D] text-white text-[12px] font-bold rounded-md hover:opacity-90 disabled:opacity-40"
                >
                  Next {'\u2192'}
                </button>
              )}
              {step === 4 && (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="px-4 py-2 rounded-md text-[12px] font-bold hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
                >
                  {sending ? 'Sending\u2026' : 'Send Secure Link \u2192'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
