-- Performance optimization indexes for neta.backspace.fm
CREATE INDEX IF NOT EXISTS idx_topics_week_id ON topics(week_id);
CREATE INDEX IF NOT EXISTS idx_stars_topic_id ON stars(topic_id);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topics_status_week ON topics(status, week_id);
CREATE INDEX IF NOT EXISTS idx_stars_topic_fingerprint ON stars(topic_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_weeks_active ON weeks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

ANALYZE topics;
ANALYZE stars;
ANALYZE weeks;
ANALYZE users;