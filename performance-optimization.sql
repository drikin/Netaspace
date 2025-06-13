-- Database Performance Optimization for neta.backspace.fm
-- Add indexes to improve query performance

-- Index for topics by week (most common query)
CREATE INDEX IF NOT EXISTS idx_topics_week_id ON topics(week_id);

-- Index for topics by status and week (admin queries)
CREATE INDEX IF NOT EXISTS idx_topics_status_week ON topics(status, week_id);

-- Index for topics by creation date (for ordering)
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at DESC);

-- Composite index for stars by topic_id (for star counts)
CREATE INDEX IF NOT EXISTS idx_stars_topic_id ON stars(topic_id);

-- Composite index for stars by topic and fingerprint (for hasStarred checks)
CREATE INDEX IF NOT EXISTS idx_stars_topic_fingerprint ON stars(topic_id, fingerprint);

-- Index for weeks by active status
CREATE INDEX IF NOT EXISTS idx_weeks_active ON weeks(is_active) WHERE is_active = true;

-- Index for users by username (login queries)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Analyze tables to update statistics
ANALYZE topics;
ANALYZE stars;
ANALYZE weeks;
ANALYZE users;