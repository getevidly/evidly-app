/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AggregateRequest {
  organization_id?: string;
  location_id?: string;
  period_days?: number;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(supabaseUrl, serviceKey);
  const body: AggregateRequest = await req.json();
  const periodDays = body.period_days || 30;
  const since = new Date(Date.now() - periodDays * 86400000).toISOString();

  // ── Per-Location Stats ─────────────────────────────────────────
  const { data: allEnrollments } = await supabase
    .from('training_enrollments')
    .select('id, employee_id, course_id, location_id, status, score_percent, enrolled_at, completed_at, progress_percent');

  const enrollments = allEnrollments || [];

  const locationStats: Record<string, {
    location_id: string;
    total_enrolled: number;
    completed_this_period: number;
    in_progress: number;
    overdue: number;
    average_score: number;
    average_completion_days: number;
    pass_rate: number;
  }> = {};

  const courseStats: Record<string, {
    course_id: string;
    enrollment_count: number;
    completion_count: number;
    completion_rate: number;
    average_score: number;
    scores: number[];
  }> = {};

  for (const e of enrollments) {
    const locId = e.location_id || 'unknown';
    if (!locationStats[locId]) {
      locationStats[locId] = {
        location_id: locId,
        total_enrolled: 0,
        completed_this_period: 0,
        in_progress: 0,
        overdue: 0,
        average_score: 0,
        average_completion_days: 0,
        pass_rate: 0,
      };
    }
    const loc = locationStats[locId];
    loc.total_enrolled++;
    if (e.status === 'in_progress') loc.in_progress++;
    if (e.status === 'completed' && e.completed_at && e.completed_at >= since) loc.completed_this_period++;

    // Per-course stats
    const cId = e.course_id;
    if (!courseStats[cId]) {
      courseStats[cId] = { course_id: cId, enrollment_count: 0, completion_count: 0, completion_rate: 0, average_score: 0, scores: [] };
    }
    courseStats[cId].enrollment_count++;
    if (e.status === 'completed') {
      courseStats[cId].completion_count++;
      if (e.score_percent) courseStats[cId].scores.push(e.score_percent);
    }
  }

  // Finalize location averages
  for (const loc of Object.values(locationStats)) {
    const locEnrollments = enrollments.filter(e => (e.location_id || 'unknown') === loc.location_id);
    const completed = locEnrollments.filter(e => e.status === 'completed' && e.score_percent);
    loc.average_score = completed.length > 0
      ? Math.round(completed.reduce((s, e) => s + (e.score_percent || 0), 0) / completed.length)
      : 0;
    loc.pass_rate = locEnrollments.length > 0
      ? Math.round((completed.length / locEnrollments.length) * 100)
      : 0;

    const withDates = completed.filter(e => e.enrolled_at && e.completed_at);
    loc.average_completion_days = withDates.length > 0
      ? Math.round(withDates.reduce((s, e) => s + Math.ceil((new Date(e.completed_at!).getTime() - new Date(e.enrolled_at).getTime()) / 86400000), 0) / withDates.length)
      : 0;
  }

  // Finalize course stats
  for (const cs of Object.values(courseStats)) {
    cs.completion_rate = cs.enrollment_count > 0 ? Math.round((cs.completion_count / cs.enrollment_count) * 100) : 0;
    cs.average_score = cs.scores.length > 0 ? Math.round(cs.scores.reduce((a, b) => a + b, 0) / cs.scores.length) : 0;
  }

  // ── Knowledge Gap Analysis ─────────────────────────────────────
  const { data: quizAttempts } = await supabase
    .from('training_quiz_attempts')
    .select('module_id, score_percent, passed')
    .not('module_id', 'is', null);

  const moduleScores: Record<string, { total: number; sum: number; failed: number }> = {};
  for (const qa of quizAttempts || []) {
    const mId = qa.module_id!;
    if (!moduleScores[mId]) moduleScores[mId] = { total: 0, sum: 0, failed: 0 };
    moduleScores[mId].total++;
    moduleScores[mId].sum += qa.score_percent;
    if (!qa.passed) moduleScores[mId].failed++;
  }

  const knowledgeGaps = Object.entries(moduleScores)
    .map(([moduleId, stats]) => ({
      module_id: moduleId,
      average_score: Math.round(stats.sum / stats.total),
      attempts: stats.total,
      fail_rate: Math.round((stats.failed / stats.total) * 100),
    }))
    .filter(g => g.average_score < 70)
    .sort((a, b) => a.average_score - b.average_score);

  // ── Organization Summary ───────────────────────────────────────
  const totalEnrolled = enrollments.length;
  const totalCompleted = enrollments.filter(e => e.status === 'completed').length;
  const completedThisPeriod = enrollments.filter(e => e.status === 'completed' && e.completed_at && e.completed_at >= since).length;
  const inProgress = enrollments.filter(e => e.status === 'in_progress').length;
  const allScores = enrollments.filter(e => e.score_percent).map(e => e.score_percent!);
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  return new Response(JSON.stringify({
    aggregated_at: new Date().toISOString(),
    period: `Last ${periodDays} days`,
    organization_summary: {
      total_enrolled: totalEnrolled,
      total_completed: totalCompleted,
      completed_this_period: completedThisPeriod,
      in_progress: inProgress,
      overall_average_score: avgScore,
      overall_completion_rate: totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0,
    },
    by_location: Object.values(locationStats),
    by_course: Object.values(courseStats).map(({ scores, ...rest }) => rest),
    knowledge_gaps: knowledgeGaps,
  }), { headers: { 'Content-Type': 'application/json' } });
});
