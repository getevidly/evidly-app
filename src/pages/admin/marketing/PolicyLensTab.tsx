/**
 * PolicyLensTab — agent send + accountability tracking for Policy Lens.
 *
 * Every figure is a real count from pl_send_events. Zeros render as
 * zeros; there is no seeded or placeholder data anywhere in this tab.
 *
 * NOTE: this tab never collects a client email address. Client invites
 * originate only from the agent's own request form, which lives in the
 * landing app — an agent submits their client there, and the trail below
 * records what followed.
 */
import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePolicyLensSend,
  type PlAgent,
  type PlSendEvent,
} from '../../../lib/marketing/usePolicyLensSend';
import { KpiMini } from './marketingPrimitives';
import { Modal } from '../../../components/ui/Modal';
import {
  EV_NAVY, EV_EMBER, EV_SLATE, EV_SUCCESS, EV_MUTED, EV_FAINT,
  EV_LINE, EV_PAPER, EV_WARN, DISPLAY, BODY,
} from './marketingTokens';

// Gold is retired from the marketing shell generally, but the mock uses
// it for the ref code and for open/click signals. Scoped to this tab.
const EV_GOLD = '#B08A2E';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// ── Formatting ───────────────────────────────────────────────────

function stamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/** first char + ••• + domain, e.g. a•••@getevidly.com */
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 1) return '•••';
  return `${email[0]}•••${email.slice(at)}`;
}

/** "<agency> · License <license> · <email>" with null parts and their separators dropped. */
function agentMeta(a: PlAgent): string {
  const parts: string[] = [];
  if (a.agency) parts.push(a.agency);
  if (a.license) parts.push(`License ${a.license}`);
  if (a.email) parts.push(a.email);
  return parts.join(' · ');
}

// ── Trail rendering ──────────────────────────────────────────────

const DOT_COLOR: Record<string, string> = {
  invite_sent: EV_MUTED,
  client_requested: EV_MUTED,
  invite_opened: EV_GOLD,
  invite_clicked: EV_GOLD,
  client_opened: EV_GOLD,
  client_clicked: EV_GOLD,
  read_started: EV_SUCCESS,
  report_delivered: EV_SUCCESS,
  purged: EV_EMBER,
};

/** Muted italic stand-in once retention has removed the client's identity. */
function IdentityRemoved() {
  return <em style={{ color: EV_FAINT, fontStyle: 'italic' }}>identity removed</em>;
}

function trailLabel(
  e: PlSendEvent,
  agent: PlAgent,
  senderNames: Record<string, string>,
): React.ReactNode {
  switch (e.kind) {
    case 'invite_sent': {
      const sender = e.sent_by ? senderNames[e.sent_by] : undefined;
      return sender ? `Invite sent — by ${sender}` : 'Invite sent';
    }
    case 'invite_opened':
      return 'Opened';
    case 'invite_clicked':
      return 'Clicked — See a sample read';
    case 'client_requested':
      return 'Client read requested — agent submitted client via their request form';
    case 'client_sent':
      return (
        <>
          Client invite sent to{' '}
          {e.recipient_email ? maskEmail(e.recipient_email) : <IdentityRemoved />}
        </>
      );
    case 'client_opened':
      return 'Client opened';
    case 'client_clicked':
      return 'Client clicked — Start my free read';
    case 'read_started':
      return `Read started — credited ${agent.ref_code}`;
    case 'report_delivered': {
      const authorized = e.meta?.agent_authorized;
      if (authorized === undefined || authorized === null) return 'Report delivered';
      return `Report delivered — agent authorized by policyholder: ${authorized ? 'yes' : 'no'}`;
    }
    case 'purged':
      return 'Documents purged — client identity removed from this trail';
    default:
      return e.kind;
  }
}

// ── Status chips ─────────────────────────────────────────────────

