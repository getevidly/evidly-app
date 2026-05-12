import { supabase } from '../supabase';

export type ResponsibilityChoice = 'me' | 'invite' | 'skip';

export interface ResponsibilityCommitPayload {
  organizationId: string;
  requirementCode: string;
  choice: ResponsibilityChoice;
  skipReason?: string;
  inviteRole?: string;
}

/**
 * Commits a responsibility chip selection for a single requirement.
 * - 'me': stores in organizations.onboarding_team_invited with owner assignment
 * - 'invite': stores with the invited role reference
 * - 'skip': adds to organizations.onboarding_skipped_items with reason
 */
export async function commitResponsibility(payload: ResponsibilityCommitPayload): Promise<{ error: string | null }> {
  const { organizationId, requirementCode, choice, skipReason, inviteRole } = payload;

  if (choice === 'skip') {
    // Add to skipped items
    const { data: org } = await supabase
      .from('organizations')
      .select('onboarding_skipped_items')
      .eq('id', organizationId)
      .maybeSingle();

    const current: string[] = (org?.onboarding_skipped_items as string[]) || [];
    if (!current.includes(requirementCode)) {
      const updated = [...current, requirementCode];
      const { error } = await supabase
        .from('organizations')
        .update({
          onboarding_skipped_items: updated,
          // Store reason in metadata
          [`metadata`]: supabase.rpc ? undefined : undefined, // placeholder — reason stored below
        })
        .eq('id', organizationId);

      if (error) return { error: error.message };
    }

    // Store skip reason in team_invited array as well for audit trail
    const { data: orgTeam } = await supabase
      .from('organizations')
      .select('onboarding_team_invited')
      .eq('id', organizationId)
      .maybeSingle();

    const teamInvited: Record<string, unknown>[] = (orgTeam?.onboarding_team_invited as Record<string, unknown>[]) || [];
    const filtered = teamInvited.filter((t) => t.requirement_code !== requirementCode);
    filtered.push({ requirement_code: requirementCode, choice: 'skip', skip_reason: skipReason || '', committed_at: new Date().toISOString() });

    await supabase
      .from('organizations')
      .update({ onboarding_team_invited: filtered })
      .eq('id', organizationId);

    return { error: null };
  }

  // For 'me' or 'invite': store in onboarding_team_invited
  const { data: orgTeam } = await supabase
    .from('organizations')
    .select('onboarding_team_invited, onboarding_skipped_items')
    .eq('id', organizationId)
    .maybeSingle();

  const teamInvited: Record<string, unknown>[] = (orgTeam?.onboarding_team_invited as Record<string, unknown>[]) || [];
  const skippedItems: string[] = (orgTeam?.onboarding_skipped_items as string[]) || [];

  // Remove from skipped if previously skipped
  const updatedSkipped = skippedItems.filter(c => c !== requirementCode);

  // Upsert in team_invited array
  const filtered = teamInvited.filter((t) => t.requirement_code !== requirementCode);
  filtered.push({
    requirement_code: requirementCode,
    choice,
    invite_role: choice === 'invite' ? inviteRole : undefined,
    committed_at: new Date().toISOString(),
  });

  const { error } = await supabase
    .from('organizations')
    .update({
      onboarding_team_invited: filtered,
      onboarding_skipped_items: updatedSkipped,
    })
    .eq('id', organizationId);

  return { error: error?.message || null };
}

/**
 * Locks responsibilities — marks that all items have been assigned.
 * Stores lock state in organizations.metadata.responsibilities_locked = true
 */
export async function lockResponsibilities(organizationId: string): Promise<{ error: string | null }> {
  const { data: org } = await supabase
    .from('organizations')
    .select('metadata')
    .eq('id', organizationId)
    .maybeSingle();

  const meta = (org?.metadata as Record<string, unknown>) || {};
  const updated = { ...meta, responsibilities_locked: true, responsibilities_locked_at: new Date().toISOString() };

  const { error } = await supabase
    .from('organizations')
    .update({ metadata: updated })
    .eq('id', organizationId);

  return { error: error?.message || null };
}

/**
 * Checks if responsibilities have been locked for an org.
 */
export async function areResponsibilitiesLocked(organizationId: string): Promise<boolean> {
  const { data: org } = await supabase
    .from('organizations')
    .select('metadata')
    .eq('id', organizationId)
    .maybeSingle();

  const meta = (org?.metadata as Record<string, unknown>) || {};
  return meta.responsibilities_locked === true;
}
