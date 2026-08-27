drop table if exists public.curriculum_imports;
drop table if exists public.curriculum_template_lessons;
drop table if exists public.curriculum_templates;

create table if not exists public.curricula (
  id text primary key,
  name text not null unique,
  audience text not null default 'school',
  category text not null default '',
  description text not null default '',
  status text not null default 'active',
  created_by text not null references public.users(id),
  created_at text not null,
  updated_at text not null,
  constraint curricula_audience_check check (audience in ('school','professional','upskilling','global')),
  constraint curricula_status_check check (status in ('active','archived'))
);

create table if not exists public.curriculum_subjects (
  id text primary key,
  curriculum_id text not null references public.curricula(id) on delete cascade,
  name text not null,
  grades_json text not null default '[]',
  status text not null default 'active',
  created_at text not null,
  unique(curriculum_id,name),
  constraint curriculum_subjects_status_check check (status in ('active','archived'))
);

alter table public.courses
  add column if not exists curriculum_id text references public.curricula(id) on delete set null,
  add column if not exists grade_level text not null default '',
  add column if not exists creator_id text references public.users(id) on delete set null,
  add column if not exists creator_role text not null default 'tutor',
  add column if not exists source_course_id text references public.courses(id) on delete set null,
  add column if not exists is_catalog integer not null default 0,
  add column if not exists course_audience text not null default 'student',
  add column if not exists completion_points integer not null default 500;

alter table public.courses drop constraint if exists courses_creator_role_check;
alter table public.courses add constraint courses_creator_role_check check (creator_role in ('admin','tutor'));
alter table public.courses drop constraint if exists courses_audience_check;
alter table public.courses add constraint courses_audience_check check (course_audience in ('student','tutor'));
alter table public.courses drop constraint if exists courses_completion_points_check;
alter table public.courses add constraint courses_completion_points_check check (completion_points between 0 and 100000);

alter table public.chapters
  add column if not exists release_mode text not null default 'free',
  add column if not exists drip_days integer not null default 0;
alter table public.chapters drop constraint if exists chapters_release_mode_check;
alter table public.chapters add constraint chapters_release_mode_check check (release_mode in ('free','drip'));
alter table public.chapters drop constraint if exists chapters_drip_days_check;
alter table public.chapters add constraint chapters_drip_days_check check (drip_days between 0 and 3650);

create table if not exists public.assessment_reset_requests (
  id text primary key,
  quiz_id text not null references public.quizzes(id) on delete cascade,
  learner_id text not null references public.users(id) on delete cascade,
  requested_by text not null references public.users(id),
  reviewer_id text references public.users(id),
  reason text not null default '',
  status text not null default 'pending',
  requested_at text not null,
  reviewed_at text,
  constraint assessment_reset_status_check check (status in ('pending','approved','declined','cancelled'))
);

create table if not exists public.staff_course_enrollments (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  tutor_id text not null references public.users(id) on delete cascade,
  assigned_by text not null references public.users(id),
  progress integer not null default 0,
  status text not null default 'active',
  assigned_at text not null,
  completed_at text,
  unique(course_id,tutor_id)
);

create table if not exists public.staff_certificates (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  tutor_id text not null references public.users(id) on delete cascade,
  certificate_code text not null unique,
  issued_at text not null,
  unique(course_id,tutor_id)
);

create table if not exists public.tutor_availability_slots (
  id text primary key,
  tutor_id text not null references public.users(id) on delete cascade,
  weekday integer not null,
  start_minutes integer not null,
  end_minutes integer not null,
  timezone text not null default 'Asia/Kolkata',
  is_open integer not null default 1,
  created_at text not null,
  updated_at text not null,
  constraint availability_weekday_check check (weekday between 0 and 6),
  constraint availability_minutes_check check (start_minutes between 0 and 1439 and end_minutes between 1 and 1440 and end_minutes > start_minutes)
);

create table if not exists public.demo_bookings (
  id text primary key,
  public_code text not null unique,
  student_name text not null,
  guardian_name text not null default '',
  email text not null,
  phone text not null default '',
  timezone text not null,
  curriculum_id text references public.curricula(id) on delete set null,
  subject_id text references public.curriculum_subjects(id) on delete set null,
  grade_level text not null default '',
  tutor_id text references public.users(id) on delete set null,
  starts_at text not null,
  duration_minutes integer not null default 30,
  notes text not null default '',
  status text not null default 'requested',
  created_at text not null,
  constraint demo_booking_status_check check (status in ('requested','confirmed','completed','cancelled','no_show'))
);

create table if not exists public.chat_moderation_alerts (
  id text primary key,
  sender_id text not null references public.users(id) on delete cascade,
  recipient_id text not null references public.users(id) on delete cascade,
  course_id text references public.courses(id) on delete set null,
  blocked_body text not null,
  reasons_json text not null default '[]',
  status text not null default 'open',
  created_at text not null,
  reviewed_by text references public.users(id),
  reviewed_at text,
  constraint chat_alert_status_check check (status in ('open','reviewed','dismissed'))
);

alter table public.user_profiles
  add column if not exists intro_video_url text not null default '',
  add column if not exists subject_areas text not null default '',
  add column if not exists grade_levels text not null default '',
  add column if not exists certifications text not null default '';

create index if not exists idx_curricula_status_name on public.curricula(status,name);
create index if not exists idx_curriculum_subjects_curriculum on public.curriculum_subjects(curriculum_id,status,name);
create index if not exists idx_courses_curriculum_grade_subject on public.courses(curriculum_id,grade_level,subject);
create index if not exists idx_courses_catalog on public.courses(is_catalog,status,course_audience);
create index if not exists idx_reset_requests_reviewer_status on public.assessment_reset_requests(status,requested_at);
create index if not exists idx_staff_enrollments_tutor on public.staff_course_enrollments(tutor_id,status);
create index if not exists idx_availability_tutor_day on public.tutor_availability_slots(tutor_id,weekday,is_open);
create index if not exists idx_demo_bookings_start on public.demo_bookings(starts_at,status);
create index if not exists idx_chat_alerts_status on public.chat_moderation_alerts(status,created_at);

alter table public.curricula enable row level security;
alter table public.curriculum_subjects enable row level security;
alter table public.assessment_reset_requests enable row level security;
alter table public.staff_course_enrollments enable row level security;
alter table public.staff_certificates enable row level security;
alter table public.tutor_availability_slots enable row level security;
alter table public.demo_bookings enable row level security;
alter table public.chat_moderation_alerts enable row level security;

