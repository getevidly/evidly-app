-- ============================================================
-- Training & Certification LMS — Database Tables
-- Adds: courses, modules, lessons, questions, enrollments,
--        progress, quiz attempts, certificates, SB 476 log,
--        AI interactions
-- ============================================================

-- ── Training Courses ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_courses (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title                 text NOT NULL,
  description           text,
  category              text NOT NULL CHECK (category IN ('food_safety_handler','food_safety_manager','fire_safety','compliance_ops','custom')),
  language              text NOT NULL DEFAULT 'en',
  estimated_duration_min integer NOT NULL DEFAULT 60,
  passing_score_percent integer NOT NULL DEFAULT 70,
  max_attempts          integer NOT NULL DEFAULT 0,
  cooldown_hours        integer NOT NULL DEFAULT 24,
  is_system_course      boolean NOT NULL DEFAULT false,
  is_active             boolean NOT NULL DEFAULT true,
  thumbnail_url         text,
  thumbnail_color       text DEFAULT '#1e4d6b',
  created_by            uuid REFERENCES user_profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_courses_org ON training_courses (organization_id, category);
CREATE INDEX idx_training_courses_active ON training_courses (is_active, category);

-- ── Training Modules ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_modules (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id             uuid NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  title                 text NOT NULL,
  description           text,
  sort_order            integer NOT NULL DEFAULT 0,
  estimated_duration_min integer NOT NULL DEFAULT 15,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_modules_course ON training_modules (course_id, sort_order);

-- ── Training Lessons ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_lessons (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id             uuid NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  title                 text NOT NULL,
  content_type          text NOT NULL CHECK (content_type IN ('text','video','interactive','infographic')),
  content_body          text,
  content_url           text,
  sort_order            integer NOT NULL DEFAULT 0,
  estimated_duration_min integer NOT NULL DEFAULT 3,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_lessons_module ON training_lessons (module_id, sort_order);

-- ── Training Questions (Question Bank) ───────────────────────

CREATE TABLE IF NOT EXISTS training_questions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id             uuid REFERENCES training_modules(id) ON DELETE CASCADE,
  course_id             uuid REFERENCES training_courses(id) ON DELETE CASCADE,
  question_type         text NOT NULL CHECK (question_type IN ('multiple_choice','true_false','multi_select','fill_blank')),
  question_text         text NOT NULL,
  options               jsonb NOT NULL DEFAULT '[]',
  correct_answer        jsonb NOT NULL,
  explanation           text,
  difficulty            text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  tags                  text[] DEFAULT '{}',
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_questions_module ON training_questions (module_id) WHERE is_active;
CREATE INDEX idx_training_questions_course ON training_questions (course_id) WHERE is_active;

-- ── Training Enrollments ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_enrollments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           uuid NOT NULL REFERENCES user_profiles(id),
  course_id             uuid NOT NULL REFERENCES training_courses(id),
  location_id           uuid REFERENCES locations(id),
  enrolled_by           uuid REFERENCES user_profiles(id),
  enrollment_reason     text NOT NULL CHECK (enrollment_reason IN ('new_hire','expiring_cert','failed_checklist','regulatory_change','manual','manager_assigned')),
  status                text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','expired','failed')),
  enrolled_at           timestamptz NOT NULL DEFAULT now(),
  started_at            timestamptz,
  completed_at          timestamptz,
  expires_at            timestamptz,
  progress_percent      integer NOT NULL DEFAULT 0,
  current_module_id     uuid REFERENCES training_modules(id),
  current_lesson_id     uuid REFERENCES training_lessons(id),
  score_percent         integer,
  attempt_count         integer NOT NULL DEFAULT 0,
  UNIQUE(employee_id, course_id, enrolled_at)
);

CREATE INDEX idx_training_enrollments_employee ON training_enrollments (employee_id, status);
CREATE INDEX idx_training_enrollments_course ON training_enrollments (course_id, status);
CREATE INDEX idx_training_enrollments_location ON training_enrollments (location_id, status);

-- ── Training Progress (per lesson) ──────────────────────────

CREATE TABLE IF NOT EXISTS training_progress (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id         uuid NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
  lesson_id             uuid NOT NULL REFERENCES training_lessons(id),
  status                text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  started_at            timestamptz,
  completed_at          timestamptz,
  time_spent_seconds    integer NOT NULL DEFAULT 0,
  UNIQUE(enrollment_id, lesson_id)
);

CREATE INDEX idx_training_progress_enrollment ON training_progress (enrollment_id);

-- ── Training Quiz Attempts ───────────────────────────────────

CREATE TABLE IF NOT EXISTS training_quiz_attempts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id         uuid NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
  module_id             uuid REFERENCES training_modules(id),
  course_id             uuid REFERENCES training_courses(id),
  attempt_number        integer NOT NULL DEFAULT 1,
  score_percent         integer NOT NULL,
  passed                boolean NOT NULL,
  questions_total       integer NOT NULL,
  questions_correct     integer NOT NULL,
  answers               jsonb NOT NULL DEFAULT '[]',
  time_spent_seconds    integer NOT NULL DEFAULT 0,
  started_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_attempts_enrollment ON training_quiz_attempts (enrollment_id, completed_at DESC);
CREATE INDEX idx_quiz_attempts_module ON training_quiz_attempts (module_id, completed_at DESC);

-- ── Training Certificates ────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_certificates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           uuid NOT NULL REFERENCES user_profiles(id),
  enrollment_id         uuid NOT NULL REFERENCES training_enrollments(id),
  course_id             uuid NOT NULL REFERENCES training_courses(id),
  location_id           uuid REFERENCES locations(id),
  certificate_type      text NOT NULL CHECK (certificate_type IN ('food_handler','food_manager_prep','fire_safety','custom')),
  certificate_number    text NOT NULL UNIQUE,
  issued_at             timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz,
  score_percent         integer NOT NULL,
  pdf_url               text,
  revoked_at            timestamptz,
  revoked_reason        text
);

CREATE INDEX idx_training_certs_employee ON training_certificates (employee_id, certificate_type);
CREATE INDEX idx_training_certs_number ON training_certificates (certificate_number);
CREATE INDEX idx_training_certs_expiry ON training_certificates (expires_at) WHERE revoked_at IS NULL;

-- ── SB 476 Compliance Log ────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_sb476_log (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id               uuid NOT NULL REFERENCES user_profiles(id),
  enrollment_id             uuid NOT NULL REFERENCES training_enrollments(id),
  location_id               uuid REFERENCES locations(id),
  training_cost_cents       integer NOT NULL DEFAULT 0,
  compensable_hours         numeric(5,2) NOT NULL DEFAULT 0,
  hourly_rate_cents         integer NOT NULL DEFAULT 0,
  total_compensation_cents  integer NOT NULL DEFAULT 0,
  training_during_work_hours boolean NOT NULL DEFAULT true,
  employee_relieved_of_duties boolean NOT NULL DEFAULT true,
  completed_within_30_days  boolean NOT NULL DEFAULT false,
  hire_date                 date NOT NULL,
  training_completed_date   date,
  created_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id)
);

