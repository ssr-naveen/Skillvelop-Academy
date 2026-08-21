ALTER TABLE lessons ADD COLUMN content_format TEXT NOT NULL DEFAULT 'html';
--> statement-breakpoint
ALTER TABLE lessons ADD COLUMN embed_url TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE TABLE lesson_notes (
  id TEXT PRIMARY KEY NOT NULL,
  lesson_id TEXT NOT NULL REFERENCES lessons(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  UNIQUE(lesson_id, student_id)
);
--> statement-breakpoint
CREATE TABLE submission_attachments (
  id TEXT PRIMARY KEY NOT NULL,
  submission_id TEXT NOT NULL REFERENCES submissions(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_lesson_notes_student_lesson ON lesson_notes(student_id, lesson_id);
--> statement-breakpoint
CREATE INDEX idx_lesson_notes_lesson_updated ON lesson_notes(lesson_id, updated_at);
--> statement-breakpoint
CREATE INDEX idx_submission_attachments_submission ON submission_attachments(submission_id, created_at);
--> statement-breakpoint
PRAGMA optimize;
