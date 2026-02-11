import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, GraduationCap, Award, Scale, Settings2,
  Search, Filter, Clock, Users, Play, ChevronRight,
  CheckCircle2, AlertTriangle, XCircle, BarChart3,
  Download, Eye, Plus, RefreshCw, TrendingUp,
  BookOpenCheck, Brain, Globe, Flame, Shield,
  FileText, DollarSign, CalendarClock, ArrowRight,
  Building2, UserCheck, AlertCircle,
} from 'lucide-react';
import {
  trainingCourses, trainingModules, trainingEnrollments, trainingCertificates,
  trainingSB476Log, trainingQuizAttempts,
  type TrainingCourse, type TrainingEnrollment, type TrainingCertificate,
  type TrainingSB476Entry, type TrainingCategory,
} from '../data/demoData';

type Tab = 'catalog' | 'learning' | 'certifications' | 'sb476' | 'admin';

const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: 'catalog', label: 'Course Catalog', icon: BookOpen },
  { id: 'learning', label: 'My Learning', icon: GraduationCap },
  { id: 'certifications', label: 'Certifications', icon: Award },
  { id: 'sb476', label: 'SB 476 Tracker', icon: Scale },
  { id: 'admin', label: 'Admin', icon: Settings2 },
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
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
              <div style={{ padding: 20 }}>
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
                    onClick={e => { e.stopPropagation(); alert(`Enrolled in "${course.title}" (demo)`); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
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
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
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
                  onClick={() => alert(`Resume "${e.courseTitle}" for ${e.employeeName} (demo)`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${e.progressPercent}%`, height: '100%', background: isUrgent ? '#dc2626' : '#1e4d6b', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isUrgent ? '#dc2626' : '#1e4d6b', minWidth: 36 }}>{e.progressPercent}%</span>
                    <button onClick={ev => { ev.stopPropagation(); alert(`Resume learning (demo)`); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
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
                <div key={e.id} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
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
                    <button onClick={() => alert(`Start "${e.courseTitle}" for ${e.employeeName} (demo)`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: '1px solid #1e4d6b', background: '#fff', color: '#1e4d6b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
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
                  {['Employee', 'Course', 'Location', 'Score', 'Completed'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {completed.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>{e.employeeName}</td>
                    <td style={{ padding: '10px 12px', color: '#374151' }}>{e.courseTitle}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{e.locationName}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 600, color: (e.scorePercent || 0) >= 80 ? '#15803d' : '#92400e' }}>{e.scorePercent}%</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{e.completedAt ? new Date(e.completedAt).toLocaleDateString() : '—'}</td>
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

function CertificationsTab() {
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
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
                {['Employee', 'Course', 'Certificate #', 'Score', 'Issued', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(cert => {
                const status = getExpirationStatus(cert.expiresAt);
                return (
                  <tr key={cert.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{cert.employeeName}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{cert.locationName}</div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151' }}>{cert.courseTitle}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <code style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{cert.certificateNumber}</code>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: cert.scorePercent >= 80 ? '#15803d' : '#92400e' }}>{cert.scorePercent}%</td>
                    <td style={{ padding: '12px 14px', color: '#6b7280' }}>{new Date(cert.issuedAt).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: status.bg, color: status.color }}>{status.label}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => alert(`View certificate ${cert.certificateNumber} (demo)`)}
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Eye size={14} color="#6b7280" />
                        </button>
                        <button onClick={() => alert(`Download certificate ${cert.certificateNumber} (demo)`)}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
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
                {['Employee', 'Location', 'Hire Date', 'Training Cost', 'Comp. Hours', 'Total Comp.', 'During Work', '30-Day', 'Completed'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trainingSB476Log.map(entry => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>{entry.employeeName}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{entry.locationName}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{new Date(entry.hireDate).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>${cents(entry.trainingCostCents)}</td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{entry.compensableHours > 0 ? entry.compensableHours + 'h' : '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{entry.totalCompensationCents > 0 ? `$${cents(entry.totalCompensationCents)}` : '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
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
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>
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
        <button onClick={() => alert('Export SB 476 report as CSV (demo)')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          <Download size={14} /> Export Report
        </button>
      </div>
    </div>
  );
}

// ── Admin Tab ────────────────────────────────────────────────────────────────

function AdminTab() {
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
        <button onClick={() => alert('Bulk enroll employees (demo)')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          <Plus size={16} /> Bulk Enroll
        </button>
        <button onClick={() => alert('Create custom course (demo)')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: '1px solid #1e4d6b', background: '#fff', color: '#1e4d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          <BookOpen size={16} /> Create Course
        </button>
        <button onClick={() => alert('Download all training records (demo)')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          <Download size={16} /> Export Records
        </button>
      </div>

      {/* Location Breakdown */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={16} color="#1e4d6b" /> Enrollment by Location
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
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
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 16 }}>
          {courseStats.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: c.thumbnailColor, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
              </div>
              <div style={{ width: 160, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ width: `${c.rate}%`, height: '100%', background: c.rate >= 75 ? '#15803d' : c.rate >= 50 ? '#d4af37' : '#dc2626', borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', width: 80, textAlign: 'right' }}>{c.completedCount}/{c.enrolledCount} ({c.rate}%)</span>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Employee', 'Module / Final', 'Attempt', 'Score', 'Result', 'Date'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentQuizzes.map(q => (
                <tr key={q.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>{q.employeeName}</td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{q.moduleTitle || 'Final Assessment'}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>#{q.attemptNumber}</td>
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
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{new Date(q.completedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Training & Certification</h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Compliance-focused LMS — micro-learning modules, assessments, and certification tracking</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => alert('AI Study Companion — ask questions about any training topic (demo)')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #d4af37', background: '#fffbeb', color: '#92400e', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              <Brain size={14} /> AI Study Companion
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', marginBottom: 24 }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                background: 'none', border: 'none', borderBottom: isActive ? '2px solid #1e4d6b' : '2px solid transparent',
                marginBottom: -2, color: isActive ? '#1e4d6b' : '#6b7280',
                fontWeight: isActive ? 700 : 500, fontSize: 14, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
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
      {activeTab === 'sb476' && <SB476TrackerTab />}
      {activeTab === 'admin' && <AdminTab />}
    </div>
  );
}
