import { useState, useRef, useEffect } from 'react';
import { Brain, Send, Sparkles } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const suggestions = [
  'Why did my compliance score drop at Airport Cafe?',
  'Which vendor documents expire this month?',
  'Am I ready for a health inspection?',
  'What corrective actions are overdue?',
  'Show me temperature trends for Downtown Kitchen',
  'What do I need for my fire suppression inspection?',
];

const getDemoResponse = (question: string): string => {
  const lowerQ = question.toLowerCase();

  if (lowerQ.includes('compliance score') && lowerQ.includes('airport')) {
    return `Your compliance score at **Airport Cafe** dropped from **94%** to **87%** over the past 7 days. Here's the breakdown:

**Operational (dropped 5 pts → 85%)**
• 3 missed temperature logs on Feb 3–5 (Walk-in Cooler #2)
• Opening checklist incomplete on Feb 4

**Equipment (dropped 2 pts → 88%)**
• Hood cleaning certificate from Valley Fire Systems expired Feb 1
• Fire extinguisher monthly check overdue by 3 days

**Documentation (stable at 91%)**
• All food handler certs current
• Health permit valid through June 2026

**Recommended actions:**
1. Complete the 3 missed temp logs retroactively
2. Contact Valley Fire Systems to schedule hood cleaning
3. Assign fire extinguisher check to a team member today`;
  }

  if (lowerQ.includes('vendor') && lowerQ.includes('expire')) {
    return `You have **4 vendor documents expiring this month** across your locations:

1. **Valley Fire Systems** — Certificate of Insurance
   📍 Airport Cafe · Expires **Feb 10, 2026** ⚠️ 2 days away
2. **ABC Fire Protection** — Service Agreement
   📍 Downtown Kitchen · Expires **Feb 15, 2026**
3. **CleanVent Services** — Hood Cleaning Certificate
   📍 Airport Cafe · Expires **Feb 18, 2026**
4. **Pacific Pest Control** — Monthly Service Report
   📍 Riverside Bistro · Expires **Feb 28, 2026**

I've already sent renewal reminders to Valley Fire Systems and ABC Fire Protection. Would you like me to send follow-up emails to the others?`;
  }

  if (lowerQ.includes('health inspection') || (lowerQ.includes('ready') && lowerQ.includes('inspection'))) {
    return `Here's your **inspection readiness** across all locations:

**Downtown Kitchen — 96% Ready** ✅
• All temp logs current (last 30 days complete)
• 12/12 food handler certs valid
• Health permit valid through Aug 2026
• ⚠️ 1 gap: Pest control log missing for January

**Airport Cafe — 87% Ready** ⚠️
• 3 missed temperature logs this week
• Hood cleaning cert needs renewal
• Fire extinguisher check overdue
• Health permit valid through Jun 2026

**Riverside Bistro — 93% Ready** ✅
• All documentation current
• ⚠️ 1 gap: Employee handwashing log incomplete for Feb 5

**To get to 100%:**
1. Complete Airport Cafe temp logs and equipment checks
2. Upload January pest control report for Downtown Kitchen
3. Fill in Riverside Bistro handwashing log for Feb 5`;
  }

  if (lowerQ.includes('corrective action') && lowerQ.includes('overdue')) {
    return `You have **5 overdue corrective actions** across your locations:

🔴 **Critical (2)**
1. **Walk-in Cooler #2 temp above 41°F** — Airport Cafe
   Logged Feb 3 · Assigned to Maria Santos · 4 days overdue
   _Last reading: 44°F. Requires technician inspection._
2. **Grease trap cleaning overdue** — Downtown Kitchen
   Due Feb 1 · Unassigned · 6 days overdue

🟡 **Medium (2)**
3. **Sanitizer concentration low at prep station** — Riverside Bistro
   Logged Feb 5 · Assigned to James Park · 2 days overdue
4. **Damaged door gasket on Prep Fridge** — Airport Cafe
   Logged Jan 28 · Assigned to Maria Santos · 10 days overdue

🟢 **Low (1)**
5. **Update allergen menu signage** — Downtown Kitchen
   Due Jan 30 · Assigned to Alex Kim · 8 days overdue

Would you like me to send reminder notifications to the assigned team members?`;
  }

  if (lowerQ.includes('temperature') && lowerQ.includes('downtown')) {
    return `Here are the **temperature trends for Downtown Kitchen** (past 7 days):

**Walk-in Cooler** — Avg: 37.2°F ✅
• Range: 35°F – 39°F (within 32–41°F safe zone)
• All 14 logs recorded on time
• Trend: Stable, no concerns

**Walk-in Freezer** — Avg: -2°F ✅
• Range: -4°F – 0°F (within safe zone)
• All 14 logs recorded on time
• Trend: Stable

**Prep Line Fridge** — Avg: 39.8°F ⚠️
• Range: 37°F – 42°F
• ⚠️ 2 readings above 41°F on Feb 5 (41.5°F, 42°F)
• Trend: Slightly rising — recommend checking door gasket

**Hot Holding Station** — Avg: 148°F ✅
• Range: 145°F – 152°F (above 135°F minimum)
• All logs compliant

**Action needed:** Schedule a technician to inspect the Prep Line Fridge door gasket. The rising trend could lead to a food safety violation if not addressed.`;
  }

  if (lowerQ.includes('fire') && lowerQ.includes('suppression')) {
    return `Here's your **fire suppression inspection status** across all locations:

**Downtown Kitchen**
• Last inspection: Dec 3, 2025 by SafeGuard Fire Systems — **PASSED** ✅
• Next due: **Jun 3, 2026** (116 days away)
• System type: Ansul R-102 wet chemical

**Airport Cafe**
• Last inspection: Nov 15, 2025 by ABC Fire Protection — **PASSED** ✅
• Next due: **May 15, 2026** (97 days away)
• ⚠️ Service agreement expires Feb 15 — renewal needed
• System type: Ansul R-102 wet chemical

**Riverside Bistro**
• Last inspection: Jan 8, 2026 by Valley Fire Systems — **PASSED** ✅
• Next due: **Jul 8, 2026** (151 days away)
• System type: Kidde WHALEX wet chemical

**Requirements per NFPA 17A:**
• Semi-annual inspection by certified technician
• Monthly visual check by staff (logged in checklists)
• Full system maintenance annually
• All hoods must have current UL 300 listed systems

Your monthly visual checks are up to date at all locations.`;
  }

  if (lowerQ.includes('temperature') || lowerQ.includes('cooler') || lowerQ.includes('freezer')) {
    return `Walk-in coolers must be maintained at **41°F (5°C) or below**, and freezers at **0°F (-18°C) or below** per FDA Food Code Section 3-501.16.

Across your locations today:
• **Downtown Kitchen** — Walk-in: 37°F ✅ | Freezer: -2°F ✅
• **Airport Cafe** — Walk-in #1: 38°F ✅ | Walk-in #2: 44°F 🔴 | Freezer: -1°F ✅
• **Riverside Bistro** — Walk-in: 36°F ✅ | Freezer: -3°F ✅

⚠️ **Alert:** Airport Cafe Walk-in #2 has been running above safe limits since Feb 3. A corrective action has been created and assigned to Maria Santos.`;
  }

  return `That's a great question! Based on your compliance data, here's what I can tell you:

Your organization **Pacific Coast Dining** manages 3 active locations with an overall compliance score of **92%**. You have 12 team members, 340+ documents on file, and 4,200+ temperature logs recorded.

In demo mode, I can answer questions about:
• 📊 Compliance scores and trends
• 🌡️ Temperature logs and alerts
• 📋 Vendor documents and expirations
• ✅ Corrective actions and checklists
• 🔥 Fire safety and equipment inspections
• 👥 Team certifications and training

Try clicking one of the suggested questions above, or ask me something specific about your compliance data!`;
};

