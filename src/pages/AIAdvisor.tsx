import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Brain, Send, Sparkles, Plus, Upload, X, ClipboardList, MessageSquare, FileSearch, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import {
  type AiMessage,
  type ComplianceContext,
  getDemoContext,
  streamChatResponse,
  generateSuggestions,
  extractActionItems,
  parseMarkdown,
} from '../lib/aiAdvisor';

/* ─── Types ─── */
type Mode = 'chat' | 'inspection' | 'document';

interface Conversation {
  id: string;
  title: string;
  messages: AiMessage[];
  mode: Mode;
  createdAt: number;
}

interface InspectionScore {
  asked: number;
  passed: number;
  needsImprovement: number;
  failed: number;
}

/* ─── Demo responses ─── */
const getDemoResponse = (question: string): { text: string; suggestions: string[] } => {
  const lowerQ = question.toLowerCase();
  let text = '';
  let suggestions: string[] = [];

  if (lowerQ.includes('compliance score') && lowerQ.includes('airport')) {
    text = `Your compliance score at **Airport Cafe** dropped from **94%** to **87%** over the past 7 days. Here's the breakdown:\n\n**Food Safety (dropped 5 pts → 85%)**\n• 3 missed temperature logs on Feb 3–5 (Walk-in Cooler #2)\n• Opening checklist incomplete on Feb 4\n\n**Fire Safety (dropped 2 pts → 88%)**\n• Hood cleaning certificate from Valley Fire Systems expired Feb 1\n• Fire extinguisher monthly check overdue by 3 days\n\n**Vendor Compliance (stable at 91%)**\n• All food handler certs current\n• Health permit valid through June 2026\n\n**Recommended actions:**\n1. Complete the 3 missed temp logs retroactively\n2. Contact Valley Fire Systems to schedule hood cleaning\n3. Assign fire extinguisher check to a team member today`;
    suggestions = ['Show me Airport Cafe temp trends', 'Create action items for Airport Cafe', 'Compare Airport Cafe to other locations'];
  } else if (lowerQ.includes('vendor') && lowerQ.includes('expire')) {
    text = `You have **4 vendor documents expiring this month** across your locations:\n\n1. **Valley Fire Systems** — Certificate of Insurance\n   📍 Airport Cafe · Expires **Feb 10, 2026** ⚠️ 2 days away\n2. **ABC Fire Protection** — Service Agreement\n   📍 Downtown Kitchen · Expires **Feb 15, 2026**\n3. **CleanVent Services** — Hood Cleaning Certificate\n   📍 Airport Cafe · Expires **Feb 18, 2026**\n4. **Pacific Pest Control** — Monthly Service Report\n   📍 University Dining · Expires **Feb 28, 2026**\n\nAction: Send renewal reminders to Valley Fire Systems and ABC Fire Protection\nAction: Contact CleanVent Services for updated hood cleaning certificate\nAction: Request monthly service report from Pacific Pest Control`;
    suggestions = ['Send renewal reminders now', 'Which vendors are most critical?', 'Show me vendor compliance history'];
  } else if (lowerQ.includes('health inspection') || (lowerQ.includes('ready') && lowerQ.includes('inspection'))) {
    text = `Here's your **inspection readiness** across all locations:\n\n**Downtown Kitchen — 96% Ready** ✅\n• All temp logs current (last 30 days complete)\n• 12/12 food handler certs valid\n• Health permit valid through Aug 2026\n• ⚠️ 1 gap: Pest control log missing for January\n\n**Airport Cafe — 87% Ready** ⚠️\n• 3 missed temperature logs this week\n• Hood cleaning cert needs renewal\n• Fire extinguisher check overdue\n• Health permit valid through Jun 2026\n\n**University Dining — 62% Ready** 🔴\n• 8 missed temperature logs\n• Health permit expired — immediate renewal needed\n• Multiple vendor COIs expired\n\nAction: Complete Airport Cafe temp logs and equipment checks\nAction: Upload January pest control report for Downtown Kitchen\nAction: Renew University Dining health permit immediately\nAction: Request updated COIs from University Dining vendors`;
    suggestions = ['Start a mock inspection drill', 'What fails an inspection?', 'Create action items for readiness'];
  } else if (lowerQ.includes('corrective action') && lowerQ.includes('overdue')) {
    text = `You have **5 overdue corrective actions** across your locations:\n\n🔴 **Critical (2)**\n1. **Walk-in Cooler #2 temp above 41°F** — Airport Cafe\n   Logged Feb 3 · Assigned to Maria Santos · 4 days overdue\n2. **Grease trap cleaning overdue** — Downtown Kitchen\n   Due Feb 1 · Unassigned · 6 days overdue\n\n🟡 **Medium (2)**\n3. **Sanitizer concentration low at prep station** — University Dining\n   Logged Feb 5 · Assigned to James Park · 2 days overdue\n4. **Damaged door gasket on Prep Fridge** — Airport Cafe\n   Logged Jan 28 · Assigned to Maria Santos · 10 days overdue\n\n🟢 **Low (1)**\n5. **Update allergen menu signage** — Downtown Kitchen\n   Due Jan 30 · Assigned to Alex Kim · 8 days overdue\n\nAction: Assign grease trap cleaning to a team member immediately\nAction: Follow up with Maria Santos on Airport Cafe items\nAction: Send reminder to James Park about sanitizer levels`;
    suggestions = ['Send reminders to assigned staff', 'Which items affect our score most?', 'Create action items from these'];
  } else if (lowerQ.includes('temperature') && lowerQ.includes('downtown')) {
    text = `Here are the **temperature trends for Downtown Kitchen** (past 7 days):\n\n**Walk-in Cooler** — Avg: 37.2°F ✅\n• Range: 35°F – 39°F (within 32–41°F safe zone)\n• All 14 logs recorded on time\n\n**Walk-in Freezer** — Avg: -2°F ✅\n• Range: -4°F – 0°F (within safe zone)\n• All 14 logs recorded on time\n\n**Prep Line Fridge** — Avg: 39.8°F ⚠️\n• Range: 37°F – 42°F\n• ⚠️ 2 readings above 41°F on Feb 5 (41.5°F, 42°F)\n• Trend: Slightly rising — recommend checking door gasket\n\n**Hot Holding Station** — Avg: 148°F ✅\n• Range: 145°F – 152°F (above 135°F minimum)\n\nAction: Schedule a technician to inspect the Prep Line Fridge door gasket`;
    suggestions = ['Alert me if temps go out of range', 'Compare temp compliance across locations', 'What causes fridge temps to rise?'];
  } else if (lowerQ.includes('compare') && (lowerQ.includes('location') || lowerQ.includes('compliance'))) {
    text = `Here's a **compliance comparison** across all your locations:\n\n**Downtown Kitchen — 92%** 🟢 (↑2% from last month)\n• Food Safety: 95% · Fire Safety: 91% · Vendor Compliance: 89%\n• Strengths: Consistent temp logging, all certs current\n\n**Airport Cafe — 74%** 🟡 (↓7% from last month)\n• Food Safety: 78% · Fire Safety: 70% · Vendor Compliance: 72%\n• Issues: 3 missed temp logs, expired hood cleaning cert\n\n**University Dining — 57%** 🔴 (↓4% from last month)\n• Food Safety: 62% · Fire Safety: 55% · Vendor Compliance: 52%\n• Issues: Incomplete checklists, multiple expired docs\n\nAction: Create focused improvement plan for University Dining\nAction: Address Airport Cafe equipment maintenance backlog\nAction: Review University Dining documentation gaps with team lead`;
    suggestions = ['What would improve University Dining fastest?', 'Show me the trend over 6 months', 'Create an improvement plan'];
  } else if (lowerQ.includes('risk') && lowerQ.includes('university')) {
    text = `Here are the **top risks at University Dining** ranked by compliance impact:\n\n🔴 **Critical Risks**\n1. **Documentation gaps** — Score: 52%\n   • 4 expired vendor certificates not renewed\n   • Employee training records incomplete for 3 staff\n2. **Equipment maintenance overdue** — Score: 55%\n   • Walk-in cooler last serviced 4 months ago\n   • Fire extinguisher monthly check missed twice\n\n🟡 **Medium Risks**\n3. **Inconsistent temperature logging** — Score: 62%\n   • 12 missed logs in the past 30 days\n4. **Checklist completion rate at 68%**\n   • Closing checklists skipped 3x per week on average\n\nAction: Assign a documentation lead to clear the expired cert backlog\nAction: Schedule equipment service visits this week\nAction: Set up automated temp log reminders for weekend shifts\nAction: Brief the team on checklist importance and tie to leaderboard`;
    suggestions = ['Create all action items from this', 'Who should lead the improvement?', 'How fast can we fix this?'];
  } else if (lowerQ.includes('team') && lowerQ.includes('certif')) {
    text = `You have **3 team members with expiring certifications** in the next 60 days:\n\n🔴 **Michael Torres** — Food Handler Certificate\n   📍 Airport Cafe · Expires **Feb 26, 2026** (19 days away)\n\n🟡 **Sarah Chen** — ServSafe Manager Certification\n   📍 Downtown Kitchen · Expires **Mar 15, 2026** (36 days away)\n\n🟡 **David Park** — Food Handler Certificate\n   📍 University Dining · Expires **Apr 2, 2026** (54 days away)\n\nAll other team certifications are current. Your organization has 12 active team members with 28 total certifications on file.\n\nAction: Register Michael Torres for renewal course immediately\nAction: Schedule Sarah Chen for ServSafe exam retake\nAction: Remind David Park to schedule renewal before expiry`;
    suggestions = ['Send renewal reminders now', 'What certifications are required?', 'Show me training compliance'];
  } else if (lowerQ.includes('vendor') && (lowerQ.includes('recommend') || lowerQ.includes('suggest') || lowerQ.includes('who should'))) {
    text = `Based on your service needs and location data, here are my **top vendor recommendations**:\n\n**Hood & Duct Cleaning — Overdue at Airport Cafe**\n1. **Cleaning Pros Plus** — IKECA Master Certified ⭐ 4.8\n   • Preferred Tier · 92 active kitchens · Central Valley, CA\n   • Specialties: Commercial hood/duct cleaning, kitchen exhaust\n   • References: Aramark Food Services, Yosemite Hospitality\n   • Response time: ~2 hrs · Starting at $450/service\n   → *Best match: IKECA certified, highest rating in your area*\n\n2. **ABC Fire Protection** — Certified Tier ⭐ 4.6\n   • 45+ active accounts · Sacramento metro\n   • Also handles fire suppression systems\n   • Response time: ~4 hrs · Starting at $350/service\n\n**Fire Suppression — Due Soon at University Dining**\n3. **Valley Fire Systems** — Verified Tier ⭐ 4.2\n   • Currently serves your Airport Cafe location\n   • Can bundle multi-location discount\n\nAction: Request a quote from Cleaning Pros Plus for Airport Cafe hood cleaning\nAction: Schedule fire suppression inspection at University Dining with Valley Fire\nAction: Compare vendor pricing in the Marketplace`;
    suggestions = ['Request quote from Cleaning Pros Plus', 'Open Vendor Marketplace', 'Compare all hood cleaning vendors'];
  } else if (lowerQ.includes('cleaning pros') || (lowerQ.includes('hood') && lowerQ.includes('cleaning') && lowerQ.includes('overdue'))) {
    text = `**Cleaning Pros Plus** is your best option for hood cleaning at Airport Cafe. Here's why:\n\n**Company Profile**\n• IKECA Master Certified (International Kitchen Exhaust Cleaning Association)\n• Preferred Tier on EvidLY Marketplace ⭐ 4.8 (47 reviews)\n• 92 active commercial kitchen accounts\n• Central Valley, CA — services your area\n\n**Why They Stand Out**\n✅ IKECA Master certification — highest industry standard\n✅ 98% on-time service rate\n✅ Average response time: 2 hours\n✅ References include Aramark Food Services & Yosemite Hospitality\n✅ Full documentation provided: before/after photos, certificates, reports\n\n**Pricing**\n• Standard hood cleaning: $450–$650 per system\n• Multi-location discount available (you qualify with 3 locations)\n• Free initial assessment\n\n**Airport Cafe Status**\nYour hood cleaning is **14 days overdue**. Last service was by CleanVent Services on Dec 15, 2025. The certificate expired Jan 15, 2026.\n\nAction: Request a quote from Cleaning Pros Plus for Airport Cafe\nAction: Schedule an assessment visit this week\nAction: View Cleaning Pros Plus full profile in Marketplace`;
    suggestions = ['Request quote now', 'View their full profile', 'Compare with other vendors'];
  } else if (lowerQ.includes('mock') || lowerQ.includes('inspection drill') || lowerQ.includes('inspection prep')) {
    text = `I'd be happy to run a mock inspection! Switch to the **Inspection Prep** tab above to start a full mock health department inspection.\n\nI'll ask you questions one at a time about:\n• Temperature controls and cold storage\n• Food handling and cross-contamination prevention\n• Sanitation and cleaning procedures\n• Pest control documentation\n• Employee hygiene and certifications\n• Equipment maintenance\n\nEach answer will be scored as Pass, Needs Improvement, or Fail with explanations.`;
    suggestions = ['Switch to Inspection Prep mode', 'What should I prepare first?', 'Show me common inspection failures'];
  } else {
    text = `Based on your compliance data, here's what I can tell you:\n\nYour organization **Pacific Coast Dining** manages 3 active locations with an overall compliance score of **76%**.\n\n**Quick Summary:**\n• Downtown Kitchen: 92% — Inspection Ready ✅\n• Airport Cafe: 74% — Needs Attention ⚠️\n• University Dining: 57% — Critical 🔴\n\n**Top priorities this week:**\n1. Renew University Dining health permit (expired)\n2. Complete 3 missed temp checks at Airport Cafe\n3. Schedule overdue fire suppression at University Dining\n\nI can help with compliance scores, temperature trends, vendor documents, inspection readiness, corrective actions, team certifications, and more. What would you like to focus on?`;
    suggestions = ['Why did Airport Cafe score drop?', 'Am I ready for a health inspection?', 'What corrective actions are overdue?'];
  }

  return { text, suggestions };
};

