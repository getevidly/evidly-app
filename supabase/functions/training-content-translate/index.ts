/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

interface TranslateRequest {
  lesson_id: string;
  target_language: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish',
  fr: 'French',
  zh: 'Mandarin Chinese',
  vi: 'Vietnamese',
  ko: 'Korean',
  tl: 'Tagalog',
};

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const { lesson_id, target_language }: TranslateRequest = await req.json();

  const langName = LANGUAGE_NAMES[target_language] || target_language;

  // Get lesson content
  const { data: lesson, error } = await supabase
    .from('training_lessons')
    .select('id, module_id, title, content_body, content_type, sort_order, estimated_duration_min')
    .eq('id', lesson_id)
    .single();

  if (error || !lesson) {
    return new Response(JSON.stringify({ error: 'Lesson not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  if (!lesson.content_body) {
    return new Response(JSON.stringify({ error: 'Lesson has no text content to translate' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Check if translation already exists
  const { data: existing } = await supabase
    .from('training_lessons')
    .select('id')
    .eq('module_id', lesson.module_id)
    .eq('sort_order', lesson.sort_order)
    .ilike('title', `%[${target_language.toUpperCase()}]%`)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ error: 'Translation already exists', lesson_id: existing.id }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  }

  if (!anthropicKey) {
    return new Response(JSON.stringify({
      error: 'Translation requires ANTHROPIC_API_KEY',
      demo_mode: true,
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  // Translate with Claude
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Translate the following food safety training content from English to ${langName}.

Maintain all formatting (bullet points, numbered lists, headings).
Use food service terminology appropriate for kitchen staff.
Keep language simple, clear, and professional.
Do NOT add any notes or commentary — return only the translated content.

Title to translate: ${lesson.title}

Content to translate:
${lesson.content_body}`,
      }],
    }),
  });

  const result = await response.json();
  const aiText = result.content?.[0]?.text || '';

  if (!aiText) {
    return new Response(JSON.stringify({ error: 'Translation failed — empty response' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Extract translated title (first line) and body
  const lines = aiText.split('\n');
  const translatedTitle = lines[0].trim() || `${lesson.title} [${target_language.toUpperCase()}]`;
  const translatedBody = lines.slice(1).join('\n').trim() || aiText;

  // Save as new lesson (flagged for review)
  const { data: newLesson } = await supabase
    .from('training_lessons')
    .insert({
      module_id: lesson.module_id,
      title: `${translatedTitle} [${target_language.toUpperCase()}]`,
      content_type: lesson.content_type,
      content_body: translatedBody,
      sort_order: lesson.sort_order,
      estimated_duration_min: lesson.estimated_duration_min,
      is_active: false, // Flagged for human review before activation
    })
    .select()
    .single();

  return new Response(JSON.stringify({
    success: true,
    original_lesson_id: lesson_id,
    translated_lesson_id: newLesson?.id,
    target_language,
    language_name: langName,
    needs_review: true,
    tokens_used: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
  }), { headers: { 'Content-Type': 'application/json' } });
});