export function AIAdvisor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim() || isTyping) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: getDemoResponse(text) },
      ]);
    }, 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AI Advisor' }]} />
      <div className="flex flex-col" style={{ height: 'calc(100vh - 10rem)' }}>
        {/* Header */}
        <div className="rounded-lg p-6 text-white mb-4" style={{ background: 'linear-gradient(135deg, #1e4d6b 0%, #2a6a8f 100%)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Brain className="h-8 w-8 text-[#d4af37]" />
                <h2 className="text-2xl font-bold">AI Compliance Advisor</h2>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                AI Advisor analyzes your compliance data in real-time to provide instant, actionable guidance.
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
              <Sparkles className="h-4 w-4 text-[#d4af37]" />
              <span className="text-sm font-semibold text-[#d4af37]">Powered by EvidLY AI</span>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-lg shadow flex flex-col overflow-hidden border border-gray-200">
          <div className="flex-1 p-6 space-y-4 overflow-y-auto" style={{ backgroundColor: '#f8f9fa' }}>
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#eef4f8' }}>
                  <Brain className="h-8 w-8" style={{ color: '#1e4d6b' }} />
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: '#1e4d6b' }}>How can I help you today?</h3>
                <p className="text-gray-500 mb-8 max-w-md">
                  Ask me anything about your compliance data, food safety regulations, or upcoming deadlines.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(suggestion)}
                      className="text-left px-4 py-3 text-sm bg-white rounded-lg text-gray-700 transition-all"
                      style={{ border: '1px solid #e5e7eb' }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#1e4d6b'; e.currentTarget.style.backgroundColor = '#f0f7fb'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.backgroundColor = 'white'; }}
                    >
                      <span style={{ color: '#d4af37', marginRight: '8px' }}>✦</span>
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
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mr-3 mt-1" style={{ backgroundColor: '#1e4d6b' }}>
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-5 py-3 ${
                    message.role === 'user'
                      ? 'rounded-2xl rounded-br-sm text-white'
                      : 'rounded-2xl rounded-bl-sm text-gray-900 bg-white shadow-sm'
                  }`}
                  style={message.role === 'user'
                    ? { backgroundColor: '#1e4d6b' }
                    : { border: '1px solid #e5e7eb' }
                  }
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center space-x-2 mb-2 pb-2" style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <span className="text-xs font-bold" style={{ color: '#1e4d6b' }}>EvidLY AI</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">Just now</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mr-3 mt-1" style={{ backgroundColor: '#1e4d6b' }}>
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div className="px-5 py-4 rounded-2xl rounded-bl-sm bg-white shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#1e4d6b', animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#1e4d6b', animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#1e4d6b', animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} style={{ borderTop: '1px solid #e5e7eb', backgroundColor: 'white', padding: '16px 20px' }}>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about compliance, food safety, or your data..."
                className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{ border: '1px solid #d1d5db', transition: 'border-color 0.2s' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#1e4d6b')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="flex items-center justify-center w-11 h-11 rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#1e4d6b' }}
                onMouseOver={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#163a52'; }}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
