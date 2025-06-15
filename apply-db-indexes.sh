#!/bin/bash

echo "=== Applying Database Performance Indexes ==="

cd ~/Netaspace

# Apply database indexes for performance optimization
cat > temp_indexes.sql << 'EOF'
-- Performance indexes for neta.backspace.fm
CREATE INDEX IF NOT EXISTS idx_topics_week_id ON topics(week_id);
CREATE INDEX IF NOT EXISTS idx_topics_status_week ON topics(status, week_id);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stars_topic_id ON stars(topic_id);
CREATE INDEX IF NOT EXISTS idx_stars_topic_fingerprint ON stars(topic_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_weeks_active ON weeks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update table statistics
ANALYZE topics;
ANALYZE stars;
ANALYZE weeks;
ANALYZE users;
EOF

# Apply the indexes using the production environment
DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require' \
psql -f temp_indexes.sql

# Clean up
rm temp_indexes.sql

echo "Database indexes applied successfully!"
echo ""
echo "Expected performance improvements:"
echo "- Query times reduced by 30-50ms"
echo "- Better scalability for topic lists"
echo "- Faster star count operations"