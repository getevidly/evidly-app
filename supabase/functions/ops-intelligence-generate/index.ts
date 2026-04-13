import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
import { createOrgNotification } from '../_shared/notify.ts';

let corsHeaders = getCorsHeaders(null);

/**
 * ops-intelligence-generate — SP8 Ops Intelligence
 *
 * Deterministic, rules-based insight generation.
 * Input: { organization_id } or cron (all active orgs).
 * Expires old insights, generates new batch, fires P1 notifications.
 */

const FOUR_SAFEGUARDS = ['hood_cleaning', 'fire_suppression', 'fire_alarm', 'sprinklers'];
const SAFEGUARD_LABELS: Record<string, string> = {
  hood_cleaning: 'Hood Cleaning',
  fire_suppression: 'Fire Suppression',
  fire_alarm: 'Fire Alarm',
  sprinklers: 'Sprinklers',
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

interface Insight {
  priority: number;
  category: string;
  title: string;
  body: string;
  source: string;
  action_text?: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

// ── Generators ───────────────────────────────────────────────

async function generatePSEInsights(orgId: string, supabase: ReturnType<typeof createClient>): Promise<Insight[]> {
  const insights: Insight[] = [];
  const { data: records } = await supabase
    .from('vendor_service_records')
    .select('safeguard_type, next_due_date, vendor_name')
    .eq('organization_id', orgId);

  if (!records) return insights;

  const latest: Record<string, { next_due_date: string; vendor_name: string }> = {};
  for (const r of records) {
    if (!latest[r.safeguard_type] || r.next_due_date > latest[r.safeguard_type].next_due_date) {
      latest[r.safeguard_type] = r;
    }
  }

  const missing = FOUR_SAFEGUARDS.filter(s => !latest[s]);
  const overdue = FOUR_SAFEGUARDS.filter(s => latest[s] && (daysUntil(latest[s].next_due_date) ?? 0) < 0);
  const dueSoon = FOUR_SAFEGUARDS.filter(s => {
    const d = latest[s] ? daysUntil(latest[s].next_due_date) : null;
    return d !== null && d >= 0 && d < 30;
  });

  if (missing.length > 0) {
    insights.push({
      priority: 1, category: 'pse_exposure',
      title: `${missing.length} PSE safeguard${missing.length > 1 ? 's' : ''} missing records`,
      body: `No service records for: ${missing.map(s => SAFEGUARD_LABELS[s]).join(', ')}.`,
      source: 'vendor_service_records', action_text: 'Add Service Records', action_url: '/vendors',
      metadata: { missing_types: missing },
    });
  }
  if (overdue.length > 0) {
    insights.push({
      priority: 1, category: 'pse_exposure',
      title: `${overdue.length} PSE service${overdue.length > 1 ? 's' : ''} overdue`,
      body: `Overdue: ${overdue.map(s => `${SAFEGUARD_LABELS[s]} (${Math.abs(daysUntil(latest[s].next_due_date)!)}d)`).join(', ')}.`,
      source: 'vendor_service_records', action_text: 'Review Services', action_url: '/vendors',
      metadata: { overdue_types: overdue },
    });
  }
  if (dueSoon.length > 0) {
    insights.push({
      priority: 2, category: 'pse_exposure',
      title: `${dueSoon.length} PSE service${dueSoon.length > 1 ? 's' : ''} due within 30 days`,
      body: `Upcoming: ${dueSoon.map(s => `${SAFEGUARD_LABELS[s]} (${daysUntil(latest[s].next_due_date)}d)`).join(', ')}.`,
      source: 'vendor_service_records', action_text: 'Schedule Service', action_url: '/vendors',
      metadata: { due_soon_types: dueSoon },
    });
  }
  if (missing.length === 0 && overdue.length === 0 && dueSoon.length === 0 && Object.keys(latest).length === 4) {
    insights.push({
      priority: 3, category: 'pse_exposure',
      title: 'All 4 PSE safeguards current',
      body: 'Hood cleaning, fire suppression, fire alarm, and sprinkler services are all up to date.',
      source: 'vendor_service_records', metadata: { all_current: true },
    });
  }
  return insights;
}

async function generateDocumentInsights(orgId: string, supabase: ReturnType<typeof createClient>): Promise<Insight[]> {
  const insights: Insight[] = [];
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, category, expiration_date')
    .eq('organization_id', orgId).eq('status', 'active')
    .not('expiration_date', 'is', null);

  if (!docs || docs.length === 0) return insights;

  const expired = docs.filter((d: { expiration_date: string }) => (daysUntil(d.expiration_date) ?? 0) < 0);
  const expiringSoon = docs.filter((d: { expiration_date: string }) => {
    const days = daysUntil(d.expiration_date);
    return days !== null && days >= 0 && days < 30;
  });

  if (expired.length > 0) {
    insights.push({
      priority: 1, category: 'document_currency',
      title: `${expired.length} document${expired.length > 1 ? 's' : ''} expired`,
      body: `Expired: ${expired.slice(0, 3).map((d: { title: string }) => d.title).join(', ')}${expired.length > 3 ? ` and ${expired.length - 3} more` : ''}.`,
      source: 'documents', action_text: 'Review Documents', action_url: '/documents',
      metadata: { expired_count: expired.length },
    });
  }
  if (expiringSoon.length > 0) {
    insights.push({
      priority: 2, category: 'document_currency',
      title: `${expiringSoon.length} document${expiringSoon.length > 1 ? 's' : ''} expiring within 30 days`,
      body: `Expiring: ${expiringSoon.slice(0, 3).map((d: { title: string; expiration_date: string }) => `${d.title} (${daysUntil(d.expiration_date)}d)`).join(', ')}${expiringSoon.length > 3 ? ` and ${expiringSoon.length - 3} more` : ''}.`,
      source: 'documents', action_text: 'Renew Documents', action_url: '/documents',
      metadata: { expiring_count: expiringSoon.length },
    });
  }
  return insights;
}

async function generateServiceInsights(orgId: string, supabase: ReturnType<typeof createClient>): Promise<Insight[]> {
  const insights: Insight[] = [];
  const { data: records } = await supabase
    .from('vendor_service_records')
    .select('id, safeguard_type, vendor_name, next_due_date')
    .eq('organization_id', orgId).not('next_due_date', 'is', null);

  if (!records || records.length === 0) return insights;

  const overdue = records.filter((r: { next_due_date: string }) => (daysUntil(r.next_due_date) ?? 0) < 0);
  const dueSoon = records.filter((r: { next_due_date: string }) => {
    const days = daysUntil(r.next_due_date);
    return days !== null && days >= 0 && days < 30;
  });

  if (overdue.length > 0) {
    insights.push({
      priority: 1, category: 'service_currency',
      title: `${overdue.length} vendor service${overdue.length > 1 ? 's' : ''} overdue`,
      body: `Overdue: ${overdue.slice(0, 3).map((r: { vendor_name: string; safeguard_type: string; next_due_date: string }) => `${r.vendor_name || SAFEGUARD_LABELS[r.safeguard_type] || r.safeguard_type} (${Math.abs(daysUntil(r.next_due_date)!)}d)`).join(', ')}${overdue.length > 3 ? ` and ${overdue.length - 3} more` : ''}.`,
      source: 'vendor_service_records', action_text: 'Schedule Services', action_url: '/vendors',
      metadata: { overdue_count: overdue.length },
    });
  }
  if (dueSoon.length > 0) {
    insights.push({
      priority: 2, category: 'service_currency',
      title: `${dueSoon.length} service${dueSoon.length > 1 ? 's' : ''} due within 30 days`,
      body: `Upcoming: ${dueSoon.slice(0, 3).map((r: { vendor_name: string; safeguard_type: string; next_due_date: string }) => `${r.vendor_name || SAFEGUARD_LABELS[r.safeguard_type] || r.safeguard_type} (${daysUntil(r.next_due_date)}d)`).join(', ')}${dueSoon.length > 3 ? ` and ${dueSoon.length - 3} more` : ''}.`,
      source: 'vendor_service_records', action_text: 'Review Schedule', action_url: '/vendors',
      metadata: { due_soon_count: dueSoon.length },
    });
  }
  return insights;
}

async function generateCAInsights(orgId: string, supabase: ReturnType<typeof createClient>): Promise<Insight[]> {
  const insights: Insight[] = [];
  const { data: actions } = await supabase
    .from('corrective_actions')
    .select('id, title, status, due_date, created_at, completed_at')
    .eq('organization_id', orgId);

  if (!actions || actions.length === 0) return insights;

  const open = actions.filter((a: { status: string }) => ['created', 'in_progress'].includes(a.status));
  const closedStatuses = ['completed', 'verified', 'closed'];

  const aged14 = open.filter((a: { created_at: string }) => (daysSince(a.created_at) ?? 0) > 14);
  const aged7 = open.filter((a: { created_at: string }) => {
    const d = daysSince(a.created_at);
    return d !== null && d > 7 && d <= 14;
  });

  if (aged14.length > 0) {
    insights.push({
      priority: 1, category: 'ca_aging',
      title: `${aged14.length} corrective action${aged14.length > 1 ? 's' : ''} open >14 days`,
      body: `Long-open CAs: ${aged14.slice(0, 3).map((a: { title: string; created_at: string }) => `${a.title || 'Untitled'} (${daysSince(a.created_at)}d)`).join(', ')}${aged14.length > 3 ? ` and ${aged14.length - 3} more` : ''}.`,
      source: 'corrective_actions', action_text: 'Review CAs', action_url: '/corrective-actions',
      metadata: { aged_14_count: aged14.length },
    });
  }
  if (aged7.length > 0) {
    insights.push({
      priority: 2, category: 'ca_aging',
      title: `${aged7.length} corrective action${aged7.length > 1 ? 's' : ''} open 7-14 days`,
      body: `Approaching 14-day threshold: ${aged7.slice(0, 3).map((a: { title: string }) => a.title || 'Untitled').join(', ')}${aged7.length > 3 ? ` and ${aged7.length - 3} more` : ''}.`,
      source: 'corrective_actions', action_text: 'View Actions', action_url: '/corrective-actions',
      metadata: { aged_7_count: aged7.length },
    });
  }

  const recent = actions.filter((a: { created_at: string }) => (daysSince(a.created_at) ?? 0) <= 90);
  if (recent.length >= 5) {
    const closed = recent.filter((a: { status: string }) => closedStatuses.includes(a.status)).length;
    const rate = Math.round((closed / recent.length) * 100);
    if (rate < 70) {
      insights.push({
        priority: 2, category: 'ca_aging',
        title: `CA closure rate at ${rate}% (below 70% target)`,
        body: `${closed} of ${recent.length} corrective actions closed in 90 days. Target is 70%+.`,
        source: 'corrective_actions', action_text: 'Improve Closure', action_url: '/corrective-actions',
        metadata: { closure_rate: rate },
      });
    }
  }
  return insights;
}

async function generateTempInsights(orgId: string, supabase: ReturnType<typeof createClient>): Promise<Insight[]> {
  const insights: Insight[] = [];
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: logs } = await supabase
    .from('temp_logs')
    .select('id, equipment_name, temperature, recorded_at, status')
    .eq('organization_id', orgId)
    .gte('recorded_at', fourteenDaysAgo)
    .order('recorded_at', { ascending: true });

  if (!logs || logs.length === 0) return insights;

  const recentLogs = logs.filter((l: { recorded_at: string }) => l.recorded_at >= sevenDaysAgo);
  const outOfRange = recentLogs.filter((l: { status: string }) => l.status === 'critical');

  if (outOfRange.length >= 3) {
    const equipNames = [...new Set(outOfRange.map((l: { equipment_name: string }) => l.equipment_name))].slice(0, 3);
    insights.push({
      priority: 1, category: 'temp_trend',
      title: `${outOfRange.length} out-of-range temp readings in 7 days`,
      body: `Equipment flagged: ${equipNames.join(', ')}. Investigate potential equipment failures.`,
      source: 'temp_logs', action_text: 'Review Temps', action_url: '/temperature',
      metadata: { oor_count: outOfRange.length },
    });
  }

  // 2°F drift detection
  const byEquipment: Record<string, Array<{ temperature: number; recorded_at: string }>> = {};
  for (const log of logs) {
    if (!byEquipment[log.equipment_name]) byEquipment[log.equipment_name] = [];
    byEquipment[log.equipment_name].push(log);
  }

  for (const [equip, equipLogs] of Object.entries(byEquipment)) {
    const week1 = equipLogs.filter(l => l.recorded_at < sevenDaysAgo);
    const week2 = equipLogs.filter(l => l.recorded_at >= sevenDaysAgo);
    if (week1.length >= 2 && week2.length >= 2) {
      const avg1 = week1.reduce((s, l) => s + Number(l.temperature), 0) / week1.length;
      const avg2 = week2.reduce((s, l) => s + Number(l.temperature), 0) / week2.length;
      if (Math.abs(avg2 - avg1) >= 2) {
        insights.push({
          priority: 2, category: 'temp_trend',
          title: `${equip}: ${avg2 > avg1 ? '+' : ''}${(avg2 - avg1).toFixed(1)}°F drift detected`,
          body: `Average temp shifted from ${avg1.toFixed(1)}°F to ${avg2.toFixed(1)}°F over 14 days.`,
          source: 'temp_logs', action_text: 'Check Equipment', action_url: '/temperature',
          metadata: { equipment: equip, avg_week1: avg1, avg_week2: avg2 },
        });
        break;
      }
    }
  }

  return insights;
}

async function generateChecklistInsights(orgId: string, supabase: ReturnType<typeof createClient>): Promise<Insight[]> {
  const insights: Insight[] = [];
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const twentyEightDaysAgo = new Date(Date.now() - 28 * 86400000).toISOString();

  const { data: checklists } = await supabase
    .from('checklists').select('id').eq('organization_id', orgId);
  if (!checklists || checklists.length === 0) return insights;

  const checklistIds = checklists.map((c: { id: string }) => c.id);
  const { data: completions } = await supabase
    .from('checklist_completions')
    .select('id, completed_by, completed_at')
    .in('checklist_id', checklistIds)
    .gte('completed_at', twentyEightDaysAgo)
    .order('completed_at', { ascending: true });

  if (!completions || completions.length === 0) return insights;

  const recent = completions.filter((c: { completed_at: string }) => c.completed_at >= fourteenDaysAgo);
  const previous = completions.filter((c: { completed_at: string }) => c.completed_at < fourteenDaysAgo);

  if (previous.length >= 5 && recent.length < previous.length * 0.9) {
    const dropPct = Math.round((1 - recent.length / previous.length) * 100);
    insights.push({
      priority: 1, category: 'checklist_trend',
      title: `Checklist completion dropped ${dropPct}% this period`,
      body: `${recent.length} completions in 14 days vs ${previous.length} in prior 14 days.`,
      source: 'checklist_completions', action_text: 'Review Checklists', action_url: '/checklists',
      metadata: { drop_pct: dropPct },
    });
  }

  if (recent.length >= 5) {
    const byPerson: Record<string, number> = {};
    for (const c of recent) {
      byPerson[c.completed_by] = (byPerson[c.completed_by] || 0) + 1;
    }
    const entries = Object.entries(byPerson);
    if (entries.length > 1) {
      const top = entries.sort((a, b) => b[1] - a[1])[0];
      const pct = Math.round((top[1] / recent.length) * 100);
      if (pct > 60) {
        insights.push({
          priority: 2, category: 'checklist_trend',
          title: `One team member completing ${pct}% of checklists`,
          body: `A single person completed ${top[1]} of ${recent.length} checklists in 14 days.`,
          source: 'checklist_completions', action_text: 'Review Team', action_url: '/team',
          metadata: { concentrated_user: top[0], pct },
        });
      }
    }
  }

  return insights;
}

async function generateCertInsights(orgId: string, supabase: ReturnType<typeof createClient>): Promise<Insight[]> {
  const insights: Insight[] = [];
  const { data: certs } = await supabase
    .from('employee_certifications')
    .select('id, certification_name, expiration_date, status, user_id')
    .eq('organization_id', orgId);

  if (!certs || certs.length === 0) return insights;

  const expired = certs.filter((c: { status: string; expiration_date: string }) =>
    c.status === 'expired' || (c.expiration_date && (daysUntil(c.expiration_date) ?? 0) < 0)
  );
  const expiringSoon = certs.filter((c: { expiration_date: string }) => {
    const days = c.expiration_date ? daysUntil(c.expiration_date) : null;
    return days !== null && days >= 0 && days < 60;
  });

  if (certs.length >= 4 && expired.length / certs.length > 0.25) {
    const pct = Math.round((expired.length / certs.length) * 100);
    insights.push({
      priority: 2, category: 'certification_gap',
      title: `${pct}% of team certifications expired`,
      body: `${expired.length} of ${certs.length} certifications are expired.`,
      source: 'employee_certifications', action_text: 'Renew Certs', action_url: '/dashboard/training',
      metadata: { expired_pct: pct },
    });
  }
  if (expiringSoon.length > 0) {
    insights.push({
      priority: 2, category: 'certification_gap',
      title: `${expiringSoon.length} certification${expiringSoon.length > 1 ? 's' : ''} expiring within 60 days`,
      body: `Upcoming: ${expiringSoon.slice(0, 3).map((c: { certification_name: string; expiration_date: string }) => `${c.certification_name} (${daysUntil(c.expiration_date)}d)`).join(', ')}${expiringSoon.length > 3 ? ` and ${expiringSoon.length - 3} more` : ''}.`,
      source: 'employee_certifications', action_text: 'Schedule Training', action_url: '/dashboard/training',
      metadata: { expiring_count: expiringSoon.length },
    });
  }
  return insights;
}

async function generateTrajectoryInsights(orgId: string, supabase: ReturnType<typeof createClient>): Promise<Insight[]> {
  const insights: Insight[] = [];
  const { data: snapshots } = await supabase
    .from('readiness_snapshots')
    .select('overall_score, snapshot_date')
    .eq('org_id', orgId)
    .order('snapshot_date', { ascending: false })
    .limit(8);

  if (!snapshots || snapshots.length < 3) return insights;

  const recent3 = snapshots.slice(0, 3).map((s: { overall_score: number }) => Number(s.overall_score));
  const avgRecent = recent3.reduce((s: number, v: number) => s + v, 0) / recent3.length;

  if (snapshots.length >= 6) {
    const older3 = snapshots.slice(3, 6).map((s: { overall_score: number }) => Number(s.overall_score));
    const avgOlder = older3.reduce((s: number, v: number) => s + v, 0) / older3.length;
    const diff = avgRecent - avgOlder;

    if (diff < -5) {
      insights.push({
        priority: 1, category: 'trajectory',
        title: `Readiness score declining (${diff.toFixed(1)} pts)`,
        body: `Average score dropped from ${avgOlder.toFixed(1)} to ${avgRecent.toFixed(1)}.`,
        source: 'readiness_snapshots', action_text: 'View Trajectory', action_url: '/insights/trajectory',
        metadata: { avg_recent: avgRecent, avg_older: avgOlder, diff },
      });
    } else if (diff > 5) {
      insights.push({
        priority: 3, category: 'trajectory',
        title: `Readiness score improving (+${diff.toFixed(1)} pts)`,
        body: `Average score rose from ${avgOlder.toFixed(1)} to ${avgRecent.toFixed(1)}.`,
        source: 'readiness_snapshots', action_text: 'View Trajectory', action_url: '/insights/trajectory',
        metadata: { avg_recent: avgRecent, avg_older: avgOlder, diff },
      });
    }
  }
  return insights;
}

async function generateSignalInsights(orgId: string, supabase: ReturnType<typeof createClient>): Promise<Insight[]> {
  const insights: Insight[] = [];
  const { data: locations } = await supabase
    .from('locations').select('city, state')
    .eq('organization_id', orgId).eq('status', 'active');
  if (!locations || locations.length === 0) return insights;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: signals } = await supabase
    .from('intelligence_signals')
    .select('id, title, ai_urgency, affected_counties, published_at, summary')
    .in('status', ['published', 'active'])
    .gte('published_at', thirtyDaysAgo)
    .order('published_at', { ascending: false }).limit(20);

  if (!signals || signals.length === 0) return insights;

  const orgCities = locations.map((l: { city: string }) => l.city?.toLowerCase()).filter(Boolean);
  const relevantSignals = signals.filter((s: { affected_counties: string[] }) => {
    if (!s.affected_counties || s.affected_counties.length === 0) return false;
    const counties = s.affected_counties.map((c: string) => c.toLowerCase());
    return orgCities.some((city: string) => counties.some((county: string) => county.includes(city) || city.includes(county)));
  });

  const critical = relevantSignals.filter((s: { ai_urgency: string }) => s.ai_urgency === 'critical');
  const high = relevantSignals.filter((s: { ai_urgency: string }) => s.ai_urgency === 'high');

  if (critical.length > 0) {
    insights.push({
      priority: 1, category: 'jurisdiction_signal',
      title: `Critical regulatory signal: ${critical[0].title}`,
      body: critical[0].summary || 'A critical regulatory change may affect your operations.',
      source: 'intelligence_signals', action_text: 'View Signal', action_url: '/insights/signals',
      metadata: { signal_id: critical[0].id, urgency: 'critical' },
    });
  }
  if (high.length > 0) {
    insights.push({
      priority: 2, category: 'jurisdiction_signal',
      title: `${high.length} high-urgency regulatory signal${high.length > 1 ? 's' : ''} in your area`,
      body: `Recent: ${high.slice(0, 2).map((s: { title: string }) => s.title).join('; ')}${high.length > 2 ? ` and ${high.length - 2} more` : ''}.`,
      source: 'intelligence_signals', action_text: 'Review Signals', action_url: '/insights/signals',
      metadata: { signal_count: high.length },
    });
  }
  return insights;
}

