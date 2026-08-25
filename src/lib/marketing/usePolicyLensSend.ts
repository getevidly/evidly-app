/**
 * usePolicyLensSend — Supabase reads/writes for the Policy Lens tab.
 *
 * Reads:  pl_agents + pl_send_events (+ user_profiles for sender names)
 * Writes: pl_agents insert; pl-invite invoke for the insurance_pro door.
 *
 * Runs as the authenticated role, so the staff RLS policies
 * (pl_agents_staff_rw / pl_send_events_staff_rw) are what gate every
 * read here — super_admin and sales only.
 *
 * The two tables are fetched separately and matched in JS rather than
 * embedded. Intake-sourced events carry agent_id NULL, and pairing them
 * client-side keeps them in the set no matter what — there is no join
 * for them to fall out of. Every number below is a real count.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';

// ── Types ────────────────────────────────────────────────────────

export interface PlAgent {
  id: string;
  name: string;
  agency: string | null;
  license: string | null;
  email: string;
  phone: string | null;
  ref_code: string;
  created_at: string | null;
}

export type PlEventKind =
  | 'invite_sent' | 'invite_opened' | 'invite_clicked'
  | 'client_requested' | 'client_sent' | 'client_opened' | 'client_clicked'
  | 'read_started' | 'report_delivered' | 'purged';

export interface PlSendEvent {
  id: string;
  agent_id: string | null;
  intake_id: string | null;
  kind: PlEventKind;
  recipient_name: string | null;
  recipient_email: string | null;
  sent_by: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface PlStats {
  agentsInvited: number;
  opened: number;
  clickedSample: number;
  clientReadsStarted: number;
  reportsDelivered: number;
}

export interface AddAgentInput {
  name: string;
  agency?: string;
  license?: string;
  email: string;
  phone?: string;
}

// ── ref_code ─────────────────────────────────────────────────────

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Uppercase surname + "-" + 3 random uppercase alphanumerics, e.g. WHITFIELD-4X2. */
export function buildRefCode(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const surname = (parts.length ? parts[parts.length - 1] : 'AGENT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const stem = surname || 'AGENT';
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `${stem}-${suffix}`;
}

// ── Hook ─────────────────────────────────────────────────────────

export function usePolicyLensSend() {
  const [agents, setAgents] = useState<PlAgent[]>([]);
  const [events, setEvents] = useState<PlSendEvent[]>([]);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [agentRes, eventRes] = await Promise.all([
        supabase
          .from('pl_agents')
          .select('id, name, agency, license, email, phone, ref_code, created_at')
          .order('created_at', { ascending: true }),
        supabase
          .from('pl_send_events')
          .select('id, agent_id, intake_id, kind, recipient_name, recipient_email, sent_by, meta, created_at')
          .order('created_at', { ascending: true })
          .limit(5000),
      ]);

      if (agentRes.error) throw new Error(agentRes.error.message);
      if (eventRes.error) throw new Error(eventRes.error.message);

      const agentRows = (agentRes.data ?? []) as PlAgent[];
      const eventRows = (eventRes.data ?? []) as PlSendEvent[];
      setAgents(agentRows);
      setEvents(eventRows);

      // Sender names for "Invite sent — by <sender>". Only ids that appear.
      const senderIds = Array.from(
        new Set(eventRows.map(e => e.sent_by).filter((v): v is string => !!v)),
      );
      if (senderIds.length) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', senderIds);
        const map: Record<string, string> = {};
        const rows = (profiles ?? []) as { id: string; full_name: string | null; email: string | null }[];
        for (const p of rows) {
          const label = p.full_name || p.email;
          if (label) map[p.id] = label;
        }
        setSenderNames(map);
      } else {
        setSenderNames({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Policy Lens data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived ────────────────────────────────────────────────────

  /** agent_id -> that agent's events, oldest first. */
  const eventsByAgent = useMemo(() => {
    const map = new Map<string, PlSendEvent[]>();
    for (const e of events) {
      if (!e.agent_id) continue;
      const list = map.get(e.agent_id);
      if (list) list.push(e);
      else map.set(e.agent_id, [e]);
    }
    return map;
  }, [events]);

  const stats: PlStats = useMemo(() => {
    const distinctAgents = (kind: PlEventKind) =>
      new Set(events.filter(e => e.kind === kind && e.agent_id).map(e => e.agent_id)).size;
    return {
      agentsInvited: distinctAgents('invite_sent'),
      opened: distinctAgents('invite_opened'),
      clickedSample: distinctAgents('invite_clicked'),
      clientReadsStarted: events.filter(e => e.kind === 'read_started').length,
      reportsDelivered: events.filter(e => e.kind === 'report_delivered').length,
    };
  }, [events]);

  // ── Mutations ──────────────────────────────────────────────────

  /** Insert an agent, retrying ref_code on a unique violation. */
  const addAgent = useCallback(async (input: AddAgentInput): Promise<void> => {
    const { data: userData } = await supabase.auth.getUser();
    const createdBy = userData?.user?.id ?? null;

    let lastErr = 'Could not create agent';
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error: insErr } = await supabase
        .from('pl_agents')
        .insert({
          name: input.name.trim(),
          agency: input.agency?.trim() || null,
          license: input.license?.trim() || null,
          email: input.email.trim(),
          phone: input.phone?.trim() || null,
          ref_code: buildRefCode(input.name),
          created_by: createdBy,
        });

      if (!insErr) {
        await load();
        return;
      }
      lastErr = insErr.message ?? lastErr;
      // 23505 = unique_violation on ref_code. Anything else will not fix itself.
      if (insErr.code !== '23505') break;
    }
    throw new Error(lastErr);
  }, [load]);

  /** Send (or resend) the insurance_pro invite for one agent. */
  const sendInvite = useCallback(async (agent: PlAgent): Promise<void> => {
    const { data, error: invErr } = await supabase.functions.invoke('pl-invite', {
      body: {
        door: 'insurance_pro',
        agent_id: agent.id,
        recipient_name: agent.name,
        recipient_email: agent.email,
      },
    });
    // Surface the function's own error text rather than a generic failure.
    const bodyError = (data as { error?: string } | null)?.error;
    if (invErr || bodyError) {
      throw new Error(bodyError || invErr?.message || 'Invite failed');
    }
    await load();
  }, [load]);

  return {
    agents, events, eventsByAgent, senderNames, stats,
    loading, error, refresh: load, addAgent, sendInvite,
  };
}
