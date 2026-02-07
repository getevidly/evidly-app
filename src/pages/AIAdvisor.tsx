import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Brain, Send, Mic } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIAdvisor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const suggestions = [
    'What temperature should my walk-in cooler be?',
    'When is my hood cleaning certificate due?',
    'What do I need for a health inspection?',
    'How often should fire suppression be inspected?',
  ];

  const getDemoResponse = (question: string): string => {
    const lowerQ = question.toLowerCase();

    if (lowerQ.includes('temperature') || lowerQ.includes('cooler') || lowerQ.includes('freezer')) {
      return 'Walk-in coolers should be maintained at 41°F (5°C) or below, while freezers must stay at 0°F (-18°C) or below according to FDA Food Code Section 3-501.16. I see in your location\'s records that you\'re averaging 38°F in your walk-in, which is excellent. Make sure to log temperatures at least twice daily.';
    }

    if (lowerQ.includes('hood') || lowerQ.includes('cleaning')) {
      return 'Based on your records, your last hood cleaning was performed on October 12, 2025 by CleanVent Services. NFPA 96 requires commercial kitchen hoods to be cleaned:\n\n• Monthly for high-volume operations (24hr, charbroiling)\n• Quarterly for moderate-volume (non-solid fuel)\n• Semi-annually for low-volume\n\nYour next cleaning is due February 12, 2026. Your certificate is valid through August 2026.';
    }

    if (lowerQ.includes('inspection') && lowerQ.includes('health')) {
      return 'For a health inspection, ensure you have ready access to:\n\n1. Temperature logs (past 7-30 days)\n2. Food handler certificates (all current staff)\n3. Vendor invoices and delivery logs\n4. Cleaning and sanitizer test logs\n5. Pest control records\n6. Equipment maintenance records\n\nYour compliance score is currently 92%, which is great. Your only gap is the health permit renewal due in 45 days.';
    }

    if (lowerQ.includes('fire') || lowerQ.includes('suppression')) {
      return 'Fire suppression systems must be inspected semi-annually per NFPA 17A. Your last inspection was December 3, 2025 by SafeGuard Fire Systems and passed. Your next inspection is due June 3, 2026. The system should also receive a full maintenance service annually.';
    }

    if (lowerQ.includes('certificate') || lowerQ.includes('cert')) {
      return 'Looking at your documents, all food handler certifications are current. In California, food handler cards must be renewed every 3 years. I\'ll send you automatic reminders 30, 14, and 7 days before any certificates expire.';
    }

    return 'That\'s a great question! In demo mode, I provide sample responses. When connected to your real data, I can give you specific answers based on your location\'s compliance history, upcoming deadlines, and applicable regulations for your jurisdiction. I can also cite specific FDA Food Code sections, NFPA standards, and state/local requirements.';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setMessages([...messages, { role: 'user', content: userMessage }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: getDemoResponse(userMessage),
        },
      ]);
    }, 1200);
  };

  return (
    <Layout title="AI Advisor">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AI Advisor' }]} />
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        <div className="bg-gradient-to-r from-[#1b4965] to-[#2c5f7f] rounded-lg p-6 text-white mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <Brain className="h-8 w-8 text-[#d4af37]" />
            <h2 className="text-2xl font-bold">AI Compliance Advisor</h2>
          </div>
          <p className="text-gray-200">Get instant answers to your food safety and compliance questions</p>
        </div>

        <div className="flex-1 bg-white rounded-lg shadow flex flex-col overflow-hidden">
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Brain className="h-16 w-16 text-[#1b4965] mb-4" />
                <h3 className="text-2xl font-bold text-[#1b4965] mb-2">How can I help you today?</h3>
                <p className="text-gray-600 mb-8 max-w-md">
                  Ask me anything about food safety, compliance requirements, temperature logs, or best practices.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(suggestion)}
                      className="text-left px-4 py-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 border border-gray-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-5 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-[#1e4d6b] text-white'
                      : 'bg-white border-2 border-[#1e4d6b] text-gray-900'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center space-x-2 mb-2">
                      <Brain className="h-4 w-4 text-[#1e4d6b]" />
                      <span className="text-xs font-semibold text-[#1e4d6b]">AI Advisor</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[80%] px-5 py-3 rounded-2xl bg-white border-2 border-[#1e4d6b]">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="h-4 w-4 text-[#1e4d6b]" />
                    <span className="text-xs font-semibold text-[#1e4d6b]">AI Advisor</span>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-2 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a compliance question..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
              />
              <button
                type="button"
                className="p-3 text-gray-400 hover:text-gray-600 transition-colors"
                title="Voice input (coming soon)"
              >
                <Mic className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-6 py-3 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
