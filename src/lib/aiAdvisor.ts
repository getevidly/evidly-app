/**
 * AI Advisor — Claude API integration
 *
 * Calls Claude API via /api/ai-advisor edge function.
 * In demo mode, uses hardcoded responses from getDemoResponse().
 * In production, sends full conversation history + compliance context.
 *
 * TODO: Set ANTHROPIC_API_KEY environment variable in Vercel/Supabase
 */

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  id: string;
  suggestions?: string[];
  hasActions?: boolean;
}

export interface ComplianceContext {
  orgName: string;
  locations: { name: string; score: number; operational: number; equipment: number; documentation: number }[];
  overallScore: number;
  recentAlerts: string[];
  overdueItems: string[];
  upcomingDeadlines: string[];
}

const DEMO_CONTEXT: ComplianceContext = {
  orgName: 'Pacific Coast Dining',
  overallScore: 76,
  locations: [
    { name: 'Downtown Kitchen', score: 92, operational: 95, equipment: 91, documentation: 89 },
    { name: 'Airport Cafe', score: 74, operational: 78, equipment: 70, documentation: 72 },
    { name: 'University Dining', score: 57, operational: 62, equipment: 55, documentation: 52 },
  ],
  recentAlerts: [
    'Airport Cafe Walk-in Cooler #2 above 41°F',
    'University Dining health permit expired',
    '3 missed temperature checks at Airport Cafe',
  ],
  overdueItems: [
    'Fire suppression inspection — University Dining (4 months overdue)',
    'Grease trap service — University Dining (2 months overdue)',
    'Fire suppression inspection — Airport Cafe',
    'Valley Fire COI expired — Airport Cafe',
  ],
  upcomingDeadlines: [
    'Hood cleaning — University Dining (Feb 15)',
    'Pest Control — Airport Cafe (Feb 28)',
    'Michael Torres Food Handler cert expires Feb 26',
  ],
};

export function getDemoContext(): ComplianceContext {
  return DEMO_CONTEXT;
}

function buildSystemPrompt(context: ComplianceContext, mode: 'chat' | 'inspection'): string {
  if (mode === 'inspection') {
    return `You are a health department inspector conducting a mock inspection for ${context.orgName}. Ask the user questions one at a time about their food safety practices, temperature controls, sanitation, pest control, and documentation. After each answer, score it (Pass/Needs Improvement/Fail) and explain why. At the end, give an overall readiness score and list areas to improve before the real inspection. Keep questions specific and practical.`;
  }

  const locSummary = context.locations
    .map((l) => `  - ${l.name}: Overall ${l.score}% (Ops ${l.operational}%, Equip ${l.equipment}%, Docs ${l.documentation}%)`)
    .join('\n');

  return `You are EvidLY's AI Compliance Advisor. You help commercial kitchen managers with food safety, fire safety, and vendor compliance. You have access to the user's compliance data, temperature logs, checklists, corrective actions, and vendor records. Be specific, actionable, and reference their actual data. Keep responses concise and professional. When recommending actions, format them as clear steps. If you identify action items, format each one on its own line starting with "Action:" followed by the action description.

COMPLIANCE CONTEXT:
Organization: ${context.orgName}
Overall Score: ${context.overallScore}%
Locations:
${locSummary}

Recent Alerts:
${context.recentAlerts.map((a) => `  - ${a}`).join('\n')}

Overdue Items:
${context.overdueItems.map((o) => `  - ${o}`).join('\n')}

Upcoming Deadlines:
${context.upcomingDeadlines.map((d) => `  - ${d}`).join('\n')}`;
}

/**
 * Call Claude API with streaming support via edge function.
 * Returns an async generator that yields text chunks.
 */
export async function* streamChatResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  context: ComplianceContext,
  mode: 'chat' | 'inspection' = 'chat',
): AsyncGenerator<string> {
  const systemPrompt = buildSystemPrompt(context, mode);

  const response = await fetch('/api/ai-advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'Unknown error');
    throw new Error(`AI API error: ${response.status} — ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            yield parsed.delta.text;
          } else if (parsed.text) {
            yield parsed.text;
          }
        } catch {
          // If it's raw text, yield it directly
          if (data.trim()) yield data;
        }
      }
    }
  }
}

/**
 * Generate contextual follow-up suggestions based on the AI response.
 */
export function generateSuggestions(response: string, mode: 'chat' | 'inspection'): string[] {
  if (mode === 'inspection') {
    return ['I understand, next question please', 'Can you explain what you\'re looking for?', 'Let me check that'];
  }

  const lower = response.toLowerCase();
  const suggestions: string[] = [];

  if (lower.includes('temperature') || lower.includes('temp log')) {
    suggestions.push('Show me the full temperature history');
    suggestions.push('Which staff members are responsible for temp checks?');
  }
  if (lower.includes('vendor') || lower.includes('certificate')) {
    suggestions.push('Send renewal reminders to these vendors');
    suggestions.push('Which vendor contracts are up for renewal?');
  }
  if (lower.includes('inspection') || lower.includes('ready')) {
    suggestions.push('Start a mock inspection drill');
    suggestions.push('What areas need the most improvement?');
  }
  if (lower.includes('action') || lower.includes('overdue')) {
    suggestions.push('Create action items from these recommendations');
    suggestions.push('Who should I assign these to?');
  }
  if (lower.includes('score') || lower.includes('compliance')) {
    suggestions.push('How can we improve our score fastest?');
    suggestions.push('Compare our locations side by side');
  }

  // Always offer at least 2 suggestions
  if (suggestions.length === 0) {
    suggestions.push('Tell me more about our compliance risks');
    suggestions.push('What should we prioritize this week?');
    suggestions.push('How do we compare to industry standards?');
  }

  return suggestions.slice(0, 3);
}

/**
 * Extract action items from an AI response.
 * Looks for lines starting with "Action:" or numbered items with action verbs.
 */
export function extractActionItems(response: string): string[] {
  const lines = response.split('\n');
  const actions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match "Action: ..."
    const actionMatch = trimmed.match(/^Action:\s*(.+)/i);
    if (actionMatch) {
      actions.push(actionMatch[1]);
      continue;
    }
    // Match numbered items with action verbs
    const numberedMatch = trimmed.match(/^\d+\.\s+\*?\*?(Complete|Schedule|Contact|Assign|Update|Review|Send|Create|Fix|Check|Ensure|Upload|Request|Renew|Register|Address|Implement)\b/i);
    if (numberedMatch) {
      actions.push(trimmed.replace(/^\d+\.\s+/, '').replace(/\*\*/g, ''));
    }
  }

  return actions;
}

/**
 * Parse markdown bold and other simple formatting for display.
 */
export function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:12px;">$1</code>');
}
