/**
 * SP8 — Operations Intelligence Data Engine
 *
 * 10 generator functions that read from existing data sources and produce
 * insight objects for the ops_intelligence_insights table.
 *
 * Each generator returns: [{ priority, category, title, body, source, action_text, action_url, metadata }]
 * Priority: 1 = critical, 2 = warning, 3 = positive/informational
 */

const FOUR_SAFEGUARDS = ['hood_cleaning', 'fire_suppression', 'fire_alarm', 'sprinklers'];
const SAFEGUARD_LABELS = {
  hood_cleaning: 'Hood Cleaning',
  fire_suppression: 'Fire Suppression',
  fire_alarm: 'Fire Alarm',
  sprinklers: 'Sprinklers',
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - target) / (1000 * 60 * 60 * 24));
}

// ── 1. PSE Safeguard Exposure ──────────────────────────────────

export async function generatePSEInsights(orgId, supabase) {
  const insights = [];

  const { data: records } = await supabase
    .from('vendor_service_records')
    .select('safeguard_type, next_due_date, vendor_name')
    .eq('organization_id', orgId);

  if (!records) return insights;

  // Latest record per safeguard type
  const latest = {};
  for (const r of records) {
    if (!latest[r.safeguard_type] || r.next_due_date > latest[r.safeguard_type].next_due_date) {
      latest[r.safeguard_type] = r;
    }
  }

  const missing = FOUR_SAFEGUARDS.filter(s => !latest[s]);
  const overdue = FOUR_SAFEGUARDS.filter(s => latest[s] && daysUntil(latest[s].next_due_date) < 0);
  const dueSoon = FOUR_SAFEGUARDS.filter(s => {
    const d = latest[s] && daysUntil(latest[s].next_due_date);
    return d !== null && d >= 0 && d < 30;
  });

  if (missing.length > 0) {
    insights.push({
      priority: 1,
      category: 'pse_exposure',
      title: `${missing.length} PSE safeguard${missing.length > 1 ? 's' : ''} missing records`,
      body: `No service records found for: ${missing.map(s => SAFEGUARD_LABELS[s]).join(', ')}. These are critical for fire safety compliance.`,
      source: 'vendor_service_records',
      action_text: 'Add Service Records',
      action_url: '/vendors',
      metadata: { missing_types: missing },
    });
  }

  if (overdue.length > 0) {
    insights.push({
      priority: 1,
      category: 'pse_exposure',
      title: `${overdue.length} PSE service${overdue.length > 1 ? 's' : ''} overdue`,
      body: `Overdue: ${overdue.map(s => `${SAFEGUARD_LABELS[s]} (${Math.abs(daysUntil(latest[s].next_due_date))}d overdue)`).join(', ')}.`,
      source: 'vendor_service_records',
      action_text: 'Review Services',
      action_url: '/vendors',
      metadata: { overdue_types: overdue },
    });
  }

  if (dueSoon.length > 0) {
    insights.push({
      priority: 2,
      category: 'pse_exposure',
      title: `${dueSoon.length} PSE service${dueSoon.length > 1 ? 's' : ''} due within 30 days`,
      body: `Upcoming: ${dueSoon.map(s => `${SAFEGUARD_LABELS[s]} (${daysUntil(latest[s].next_due_date)}d)`).join(', ')}.`,
      source: 'vendor_service_records',
      action_text: 'Schedule Service',
      action_url: '/vendors',
      metadata: { due_soon_types: dueSoon },
    });
  }

  if (missing.length === 0 && overdue.length === 0 && dueSoon.length === 0 && Object.keys(latest).length === 4) {
    insights.push({
      priority: 3,
      category: 'pse_exposure',
      title: 'All 4 PSE safeguards current',
      body: 'Hood cleaning, fire suppression, fire alarm, and sprinkler services are all up to date.',
      source: 'vendor_service_records',
      metadata: { all_current: true },
    });
  }

  return insights;
}

