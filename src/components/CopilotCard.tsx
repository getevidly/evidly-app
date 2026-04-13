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
    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fdf8e8' }}>
          <Bot className="h-5 w-5" style={{ color: '#A08C5A' }} />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">Compliance Copilot</h3>
          <p className="text-xs text-[#1E2D4D]/50">AI-powered insights</p>
        </div>
      </div>
      <div className="text-center py-6">
        <Sparkles className="h-8 w-8 mx-auto text-[#1E2D4D]/30 mb-2" />
        <p className="text-sm text-[#1E2D4D]/50">No insights yet</p>
        <p className="text-xs text-[#1E2D4D]/30 mt-1">Your AI Copilot will show signals as data is collected.</p>
      </div>
    </div>
  );
}
