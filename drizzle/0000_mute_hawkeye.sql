CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`correct` integer NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_attempts_user` ON `attempts` (`user`);--> statement-breakpoint
CREATE TABLE `classrooms` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classrooms_code_unique` ON `classrooms` (`code`);--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`task` text NOT NULL,
	`content` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`classroom` text NOT NULL,
	`user` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_members_user` ON `members` (`user`);--> statement-breakpoint
CREATE TABLE `resources` (
	`id` text PRIMARY KEY NOT NULL,
	`classroom` text NOT NULL,
	`title` text NOT NULL,
	`genre` text NOT NULL,
	`category` text NOT NULL,
	`industry` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`name` text NOT NULL,
	`task` text NOT NULL,
	`content` text NOT NULL,
	`report` text NOT NULL,
	`status` text NOT NULL,
	`scores` text,
	`comment` text,
	`created` text NOT NULL,
	`reviewed` text
);
--> statement-breakpoint
CREATE INDEX `idx_submissions_user` ON `submissions` (`user`);--> statement-breakpoint
CREATE INDEX `idx_submissions_task` ON `submissions` (`task`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`classroom` text NOT NULL,
	`title` text NOT NULL,
	`genre` text NOT NULL,
	`background` text NOT NULL,
	`requirements` text NOT NULL,
	`deadline` text NOT NULL,
	`rubric` text NOT NULL,
	`level` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_classroom` ON `tasks` (`classroom`);