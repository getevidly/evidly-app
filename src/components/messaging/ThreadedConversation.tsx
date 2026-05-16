/**
 * ThreadedConversation — Shared reusable threaded message renderer.
 * Renders message history, attachment links (signed URLs), and optional composer.
 * Subscribes to realtime for live inbound updates.
 */

import { useState, useRef, useEffect } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { useThreadedConversation } from '../../hooks/useThreadedConversation';

interface ThreadedConversationProps {
  entityType: string;
  entityId: string | null;
  organizationId: string | null;
  vendorEmail?: string;
  vendorName?: string;
  sendVia?: string;
  readOnly?: boolean;
}

export function ThreadedConversation({
  entityType,
  entityId,
  organizationId,
  vendorEmail,
  vendorName,
  sendVia,
  readOnly = false,
}: ThreadedConversationProps) {
  const {
    messages,
    attachmentsByMessage,
    loading,
    sending,
    error,
    sendMessage,
  } = useThreadedConversation({ entityType, entityId, organizationId, sendVia });

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    const ok = await sendMessage(subject.trim(), body.trim());
    if (ok) {
      setSubject('');
      setBody('');
    }
  };

  if (!entityId || !organizationId) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <p
        className="uppercase tracking-wider"
        style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#5A6478' }}
      >
        {readOnly ? 'Conversation history' : 'Messages'}
      </p>

      {/* Composer */}
      {!readOnly && sendVia && (
        <div
          className="bg-white rounded-lg px-4 py-3"
          style={{ border: '1px solid #E2DDD4' }}
        >
          {vendorName && (
            <p className="mb-2" style={{ fontSize: '11px', color: '#5A6478' }}>
              To: {vendorName}{vendorEmail ? ` (${vendorEmail})` : ''}
            </p>
          )}
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-md px-3 py-1.5 mb-2 text-sm outline-none"
            style={{ border: '1px solid rgba(30,45,77,0.15)', color: '#1E2D4D' }}
          />
          <textarea
            placeholder="Message body..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-md px-3 py-1.5 text-sm outline-none resize-none"
            style={{ border: '1px solid rgba(30,45,77,0.15)', color: '#1E2D4D' }}
          />
          <div className="flex items-center justify-between mt-2">
            <p style={{ fontSize: '10px', color: '#5A6478' }}>
              Sends through EvidLY. Replies tracked here.
            </p>
            <button
              type="button"
              disabled={sending || !subject.trim() || !body.trim()}
              onClick={handleSend}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50"
              style={{ backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
            >
              <Send size={12} />
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
          {error && (
            <p className="mt-1" style={{ fontSize: '11px', color: '#B91C1C' }}>{error}</p>
          )}
        </div>
      )}

      {/* Message list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-[#1E2D4D] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div
          className="rounded-md px-3 py-3"
          style={{ backgroundColor: '#FCFBF8', border: '1px solid #E2DDD4' }}
        >
          <p style={{ fontSize: '11px', color: '#5A6478' }}>
            {readOnly ? 'No messages in this thread yet.' : 'No messages yet. Send the first message above.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-md px-3 py-2 ${msg.direction === 'outbound' ? 'ml-6' : 'mr-6'}`}
              style={{
                backgroundColor: msg.direction === 'outbound' ? '#1E2D4D' : '#F4F1EA',
                color: msg.direction === 'outbound' ? '#FAF7F0' : '#1E2D4D',
              }}
            >
              {msg.subject && (
                <p style={{ fontSize: '11px', fontWeight: 500, marginBottom: '2px' }}>
                  {msg.subject}
                </p>
              )}
              <p style={{ fontSize: '11px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                {msg.body_text || '(no text content)'}
              </p>

              {/* Attachments */}
              {attachmentsByMessage[msg.id] && attachmentsByMessage[msg.id].length > 0 && (
                <div className="mt-1.5 flex flex-col gap-1">
                  {attachmentsByMessage[msg.id].map((att) => (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => {
                        if (att.signedUrl) window.open(att.signedUrl, '_blank');
                      }}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-left"
                      style={{
                        fontSize: '10px',
                        backgroundColor: msg.direction === 'outbound' ? 'rgba(255,255,255,0.15)' : 'rgba(30,45,77,0.08)',
                        color: msg.direction === 'outbound' ? '#FAF7F0' : '#1E2D4D',
                      }}
                    >
                      <Paperclip size={10} />
                      {att.file_name}
                      {att.file_size ? ` (${Math.round(att.file_size / 1024)}KB)` : ''}
                    </button>
                  ))}
                </div>
              )}

              <p style={{ fontSize: '9px', opacity: 0.7, marginTop: '4px' }}>
                {new Date(msg.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
