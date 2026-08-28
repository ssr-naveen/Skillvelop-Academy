-- Keep tutor workspace reads indexed as courses, learners, and attempts grow.
create index if not exists idx_enrollments_course_student
  on public.enrollments(course_id, student_id);

create index if not exists idx_activities_tutor_due
  on public.activities(tutor_id, due_at);

create index if not exists idx_submissions_activity_status_submitted
  on public.submissions(activity_id, status, submitted_at desc);

create index if not exists idx_quiz_attempts_quiz_student_submitted
  on public.quiz_attempts(quiz_id, student_id, submitted_at desc);

create index if not exists idx_courses_source_tutor
  on public.courses(source_course_id, tutor_id)
  where source_course_id is not null;

create index if not exists idx_assessment_resets_quiz_status
  on public.assessment_reset_requests(quiz_id, status, requested_at);

analyze public.courses;
analyze public.enrollments;
analyze public.activities;
analyze public.submissions;
analyze public.quizzes;
analyze public.quiz_questions;
analyze public.quiz_attempts;
analyze public.quiz_assignments;

