import { useState, useRef, useEffect } from 'react';
import { Brain, X, Send, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDemoContext, generateSuggestions, extractActionItems, parseMarkdown } from '../lib/aiAdvisor';
import { useDemo } from '../contexts/DemoContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

const QUICK_PROMPTS = [
  { label: 'Inspection Ready?', query: 'Am I ready for a health inspection?' },
  { label: "What's Due?", query: 'What corrective actions are overdue?' },
  { label: 'Weekly Summary', query: 'Give me a weekly compliance summary' },
];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getDemoResponse(question: string): { text: string; suggestions: string[] } {
  const lowerQ = question.toLowerCase();
  let text = '';
  let suggestions: string[] = [];

  if (lowerQ.includes('inspection') || lowerQ.includes('ready')) {
    text = `Here's your **inspection readiness** snapshot:\n\n**Downtown Kitchen — 96% Ready** ✅\n• All temp logs current, 12/12 certs valid\n\n**Airport Cafe — 87% Ready** ⚠️\n• 3 missed temp logs, hood cleaning cert expired\n\n**University Dining — 62% Ready** 🔴\n• Health permit expired, multiple vendor COIs overdue\n\nAction: Renew University Dining health permit immediately\nAction: Complete Airport Cafe temp logs`; // demo
    suggestions = ['Start mock inspection', 'What fails inspections?', 'Create action items'];
  } else if (lowerQ.includes('overdue') || lowerQ.includes('corrective') || lowerQ.includes("what's due")) {
    text = `You have **5 overdue corrective actions**:\n\n🔴 **Critical**\n1. Walk-in Cooler #2 above 41°F — Airport Cafe (4 days overdue)\n2. Grease trap cleaning — Downtown Kitchen (6 days overdue)\n\n🟡 **Medium**\n3. Sanitizer concentration low — University Dining (2 days)\n4. Damaged door gasket — Airport Cafe (10 days)\n\n🟢 **Low**\n5. Update allergen signage — Downtown Kitchen (8 days)`; // demo
    suggestions = ['Send reminders', 'Which affect score most?', 'Assign these items'];
  } else if (lowerQ.includes('weekly') || lowerQ.includes('summary')) {
    text = `**Weekly Compliance Summary** (Feb 3–9)\n\n**Overall Score: 76%** (↑1% from last week)\n\n**Highlights:**\n• Downtown Kitchen maintained 92% — strong performance\n• Airport Cafe recovered 2 points after completing temp logs\n• University Dining still critical at 57%\n\n**This Week's Wins:**\n• 28 temperature logs completed on time\n• 2 vendor certificates renewed\n\n**Needs Attention:**\n• 5 overdue corrective actions remain\n• University Dining health permit still expired`; // demo
    suggestions = ['Show location details', 'What should we prioritize?', 'Compare to last month'];
  } else if (lowerQ.includes('vendor') || lowerQ.includes('expire')) {
    text = `**4 vendor documents expiring** this month:\n\n1. Valley Fire Systems COI — Airport Cafe (Feb 10) ⚠️\n2. ABC Fire Protection Agreement — Downtown (Feb 15)\n3. CleanVent Hood Cert — Airport Cafe (Feb 18)\n4. Pacific Pest Report — University Dining (Feb 28)`; // demo
    suggestions = ['Send renewal reminders', 'Which vendors are critical?', 'View all vendors'];
  } else {
    const ctx = getDemoContext();
    text = `Your organization **${ctx.orgName}** compliance status:\n\n**Quick Status:**\n• Downtown Kitchen: Food Safety 94% ✅ · Facility Safety 88% ✅\n• Airport Cafe: Food Safety 72% ⚠️ · Facility Safety 62% 🔴\n• University Dining: Food Safety 62% 🔴 · Facility Safety 55% 🔴\n\n**Top priorities:**\n1. Renew University Dining health permit\n2. Complete missed temp checks at Airport Cafe\n3. Schedule overdue fire suppression inspection\n\nAsk me about compliance scores, temperatures, vendors, inspections, or corrective actions.`; // demo
    suggestions = ['Why did Airport score drop?', 'Am I inspection ready?', 'What actions are overdue?'];
  }

  return { text, suggestions };
}

export function AIChatPanel({ hidden = false }: { hidden?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Close panel and hide FAB when a tour is active
  useEffect(() => {
    if (hidden && isOpen) setIsOpen(false);
  }, [hidden]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { id: uid(), role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    await new Promise(r => setTimeout(r, 800 + Math.random() * 800));

    const { text: responseText, suggestions } = isDemoMode
      ? getDemoResponse(text)
      : { text: 'Connect your account to get AI-powered compliance insights tailored to your organization.', suggestions: [] };
    const aiMsg: Message = { id: uid(), role: 'assistant', content: responseText, suggestions };
    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  if (hidden) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed z-50 flex items-center justify-center rounded-full shadow-sm transition-transform hover:scale-110"
          style={{
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            backgroundColor: '#d4af37',
            color: 'white',
          }}
          title="AI Compliance Advisor"
        >
          <Brain className="h-6 w-6" />
        </button>
      )}

      {/* Slide-out Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white shadow-sm transition-transform duration-300 ease-in-out"
        style={{
          width: '420px',
          maxWidth: '100vw',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ backgroundColor: '#1e4d6b' }}
        >
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-white" />
            <span className="text-white font-semibold text-sm">AI Compliance Advisor</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/ai-advisor')}
              className="text-white text-xs hover:underline flex items-center gap-1 opacity-80 hover:opacity-100"
            >
              Full Page <ArrowRight className="h-3 w-3" />
            </button>
            <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 rounded p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ backgroundColor: '#faf8f3' }}>
          {messages.length === 0 && !isTyping && (
            <div className="text-center pt-8">
              <Brain className="h-10 w-10 mx-auto mb-3" style={{ color: '#d4af37' }} />
              <p className="text-sm font-semibold text-gray-700 mb-1">AI Compliance Advisor</p>
              <p className="text-xs text-gray-500 mb-4">Ask about scores, inspections, vendors, or compliance risks.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.label}
                    onClick={() => sendMessage(qp.query)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:border-[#1e4d6b] hover:bg-[#eef4f8]"
                    style={{ borderColor: '#d1d5db', color: '#374151' }}
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#1e4d6b] text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                  />
                ) : (
                  <span>{msg.content}</span>
                )}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
                    {msg.suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s)}
                        className="px-2 py-1 rounded-md text-xs border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-[#1e4d6b] transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" />
                <span className="text-xs text-gray-500">Analyzing your data...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Ask about compliance..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
              disabled={isTyping}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="px-3 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 transition-colors"
              style={{ backgroundColor: '#1e4d6b' }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
