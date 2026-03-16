import { useState } from 'react';
import { FileText, Plus, X, Tag } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/api/useMarketing';

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  onboarding: { bg: '#DBEAFE', text: '#1E40AF' },
  sales: { bg: '#DCFCE7', text: '#166534' },
  service: { bg: '#EDE9FE', text: '#6D28D9' },
  retention: { bg: '#FFEDD5', text: '#C2410C' },
  outreach: { bg: '#FEE2E2', text: '#991B1B' },
  referral: { bg: '#CCFBF1', text: '#0F766E' },
  review: { bg: '#FEF9C3', text: '#854D0E' },
  promotion: { bg: '#FCE7F3', text: '#BE185D' },
};

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  merge_fields: string[];
}

export function EmailTemplatesPage() {
  const { data, isLoading } = useEmailTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const templates: EmailTemplate[] = data?.templates ?? [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6FA' }}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0B1628' }}>Email Templates</h1>
            <p className="mt-1 text-sm" style={{ color: '#6B7F96' }}>Manage reusable email templates for campaigns and sequences</p>
          </div>
          <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors" style={{ backgroundColor: '#1e4d6b' }}><Plus className="h-4 w-4" /> Create Template</button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><p className="text-sm" style={{ color: '#6B7F96' }}>Loading templates...</p></div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border bg-white py-16" style={{ borderColor: '#D1D9E6' }}>
            <FileText className="mb-3 h-10 w-10" style={{ color: '#D1D9E6' }} />
            <p className="text-sm font-medium" style={{ color: '#0B1628' }}>No email templates yet.</p>
            <p className="mt-1 text-xs" style={{ color: '#6B7F96' }}>Create your first template to streamline campaign content.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => {
              const catStyle = CATEGORY_STYLES[t.category] ?? { bg: '#F3F4F6', text: '#6B7280' };
              return (
                <button key={t.id} onClick={() => setSelectedTemplate(t)} className="rounded-lg border bg-white p-5 text-left transition-shadow hover:shadow-md" style={{ borderColor: '#D1D9E6' }}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold" style={{ color: '#0B1628' }}>{t.name}</h3>
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize" style={{ backgroundColor: catStyle.bg, color: catStyle.text }}>{t.category}</span>
                  </div>
                  <p className="mb-3 truncate text-xs" style={{ color: '#6B7F96' }}>{t.subject}</p>
                  {t.merge_fields.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {t.merge_fields.map((field) => (
                        <span key={field} className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium" style={{ borderColor: '#D1D9E6', color: '#6B7F96' }}><Tag className="h-2.5 w-2.5" />{field}</span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-xl border bg-white shadow-xl" style={{ borderColor: '#D1D9E6' }}>
              <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#D1D9E6' }}>
                <h2 className="text-lg font-bold" style={{ color: '#0B1628' }}>{selectedTemplate.name}</h2>
                <button onClick={() => setSelectedTemplate(null)} className="rounded p-1 transition-colors hover:bg-gray-100"><X className="h-5 w-5" style={{ color: '#6B7F96' }} /></button>
              </div>
              <div className="space-y-4 px-6 py-5">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase" style={{ color: '#6B7F96' }}>Subject</p>
                  <p className="text-sm" style={{ color: '#0B1628' }}>{selectedTemplate.subject}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase" style={{ color: '#6B7F96' }}>Body</p>
                  <div className="whitespace-pre-wrap rounded-lg border p-3 text-sm" style={{ borderColor: '#D1D9E6', color: '#0B1628', backgroundColor: '#F4F6FA' }}>{selectedTemplate.body}</div>
                </div>
                {selectedTemplate.merge_fields.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase" style={{ color: '#6B7F96' }}>Merge Fields</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.merge_fields.map((field) => (<span key={field} className="rounded-md border px-2.5 py-1 text-xs font-medium" style={{ borderColor: '#D1D9E6', color: '#1e4d6b' }}>{field}</span>))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end border-t px-6 py-4" style={{ borderColor: '#D1D9E6' }}>
                <button onClick={() => setSelectedTemplate(null)} className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailTemplatesPage;
