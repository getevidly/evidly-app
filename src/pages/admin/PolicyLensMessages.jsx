import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const NAVY = '#1E2D4D';
const NAVY_TINT = 'rgba(30,45,77,0.05)';
const EVIDLY_BG = '#ECFDF5';
const EVIDLY_TEXT = '#065F46';
const INCOMING_BG = '#F9FAFB';

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function fmtDay(iso) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function PolicyLensMessages() {
  const [threads, setThreads] = useState([]);
  const [activeParty, setActiveParty] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    const { data: msgs, error: mErr } = await supabase
      .from('pl_broker_messages')
      .select('party_id, sender, body, created_at, read_at')
      .order('created_at', { ascending: false });

    if (mErr) {
      setError('Could not load threads.');
      setLoadingThreads(false);
      return;
    }

    const byParty = new Map();
    for (const m of msgs ?? []) {
      if (!byParty.has(m.party_id)) {
        byParty.set(m.party_id, { party_id: m.party_id, last: m, unread: 0 });
      }
      if (m.sender === 'broker' && m.read_at === null) {
        byParty.get(m.party_id).unread += 1;
      }
    }

    const partyIds = [...byParty.keys()];
    let names = {};
    if (partyIds.length) {
      const { data: parties } = await supabase
        .from('external_parties')
        .select('id, display_name')
        .in('id', partyIds);
      for (const p of parties ?? []) names[p.id] = p.display_name;
    }

    const list = [...byParty.values()].map((t) => ({
      ...t,
      display_name: names[t.party_id] || t.party_id,
    }));
    setThreads(list);
    setLoadingThreads(false);
  }, []);

  const loadMessages = useCallback(async (partyId) => {
    setLoadingMsgs(true);
    const { data, error: selErr } = await supabase
      .from('pl_broker_messages')
      .select('id, party_id, sender, body, created_at, read_at')
      .eq('party_id', partyId)
      .order('created_at', { ascending: true });

    if (selErr) {
      setError('Could not load messages.');
      setLoadingMsgs(false);
      return;
    }
    setMessages(data ?? []);
    setLoadingMsgs(false);

    await supabase.rpc('pl_stamp_message_read', { p_party_id: partyId });
    loadThreads();
  }, [loadThreads]);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => {
    if (activeParty) loadMessages(activeParty);
  }, [activeParty, loadMessages]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || !activeParty || sending) return;
    setSending(true);
    const { error: insErr } = await supabase
      .from('pl_broker_messages')
      .insert({ party_id: activeParty, sender: 'evidly', body });
    if (insErr) {
      setError('Reply failed to send.');
      setSending(false);
      return;
    }
    setDraft('');
    setSending(false);
    loadMessages(activeParty);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const activeThread = threads.find((t) => t.party_id === activeParty);

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-0.5" style={{ color: NAVY }}>Policy Lens messages</h1>
      <p className="text-sm text-slate-500 mb-5">Broker conversations. Reply as EvidLY operations.</p>

      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      <div className="grid grid-cols-[240px_1fr] border border-gray-200 rounded-xl overflow-hidden bg-white min-h-[420px]">

        <div className="border-r border-gray-200">
          <div className="px-3.5 py-2.5 text-[11px] uppercase tracking-wide text-slate-400 border-b border-gray-200">
            Threads
          </div>
          {loadingThreads ? (
            <div className="px-3.5 py-4 text-sm text-slate-400">Loading…</div>
          ) : threads.length === 0 ? (
            <div className="px-3.5 py-4 text-sm text-slate-400">No broker messages yet.</div>
          ) : (
            threads.map((t) => {
              const active = t.party_id === activeParty;
              return (
                <button
                  key={t.party_id}
                  onClick={() => setActiveParty(t.party_id)}
                  className="w-full text-left px-3.5 py-3 border-b border-gray-100"
                  style={
                    active
                      ? { background: NAVY_TINT, borderLeft: `3px solid ${NAVY}` }
                      : {}
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium truncate" style={{ color: NAVY }}>
                      {t.display_name}
                    </span>
                    {t.unread > 0 && (
                      <span
                        className="text-[10px] font-medium text-white rounded-full px-1.5 py-px ml-2"
                        style={{ background: NAVY }}
                      >
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 truncate">{t.last?.body}</div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex flex-col min-h-[420px]">
          {!activeParty ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
              Select a thread to view the conversation.
            </div>
          ) : (
            <>
              <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: NAVY }}>
                  {activeThread?.display_name}
                </span>
                <span className="text-[11px] text-slate-400">Broker · party {activeParty.slice(0, 8)}</span>
              </div>

              <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-y-auto max-h-[460px]">
                {loadingMsgs ? (
                  <div className="text-center text-sm text-slate-400 py-10">Loading…</div>
                ) : (
                  messages.map((m, i) => {
                    const showDay =
                      i === 0 || fmtDay(m.created_at) !== fmtDay(messages[i - 1].created_at);
                    const mine = m.sender === 'evidly';
                    return (
                      <div key={m.id}>
                        {showDay && (
                          <div className="text-center text-[11px] text-slate-400 my-1">
                            {fmtDay(m.created_at)}
                          </div>
                        )}
                        <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-[80%]">
                            <div
                              className="rounded-xl px-3.5 py-2.5 text-sm leading-relaxed"
                              style={
                                mine
                                  ? { background: EVIDLY_BG, color: EVIDLY_TEXT }
                                  : { background: INCOMING_BG, border: '1px solid #E5E7EB', color: NAVY }
                              }
                            >
                              {m.body}
                            </div>
                            <div className={`text-[11px] text-slate-400 mt-1 ${mine ? 'text-right mr-1' : 'ml-1'}`}>
                              {mine ? 'EvidLY (you)' : 'Broker'} · {fmtTime(m.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="flex gap-2 px-4 py-3 border-t border-gray-200 items-end">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Reply as EvidLY operations"
                  rows={1}
                  className="flex-1 resize-none min-h-[38px] max-h-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="h-[38px] px-4 rounded-lg text-white text-sm font-medium disabled:opacity-40 whitespace-nowrap"
                  style={{ background: NAVY }}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
