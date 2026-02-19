import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BookOpen, GraduationCap, Award, Scale, Settings2,
  Search, Filter, Clock, Users, Play, ChevronRight,
  CheckCircle2, AlertTriangle, XCircle, BarChart3,
  Download, Eye, Plus, RefreshCw, TrendingUp,
  BookOpenCheck, Brain, Globe, Flame, Shield,
  FileText, DollarSign, CalendarClock, ArrowRight,
  Building2, UserCheck, AlertCircle, Star, Zap,
  Target, Send, CreditCard, Check, X, Printer,
} from 'lucide-react';
import {
  trainingCourses, trainingModules, trainingEnrollments, trainingCertificates,
  trainingSB476Log, trainingQuizAttempts,
  certificationRequirements, trainingRecords,
  type TrainingCourse, type TrainingEnrollment, type TrainingCertificate,
  type TrainingSB476Entry, type TrainingCategory,
  type CertificationRequirement,
} from '../data/demoData';

type Tab = 'catalog' | 'learning' | 'certifications' | 'requirements' | 'overview' | 'sb476' | 'admin' | 'pricing';

const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: 'catalog', label: 'Course Catalog', icon: BookOpen },
  { id: 'learning', label: 'My Learning', icon: GraduationCap },
  { id: 'certifications', label: 'Certifications', icon: Award },
  { id: 'requirements', label: 'Requirements', icon: Shield },
  { id: 'overview', label: 'Compliance Overview', icon: Target },
  { id: 'sb476', label: 'SB 476 Tracker', icon: Scale },
  { id: 'admin', label: 'Admin', icon: Settings2 },
  { id: 'pricing', label: 'Pricing', icon: CreditCard },
];

const CATEGORY_CONFIG: Record<TrainingCategory, { label: string; icon: typeof Shield; color: string; bg: string }> = {
  food_safety_handler: { label: 'Food Safety – Handler', icon: Shield, color: '#15803d', bg: '#dcfce7' },
  food_safety_manager: { label: 'Food Safety – Manager', icon: BookOpenCheck, color: '#1e4d6b', bg: '#e0f2fe' },
  fire_safety: { label: 'Fire Safety', icon: Flame, color: '#dc2626', bg: '#fee2e2' },
  compliance_ops: { label: 'Compliance Ops', icon: Settings2, color: '#d4af37', bg: '#fef3c7' },
  custom: { label: 'Custom', icon: Brain, color: '#7c3aed', bg: '#ede9fe' },
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  not_started: { bg: '#f3f4f6', text: '#6b7280', label: 'Not Started' },
  in_progress: { bg: '#e0f2fe', text: '#0369a1', label: 'In Progress' },
  completed: { bg: '#dcfce7', text: '#15803d', label: 'Completed' },
  expired: { bg: '#fee2e2', text: '#dc2626', label: 'Expired' },
  failed: { bg: '#fef3c7', text: '#92400e', label: 'Failed' },
};

function cents(c: number) { return (c / 100).toFixed(2); }

// ── Course Catalog Tab ───────────────────────────────────────────────────────

function CourseCatalogTab() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [langFilter, setLangFilter] = useState<string>('all');

  const filtered = trainingCourses.filter(c => {
    if (catFilter !== 'all' && c.category !== catFilter) return false;
    if (langFilter !== 'all' && c.language !== langFilter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return c.isActive;
  });

  const categories = Object.entries(CATEGORY_CONFIG);

  return (
    <div>
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Active Courses', value: trainingCourses.filter(c => c.isActive).length, icon: BookOpen, color: '#1e4d6b' },
          { label: 'Total Enrolled', value: trainingEnrollments.length, icon: Users, color: '#15803d' },
          { label: 'Completed', value: trainingEnrollments.filter(e => e.status === 'completed').length, icon: CheckCircle2, color: '#d4af37' },
          { label: 'Certificates Issued', value: trainingCertificates.length, icon: Award, color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <s.icon size={18} color={s.color} />
              <span style={{ fontSize: 13, color: '#6b7280' }}>{s.label}</span>
            </div>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search courses..."
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} color="#6b7280" />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <option value="all">All Categories</option>
            {categories.map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Globe size={14} color="#6b7280" />
          <select value={langFilter} onChange={e => setLangFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <option value="all">All Languages</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>

      {/* Course Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: 16 }}>
        {filtered.map(course => {
          const cat = CATEGORY_CONFIG[course.category];
          const modules = trainingModules.filter(m => m.courseId === course.id);
          return (
            <div key={course.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', transition: 'box-shadow 0.15s', cursor: 'pointer' }}
              onClick={() => navigate(`/training/course/${course.id}`)}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
              {/* Color Banner */}
              <div style={{ height: 8, background: course.thumbnailColor }} />
              <div style={{ padding: 16 }}>
                {/* Category + Language */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: cat.bg, color: cat.color }}>
                    <cat.icon size={12} /> {cat.label}
                  </span>
                  {course.language !== 'en' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#f3f4f6', color: '#6b7280' }}>
                      <Globe size={12} /> {course.language.toUpperCase()}
                    </span>
                  )}
                  {course.isSystemCourse && (
                    <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#eef4f8', color: '#1e4d6b' }}>System</span>
                  )}
                </div>
                {/* Title + Description */}
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{course.title}</h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {course.description}
                </p>
                {/* Stats Row */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#6b7280' }}>
                    <BookOpen size={14} /> {course.moduleCount} modules
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#6b7280' }}>
                    <Clock size={14} /> ~{course.estimatedDurationMin} min
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#6b7280' }}>
                    <Users size={14} /> {course.enrolledCount}
                  </div>
                </div>
                {/* Modules Preview */}
                {modules.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    {modules.slice(0, 3).map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, color: '#374151' }}>
                        <ChevronRight size={12} color="#9ca3af" /> {m.title}
                      </div>
                    ))}
                    {modules.length > 3 && (
                      <div style={{ fontSize: 12, color: '#9ca3af', paddingLeft: 20, marginTop: 2 }}>+{modules.length - 3} more modules</div>
                    )}
                  </div>
                )}
                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>Pass: {course.passingScorePercent}%</span>
                  <button
                    onClick={e => { e.stopPropagation(); toast.success(`Enrolled in "${course.title}"`);; }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 44 }}>
                    <Play size={14} /> Enroll
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
          <BookOpen size={40} style={{ marginBottom: 8 }} />
          <p>No courses match your filters</p>
        </div>
      )}
    </div>
  );
}

