CREATE TABLE IF NOT EXISTS `lessons` (`id` text PRIMARY KEY NOT NULL, `course_id` text NOT NULL, `tutor_id` text NOT NULL, `title` text NOT NULL, `summary` text NOT NULL, `content` text NOT NULL, `position` integer DEFAULT 1 NOT NULL, `duration_minutes` integer DEFAULT 30 NOT NULL, `status` text DEFAULT 'published' NOT NULL, `created_at` text NOT NULL, FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`tutor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `lesson_progress` (`id` text PRIMARY KEY NOT NULL, `lesson_id` text NOT NULL, `student_id` text NOT NULL, `completed_at` text NOT NULL, FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action, UNIQUE(`lesson_id`,`student_id`));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `messages` (`id` text PRIMARY KEY NOT NULL, `course_id` text NOT NULL, `sender_id` text NOT NULL, `recipient_id` text NOT NULL, `body` text NOT NULL, `created_at` text NOT NULL, `read_at` text, FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_lessons_course_position` ON `lessons` (`course_id`,`position`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_lesson_progress_student` ON `lesson_progress` (`student_id`,`lesson_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_messages_participants_created` ON `messages` (`sender_id`,`recipient_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_messages_course_created` ON `messages` (`course_id`,`created_at`);
--> statement-breakpoint
PRAGMA optimize;
