// SUPERPOWERS-APP-01 — SP5: Shift Summary Card
import { Sparkles, AlertTriangle, Info, CheckCircle, ClipboardList, Thermometer, Wrench } from 'lucide-react';

const FLAG_STYLES = {
  warning: { icon: AlertTriangle, bg: 'bg-[#991B1B]/10', text: 'text-[#991B1B]' },
  info: { icon: Info, bg: 'bg-[#A08C5A]/10', text: 'text-[#A08C5A]' },
  success: { icon: CheckCircle, bg: 'bg-[#166534]/10', text: 'text-[#166534]' },
};

export function ShiftSummaryCard({ summary }) {
  if (!summary) {
    return (
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-[#A08C5A]" />
          <h3 className="text-sm font-semibold text-[#0B1628]">Shift Intelligence</h3>
          <span className="px-1.5 py-0.5 bg-[#A08C5A]/10 text-[#A08C5A] text-[9px] font-medium rounded">AI</span>
        </div>
        <p className="text-xs text-[#6B7F96] text-center py-4">No shift data available for summary</p>
      </div>
    );
  }

  const { completionStats, flags, handoffNotes, shiftLabel } = summary;

  return (
    <div className="bg-white rounded-xl border border-[#D1D9E6] p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#A08C5A]" />
          <h3 className="text-sm font-semibold text-[#0B1628]">Shift Intelligence</h3>
          <span className="px-1.5 py-0.5 bg-[#A08C5A]/10 text-[#A08C5A] text-[9px] font-medium rounded">AI Summary</span>
        </div>
        <span className="text-[10px] text-[#6B7F96]">{shiftLabel}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#F4F6FA] rounded-lg p-3 text-center">
          <ClipboardList className="h-4 w-4 text-[#1E2D4D] mx-auto mb-1" />
          <p className="text-lg font-bold text-[#0B1628]">{completionStats.checklistsCompleted}/{completionStats.checklistsTotal}</p>
          <p className="text-[10px] text-[#6B7F96]">Checklists</p>
        </div>
        <div className="bg-[#F4F6FA] rounded-lg p-3 text-center">
          <Thermometer className="h-4 w-4 text-[#1E2D4D] mx-auto mb-1" />
          <p className="text-lg font-bold text-[#0B1628]">{completionStats.tempLogsRecorded}</p>
          <p className="text-[10px] text-[#6B7F96]">Temp Logs</p>
          {completionStats.tempFailures > 0 && (
            <p className="text-[9px] text-[#991B1B] font-medium">{completionStats.tempFailures} out of range</p>
          )}
        </div>
        <div className="bg-[#F4F6FA] rounded-lg p-3 text-center">
          <Wrench className="h-4 w-4 text-[#1E2D4D] mx-auto mb-1" />
          <p className="text-lg font-bold text-[#0B1628]">{completionStats.correctiveActionsResolved}</p>
          <p className="text-[10px] text-[#6B7F96]">CA Resolved</p>
        </div>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {flags.map((flag, i) => {
            const style = FLAG_STYLES[flag.type];
            const Icon = style.icon;
            return (
              <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${style.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${style.text} flex-shrink-0`} />
                <span className="text-xs text-[#0B1628]">{flag.message}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Handoff Notes */}
      <div className="border-t border-[#E8EDF5] pt-3">
        <p className="text-[10px] text-[#6B7F96] uppercase tracking-wider font-medium mb-1.5">Auto Handoff Notes</p>
        <ul className="space-y-1">
          {handoffNotes.map((note, i) => (
            <li key={i} className="text-xs text-[#3D5068] flex items-start gap-1.5">
              <span className="text-[#A08C5A] mt-0.5">•</span>
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