// ── 2. Document Currency ───────────────────────────────────────

export async function generateDocumentInsights(orgId, supabase) {
  const insights = [];

  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, category, expiration_date')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .not('expiration_date', 'is', null);

  if (!docs || docs.length === 0) return insights;

  const expired = docs.filter(d => daysUntil(d.expiration_date) < 0);
  const expiringSoon = docs.filter(d => {
    const days = daysUntil(d.expiration_date);
    return days >= 0 && days < 30;
  });

  if (expired.length > 0) {
    insights.push({
      priority: 1,
      category: 'document_currency',
      title: `${expired.length} document${expired.length > 1 ? 's' : ''} expired`,
      body: `Expired: ${expired.slice(0, 3).map(d => d.title).join(', ')}${expired.length > 3 ? ` and ${expired.length - 3} more` : ''}.`,
      source: 'documents',
      action_text: 'Review Documents',
      action_url: '/documents',
      metadata: { expired_count: expired.length, expired_ids: expired.map(d => d.id) },
    });
  }

  if (expiringSoon.length > 0) {
    insights.push({
      priority: 2,
      category: 'document_currency',
      title: `${expiringSoon.length} document${expiringSoon.length > 1 ? 's' : ''} expiring within 30 days`,
      body: `Expiring soon: ${expiringSoon.slice(0, 3).map(d => `${d.title} (${daysUntil(d.expiration_date)}d)`).join(', ')}${expiringSoon.length > 3 ? ` and ${expiringSoon.length - 3} more` : ''}.`,
      source: 'documents',
      action_text: 'Renew Documents',
      action_url: '/documents',
      metadata: { expiring_count: expiringSoon.length },
    });
  }

  return insights;
}

// ── 3. Service Currency ────────────────────────────────────────

export async function generateServiceInsights(orgId, supabase) {
  const insights = [];

  const { data: records } = await supabase
    .from('vendor_service_records')
    .select('id, safeguard_type, vendor_name, next_due_date')
    .eq('organization_id', orgId)
    .not('next_due_date', 'is', null);

  if (!records || records.length === 0) return insights;

  const overdue = records.filter(r => daysUntil(r.next_due_date) < 0);
  const dueSoon = records.filter(r => {
    const days = daysUntil(r.next_due_date);
    return days >= 0 && days < 30;
  });

  if (overdue.length > 0) {
    insights.push({
      priority: 1,
      category: 'service_currency',
      title: `${overdue.length} vendor service${overdue.length > 1 ? 's' : ''} overdue`,
      body: `Overdue: ${overdue.slice(0, 3).map(r => `${r.vendor_name || SAFEGUARD_LABELS[r.safeguard_type] || r.safeguard_type} (${Math.abs(daysUntil(r.next_due_date))}d)`).join(', ')}${overdue.length > 3 ? ` and ${overdue.length - 3} more` : ''}.`,
      source: 'vendor_service_records',
      action_text: 'Schedule Services',
      action_url: '/vendors',
      metadata: { overdue_count: overdue.length },
    });
  }

  if (dueSoon.length > 0) {
    insights.push({
      priority: 2,
      category: 'service_currency',
      title: `${dueSoon.length} service${dueSoon.length > 1 ? 's' : ''} due within 30 days`,
      body: `Upcoming: ${dueSoon.slice(0, 3).map(r => `${r.vendor_name || SAFEGUARD_LABELS[r.safeguard_type] || r.safeguard_type} (${daysUntil(r.next_due_date)}d)`).join(', ')}${dueSoon.length > 3 ? ` and ${dueSoon.length - 3} more` : ''}.`,
      source: 'vendor_service_records',
      action_text: 'Review Schedule',
      action_url: '/vendors',
      metadata: { due_soon_count: dueSoon.length },
    });
  }

  return insights;
}

// ── 4. Corrective Action Aging ─────────────────────────────────

