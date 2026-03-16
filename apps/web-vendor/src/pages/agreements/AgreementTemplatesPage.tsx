import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FileText,
  Edit,
  Copy,
  Trash2,
  Clock,
  MoreVertical,
} from 'lucide-react';
import {
  useAgreementTemplates,
  useDuplicateAgreementTemplate,
} from '@/hooks/api/useAgreements';

export function AgreementTemplatesPage() {
  const { data: templates, isLoading } = useAgreementTemplates();
  const duplicateMutation = useDuplicateAgreementTemplate();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleDuplicate = (id: string) => {
    duplicateMutation.mutate(id);
    setOpenMenuId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      // delete handled by parent or additional hook
    }
    setOpenMenuId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1628]">
              Agreement Templates
            </h1>
            <p className="text-[#6B7F96] mt-1">
              Create and manage reusable agreement templates
            </p>
          </div>
          <Link
            to="/agreements/templates/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </Link>
        </div>

        {/* Templates Grid */}
        {!templates || templates.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F4F6FA] border border-[#D1D9E6] flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-[#6B7F96]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0B1628] mb-2">
              No agreement templates yet
            </h3>
            <p className="text-[#6B7F96] max-w-md">
              Create your first template to streamline your agreement process.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template: any) => (
              <div
                key={template.id}
                className="bg-white rounded-xl border border-[#D1D9E6] p-5 hover:shadow-md transition-shadow relative"
              >
                {/* Menu */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() =>
                      setOpenMenuId(
                        openMenuId === template.id ? null : template.id
                      )
                    }
                    className="p-1 rounded hover:bg-[#F4F6FA] text-[#6B7F96]"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenuId === template.id && (
                    <div className="absolute right-0 top-8 w-44 bg-white rounded-lg border border-[#D1D9E6] shadow-lg z-10 py-1">
                      <Link
                        to={`/agreements/templates/${template.id}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[#0B1628] hover:bg-[#F4F6FA] w-full"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDuplicate(template.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[#0B1628] hover:bg-[#F4F6FA] w-full"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex items-start gap-3 mb-4 pr-8">
                  <div className="w-10 h-10 rounded-lg bg-[#1e4d6b]/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-[#1e4d6b]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0B1628]">
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-[#6B7F96] mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {template.default_term_months || 12} month default term
                      </span>
                    </div>
                  </div>
                </div>

                {/* Services badges */}
                {template.services && template.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {template.services.map((service: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#1e4d6b]/10 text-[#1e4d6b]"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgreementTemplatesPage;