const INSPECTION_TEMPLATES = [
  { id: 'health', label: 'Health Department', icon: '🏥' },
  { id: 'fire', label: 'Fire Marshal', icon: '🔥' },
  { id: 'internal', label: 'Internal Audit', icon: '📋' },
];

const DEMO_INSPECTION_QUESTIONS = [
  { q: 'What is the current temperature of your walk-in cooler, and how often do you log temperatures?', type: 'Temperature Controls' },
  { q: 'How do you prevent cross-contamination between raw meats and ready-to-eat foods during preparation?', type: 'Food Handling' },
  { q: 'Describe your sanitizing procedure for food-contact surfaces. What concentration of sanitizer do you use?', type: 'Sanitation' },
  { q: 'When was your last pest control service, and do you have documentation on file?', type: 'Pest Control' },
  { q: 'How do you verify that hot food items are held at or above 135°F during service?', type: 'Hot Holding' },
  { q: 'Can you show me your employees\' food handler certificates? Are all current?', type: 'Employee Certs' },
  { q: 'What is your procedure for receiving deliveries? How do you check incoming temperatures?', type: 'Receiving' },
  { q: 'Where is your HACCP plan, and when was it last reviewed?', type: 'Documentation' },
];

const DEMO_PAST_CONVERSATIONS: Conversation[] = [
  {
    id: 'past-1', title: 'Airport Cafe score drop analysis', mode: 'chat', createdAt: Date.now() - 86400000 * 2,
    messages: [
      { id: 'p1-1', role: 'user', content: 'Why did my compliance score drop at Airport Cafe?', timestamp: Date.now() - 86400000 * 2 },
      { id: 'p1-2', role: 'assistant', content: 'Your compliance score at **Airport Cafe** dropped from **94%** to **87%** over the past 7 days due to 3 missed temperature logs and an expired hood cleaning certificate. The food safety pillar dropped 5 points and fire safety dropped 2 points.', timestamp: Date.now() - 86400000 * 2 + 5000, suggestions: ['Show me the details', 'How to fix it?'] },
    ],
  },
  {
    id: 'past-2', title: 'Vendor document renewals', mode: 'chat', createdAt: Date.now() - 86400000 * 5,
    messages: [
      { id: 'p2-1', role: 'user', content: 'Which vendor documents expire this month?', timestamp: Date.now() - 86400000 * 5 },
      { id: 'p2-2', role: 'assistant', content: 'You have **4 vendor documents expiring this month**: Valley Fire Systems COI (Feb 10), ABC Fire Service Agreement (Feb 15), CleanVent Hood Cert (Feb 18), and Pacific Pest monthly report (Feb 28).', timestamp: Date.now() - 86400000 * 5 + 5000, suggestions: ['Send reminders', 'Show all vendors'] },
    ],
  },
  {
    id: 'past-3', title: 'Mock inspection — Downtown Kitchen', mode: 'inspection', createdAt: Date.now() - 86400000 * 7,
    messages: [
      { id: 'p3-1', role: 'assistant', content: 'Starting mock Health Department inspection for Downtown Kitchen. Question 1: What is the current temperature of your walk-in cooler?', timestamp: Date.now() - 86400000 * 7 },
      { id: 'p3-2', role: 'user', content: 'Our walk-in is at 37°F, logged twice daily.', timestamp: Date.now() - 86400000 * 7 + 60000 },
      { id: 'p3-3', role: 'assistant', content: '**✅ Pass** — 37°F is well within the FDA requirement of 41°F or below. Twice daily logging meets most health department expectations.', timestamp: Date.now() - 86400000 * 7 + 65000, suggestions: ['Next question', 'End inspection'] },
    ],
  },
];

