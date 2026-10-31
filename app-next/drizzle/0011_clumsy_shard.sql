CREATE TABLE `content_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`level` text NOT NULL,
	`ord` integer NOT NULL,
	`title` text NOT NULL,
	`title_vi` text NOT NULL,
	`sentences` text NOT NULL,
	`vocab` text NOT NULL,
	`questions` text NOT NULL,
	`audio_dir` text NOT NULL,
	`chars` integer NOT NULL,
	`duration_sec` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_readings_level_idx` ON `content_readings` (`level`);