export async function generateCAInsights(orgId, supabase) {
  const insights = [];

  const { data: actions } = await supabase
    .from('corrective_actions')
    .select('id, title, status, due_date, created_at, completed_at')
    .eq('organization_id', orgId);

  if (!actions || actions.length === 0) return insights;

  const open = actions.filter(a => ['created', 'in_progress'].includes(a.status));
  const closedStatuses = ['completed', 'verified', 'closed'];

  // Aging: open CAs older than 14 days
  const aged14 = open.filter(a => daysSince(a.created_at) > 14);
  const aged7 = open.filter(a => {
    const d = daysSince(a.created_at);
    return d > 7 && d <= 14;
  });

  if (aged14.length > 0) {
    insights.push({
      priority: 1,
      category: 'ca_aging',
      title: `${aged14.length} corrective action${aged14.length > 1 ? 's' : ''} open >14 days`,
      body: `Long-open CAs: ${aged14.slice(0, 3).map(a => `${a.title || 'Untitled'} (${daysSince(a.created_at)}d)`).join(', ')}${aged14.length > 3 ? ` and ${aged14.length - 3} more` : ''}.`,
      source: 'corrective_actions',
      action_text: 'Review CAs',
      action_url: '/corrective-actions',
      metadata: { aged_14_count: aged14.length },
    });
  }

  if (aged7.length > 0) {
    insights.push({
      priority: 2,
      category: 'ca_aging',
      title: `${aged7.length} corrective action${aged7.length > 1 ? 's' : ''} open 7–14 days`,
      body: `These CAs are approaching the 14-day threshold: ${aged7.slice(0, 3).map(a => a.title || 'Untitled').join(', ')}${aged7.length > 3 ? ` and ${aged7.length - 3} more` : ''}.`,
      source: 'corrective_actions',
      action_text: 'View Actions',
      action_url: '/corrective-actions',
      metadata: { aged_7_count: aged7.length },
    });
  }

  // Closure rate (last 90 days)
  const recent = actions.filter(a => daysSince(a.created_at) <= 90);
  if (recent.length >= 5) {
    const closed = recent.filter(a => closedStatuses.includes(a.status)).length;
    const rate = Math.round((closed / recent.length) * 100);
    if (rate < 70) {
      insights.push({
        priority: 2,
        category: 'ca_aging',
        title: `CA closure rate at ${rate}% (below 70% target)`,
        body: `${closed} of ${recent.length} corrective actions closed in the last 90 days. Target is 70%+.`,
        source: 'corrective_actions',
        action_text: 'Improve Closure',
        action_url: '/corrective-actions',
        metadata: { closure_rate: rate, closed, total: recent.length },
      });
    }
  }

  return insights;
}

// ── 5. Temperature Trends ──────────────────────────────────────