const STARTER_CARDS = [
  'Why did my compliance score drop at Airport Cafe?',
  'Which vendor documents expire this month?',
  'Am I ready for a health inspection?',
  'What corrective actions are overdue?',
  'Show me temperature trends for Downtown Kitchen',
  'Compare compliance across all my locations',
  'What are the biggest risks at University Dining?',
  'Which team members have expiring certifications?',
];

const TEAM_MEMBERS = ['James Wilson', 'Maria Lopez', 'Sarah Chen', 'Michael Torres', 'Alex Kim', 'David Park'];

const F = { fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" };

function uid(): string { return Math.random().toString(36).slice(2, 10); }

/* ─── Component ─── */
export function AIAdvisor() {
  const { isDemoMode, companyName } = useDemo();

  // State
  const [mode, setMode] = useState<Mode>('chat');
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    isDemoMode ? [...DEMO_PAST_CONVERSATIONS] : []
  );
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showContextPanel, setShowContextPanel] = useState(false);

  // Inspection
  const [inspectionTemplate, setInspectionTemplate] = useState<string | null>(null);
  const [inspectionScore, setInspectionScore] = useState<InspectionScore>({ asked: 0, passed: 0, needsImprovement: 0, failed: 0 });
  const [inspectionQuestionIdx, setInspectionQuestionIdx] = useState(0);
  const [inspectionEnded, setInspectionEnded] = useState(false);

  // Document upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Action items modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [pendingActions, setPendingActions] = useState<string[]>([]);
  const [actionSuccess, setActionSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const context: ComplianceContext = useMemo(() => getDemoContext(), []);

  const activeConv = conversations.find((c) => c.id === activeConvId) || null;
  const messages = activeConv?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const createConversation = useCallback((firstMode: Mode): Conversation => {
    const conv: Conversation = { id: uid(), title: 'New Conversation', messages: [], mode: firstMode, createdAt: Date.now() };
    setConversations((prev) => [conv, ...prev]);
    setActiveConvId(conv.id);
    return conv;
  }, []);

  const updateConversation = useCallback((convId: string, updater: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === convId ? updater(c) : c)));
  }, []);

  const addMessage = useCallback((convId: string, msg: AiMessage) => {
    updateConversation(convId, (c) => ({
      ...c,
      messages: [...c.messages, msg],
      title: c.messages.length === 0 && msg.role === 'user' ? msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : '') : c.title,
    }));
  }, [updateConversation]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;
    setInput('');

    let conv = activeConv;
    let convId = activeConvId;
    if (!conv) {
      conv = createConversation(mode);
      convId = conv.id;
    }

    const userMsg: AiMessage = { id: uid(), role: 'user', content: text, timestamp: Date.now() };
    addMessage(convId!, userMsg);
    setIsTyping(true);

    if (isDemoMode) {
      // Demo: use hardcoded responses
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));
      const { text: responseText, suggestions } = getDemoResponse(text);
      const actions = extractActionItems(responseText);
      const aiMsg: AiMessage = {
        id: uid(), role: 'assistant', content: responseText,
        timestamp: Date.now(), suggestions, hasActions: actions.length > 0,
      };
      addMessage(convId!, aiMsg);
      setIsTyping(false);
    } else {
      // Production: stream from Claude API
      try {
        const convMessages = [...(conversations.find((c) => c.id === convId)?.messages || []), userMsg]
          .map((m) => ({ role: m.role, content: m.content }));
        let fullResponse = '';
        const streamMsgId = uid();

        // Add placeholder
        addMessage(convId!, { id: streamMsgId, role: 'assistant', content: '', timestamp: Date.now() });

        for await (const chunk of streamChatResponse(convMessages, context, mode)) {
          fullResponse += chunk;
          updateConversation(convId!, (c) => ({
            ...c,
            messages: c.messages.map((m) => m.id === streamMsgId ? { ...m, content: fullResponse } : m),
          }));
        }

        const suggestions = generateSuggestions(fullResponse, mode);
        const actions = extractActionItems(fullResponse);
        updateConversation(convId!, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === streamMsgId ? { ...m, content: fullResponse, suggestions, hasActions: actions.length > 0 } : m
          ),
        }));
      } catch (err: any) {
        addMessage(convId!, {
          id: uid(), role: 'assistant',
          content: `I'm sorry, I encountered an error: ${err?.message || 'Unknown error'}. Please try again.`,
          timestamp: Date.now(),
        });
      }
      setIsTyping(false);
    }
  }, [isTyping, activeConv, activeConvId, mode, isDemoMode, createConversation, addMessage, updateConversation, conversations, context]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const startNewConversation = () => {
    setActiveConvId(null);
    setMode('chat');
    setInspectionTemplate(null);
    setInspectionScore({ asked: 0, passed: 0, needsImprovement: 0, failed: 0 });
    setInspectionQuestionIdx(0);
    setInspectionEnded(false);
    setUploadedFile(null);
  };

  const startInspection = (templateId: string) => {
    const conv = createConversation('inspection');
    setMode('inspection');
    setInspectionTemplate(templateId);
    setInspectionScore({ asked: 0, passed: 0, needsImprovement: 0, failed: 0 });
    setInspectionQuestionIdx(0);
    setInspectionEnded(false);

    const template = INSPECTION_TEMPLATES.find((t) => t.id === templateId);
    const firstQ = DEMO_INSPECTION_QUESTIONS[0];
    addMessage(conv.id, {
      id: uid(), role: 'assistant',
      content: `Starting **${template?.label || 'Mock'} Inspection** for ${isDemoMode ? companyName : 'your organization'}.\n\n**Category: ${firstQ.type}**\n${firstQ.q}`,
      timestamp: Date.now(),
    });
    setInspectionScore((prev) => ({ ...prev, asked: 1 }));
  };

  const handleInspectionAnswer = async (text: string) => {
    if (!text.trim() || isTyping || !activeConvId) return;
    setInput('');

    addMessage(activeConvId, { id: uid(), role: 'user', content: text, timestamp: Date.now() });
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 1000));

    // Randomly score for demo
    const scores: ('Pass' | 'Needs Improvement' | 'Fail')[] = ['Pass', 'Pass', 'Pass', 'Needs Improvement', 'Pass'];
    const score = scores[Math.floor(Math.random() * scores.length)];
    const scoreEmoji = score === 'Pass' ? '✅ Pass' : score === 'Needs Improvement' ? '⚠️ Needs Improvement' : '🔴 Fail';

    setInspectionScore((prev) => ({
      ...prev,
      passed: prev.passed + (score === 'Pass' ? 1 : 0),
      needsImprovement: prev.needsImprovement + (score === 'Needs Improvement' ? 1 : 0),
      failed: prev.failed + (score === 'Fail' ? 1 : 0),
    }));

    const nextIdx = inspectionQuestionIdx + 1;
    let responseText = `**${scoreEmoji}**\n\n`;

    if (score === 'Pass') {
      responseText += `Good answer. Your response demonstrates adequate knowledge and compliance with this area.`;
    } else if (score === 'Needs Improvement') {
      responseText += `Your answer partially meets requirements, but could be more specific. Consider documenting this process more thoroughly and ensuring all staff follow the same procedure.`;
    } else {
      responseText += `This area needs immediate attention. Please review the FDA Food Code requirements and implement corrective actions.`;
    }

    if (nextIdx < DEMO_INSPECTION_QUESTIONS.length) {
      const nextQ = DEMO_INSPECTION_QUESTIONS[nextIdx];
      responseText += `\n\n---\n\n**Category: ${nextQ.type}**\n${nextQ.q}`;
      setInspectionScore((prev) => ({ ...prev, asked: prev.asked + 1 }));
      setInspectionQuestionIdx(nextIdx);
    } else {
      responseText += `\n\n---\n\n**Mock Inspection Complete!** 🎉\n\nHere's your summary:\n• Questions Asked: ${inspectionScore.asked}\n• Passed: ${inspectionScore.passed + (score === 'Pass' ? 1 : 0)}\n• Needs Improvement: ${inspectionScore.needsImprovement + (score === 'Needs Improvement' ? 1 : 0)}\n• Failed: ${inspectionScore.failed + (score === 'Fail' ? 1 : 0)}\n\nOverall readiness: **${Math.round(((inspectionScore.passed + (score === 'Pass' ? 1 : 0)) / inspectionScore.asked) * 100)}%**\n\nFocus on areas marked "Needs Improvement" or "Fail" before your actual inspection.`;
      setInspectionEnded(true);
    }

    addMessage(activeConvId, {
      id: uid(), role: 'assistant', content: responseText, timestamp: Date.now(),
    });
    setIsTyping(false);
  };

  const handleDocumentUpload = (file: File) => {
    setUploadedFile(file);
    let conv = activeConv;
    if (!conv) {
      conv = createConversation('document');
      setMode('document');
    }

    addMessage(conv.id, {
      id: uid(), role: 'user',
      content: `📎 Uploaded: **${file.name}** (${(file.size / 1024).toFixed(1)} KB)`,
      timestamp: Date.now(),
    });
    setIsTyping(true);

    setTimeout(() => {
      const analysis = `I've analyzed the uploaded document **${file.name}**.\n\n**📄 Summary**\nThis appears to be a compliance-related document. In a production environment, I would extract the full text content and provide detailed analysis.\n\n**⚠️ Issues Found**\n• Document should be verified against current regulatory requirements\n• Ensure dates and signatures are current\n• Cross-reference with your existing compliance records\n\n**✅ Recommended Actions**\nAction: Review document for accuracy and completeness\nAction: Update your compliance records with this document\nAction: Set a reminder for the next renewal or review date\n\n_Note: Full document analysis with OCR and content extraction is available in production mode with the Claude API connected._`;

      const actions = extractActionItems(analysis);
      addMessage(conv!.id, {
        id: uid(), role: 'assistant', content: analysis, timestamp: Date.now(),
        suggestions: ['What else should I check?', 'Upload another document', 'Create action items'],
        hasActions: actions.length > 0,
      });
      setIsTyping(false);
      setUploadedFile(null);
    }, 1500);
  };

  const handleCreateActions = (responseContent: string) => {
    const items = extractActionItems(responseContent);
    if (items.length > 0) {
      setPendingActions(items);
      setShowActionModal(true);
      setActionSuccess(false);
    }
  };

  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const fmtDate = (ts: number) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AI Advisor' }]} />
      <div style={{ ...F, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 10rem)' }}>
        {/* HEADER */}
        <div style={{ background: 'linear-gradient(135deg, #1e4d6b, #2a6a8f)', borderRadius: '12px', padding: '20px 24px', color: '#fff', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Brain style={{ width: '28px', height: '28px', color: '#d4af37' }} />
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>AI Compliance Advisor</h2>
                <p style={{ fontSize: '13px', opacity: 0.7, margin: '2px 0 0' }}>Real-time compliance guidance powered by AI</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
              <Sparkles style={{ width: '14px', height: '14px', color: '#d4af37' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#d4af37' }}>Powered by EvidLY AI</span>
            </div>
          </div>

          {/* MODE TABS */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '16px' }}>
            {([
              { key: 'chat' as Mode, label: 'Chat', icon: <MessageSquare style={{ width: '14px', height: '14px' }} /> },
              { key: 'inspection' as Mode, label: 'Inspection Prep', icon: <ClipboardList style={{ width: '14px', height: '14px' }} /> },
              { key: 'document' as Mode, label: 'Document Analysis', icon: <FileSearch style={{ width: '14px', height: '14px' }} /> },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setMode(tab.key);
                  if (tab.key !== activeConv?.mode) {
                    setActiveConvId(null);
                    setInspectionTemplate(null);
                    setInspectionEnded(false);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  background: mode === tab.key ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: mode === tab.key ? '#fff' : 'rgba(255,255,255,0.6)',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN AREA */}
        <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
          {/* LEFT SIDEBAR — Conversation History */}
          {showSidebar && (
            <div style={{ width: '220px', flexShrink: 0, background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                <button
                  onClick={startNewConversation}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
                    background: '#fff', fontSize: '12px', fontWeight: 600, color: '#374151',
                    cursor: 'pointer',
                  }}
                >
                  <Plus style={{ width: '14px', height: '14px' }} />
                  New Conversation
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setMode(conv.mode);
                    }}
                    style={{
                      padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', marginBottom: '2px',
                      background: activeConvId === conv.id ? '#eef4f8' : 'transparent',
                      border: activeConvId === conv.id ? '1px solid #b8d4e8' : '1px solid transparent',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.mode === 'inspection' ? '🔍 ' : conv.mode === 'document' ? '📄 ' : ''}{conv.title}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                      {fmtDate(conv.createdAt)} · {conv.messages.length} msgs
                    </div>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#94a3b8', padding: '16px 8px', textAlign: 'center' }}>
                    No conversations yet
                  </div>
                )}
              </div>
              {/* TODO: Persist conversations to Supabase in production */}
            </div>
          )}

          {/* TOGGLE SIDEBAR BUTTON */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            style={{
              alignSelf: 'flex-start', marginTop: '8px',
              width: '20px', height: '32px', borderRadius: '4px',
              border: '1px solid #e5e7eb', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            {showSidebar ? <ChevronLeft style={{ width: '12px', height: '12px', color: '#6b7280' }} /> : <ChevronRight style={{ width: '12px', height: '12px', color: '#6b7280' }} />}
          </button>

          {/* CHAT AREA */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', minWidth: 0 }}>
            {/* Messages */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f8f9fa' }}>
              {/* Inspection template selector */}
              {mode === 'inspection' && !activeConv && !inspectionTemplate && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px' }}>
                  <ClipboardList style={{ width: '48px', height: '48px', color: '#1e4d6b' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e4d6b', margin: 0, ...F }}>Inspection Prep</h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, textAlign: 'center', maxWidth: '400px', ...F }}>
                    Run a mock inspection to test your readiness. Choose a template to begin.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {INSPECTION_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => startInspection(t.id)}
                        style={{
                          padding: '16px 24px', borderRadius: '12px', border: '2px solid #e5e7eb',
                          background: '#fff', cursor: 'pointer', textAlign: 'center', minWidth: '160px',
                          ...F,
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#1e4d6b'; e.currentTarget.style.background = '#eef4f8'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}
                      >
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>{t.icon}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e4d6b' }}>{t.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Document upload area */}
              {mode === 'document' && !activeConv && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px' }}>
                  <FileSearch style={{ width: '48px', height: '48px', color: '#1e4d6b' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e4d6b', margin: 0, ...F }}>Document Analysis</h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, textAlign: 'center', maxWidth: '400px', ...F }}>
                    Upload a compliance document for AI-powered analysis — inspection reports, vendor certificates, HACCP plans, temperature logs.
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '16px 32px', borderRadius: '12px', border: '2px dashed #b8d4e8',
                      background: '#eef4f8', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: '10px', ...F,
                    }}
                  >
                    <Upload style={{ width: '20px', height: '20px', color: '#1e4d6b' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e4d6b' }}>Upload Document</span>
                  </button>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>PDF, PNG, JPG, or TXT — Max 10MB</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDocumentUpload(file);
                      e.target.value = '';
                    }}
                  />
                </div>
              )}

              {/* Chat starter cards */}
              {mode === 'chat' && messages.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#eef4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <Brain style={{ width: '28px', height: '28px', color: '#1e4d6b' }} />
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e4d6b', margin: '0 0 8px', ...F }}>How can I help you today?</h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px', ...F }}>Ask about compliance, food safety, or your data.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxWidth: '600px', width: '100%' }}>
                    {STARTER_CARDS.map((card, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(card)}
                        style={{
                          textAlign: 'left', padding: '12px 14px', borderRadius: '10px',
                          border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer',
                          fontSize: '13px', color: '#374151', ...F,
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#1e4d6b'; e.currentTarget.style.background = '#f0f7fb'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}
                      >
                        <span style={{ color: '#d4af37', marginRight: '6px' }}>✦</span>
                        {card}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message thread */}
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1e4d6b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px', flexShrink: 0, marginTop: '4px' }}>
                      <Brain style={{ width: '16px', height: '16px', color: '#fff' }} />
                    </div>
                  )}
                  <div style={{ maxWidth: '75%' }}>
                    <div
                      style={{
                        padding: '12px 16px', borderRadius: '16px',
                        ...(msg.role === 'user'
                          ? { background: '#1e4d6b', color: '#fff', borderBottomRightRadius: '4px' }
                          : { background: '#fff', color: '#1e293b', border: '1px solid #e5e7eb', borderBottomLeftRadius: '4px' }),
                      }}
                    >
                      {msg.role === 'assistant' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e4d6b' }}>EvidLY AI</span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>·</span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{fmtTime(msg.timestamp)}</span>
                        </div>
                      )}
                      <div
                        style={{ fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-line' }}
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                      />
                    </div>
                    {msg.role === 'user' && (
                      <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'right', marginTop: '4px' }}>{fmtTime(msg.timestamp)}</div>
                    )}

                    {/* Action items button */}
                    {msg.hasActions && msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCreateActions(msg.content)}
                        style={{
                          marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '6px 14px', borderRadius: '8px', border: '1px solid #d4af37',
                          background: '#fffbeb', fontSize: '12px', fontWeight: 600, color: '#92400e',
                          cursor: 'pointer', ...F,
                        }}
                      >
                        <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                        Create Action Items
                      </button>
                    )}

                    {/* Suggestions */}
                    {msg.suggestions && msg.suggestions.length > 0 && msg.role === 'assistant' && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                        {msg.suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(s)}
                            style={{
                              padding: '5px 12px', borderRadius: '16px', border: '1px solid #d1d5db',
                              background: '#fff', fontSize: '11px', fontWeight: 500, color: '#1e4d6b',
                              cursor: 'pointer', ...F,
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#eef4f8'; e.currentTarget.style.borderColor = '#1e4d6b'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div style={{ display: 'flex', marginBottom: '16px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1e4d6b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px', flexShrink: 0 }}>
                    <Brain style={{ width: '16px', height: '16px', color: '#fff' }} />
                  </div>
                  <div style={{ padding: '14px 18px', borderRadius: '16px', background: '#fff', border: '1px solid #e5e7eb', borderBottomLeftRadius: '4px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {[0, 150, 300].map((delay) => (
                        <div key={delay} className="animate-bounce" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1e4d6b', animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (mode === 'inspection' && activeConv && !inspectionEnded) {
                  handleInspectionAnswer(input);
                } else {
                  sendMessage(input);
                }
              }}
              style={{ borderTop: '1px solid #e5e7eb', background: '#fff', padding: '12px 16px' }}
            >
              {/* Upload button for document mode */}
              {mode === 'document' && activeConv && (
                <div style={{ marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
                      background: '#f8fafc', fontSize: '12px', color: '#6b7280',
                      cursor: 'pointer', ...F,
                    }}
                  >
                    <Upload style={{ width: '14px', height: '14px' }} />
                    Upload another document
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDocumentUpload(file);
                      e.target.value = '';
                    }}
                  />
                </div>
              )}

              {/* Inspection end button */}
              {mode === 'inspection' && activeConv && !inspectionEnded && (
                <div style={{ marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectionEnded(true);
                      const total = inspectionScore.asked;
                      const pct = total > 0 ? Math.round((inspectionScore.passed / total) * 100) : 0;
                      addMessage(activeConvId!, {
                        id: uid(), role: 'assistant',
                        content: `**Mock Inspection Ended Early**\n\nResults so far:\n• Questions: ${total}\n• Passed: ${inspectionScore.passed}\n• Needs Improvement: ${inspectionScore.needsImprovement}\n• Failed: ${inspectionScore.failed}\n• Readiness: **${pct}%**`,
                        timestamp: Date.now(),
                      });
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '8px', border: '1px solid #dc2626',
                      background: '#fef2f2', fontSize: '12px', color: '#dc2626',
                      cursor: 'pointer', fontWeight: 600, ...F,
                    }}
                  >
                    End Inspection
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    mode === 'inspection' && !inspectionEnded ? 'Type your answer...' :
                    mode === 'document' ? 'Ask about the uploaded document...' :
                    'Ask about compliance, food safety, or your data...'
                  }
                  style={{
                    flex: 1, padding: '11px 16px', borderRadius: '10px',
                    border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', ...F,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1e4d6b'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; }}
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  style={{
                    width: '42px', height: '42px', borderRadius: '10px', border: 'none',
                    background: (!input.trim() || isTyping) ? '#cbd5e1' : '#1e4d6b',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: (!input.trim() || isTyping) ? 'default' : 'pointer',
                  }}
                >
                  <Send style={{ width: '18px', height: '18px' }} />
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT SIDEBAR — Context Panel */}
          <button
            onClick={() => setShowContextPanel(!showContextPanel)}
            style={{
              alignSelf: 'flex-start', marginTop: '8px',
              width: '20px', height: '32px', borderRadius: '4px',
              border: '1px solid #e5e7eb', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            {showContextPanel ? <ChevronRight style={{ width: '12px', height: '12px', color: '#6b7280' }} /> : <ChevronLeft style={{ width: '12px', height: '12px', color: '#6b7280' }} />}
          </button>

          {showContextPanel && (
            <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
              {/* Compliance Snapshot */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e4d6b', marginBottom: '12px', ...F }}>Compliance Snapshot</div>
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto',
                    border: `4px solid ${context.overallScore >= 90 ? '#22c55e' : context.overallScore >= 75 ? '#eab308' : context.overallScore >= 60 ? '#f59e0b' : '#ef4444'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#1e4d6b' }}>{context.overallScore}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Overall Score</div>
                </div>
                {context.locations.map((loc) => (
                  <div key={loc.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: '11px', color: '#374151', fontWeight: 500 }}>{loc.name}</span>
                    <span style={{
                      fontSize: '11px', fontWeight: 700,
                      color: loc.score >= 90 ? '#22c55e' : loc.score >= 75 ? '#eab308' : loc.score >= 60 ? '#f59e0b' : '#ef4444',
                    }}>{loc.score}%</span>
                  </div>
                ))}
              </div>

              {/* Inspection Scorecard — only in inspection mode */}
              {mode === 'inspection' && activeConv && (
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e4d6b', marginBottom: '10px', ...F }}>Inspection Score</div>
                  {[
                    { label: 'Asked', value: inspectionScore.asked, color: '#1e4d6b' },
                    { label: 'Passed', value: inspectionScore.passed, color: '#22c55e' },
                    { label: 'Needs Improvement', value: inspectionScore.needsImprovement, color: '#d4af37' },
                    { label: 'Failed', value: inspectionScore.failed, color: '#dc2626' },
                  ].map((row) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{row.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Alerts */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e4d6b', marginBottom: '10px', ...F }}>Recent Alerts</div>
                {context.recentAlerts.map((alert, i) => (
                  <div key={i} style={{ fontSize: '11px', color: '#dc2626', padding: '4px 0', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
                    ⚠ {alert}
                  </div>
                ))}
              </div>

              {/* Upcoming Deadlines */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e4d6b', marginBottom: '10px', ...F }}>Upcoming Deadlines</div>
                {context.upcomingDeadlines.map((d, i) => (
                  <div key={i} style={{ fontSize: '11px', color: '#6b7280', padding: '4px 0', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
                    📅 {d}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ACTION ITEMS MODAL */}
      {showActionModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} onClick={() => setShowActionModal(false)} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#1e4d6b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 style={{ width: '18px', height: '18px', color: '#fff' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0, ...F }}>Create Action Items</h3>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0', ...F }}>{pendingActions.length} items extracted from AI response</p>
                  </div>
                  <button onClick={() => setShowActionModal(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                    <X style={{ width: '18px', height: '18px', color: '#6b7280' }} />
                  </button>
                </div>
              </div>

              {!actionSuccess ? (
                <>
                  <div style={{ padding: '20px 24px' }}>
                    {pendingActions.map((action, i) => (
                      <div key={i} style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e5e7eb', marginBottom: '10px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '10px', ...F }}>{action}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Priority</label>
                            <select style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', ...F }}>
                              <option>Normal</option>
                              <option>Low</option>
                              <option>High</option>
                              <option>Urgent</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Assignee</label>
                            <select style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', ...F }}>
                              <option value="">Select...</option>
                              {TEAM_MEMBERS.map((m) => <option key={m}>{m}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Due Date</label>
                            <input type="date" style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', ...F }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Location</label>
                            <select style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', ...F }}>
                              <option>Downtown Kitchen</option>
                              <option>Airport Cafe</option>
                              <option>University Dining</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setShowActionModal(false)}
                      style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer', ...F }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Wire to Supabase to persist action items
                        setActionSuccess(true);
                      }}
                      style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#1e4d6b', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer', ...F }}
                    >
                      Add to Action Center
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle2 style={{ width: '24px', height: '24px', color: '#22c55e' }} />
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px', ...F }}>Action Items Created!</h4>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px', ...F }}>
                    {pendingActions.length} items have been added to your Action Center.
                  </p>
                  <button
                    onClick={() => setShowActionModal(false)}
                    style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#1e4d6b', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer', ...F }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default AIAdvisor;
