CREATE TABLE `content_shadowing_playlists` (
	`id` text PRIMARY KEY NOT NULL,
	`ord` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`total` integer NOT NULL,
	`desc` text NOT NULL,
	`channel` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_shadowing_subtitles` (
	`video_id` text PRIMARY KEY NOT NULL,
	`sentences` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_shadowing_videos` (
	`id` text PRIMARY KEY NOT NULL,
	`ord` integer NOT NULL,
	`title` text NOT NULL,
	`playlist_id` text NOT NULL,
	`hsk` text NOT NULL,
	`views` integer NOT NULL,
	`views_suffix` text NOT NULL,
	`duration` text NOT NULL,
	`dur_sec` integer NOT NULL,
	`plays` integer NOT NULL,
	`topic` text NOT NULL,
	`spd` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `csv_playlist_idx` ON `content_shadowing_videos` (`playlist_id`);