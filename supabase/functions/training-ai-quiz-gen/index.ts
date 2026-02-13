/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

interface QuizGenRequest {
  module_id: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const body: QuizGenRequest = await req.json();
  const count = body.count || 5;
  const difficulty = body.difficulty || 'medium';
  const language = body.language || 'en';

  // Pull module + lesson content as context
  const { data: mod } = await supabase
    .from('training_modules')
    .select('title, description, training_lessons(title, content_body)')
    .eq('id', body.module_id)
    .single();

  if (!mod) {
    return new Response(JSON.stringify({ error: 'Module not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const lessons = ((mod as any).training_lessons || [])
    .map((l: any) => `### ${l.title}\n${l.content_body || ''}`)
    .join('\n\n');

  const contentContext = `Module: ${mod.title}\nDescription: ${mod.description}\n\n${lessons}`;

  if (!anthropicKey) {
    // Demo fallback: return pre-built practice questions
    const demoQuestions = Array.from({ length: count }, (_, i) => ({
      id: `practice-${i + 1}`,
      question: `Practice question ${i + 1} about ${mod.title} (demo mode — configure ANTHROPIC_API_KEY for AI-generated questions)`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_index: 0,
      explanation: 'This is a demo question. Enable the Claude API for real AI-generated practice questions.',
      difficulty,
    }));

    return new Response(JSON.stringify({
      questions: demoQuestions,
      module_title: mod.title,
      ai_generated: false,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  const languageInstruction = language !== 'en'
    ? `Generate all questions and answers in ${language === 'es' ? 'Spanish' : language}.`
    : '';

  const prompt = `Generate ${count} ${difficulty} multiple-choice questions about the following food safety training content. Each question must have exactly 4 options with exactly 1 correct answer. Include a brief explanation for the correct answer. Only generate questions based on the provided training content — do not reference regulations or facts not present in the material.

${languageInstruction}

Return ONLY a valid JSON array with this exact structure:
[
  {
    "question": "question text here",
    "options": ["option A", "option B", "option C", "option D"],
    "correct_index": 0,
    "explanation": "brief explanation of correct answer"
  }
]

Training content:
${contentContext.slice(0, 6000)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const result = await response.json();
  const aiText = result.content?.[0]?.text || '[]';

  // Parse JSON from response
  let questions: any[] = [];
  try {
    const jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      questions = JSON.parse(jsonMatch[0]);
    }
  } catch {
    return new Response(JSON.stringify({
      error: 'Failed to parse AI response',
      raw: aiText.slice(0, 500),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Validate structure
  questions = questions
    .filter(q => q.question && Array.isArray(q.options) && q.options.length >= 2 && typeof q.correct_index === 'number')
    .map((q, i) => ({
      id: `practice-${Date.now()}-${i}`,
      ...q,
      difficulty,
    }))
    .slice(0, count);

  return new Response(JSON.stringify({
    questions,
    module_title: mod.title,
    ai_generated: true,
    tokens_used: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
  }), { headers: { 'Content-Type': 'application/json' } });
});
