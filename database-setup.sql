-- Database setup for neta.backspace.fm
-- Run this on your Neon PostgreSQL database

-- Create the main tables if they don't exist
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

CREATE TABLE IF NOT EXISTS "sessions" (
	"sid" varchar NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL,
	CONSTRAINT "session_pkey" PRIMARY KEY("sid")
);

CREATE TABLE IF NOT EXISTS "weeks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"url" varchar(1000),
	"description" text,
	"submitter" varchar(255),
	"week_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"fingerprint" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "stars" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"fingerprint" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stars_topic_id_fingerprint_unique" UNIQUE("topic_id","fingerprint")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_sessions_expire" ON "sessions" ("expire");
CREATE INDEX IF NOT EXISTS "idx_weeks_is_active" ON "weeks" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_topics_week_id" ON "topics" ("week_id");
CREATE INDEX IF NOT EXISTS "idx_topics_status" ON "topics" ("status");
CREATE INDEX IF NOT EXISTS "idx_topics_fingerprint" ON "topics" ("fingerprint");
CREATE INDEX IF NOT EXISTS "idx_stars_topic_id" ON "stars" ("topic_id");
CREATE INDEX IF NOT EXISTS "idx_stars_fingerprint" ON "stars" ("fingerprint");

-- Add foreign key constraints
DO $$ BEGIN
    ALTER TABLE "topics" ADD CONSTRAINT "topics_week_id_weeks_id_fk" 
    FOREIGN KEY ("week_id") REFERENCES "weeks"("id") ON DELETE cascade;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "stars" ADD CONSTRAINT "stars_topic_id_topics_id_fk" 
    FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE cascade;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Insert default admin user if not exists
INSERT INTO "users" ("username", "password")
SELECT 'admin', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE "username" = 'admin');

-- Insert initial week if no weeks exist
INSERT INTO "weeks" ("title", "start_date", "end_date", "is_active")
SELECT '2025年6月第2週', '2025-06-10', '2025-06-16', true
WHERE NOT EXISTS (SELECT 1 FROM "weeks");

-- Grant necessary permissions (adjust as needed for your Neon setup)
-- These commands may need to be run separately depending on your database permissions