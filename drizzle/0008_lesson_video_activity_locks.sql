ALTER TABLE lessons ADD COLUMN video_url TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE activities ADD COLUMN is_unlocked INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint
CREATE INDEX idx_activities_chapter_unlock ON activities(chapter_id,is_unlocked,status);
--> statement-breakpoint
PRAGMA optimize;
