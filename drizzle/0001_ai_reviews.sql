CREATE TABLE `ai_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`task` text NOT NULL,
	`content_hash` text NOT NULL,
	`report` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_reviews_user_created` ON `ai_reviews` (`user`, `created`);
--> statement-breakpoint
CREATE INDEX `idx_ai_reviews_cache` ON `ai_reviews` (`user`, `task`, `content_hash`);
