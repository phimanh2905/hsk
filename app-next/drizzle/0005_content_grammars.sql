CREATE TABLE `content_grammars` (
	`id` text PRIMARY KEY NOT NULL,
	`level` text NOT NULL,
	`ord` integer NOT NULL,
	`title` text NOT NULL,
	`hz` text NOT NULL,
	`topic` text NOT NULL,
	`def` text NOT NULL,
	`formula` text NOT NULL,
	`pitfall` text NOT NULL,
	`ex` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_grammars_level_idx` ON `content_grammars` (`level`);
