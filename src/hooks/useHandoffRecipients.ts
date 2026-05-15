import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_SHIFTS, SHIFT_KEYS, type ShiftKey } from '../lib/shifts';

export interface HandoffRecipient {
  userId: string;
  name: string;
  role: string;
  channel: 'in_app' | 'email';
}

interface UseHandoffRecipientsArgs {
  locationId: string | null;
  organizationId: string | null;
  currentShiftName: ShiftKey;
}

function getNextShiftName(current: ShiftKey): ShiftKey {
  const idx = SHIFT_KEYS.indexOf(current);
  return SHIFT_KEYS[(idx + 1) % SHIFT_KEYS.length];
}

export function useHandoffRecipients({ locationId, organizationId, currentShiftName }: UseHandoffRecipientsArgs) {
  const [nextShiftStaff, setNextShiftStaff] = useState<HandoffRecipient[]>([]);
  const [emailRecipients, setEmailRecipients] = useState<HandoffRecipient[]>([]);
  const [nextShiftLabel, setNextShiftLabel] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRecipients = useCallback(async () => {
    if (!locationId || !organizationId) { setLoading(false); return; }
    setLoading(true);

    const nextName = getNextShiftName(currentShiftName);
    setNextShiftLabel(DEFAULT_SHIFTS[nextName].label);

    try {
      const today = new Date().toISOString().slice(0, 10);

      // 1. Resolve next shift template and staff
      let nextStaff: HandoffRecipient[] = [];
      try {
        const { data: tmpl } = await supabase
          .from('shift_templates')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('location_id', locationId)
          .ilike('name', nextName)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (tmpl) {
          const { data: assignments } = await supabase
            .from('shift_assignments')
            .select('primary_user_id, secondary_user_id')
            .eq('shift_template_id', tmpl.id)
            .eq('is_active', true)
            .lte('effective_from', today)
            .or(`effective_until.is.null,effective_until.gte.${today}`);

          if (assignments && assignments.length > 0) {
            const userIds = new Set<string>();
            for (const a of assignments) {
              if (a.primary_user_id) userIds.add(a.primary_user_id);
              if (a.secondary_user_id) userIds.add(a.secondary_user_id);
            }
            if (userIds.size > 0) {
              const { data: profiles } = await supabase
                .from('user_profiles')
                .select('id, full_name, role')
                .in('id', Array.from(userIds));
              nextStaff = (profiles ?? []).map(p => ({
                userId: p.id,
                name: p.full_name || 'Staff member',
                role: p.role || 'kitchen_staff',
                channel: 'in_app' as const,
              }));
            }
          }
        }
      } catch { /* shift_templates/assignments may not exist */ }

      // 2. Email recipients: owner_operator + compliance_manager
      const { data: emailUsers } = await supabase
        .from('user_profiles')
        .select('id, full_name, role')
        .eq('organization_id', organizationId)
        .in('role', ['owner_operator', 'compliance_manager']);

      const emailList: HandoffRecipient[] = (emailUsers ?? []).map(u => ({
        userId: u.id,
        name: u.full_name || u.role,
        role: u.role,
        channel: 'email' as const,
      }));

      setNextShiftStaff(nextStaff);
      setEmailRecipients(emailList);
    } catch (err) {
      console.error('[HandoffRecipients]', err);
    } finally {
      setLoading(false);
    }
  }, [locationId, organizationId, currentShiftName]);

  useEffect(() => { fetchRecipients(); }, [fetchRecipients]);

  return { nextShiftStaff, emailRecipients, nextShiftLabel, loading };
}
