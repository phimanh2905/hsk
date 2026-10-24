CREATE TABLE `review_logs` (
	`user_id` text NOT NULL,
	`item_key` text NOT NULL,
	`card_type` text NOT NULL,
	`rating` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`reviewed_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `item_key`, `reviewed_at`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `srs_cards` ADD `ease` real DEFAULT 2.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `srs_cards` ADD `interval_days` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `srs_cards` ADD `lapses` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Wave 5 data backfill: map status Leitner cũ → SM-2 (learned/known → review).
-- new/learning giữ nguyên; ease/lapses dùng DEFAULT (2.5/0).
-- learned cũ có chu kỳ 7 ngày; known (≥6 lần ôn) xem như mature 21 ngày.
UPDATE `srs_cards` SET `status` = 'review', `interval_days` = 21 WHERE `status` IN ('learned', 'known') AND `review_count` >= 6;
--> statement-breakpoint
UPDATE `srs_cards` SET `status` = 'review', `interval_days` = 7 WHERE `status` IN ('learned', 'known');