export async function generateTempInsights(orgId, supabase) {
  const insights = [];
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: logs } = await supabase
    .from('temp_logs')
    .select('id, equipment_name, temperature, recorded_at, status')
    .eq('organization_id', orgId)
    .gte('recorded_at', fourteenDaysAgo)
    .order('recorded_at', { ascending: true });

  if (!logs || logs.length === 0) return insights;

  // Count out-of-range per 7-day window
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentLogs = logs.filter(l => l.recorded_at >= sevenDaysAgo);
  const outOfRange = recentLogs.filter(l => l.status === 'critical');

  if (outOfRange.length >= 3) {
    insights.push({
      priority: 1,
      category: 'temp_trend',
      title: `${outOfRange.length} out-of-range temp readings in 7 days`,
      body: `Equipment flagged: ${[...new Set(outOfRange.map(l => l.equipment_name))].slice(0, 3).join(', ')}. Investigate potential equipment failures.`,
      source: 'temp_logs',
      action_text: 'Review Temps',
      action_url: '/temperature',
      metadata: { oor_count: outOfRange.length },
    });
  }

  // 2°F drift detection — compare first vs second week averages per equipment
  const byEquipment = {};
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
          priority: 2,
          category: 'temp_trend',
          title: `${equip}: ${avg2 > avg1 ? '+' : ''}${(avg2 - avg1).toFixed(1)}°F drift detected`,
          body: `Average temperature shifted from ${avg1.toFixed(1)}°F to ${avg2.toFixed(1)}°F over 14 days. Check calibration.`,
          source: 'temp_logs',
          action_text: 'Check Equipment',
          action_url: '/temperature',
          metadata: { equipment: equip, avg_week1: avg1, avg_week2: avg2 },
        });
        break; // Only report first drift to avoid noise
      }
    }
  }

  // Logging compliance: <80% of expected
  const expectedLogsPerDay = Object.keys(byEquipment).length; // 1 log/equip/day
  const totalExpected14d = expectedLogsPerDay * 14;
  if (totalExpected14d > 0) {
    const complianceRate = Math.round((logs.length / totalExpected14d) * 100);
    if (complianceRate < 80) {
      insights.push({
        priority: 2,
        category: 'temp_trend',
        title: `Temp logging at ${complianceRate}% (below 80% target)`,
        body: `${logs.length} of ~${totalExpected14d} expected readings recorded over 14 days.`,
        source: 'temp_logs',
        action_text: 'Improve Logging',
        action_url: '/temperature',
        metadata: { compliance_rate: complianceRate },
      });
    }
  }

  return insights;
}

// ── 6. Checklist Trends ────────────────────────────────────────

export async function generateChecklistInsights(orgId, supabase) {
  const insights = [];
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  // Get checklists for this org
  const { data: checklists } = await supabase
    .from('checklists')
    .select('id')
    .eq('organization_id', orgId);

  if (!checklists || checklists.length === 0) return insights;
  const checklistIds = checklists.map(c => c.id);

  // Get completions for last 28 days
  const { data: completions } = await supabase
    .from('checklist_completions')
    .select('id, completed_by, completed_at')
    .in('checklist_id', checklistIds)
    .gte('completed_at', twentyEightDaysAgo)
    .order('completed_at', { ascending: true });

  if (!completions || completions.length === 0) return insights;

  const recent = completions.filter(c => c.completed_at >= fourteenDaysAgo);
  const previous = completions.filter(c => c.completed_at < fourteenDaysAgo);

  // Drop detection: 10%+ decline
  if (previous.length >= 5 && recent.length < previous.length * 0.9) {
    const dropPct = Math.round((1 - recent.length / previous.length) * 100);
    insights.push({
      priority: 1,
      category: 'checklist_trend',
      title: `Checklist completion dropped ${dropPct}% this period`,
      body: `${recent.length} completions in the last 14 days vs ${previous.length} in the prior 14 days.`,
      source: 'checklist_completions',
      action_text: 'Review Checklists',
      action_url: '/checklists',
      metadata: { drop_pct: dropPct, recent_count: recent.length, previous_count: previous.length },
    });
  }

  // Concentration: single person >60%
  if (recent.length >= 5) {
    const byPerson = {};
    for (const c of recent) {
      byPerson[c.completed_by] = (byPerson[c.completed_by] || 0) + 1;
    }
    const entries = Object.entries(byPerson);
    if (entries.length > 1) {
      const top = entries.sort((a, b) => b[1] - a[1])[0];
      const pct = Math.round((top[1] / recent.length) * 100);
      if (pct > 60) {
        insights.push({
          priority: 2,
          category: 'checklist_trend',
          title: `One team member completing ${pct}% of checklists`,
          body: `A single person completed ${top[1]} of ${recent.length} checklists in 14 days. Consider distributing tasks.`,
          source: 'checklist_completions',
          action_text: 'Review Team',
          action_url: '/team',
          metadata: { concentrated_user: top[0], pct },
        });
      }
    }
  }

  // Shift gap: morning vs afternoon completions >20% difference
  if (recent.length >= 10) {
    const morning = recent.filter(c => new Date(c.completed_at).getHours() < 12).length;
    const afternoon = recent.length - morning;
    if (recent.length > 0) {
      const gapPct = Math.round(Math.abs(morning - afternoon) / recent.length * 100);
      if (gapPct > 20) {
        const heavier = morning > afternoon ? 'morning' : 'afternoon';
        insights.push({
          priority: 2,
          category: 'checklist_trend',
          title: `${gapPct}% shift gap in checklist completion`,
          body: `${morning} morning vs ${afternoon} afternoon completions. The ${heavier} shift is carrying more load.`,
          source: 'checklist_completions',
          action_text: 'Balance Shifts',
          action_url: '/checklists',
          metadata: { morning, afternoon, gap_pct: gapPct },
        });
      }
    }
  }

  return insights;
}

