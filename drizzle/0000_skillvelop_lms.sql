CREATE TABLE IF NOT EXISTS `users` (`id` text PRIMARY KEY NOT NULL, `auth_user_id` text, `email` text NOT NULL, `name` text NOT NULL, `role` text DEFAULT 'student' NOT NULL, `status` text DEFAULT 'active' NOT NULL, `created_at` text NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_auth_user_id_unique` ON `users` (`auth_user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `courses` (`id` text PRIMARY KEY NOT NULL, `title` text NOT NULL, `subject` text NOT NULL, `level` text NOT NULL, `description` text NOT NULL, `tutor_id` text, `status` text DEFAULT 'active' NOT NULL, `accent` text DEFAULT 'blue' NOT NULL, `created_at` text NOT NULL, FOREIGN KEY (`tutor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `enrollments` (`id` text PRIMARY KEY NOT NULL, `course_id` text NOT NULL, `student_id` text NOT NULL, `progress` integer DEFAULT 0 NOT NULL, `created_at` text NOT NULL, FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `live_classes` (`id` text PRIMARY KEY NOT NULL, `course_id` text NOT NULL, `tutor_id` text NOT NULL, `student_id` text, `title` text NOT NULL, `starts_at` text NOT NULL, `duration_minutes` integer DEFAULT 60 NOT NULL, `meeting_url` text DEFAULT '' NOT NULL, `status` text DEFAULT 'scheduled' NOT NULL, `notes` text DEFAULT '' NOT NULL, FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`tutor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `activities` (`id` text PRIMARY KEY NOT NULL, `course_id` text NOT NULL, `tutor_id` text NOT NULL, `title` text NOT NULL, `type` text NOT NULL, `instructions` text NOT NULL, `due_at` text NOT NULL, `points` integer DEFAULT 100 NOT NULL, `status` text DEFAULT 'published' NOT NULL, `created_at` text NOT NULL, FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`tutor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `submissions` (`id` text PRIMARY KEY NOT NULL, `activity_id` text NOT NULL, `student_id` text NOT NULL, `response` text NOT NULL, `submitted_at` text NOT NULL, `score` integer, `feedback` text DEFAULT '' NOT NULL, `status` text DEFAULT 'submitted' NOT NULL, FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `announcements` (`id` text PRIMARY KEY NOT NULL, `course_id` text, `author_id` text NOT NULL, `title` text NOT NULL, `body` text NOT NULL, `created_at` text NOT NULL, FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_enrollments_course_student` ON `enrollments` (`course_id`,`student_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_submissions_activity_student` ON `submissions` (`activity_id`,`student_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_users_role_status` ON `users` (`role`,`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_courses_tutor_status` ON `courses` (`tutor_id`,`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_enrollments_student` ON `enrollments` (`student_id`,`course_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_classes_tutor_start` ON `live_classes` (`tutor_id`,`starts_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_classes_student_start` ON `live_classes` (`student_id`,`starts_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_activities_course_due` ON `activities` (`course_id`,`due_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_submissions_student_status` ON `submissions` (`student_id`,`status`);
--> statement-breakpoint
PRAGMA optimize;

