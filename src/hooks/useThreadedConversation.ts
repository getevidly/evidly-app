/**
 * useThreadedConversation — Generalized hook for threaded messaging.
 * Fetches thread → messages → attachments (signed URLs).
 * Subscribes to Supabase Realtime for live INSERT events.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface ThreadMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'operator' | 'vendor' | 'system' | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  sender_identifier: string | null;
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  signedUrl: string | null;
}

interface UseThreadedConversationParams {
  entityType: string;
  entityId: string | null;
  organizationId: string | null;
  sendVia?: string;
}

interface UseThreadedConversationReturn {
  thread: { id: string } | null;
  messages: ThreadMessage[];
  attachmentsByMessage: Record<string, MessageAttachment[]>;
  loading: boolean;
  sending: boolean;
  error: string | null;
  sendMessage: (subject: string, body: string) => Promise<boolean>;
  refetch: () => void;
}

export function useThreadedConversation({
  entityType,
  entityId,
  organizationId,
  sendVia,
}: UseThreadedConversationParams): UseThreadedConversationReturn {
  const [thread, setThread] = useState<{ id: string } | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [attachmentsByMessage, setAttachmentsByMessage] = useState<Record<string, MessageAttachment[]>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadIdRef = useRef<string | null>(null);

  const fetchAttachmentsForMessages = useCallback(async (msgIds: string[]): Promise<Record<string, MessageAttachment[]>> => {
    if (msgIds.length === 0) return {};

    const { data: atts } = await supabase
      .from('message_attachments')
      .select('id, message_id, file_name, file_type, file_size, storage_path')
      .in('message_id', msgIds);

    if (!atts || atts.length === 0) return {};

    const grouped: Record<string, MessageAttachment[]> = {};
    for (const att of atts) {
      const { data: signed } = await supabase.storage
        .from('message-attachments')
        .createSignedUrl(att.storage_path as string, 300);

      const attachment: MessageAttachment = {
        id: att.id as string,
        file_name: att.file_name as string,
        file_type: (att.file_type as string) || null,
        file_size: (att.file_size as number) || null,
        storage_path: att.storage_path as string,
        signedUrl: signed?.signedUrl || null,
      };

      const messageId = att.message_id as string;
      if (!grouped[messageId]) grouped[messageId] = [];
      grouped[messageId].push(attachment);
    }
    return grouped;
  }, []);

  const fetchData = useCallback(async () => {
    if (!entityId || !organizationId) {
      setThread(null);
      setMessages([]);
      setAttachmentsByMessage({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: threadData } = await supabase
        .from('message_threads')
        .select('id')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (threadData) {
        setThread({ id: threadData.id as string });
        threadIdRef.current = threadData.id as string;

        const { data: msgs } = await supabase
          .from('messages')
          .select('id, direction, sender_type, subject, body_text, body_html, sender_identifier, created_at')
          .eq('thread_id', threadData.id)
          .order('created_at', { ascending: true });

        const messageList: ThreadMessage[] = (msgs || []).map((m) => ({
          id: m.id as string,
          direction: m.direction as 'inbound' | 'outbound',
          sender_type: (m.sender_type as 'operator' | 'vendor' | 'system') || null,
          subject: (m.subject as string) || null,
          body_text: (m.body_text as string) || null,
          body_html: (m.body_html as string) || null,
          sender_identifier: (m.sender_identifier as string) || null,
          created_at: m.created_at as string,
        }));
        setMessages(messageList);

        const grouped = await fetchAttachmentsForMessages(messageList.map(m => m.id));
        setAttachmentsByMessage(grouped);
      } else {
        setThread(null);
        threadIdRef.current = null;
        setMessages([]);
        setAttachmentsByMessage({});
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, organizationId, fetchAttachmentsForMessages]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription for new messages
  useEffect(() => {
    const threadId = threadIdRef.current;
    if (!threadId) return;

    const channel = supabase
      .channel(`thread-messages:${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`,
      }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const newMsg: ThreadMessage = {
          id: row.id as string,
          direction: row.direction as 'inbound' | 'outbound',
          sender_type: (row.sender_type as 'operator' | 'vendor' | 'system') || null,
          subject: (row.subject as string) || null,
          body_text: (row.body_text as string) || null,
          body_html: (row.body_html as string) || null,
          sender_identifier: (row.sender_identifier as string) || null,
          created_at: row.created_at as string,
        };

        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Fetch attachments for new message
        fetchAttachmentsForMessages([newMsg.id]).then((grouped) => {
          if (Object.keys(grouped).length > 0) {
            setAttachmentsByMessage(prev => ({ ...prev, ...grouped }));
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread?.id, fetchAttachmentsForMessages]);

  const sendMessage = useCallback(async (subject: string, body: string): Promise<boolean> => {
    if (!entityId || !organizationId) return false;
    setSending(true);
    setError(null);

    try {
      if (sendVia) {
        // Edge function path (existing behavior for vendor_network_contact etc.)
        const res = await supabase.functions.invoke(sendVia, {
          body: {
            vendorNetworkId: entityId,
            subject,
            body,
            organizationId,
          },
        });

        if (res.error) {
          setError(res.error.message || 'Failed to send message');
          return false;
        }
      } else {
        // Direct DB write path — inserts into messages table.
        let threadId = threadIdRef.current;

        // Auto-create thread when none exists (e.g. first message on a service_schedule)
        if (!threadId) {
          const { data: newThread, error: threadErr } = await supabase
            .from('message_threads')
            .insert({
              organization_id: organizationId,
              entity_type: entityType,
              entity_id: entityId,
            })
            .select('id')
            .single();

          if (threadErr) {
            // Handle race: another tab/user may have created it between fetch and insert
            const { data: existing } = await supabase
              .from('message_threads')
              .select('id')
              .eq('entity_type', entityType)
              .eq('entity_id', entityId!)
              .eq('organization_id', organizationId!)
              .maybeSingle();

            if (!existing) {
              setError(threadErr.message || 'Failed to create conversation thread');
              return false;
            }
            threadId = existing.id as string;
          } else {
            threadId = newThread.id as string;
          }

          threadIdRef.current = threadId;
          setThread({ id: threadId });
        }

        const { data: { user } } = await supabase.auth.getUser();

        const { error: insertErr } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            organization_id: organizationId,
            sender_type: 'operator',
            sender_identifier: user?.email || user?.id || 'unknown',
            direction: 'outbound',
            channel: 'in_app',
            subject: subject || null,
            body_text: body,
          });

        if (insertErr) {
          setError(insertErr.message || 'Failed to send message');
          return false;
        }
      }

      await fetchData();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setError(message);
      return false;
    } finally {
      setSending(false);
    }
  }, [entityId, organizationId, sendVia, fetchData]);

  return { thread, messages, attachmentsByMessage, loading, sending, error, sendMessage, refetch: fetchData };
}
