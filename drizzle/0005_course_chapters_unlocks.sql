ALTER TABLE courses ADD COLUMN cover_image_url TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE courses ADD COLUMN is_unlocked INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint
CREATE TABLE chapters (id TEXT PRIMARY KEY,course_id TEXT NOT NULL,tutor_id TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 1,is_unlocked INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,FOREIGN KEY(course_id) REFERENCES courses(id),FOREIGN KEY(tutor_id) REFERENCES users(id));
--> statement-breakpoint
ALTER TABLE lessons ADD COLUMN chapter_id TEXT REFERENCES chapters(id);
--> statement-breakpoint
ALTER TABLE lessons ADD COLUMN is_unlocked INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE quizzes ADD COLUMN chapter_id TEXT REFERENCES chapters(id);
--> statement-breakpoint
ALTER TABLE quizzes ADD COLUMN is_unlocked INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint
INSERT INTO chapters (id,course_id,tutor_id,title,description,position,is_unlocked,created_at) SELECT 'chp_'||lower(hex(randomblob(9))),id,tutor_id,'Chapter 1: Foundations',description,1,1,created_at FROM courses WHERE tutor_id IS NOT NULL;
--> statement-breakpoint
UPDATE lessons SET chapter_id=(SELECT ch.id FROM chapters ch WHERE ch.course_id=lessons.course_id ORDER BY ch.position LIMIT 1) WHERE chapter_id IS NULL;
--> statement-breakpoint
UPDATE quizzes SET chapter_id=(SELECT ch.id FROM chapters ch WHERE ch.course_id=quizzes.course_id ORDER BY ch.position LIMIT 1) WHERE chapter_id IS NULL;
--> statement-breakpoint
CREATE INDEX idx_chapters_course_position ON chapters(course_id,position);
--> statement-breakpoint
CREATE INDEX idx_lessons_chapter_position ON lessons(chapter_id,position);
--> statement-breakpoint
CREATE INDEX idx_quizzes_chapter_status ON quizzes(chapter_id,status);
--> statement-breakpoint
PRAGMA optimize;
