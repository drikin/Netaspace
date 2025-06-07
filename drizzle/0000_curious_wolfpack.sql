CREATE TABLE `comments` (
	`id` integer PRIMARY KEY NOT NULL,
	`topic_id` integer NOT NULL,
	`commenter` text NOT NULL,
	`fingerprint` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `comments_topic_id_idx` ON `comments` (`topic_id`);--> statement-breakpoint
CREATE INDEX `comments_created_at_idx` ON `comments` (`created_at`);--> statement-breakpoint
CREATE TABLE `stars` (
	`id` integer PRIMARY KEY NOT NULL,
	`topic_id` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stars_topic_id_idx` ON `stars` (`topic_id`);--> statement-breakpoint
CREATE INDEX `stars_fingerprint_idx` ON `stars` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `stars_topic_fingerprint_idx` ON `stars` (`topic_id`,`fingerprint`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` integer PRIMARY KEY NOT NULL,
	`week_id` integer,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`description` text,
	`submitter` text NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`stars` integer DEFAULT 0 NOT NULL,
	`featured_at` text,
	FOREIGN KEY (`week_id`) REFERENCES `weeks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `topics_week_id_idx` ON `topics` (`week_id`);--> statement-breakpoint
CREATE INDEX `topics_status_idx` ON `topics` (`status`);--> statement-breakpoint
CREATE INDEX `topics_created_at_idx` ON `topics` (`created_at`);--> statement-breakpoint
CREATE INDEX `topics_week_status_idx` ON `topics` (`week_id`,`status`);--> statement-breakpoint
CREATE INDEX `topics_featured_at_idx` ON `topics` (`featured_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`email` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `weeks` (
	`id` integer PRIMARY KEY NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`title` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL
);