// ── My Learning Tab ──────────────────────────────────────────────────────────

function MyLearningTab() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const active = trainingEnrollments.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (locationFilter !== 'all' && e.locationId !== locationFilter) return false;
    return true;
  });

  const inProgress = active.filter(e => e.status === 'in_progress');
  const notStarted = active.filter(e => e.status === 'not_started');
  const completed = active.filter(e => e.status === 'completed');
  const locations = [...new Set(trainingEnrollments.map(e => e.locationName))];

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
    return days;
  };

  return (
    <div>
      {/* Achievement Badges */}
      <AchievementBadges />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'In Progress', value: trainingEnrollments.filter(e => e.status === 'in_progress').length, color: '#0369a1', bg: '#e0f2fe' },
          { label: 'Not Started', value: trainingEnrollments.filter(e => e.status === 'not_started').length, color: '#92400e', bg: '#fef3c7' },
          { label: 'Completed', value: trainingEnrollments.filter(e => e.status === 'completed').length, color: '#15803d', bg: '#dcfce7' },
          { label: 'Overdue', value: trainingEnrollments.filter(e => (e.status === 'in_progress' || e.status === 'not_started') && e.expiresAt && new Date(e.expiresAt) < new Date()).length, color: '#dc2626', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{s.label}</span>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <option value="all">All Statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="not_started">Not Started</option>
          <option value="completed">Completed</option>
          <option value="expired">Expired</option>
        </select>
        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <option value="all">All Locations</option>
          {locations.map(l => <option key={l} value={trainingEnrollments.find(e => e.locationName === l)?.locationId}>{l}</option>)}
        </select>
      </div>

      {/* In Progress Section */}
      {inProgress.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Play size={16} color="#0369a1" /> In Progress ({inProgress.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {inProgress.map(e => {
              const days = getDaysRemaining(e.expiresAt);
              const isUrgent = days !== null && days <= 14;
              return (
                <div key={e.id} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb', cursor: 'pointer' }}
                  onClick={() => toast.info(`Resume "${e.courseTitle}" (demo)`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 4 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{e.employeeName}</div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{e.courseTitle}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isUrgent && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#dc2626' }}>
                          <AlertTriangle size={14} /> {days}d left
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{e.locationName}</span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 100, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${e.progressPercent}%`, height: '100%', background: isUrgent ? '#dc2626' : '#1e4d6b', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isUrgent ? '#dc2626' : '#1e4d6b', minWidth: 36 }}>{e.progressPercent}%</span>
                    <button onClick={ev => { ev.stopPropagation(); toast.info('Resume learning (demo)'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 44 }}>
                      <Play size={12} /> Resume
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Not Started Section */}
      {notStarted.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="#92400e" /> Not Started ({notStarted.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notStarted.map(e => {
              const days = getDaysRemaining(e.expiresAt);
              return (
                <div key={e.id} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{e.employeeName}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{e.courseTitle} &middot; {e.locationName}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                      Enrolled {new Date(e.enrolledAt).toLocaleDateString()} &middot; Reason: {e.enrollmentReason.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {days !== null && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: days <= 14 ? '#dc2626' : '#6b7280' }}>
                        Due in {days}d
                      </span>
                    )}
                    <button onClick={() => toast.info(`Start "${e.courseTitle}" (demo)`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: '1px solid #1e4d6b', background: '#fff', color: '#1e4d6b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 44 }}>
                      <Play size={12} /> Start
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Section */}
      {completed.length > 0 && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} color="#15803d" /> Completed ({completed.length})
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 600 }}>Employee</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 600 }}>Course</th>
                  <th className="hidden sm:table-cell" style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 600 }}>Location</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 600 }}>Score</th>
                  <th className="hidden sm:table-cell" style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 600 }}>Completed</th>
                </tr>
              </thead>
              <tbody>
                {completed.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>{e.employeeName}</td>
                    <td style={{ padding: '10px 12px', color: '#374151' }}>{e.courseTitle}</td>
                    <td className="hidden sm:table-cell" style={{ padding: '10px 12px', color: '#6b7280' }}>{e.locationName}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 600, color: (e.scorePercent || 0) >= 80 ? '#15803d' : '#92400e' }}>{e.scorePercent}%</span>
                    </td>
                    <td className="hidden sm:table-cell" style={{ padding: '10px 12px', color: '#6b7280' }}>{e.completedAt ? new Date(e.completedAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Certifications Tab ───────────────────────────────────────────────────────

// Map LMS employeeId → EmployeeCertDetail userId
const EMP_ID_MAP: Record<string, string> = {
  'emp-01': '2', 'emp-02': '9', 'emp-03': '6',
  'emp-04': '7', 'emp-05': '5', 'emp-06': '4',
  'emp-07': '8', 'emp-08': '8', 'emp-09': '5',
};

function CertificationsTab() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = trainingCertificates.filter(c => typeFilter === 'all' || c.certificateType === typeFilter);

  const getExpirationStatus = (expiresAt: string | null) => {
    if (!expiresAt) return { label: 'No Expiry', color: '#6b7280', bg: '#f3f4f6' };
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: 'Expired', color: '#dc2626', bg: '#fee2e2' };
    if (days <= 90) return { label: `${days}d left`, color: '#92400e', bg: '#fef3c7' };
    return { label: 'Valid', color: '#15803d', bg: '#dcfce7' };
  };

  // CFPM coverage summary
  const cfpmLocations = [
    { name: 'Downtown Kitchen', hasCFPM: true, count: 1, required: 1 },
    { name: 'Airport Terminal', hasCFPM: false, count: 0, required: 1 },
    { name: 'University Campus', hasCFPM: false, count: 0, required: 1 },
  ];

  return (
    <div>
      {/* CFPM Coverage Alert */}
      <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <AlertTriangle size={20} color="#92400e" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#92400e', fontSize: 14, marginBottom: 4 }}>CFPM Coverage Gap</div>
          <p style={{ margin: 0, fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>
            2 of 3 locations lack a Certified Food Protection Manager. California requires at least one CFPM per food establishment during operating hours.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            {cfpmLocations.map(loc => (
              <div key={loc.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                {loc.hasCFPM ? <CheckCircle2 size={14} color="#15803d" /> : <XCircle size={14} color="#dc2626" />}
                <span style={{ color: loc.hasCFPM ? '#15803d' : '#dc2626', fontWeight: 600 }}>{loc.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter + Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <option value="all">All Types</option>
          <option value="food_handler">Food Handler</option>
          <option value="food_manager_prep">Food Manager (CFPM)</option>
          <option value="fire_safety">Fire Safety</option>
          <option value="custom">Custom</option>
        </select>
        <span style={{ fontSize: 13, color: '#6b7280' }}>{filtered.length} certificate{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Certificates Table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Employee</th>
                <th className="hidden sm:table-cell" style={{ textAlign: 'left', padding: '10px 14px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Course</th>
                <th className="hidden md:table-cell" style={{ textAlign: 'left', padding: '10px 14px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Certificate #</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Score</th>
                <th className="hidden sm:table-cell" style={{ textAlign: 'left', padding: '10px 14px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Issued</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(cert => {
                const status = getExpirationStatus(cert.expiresAt);
                return (
                  <tr key={cert.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#1e4d6b', cursor: 'pointer', textDecoration: 'none' }}
                        onClick={() => { const uid = EMP_ID_MAP[cert.employeeId]; if (uid) navigate(`/training/employee/${uid}`); }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                        {cert.employeeName}
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{cert.locationName}</div>
                    </td>
                    <td className="hidden sm:table-cell" style={{ padding: '12px 14px', color: '#374151' }}>{cert.courseTitle}</td>
                    <td className="hidden md:table-cell" style={{ padding: '12px 14px' }}>
                      <code style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{cert.certificateNumber}</code>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: cert.scorePercent >= 80 ? '#15803d' : '#92400e' }}>{cert.scorePercent}%</td>
                    <td className="hidden sm:table-cell" style={{ padding: '12px 14px', color: '#6b7280' }}>{new Date(cert.issuedAt).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: status.bg, color: status.color }}>{status.label}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => toast.info(`View certificate ${cert.certificateNumber} (demo)`)}
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Eye size={14} color="#6b7280" />
                        </button>
                        <button onClick={() => toast.info(`Download certificate ${cert.certificateNumber} (demo)`)}
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Download size={14} color="#6b7280" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── SB 476 Tracker Tab ───────────────────────────────────────────────────────

function SB476TrackerTab() {
  const totalCost = trainingSB476Log.reduce((s, e) => s + e.trainingCostCents, 0);
  const totalCompensation = trainingSB476Log.reduce((s, e) => s + e.totalCompensationCents, 0);
  const totalHours = trainingSB476Log.reduce((s, e) => s + e.compensableHours, 0);
  const compliant = trainingSB476Log.filter(e => e.completedWithin30Days).length;
  const nonCompliant = trainingSB476Log.filter(e => !e.completedWithin30Days).length;
  const duringWorkHours = trainingSB476Log.filter(e => e.trainingDuringWorkHours).length;

  return (
    <div>
      {/* Info Banner */}
      <div style={{ background: '#eef4f8', border: '1px solid #b8d4e8', borderRadius: 10, padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Scale size={18} color="#1e4d6b" />
          <span style={{ fontWeight: 700, color: '#1e4d6b', fontSize: 14 }}>California SB 476 — Food Handler Training Requirements</span>
        </div>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
          Employers must: <strong>(1)</strong> Pay all training costs, <strong>(2)</strong> Compensate employees for training time at their regular rate,
          <strong> (3)</strong> Complete food handler training within 30 days of hire date, <strong>(4)</strong> Ensure training occurs during scheduled work hours when possible.
        </div>
      </div>

      {/* Compliance Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Training Costs', value: `$${cents(totalCost)}`, icon: DollarSign, color: '#1e4d6b' },
          { label: 'Total Compensation', value: `$${cents(totalCompensation)}`, icon: DollarSign, color: '#15803d' },
          { label: 'Compensable Hours', value: totalHours.toFixed(1) + 'h', icon: Clock, color: '#0369a1' },
          { label: 'Within 30 Days', value: `${compliant}/${trainingSB476Log.length}`, icon: CheckCircle2, color: '#15803d' },
          { label: 'Non-Compliant', value: String(nonCompliant), icon: AlertTriangle, color: nonCompliant > 0 ? '#dc2626' : '#15803d' },
          { label: 'During Work Hours', value: `${duringWorkHours}/${trainingSB476Log.length}`, icon: CalendarClock, color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <s.icon size={16} color={s.color} />
              <span style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</span>
            </div>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Non-Compliant Alert */}
      {nonCompliant > 0 && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertCircle size={18} color="#dc2626" />
            <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>Action Required — Non-Compliant Entries</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>
            {nonCompliant} employee{nonCompliant > 1 ? 's have' : ' has'} not completed food handler training within 30 days of hire.
            Employers may face penalties for non-compliance with SB 476.
          </p>
        </div>
      )}

      {/* SB 476 Log Table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Employee</th>
                <th className="hidden sm:table-cell" style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Location</th>
                <th className="hidden md:table-cell" style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Hire Date</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Training Cost</th>
                <th className="hidden md:table-cell" style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Comp. Hours</th>
                <th className="hidden md:table-cell" style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Total Comp.</th>
                <th className="hidden sm:table-cell" style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>During Work</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>30-Day</th>
                <th className="hidden sm:table-cell" style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Completed</th>
              </tr>
            </thead>
            <tbody>
              {trainingSB476Log.map(entry => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>{entry.employeeName}</td>
                  <td className="hidden sm:table-cell" style={{ padding: '10px 12px', color: '#6b7280' }}>{entry.locationName}</td>
                  <td className="hidden md:table-cell" style={{ padding: '10px 12px', color: '#6b7280' }}>{new Date(entry.hireDate).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>${cents(entry.trainingCostCents)}</td>
                  <td className="hidden md:table-cell" style={{ padding: '10px 12px', color: '#374151' }}>{entry.compensableHours > 0 ? entry.compensableHours + 'h' : '—'}</td>
                  <td className="hidden md:table-cell" style={{ padding: '10px 12px', color: '#374151' }}>{entry.totalCompensationCents > 0 ? `$${cents(entry.totalCompensationCents)}` : '—'}</td>
                  <td className="hidden sm:table-cell" style={{ padding: '10px 12px' }}>
                    {entry.trainingDuringWorkHours
                      ? <CheckCircle2 size={16} color="#15803d" />
                      : <XCircle size={16} color="#dc2626" />}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: entry.completedWithin30Days ? '#dcfce7' : '#fee2e2',
                      color: entry.completedWithin30Days ? '#15803d' : '#dc2626',
                    }}>
                      {entry.completedWithin30Days ? 'Compliant' : 'Overdue'}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell" style={{ padding: '10px 12px', color: '#6b7280' }}>
                    {entry.trainingCompletedDate ? new Date(entry.trainingCompletedDate).toLocaleDateString() : <span style={{ color: '#dc2626', fontWeight: 600 }}>Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Button */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => toast.info('Export SB 476 report as CSV (demo)')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 44 }}>
          <Download size={14} /> Export Report
        </button>
      </div>
    </div>
  );
}

// ── Admin Tab ────────────────────────────────────────────────────────────────

function AdminTab() {
  const navigate = useNavigate();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const enrollmentsByLocation = useMemo(() => {
    const map: Record<string, { name: string; total: number; inProgress: number; completed: number; notStarted: number }> = {};
    trainingEnrollments.forEach(e => {
      if (!map[e.locationId]) map[e.locationId] = { name: e.locationName, total: 0, inProgress: 0, completed: 0, notStarted: 0 };
      map[e.locationId].total++;
      if (e.status === 'in_progress') map[e.locationId].inProgress++;
      if (e.status === 'completed') map[e.locationId].completed++;
      if (e.status === 'not_started') map[e.locationId].notStarted++;
    });
    return Object.values(map);
  }, []);

  const recentQuizzes = [...trainingQuizAttempts].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).slice(0, 5);

  // Completion rate by course
  const courseStats = trainingCourses.map(c => ({
    ...c,
    rate: c.enrolledCount > 0 ? Math.round((c.completedCount / c.enrolledCount) * 100) : 0,
  }));

  return (
    <div>
      {/* Admin Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setShowAssignModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 44 }}>
          <Send size={16} /> Assign Training
        </button>
        <button onClick={() => toast.info('Bulk enroll employees (demo)')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: '1px solid #1e4d6b', background: '#fff', color: '#1e4d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 44 }}>
          <Plus size={16} /> Bulk Enroll
        </button>
        <button onClick={() => navigate('/training/courses/builder')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: '1px solid #1e4d6b', background: '#fff', color: '#1e4d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 44 }}>
          <BookOpen size={16} /> Create Course
        </button>
        <button onClick={() => toast.info('Download all training records (demo)')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 44 }}>
          <Download size={16} /> Export Records
        </button>
      </div>
      {showAssignModal && <AssignTrainingModal onClose={() => setShowAssignModal(false)} />}

      {/* Location Breakdown */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={16} color="#1e4d6b" /> Enrollment by Location
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 12 }}>
          {enrollmentsByLocation.map(loc => (
            <div key={loc.name} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 12 }}>{loc.name}</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{loc.total}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Total</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#15803d' }}>{loc.completed}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Done</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#0369a1' }}>{loc.inProgress}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Active</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#92400e' }}>{loc.notStarted}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Pending</div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginTop: 12 }}>
                <div style={{ width: `${loc.total > 0 ? (loc.completed / loc.total) * 100 : 0}%`, height: '100%', background: '#15803d', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Completion Rates */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={16} color="#1e4d6b" /> Course Completion Rates
        </h3>
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 12 }}>
          {courseStats.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: c.thumbnailColor, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
              </div>
              <div style={{ width: 100, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ width: `${c.rate}%`, height: '100%', background: c.rate >= 75 ? '#15803d' : c.rate >= 50 ? '#d4af37' : '#dc2626', borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', minWidth: 70, textAlign: 'right' }}>{c.completedCount}/{c.enrolledCount} ({c.rate}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Quiz Activity */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} color="#1e4d6b" /> Recent Quiz Activity
        </h3>
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Employee</th>
                <th className="hidden sm:table-cell" style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Module / Final</th>
                <th className="hidden sm:table-cell" style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Attempt</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Score</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Result</th>
                <th className="hidden sm:table-cell" style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentQuizzes.map(q => (
                <tr key={q.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>{q.employeeName}</td>
                  <td className="hidden sm:table-cell" style={{ padding: '10px 12px', color: '#374151' }}>{q.moduleTitle || 'Final Assessment'}</td>
                  <td className="hidden sm:table-cell" style={{ padding: '10px 12px', color: '#6b7280' }}>#{q.attemptNumber}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: q.scorePercent >= 70 ? '#15803d' : '#dc2626' }}>
                    {q.scorePercent}% ({q.questionsCorrect}/{q.questionsTotal})
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: q.passed ? '#dcfce7' : '#fee2e2',
                      color: q.passed ? '#15803d' : '#dc2626',
                    }}>
                      {q.passed ? 'Pass' : 'Fail'}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell" style={{ padding: '10px 12px', color: '#6b7280' }}>{new Date(q.completedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pricing Tab ──────────────────────────────────────────────────────────────

const PRICING_TIERS = [
  {
    name: 'Standard',
    price: '$99',
    period: '/mo per location',
    color: '#6b7280',
    features: [
      { name: 'System courses (food handler, fire safety, compliance ops)', included: true, note: 'Up to 10 employees' },
      { name: 'CFPM prep modules', included: false },
      { name: 'Custom course builder', included: false },
      { name: 'AI study companion', included: false },
      { name: 'AI quiz generator', included: false },
      { name: 'Auto-translate custom content', included: false },
      { name: 'SB 476 compliance reporting', included: true },
      { name: 'Training analytics', included: true, note: 'Basic' },
      { name: 'Certificate generation', included: true },
      { name: 'API access to training data', included: false },
    ],
  },
  {
    name: 'Professional',
    price: '$249',
    period: '/mo per location',
    color: '#1e4d6b',
    popular: true,
    features: [
      { name: 'System courses (food handler, fire safety, compliance ops)', included: true, note: 'Up to 50 employees' },
      { name: 'CFPM prep modules', included: true },
      { name: 'Custom course builder', included: true, note: 'Up to 5 courses' },
      { name: 'AI study companion', included: true, note: '50 questions/mo' },
      { name: 'AI quiz generator', included: true },
      { name: 'Auto-translate custom content', included: false },
      { name: 'SB 476 compliance reporting', included: true },
      { name: 'Training analytics', included: true, note: 'Full' },
      { name: 'Certificate generation', included: true },
      { name: 'API access to training data', included: true, note: 'Builder tier' },
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'per location',
    color: '#d4af37',
    features: [
      { name: 'System courses (food handler, fire safety, compliance ops)', included: true, note: 'Unlimited' },
      { name: 'CFPM prep modules', included: true },
      { name: 'Custom course builder', included: true, note: 'Unlimited' },
      { name: 'AI study companion', included: true, note: 'Unlimited' },
      { name: 'AI quiz generator', included: true },
      { name: 'Auto-translate custom content', included: true },
      { name: 'SB 476 compliance reporting', included: true },
      { name: 'Training analytics', included: true, note: 'Full + cross-location' },
      { name: 'Certificate generation', included: true, note: 'Custom branded' },
      { name: 'API access to training data', included: true, note: 'Enterprise tier' },
    ],
  },
];

function PricingTab() {
  return (
    <div>
      {/* Value Prop */}
      <div style={{ background: '#eef4f8', border: '1px solid #b8d4e8', borderRadius: 12, padding: 16, marginBottom: 28, textAlign: 'center' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e4d6b', margin: '0 0 8px' }}>Training Bundled with Your EvidLY Subscription</h3>
        <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.6 }}>
          Operators currently pay $10–20 per employee for food handler certification at third-party providers.
          EvidLY bundles training into your subscription — saving $100–$200/year for a 10-person team while keeping everything in one platform.
        </p>
      </div>

      {/* Pricing Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16, marginBottom: 28 }}>
        {PRICING_TIERS.map(tier => (
          <div key={tier.name} style={{ background: '#fff', borderRadius: 12, border: tier.popular ? `2px solid ${tier.color}` : '1px solid #e5e7eb', overflow: 'hidden', position: 'relative' }}>
            {tier.popular && (
              <div style={{ background: tier.color, color: '#fff', textAlign: 'center', padding: '4px 0', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                MOST POPULAR
              </div>
            )}
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: tier.color, marginBottom: 4 }}>{tier.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: '#111827' }}>{tier.price}</span>
                <span style={{ fontSize: 14, color: '#6b7280' }}>{tier.period}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tier.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {f.included
                      ? <Check size={16} color="#15803d" style={{ flexShrink: 0, marginTop: 2 }} />
                      : <X size={16} color="#d1d5db" style={{ flexShrink: 0, marginTop: 2 }} />}
                    <div>
                      <span style={{ fontSize: 13, color: f.included ? '#374151' : '#9ca3af' }}>{f.name}</span>
                      {f.note && <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>({f.note})</span>}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => toast.info(`Contact sales for ${tier.name} plan`)}
                style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: tier.popular ? 'none' : `1px solid ${tier.color}`, background: tier.popular ? tier.color : '#fff', color: tier.popular ? '#fff' : tier.color, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 20, fontFamily: "'DM Sans', sans-serif" }}>
                {tier.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Impact */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} color="#15803d" /> Why Bundle Training?
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
          {[
            { icon: DollarSign, title: 'Cost Savings', desc: 'Eliminates $10–20/employee third-party cert fees. ServSafe Manager prep alone costs $150–250 per person.' },
            { icon: Target, title: 'Better Compliance', desc: 'Training completion auto-updates compliance scores. Staff who train in EvidLY use EvidLY daily.' },
            { icon: Shield, title: 'Legal Protection', desc: 'Documented training = legal defense. SB 476 compliance tracking is unique to California market.' },
            { icon: Zap, title: 'One Platform', desc: 'Enterprise clients (Pacific Coast Dining, Compass) eliminate one more vendor. Training + compliance + operations in one tool.' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 12 }}>
              <item.icon size={20} color="#1e4d6b" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Achievement Badges ───────────────────────────────────────────────────────

function AchievementBadges() {
  const badges = [
    { id: 'fast-learner', name: 'Fast Learner', desc: 'Completed under estimated time', icon: Zap, color: '#d4af37', bg: '#fffbeb', earned: true },
    { id: 'perfect-score', name: 'Perfect Score', desc: '100% on first attempt', icon: Star, color: '#7c3aed', bg: '#ede9fe', earned: false },
    { id: 'streak', name: '5-Lesson Streak', desc: 'Completed 5 lessons in a row', icon: Flame, color: '#dc2626', bg: '#fee2e2', earned: true },
    { id: 'team-player', name: 'Team Player', desc: 'All team members certified', icon: Users, color: '#15803d', bg: '#dcfce7', earned: false },
  ];
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Star size={16} color="#d4af37" /> Achievement Badges
      </h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {badges.map(b => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, background: b.earned ? b.bg : '#f9fafb', border: `1px solid ${b.earned ? b.color + '40' : '#e5e7eb'}`, opacity: b.earned ? 1 : 0.5 }}>
            <b.icon size={20} color={b.earned ? b.color : '#9ca3af'} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: b.earned ? b.color : '#9ca3af' }}>{b.name}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Assign Training Modal ────────────────────────────────────────────────────

function AssignTrainingModal({ onClose }: { onClose: () => void }) {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [dueDate, setDueDate] = useState('');

  const employees = [
    { id: 'emp-03', name: 'Sofia Reyes', location: 'Downtown Kitchen', checked: false },
    { id: 'emp-04', name: 'Tyler Brooks', location: 'Downtown Kitchen', checked: false },
    { id: 'emp-09', name: 'Carlos Mendoza', location: 'Airport Terminal', checked: false },
  ];
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '95vw', maxWidth: 520, maxHeight: '80vh', overflow: 'auto', padding: 16 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Assign Training</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#6b7280" />
          </button>
        </div>
        {/* Course Selection */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Course</label>
          <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
            <option value="">Select a course...</option>
            {trainingCourses.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        {/* Due Date */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }} />
        </div>
        {/* Employee Selection */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Employees ({selected.size} selected)</label>
          <div style={{ border: '1px solid #d1d5db', borderRadius: 8, maxHeight: 200, overflow: 'auto' }}>
            {employees.map(emp => (
              <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.has(emp.id)}
                  onChange={() => {
                    const next = new Set(selected);
                    next.has(emp.id) ? next.delete(emp.id) : next.add(emp.id);
                    setSelected(next);
                  }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{emp.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{emp.location}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Cancel
          </button>
          <button onClick={() => { toast.success(`Assigned training to ${selected.size} employees`); onClose(); }}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <Send size={14} style={{ marginRight: 6 }} /> Assign
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Training Dashboard Widget (for main dashboard) ───────────────────────────

export function TrainingDashboardWidget() {
  const navigate = useNavigate();
  const upToDate = trainingEnrollments.filter(e => e.status === 'completed').length;
  const inProgress = trainingEnrollments.filter(e => e.status === 'in_progress').length;
  const overdue = trainingEnrollments.filter(e => (e.status === 'in_progress' || e.status === 'not_started') && e.expiresAt && new Date(e.expiresAt) < new Date()).length;
  const total = trainingEnrollments.length;

  const statusColor = overdue > 0 ? '#dc2626' : inProgress > 0 ? '#d4af37' : '#15803d';

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, cursor: 'pointer' }}
      onClick={() => navigate('/training')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GraduationCap size={18} color="#1e4d6b" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Training Status</span>
        </div>
        {overdue > 0 && (
          <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626' }}>
            {overdue} overdue
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#15803d' }}>{upToDate}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Up to Date</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#d4af37' }}>{inProgress}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>In Progress</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>{overdue}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Overdue</div>
        </div>
      </div>
      {/* Mini progress bar */}
      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${(upToDate / total) * 100}%`, background: '#15803d' }} />
        <div style={{ width: `${(inProgress / total) * 100}%`, background: '#d4af37' }} />
        <div style={{ width: `${(overdue / total) * 100}%`, background: '#dc2626' }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#1e4d6b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
        View Training Hub <ChevronRight size={12} />
      </div>
    </div>
  );
}

// ── Requirements Tab ─────────────────────────────────────────────────────────

const ROLE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  kitchen: { bg: '#dcfce7', text: '#15803d' },
  kitchen_manager: { bg: '#e0f2fe', text: '#0369a1' },
  management: { bg: '#ede9fe', text: '#6d28d9' },
  facilities: { bg: '#fef3c7', text: '#92400e' },
  executive: { bg: '#f3f4f6', text: '#374151' },
};

function RequirementsTab() {
  const requiredCount = certificationRequirements.filter(r => r.required).length;
  const recommendedCount = certificationRequirements.filter(r => !r.required).length;

  // Cross-reference with existing certs to compute compliance per requirement
  const getComplianceForReq = (req: CertificationRequirement) => {
    // Map cert types to trainingCertificates certificateType
    const certTypeMap: Record<string, string> = {
      food_handler: 'food_handler',
      cfpm: 'food_manager_prep',
      fire_extinguisher_training: 'fire_safety',
      hood_safety: 'fire_safety',
    };
    const matchType = certTypeMap[req.certType];
    if (!matchType) return { met: 0, total: req.requiredForRoles.length * 3 }; // estimate per location
    const certs = trainingCertificates.filter(c => c.certificateType === matchType);
    const records = trainingRecords.filter(r => r.trainingType === req.certType);
    const total = Math.max(6, certs.length + records.length); // rough total needed
    return { met: certs.length + records.length, total };
  };

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Required Certifications</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1e4d6b' }}>{requiredCount}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>mandated by law</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Recommended</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#d4af37' }}>{recommendedCount}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>best practice</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Jurisdiction</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>CA</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>California</div>
        </div>
      </div>

      {/* Requirements Table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Certification Requirements</div>
          <button onClick={() => toast.info('Custom requirements available in full version')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: "'DM Sans', sans-serif" }}>
            <Plus size={14} /> Add Requirement
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Certification</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Authority</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Required For</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Renewal</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Deadline</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {certificationRequirements.map(req => {
                const comp = getComplianceForReq(req);
                const pct = comp.total > 0 ? Math.round((comp.met / comp.total) * 100) : 0;
                return (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{req.certName}</div>
                      {req.notes && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, maxWidth: 300 }}>{req.notes}</div>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{req.authority}</div>
                      {req.authoritySection && <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{req.authoritySection}</div>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {req.requiredForRoles.map(role => {
                          const c = ROLE_BADGE_COLORS[role] || { bg: '#f3f4f6', text: '#374151' };
                          return <span key={role} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text }}>{role.replace('_', ' ')}</span>;
                        })}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, color: '#374151' }}>
                      {req.renewalPeriodMonths ? `${req.renewalPeriodMonths} mo` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, color: '#374151' }}>
                      {req.deadlineDays ? `${req.deadlineDays} days from hire` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: req.required ? (pct >= 80 ? '#dcfce7' : pct >= 50 ? '#fef3c7' : '#fee2e2') : '#f3f4f6',
                        color: req.required ? (pct >= 80 ? '#15803d' : pct >= 50 ? '#92400e' : '#dc2626') : '#6b7280',
                      }}>
                        {req.required ? `${pct}%` : 'Recommended'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Compliance Overview Tab ──────────────────────────────────────────────────

function ComplianceOverviewTab() {
  // Compute compliance metrics from demo data
  const DEMO_EMPLOYEES = [
    { id: '1', name: 'Marcus Johnson', role: 'owner_operator', locationId: '1', locationName: 'Downtown Kitchen', certs: ['food_handler', 'cfpm', 'fire_extinguisher_training', 'haccp_training'] },
    { id: '2', name: 'Sarah Chen', role: 'kitchen_manager', locationId: '1', locationName: 'Downtown Kitchen', certs: ['food_handler', 'cfpm'] },
    { id: '3', name: 'Maria Garcia', role: 'kitchen_manager', locationId: '2', locationName: 'Airport Cafe', certs: ['food_handler', 'cfpm'] },
    { id: '4', name: 'David Park', role: 'kitchen_staff', locationId: '2', locationName: 'Airport Cafe', certs: ['food_handler'] },
    { id: '5', name: 'Michael Torres', role: 'kitchen_staff', locationId: '2', locationName: 'Airport Cafe', certs: ['food_handler'] },
    { id: '6', name: 'Emma Rodriguez', role: 'kitchen_staff', locationId: '1', locationName: 'Downtown Kitchen', certs: ['food_handler', 'allergen_awareness'] },
    { id: '7', name: 'Alex Thompson', role: 'kitchen_staff', locationId: '3', locationName: 'University Dining', certs: ['food_handler'] },
    { id: '8', name: 'Lisa Wang', role: 'kitchen_staff', locationId: '3', locationName: 'University Dining', certs: ['food_handler'] },
    { id: '9', name: 'James Wilson', role: 'kitchen_staff', locationId: '3', locationName: 'University Dining', certs: ['food_handler'] },
  ];

  const requiredReqs = certificationRequirements.filter(r => r.required);

  const getRequiredForEmployee = (emp: typeof DEMO_EMPLOYEES[0]) => {
    return requiredReqs.filter(r => r.requiredForRoles.includes(emp.role));
  };

  const employeeCompliance = DEMO_EMPLOYEES.map(emp => {
    const required = getRequiredForEmployee(emp);
    const met = required.filter(r => emp.certs.includes(r.certType));
    return { ...emp, required: required.length, met: met.length, fullyCompliant: met.length === required.length, missing: required.filter(r => !emp.certs.includes(r.certType)) };
  });

  const totalCompliant = employeeCompliance.filter(e => e.fullyCompliant).length;
  const totalEmployees = employeeCompliance.length;
  const compliancePct = Math.round((totalCompliant / totalEmployees) * 100);

  // Per-location breakdown
  const locations = [
    { id: '1', name: 'Downtown Kitchen' },
    { id: '2', name: 'Airport Cafe' },
    { id: '3', name: 'University Dining' },
  ];

  const locationStats = locations.map(loc => {
    const emps = employeeCompliance.filter(e => e.locationId === loc.id);
    const compliant = emps.filter(e => e.fullyCompliant).length;
    const hasCFPM = emps.some(e => e.certs.includes('cfpm'));
    const gaps = emps.reduce((acc, e) => acc + e.missing.length, 0);
    return { ...loc, total: emps.length, compliant, pct: emps.length > 0 ? Math.round((compliant / emps.length) * 100) : 0, hasCFPM, gaps };
  });

  // Upcoming expirations from trainingCertificates
  const expirations = trainingCertificates
    .filter(c => c.expiresAt)
    .map(c => ({ ...c, daysLeft: Math.ceil((new Date(c.expiresAt!).getTime() - Date.now()) / 86400000) }))
    .filter(c => c.daysLeft > 0 && c.daysLeft <= 90)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // All gaps
  const allGaps = employeeCompliance.flatMap(emp =>
    emp.missing.map(req => ({ employeeName: emp.name, locationName: emp.locationId === '1' ? 'Downtown Kitchen' : emp.locationId === '2' ? 'Airport Cafe' : 'University Dining', certName: req.certName, authority: req.authority, certType: req.certType }))
  );

  // In-progress enrollments filling gaps
  const pipelineCount = trainingEnrollments.filter(e => e.status === 'in_progress').length;

  return (
    <div>
      {/* Headline Metric */}
      <div style={{ background: `linear-gradient(135deg, #1e4d6b, #2c5f7f)`, borderRadius: 12, padding: '24px 28px', color: '#fff', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.8, marginBottom: 4 }}>Workforce Certification Compliance</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 48, fontWeight: 700 }}>{compliancePct}%</span>
          <span style={{ fontSize: 14, opacity: 0.8 }}>of employees fully certified</span>
        </div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{totalCompliant} of {totalEmployees} employees meet all required certifications</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Training Pipeline</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{pipelineCount} in progress</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Expiring (90 days)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fef3c7' }}>{expirations.length}</div>
          </div>
        </div>
      </div>

      {/* Per-Location Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
        {locationStats.map(loc => (
          <div key={loc.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{loc.name}</div>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: loc.pct >= 80 ? '#dcfce7' : loc.pct >= 50 ? '#fef3c7' : '#fee2e2', color: loc.pct >= 80 ? '#15803d' : loc.pct >= 50 ? '#92400e' : '#dc2626' }}>
                {loc.pct}%
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{loc.compliant} of {loc.total} staff compliant</div>
            {/* CFPM badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              {loc.hasCFPM ? <CheckCircle2 size={14} color="#15803d" /> : <XCircle size={14} color="#dc2626" />}
              <span style={{ fontSize: 12, fontWeight: 600, color: loc.hasCFPM ? '#15803d' : '#dc2626' }}>
                {loc.hasCFPM ? 'CFPM on staff' : 'No CFPM — CalCode violation'}
              </span>
            </div>
            {loc.gaps > 0 && (
              <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>{loc.gaps} certification gap{loc.gaps !== 1 ? 's' : ''}</div>
            )}
            {/* Mini progress bar */}
            <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
              <div style={{ width: `${loc.pct}%`, height: '100%', background: loc.pct >= 80 ? '#15803d' : loc.pct >= 50 ? '#d4af37' : '#dc2626', borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Expirations */}
      {expirations.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Upcoming Expirations (next 90 days)</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Employee</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Certificate</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Location</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Days Left</th>
                </tr>
              </thead>
              <tbody>
                {expirations.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{c.employeeName}</td>
                    <td style={{ padding: '10px 14px' }}>{c.courseTitle}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>{c.locationName}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: c.daysLeft <= 30 ? '#fee2e2' : '#fef3c7',
                        color: c.daysLeft <= 30 ? '#dc2626' : '#92400e',
                      }}>{c.daysLeft}d</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gap Analysis */}
      {allGaps.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Certification Gaps</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{allGaps.length} missing certification{allGaps.length !== 1 ? 's' : ''} across all locations</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Employee</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Missing Certification</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Location</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Authority</th>
                </tr>
              </thead>
              <tbody>
                {allGaps.map((gap, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{gap.employeeName}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#fee2e2', color: '#dc2626' }}>
                        {gap.certName}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>{gap.locationName}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280' }}>{gap.authority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main TrainingHub Component ───────────────────────────────────────────────

export function TrainingHub() {
  const [activeTab, setActiveTab] = useState<Tab>('catalog');

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Training & Certification</h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Compliance-focused LMS — micro-learning modules, assessments, and certification tracking</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => toast.info('AI Study Companion coming soon')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #d4af37', background: '#fffbeb', color: '#92400e', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              <Brain size={14} /> AI Study Companion
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', marginBottom: 24, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
                background: 'none', border: 'none', borderBottom: isActive ? '2px solid #1e4d6b' : '2px solid transparent',
                marginBottom: -2, color: isActive ? '#1e4d6b' : '#6b7280',
                fontWeight: isActive ? 700 : 500, fontSize: 14, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                whiteSpace: 'nowrap', minHeight: 44,
              }}>
              <tab.icon size={16} /> {tab.label}
              {tab.id === 'learning' && (
                <span style={{ padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#e0f2fe', color: '#0369a1' }}>
                  {trainingEnrollments.filter(e => e.status === 'in_progress').length}
                </span>
              )}
              {tab.id === 'sb476' && trainingSB476Log.some(e => !e.completedWithin30Days) && (
                <span style={{ width: 8, height: 8, borderRadius: 4, background: '#dc2626' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'catalog' && <CourseCatalogTab />}
      {activeTab === 'learning' && <MyLearningTab />}
      {activeTab === 'certifications' && <CertificationsTab />}
      {activeTab === 'requirements' && <RequirementsTab />}
      {activeTab === 'overview' && <ComplianceOverviewTab />}
      {activeTab === 'sb476' && <SB476TrackerTab />}
      {activeTab === 'admin' && <AdminTab />}
      {activeTab === 'pricing' && <PricingTab />}
    </div>
  );
}
