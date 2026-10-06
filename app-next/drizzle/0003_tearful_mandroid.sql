CREATE TABLE `content_vocabs` (
	`book` text NOT NULL,
	`page_id` text NOT NULL,
	`ord` integer NOT NULL,
	`title` text NOT NULL,
	`words` text NOT NULL,
	PRIMARY KEY(`book`, `page_id`)
);
