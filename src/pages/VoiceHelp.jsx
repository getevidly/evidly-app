import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Mic, Thermometer, ClipboardList, AlertTriangle, ArrowRight } from 'lucide-react';

const VOICE_ROLES = ['kitchen_staff', 'chef', 'kitchen_manager', 'owner_operator'];

const COMMANDS = [
  {
    category: 'Temperature Logging',
    icon: Thermometer,
    color: '#1E2D4D',
    commands: [
      { phrase: 'Log temp walk-in 38', description: 'Logs 38\u00B0F for the walk-in cooler' },
      { phrase: 'Steam table 141 degrees', description: 'Logs 141\u00B0F for the steam table' },
      { phrase: 'Reach-in 40', description: 'Logs 40\u00B0F for the reach-in cooler' },
      { phrase: 'Freezer 0 degrees', description: 'Logs 0\u00B0F for the freezer' },
    ],
  },
  {
    category: 'Checklists',
    icon: ClipboardList,
    color: '#166534',
    commands: [
      { phrase: 'Start morning checklist', description: 'Opens the morning/opening checklist' },
      { phrase: 'Start closing checklist', description: 'Opens the closing/end-of-day checklist' },
      { phrase: 'Mark sanitize stations complete', description: 'Checks off the named item' },
      { phrase: "What's my next task?", description: 'Shows your next pending task' },
    ],
  },
  {
    category: 'Corrective Actions',
    icon: AlertTriangle,
    color: '#991B1B',
    commands: [
      { phrase: 'Open corrective action cold holding walk-in warm', description: 'Creates a Cold Holding CA with description' },
      { phrase: 'Report issue sanitation', description: 'Creates a Sanitation CA' },
      { phrase: 'Resolve corrective action', description: 'Navigates to resolve open CAs' },
    ],
  },
  {
    category: 'Shift',
    icon: ArrowRight,
    color: '#A08C5A',
    commands: [
      { phrase: 'Shift handoff ready', description: 'Opens the shift handoff flow' },
      { phrase: 'Shift done', description: 'Starts the shift handoff process' },
    ],
  },
];

export function VoiceHelp() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!VOICE_ROLES.includes(profile?.role)) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">Voice commands are available for kitchen roles only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#A08C5A] flex items-center justify-center">
          <Mic className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Voice Commands</h1>
          <p className="text-sm text-[var(--text-secondary)]">Hold the mic button and speak any command below</p>
        </div>
      </div>

      <div className="bg-[#A08C5A]/10 border border-[#A08C5A]/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-[var(--text-primary)] font-medium mb-1">How it works</p>
        <ol className="text-sm text-[var(--text-secondary)] space-y-1 list-decimal list-inside">
          <li>Press and hold the gold mic button in the bottom nav</li>
          <li>Speak your command clearly</li>
          <li>Release the button &mdash; EvidLY processes it instantly</li>
        </ol>
      </div>

      <div className="space-y-6">
        {COMMANDS.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.category} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
                <Icon className="w-4 h-4" style={{ color: group.color }} />
                <h2 className="font-semibold text-sm text-[var(--text-primary)]">{group.category}</h2>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {group.commands.map((cmd) => (
                  <div key={cmd.phrase} className="px-4 py-3">
                    <p className="text-sm font-medium text-[var(--text-primary)] font-mono bg-[var(--bg-panel)] rounded px-2 py-1 inline-block mb-1">
                      &ldquo;{cmd.phrase}&rdquo;
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">{cmd.description}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 mb-12 text-center">
        <p className="text-xs text-[var(--text-tertiary)]">
          Voice recognition works on Chrome, Edge, and Safari.
          <br />
          Ensure microphone permission is granted in your browser.
        </p>
      </div>
    </div>
  );
}
