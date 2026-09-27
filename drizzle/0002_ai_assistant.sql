CREATE TABLE `ai_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`task` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`actions` text,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_messages_user_task_created` ON `ai_messages` (`user`, `task`, `created`);
--> statement-breakpoint
CREATE TABLE `ai_rewrites` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`task` text NOT NULL,
	`original_text` text NOT NULL,
	`revised_text` text NOT NULL,
	`mode` text NOT NULL,
	`accepted` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_rewrites_user_created` ON `ai_rewrites` (`user`, `created`);
