import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BUCKETS, uploadFile, getSignedUrl, deleteFile } from '../../lib/storage';

// ── Types ──

export interface EvidenceThreadSummary {
  threadId: string;
  messageCount: number;
  unreadCount: number;
  attachmentCount: number;
}

export interface EvidenceMessage {
  id: string;
  thread_id: string;
  sender_user_id: string;
  sender_name: string;
  sender_role: string;
  body: string;
  attachments: EvidenceAttachment[];
  created_at: string;
  read_by: Record<string, string>;
}

export interface EvidenceAttachment {
  storage_path: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  url?: string;
}

export interface EvidenceParticipant {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  role_at_join: string;
  added_at: string;
}

export interface EvidenceSignalData {
  id: string;
  pattern_text: string;
  thread_ids: string[];
  first_seen_at: string;
  last_seen_at: string;
}

// ── useEvidenceThreadSummaries (WorkTab-level batch) ──

export function useEvidenceThreadSummaries(orgId: string | undefined) {
  const [summaries, setSummaries] = useState<Record<string, EvidenceThreadSummary>>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function doFetch() {
      setLoading(true);
      const { data } = await supabase.rpc('get_evidence_thread_summaries', { p_org_id: orgId });
      if (cancelled) return;
      const map: Record<string, EvidenceThreadSummary> = {};
      if (data) {
        for (const row of data as any[]) {
          map[row.requirement_code] = {
            threadId: row.thread_id,
            messageCount: Number(row.message_count),
            unreadCount: Number(row.unread_count),
            attachmentCount: Number(row.attachment_count),
          };
        }
      }
      setSummaries(map);
      setLoading(false);
    }
    doFetch();
    return () => { cancelled = true; };
  }, [orgId, refreshKey]);

  // Realtime: refresh when any thread in the org changes
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`evidence-summaries:${orgId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'onboarding_item_threads', filter: `organization_id=eq.${orgId}` },
        () => setRefreshKey(k => k + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);
  return { summaries, loading, refresh };
}

// ── useItemEvidenceTrail (individual expanded thread) ──

export function useItemEvidenceTrail(
  orgId: string | undefined,
  requirementCode: string,
  pillar: string,
  isExpanded: boolean,
) {
  const { profile } = useAuth();
  const userId = profile?.id;

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EvidenceMessage[]>([]);
  const [participants, setParticipants] = useState<EvidenceParticipant[]>([]);
  const [signals, setSignals] = useState<EvidenceSignalData[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // ── Load thread + messages + participants + signals ──
  useEffect(() => {
    if (!orgId || !isExpanded) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data: thread } = await supabase
        .from('onboarding_item_threads')
        .select('id')
        .eq('organization_id', orgId)
        .eq('requirement_code', requirementCode)
        .maybeSingle();

      if (cancelled) return;
      const tid = thread?.id ?? null;
      setThreadId(tid);

      if (!tid) {
        setMessages([]);
        setParticipants([]);
        setSignals([]);
        setLoading(false);
        return;
      }

      const [msgRes, partRes, sigRes] = await Promise.all([
        supabase
          .from('onboarding_item_thread_messages')
          .select('id, thread_id, sender_user_id, body, attachments, created_at, read_by')
          .eq('thread_id', tid)
          .order('created_at', { ascending: true }),
        supabase
          .from('onboarding_item_thread_participants')
          .select('id, user_id, role_at_join, added_at')
          .eq('thread_id', tid),
        supabase
          .from('evidence_signals')
          .select('id, pattern_text, thread_ids, first_seen_at, last_seen_at')
          .eq('organization_id', orgId)
          .contains('thread_ids', [tid]),
      ]);

      if (cancelled) return;

      // Resolve user profiles
      const senderIds = [...new Set((msgRes.data || []).map(m => m.sender_user_id))];
      const partUserIds = [...new Set((partRes.data || []).map(p => p.user_id))];
      const allUserIds = [...new Set([...senderIds, ...partUserIds])];

      const { data: profiles } = allUserIds.length > 0
        ? await supabase.from('user_profiles').select('id, full_name, role').in('id', allUserIds)
        : { data: [] as any[] };
      if (cancelled) return;

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      // Build messages with signed URLs
      const msgs: EvidenceMessage[] = [];
      for (const m of (msgRes.data || [])) {
        const p = profileMap.get(m.sender_user_id);
        const attachments: EvidenceAttachment[] = ((m.attachments || []) as EvidenceAttachment[]);
        for (const att of attachments) {
          if (att.storage_path && !att.url) {
            try {
              att.url = await getSignedUrl(
                BUCKETS.EVIDENCE_ATTACHMENTS as any, att.storage_path, 3600
              );
            } catch { /* skip */ }
          }
        }
        msgs.push({
          ...m,
          sender_name: p?.full_name || 'Unknown',
          sender_role: p?.role || '',
          attachments,
          read_by: (m.read_by || {}) as Record<string, string>,
        });
      }

      setMessages(msgs);
      setParticipants((partRes.data || []).map((pt: any) => {
        const p = profileMap.get(pt.user_id);
        return { ...pt, full_name: p?.full_name || 'Unknown', role: p?.role || '' };
      }));
      setSignals((sigRes.data || []) as EvidenceSignalData[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [orgId, requirementCode, isExpanded]);

  // ── Realtime: messages + participants + signals ──
  useEffect(() => {
    if (!threadId || !isExpanded) return;
    const channel = supabase
      .channel(`evidence-thread:${threadId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'onboarding_item_thread_messages', filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          const m = payload.new as any;
          if (messagesRef.current.some(msg => msg.id === m.id)) return;
          const { data: prof } = await supabase
            .from('user_profiles').select('full_name, role').eq('id', m.sender_user_id).maybeSingle();
          const attachments: EvidenceAttachment[] = (m.attachments || []);
          for (const att of attachments) {
            if (att.storage_path && !att.url) {
              try {
                att.url = await getSignedUrl(
                  BUCKETS.EVIDENCE_ATTACHMENTS as any, att.storage_path, 3600
                );
              } catch { /* skip */ }
            }
          }
          setMessages(prev => [...prev, {
            ...m,
            sender_name: prof?.full_name || 'Unknown',
            sender_role: prof?.role || '',
            attachments,
            read_by: m.read_by || {},
          }]);
        })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'onboarding_item_thread_participants', filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          const pt = payload.new as any;
          const { data: prof } = await supabase
            .from('user_profiles').select('full_name, role').eq('id', pt.user_id).maybeSingle();
          setParticipants(prev => {
            if (prev.some(p => p.user_id === pt.user_id)) return prev;
            return [...prev, { ...pt, full_name: prof?.full_name || 'Unknown', role: prof?.role || '' }];
          });
        })
      .subscribe();

    // Signal subscription — separate channel filtered to org
    let signalChannel: ReturnType<typeof supabase.channel> | null = null;
    if (orgId) {
      signalChannel = supabase
        .channel(`evidence-signals:${orgId}:${threadId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'evidence_signals', filter: `organization_id=eq.${orgId}` },
          async () => {
            const { data } = await supabase
              .from('evidence_signals')
              .select('id, pattern_text, thread_ids, first_seen_at, last_seen_at')
              .eq('organization_id', orgId!)
              .contains('thread_ids', [threadId]);
            if (data) setSignals(data as EvidenceSignalData[]);
          })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
      if (signalChannel) supabase.removeChannel(signalChannel);
    };
  }, [threadId, isExpanded, orgId]);

  // ── Mark read — ONLY when thread is expanded, with 1s delay ──
  useEffect(() => {
    if (!isExpanded || !userId || messages.length === 0) return;
    const unreadIds = messages
      .filter(m => !(m.read_by as Record<string, string>)[userId])
      .map(m => m.id);
    if (unreadIds.length === 0) return;

    const timer = setTimeout(() => {
      supabase.rpc('mark_evidence_messages_read', { p_message_ids: unreadIds });
      // Optimistic local update
      setMessages(prev => prev.map(m =>
        unreadIds.includes(m.id)
          ? { ...m, read_by: { ...m.read_by, [userId]: new Date().toISOString() } }
          : m
      ));
    }, 1000);

    return () => clearTimeout(timer);
  }, [isExpanded, userId, messages]);

  // ── Send message (with attachment cleanup on failure) ──
  const sendMessage = useCallback(async (body: string, files?: File[]) => {
    if (!orgId || !userId) return;

    const uploadedPaths: string[] = [];
    const attachmentsJson: EvidenceAttachment[] = [];

    // Upload files first
    if (files && files.length > 0) {
      const batchId = crypto.randomUUID();
      for (const file of files) {
        const path = `${orgId}/${threadId || 'new'}/${batchId}/${file.name}`;
        await uploadFile(BUCKETS.EVIDENCE_ATTACHMENTS as any, path, file, { contentType: file.type });
        uploadedPaths.push(path);
        attachmentsJson.push({
          storage_path: path,
          name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        });
      }
    }

    // Helper: delete uploaded files on failure
    const cleanupUploads = async () => {
      for (const path of uploadedPaths) {
        try { await deleteFile(BUCKETS.EVIDENCE_ATTACHMENTS as any, path); } catch { /* best effort */ }
      }
    };

    try {
      if (!threadId) {
        // First message — use RPC
        let assigneeId: string | null = null;
        const { data: orgData } = await supabase
          .from('organizations')
          .select('onboarding_team_invited')
          .eq('id', orgId)
          .maybeSingle();
        const invited = (orgData?.onboarding_team_invited as any[]) || [];
        const match = invited.find((i: any) => i.requirement_code === requirementCode);
        if (match?.assigned_to_user_id && match.assigned_to_user_id !== userId) {
          assigneeId = match.assigned_to_user_id;
        }

        const { data, error } = await supabase.rpc('create_evidence_thread', {
          p_organization_id: orgId,
          p_requirement_code: requirementCode,
          p_pillar: pillar,
          p_body: body,
          p_attachments: attachmentsJson,
          p_assignee_user_id: assigneeId,
        });

        if (error) { await cleanupUploads(); throw error; }

        if (data?.thread_id) {
          setThreadId(data.thread_id);
          // Reload full thread data
          const { data: msgs } = await supabase
            .from('onboarding_item_thread_messages')
            .select('id, thread_id, sender_user_id, body, attachments, created_at, read_by')
            .eq('thread_id', data.thread_id)
            .order('created_at', { ascending: true });
          const { data: prof } = await supabase
            .from('user_profiles').select('id, full_name, role').eq('id', userId).maybeSingle();
          setMessages((msgs || []).map((m: any) => ({
            ...m,
            sender_name: prof?.full_name || 'Unknown',
            sender_role: prof?.role || '',
            attachments: (m.attachments || []) as EvidenceAttachment[],
            read_by: (m.read_by || {}) as Record<string, string>,
          })));
        }
      } else {
        // Subsequent message — direct INSERT
        const { data: msg, error } = await supabase
          .from('onboarding_item_thread_messages')
          .insert({
            thread_id: threadId,
            sender_user_id: userId,
            body,
            attachments: attachmentsJson,
            read_by: { [userId]: new Date().toISOString() },
          })
          .select()
          .single();

        if (error) { await cleanupUploads(); throw error; }

        // Update thread.last_message_at
        await supabase.from('onboarding_item_threads')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', threadId);

        if (msg) {
          const { data: prof } = await supabase
            .from('user_profiles').select('full_name, role').eq('id', userId).maybeSingle();
          setMessages(prev => [...prev, {
            ...msg,
            sender_name: prof?.full_name || 'Unknown',
            sender_role: prof?.role || '',
            attachments: (msg.attachments || []) as EvidenceAttachment[],
            read_by: (msg.read_by || {}) as Record<string, string>,
          }]);
        }
      }
    } catch (err) {
      throw err;
    }
  }, [orgId, userId, threadId, requirementCode, pillar]);

  // ── Add participant ──
  const addParticipant = useCallback(async (targetUserId: string) => {
    if (!threadId || !userId) return;
    await supabase.from('onboarding_item_thread_participants').insert({
      thread_id: threadId,
      user_id: targetUserId,
      role_at_join: 'added',
      added_by: userId,
    });
  }, [threadId, userId]);

  const messageCount = messages.length;
  const unreadCount = userId ? messages.filter(m => !(m.read_by)[userId]).length : 0;
  const attachmentCount = messages.reduce((sum, m) => sum + (m.attachments?.length || 0), 0);

  return {
    threadId,
    messages,
    participants,
    signals,
    messageCount,
    unreadCount,
    attachmentCount,
    loading,
    sendMessage,
    addParticipant,
  };
}
