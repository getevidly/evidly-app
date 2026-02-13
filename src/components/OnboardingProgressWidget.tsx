import { useNavigate } from "react-router-dom";
import { FileText, CheckCircle2 } from "lucide-react";

interface OnboardingProgressWidgetProps {
  totalRequired: number;
  completedRequired: number;
  nextDocumentName?: string;
}

export function OnboardingProgressWidget({
  totalRequired,
  completedRequired,
  nextDocumentName,
}: OnboardingProgressWidgetProps) {
  const navigate = useNavigate();
  const progress = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
  const remaining = totalRequired - completedRequired;
  const isComplete = progress >= 100;

  if (isComplete) {
    return (
      <div className="rounded-xl border border-green-200 bg-[#f0fdf4] p-5">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-green-800">Documentation Complete</h3>
        </div>
        <p className="text-sm text-green-700 mb-3">All required documents uploaded</p>
        <button
          onClick={() => navigate("/documents")}
          className="text-sm font-medium text-green-700 hover:text-green-900 transition-colors"
        >
          View Documents
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#b8d4e8] bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-5 w-5 text-[#1e4d6b]" />
        <h3 className="font-semibold text-[#1e4d6b]">Onboarding Progress</h3>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: "#d4af37" }}
          />
        </div>
        <span className="text-sm font-medium text-gray-700">{progress}%</span>
      </div>

      <p className="text-sm text-gray-600 mb-2">
        {remaining} required document{remaining !== 1 ? "s" : ""} still needed
      </p>

      {nextDocumentName && (
        <p className="text-sm text-gray-500 mb-3">
          <span className="font-medium">Next:</span> Upload {nextDocumentName}
        </p>
      )}

      <button
        onClick={() => navigate("/document-checklist")}
        className="text-sm font-medium text-white px-4 py-2 rounded-lg transition-colors"
        style={{ backgroundColor: "#1e4d6b" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2a6a8f")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1e4d6b")}
      >
        Continue Setup &rarr;
      </button>
    </div>
  );
}
