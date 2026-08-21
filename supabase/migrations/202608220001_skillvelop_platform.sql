create table if not exists public.users (
  id text primary key,
  auth_user_id text unique,
  username text unique,
  password_hash text not null default '',
  email text not null unique,
  name text not null,
  public_id text unique,
  role text not null default 'student' check (role in ('admin','manager','tutor','student')),
  status text not null default 'active' check (status in ('active','invited','suspended')),
  created_at text not null
);

create table if not exists public.courses (
  id text primary key, title text not null, subject text not null, level text not null,
  description text not null, cover_image_url text not null default '', is_unlocked integer not null default 1,
  is_imported integer not null default 0, tutor_id text references public.users(id),
  status text not null default 'active', accent text not null default 'blue', created_at text not null
);
create table if not exists public.chapters (
  id text primary key, course_id text not null references public.courses(id), tutor_id text not null references public.users(id),
  title text not null, description text not null default '', position integer not null default 1,
  is_unlocked integer not null default 0, created_at text not null
);
create table if not exists public.enrollments (
  id text primary key, course_id text not null references public.courses(id), student_id text not null references public.users(id),
  progress integer not null default 0, created_at text not null, unique(course_id,student_id)
);
create table if not exists public.live_classes (
  id text primary key, course_id text not null references public.courses(id), tutor_id text not null references public.users(id),
  student_id text references public.users(id), title text not null, starts_at text not null, duration_minutes integer not null default 60,
  meeting_url text not null default '', status text not null default 'scheduled', notes text not null default '',
  confirmation_requested_at text, student_confirmed_at text, student_rating integer, student_feedback text not null default ''
);
create table if not exists public.activities (
  id text primary key, course_id text not null references public.courses(id), chapter_id text references public.chapters(id),
  tutor_id text not null references public.users(id), title text not null, type text not null, instructions text not null,
  due_at text not null, points integer not null default 100, is_unlocked integer not null default 1,
  status text not null default 'published', created_at text not null
);
create table if not exists public.submissions (
  id text primary key, activity_id text not null references public.activities(id), student_id text not null references public.users(id),
  response text not null, submitted_at text not null, score integer, feedback text not null default '',
  status text not null default 'submitted', unique(activity_id,student_id)
);
create table if not exists public.announcements (
  id text primary key, course_id text references public.courses(id), author_id text not null references public.users(id),
  title text not null, body text not null, created_at text not null
);
create table if not exists public.manager_permissions (
  id text primary key, manager_id text not null references public.users(id), permission text not null,
  created_at text not null, unique(manager_id,permission)
);
create table if not exists public.student_subscriptions (
  id text primary key, student_id text not null unique references public.users(id), plan_type text not null default 'trial',
  class_allowance integer not null default 1, months_purchased integer not null default 0, started_at text not null,
  expires_at text not null, renewal_count integer not null default 0, notes text not null default '', updated_at text not null
);
create table if not exists public.subscription_renewals (
  id text primary key, subscription_id text not null references public.student_subscriptions(id), added_classes integer not null,
  added_months integer not null, previous_expiry text not null, new_expiry text not null,
  created_by text not null references public.users(id), created_at text not null
);
create table if not exists public.lessons (
  id text primary key, course_id text not null references public.courses(id), chapter_id text references public.chapters(id),
  tutor_id text not null references public.users(id), title text not null, summary text not null, content text not null,
  content_format text not null default 'html', embed_url text not null default '', video_url text not null default '',
  position integer not null default 1, duration_minutes integer not null default 30, is_unlocked integer not null default 0,
  status text not null default 'published', created_at text not null
);
create table if not exists public.lesson_progress (
  id text primary key, lesson_id text not null references public.lessons(id), student_id text not null references public.users(id),
  completed_at text not null, unique(lesson_id,student_id)
);
create table if not exists public.messages (
  id text primary key, course_id text not null references public.courses(id), sender_id text not null references public.users(id),
  recipient_id text not null references public.users(id), body text not null, created_at text not null, read_at text
);
create table if not exists public.user_profiles (
  id text primary key, user_id text not null unique references public.users(id), phone text not null default '',
  timezone text not null default 'Asia/Kolkata', bio text not null default '', preferred_language text not null default 'English',
  headline text not null default '', qualifications text not null default '', experience_years integer not null default 0,
  specialties text not null default '', achievements text not null default '', teaching_philosophy text not null default '',
  location text not null default '', languages text not null default '', linkedin_url text not null default '',
  website_url text not null default '', avatar_r2_key text not null default '', avatar_content_type text not null default '',
  avatar_file_name text not null default '', is_public integer not null default 1, updated_at text not null
);
create table if not exists public.curriculum_templates (
  id text primary key, title text not null, subject text not null, level text not null, description text not null,
  status text not null default 'published', created_by text not null references public.users(id), created_at text not null
);
create table if not exists public.curriculum_template_lessons (
  id text primary key, template_id text not null references public.curriculum_templates(id), title text not null,
  summary text not null, content text not null, position integer not null default 1,
  duration_minutes integer not null default 30, created_at text not null
);
create table if not exists public.curriculum_imports (
  id text primary key, template_id text not null references public.curriculum_templates(id),
  course_id text not null references public.courses(id), tutor_id text not null references public.users(id),
  imported_at text not null, unique(template_id,course_id)
);
create table if not exists public.student_gamification (
  id text primary key, student_id text not null unique references public.users(id), xp integer not null default 0,
  level integer not null default 1, streak_days integer not null default 0, updated_at text not null
);
create table if not exists public.badges (
  id text primary key, name text not null, description text not null, icon text not null, xp_required integer not null default 0
);
create table if not exists public.student_badges (
  id text primary key, student_id text not null references public.users(id), badge_id text not null references public.badges(id),
  awarded_at text not null, unique(student_id,badge_id)
);
create table if not exists public.certificates (
  id text primary key, student_id text not null references public.users(id), course_id text not null references public.courses(id),
  certificate_code text not null unique, issued_at text not null, unique(student_id,course_id)
);
create table if not exists public.lesson_resources (
  id text primary key, lesson_id text not null references public.lessons(id), title text not null, resource_type text not null,
  file_name text not null, content_type text not null, r2_key text not null, size_bytes integer not null, created_at text not null
);
create table if not exists public.lesson_notes (
  id text primary key, lesson_id text not null references public.lessons(id), student_id text not null references public.users(id),
  body text not null default '', updated_at text not null, unique(lesson_id,student_id)
);
create table if not exists public.submission_attachments (
  id text primary key, submission_id text not null references public.submissions(id), student_id text not null references public.users(id),
  file_name text not null, content_type text not null, r2_key text not null, size_bytes integer not null, created_at text not null
);
create table if not exists public.quizzes (
  id text primary key, course_id text not null references public.courses(id), chapter_id text references public.chapters(id),
  tutor_id text not null references public.users(id), title text not null, description text not null, kind text not null default 'quiz',
  attempt_limit integer not null default 1, is_unlocked integer not null default 0, status text not null default 'published', created_at text not null
);
create table if not exists public.quiz_questions (
  id text primary key, quiz_id text not null references public.quizzes(id), type text not null, prompt text not null,
  options_json text not null default '[]', answer_json text not null, points integer not null default 1,
  position integer not null default 1, image_r2_key text not null default '', image_file_name text not null default '',
  image_content_type text not null default '', image_size_bytes integer not null default 0
);
create table if not exists public.quiz_attempts (
  id text primary key, quiz_id text not null references public.quizzes(id), student_id text not null references public.users(id),
  answers_json text not null, score integer not null, max_score integer not null, submitted_at text not null
);
create table if not exists public.ai_settings (
  id text primary key, provider text not null default 'openai', model text not null default 'gpt-5-mini',
  enabled integer not null default 0, system_guidance text not null default '',
  updated_by text not null references public.users(id), updated_at text not null
);
create table if not exists public.ai_threads (
  id text primary key, user_id text not null references public.users(id), persona text not null,
  course_id text references public.courses(id), title text not null, created_at text not null, updated_at text not null
);
create table if not exists public.ai_messages (
  id text primary key, thread_id text not null references public.ai_threads(id), role text not null, body text not null, created_at text not null
);
create table if not exists public.ai_provider_credentials (
  provider text primary key, encrypted_key text not null, iv text not null, key_hint text not null default '',
  updated_by text not null references public.users(id), updated_at text not null
);
create table if not exists public.file_objects (
  key text primary key, data bytea not null, content_type text not null, created_at text not null
);

