alter table public.quizzes
  alter column course_id drop not null,
  add column if not exists scope text not null default 'course',
  add column if not exists question_count integer not null default 5,
  add column if not exists passing_percentage integer not null default 60;

alter table public.quizzes
  add constraint quizzes_scope_check check (scope in ('course', 'standalone')),
  add constraint quizzes_question_count_check check (question_count in (5, 10, 15, 20, 25)),
  add constraint quizzes_passing_percentage_check check (passing_percentage between 0 and 100),
  add constraint quizzes_scope_location_check check (
    (scope = 'course' and course_id is not null)
    or (scope = 'standalone' and course_id is null and chapter_id is null)
  );

create table if not exists public.quiz_assignments (
  id text primary key,
  quiz_id text not null references public.quizzes(id) on delete cascade,
  student_id text references public.users(id) on delete cascade,
  assigned_by text not null references public.users(id),
  status text not null default 'active' check (status in ('active', 'revoked')),
  assigned_at text not null,
  revoked_at text,
  check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

create unique index if not exists idx_quiz_assignments_all_active
  on public.quiz_assignments(quiz_id)
  where student_id is null and status = 'active';

create unique index if not exists idx_quiz_assignments_student_active
  on public.quiz_assignments(quiz_id, student_id)
  where student_id is not null and status = 'active';

create index if not exists idx_quiz_assignments_student_status
  on public.quiz_assignments(student_id, status, assigned_at);

create index if not exists idx_quizzes_tutor_scope_status
  on public.quizzes(tutor_id, scope, status);

alter table public.quiz_assignments enable row level security;
