import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { uploadFile, BUCKETS } from '../../lib/storage';
import { useAuth } from '../../contexts/AuthContext';

export interface ExtractedItem {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'advisory';
  category: 'food_safety' | 'fire_safety' | 'facility_services';
  timeline_requirement: 'immediate' | '30_days' | '90_days' | 'next_service';
  required_action: string;
  location_description: string;
  equipment_name: string;
  confidence: number;
  confidence_reason: string;
  source_quote: string;
  source_page: string;
  accepted: boolean;
  edited_at: string | null;
}

export interface DeficiencyUploadRecord {
  id: string;
  organization_id: string;
  location_id: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  service_record_id: string | null;
  status: 'processing' | 'review' | 'completed' | 'failed' | 'cancelled';
  error_message: string | null;
  extracted_items: ExtractedItem[];
  ai_model: string | null;
  tokens_used: number | null;
  extraction_latency_ms: number | null;
  completed_at: string | null;
  items_accepted: number | null;
  items_discarded: number | null;
  created_by: string | null;
  created_at: string;
}

type UploadState = 'upload' | 'processing' | 'review' | 'empty';

export interface DeficiencyUploadHook {
  state: UploadState;
  upload: DeficiencyUploadRecord | null;
  items: ExtractedItem[];
  uploading: boolean;
  accepting: boolean;
  startUpload: (file: File, orgId: string, locationId?: string, serviceRecordId?: string) => Promise<void>;
  toggleItem: (itemId: string) => void;
  toggleAll: (accepted: boolean) => void;
  selectHighConfidenceOnly: () => void;
  updateItem: (itemId: string, updates: Partial<ExtractedItem>) => void;
  discardItem: (itemId: string) => void;
  acceptItems: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
  acceptedCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  storageUrl: string | null;
}

const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 90000;

