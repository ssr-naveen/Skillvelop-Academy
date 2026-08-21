ALTER TABLE quiz_questions ADD COLUMN image_r2_key TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE quiz_questions ADD COLUMN image_file_name TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE quiz_questions ADD COLUMN image_content_type TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE quiz_questions ADD COLUMN image_size_bytes INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
PRAGMA optimize;