// ── 7. Certification Gaps ──────────────────────────────────────

export async function generateCertInsights(orgId, supabase) {
  const insights = [];

  const { data: certs } = await supabase
    .from('employee_certifications')
    .select('id, certification_name, expiration_date, status, user_id')
    .eq('organization_id', orgId);

  if (!certs || certs.length === 0) return insights;

  const expired = certs.filter(c => c.status === 'expired' || (c.expiration_date && daysUntil(c.expiration_date) < 0));
  const expiringSoon = certs.filter(c => {
    const days = c.expiration_date ? daysUntil(c.expiration_date) : null;
    return days !== null && days >= 0 && days < 60;
  });

  // >25% expired
  if (certs.length >= 4 && expired.length / certs.length > 0.25) {
    const pct = Math.round((expired.length / certs.length) * 100);
    insights.push({
      priority: 2,
      category: 'certification_gap',
      title: `${pct}% of team certifications expired`,
      body: `${expired.length} of ${certs.length} certifications are expired. This may impact compliance.`,
      source: 'employee_certifications',
      action_text: 'Renew Certs',
      action_url: '/dashboard/training',
      metadata: { expired_pct: pct, expired_count: expired.length },
    });
  }

  // Individual expiring <60d
  if (expiringSoon.length > 0) {
    insights.push({
      priority: 2,
      category: 'certification_gap',
      title: `${expiringSoon.length} certification${expiringSoon.length > 1 ? 's' : ''} expiring within 60 days`,
      body: `Upcoming expirations: ${expiringSoon.slice(0, 3).map(c => `${c.certification_name} (${daysUntil(c.expiration_date)}d)`).join(', ')}${expiringSoon.length > 3 ? ` and ${expiringSoon.length - 3} more` : ''}.`,
      source: 'employee_certifications',
      action_text: 'Schedule Training',
      action_url: '/dashboard/training',
      metadata: { expiring_count: expiringSoon.length },
    });
  }

  return insights;
}

// ── 8. Multi-Location Comparison ───────────────────────────────

