CREATE TABLE `notebook_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`kind` text NOT NULL,
	`tag` text NOT NULL,
	`tagTone` text DEFAULT 'red' NOT NULL,
	`payload` text NOT NULL,
	`saved` integer DEFAULT false NOT NULL,
	`hsk` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notebook_entries_user_created_idx` ON `notebook_entries` (`userId`,`createdAt`);