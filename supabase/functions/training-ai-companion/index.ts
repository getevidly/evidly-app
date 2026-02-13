/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

const DAILY_LIMIT = 20;

interface CompanionRequest {
  enrollment_id: string;
  employee_id: string;
  message: string;
  interaction_type: 'question' | 'quiz_gen' | 'weak_area' | 'translate' | 'explain';
  context_module_id?: string;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const body: CompanionRequest = await req.json();

  // ── Rate limit: 20 questions per employee per day ──────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: todayCount } = await supabase
    .from('training_ai_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('enrollment_id', body.enrollment_id)
    .gte('created_at', todayStart.toISOString());

  if ((todayCount || 0) >= DAILY_LIMIT) {
    return new Response(JSON.stringify({
      error: 'Daily AI question limit reached',
      limit: DAILY_LIMIT,
      used: todayCount,
      resets_at: new Date(todayStart.getTime() + 86400000).toISOString(),
    }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }

  // ── Get enrollment + course context ────────────────────────────
  const { data: enrollment, error: enrollErr } = await supabase
    .from('training_enrollments')
    .select('*, training_courses(title, category, description)')
    .eq('id', body.enrollment_id)
    .single();

  if (enrollErr || !enrollment) {
    return new Response(JSON.stringify({ error: 'Enrollment not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const course = (enrollment as any).training_courses;

  // ── Pull module + lesson content for context ───────────────────
  let moduleContext = '';
  if (body.context_module_id) {
    const { data: mod } = await supabase
      .from('training_modules')
      .select('title, description, training_lessons(title, content_body)')
      .eq('id', body.context_module_id)
      .single();

    if (mod) {
      const lessonContent = ((mod as any).training_lessons || [])
        .map((l: any) => `- ${l.title}: ${(l.content_body || '').slice(0, 500)}`)
        .join('\n');
      moduleContext = `\nCurrent module: ${mod.title} — ${mod.description}\n\nModule lesson content:\n${lessonContent}`;
    }
  }

  // ── Get weak areas from quiz history ───────────────────────────
  const { data: attempts } = await supabase
    .from('training_quiz_attempts')
    .select('module_id, score_percent, passed, training_modules(title)')
    .eq('enrollment_id', body.enrollment_id);

  const weakAreas = (attempts || [])
    .filter(a => !a.passed || a.score_percent < 80)
    .map(a => `${(a as any).training_modules?.title || a.module_id} (${a.score_percent}%)`)
    .filter(Boolean);

  // ── Build system prompt ────────────────────────────────────────
  const systemPrompt = `You are a food safety and compliance training assistant for EvidLY, a restaurant compliance platform.

Course: ${course.title}
Category: ${course.category}
Description: ${course.description}${moduleContext}
${weakAreas.length > 0 ? `\nAreas the student has struggled with: ${weakAreas.join(', ')}` : ''}

Guidelines:
- Answer questions using ONLY the training module content provided when available
- Keep answers simple, practical, and under 150 words
- Use examples relevant to commercial kitchens
- Respond in the same language the question was asked in
- Be encouraging and supportive — this person works in a kitchen and is learning on break
- If asked to generate quiz questions, create 3-5 multiple choice questions with answers
- If asked about weak areas, identify specific topics from failed quizzes to review
- Never make up food safety regulations — if unsure, say so
- This is training guidance only — not legal or regulatory advice`;

  let aiResponse = '';
  let tokensUsed = 0;

  if (anthropicKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: body.message }],
      }),
    });

    const result = await response.json();
    aiResponse = result.content?.[0]?.text || 'I apologize, I was unable to generate a response.';
    tokensUsed = (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0);
  } else {
    aiResponse = `[AI Study Companion — Demo Mode]\n\nI'd be happy to help you with "${course.title}"! In production, this uses the Claude API to provide contextual answers about your training material.\n\nYour question: "${body.message}"\n\nTo enable AI responses, configure the ANTHROPIC_API_KEY environment variable.`;
    tokensUsed = 0;
  }

  // ── Log interaction ────────────────────────────────────────────
  await supabase.from('training_ai_interactions').insert({
    enrollment_id: body.enrollment_id,
    interaction_type: body.interaction_type,
    user_message: body.message,
    ai_response: aiResponse,
    context_module_id: body.context_module_id || null,
    model_used: anthropicKey ? 'claude-sonnet-4-5-20250929' : 'demo-fallback',
    tokens_used: tokensUsed,
  });

  return new Response(JSON.stringify({
    response: aiResponse,
    interaction_type: body.interaction_type,
    tokens_used: tokensUsed,
    daily_usage: (todayCount || 0) + 1,
    daily_limit: DAILY_LIMIT,
  }), { headers: { 'Content-Type': 'application/json' } });
});
