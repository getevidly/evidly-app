/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

interface CompanionRequest {
  enrollment_id: string;
  message: string;
  interaction_type: 'question' | 'quiz_gen' | 'weak_area' | 'translate' | 'explain';
  context_module_id?: string;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const body: CompanionRequest = await req.json();

  // Get enrollment context
  const { data: enrollment, error: enrollErr } = await supabase
    .from('training_enrollments')
    .select('*, training_courses(title, category, description)')
    .eq('id', body.enrollment_id)
    .single();

  if (enrollErr || !enrollment) {
    return new Response(JSON.stringify({ error: 'Enrollment not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const course = (enrollment as any).training_courses;

  // Get module context if provided
  let moduleContext = '';
  if (body.context_module_id) {
    const { data: mod } = await supabase
      .from('training_modules')
      .select('title, description')
      .eq('id', body.context_module_id)
      .single();
    if (mod) moduleContext = `\nCurrent module: ${mod.title} — ${mod.description}`;
  }

  // Get weak areas from quiz attempts
  const { data: attempts } = await supabase
    .from('training_quiz_attempts')
    .select('module_id, score_percent, passed')
    .eq('enrollment_id', body.enrollment_id);

  const weakModules = (attempts || [])
    .filter(a => !a.passed || a.score_percent < 80)
    .map(a => a.module_id)
    .filter(Boolean);

  // Build system prompt
  const systemPrompt = `You are a helpful food safety and compliance training assistant for EvidLY.
Course: ${course.title}
Category: ${course.category}
Description: ${course.description}${moduleContext}
${weakModules.length > 0 ? `\nThe student has struggled with modules: ${weakModules.join(', ')}` : ''}

Guidelines:
- Answer questions about food safety, fire safety, and compliance topics
- Be concise but thorough — target a kitchen worker reading on break
- Use simple language, avoid jargon unless defining it
- For quiz generation, create 3-5 multiple choice questions
- For weak area analysis, identify specific topics to review
- For translation, provide the content in the requested language
- Always be encouraging and supportive`;

  let aiResponse = '';
  let tokensUsed = 0;

  if (anthropicKey) {
    // Call Claude API
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
    // Fallback without API key
    aiResponse = `[AI Study Companion — Demo Mode]\n\nI'd be happy to help you with "${course.title}"! In production, this uses the Claude API to provide contextual answers about your training material.\n\nYour question: "${body.message}"\n\nTo enable AI responses, configure the ANTHROPIC_API_KEY environment variable.`;
    tokensUsed = 0;
  }

  // Log interaction
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
  }), { headers: { 'Content-Type': 'application/json' } });
});