export async function generateLocationInsights(orgId, supabase) {
  const insights = [];

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('organization_id', orgId)
    .eq('status', 'active');

  if (!locations || locations.length < 2) return insights;

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const locationIds = locations.map(l => l.id);
  const locationNameMap = Object.fromEntries(locations.map(l => [l.id, l.name]));

  // Compare checklist completions per location
  const { data: checklists } = await supabase
    .from('checklists')
    .select('id, location_id')
    .eq('organization_id', orgId)
    .in('location_id', locationIds);

  if (checklists && checklists.length > 0) {
    const checklistIdsByLoc = {};
    for (const cl of checklists) {
      if (!checklistIdsByLoc[cl.location_id]) checklistIdsByLoc[cl.location_id] = [];
      checklistIdsByLoc[cl.location_id].push(cl.id);
    }

    const allChecklistIds = checklists.map(c => c.id);
    const { data: completions } = await supabase
      .from('checklist_completions')
      .select('checklist_id, completed_at')
      .in('checklist_id', allChecklistIds)
      .gte('completed_at', fourteenDaysAgo);

    if (completions && completions.length > 0) {
      // Map completions back to locations
      const checklistToLoc = {};
      for (const cl of checklists) {
        checklistToLoc[cl.id] = cl.location_id;
      }

      const countByLoc = {};
      for (const locId of locationIds) countByLoc[locId] = 0;
      for (const comp of completions) {
        const locId = checklistToLoc[comp.checklist_id];
        if (locId) countByLoc[locId] = (countByLoc[locId] || 0) + 1;
      }

      const counts = Object.entries(countByLoc).sort((a, b) => a[1] - b[1]);
      if (counts.length >= 2) {
        const lowest = counts[0];
        const highest = counts[counts.length - 1];
        if (highest[1] > 0 && lowest[1] / highest[1] < 0.5) {
          insights.push({
            priority: 2,
            category: 'multi_location',
            title: `${locationNameMap[lowest[0]]} lagging in checklist completion`,
            body: `${locationNameMap[lowest[0]]} completed ${lowest[1]} checklists vs ${locationNameMap[highest[0]]}'s ${highest[1]} in 14 days.`,
            source: 'checklist_completions',
            action_text: 'Compare Locations',
            action_url: '/insights/leaderboard',
            metadata: { lowest_loc: lowest[0], highest_loc: highest[0] },
          });
        }
      }
    }
  }

  // Compare open CAs per location
  const { data: cas } = await supabase
    .from('corrective_actions')
    .select('location_id, status')
    .eq('organization_id', orgId)
    .in('status', ['created', 'in_progress'])
    .in('location_id', locationIds);

  if (cas && cas.length > 0) {
    const caByLoc = {};
    for (const locId of locationIds) caByLoc[locId] = 0;
    for (const ca of cas) {
      if (ca.location_id) caByLoc[ca.location_id] = (caByLoc[ca.location_id] || 0) + 1;
    }

    const sorted = Object.entries(caByLoc).sort((a, b) => b[1] - a[1]);
    if (sorted.length >= 2 && sorted[0][1] >= 3 && sorted[0][1] > sorted[sorted.length - 1][1] * 2) {
      insights.push({
        priority: 2,
        category: 'multi_location',
        title: `${locationNameMap[sorted[0][0]]} has ${sorted[0][1]} open corrective actions`,
        body: `Significantly more than other locations (avg ${Math.round(cas.length / locationIds.length)}). May need management attention.`,
        source: 'corrective_actions',
        action_text: 'Review Location',
        action_url: '/corrective-actions',
        metadata: { location_id: sorted[0][0], open_cas: sorted[0][1] },
      });
    }
  }

  return insights;
}

// ── 9. Trajectory (Readiness Snapshots) ────────────────────────

export async function generateTrajectoryInsights(orgId, supabase) {
  const insights = [];

  const { data: snapshots } = await supabase
    .from('readiness_snapshots')
    .select('overall_score, snapshot_date')
    .eq('org_id', orgId)
    .order('snapshot_date', { ascending: false })
    .limit(8);

  if (!snapshots || snapshots.length < 3) return insights;

  // Compare last 3 snapshots for trend
  const recent3 = snapshots.slice(0, 3).map(s => Number(s.overall_score));
  const avgRecent = recent3.reduce((s, v) => s + v, 0) / recent3.length;

  if (snapshots.length >= 6) {
    const older3 = snapshots.slice(3, 6).map(s => Number(s.overall_score));
    const avgOlder = older3.reduce((s, v) => s + v, 0) / older3.length;
    const diff = avgRecent - avgOlder;

    if (diff < -5) {
      insights.push({
        priority: 1,
        category: 'trajectory',
        title: `Readiness score declining (${diff > 0 ? '+' : ''}${diff.toFixed(1)} pts)`,
        body: `Average score dropped from ${avgOlder.toFixed(1)} to ${avgRecent.toFixed(1)} over recent snapshots. Investigate root causes.`,
        source: 'readiness_snapshots',
        action_text: 'View Trajectory',
        action_url: '/insights/trajectory',
        metadata: { avg_recent: avgRecent, avg_older: avgOlder, diff },
      });
    } else if (diff > 5) {
      insights.push({
        priority: 3,
        category: 'trajectory',
        title: `Readiness score improving (+${diff.toFixed(1)} pts)`,
        body: `Average score rose from ${avgOlder.toFixed(1)} to ${avgRecent.toFixed(1)}. Great work maintaining compliance.`,
        source: 'readiness_snapshots',
        action_text: 'View Trajectory',
        action_url: '/insights/trajectory',
        metadata: { avg_recent: avgRecent, avg_older: avgOlder, diff },
      });
    }
  }

  return insights;
}

