PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_content_shadowing_subtitles` (
	`video_id` text NOT NULL,
	`chunk` integer DEFAULT 0 NOT NULL,
	`sentences` text NOT NULL,
	PRIMARY KEY(`video_id`, `chunk`)
);
--> statement-breakpoint
INSERT INTO `__new_content_shadowing_subtitles`("video_id", "chunk", "sentences") SELECT "video_id", 0 AS "chunk", "sentences" FROM `content_shadowing_subtitles`;--> statement-breakpoint
DROP TABLE `content_shadowing_subtitles`;--> statement-breakpoint
ALTER TABLE `__new_content_shadowing_subtitles` RENAME TO `content_shadowing_subtitles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;