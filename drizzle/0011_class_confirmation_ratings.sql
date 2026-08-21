ALTER TABLE `live_classes` ADD `confirmation_requested_at` text;
ALTER TABLE `live_classes` ADD `student_confirmed_at` text;
ALTER TABLE `live_classes` ADD `student_rating` integer;
ALTER TABLE `live_classes` ADD `student_feedback` text NOT NULL DEFAULT '';
ALTER TABLE `courses` ADD `is_imported` integer NOT NULL DEFAULT 0;
UPDATE `courses` SET `is_imported`=1 WHERE `id` IN (SELECT `course_id` FROM `curriculum_imports`);
CREATE INDEX IF NOT EXISTS `idx_classes_confirmation` ON `live_classes` (`student_id`,`status`,`starts_at`);
PRAGMA optimize;
