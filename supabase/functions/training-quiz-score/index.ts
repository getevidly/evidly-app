/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface QuizSubmission {
  enrollment_id: string;
  module_id?: string;
  course_id?: string;
  answers: { question_id: string; selected: number | number[] }[];
  time_spent_seconds: number;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const body: QuizSubmission = await req.json();

  // Get enrollment + course passing score
  const { data: enrollment, error: enrollErr } = await supabase
    .from('training_enrollments')
    .select('id, course_id, attempt_count, training_courses(passing_score_percent, max_attempts, cooldown_hours)')
    .eq('id', body.enrollment_id)
    .single();

  if (enrollErr || !enrollment) {
    return new Response(JSON.stringify({ error: 'Enrollment not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const course = (enrollment as any).training_courses;
  const passingScore = course.passing_score_percent;

  // Check cooldown
  if (course.cooldown_hours > 0) {
    const { data: lastAttempt } = await supabase
      .from('training_quiz_attempts')
      .select('completed_at')
      .eq('enrollment_id', body.enrollment_id)
      .eq('module_id', body.module_id || null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAttempt) {
      const cooldownEnd = new Date(lastAttempt.completed_at).getTime() + course.cooldown_hours * 3600000;
      if (Date.now() < cooldownEnd) {
        return new Response(JSON.stringify({
          error: 'Cooldown period active',
          retry_after: new Date(cooldownEnd).toISOString(),
        }), { status: 429, headers: { 'Content-Type': 'application/json' } });
      }
    }
  }

  // Fetch questions and score
  const questionIds = body.answers.map(a => a.question_id);
  const { data: questions } = await supabase
    .from('training_questions')
    .select('id, correct_answer')
    .in('id', questionIds);

  if (!questions || questions.length === 0) {
    return new Response(JSON.stringify({ error: 'No questions found' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const correctMap = new Map(questions.map(q => [q.id, q.correct_answer]));
  let correct = 0;
  const gradedAnswers = body.answers.map(a => {
    const expected = correctMap.get(a.question_id);
    const isCorrect = JSON.stringify(a.selected) === JSON.stringify(expected);
    if (isCorrect) correct++;
    return { ...a, correct: isCorrect };
  });

  const total = body.answers.length;
  const scorePercent = Math.round((correct / total) * 100);
  const passed = scorePercent >= passingScore;

  // Get attempt number
  const { count: prevAttempts } = await supabase
    .from('training_quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('enrollment_id', body.enrollment_id)
    .eq(body.module_id ? 'module_id' : 'course_id', body.module_id || body.course_id || '');

  const attemptNumber = (prevAttempts || 0) + 1;

  // Save attempt
  const { data: attempt } = await supabase
    .from('training_quiz_attempts')
    .insert({
      enrollment_id: body.enrollment_id,
      module_id: body.module_id || null,
      course_id: body.course_id || null,
      attempt_number: attemptNumber,
      score_percent: scorePercent,
      passed,
      questions_total: total,
      questions_correct: correct,
      answers: gradedAnswers,
      time_spent_seconds: body.time_spent_seconds,
    })
    .select()
    .single();

  // If final exam passed, update enrollment to completed
  if (passed && body.course_id) {
    await supabase
      .from('training_enrollments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        score_percent: scorePercent,
        progress_percent: 100,
      })
      .eq('id', body.enrollment_id);
  }

  // Update attempt count
  await supabase
    .from('training_enrollments')
    .update({ attempt_count: attemptNumber })
    .eq('id', body.enrollment_id);

  return new Response(JSON.stringify({
    attempt_id: attempt?.id,
    score_percent: scorePercent,
    passed,
    questions_correct: correct,
    questions_total: total,
    attempt_number: attemptNumber,
    passing_score: passingScore,
  }), { headers: { 'Content-Type': 'application/json' } });
});