// ── Master generator ─────────────────────────────────────────

async function generateAllInsights(orgId: string, supabase: ReturnType<typeof createClient>): Promise<Insight[]> {
  const generators = [
    generatePSEInsights, generateDocumentInsights, generateServiceInsights,
    generateCAInsights, generateTempInsights, generateChecklistInsights,
    generateCertInsights, generateTrajectoryInsights, generateSignalInsights,
  ];

  const results = await Promise.allSettled(generators.map(fn => fn(orgId, supabase)));
  const all: Insight[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      all.push(...result.value);
    }
  }

  all.sort((a, b) => a.priority - b.priority);
  return all.slice(0, 10);
}

// ── Response helper ──────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Handler ──────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine target org(s)
    let orgIds: string[] = [];
    let body: { organization_id?: string } = {};

    try { body = await req.json(); } catch { /* cron — no body */ }

    if (body.organization_id) {
      orgIds = [body.organization_id];
    } else {
      // Cron mode: all active orgs
      const { data: orgs } = await supabase.from('organizations').select('id');
      orgIds = (orgs || []).map((o: { id: string }) => o.id);
    }

    let totalInserts = 0;
    let totalNotifications = 0;

    for (const orgId of orgIds) {
      // 1. Expire old insights
      await supabase
        .from('ops_intelligence_insights')
        .update({ status: 'dismissed' })
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString());

      // 2. Dismiss remaining active (new batch replaces old)
      await supabase
        .from('ops_intelligence_insights')
        .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
        .eq('organization_id', orgId)
        .eq('status', 'active');

      // 3. Generate new insights
      const insights = await generateAllInsights(orgId, supabase);
      if (insights.length === 0) continue;

      // 4. Insert new batch
      const rows = insights.map(i => ({
        organization_id: orgId,
        priority: i.priority,
        category: i.category,
        title: i.title,
        body: i.body,
        source: i.source,
        action_text: i.action_text || null,
        action_url: i.action_url || null,
        metadata: i.metadata || {},
      }));

      const { data: inserted } = await supabase
        .from('ops_intelligence_insights')
        .insert(rows)
        .select('id, priority, title');

      totalInserts += inserted?.length || 0;

      // 5. Fire notifications for P1 insights
      const p1 = insights.filter(i => i.priority === 1);
      for (const p1Insight of p1) {
        await createOrgNotification({
          supabase,
          organizationId: orgId,
          type: 'ops_intelligence',
          category: 'compliance',
          title: p1Insight.title,
          body: p1Insight.body,
          actionUrl: '/insights/operations-intelligence',
          actionLabel: 'View Insights',
          priority: 'high',
          severity: 'advisory',
          sourceType: 'ops_intelligence',
          deduplicate: true,
          roleFilter: ['owner_operator', 'executive', 'compliance_manager'],
        });
        totalNotifications++;
      }
    }

    return jsonResponse({
      success: true,
      orgs_processed: orgIds.length,
      insights_created: totalInserts,
      notifications_sent: totalNotifications,
    });
  } catch (err) {
    console.error('[ops-intelligence-generate]', err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