create index if not exists idx_users_role_status on public.users(role,status);
create index if not exists idx_courses_tutor_status on public.courses(tutor_id,status);
create index if not exists idx_enrollments_student on public.enrollments(student_id,course_id);
create index if not exists idx_classes_tutor_start on public.live_classes(tutor_id,starts_at);
create index if not exists idx_classes_student_start on public.live_classes(student_id,starts_at);
create index if not exists idx_activities_course_due on public.activities(course_id,due_at);
create index if not exists idx_lessons_course_position on public.lessons(course_id,position);
create index if not exists idx_chapters_course_position on public.chapters(course_id,position);
create index if not exists idx_messages_participants_created on public.messages(sender_id,recipient_id,created_at);
create index if not exists idx_quiz_questions_quiz_position on public.quiz_questions(quiz_id,position);
create index if not exists idx_ai_threads_user_updated on public.ai_threads(user_id,updated_at);

alter table public.users enable row level security;
alter table public.courses enable row level security;
alter table public.chapters enable row level security;
alter table public.enrollments enable row level security;
alter table public.live_classes enable row level security;
alter table public.activities enable row level security;
alter table public.submissions enable row level security;
alter table public.announcements enable row level security;
alter table public.manager_permissions enable row level security;
alter table public.student_subscriptions enable row level security;
alter table public.subscription_renewals enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.messages enable row level security;
alter table public.user_profiles enable row level security;
alter table public.curriculum_templates enable row level security;
alter table public.curriculum_template_lessons enable row level security;
alter table public.curriculum_imports enable row level security;
alter table public.student_gamification enable row level security;
alter table public.badges enable row level security;
alter table public.student_badges enable row level security;
alter table public.certificates enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.submission_attachments enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.ai_settings enable row level security;
alter table public.ai_threads enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_provider_credentials enable row level security;
alter table public.file_objects enable row level security;

insert into public.users (id,auth_user_id,username,password_hash,email,name,public_id,role,status,created_at)
values (
  'usr_skillvelop_admin','usr_skillvelop_admin','skillvelop-admin',
  'scrypt$L4GjcGKjD_vZEJ7ZEiBObA$M3fCVU-cKLYyIw-OuscI7kfSJvKoLZ-WodgOs1OUwCZ30EHpr6LccAMZsOYlQ9BHun6XL06sybDUeBnWVZbUKA',
  'admin@skillvelop.com','Skillvelop Super Admin','SKV-ADM-00000001','admin','active',now()::text
)
on conflict (username) do update set
  password_hash=excluded.password_hash, role='admin', status='active', auth_user_id=excluded.auth_user_id;