function Chip({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.08em',
      textTransform: 'uppercase', color, border: `1px solid ${color}`,
      borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap',
    }}>{text}</span>
  );
}

/**
 * Chips for one agent. A sent-but-unopened row is normal, not an error:
 * mail clients fetch the open pixel late, sometimes many minutes late.
 */
function agentChips(evts: PlSendEvent[]) {
  const has = (k: string) => evts.some(e => e.kind === k);
  const reads = evts.filter(e => e.kind === 'read_started').length;
  const chips: { text: string; color: string }[] = [];

  if (!has('invite_sent')) {
    chips.push({ text: 'Not yet sent', color: EV_EMBER });
  } else {
    chips.push({ text: 'Sent', color: EV_SLATE });
    if (has('invite_opened')) chips.push({ text: 'Opened', color: EV_WARN });
    if (has('invite_clicked')) chips.push({ text: 'Clicked sample', color: EV_GOLD });
  }
  if (reads > 0) {
    chips.push({ text: `${reads} client read${reads === 1 ? '' : 's'}`, color: EV_SUCCESS });
  }
  return chips;
}

// ── Agent row ────────────────────────────────────────────────────

function AgentRow({ agent, evts, senderNames, onSend, sending }: {
  agent: PlAgent;
  evts: PlSendEvent[];
  senderNames: Record<string, string>;
  onSend: (a: PlAgent, isResend: boolean) => void;
  sending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const alreadySent = evts.some(e => e.kind === 'invite_sent');
  const meta = agentMeta(agent);

  return (
    <div style={{ borderBottom: `1px solid ${EV_LINE}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Collapse trail' : 'Expand trail'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2, color: EV_MUTED }}
        >
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 600, color: EV_NAVY }}>
            {agent.name}
          </div>
          {meta && (
            <div style={{ fontFamily: BODY, fontSize: 12, color: EV_MUTED, marginTop: 2 }}>{meta}</div>
          )}
          <div style={{
            fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.06em',
            color: EV_GOLD, marginTop: 4, textTransform: 'uppercase',
          }}>
            Ref code · {agent.ref_code}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {agentChips(evts).map(c => <Chip key={c.text} text={c.text} color={c.color} />)}
          </div>
        </div>

        <button
          onClick={() => onSend(agent, alreadySent)}
          disabled={sending}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: BODY, fontSize: 12, fontWeight: 600,
            color: '#FFFFFF', background: sending ? EV_MUTED : EV_EMBER,
            border: 'none', borderRadius: 4, padding: '7px 12px',
            cursor: sending ? 'default' : 'pointer', whiteSpace: 'nowrap',
          }}
        >
          <Send size={12} /> {alreadySent ? 'Resend invite' : 'Send invite'}
        </button>
      </div>

      {open && (
        <div style={{ padding: '0 16px 16px 43px' }}>
          <div style={{
            fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: EV_FAINT, marginBottom: 10,
          }}>
            Accountability trail
          </div>
          {evts.length === 0 ? (
            <div style={{ fontFamily: BODY, fontSize: 12, color: EV_MUTED }}>
              No activity yet.
            </div>
          ) : (
            evts.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0' }}>
                <span style={{
                  fontFamily: MONO, fontSize: 10.5, color: EV_FAINT,
                  whiteSpace: 'nowrap', minWidth: 96,
                }}>{stamp(e.created_at)}</span>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                  background: DOT_COLOR[e.kind] ?? EV_MUTED,
                }} />
                <span style={{ fontFamily: BODY, fontSize: 12.5, color: EV_NAVY }}>
                  {trailLabel(e, agent, senderNames)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab ──────────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', agency: '', license: '', email: '', phone: '' };

export default function PolicyLensTab() {
  const { agents, eventsByAgent, senderNames, stats, loading, error, addAgent, sendInvite } =
    usePolicyLensSend();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    setSaving(true);
    try {
      await addAgent(form);
      toast.success(`${form.name.trim()} added.`);
      setForm(EMPTY_FORM);
      setShowAdd(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create agent');
    } finally {
      setSaving(false);
    }
  }

  async function handleSend(agent: PlAgent, isResend: boolean) {
    if (isResend && !window.confirm(`Resend the Policy Lens invite to ${agent.name} at ${agent.email}?`)) {
      return;
    }
    setSendingId(agent.id);
    try {
      await sendInvite(agent);
      toast.success(`Invite sent to ${agent.email}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invite failed');
    } finally {
      setSendingId(null);
    }
  }

  const tiles = [
    { l: 'Agents invited', v: stats.agentsInvited },
    { l: 'Opened', v: stats.opened },
    { l: 'Clicked sample', v: stats.clickedSample },
    { l: 'Client reads started', v: stats.clientReadsStarted },
    { l: 'Reports delivered', v: stats.reportsDelivered },
  ];

  return (
    <div style={{ fontFamily: BODY }}>
      {error && (
        <div style={{
          fontFamily: BODY, fontSize: 12.5, color: EV_EMBER,
          border: `1px solid ${EV_EMBER}`, borderRadius: 4,
          padding: '10px 12px', marginBottom: 16,
        }}>{error}</div>
      )}

      {/* Tiles */}
      <div style={{
        display: 'grid', gap: 12, marginBottom: 24,
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      }}>
        {tiles.map(t => <KpiMini key={t.l} l={t.l} v={loading ? '—' : t.v} />)}
      </div>

      {/* Agents */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: EV_FAINT,
        }}>
          Agents
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontFamily: BODY, fontSize: 12, fontWeight: 600, color: EV_EMBER,
            background: 'none', border: `1px solid ${EV_EMBER}`,
            borderRadius: 4, padding: '6px 10px', cursor: 'pointer',
          }}
        >
          <Plus size={13} /> Add agent
        </button>
      </div>

      <div style={{ border: `1px solid ${EV_LINE}`, borderRadius: 6, background: EV_PAPER }}>
        {loading ? (
          <div style={{ padding: 20, fontSize: 12.5, color: EV_MUTED }}>Loading…</div>
        ) : agents.length === 0 ? (
          <div style={{ padding: 20, fontSize: 12.5, color: EV_MUTED }}>
            No agents yet. Add one to start sending Policy Lens invites.
          </div>
        ) : (
          agents.map(a => (
            <AgentRow
              key={a.id}
              agent={a}
              evts={eventsByAgent.get(a.id) ?? []}
              senderNames={senderNames}
              onSend={handleSend}
              sending={sendingId === a.id}
            />
          ))
        )}
      </div>

      {/* Add-agent modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="md">
        <div className="p-6">
          <h2 className="text-[18px] font-bold text-navy mb-4 font-logo">Add Agent</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {([
              ['name', 'Name *', 'e.g. Dana Whitfield'],
              ['email', 'Email *', 'e.g. dana@agency.com'],
              ['agency', 'Agency', 'e.g. Whitfield Insurance'],
              ['license', 'License', 'e.g. 0K12345'],
              ['phone', 'Phone', 'e.g. (555) 201-8890'],
            ] as const).map(([key, label, placeholder]) => (
              <div key={key} className={key === 'name' || key === 'email' ? 'sm:col-span-1' : ''}>
                <label className="text-[11px] font-semibold text-slate_ui block mb-1">{label}</label>
                <input
                  value={form[key]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="py-[7px] px-[10px] text-[13px] border border-border_ui-warm rounded-md outline-none text-navy bg-white w-full"
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate_ui mb-4">
            A referral code is generated from the surname on save.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="text-[13px] px-3 py-2 rounded-md border border-border_ui-warm text-navy"
            >Cancel</button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="text-[13px] px-4 py-2 rounded-md text-white disabled:opacity-50"
              style={{ background: EV_EMBER }}
            >{saving ? 'Saving…' : 'Add agent'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
