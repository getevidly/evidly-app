import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Modal } from '../../ui/Modal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface SendToThirdPartyModalProps {
  onClose: () => void;
}

interface Recipient {
  v: string;
  l: string;
  purposes: string[];
}

const RECIPIENTS: Recipient[] = [
  { v: 'ehd',               l: 'Environmental Health Dept.',            purposes: ['Annual renewal', 'Inspection follow-up', 'Variance request'] },
  { v: 'ahj',               l: 'Authority Having Jurisdiction (Fire)',  purposes: ['Annual fire inspection', 'Plan check', 'Permit renewal'] },
  { v: 'insurance_broker',  l: 'Insurance Broker',                     purposes: ['Annual renewal', 'Claim documentation', 'Underwriting review'] },
  { v: 'insurance_carrier', l: 'Insurance Carrier',                    purposes: ['Claim submission', 'Coverage verification'] },
  { v: 'auditor',           l: 'Auditor / Regulator',                  purposes: ['Compliance audit', 'Investigation'] },
  { v: 'client_legal',      l: 'Client / Legal',                       purposes: ['Discovery', 'Contract compliance'] },
];

interface OrgDoc {
  id: string;
  name: string;
  type: string | null;
  status: string;
}

const STEP_LABELS = ['Recipient', 'Purpose', 'Documents', 'Send'];

export function SendToThirdPartyModal({ onClose }: SendToThirdPartyModalProps) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [step, setStep] = useState(1);
  const [recipientType, setRecipientType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [coverMsg, setCoverMsg] = useState('');
  const [orgDocs, setOrgDocs] = useState<OrgDoc[]>([]);

  const currentRecipient = RECIPIENTS.find((r) => r.v === recipientType);

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

  const togglePick = (id: string) => setPicked((p) => ({ ...p, [id]: !p[id] }));

  const draftCover = () => {
    const orgName = profile?.organization_name || 'our organization';
    setCoverMsg(
      `Hello,\n\nPlease find attached the requested compliance documentation for ${purpose ? purpose.toLowerCase() : 'your records'}. ` +
      `All documents are current as of ${new Date().toLocaleDateString()}. The secure link will expire in 14 days.\n\n` +
      `Reach out if anything additional is needed.\n\n${profile?.full_name || 'Team'}\n${orgName}`
    );
  };

  const handleSend = () => {
    toast.success('Secure link sent');
    onClose();
  };

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
          Step {step} of 4 {'\u2014'} {STEP_LABELS[step - 1]}
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
            <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2.5">
              Who are you sending to?
            </div>
            <div className="grid gap-2">
              {RECIPIENTS.map((r) => (
                <button
                  key={r.v}
                  type="button"
                  onClick={() => setRecipientType(r.v)}
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
          </>
        )}

        {step === 2 && currentRecipient && (
          <>
            <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2.5">
              Purpose of this send
            </div>
            <div className="grid gap-2">
              {currentRecipient.purposes.map((p) => (
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
            <div className="text-[11px] text-[#8A93A6] font-bold uppercase tracking-wider mb-2.5">
              Select documents to include
            </div>
            <div className="grid gap-2 max-h-[300px] overflow-y-auto">
              {orgDocs.map((d) => (
                <div
                  key={d.id}
                  className="border border-[#E2DDD4] rounded-md p-3"
                  style={{
                    background: picked[d.id] ? '#FAF7F0' : '#FFF',
                    borderLeft: `4px solid #A08C5A`,
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
                </div>
              ))}
              {orgDocs.length === 0 && (
                <div className="text-[13px] text-[#8A93A6] text-center py-6">
                  No current documents found.
                </div>
              )}
            </div>
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
                style={{ backgroundColor: '#A08C5A', color: '#1E2D4D' }}
              >
                {'\u2728'} AI draft cover message
              </button>
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
              style={{ backgroundColor: '#FAF7F0', border: '1px solid #A08C5A' }}
            >
              <div className="font-bold text-[#1E2D4D] mb-1">How this works</div>
              Recipient gets an EvidLY-branded email with a secure link. Link is valid 14 days,
              tracked (open / download), revocable any time. Documents are NOT email attachments
              {'\u2014'} viewers see them in a portal-style page.
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#E2DDD4] flex justify-between bg-[#FAFBFD] rounded-b-xl">
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
              className="px-4 py-2 rounded-md text-[12px] font-bold hover:opacity-90"
              style={{ backgroundColor: '#A08C5A', color: '#1E2D4D' }}
            >
              Send Secure Link {'\u2192'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