// ── 10. Jurisdiction Signals ───────────────────────────────────

export async function generateSignalInsights(orgId, supabase) {
  const insights = [];

  // Get org's locations to determine counties
  const { data: locations } = await supabase
    .from('locations')
    .select('city, state')
    .eq('organization_id', orgId)
    .eq('status', 'active');

  if (!locations || locations.length === 0) return insights;

  // Get recent signals
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: signals } = await supabase
    .from('intelligence_signals')
    .select('id, title, ai_urgency, affected_counties, published_at, summary')
    .in('status', ['published', 'active'])
    .gte('published_at', thirtyDaysAgo)
    .order('published_at', { ascending: false })
    .limit(20);

  if (!signals || signals.length === 0) return insights;

  // Match signals that affect org's counties/cities
  const orgCities = locations.map(l => l.city?.toLowerCase()).filter(Boolean);
  const relevantSignals = signals.filter(s => {
    if (!s.affected_counties || s.affected_counties.length === 0) return false;
    const counties = s.affected_counties.map(c => c.toLowerCase());
    return orgCities.some(city => counties.some(county => county.includes(city) || city.includes(county)));
  });

  if (relevantSignals.length === 0) return insights;

  const critical = relevantSignals.filter(s => s.ai_urgency === 'critical');
  const high = relevantSignals.filter(s => s.ai_urgency === 'high');

  if (critical.length > 0) {
    insights.push({
      priority: 1,
      category: 'jurisdiction_signal',
      title: `Critical regulatory signal: ${critical[0].title}`,
      body: critical[0].summary || `A critical regulatory change has been detected that may affect your operations.`,
      source: 'intelligence_signals',
      action_text: 'View Signal',
      action_url: '/insights/signals',
      metadata: { signal_id: critical[0].id, urgency: 'critical' },
    });
  }

  if (high.length > 0) {
    insights.push({
      priority: 2,
      category: 'jurisdiction_signal',
      title: `${high.length} high-urgency regulatory signal${high.length > 1 ? 's' : ''} in your area`,
      body: `Recent signals: ${high.slice(0, 2).map(s => s.title).join('; ')}${high.length > 2 ? ` and ${high.length - 2} more` : ''}.`,
      source: 'intelligence_signals',
      action_text: 'Review Signals',
      action_url: '/insights/signals',
      metadata: { signal_count: high.length },
    });
  }

  return insights;
}

// ── Master: Generate All Insights ──────────────────────────────

export async function generateAllInsights(orgId, supabase) {
  const generators = [
    generatePSEInsights,
    generateDocumentInsights,
    generateServiceInsights,
    generateCAInsights,
    generateTempInsights,
    generateChecklistInsights,
    generateCertInsights,
    generateLocationInsights,
    generateTrajectoryInsights,
    generateSignalInsights,
  ];

  const results = await Promise.allSettled(
    generators.map(fn => fn(orgId, supabase))
  );

  const allInsights = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      allInsights.push(...result.value);
    }
  }

  // Sort by priority ASC (1 = critical first), cap at 10
  allInsights.sort((a, b) => a.priority - b.priority);
  return allInsights.slice(0, 10);
}
