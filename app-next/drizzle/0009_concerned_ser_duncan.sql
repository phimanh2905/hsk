CREATE TABLE `battle_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`book_slug` text NOT NULL,
	`lesson_slug` text NOT NULL,
	`correct_count` integer NOT NULL,
	`total_count` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`score` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `battle_attempts_lesson_idx` ON `battle_attempts` (`book_slug`,`lesson_slug`,`score`);--> statement-breakpoint
CREATE INDEX `battle_attempts_month_idx` ON `battle_attempts` (`createdAt`);--> statement-breakpoint
CREATE INDEX `battle_attempts_user_idx` ON `battle_attempts` (`userId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `hsk_exam_results` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`level` text NOT NULL,
	`total_score` integer NOT NULL,
	`max_score` integer NOT NULL,
	`sections` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `hsk_exam_results_user_idx` ON `hsk_exam_results` (`userId`,`createdAt`);