/**
 * Document Vault — Secure storage for build docs, legal, IP
 * Route: /admin/vault
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadFile, getSignedUrl, deleteFile, BUCKETS } from '../../lib/storage';
import { toast } from 'sonner';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import Button from '../../components/ui/Button';

const CATEGORIES = ['all', 'Build Docs', 'Architecture', 'Legal', 'Financial', 'Pitch', 'Security', 'Contracts', 'IP', 'Other'];

interface VaultDoc {
  id: string;
  name: string;
  category: string;
  description: string | null;
  version: string | null;
  file_size: number | null;
  file_type: string | null;
  storage_path: string | null;
  is_confidential: boolean;
  uploaded_by: string | null;
  created_at: string;
  last_accessed_at: string | null;
}

const EmptyState = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div className="text-center py-[60px] px-5 bg-cream-warm border-2 border-dashed border-border_ui-warm rounded-xl">
    <div className="text-[40px] mb-4">{icon}</div>
    <div className="text-base font-bold text-navy mb-2">{title}</div>
    <div className="text-[13px] text-slate_ui max-w-[400px] mx-auto">{subtitle}</div>
  </div>
);

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div className="bg-gray-200 rounded-md animate-pulse" style={{ width: w, height: h }} />
);

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  ppt: '📑', pptx: '📑', png: '🖼️', jpg: '🖼️', jpeg: '🖼️',
  zip: '📦', sql: '🗃️', json: '📋', csv: '📊', md: '📝',
};

export default function DocumentVault() {
  useDemoGuard();
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Build Docs');
  const [formDescription, setFormDescription] = useState('');
  const [formVersion, setFormVersion] = useState('1.0');
  const [formConfidential, setFormConfidential] = useState(false);
  const [formFile, setFormFile] = useState<File | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('vault_documents').select('*').order('created_at', { ascending: false });
    if (category !== 'all') query = query.eq('category', category);
    const { data } = await query;
    if (data) setDocs(data);
    setLoading(false);
  }, [category]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getIcon = (fileType: string | null) => {
    if (!fileType) return '📁';
    const ext = fileType.split('/').pop()?.toLowerCase() || '';
    return FILE_ICONS[ext] || '📁';
  };

  const uploadDocument = async () => {
    if (!formName) return;
    setUploading(true);

    let storagePath: string | null = null;
    let fileSize: number | null = null;
    let fileType: string | null = null;

    if (formFile) {
      const safeName = `${Date.now()}-${formFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      try {
        await uploadFile(BUCKETS.VAULT, safeName, formFile);
      } catch (e: any) {
        toast.error(`Upload failed: ${e.message}`);
        setUploading(false);
        return;
      }
      storagePath = safeName;
      fileSize = formFile.size;
      fileType = formFile.type;
    }

    const { error } = await supabase.from('vault_documents').insert({
      name: formName,
      category: formCategory,
      description: formDescription || null,
      version: formVersion || null,
      file_size: fileSize,
      file_type: fileType,
      storage_path: storagePath,
      is_confidential: formConfidential,
    });

    if (error) {
      toast.error(`Upload failed: ${error.message}`);
    } else {
      setFormName('');
      setFormDescription('');
      setFormVersion('1.0');
      setFormConfidential(false);
      setFormFile(null);
      setShowUpload(false);
      await loadDocs();
    }
    setUploading(false);
  };

  const deleteDoc = async (doc: VaultDoc) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    if (doc.storage_path) {
      await deleteFile(BUCKETS.VAULT, doc.storage_path);
    }
    await supabase.from('vault_documents').delete().eq('id', doc.id);
    await loadDocs();
  };

  const categoryCounts = docs.reduce<Record<string, number>>((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {});

  const totalSize = docs.reduce((a, d) => a + (d.file_size || 0), 0);

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Document Vault' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Document Vault</h1>
          <p className="text-[13px] text-slate_ui mt-1">
            {docs.length} documents · {formatSize(totalSize)}
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? 'Cancel' : '+ Upload Document'}
        </Button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="bg-white border border-border_ui-warm rounded-xl p-5">
          <h3 className="text-sm font-bold text-navy mb-4">Upload Document</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[11px] text-slate_ui block mb-1">Name *</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full" placeholder="Document name" />
            </div>
            <div>
              <label className="text-[11px] text-slate_ui block mb-1">Category</label>
              <select value={formCategory} onChange={e => setFormCategory(e.target.value)}
                className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full cursor-pointer">
                {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate_ui block mb-1">Version</label>
              <input value={formVersion} onChange={e => setFormVersion(e.target.value)} className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full" placeholder="1.0" />
            </div>
            <div>
              <label className="text-[11px] text-slate_ui block mb-1">File</label>
              <input type="file" onChange={e => setFormFile(e.target.files?.[0] || null)}
                className="p-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate_ui text-xs w-full" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[11px] text-slate_ui block mb-1">Description</label>
            <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full resize-y" placeholder="Brief description" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-1.5 text-xs text-slate_ui cursor-pointer">
              <input type="checkbox" checked={formConfidential} onChange={e => setFormConfidential(e.target.checked)} />
              Confidential
            </label>
          </div>
          <Button variant="gold" size="sm" onClick={uploadDocument} disabled={uploading || !formName}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      )}

      <div className="flex gap-5">
        {/* Category sidebar */}
        <div className="w-[180px] shrink-0">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`flex justify-between items-center w-full px-3 py-2 mb-0.5 rounded-md border-none cursor-pointer text-xs text-left ${
                category === c
                  ? 'bg-white text-navy font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'bg-transparent text-slate_ui font-normal'
              }`}>
              <span>{c === 'all' ? 'All' : c}</span>
              {c !== 'all' && categoryCounts[c] ? (
                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400">
                  {categoryCounts[c]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Document grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={120} />)}
            </div>
          ) : docs.length === 0 ? (
            <EmptyState icon="🔒" title="Vault is empty" subtitle="Upload build documents, legal agreements, and IP assets to secure them here." />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
              {docs.map(doc => (
                <div key={doc.id} className="bg-white border border-border_ui-warm rounded-[10px] p-4 relative">
                  {doc.is_confidential && (
                    <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-bold">
                      CONFIDENTIAL
                    </span>
                  )}
                  <div className="text-2xl mb-2">{getIcon(doc.file_type)}</div>
                  <div className="text-sm font-semibold text-navy mb-1">{doc.name}</div>
                  <div className="text-[11px] text-slate_ui mb-0.5">{doc.category} {doc.version ? `· v${doc.version}` : ''}</div>
                  {doc.description && <div className="text-[11px] text-gray-400 mb-2">{doc.description}</div>}
                  <div className="text-[11px] text-gray-400 mb-2">
                    {formatSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-1.5">
                    {doc.storage_path && (
                      <Button variant="secondary" size="sm" onClick={async () => {
                        try {
                          const url = await getSignedUrl(BUCKETS.VAULT, doc.storage_path!, 60);
                          window.open(url, '_blank');
                        } catch { /* ignore */ }
                      }} className="text-[11px]">
                        Download
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => deleteDoc(doc)}
                      className="text-red-600 text-[11px]">
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
