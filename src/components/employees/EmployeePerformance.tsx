import { BarChart3, TrendingUp, Target, Clock, ThumbsUp, AlertTriangle } from 'lucide-react';
import { type PerformanceMetrics } from '../../data/employeesDemoData';

interface EmployeePerformanceProps {
  performance: PerformanceMetrics;
  name: string;
}

function MetricCard({ icon, label, value, subtext, color }: { icon: React.ReactNode; label: string; value: string | number; subtext?: string; color?: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: color || '#1e4d6b' }}>{icon}</span>
        <span className="text-xs font-medium" style={{ color: '#6B7F96' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: color || '#0B1628' }}>{value}</p>
      {subtext && <p className="text-xs mt-1" style={{ color: '#6B7F96' }}>{subtext}</p>}
    </div>
  );
}

function MiniBar({ values, max, color }: { values: number[]; max: number; color: string }) {
  if (values.length === 0) return <p className="text-sm py-6 text-center" style={{ color: '#6B7F96' }}>No data</p>;
  return (
    <div className="flex items-end gap-1 h-20">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t"
            style={{ height: `${Math.max(4, (v / max) * 100)}%`, backgroundColor: color, minHeight: 4 }}
            title={String(v)}
          />
          <span className="text-[10px]" style={{ color: '#6B7F96' }}>W{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

export function EmployeePerformance({ performance: perf, name }: EmployeePerformanceProps) {
  const maxJobs = Math.max(...perf.weeklyJobs, 1);
  const maxQa = 100;

  return (
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard icon={<BarChart3 className="w-4 h-4" />} label="Jobs Completed" value={perf.jobsAllTime} subtext={`${perf.jobsThisMonth} this month`} />
        <MetricCard icon={<Target className="w-4 h-4" />} label="Avg QA Score" value={perf.avgQaScore > 0 ? `${perf.avgQaScore}%` : '—'} color={perf.avgQaScore >= 90 ? '#16a34a' : perf.avgQaScore >= 80 ? '#d97706' : undefined} subtext="First-try approval" />
        <MetricCard icon={<Clock className="w-4 h-4" />} label="On-Time Rate" value={`${perf.onTimeRate}%`} color={perf.onTimeRate >= 95 ? '#16a34a' : perf.onTimeRate >= 85 ? '#d97706' : '#dc2626'} />
        <MetricCard icon={<AlertTriangle className="w-4 h-4" />} label="Deficiencies Documented" value={perf.deficienciesDocumented} color="#d97706" />
        <MetricCard icon={<ThumbsUp className="w-4 h-4" />} label="Customer Compliments" value={perf.customerCompliments} color="#16a34a" />
        <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Points Earned" value={perf.pointsEarned.toLocaleString()} color="#1e4d6b" subtext={`#${perf.leaderboardPosition} on leaderboard`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
          <h4 className="text-sm font-semibold mb-3" style={{ color: '#0B1628' }}>Jobs per Week (Last 8 Weeks)</h4>
          <MiniBar values={perf.weeklyJobs} max={maxJobs} color="#1e4d6b" />
        </div>
        <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
          <h4 className="text-sm font-semibold mb-3" style={{ color: '#0B1628' }}>QA Scores (Last 8 Weeks)</h4>
          <MiniBar values={perf.weeklyQaScores} max={maxQa} color="#16a34a" />
        </div>
      </div>

      {/* Achievements */}
      <div className="rounded-xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: '#D1D9E6' }}>
          <h4 className="text-sm font-semibold" style={{ color: '#0B1628' }}>Achievements</h4>
        </div>
        <div className="px-5 py-4">
          {perf.achievements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {perf.achievements.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#F4F6FA' }}>
                  <span className="text-lg">🏆</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#0B1628' }}>{a.name}</p>
                    <p className="text-xs" style={{ color: '#6B7F96' }}>{new Date(a.earnedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: '#6B7F96' }}>No achievements earned yet. Complete jobs and maintain quality to earn achievements!</p>
          )}
        </div>
      </div>
    </div>
  );
}
