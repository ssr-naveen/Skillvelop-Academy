CREATE TABLE IF NOT EXISTS student_gamification (id TEXT PRIMARY KEY,student_id TEXT NOT NULL UNIQUE,xp INTEGER NOT NULL DEFAULT 0,level INTEGER NOT NULL DEFAULT 1,streak_days INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL,FOREIGN KEY(student_id) REFERENCES users(id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS badges (id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,icon TEXT NOT NULL,xp_required INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS student_badges (id TEXT PRIMARY KEY,student_id TEXT NOT NULL,badge_id TEXT NOT NULL,awarded_at TEXT NOT NULL,FOREIGN KEY(student_id) REFERENCES users(id),FOREIGN KEY(badge_id) REFERENCES badges(id),UNIQUE(student_id,badge_id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS certificates (id TEXT PRIMARY KEY,student_id TEXT NOT NULL,course_id TEXT NOT NULL,certificate_code TEXT NOT NULL UNIQUE,issued_at TEXT NOT NULL,FOREIGN KEY(student_id) REFERENCES users(id),FOREIGN KEY(course_id) REFERENCES courses(id),UNIQUE(student_id,course_id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS lesson_resources (id TEXT PRIMARY KEY,lesson_id TEXT NOT NULL,title TEXT NOT NULL,resource_type TEXT NOT NULL,file_name TEXT NOT NULL,content_type TEXT NOT NULL,r2_key TEXT NOT NULL,size_bytes INTEGER NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(lesson_id) REFERENCES lessons(id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS quizzes (id TEXT PRIMARY KEY,course_id TEXT NOT NULL,tutor_id TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'quiz',attempt_limit INTEGER NOT NULL DEFAULT 1,status TEXT NOT NULL DEFAULT 'published',created_at TEXT NOT NULL,FOREIGN KEY(course_id) REFERENCES courses(id),FOREIGN KEY(tutor_id) REFERENCES users(id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS quiz_questions (id TEXT PRIMARY KEY,quiz_id TEXT NOT NULL,type TEXT NOT NULL,prompt TEXT NOT NULL,options_json TEXT NOT NULL DEFAULT '[]',answer_json TEXT NOT NULL,points INTEGER NOT NULL DEFAULT 1,position INTEGER NOT NULL DEFAULT 1,FOREIGN KEY(quiz_id) REFERENCES quizzes(id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS quiz_attempts (id TEXT PRIMARY KEY,quiz_id TEXT NOT NULL,student_id TEXT NOT NULL,answers_json TEXT NOT NULL,score INTEGER NOT NULL,max_score INTEGER NOT NULL,submitted_at TEXT NOT NULL,FOREIGN KEY(quiz_id) REFERENCES quizzes(id),FOREIGN KEY(student_id) REFERENCES users(id));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gamification_xp ON student_gamification(xp);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id,issued_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_resources_lesson ON lesson_resources(lesson_id,created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_quizzes_course_status ON quizzes(course_id,status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_position ON quiz_questions(quiz_id,position);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id,submitted_at);
--> statement-breakpoint
PRAGMA optimize;