CREATE INDEX idx_sb476_location ON training_sb476_log (location_id, completed_within_30_days);

-- ── AI Study Interactions ────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_ai_interactions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id         uuid NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
  interaction_type      text NOT NULL CHECK (interaction_type IN ('question','quiz_gen','weak_area','translate','explain')),
  user_message          text NOT NULL,
  ai_response           text NOT NULL,
  context_module_id     uuid REFERENCES training_modules(id),
  model_used            text NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
  tokens_used           integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_interactions_enrollment ON training_ai_interactions (enrollment_id, created_at DESC);

-- ── Row-Level Security ───────────────────────────────────────

ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sb476_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_ai_interactions ENABLE ROW LEVEL SECURITY;

-- System courses are readable by all; custom courses scoped to org
CREATE POLICY "training_courses_read" ON training_courses FOR SELECT USING (
  is_system_course OR organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
);
CREATE POLICY "training_courses_write" ON training_courses FOR ALL USING (
  organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
);

-- Modules/lessons/questions inherit course access
CREATE POLICY "training_modules_read" ON training_modules FOR SELECT USING (
  course_id IN (SELECT id FROM training_courses WHERE is_system_course OR organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
);
CREATE POLICY "training_lessons_read" ON training_lessons FOR SELECT USING (
  module_id IN (SELECT id FROM training_modules WHERE course_id IN (SELECT id FROM training_courses WHERE is_system_course OR organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())))
);
CREATE POLICY "training_questions_read" ON training_questions FOR SELECT USING (
  module_id IN (SELECT id FROM training_modules WHERE course_id IN (SELECT id FROM training_courses WHERE is_system_course OR organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())))
  OR course_id IN (SELECT id FROM training_courses WHERE is_system_course OR organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
);

-- Enrollment-scoped tables: user sees their own or org-mates see all
CREATE POLICY "training_enrollments_org" ON training_enrollments FOR ALL USING (
  employee_id = auth.uid()
  OR location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
);
CREATE POLICY "training_progress_org" ON training_progress FOR ALL USING (
  enrollment_id IN (SELECT id FROM training_enrollments WHERE employee_id = auth.uid() OR location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())))
);
CREATE POLICY "training_quiz_org" ON training_quiz_attempts FOR ALL USING (
  enrollment_id IN (SELECT id FROM training_enrollments WHERE employee_id = auth.uid() OR location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())))
);
CREATE POLICY "training_certs_org" ON training_certificates FOR ALL USING (
  employee_id = auth.uid()
  OR location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
);
CREATE POLICY "training_sb476_org" ON training_sb476_log FOR ALL USING (
  location_id IN (SELECT id FROM locations WHERE organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
);
CREATE POLICY "training_ai_org" ON training_ai_interactions FOR ALL USING (
  enrollment_id IN (SELECT id FROM training_enrollments WHERE employee_id = auth.uid())
);
