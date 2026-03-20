// SUPERPOWERS-APP-01 — SP7: Team Compliance Leaderboard
// Staff ranked by compliance task performance

export interface LeaderboardEntry {
  userId: string;
  name: string;
  rank: number;
  totalScore: number;
  checklistScore: number;    // 40 pts max
  tempLogScore: number;      // 35 pts max
  caResolutionScore: number; // 25 pts max
}

interface EmployeeData {
  userId: string;
  name: string;
  checklistsCompleted: number;
  checklistsAssigned: number;
  tempLogsOnTime: number;
  tempLogsTotal: number;
  avgCAResolutionDays: number | null; // null = no CAs resolved
}

export function computeLeaderboard(employees: EmployeeData[]): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = employees.map(emp => {
    // Checklist completion (40 pts)
    const checklistRate = emp.checklistsAssigned > 0
      ? emp.checklistsCompleted / emp.checklistsAssigned
      : 0;
    const checklistScore = Math.round(checklistRate * 40);

    // Temp log consistency (35 pts)
    const tempRate = emp.tempLogsTotal > 0
      ? emp.tempLogsOnTime / emp.tempLogsTotal
      : 0;
    const tempLogScore = Math.round(tempRate * 35);

    // CA resolution speed (25 pts) — faster = higher score
    // Baseline: 7 days or less = full points, 30+ days = 0 points
    let caResolutionScore = 0;
    if (emp.avgCAResolutionDays !== null) {
      const days = emp.avgCAResolutionDays;
      if (days <= 7) {
        caResolutionScore = 25;
      } else if (days <= 30) {
        caResolutionScore = Math.round(25 * (1 - (days - 7) / 23));
      }
    } else {
      // No CAs assigned — give neutral score
      caResolutionScore = 15;
    }

    const totalScore = checklistScore + tempLogScore + caResolutionScore;

    return {
      userId: emp.userId,
      name: emp.name,
      rank: 0,
      totalScore,
      checklistScore,
      tempLogScore,
      caResolutionScore,
    };
  });

  // Sort by score descending
  entries.sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks
  entries.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return entries;
}
