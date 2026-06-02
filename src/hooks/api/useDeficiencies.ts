/**
 * Deficiency API hooks — wired to `deficiencies` table.
 *
 * Reads deficiencies with nested timeline + photos, org-scoped.
 * Mutations remain stubs until write paths are built.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from './useApiQuery';
import {
  DEMO_DEFICIENCIES,
  type DeficiencyItem,
  type DefStatus,
  type DeficiencyTimelineEntry,
} from '../../data/deficienciesDemoData';

// ── Row mapper ───────────────────────────────────────────────

const DEFICIENCY_SELECT = `
  id, organization_id, location_id, code, title, description,
  location_description, severity, status, equipment_id,
  service_record_id, found_by, found_date, required_action,
  timeline_requirement, estimated_cost, resolved_at, resolved_by,
  resolution_notes, follow_up_service_id, deferred_reason,
  deferred_until, ai_detected, ai_confidence, created_at,
  locations!location_id(name),
  deficiency_timeline(status, created_at, changed_by_name, notes, notification_method),
  deficiency_photos(id, photo_type)
`;

function mapDeficiencyRow(row: any): DeficiencyItem {
  const timeline: DeficiencyTimelineEntry[] = (row.deficiency_timeline || [])
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((t: any) => ({
      status: t.status,
      date: t.created_at,
      by: t.changed_by_name || '',
      notes: t.notes || undefined,
      notificationMethod: t.notification_method || undefined,
    }));

  const photos = (row.deficiency_photos || []);
  const findingPhotos = photos.filter((p: any) => p.photo_type === 'finding').map((p: any) => p.id);
  const resolutionPhotos = photos.filter((p: any) => p.photo_type === 'resolution').map((p: any) => p.id);

  return {
    id: row.id,
    category: 'fire_safety',
    code: row.code || '',
    title: row.title || '',
    description: row.description || '',
    locationDescription: row.location_description || '',
    severity: row.severity,
    status: row.status,
    locationId: row.location_id || '',
    locationName: row.locations?.name || '',
    customerName: '',
    equipmentId: row.equipment_id || null,
    equipmentName: null,
    serviceRecordId: row.service_record_id || null,
    foundBy: row.found_by || '',
    foundDate: row.found_date || row.created_at,
    requiredAction: row.required_action || '',
    timelineRequirement: row.timeline_requirement || '30_days',
    estimatedCost: row.estimated_cost != null ? Number(row.estimated_cost) : null,
    resolvedAt: row.resolved_at || null,
    resolvedBy: row.resolved_by || null,
    resolutionNotes: row.resolution_notes || null,
    followUpServiceRecordId: row.follow_up_service_id || null,
    deferredReason: row.deferred_reason || null,
    deferredUntil: row.deferred_until || null,
    timeline,
    photoIds: findingPhotos,
    resolutionPhotoIds: resolutionPhotos,
    aiDetected: row.ai_detected || false,
    aiConfidence: row.ai_confidence ?? null,
  };
}

// ── Queries ───────────────────────────────────────────────────

/** Fetch all deficiencies for the current org. */
export function useDeficiencies(): ApiQueryResult<DeficiencyItem[]> {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const queryFn = useCallback(async (): Promise<DeficiencyItem[]> => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('deficiencies')
      .select(DEFICIENCY_SELECT)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapDeficiencyRow);
  }, [orgId]);

  return useApiQuery(`deficiencies-${orgId}`, queryFn, DEMO_DEFICIENCIES);
}

/** Fetch deficiencies filtered by location. */
export function useLocationDeficiencies(locationId: string): ApiQueryResult<DeficiencyItem[]> {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const demoData = DEMO_DEFICIENCIES.filter(d => d.locationId === locationId);

  const queryFn = useCallback(async (): Promise<DeficiencyItem[]> => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('deficiencies')
      .select(DEFICIENCY_SELECT)
      .eq('organization_id', orgId)
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapDeficiencyRow);
  }, [orgId, locationId]);

  return useApiQuery(`deficiencies-${orgId}-${locationId}`, queryFn, demoData);
}

/** Fetch a single deficiency by ID. */
export function useDeficiency(id: string | undefined): ApiQueryResult<DeficiencyItem | null> {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const demoData = DEMO_DEFICIENCIES.find(d => d.id === id) ?? null;

  const queryFn = useCallback(async (): Promise<DeficiencyItem | null> => {
    if (!id || !orgId) return null;
    const { data, error } = await supabase
      .from('deficiencies')
      .select(DEFICIENCY_SELECT)
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapDeficiencyRow(data) : null;
  }, [id, orgId]);

  return useApiQuery(`deficiency-${orgId}-${id}`, queryFn, demoData);
}

// ── Mutations ─────────────────────────────────────────────────

/** Update deficiency status. */
export function useUpdateDeficiencyStatus(): ApiMutationResult<{ id: string; status: DefStatus; notes?: string }> {
  const mutationFn = useCallback(async (_args: { id: string; status: DefStatus; notes?: string }): Promise<void> => {
    // TODO: Update deficiencies set status = args.status
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((_args: { id: string; status: DefStatus; notes?: string }): void => {
    // no-op in demo — page manages local state
  }, []);

  return useApiMutation(mutationFn, demoFn);
}

/** Resolve a deficiency. */
export function useResolveDeficiency(): ApiMutationResult<{ id: string; notes: string; photoIds?: string[] }> {
  const mutationFn = useCallback(async (_args: { id: string; notes: string; photoIds?: string[] }): Promise<void> => {
    // TODO: Update deficiencies set status='resolved', resolved_at=now()
    throw new Error('Not implemented');
  }, []);

  const demoFn = useCallback((_args: { id: string; notes: string; photoIds?: string[] }): void => {}, []);
  return useApiMutation(mutationFn, demoFn);
}
