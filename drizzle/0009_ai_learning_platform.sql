CREATE TABLE IF NOT EXISTS `ai_settings` (`id` text PRIMARY KEY NOT NULL, `provider` text DEFAULT 'openai' NOT NULL, `model` text DEFAULT 'gpt-5-mini' NOT NULL, `enabled` integer DEFAULT 0 NOT NULL, `system_guidance` text DEFAULT '' NOT NULL, `updated_by` text NOT NULL, `updated_at` text NOT NULL, FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_threads` (`id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `persona` text NOT NULL, `course_id` text, `title` text NOT NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL, FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_messages` (`id` text PRIMARY KEY NOT NULL, `thread_id` text NOT NULL, `role` text NOT NULL, `body` text NOT NULL, `created_at` text NOT NULL, FOREIGN KEY (`thread_id`) REFERENCES `ai_threads`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ai_threads_user_updated` ON `ai_threads` (`user_id`,`updated_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ai_messages_thread_created` ON `ai_messages` (`thread_id`,`created_at`);
--> statement-breakpoint
PRAGMA optimize;
