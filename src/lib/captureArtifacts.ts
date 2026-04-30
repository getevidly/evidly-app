import { supabase } from './supabase';

// ── Constants ─────────────────────────────────────────────────

const BUCKET = 'capture-artifacts';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Types ─────────────────────────────────────────────────────

export type ArtifactType =
  | 'photo'
  | 'audio'
  | 'ocr_text'
  | 'probe_payload'
  | 'iot_payload'
  | 'qr_payload'
  | 'transcript';

export interface UploadCaptureArtifactParams {
  file: File | Blob;
  filename?: string;
  artifactType: ArtifactType;
  mimeType?: string;
  organizationId: string;
  locationId: string;
  cooldownLogId?: string | null;
  cooldownTempCheckId?: string | null;
  receivingTempLogId?: string | null;
  temperatureLogId?: string | null;
  capturedBy?: string | null;
  notes?: string | null;
}

export interface UploadCaptureArtifactsParams {
  files: (File | Blob)[];
  filenames?: string[];
  artifactType: ArtifactType;
  organizationId: string;
  locationId: string;
  cooldownLogId?: string | null;
  cooldownTempCheckId?: string | null;
  receivingTempLogId?: string | null;
  temperatureLogId?: string | null;
  capturedBy?: string | null;
  notes?: string | null;
}

export interface UploadedArtifact {
  artifactId: string;
  storagePath: string;
  storageBucket: string;
  publicUrl: string | null;
  sizeBytes: number;
}

// ── Errors ────────────────────────────────────────────────────

export class UploadError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'UploadError';
  }
}

export class BatchUploadError extends Error {
  constructor(
    message: string,
    public readonly successful: UploadedArtifact[],
    public readonly failedIndex: number,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'BatchUploadError';
  }
}

// ── Internal helpers ──────────────────────────────────────────

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\'"]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) || 'capture';
}

function buildArtifactPath(
  orgId: string,
  locId: string,
  artifactType: ArtifactType,
  filename: string,
): string {
  const sanitized = sanitizeFilename(filename);
  return `${orgId}/${locId}/${artifactType}/${crypto.randomUUID()}-${sanitized}`;
}

function validateUuid(value: string, label: string): void {
  if (!UUID_RE.test(value)) {
    throw new UploadError(`${label} is not a valid UUID: ${value}`);
  }
}

interface SourceLink {
  column: string;
  value: string;
}

function validateSourceLink(params: UploadCaptureArtifactParams): SourceLink {
  const sources: [string, string | null | undefined][] = [
    ['temperature_log_id', params.temperatureLogId],
    ['receiving_temp_log_id', params.receivingTempLogId],
    ['cooldown_log_id', params.cooldownLogId],
    ['cooldown_temp_check_id', params.cooldownTempCheckId],
  ];

  const populated = sources.filter(([, val]) => val != null && val !== '');

  if (populated.length === 0) {
    throw new UploadError(
      'Exactly one source link is required (temperatureLogId, receivingTempLogId, cooldownLogId, or cooldownTempCheckId). None provided.',
    );
  }
  if (populated.length > 1) {
    throw new UploadError(
      `Exactly one source link is required. ${populated.length} provided: ${populated.map(([col]) => col).join(', ')}`,
    );
  }

  return { column: populated[0][0], value: populated[0][1]! };
}

// ── Public API ────────────────────────────────────────────────

export async function uploadCaptureArtifact(
  params: UploadCaptureArtifactParams,
): Promise<UploadedArtifact> {
  // 1. Validate inputs before touching Storage
  validateUuid(params.organizationId, 'organizationId');
  validateUuid(params.locationId, 'locationId');
  validateSourceLink(params);

  // 2. Resolve filename and path
  const rawFilename = params.filename
    ?? (params.file instanceof File ? params.file.name : 'capture');
  const storagePath = buildArtifactPath(
    params.organizationId,
    params.locationId,
    params.artifactType,
    rawFilename,
  );

  // 3. Upload binary to Storage
  const mimeType = params.mimeType ?? params.file.type || 'application/octet-stream';
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, params.file, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new UploadError(`Storage upload failed: ${uploadError.message}`);
  }

  // 4. Resolve capturedBy — fall back to current auth user
  let capturedBy = params.capturedBy ?? null;
  if (!capturedBy) {
    const { data: { user } } = await supabase.auth.getUser();
    capturedBy = user?.id ?? null;
  }

  // 5. Insert metadata row
  const { data: record, error: dbError } = await supabase
    .from('capture_artifacts')
    .insert({
      organization_id: params.organizationId,
      location_id: params.locationId,
      artifact_type: params.artifactType,
      storage_path: storagePath,
      storage_bucket: BUCKET,
      mime_type: mimeType,
      size_bytes: params.file.size,
      temperature_log_id: params.temperatureLogId ?? null,
      receiving_temp_log_id: params.receivingTempLogId ?? null,
      cooldown_log_id: params.cooldownLogId ?? null,
      cooldown_temp_check_id: params.cooldownTempCheckId ?? null,
      created_by: capturedBy,
      metadata: params.notes ? { notes: params.notes } : {},
    })
    .select('id')
    .single();

  if (dbError) {
    // Cleanup: remove orphan file from Storage (best effort)
    try {
      await supabase.storage.from(BUCKET).remove([storagePath]);
    } catch (cleanupError) {
      console.error('Cleanup failed for orphan file:', storagePath, cleanupError);
      // TODO: surface to ops monitoring once that infrastructure exists
    }
    throw new UploadError(`Metadata insert failed: ${dbError.message}`);
  }

  return {
    artifactId: record.id,
    storagePath,
    storageBucket: BUCKET,
    publicUrl: null,
    sizeBytes: params.file.size,
  };
}

export async function uploadCaptureArtifacts(
  params: UploadCaptureArtifactsParams,
): Promise<UploadedArtifact[]> {
  // Resolve capturedBy once for the batch to avoid redundant auth calls
  let capturedBy = params.capturedBy ?? null;
  if (!capturedBy) {
    const { data: { user } } = await supabase.auth.getUser();
    capturedBy = user?.id ?? null;
  }

  const promises = params.files.map((file, i) =>
    // notes apply to every file in the batch — intentional; consumers wanting per-file notes should call uploadCaptureArtifact() in a loop instead.
    uploadCaptureArtifact({
      file,
      filename: params.filenames?.[i],
      artifactType: params.artifactType,
      organizationId: params.organizationId,
      locationId: params.locationId,
      cooldownLogId: params.cooldownLogId,
      cooldownTempCheckId: params.cooldownTempCheckId,
      receivingTempLogId: params.receivingTempLogId,
      temperatureLogId: params.temperatureLogId,
      capturedBy,
      notes: params.notes,
    }),
  );

  const results = await Promise.allSettled(promises);

  const successful: UploadedArtifact[] = [];
  let firstFailure: { index: number; error: Error } | null = null;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else if (!firstFailure) {
      firstFailure = {
        index: i,
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
      };
    }
  }

  if (firstFailure) {
    throw new BatchUploadError(
      `Batch upload failed at index ${firstFailure.index}: ${firstFailure.error.message}`,
      successful,
      firstFailure.index,
      firstFailure.error,
    );
  }

  return successful;
}
