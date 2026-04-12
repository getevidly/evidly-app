// SUPERPOWERS-APP-01 — SP7: Team Leaderboard Card
import { Medal, Users, ClipboardList, Thermometer, Wrench } from 'lucide-react';

const MEDAL_STYLES = {
  1: { bg: 'bg-[#A08C5A]', text: 'text-white', label: '1st' },
  2: { bg: 'bg-[#6B7F96]', text: 'text-white', label: '2nd' },
  3: { bg: 'bg-[#A08C5A]/60', text: 'text-white', label: '3rd' },
};

export function TeamLeaderboardCard({ entries, isKitchenStaff, currentUserId }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#F4F6FA] rounded-lg">
            <Medal className="h-5 w-5 text-[#1E2D4D]" />
          </div>
          <h3 className="text-lg font-semibold text-[#0B1628]">Team Leaderboard</h3>
        </div>
        <div className="text-center py-8">
          <Users className="h-10 w-10 text-[#D1D9E6] mx-auto mb-3" />
          <p className="text-sm text-[#6B7F96]">No team performance data available</p>
          <p className="text-xs text-[#6B7F96] mt-1">Leaderboard requires checklist completions and temperature logs</p>
        </div>
      </div>
    );
  }

  // Kitchen staff: show only own entry
  const displayEntries = isKitchenStaff
    ? entries.filter(e => e.userId === currentUserId)
    : entries;

  return (
    <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F4F6FA] rounded-lg">
            <Medal className="h-5 w-5 text-[#1E2D4D]" />
          </div>
          <h3 className="text-lg font-semibold text-[#0B1628]">
            {isKitchenStaff ? 'Your Compliance Score' : 'Team Leaderboard'}
          </h3>
        </div>
        {!isKitchenStaff && (
          <span className="text-xs text-[#6B7F96]">{entries.length} team member{entries.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Column headers */}
      {!isKitchenStaff && (
        <div className="grid grid-cols-[40px_1fr_50px_50px_50px_60px] gap-2 px-3 py-2 text-xs text-[#6B7F96] uppercase tracking-wider font-medium border-b border-[#E8EDF5]">
          <span>#</span>
          <span>Name</span>
          <span className="text-center" title="Checklists (40 pts)"><ClipboardList className="h-3 w-3 mx-auto" /></span>
          <span className="text-center" title="Temp Logs (35 pts)"><Thermometer className="h-3 w-3 mx-auto" /></span>
          <span className="text-center" title="CA Speed (25 pts)"><Wrench className="h-3 w-3 mx-auto" /></span>
          <span className="text-right">Score</span>
        </div>
      )}

      <div className="divide-y divide-[#E8EDF5]">
        {displayEntries.map((entry) => {
          const medal = MEDAL_STYLES[entry.rank];
          const isCurrentUser = entry.userId === currentUserId;

          return (
            <div
              key={entry.userId}
              className={`grid grid-cols-[40px_1fr_50px_50px_50px_60px] gap-2 px-3 py-3 items-center ${
                isCurrentUser ? 'bg-[#A08C5A]/5' : ''
              }`}
            >
              <div>
                {medal ? (
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${medal.bg} ${medal.text}`}>
                    {medal.label}
                  </span>
                ) : (
                  <span className="text-sm text-[#6B7F96] pl-2">{entry.rank}</span>
                )}
              </div>
              <div>
                <p className={`text-sm ${isCurrentUser ? 'font-semibold text-[#0B1628]' : 'text-[#0B1628]'}`}>
                  {entry.name}
                  {isCurrentUser && <span className="text-xs text-[#A08C5A] ml-1">(You)</span>}
                </p>
              </div>
              <span className="text-xs text-center text-[#3D5068]">{entry.checklistScore}</span>
              <span className="text-xs text-center text-[#3D5068]">{entry.tempLogScore}</span>
              <span className="text-xs text-center text-[#3D5068]">{entry.caResolutionScore}</span>
              <span className="text-sm font-bold text-right text-[#0B1628]">{entry.totalScore}</span>
            </div>
          );
        })}
      </div>

      {/* Scoring legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#E8EDF5]">
        <div className="flex items-center gap-1">
          <ClipboardList className="h-3 w-3 text-[#6B7F96]" />
          <span className="text-xs text-[#6B7F96]">Checklists (40)</span>
        </div>
        <div className="flex items-center gap-1">
          <Thermometer className="h-3 w-3 text-[#6B7F96]" />
          <span className="text-xs text-[#6B7F96]">Temp Logs (35)</span>
        </div>
        <div className="flex items-center gap-1">
          <Wrench className="h-3 w-3 text-[#6B7F96]" />
          <span className="text-xs text-[#6B7F96]">CA Speed (25)</span>
        </div>
      </div>

      <p className="text-xs text-[#6B7F96] mt-2">
        Based on task completion data. Scores are advisory and updated periodically.
      </p>
    </div>
  );
}
