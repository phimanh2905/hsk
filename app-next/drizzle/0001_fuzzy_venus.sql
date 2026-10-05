CREATE TABLE `shadowing_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`videoId` text NOT NULL,
	`status` text DEFAULT 'mid' NOT NULL,
	`score` integer,
	`seconds` integer DEFAULT 0 NOT NULL,
	`linesDone` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shadowing_progress_user_video_uq` ON `shadowing_progress` (`userId`,`videoId`);