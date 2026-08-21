ALTER TABLE activities ADD COLUMN chapter_id TEXT REFERENCES chapters(id);
--> statement-breakpoint
UPDATE activities SET chapter_id=(SELECT ch.id FROM chapters ch WHERE ch.course_id=activities.course_id ORDER BY ch.position LIMIT 1) WHERE chapter_id IS NULL;
--> statement-breakpoint
CREATE INDEX idx_activities_chapter_due ON activities(chapter_id,due_at);
--> statement-breakpoint
PRAGMA optimize;
