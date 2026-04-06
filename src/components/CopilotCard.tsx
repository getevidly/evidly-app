/**
 * CopilotCard — Compliance Copilot sidebar widget.
 * Zero fake data — shows empty state until real signals are available.
 */
import { useNavigate } from 'react-router-dom';
import { Bot, Sparkles } from 'lucide-react';

interface CopilotCardProps {
  locationId: string;
}

export function CopilotCard({ locationId }: CopilotCardProps) {
  const navigate = useNavigate();

  // No fake data — show empty state
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fdf8e8' }}>
          <Bot className="h-5 w-5" style={{ color: '#d4af37' }} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Compliance Copilot</h3>
          <p className="text-xs text-gray-500">AI-powered insights</p>
        </div>
      </div>
      <div className="text-center py-6">
        <Sparkles className="h-8 w-8 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No insights yet</p>
        <p className="text-xs text-gray-400 mt-1">Your AI Copilot will show signals as data is collected.</p>
      </div>
    </div>
  );
}
