import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Cloud, Loader2, AlertCircle } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImportSource = 'google_drive' | 'onedrive' | 'dropbox';

export interface CloudImportResult {
  file: File;
  importSource: ImportSource;
  originalFilename: string;
}

interface CloudImportPickerProps {
  onFilesImported: (results: CloudImportResult[]) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

interface ProviderConfig {
  id: ImportSource;
  label: string;
  color: string;
  hoverColor: string;
  icon: React.ReactNode;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'google_drive',
    label: 'Google Drive',
    color: '#4285F4',
    hoverColor: '#3367D6',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4.433 22l-1.6-2.7L8.9 9.2l1.6 2.7L4.433 22z" fill="#0066DA" />
        <path d="M19.567 22H4.433l1.6-2.7h13.534l1.6 2.7H19.567z" fill="#00AC47" />
        <path d="M15.1 9.2l6.067 10.1-1.6 2.7L13.5 11.9 15.1 9.2z" fill="#EA4335" />
        <path d="M8.9 2L15.1 9.2H2.833L8.9 2z" fill="#00832D" />
        <path d="M15.1 9.2L8.9 2l6.2 0 6.067 7.2H15.1z" fill="#2684FC" />
        <path d="M8.9 9.2l1.6 2.7L8.9 9.2z" fill="#00AC47" />
      </svg>
    ),
  },
  {
    id: 'onedrive',
    label: 'OneDrive',
    color: '#0078D4',
    hoverColor: '#106EBE',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M10.5 7.5C11.5 5.7 13.5 4.5 15.8 4.5c3.4 0 6.2 2.8 6.2 6.2 0 .3 0 .6-.1.9 1.3.7 2.1 2.1 2.1 3.6 0 2.3-1.9 4.2-4.2 4.2H6.2c-2.9 0-5.2-2.3-5.2-5.2 0-2.5 1.8-4.6 4.1-5.1.6-1 1.7-1.7 3-1.7.8 0 1.6.3 2.2.8l.2.3z" fill="#0078D4" />
      </svg>
    ),
  },
  {
    id: 'dropbox',
    label: 'Dropbox',
    color: '#0061FF',
    hoverColor: '#004FC4',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M7.1 2L1 6.1l5.1 4.1L12 6.1 7.1 2z" fill="#0061FF" />
        <path d="M1 14.2l6.1 4.1L12 14.2 6.1 10.1 1 14.2z" fill="#0061FF" />
        <path d="M12 14.2l4.9 4.1 6.1-4.1-6.1-4.1L12 14.2z" fill="#0061FF" />
        <path d="M23 6.1L16.9 2 12 6.1l5.1 4.1L23 6.1z" fill="#0061FF" />
        <path d="M12.1 15.4l-5 4-1.1-.7v.8l6.1 3.7 6.1-3.7v-.8l-1.1.7-5-4z" fill="#0061FF" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Demo mode simulated files
// ---------------------------------------------------------------------------

const DEMO_FILES: Record<ImportSource, { name: string; type: string; size: number }> = {
  google_drive: {
    name: 'Health_Permit_2026_Downtown.pdf',
    type: 'application/pdf',
    size: 245_000,
  },
  onedrive: {
    name: 'Fire_Suppression_Cert_Q1_2026.pdf',
    type: 'application/pdf',
    size: 189_000,
  },
  dropbox: {
    name: 'Food_Handler_Certificate_Rodriguez.jpg',
    type: 'image/jpeg',
    size: 312_000,
  },
};

function createDemoFile(source: ImportSource): File {
  const meta = DEMO_FILES[source];
  const content = `[Demo placeholder — imported from ${source}]\nFilename: ${meta.name}`;
  const blob = new Blob([content], { type: meta.type });
  return new File([blob], meta.name, { type: meta.type, lastModified: Date.now() });
}

// ---------------------------------------------------------------------------
// Google Drive Picker
// ---------------------------------------------------------------------------

async function openGoogleDrivePicker(): Promise<{ name: string; url: string; mimeType: string } | null> {
  const clientId = (window as any).__EVIDLY_GDRIVE_CLIENT_ID;
  const apiKey = (window as any).__EVIDLY_GDRIVE_API_KEY;

  if (!clientId || !apiKey) {
    toast.error('Google Drive is not configured. Contact your administrator to set up the integration.');
    return null;
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      (window as any).gapi.load('picker', () => {
        const picker = new (window as any).google.picker.PickerBuilder()
          .addView((window as any).google.picker.ViewId.DOCS)
          .setOAuthToken(clientId)
          .setDeveloperKey(apiKey)
          .setCallback((data: any) => {
            if (data.action === 'picked' && data.docs?.[0]) {
              const doc = data.docs[0];
              resolve({
                name: doc.name,
                url: doc.url,
                mimeType: doc.mimeType || 'application/pdf',
              });
            } else if (data.action === 'cancel') {
              resolve(null);
            }
          })
          .build();
        picker.setVisible(true);
      });
    };
    script.onerror = () => {
      toast.error('Failed to load Google Drive picker');
      resolve(null);
    };
    document.body.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// OneDrive Picker
// ---------------------------------------------------------------------------

async function openOneDrivePicker(): Promise<{ name: string; url: string; mimeType: string } | null> {
  const clientId = (window as any).__EVIDLY_ONEDRIVE_CLIENT_ID;

  if (!clientId) {
    toast.error('OneDrive is not configured. Contact your administrator to set up the integration.');
    return null;
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://js.live.net/v7.2/OneDrive.js';
    script.onload = () => {
      (window as any).OneDrive.open({
        clientId,
        action: 'download',
        multiSelect: false,
        advanced: { redirectUri: window.location.origin },
        success: (files: any) => {
          if (files?.value?.[0]) {
            const f = files.value[0];
            resolve({
              name: f.name,
              url: f['@microsoft.graph.downloadUrl'] || f.webUrl,
              mimeType: f.file?.mimeType || 'application/pdf',
            });
          } else {
            resolve(null);
          }
        },
        cancel: () => resolve(null),
        error: (err: any) => {
          console.error('[OneDrive] Picker error:', err);
          toast.error('OneDrive picker encountered an error');
          resolve(null);
        },
      });
    };
    script.onerror = () => {
      toast.error('Failed to load OneDrive picker');
      resolve(null);
    };
    document.body.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// Dropbox Chooser
// ---------------------------------------------------------------------------

async function openDropboxChooser(): Promise<{ name: string; url: string; mimeType: string } | null> {
  const appKey = (window as any).__EVIDLY_DROPBOX_APP_KEY;

  if (!appKey) {
    toast.error('Dropbox is not configured. Contact your administrator to set up the integration.');
    return null;
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
    script.id = 'dropboxjs';
    script.dataset.appKey = appKey;
    script.onload = () => {
      (window as any).Dropbox.choose({
        linkType: 'direct',
        multiselect: false,
        extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx', '.csv'],
        success: (files: any[]) => {
          if (files?.[0]) {
            const f = files[0];
            resolve({
              name: f.name,
              url: f.link,
              mimeType: guessMimeType(f.name),
            });
          } else {
            resolve(null);
          }
        },
        cancel: () => resolve(null),
      });
    };
    script.onerror = () => {
      toast.error('Failed to load Dropbox chooser');
      resolve(null);
    };
    document.body.appendChild(script);
  });
}

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
  };
  return map[ext || ''] || 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// Server-side file fetch (production only)
// ---------------------------------------------------------------------------

async function fetchCloudFile(
  url: string,
  filename: string,
  mimeType: string,
  source: ImportSource,
): Promise<File> {
  const { supabase } = await import('../../lib/supabase');

  const { data, error } = await supabase.functions.invoke('cloud-file-import', {
    body: { url, filename, mimeType, importSource: source },
  });

  if (error || !data?.success) {
    const reason = data?.error || error?.message || 'Unknown error';
    throw new Error(reason);
  }

  // Edge function returns file as base64
  const binary = atob(data.fileBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mimeType, lastModified: Date.now() });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CloudImportPicker({ onFilesImported, disabled }: CloudImportPickerProps) {
  const { isDemoMode } = useDemo();
  const [importing, setImporting] = useState<ImportSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProviderClick = useCallback(async (provider: ImportSource) => {
    if (importing) return;
    setImporting(provider);
    setError(null);

    try {
      if (isDemoMode) {
        // Simulate import delay
        await new Promise(r => setTimeout(r, 1200));
        const file = createDemoFile(provider);
        const providerLabel = PROVIDERS.find(p => p.id === provider)?.label || provider;
        toast.success(`Imported "${file.name}" from ${providerLabel}`);
        onFilesImported([{ file, importSource: provider, originalFilename: file.name }]);
      } else {
        // Production: open real picker
        let result: { name: string; url: string; mimeType: string } | null = null;

        if (provider === 'google_drive') result = await openGoogleDrivePicker();
        else if (provider === 'onedrive') result = await openOneDrivePicker();
        else if (provider === 'dropbox') result = await openDropboxChooser();

        if (!result) {
          setImporting(null);
          return; // User cancelled
        }

        // Fetch file server-side
        const file = await fetchCloudFile(result.url, result.name, result.mimeType, provider);
        const providerLabel = PROVIDERS.find(p => p.id === provider)?.label || provider;
        toast.success(`Imported "${result.name}" from ${providerLabel}`);
        onFilesImported([{ file, importSource: provider, originalFilename: result.name }]);
      }
    } catch (err: any) {
      const message = err?.message || 'Import failed';
      setError(message);
      toast.error(`Import failed: ${message}`);
    } finally {
      setImporting(null);
    }
  }, [isDemoMode, importing, onFilesImported]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[#1E2D4D]/50 flex items-center gap-1.5">
        <Cloud size={13} />
        Import from Cloud
      </p>
      <div className="flex flex-wrap gap-2">
        {PROVIDERS.map((provider) => {
          const isLoading = importing === provider.id;
          return (
            <button
              key={provider.id}
              type="button"
              disabled={disabled || importing !== null}
              onClick={() => handleProviderClick(provider.id)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: '#d1d5db',
                color: '#374151',
              }}
              onMouseEnter={(e) => {
                if (!disabled && !importing) {
                  e.currentTarget.style.borderColor = provider.color;
                  e.currentTarget.style.backgroundColor = `${provider.color}08`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" style={{ color: provider.color }} />
              ) : (
                provider.icon
              )}
              <span className="hidden sm:inline text-xs font-medium">{provider.label}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
}
