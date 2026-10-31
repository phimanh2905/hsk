CREATE TABLE `roadmap_gates` (
	`user_id` text NOT NULL,
	`gate_id` text NOT NULL,
	`pct` integer NOT NULL,
	`at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `gate_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
