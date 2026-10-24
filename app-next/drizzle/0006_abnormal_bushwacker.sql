CREATE TABLE `lesson_progress` (
	`user_id` text NOT NULL,
	`book` text NOT NULL,
	`lesson` text NOT NULL,
	`modes` text DEFAULT '{}' NOT NULL,
	`known_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	PRIMARY KEY(`user_id`, `book`, `lesson`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `srs_cards` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`due_at` integer,
	`review_count` integer DEFAULT 0 NOT NULL,
	`last_reviewed_at` integer,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `srs_cards_user_key_uq` ON `srs_cards` (`user_id`,`key`);--> statement-breakpoint
CREATE TABLE `study_day` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`correct` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `date`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