export function useDeficiencyUpload(): DeficiencyUploadHook {
  const { user } = useAuth();
  const [upload, setUpload] = useState<DeficiencyUploadRecord | null>(null);
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const state: UploadState = !upload
    ? 'upload'
    : upload.status === 'processing'
    ? 'processing'
    : upload.status === 'review' && (upload.extracted_items?.length || 0) > 0
    ? 'review'
    : upload.status === 'review'
    ? 'empty'
    : 'upload';

  // Confidence buckets
  const highCount = items.filter(i => i.confidence >= 0.9).length;
  const mediumCount = items.filter(i => i.confidence >= 0.7 && i.confidence < 0.9).length;
  const lowCount = items.filter(i => i.confidence < 0.7).length;
  const acceptedCount = items.filter(i => i.accepted).length;

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Start polling for processing status
  const startPolling = useCallback((uploadId: string) => {
    stopPolling();
    pollStartRef.current = Date.now();

    pollRef.current = setInterval(async () => {
      const elapsed = Date.now() - pollStartRef.current;
      if (elapsed > POLL_TIMEOUT) {
        stopPolling();
        return;
      }

      const { data, error } = await supabase
        .from('deficiency_uploads')
        .select('*')
        .eq('id', uploadId)
        .single();

      if (error || !data) return;

      if (data.status !== 'processing') {
        stopPolling();
        setUpload(data);
        setItems(data.extracted_items || []);

        if (data.status === 'failed') {
          toast.error(data.error_message || 'Extraction failed');
        }
      }
    }, POLL_INTERVAL);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startUpload = useCallback(async (
    file: File,
    orgId: string,
    locationId?: string,
    serviceRecordId?: string,
  ) => {
    setUploading(true);
    try {
      // Upload file to storage
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${orgId}/inspection-reports/${timestamp}_${safeName}`;

      await uploadFile(BUCKETS.REPORTS, storagePath, file, {
        contentType: file.type,
      });

      // Create upload record
      const { data: record, error: insertErr } = await supabase
        .from('deficiency_uploads')
        .insert({
          organization_id: orgId,
          location_id: locationId || null,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: storagePath,
          service_record_id: serviceRecordId || null,
          status: 'processing',
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (insertErr || !record) {
        throw new Error(insertErr?.message || 'Failed to create upload record');
      }

      setUpload(record);

      // Get storage URL for viewing
      const { data: urlData } = await supabase.storage
        .from(BUCKETS.REPORTS)
        .createSignedUrl(storagePath, 3600);
      if (urlData?.signedUrl) {
        setStorageUrl(urlData.signedUrl);
      }

      // Trigger edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      fetch(`${supabaseUrl}/functions/v1/extract-deficiencies-from-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ upload_id: record.id }),
      }).catch((e) => console.error('[useDeficiencyUpload] Edge function call failed:', e));

      // Start polling
      startPolling(record.id);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [user, startPolling]);

  const toggleItem = useCallback((itemId: string) => {
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, accepted: !i.accepted } : i
    ));
  }, []);

  const toggleAll = useCallback((accepted: boolean) => {
    setItems(prev => prev.map(i => ({ ...i, accepted })));
  }, []);

  const selectHighConfidenceOnly = useCallback(() => {
    setItems(prev => prev.map(i => ({
      ...i,
      accepted: i.confidence >= 0.9,
    })));
  }, []);

  const updateItem = useCallback((itemId: string, updates: Partial<ExtractedItem>) => {
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, ...updates, edited_at: new Date().toISOString() } : i
    ));
  }, []);

  const discardItem = useCallback((itemId: string) => {
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, accepted: false } : i
    ));
  }, []);

  const acceptItems = useCallback(async () => {
    if (!upload) return;
    setAccepting(true);

    const toCreate = items.filter(i => i.accepted);
    let successCount = 0;
    let failCount = 0;

    for (const item of toCreate) {
      const { error } = await supabase
        .from('deficiencies')
        .insert({
          organization_id: upload.organization_id,
          location_id: upload.location_id,
          code: item.code,
          title: item.title,
          description: item.description,
          severity: item.severity,
          category: item.category,
          status: 'open',
          timeline_requirement: item.timeline_requirement,
          required_action: item.required_action,
          location_description: item.location_description,
          equipment_name: item.equipment_name || null,
          found_date: new Date().toISOString().slice(0, 10),
          found_by: 'Inspection Report (AI Extraction)',
          ai_detected: true,
          ai_confidence: Math.round(item.confidence * 100),
          source_upload_id: upload.id,
          service_record_id: upload.service_record_id,
        });

      if (error) {
        console.error('[useDeficiencyUpload] Insert failed:', error);
        failCount++;
      } else {
        successCount++;
      }
    }

    // Update upload record
    await supabase
      .from('deficiency_uploads')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user?.id || null,
        items_accepted: successCount,
        items_discarded: items.filter(i => !i.accepted).length,
      })
      .eq('id', upload.id);

    // TODO: Log to audit_log table if it exists
    // await supabase.from('platform_audit_log').insert({
    //   organization_id: upload.organization_id,
    //   actor_id: user?.id,
    //   action: 'inspection_report_completed',
    //   resource_type: 'deficiency_upload',
    //   resource_id: upload.id,
    //   metadata: { file_name: upload.file_name, items_accepted: successCount, items_discarded: items.filter(i => !i.accepted).length },
    // });

    setAccepting(false);

    if (failCount > 0) {
      toast.error(`${failCount} deficiencies failed to create. ${successCount} created successfully.`);
    } else {
      toast.success(`${successCount} deficiencies created from ${upload.file_name}`);
    }

    return;
  }, [upload, items, user]);

  const cancel = useCallback(() => {
    stopPolling();
    if (upload) {
      supabase
        .from('deficiency_uploads')
        .update({ status: 'cancelled' })
        .eq('id', upload.id)
        .then(() => {});
    }
    setUpload(null);
    setItems([]);
    setStorageUrl(null);
  }, [upload, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setUpload(null);
    setItems([]);
    setStorageUrl(null);
  }, [stopPolling]);

  return {
    state,
    upload,
    items,
    uploading,
    accepting,
    startUpload,
    toggleItem,
    toggleAll,
    selectHighConfidenceOnly,
    updateItem,
    discardItem,
    acceptItems,
    cancel,
    reset,
    acceptedCount,
    highCount,
    mediumCount,
    lowCount,
    storageUrl,
  };
}
