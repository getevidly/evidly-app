import { Mail, Phone, Calendar, DollarSign, Clock, Award, Send, Briefcase, Trophy } from 'lucide-react';
import { type Employee, formatDate, formatDateTime, STATUS_CONFIG } from '../../data/employeesDemoData';
import { RoleBadge } from './RoleBadge';
import { ClockStatus } from './ClockStatus';

interface EmployeeOverviewProps {
  employee: Employee;
  isAdmin: boolean;
  onResendInvite: () => void;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: '#D1D9E6' }}>
        <h4 className="text-sm font-semibold" style={{ color: '#0B1628' }}>{title}</h4>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5" style={{ color: '#6B7F96' }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs" style={{ color: '#6B7F96' }}>{label}</p>
        <div className="text-sm font-medium mt-0.5" style={{ color: '#0B1628' }}>{value}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#F4F6FA' }}>
      <p className="text-xs" style={{ color: '#6B7F96' }}>{label}</p>
      <p className="text-lg font-bold mt-1" style={{ color: color || '#0B1628' }}>{value}</p>
    </div>
  );
}

export function EmployeeOverview({ employee, isAdmin, onResendInvite }: EmployeeOverviewProps) {
  const perf = employee.performance;
  const isPending = employee.status === 'pending';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Left column */}
      <div className="space-y-5">
        <Card title="Contact Information">
          <div className="space-y-1">
            <Row icon={<Mail className="w-4 h-4" />} label="Email" value={employee.email} />
            <Row icon={<Phone className="w-4 h-4" />} label="Phone" value={employee.phone || '—'} />
          </div>
        </Card>

        <Card title="Employment">
          <div className="space-y-1">
            <Row icon={<Briefcase className="w-4 h-4" />} label="Role" value={<RoleBadge role={employee.role} />} />
            <Row icon={<Calendar className="w-4 h-4" />} label="Hire Date" value={formatDate(employee.hireDate)} />
            {isAdmin && (
              <Row icon={<DollarSign className="w-4 h-4" />} label="Hourly Rate" value={employee.hourlyRate > 0 ? `$${employee.hourlyRate}/hr` : '—'} />
            )}
            {employee.serviceTypes.length > 0 && (
              <Row icon={<Briefcase className="w-4 h-4" />} label="Service Types" value={
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {employee.serviceTypes.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#EEF1F7', color: '#3D5068' }}>{s}</span>
                  ))}
                </div>
              } />
            )}
          </div>
        </Card>

        <Card title="Account">
          <div className="space-y-1">
            <Row icon={<Clock className="w-4 h-4" />} label="Last Login" value={employee.lastLogin ? formatDateTime(employee.lastLogin) : 'Never'} />
            <Row icon={<Send className="w-4 h-4" />} label="Invite Status" value={
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: STATUS_CONFIG[employee.status].color, backgroundColor: STATUS_CONFIG[employee.status].bg }}>
                {STATUS_CONFIG[employee.status].label}
              </span>
            } />
          </div>
          {isPending && (
            <button onClick={onResendInvite} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border hover:bg-gray-50" style={{ borderColor: '#D1D9E6', color: '#1E2D4D' }}>
              <Send className="w-3.5 h-3.5" /> Resend Invite
            </button>
          )}
        </Card>
      </div>

      {/* Right column */}
      <div className="space-y-5">
        <Card title="Quick Stats">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Jobs All Time" value={perf.jobsAllTime} />
            <Stat label="Jobs This Month" value={perf.jobsThisMonth} />
            <Stat label="Avg QA Score" value={perf.avgQaScore > 0 ? `${perf.avgQaScore}%` : '—'} color={perf.avgQaScore >= 90 ? '#16a34a' : perf.avgQaScore >= 80 ? '#d97706' : undefined} />
            <Stat label="Points Earned" value={perf.pointsEarned.toLocaleString()} color="#1E2D4D" />
          </div>
        </Card>

        <Card title="Current Week">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#3D5068' }}>Hours Worked</span>
              <span className="text-sm font-bold" style={{ color: '#0B1628' }}>{employee.hoursThisWeek}h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#3D5068' }}>Jobs Assigned</span>
              <span className="text-sm font-bold" style={{ color: '#0B1628' }}>{employee.jobsAssignedThisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#3D5068' }}>Clock Status</span>
              <ClockStatus state={employee.clockState} since={employee.clockSince} jobLocation={employee.jobLocation} />
            </div>
          </div>
        </Card>

        <Card title="Achievements">
          {perf.achievements.length > 0 ? (
            <div className="space-y-3">
              {perf.achievements.map(a => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#fffbeb' }}>
                    <Trophy className="w-4 h-4" style={{ color: '#d97706' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#0B1628' }}>{a.name}</p>
                    <p className="text-xs" style={{ color: '#6B7F96' }}>{formatDate(a.earnedDate)}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#E8EDF5' }}>
                <span className="text-xs" style={{ color: '#6B7F96' }}>Leaderboard Position</span>
                <span className="flex items-center gap-1 text-sm font-bold" style={{ color: '#1E2D4D' }}>
                  <Award className="w-4 h-4" /> #{perf.leaderboardPosition}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: '#6B7F96' }}>No achievements yet</p>
          )}
        </Card>
      </div>
    </div>
  );
}
