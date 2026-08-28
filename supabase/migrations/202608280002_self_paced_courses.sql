ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS course_mode TEXT NOT NULL DEFAULT 'guided';

ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS courses_course_mode_check;

ALTER TABLE courses
  ADD CONSTRAINT courses_course_mode_check
  CHECK (course_mode IN ('guided', 'self_paced'));

CREATE INDEX IF NOT EXISTS idx_courses_mode_status
  ON courses(course_mode, status);

UPDATE chapters
SET release_mode = 'free', drip_days = 0, is_unlocked = 1
WHERE course_id IN (SELECT id FROM courses WHERE course_mode = 'self_paced');

UPDATE lessons
SET is_unlocked = 1
WHERE course_id IN (SELECT id FROM courses WHERE course_mode = 'self_paced');

UPDATE quizzes
SET is_unlocked = 1
WHERE course_id IN (SELECT id FROM courses WHERE course_mode = 'self_paced')
  AND scope = 'course';

UPDATE activities
SET is_unlocked = 1
WHERE course_id IN (SELECT id FROM courses WHERE course_mode = 'self_paced');

