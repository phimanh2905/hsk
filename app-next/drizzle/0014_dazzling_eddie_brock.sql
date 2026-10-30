PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_reading_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`text_zh` text NOT NULL,
	`doc` text NOT NULL,
	`chars` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_reading_drafts`("id", "user_id", "title", "text_zh", "doc", "chars", "created_at", "updated_at", "deleted_at") SELECT "id", "user_id", "title", "text_zh", "doc", "chars", "created_at", "updated_at", "deleted_at" FROM `reading_drafts`;--> statement-breakpoint
DROP TABLE `reading_drafts`;--> statement-breakpoint
ALTER TABLE `__new_reading_drafts` RENAME TO `reading_drafts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `reading_drafts_user_idx` ON `reading_drafts` (`user_id`);