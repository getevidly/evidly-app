import { useNavigate } from 'react-router-dom';
import { Bot, ChevronRight, Sparkles } from 'lucide-react';

// ── Main Component ────────────────────────────────────────

export function CopilotInsights() {
  const navigate = useNavigate();

  // Zero fake data — show empty state until real Supabase signals are available
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fdf8e8' }}>
          <Bot className="h-5 w-5" style={{ color: '#d4af37' }} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Compliance Copilot</h1>
          <p className="text-sm text-gray-500">Proactive insights from AI analysis of your compliance data</p>
        </div>
      </div>
      <div className="text-center py-16">
        <Sparkles className="h-12 w-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No insights yet</p>
        <p className="text-gray-400 text-sm mt-1">Your AI Copilot will surface signals as data is collected.</p>
        <button
          onClick={() => navigate('/ai-advisor')}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: '#1e4d6b' }}
        >
          Ask EvidLY AI
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
