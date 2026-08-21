CREATE TABLE IF NOT EXISTS `manager_permissions` (`id` text PRIMARY KEY NOT NULL, `manager_id` text NOT NULL, `permission` text NOT NULL, `created_at` text NOT NULL, FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action, UNIQUE(`manager_id`,`permission`));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `student_subscriptions` (`id` text PRIMARY KEY NOT NULL, `student_id` text NOT NULL UNIQUE, `plan_type` text DEFAULT 'trial' NOT NULL, `class_allowance` integer DEFAULT 1 NOT NULL, `months_purchased` integer DEFAULT 0 NOT NULL, `started_at` text NOT NULL, `expires_at` text NOT NULL, `renewal_count` integer DEFAULT 0 NOT NULL, `notes` text DEFAULT '' NOT NULL, `updated_at` text NOT NULL, FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `subscription_renewals` (`id` text PRIMARY KEY NOT NULL, `subscription_id` text NOT NULL, `added_classes` integer NOT NULL, `added_months` integer NOT NULL, `previous_expiry` text NOT NULL, `new_expiry` text NOT NULL, `created_by` text NOT NULL, `created_at` text NOT NULL, FOREIGN KEY (`subscription_id`) REFERENCES `student_subscriptions`(`id`) ON UPDATE no action ON DELETE no action, FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_manager_permissions_manager` ON `manager_permissions` (`manager_id`,`permission`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_subscriptions_plan_expiry` ON `student_subscriptions` (`plan_type`,`expires_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_renewals_subscription_created` ON `subscription_renewals` (`subscription_id`,`created_at`);
--> statement-breakpoint
PRAGMA optimize;
