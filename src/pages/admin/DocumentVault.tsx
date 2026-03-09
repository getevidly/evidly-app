/**
 * Document Vault — Secure storage for build docs, legal, IP
 * Route: /admin/vault
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadFile, getSignedUrl, deleteFile, BUCKETS } from '../../lib/storage';
import { toast } from 'sonner';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';

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
  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FAF7F2', border: '2px dashed #E2D9C8', borderRadius: 12 }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: TEXT_SEC, maxWidth: 400, margin: '0 auto' }}>{subtitle}</div>
  </div>
);

const Skeleton = ({ w = '100%', h = 20 }: { w?: string | number; h?: number }) => (
  <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
);

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  ppt: '📑', pptx: '📑', png: '🖼️', jpg: '🖼️', jpeg: '🖼️',
  zip: '📦', sql: '🗃️', json: '📋', csv: '📊', md: '📝',
};

export default function DocumentVault() {
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

  const inputStyle: React.CSSProperties = { padding: '8px 12px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 6, color: NAVY, fontSize: 13, width: '100%' };

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Document Vault' }]} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Document Vault</h1>
          <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
            {docs.length} documents · {formatSize(totalSize)}
          </p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)}
          style={{ padding: '8px 20px', background: GOLD, border: 'none', borderRadius: 8, color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {showUpload ? 'Cancel' : '+ Upload Document'}
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Upload Document</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Name *</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} style={inputStyle} placeholder="Document name" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Category</label>
              <select value={formCategory} onChange={e => setFormCategory(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Version</label>
              <input value={formVersion} onChange={e => setFormVersion(e.target.value)} style={inputStyle} placeholder="1.0" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>File</label>
              <input type="file" onChange={e => setFormFile(e.target.files?.[0] || null)}
                style={{ padding: '6px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 6, color: TEXT_SEC, fontSize: 12, width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: TEXT_SEC, display: 'block', marginBottom: 4 }}>Description</label>
            <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Brief description" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT_SEC, cursor: 'pointer' }}>
              <input type="checkbox" checked={formConfidential} onChange={e => setFormConfidential(e.target.checked)} />
              Confidential
            </label>
          </div>
          <button onClick={uploadDocument} disabled={uploading || !formName}
            style={{ padding: '8px 20px', background: uploading ? '#E5E7EB' : GOLD, border: 'none', borderRadius: 6, color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: uploading ? 'default' : 'pointer' }}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Category sidebar */}
        <div style={{ width: 180, flexShrink: 0 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
                padding: '8px 12px', marginBottom: 2, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: category === c ? '#FFFFFF' : 'transparent',
                color: category === c ? NAVY : TEXT_SEC, fontSize: 12, fontWeight: category === c ? 600 : 400,
                textAlign: 'left', boxShadow: category === c ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              <span>{c === 'all' ? 'All' : c}</span>
              {c !== 'all' && categoryCounts[c] ? (
                <span style={{ fontSize: 10, background: '#F3F4F6', padding: '2px 6px', borderRadius: 4, color: TEXT_MUTED }}>
                  {categoryCounts[c]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Document grid */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={120} />)}
            </div>
          ) : docs.length === 0 ? (
            <EmptyState icon="🔒" title="Vault is empty" subtitle="Upload build documents, legal agreements, and IP assets to secure them here." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
              {docs.map(doc => (
                <div key={doc.id} style={{ background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, position: 'relative' }}>
                  {doc.is_confidential && (
                    <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, padding: '2px 6px', background: '#FEF2F2', color: '#DC2626', borderRadius: 4, fontWeight: 700 }}>
                      CONFIDENTIAL
                    </span>
                  )}
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{getIcon(doc.file_type)}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>{doc.name}</div>
                  <div style={{ fontSize: 11, color: TEXT_SEC, marginBottom: 2 }}>{doc.category} {doc.version ? `· v${doc.version}` : ''}</div>
                  {doc.description && <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 8 }}>{doc.description}</div>}
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 8 }}>
                    {formatSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {doc.storage_path && (
                      <button onClick={async () => {
                        try {
                          const url = await getSignedUrl(BUCKETS.VAULT, doc.storage_path!, 60);
                          window.open(url, '_blank');
                        } catch { /* ignore */ }
                      }} style={{ padding: '4px 10px', background: '#F9FAFB', border: `1px solid ${BORDER}`, borderRadius: 4, color: TEXT_SEC, fontSize: 11, cursor: 'pointer' }}>
                        Download
                      </button>
                    )}
                    <button onClick={() => deleteDoc(doc)}
                      style={{ padding: '4px 10px', background: '#F9FAFB', border: `1px solid ${BORDER}`, borderRadius: 4, color: '#DC2626', fontSize: 11, cursor: 'pointer' }}>
                      Delete
                    </button>
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
