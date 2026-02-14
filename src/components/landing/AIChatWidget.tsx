import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send } from 'lucide-react';
import { trackEvent } from '../../utils/analytics';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  cta?: 'try_demo' | 'book_call' | 'sign_up';
}

const SUGGESTED_QUESTIONS = [
  'How often do I need hood cleaning?',
  "What's a HACCP plan?",
  'Does California require food handler cards?',
  'What temperature should a walk-in cooler be?',
];

// Demo responses for when the edge function is unavailable
const DEMO_RESPONSES: Record<string, { reply: string; cta: 'try_demo' | 'book_call' }> = {
  hood: {
    reply: "NFPA 96 requires hood cleaning every 1-3 months for high-volume cooking (fryers, grills), every 6 months for moderate use, and annually for low-volume. Your local fire marshal may have stricter requirements. EvidLY tracks your cleaning schedule and alerts you before you're overdue.",
    cta: 'try_demo',
  },
  haccp: {
    reply: "HACCP (Hazard Analysis Critical Control Points) is a systematic food safety plan that identifies biological, chemical, and physical hazards. It's required by the FDA for juice, seafood, and meat processing. Many health departments recommend it for all food service operations. EvidLY's checklists align with HACCP principles.",
    cta: 'try_demo',
  },
  'food handler': {
    reply: "Yes! California requires all food handlers to have a California Food Handler Card within 30 days of employment (CalCode \u00A7113948). The card is valid for 3 years. EvidLY tracks every team member's certification and alerts you 60 days before expiration.",
    cta: 'try_demo',
  },
  temperature: {
    reply: "Walk-in coolers should maintain 35-38\u00B0F (1.7-3.3\u00B0C). The FDA Food Code sets 41\u00B0F (5\u00B0C) as the maximum safe temperature. Walk-in freezers should be at 0\u00B0F (-18\u00B0C) or below. EvidLY's temperature monitoring sends instant alerts if readings go out of range.",
    cta: 'try_demo',
  },
  default: {
    reply: "Great question! Commercial kitchen compliance covers food safety (FDA Food Code, state health codes), fire safety (NFPA 96, hood cleaning), and vendor management. EvidLY automates tracking for all three. Want to see how it works?",
    cta: 'try_demo',
  },
};

function getDemoResponse(message: string): { reply: string; cta: 'try_demo' | 'book_call' } {
  const lower = message.toLowerCase();
  for (const [key, response] of Object.entries(DEMO_RESPONSES)) {
    if (key !== 'default' && lower.includes(key)) return response;
  }
  return DEMO_RESPONSES.default;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm EvidLY's compliance assistant. Ask me anything about commercial kitchen compliance \u2014 food safety, fire codes, HACCP, health inspections, and more.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const canSend = userMessageCount < 10;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(text?: string) {
    const userMessage = (text || input).trim();
    if (!userMessage || loading || !canSend) return;

    setInput('');
    setShowSuggestions(false);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    trackEvent('chat_widget_message', { message_number: userMessageCount + 1, page: 'landing' });
    setLoading(true);

    try {
      // Try the edge function first
      if (SUPABASE_URL) {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/landing-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage, context: 'landing_page' }),
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.reply || data.text,
            cta: data.cta,
          }]);
          setLoading(false);
          return;
        }
      }

      // Fallback to demo responses
      await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
      const demo = getDemoResponse(userMessage);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: demo.reply,
        cta: demo.cta,
      }]);
    } catch {
      await new Promise(r => setTimeout(r, 600));
      const demo = getDemoResponse(userMessage);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: demo.reply,
        cta: demo.cta,
      }]);
    }

    setLoading(false);
  }

  return (
    <>
      {/* Floating bubble */}
      {!isOpen && (
        <button
          onClick={() => { trackEvent('chat_widget_open', { page: 'landing' }); setIsOpen(true); }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform"
          style={{ backgroundColor: '#1e4d6b' }}
          aria-label="Open compliance chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] max-h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between text-white flex-shrink-0"
            style={{ backgroundColor: '#1e4d6b' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-sm">Ask EvidLY</div>
                <div className="text-xs opacity-80">Compliance questions answered instantly</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" style={{ maxHeight: '340px' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#eef4f8] text-gray-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {msg.content}
                  {msg.cta === 'try_demo' && (
                    <button
                      onClick={() => navigate('/demo')}
                      className="block mt-2 text-sm font-medium hover:underline bg-transparent border-none cursor-pointer p-0"
                      style={{ color: '#1e4d6b' }}
                    >
                      Try the interactive demo &rarr;
                    </button>
                  )}
                  {msg.cta === 'book_call' && (
                    <a
                      href="https://calendly.com/evidly/demo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-2 text-sm font-medium hover:underline"
                      style={{ color: '#1e4d6b' }}
                    >
                      Book a live walkthrough &rarr;
                    </a>
                  )}
                  {msg.cta === 'sign_up' && (
                    <button
                      onClick={() => navigate('/signup')}
                      className="block mt-2 text-sm font-medium hover:underline bg-transparent border-none cursor-pointer p-0"
                      style={{ color: '#1e4d6b' }}
                    >
                      Sign up for full access &rarr;
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-xl text-sm text-gray-400">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          {showSuggestions && messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors bg-transparent cursor-pointer"
                  style={{ borderColor: '#b8d4e8', color: '#1e4d6b' }}
                  onMouseEnter={e => {
                    (e.target as HTMLElement).style.backgroundColor = '#eef4f8';
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2 border-t flex-shrink-0">
            {canSend ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about compliance..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#b8d4e8] focus:border-[#1e4d6b]"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="px-3 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: '#d4af37' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">
                You've reached the chat limit.{' '}
                <button
                  onClick={() => navigate('/signup')}
                  className="font-medium bg-transparent border-none cursor-pointer p-0 underline"
                  style={{ color: '#1e4d6b' }}
                >
                  Sign up
                </button>{' '}
                for unlimited AI compliance assistance.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
