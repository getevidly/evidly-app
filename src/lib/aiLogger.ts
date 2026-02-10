/**
 * AI Interaction Logger — Flywheel data collection
 *
 * Logs every AI interaction for improvement and analytics.
 * In demo mode, logs to localStorage. In production, logs to Supabase.
 *
 * Tracks:
 * - query, response, user feedback (helpful/not helpful)
 * - tokens_used, model_used, latency_ms
 * - which insights were actioned vs dismissed
 * - corrective action approval rates
 */

export interface AiInteraction {
  interaction_type: 'chat' | 'inspection_prep' | 'document_analysis' | 'corrective_draft' | 'pattern_alert' | 'digest';
  query?: string;
  response?: string;
  feedback?: 'helpful' | 'not_helpful' | 'neutral';
  tokens_used?: number;
  model_used?: string;
  latency_ms?: number;
  location_id?: string;
}

const LOG_KEY = 'evidly_ai_interaction_logs';
const METRICS_KEY = 'evidly_ai_metrics';

interface AiMetrics {
  total_chats: number;
  total_inspections: number;
  total_doc_analyses: number;
  insights_actioned: number;
  insights_dismissed: number;
  corrective_approved: number;
  corrective_total: number;
  helpful_count: number;
  not_helpful_count: number;
}

/**
 * Log an AI interaction (demo mode — localStorage).
 * In production, this calls the Supabase ai_interaction_logs insert.
 */
export function logInteraction(interaction: AiInteraction, isDemoMode: boolean): void {
  if (isDemoMode) {
    // Store in localStorage for demo analytics
    try {
      const existing = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      existing.push({
        ...interaction,
        id: Math.random().toString(36).slice(2, 10),
        created_at: new Date().toISOString(),
      });
      // Keep only last 200 interactions
      if (existing.length > 200) existing.splice(0, existing.length - 200);
      localStorage.setItem(LOG_KEY, JSON.stringify(existing));
    } catch { /* ignore storage errors */ }

    // Update metrics
    updateMetrics(interaction);
    return;
  }

  // Production: fire-and-forget Supabase insert
  import('../lib/supabase').then(({ supabase }) => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('ai_interaction_logs').insert({
        user_id: user.id,
        location_id: interaction.location_id || null,
        interaction_type: interaction.interaction_type,
        query: interaction.query?.slice(0, 5000),
        response: interaction.response?.slice(0, 5000),
        feedback: interaction.feedback || null,
        tokens_used: interaction.tokens_used || 0,
        model_used: interaction.model_used || null,
        latency_ms: interaction.latency_ms || null,
      }).then(({ error }) => {
        if (error) console.error('[aiLogger] Insert error:', error);
      });
    });
  });
}

/**
 * Submit feedback for an existing interaction.
 */
export function logFeedback(interactionId: string, feedback: 'helpful' | 'not_helpful', isDemoMode: boolean): void {
  if (isDemoMode) {
    try {
      const existing = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      const idx = existing.findIndex((e: any) => e.id === interactionId);
      if (idx >= 0) {
        existing[idx].feedback = feedback;
        localStorage.setItem(LOG_KEY, JSON.stringify(existing));
      }
    } catch { /* ignore */ }

    const metrics = getMetrics();
    if (feedback === 'helpful') metrics.helpful_count++;
    else metrics.not_helpful_count++;
    localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
    return;
  }

  // Production: update the interaction log
  import('../lib/supabase').then(({ supabase }) => {
    supabase.from('ai_interaction_logs')
      .update({ feedback })
      .eq('id', interactionId)
      .then(({ error }) => {
        if (error) console.error('[aiLogger] Feedback error:', error);
      });
  });
}

/**
 * Track insight actions (actioned vs dismissed).
 */
export function logInsightAction(action: 'actioned' | 'dismissed', isDemoMode: boolean): void {
  const metrics = getMetrics();
  if (action === 'actioned') metrics.insights_actioned++;
  else metrics.insights_dismissed++;
  localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));

  // Production would update ai_insights table status
}

/**
 * Track corrective action approval rate.
 */
export function logCorrectiveAction(approved: boolean, isDemoMode: boolean): void {
  const metrics = getMetrics();
  metrics.corrective_total++;
  if (approved) metrics.corrective_approved++;
  localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
}

function updateMetrics(interaction: AiInteraction): void {
  const metrics = getMetrics();
  switch (interaction.interaction_type) {
    case 'chat': metrics.total_chats++; break;
    case 'inspection_prep': metrics.total_inspections++; break;
    case 'document_analysis': metrics.total_doc_analyses++; break;
  }
  localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
}

export function getMetrics(): AiMetrics {
  try {
    const raw = localStorage.getItem(METRICS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    total_chats: 0,
    total_inspections: 0,
    total_doc_analyses: 0,
    insights_actioned: 0,
    insights_dismissed: 0,
    corrective_approved: 0,
    corrective_total: 0,
    helpful_count: 0,
    not_helpful_count: 0,
  };
}

export function getInteractionLogs(): any[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}
