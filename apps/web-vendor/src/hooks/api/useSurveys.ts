/**
 * Survey API hooks — stubbed with empty data.
 * When Supabase tables are ready, replace the queryFn
 * implementations with real queries.
 */

import { useCallback } from 'react';
import { useApiQuery, useApiMutation, type ApiQueryResult, type ApiMutationResult } from '@shared/hooks/api/useApiQuery';

// ── Types ─────────────────────────────────────────────────────

export interface CustomerSurvey {
  id: string;
  vendor_id: string;
  job_id: string;
  organization_id: string;
  location_id: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  scheduled_send_at: string;
  sent_at: string | null;
  reminder_sent_at: string | null;
  expires_at: string;
  token: string;
  completed_at: string | null;
  overall_rating: number | null;
  quality_rating: number | null;
  professionalism_rating: number | null;
  timeliness_rating: number | null;
  communication_rating: number | null;
  feedback_text: string | null;
  would_recommend: boolean | null;
  google_review_prompted: boolean;
  google_review_clicked: boolean;
  requires_followup: boolean;
  followup_handled_by: string | null;
  followup_handled_at: string | null;
  followup_notes: string | null;
  status: 'pending' | 'sent' | 'completed' | 'expired' | 'bounced';
  created_at: string;
  updated_at: string;
  // Joined fields
  job?: { job_number: string; service_date: string; service_types: string[]; technician_name: string };
  location?: { name: string; address: string };
}

export interface SurveySettings {
  id: string;
  vendor_id: string;
  send_delay_hours: number;
  send_time: string;
  expiry_days: number;
  reminder_days: number;
  google_business_url: string | null;
  google_review_threshold: number;
  send_via_email: boolean;
  send_via_sms: boolean;
  email_subject: string;
  email_template: string | null;
  sms_template: string;
  auto_respond_enabled: boolean;
  auto_respond_threshold: number;
  auto_respond_recipients: string[];
  is_active: boolean;
}

export interface SurveyStats {
  totalSent: number;
  responseRate: number;
  averageRating: number;
  googleReviewClicks: number;
  lowRatingCount: number;
  pendingFollowups: number;
}

export interface SurveyFilters {
  status?: string;
  dateRange?: { start: string; end: string };
  minRating?: number;
  maxRating?: number;
  technicianId?: string;
  requiresFollowup?: boolean;
}

export interface SurveyResponse {
  overall_rating: number;
  quality_rating?: number;
  professionalism_rating?: number;
  timeliness_rating?: number;
  communication_rating?: number;
  feedback_text?: string;
  would_recommend?: boolean;
}

// ── Queries ───────────────────────────────────────────────────

export function useSurveys(filters?: SurveyFilters): ApiQueryResult<CustomerSurvey[]> {
  return useApiQuery<CustomerSurvey[]>(
    ['surveys', filters],
    async () => [],
    { enabled: true }
  );
}

export function useSurvey(id: string | undefined): ApiQueryResult<CustomerSurvey | null> {
  return useApiQuery<CustomerSurvey | null>(
    ['survey', id],
    async () => null,
    { enabled: !!id }
  );
}

export function useSurveyByToken(token: string | undefined): ApiQueryResult<CustomerSurvey | null> {
  return useApiQuery<CustomerSurvey | null>(
    ['survey-token', token],
    async () => null,
    { enabled: !!token }
  );
}

export function useSurveyStats(dateRange?: { start: string; end: string }): ApiQueryResult<SurveyStats> {
  return useApiQuery<SurveyStats>(
    ['survey-stats', dateRange],
    async () => ({
      totalSent: 0,
      responseRate: 0,
      averageRating: 0,
      googleReviewClicks: 0,
      lowRatingCount: 0,
      pendingFollowups: 0,
    }),
    { enabled: true }
  );
}

export function useSurveySettings(): ApiQueryResult<SurveySettings | null> {
  return useApiQuery<SurveySettings | null>(
    ['survey-settings'],
    async () => null,
    { enabled: true }
  );
}

export function usePendingFollowups(): ApiQueryResult<CustomerSurvey[]> {
  return useApiQuery<CustomerSurvey[]>(
    ['survey-followups'],
    async () => [],
    { enabled: true }
  );
}

// ── Mutations ─────────────────────────────────────────────────

export function useSubmitSurveyResponse(): ApiMutationResult<
  CustomerSurvey,
  { token: string; response: SurveyResponse }
> {
  const mutationFn = useCallback(async (_args: { token: string; response: SurveyResponse }) => {
    // Stub — will POST to edge function or update supabase directly
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<CustomerSurvey, { token: string; response: SurveyResponse }>(
    mutationFn,
    { invalidateKeys: [['surveys'], ['survey-stats']] }
  );
}

export function useMarkGoogleReviewClicked(): ApiMutationResult<void, { surveyId: string }> {
  const mutationFn = useCallback(async (_args: { surveyId: string }) => {
    // Stub
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<void, { surveyId: string }>(
    mutationFn,
    { invalidateKeys: [['surveys'], ['survey-stats']] }
  );
}

export function useHandleFollowup(): ApiMutationResult<
  void,
  { surveyId: string; handledBy: string; notes: string }
> {
  const mutationFn = useCallback(async (_args: { surveyId: string; handledBy: string; notes: string }) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<void, { surveyId: string; handledBy: string; notes: string }>(
    mutationFn,
    { invalidateKeys: [['surveys'], ['survey-followups']] }
  );
}

export function useUpdateSurveySettings(): ApiMutationResult<SurveySettings, Partial<SurveySettings>> {
  const mutationFn = useCallback(async (_args: Partial<SurveySettings>) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<SurveySettings, Partial<SurveySettings>>(
    mutationFn,
    { invalidateKeys: [['survey-settings']] }
  );
}

export function useResendSurvey(): ApiMutationResult<void, { surveyId: string }> {
  const mutationFn = useCallback(async (_args: { surveyId: string }) => {
    throw new Error('Not implemented — connect to Supabase');
  }, []);
  return useApiMutation<void, { surveyId: string }>(
    mutationFn,
    { invalidateKeys: [['surveys']] }
  );
}
