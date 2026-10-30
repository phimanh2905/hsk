CREATE TABLE `reading_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`text_zh` text NOT NULL,
	`doc` text NOT NULL,
	`chars` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `reading_drafts_user_idx` ON `reading_drafts` (`user_id`);--> statement-breakpoint
CREATE TABLE `reading_usage` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`user_id`, `day`)
);
