CREATE TABLE IF NOT EXISTS `user_profiles` (`id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL UNIQUE, `phone` text DEFAULT '' NOT NULL, `timezone` text DEFAULT 'Asia/Kolkata' NOT NULL, `bio` text DEFAULT '' NOT NULL, `preferred_language` text DEFAULT 'English' NOT NULL, `updated_at` text NOT NULL, FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `curriculum_templates` (`id` text PRIMARY KEY NOT NULL, `title` text NOT NULL, `subject` text NOT NULL, `level` text NOT NULL, `description` text NOT NULL, `status` text DEFAULT 'published' NOT NULL, `created_by` text NOT NULL, `created_at` text NOT NULL, FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `curriculum_template_lessons` (`id` text PRIMARY KEY NOT NULL, `template_id` text NOT NULL, `title` text NOT NULL, `summary` text NOT NULL, `content` text NOT NULL, `position` integer DEFAULT 1 NOT NULL, `duration_minutes` integer DEFAULT 30 NOT NULL, `created_at` text NOT NULL, FOREIGN KEY (`template_id`) REFERENCES `curriculum_templates`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `curriculum_imports` (`id` text PRIMARY KEY NOT NULL, `template_id` text NOT NULL, `course_id` text NOT NULL, `tutor_id` text NOT NULL, `imported_at` text NOT NULL, FOREIGN KEY (`template_id`) REFERENCES `curriculum_templates`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`tutor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action, UNIQUE(`template_id`,`course_id`));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_template_lessons_template_position` ON `curriculum_template_lessons` (`template_id`,`position`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_curriculum_templates_subject_level` ON `curriculum_templates` (`subject`,`level`,`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_curriculum_imports_tutor_course` ON `curriculum_imports` (`tutor_id`,`course_id`);
--> statement-breakpoint
PRAGMA optimize;
