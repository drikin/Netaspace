-- 桜環境用データベース初期化スクリプト

-- セッションテーブル作成（Replit認証用）
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- ユーザーテーブル作成（Replit認証用）
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY,
    email VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    is_admin BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 週テーブル作成
CREATE TABLE IF NOT EXISTS weeks (
    id SERIAL PRIMARY KEY,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    title TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false NOT NULL
);

-- トピックテーブル作成
CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    week_id INTEGER REFERENCES weeks(id),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    submitter TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    stars INTEGER DEFAULT 0 NOT NULL,
    featured_at TIMESTAMP
);

-- スターテーブル作成
CREATE TABLE IF NOT EXISTS stars (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS topics_week_id_idx ON topics(week_id);
CREATE INDEX IF NOT EXISTS topics_status_idx ON topics(status);
CREATE INDEX IF NOT EXISTS topics_created_at_idx ON topics(created_at);
CREATE INDEX IF NOT EXISTS topics_week_status_idx ON topics(week_id, status);
CREATE INDEX IF NOT EXISTS topics_featured_at_idx ON topics(featured_at);
CREATE INDEX IF NOT EXISTS stars_topic_id_idx ON stars(topic_id);
CREATE INDEX IF NOT EXISTS stars_fingerprint_idx ON stars(fingerprint);
CREATE INDEX IF NOT EXISTS stars_topic_fingerprint_idx ON stars(topic_id, fingerprint);

-- 初期週データの挿入
INSERT INTO weeks (title, start_date, end_date, is_active) 
VALUES ('第1週', '2025-01-06', '2025-01-12', true)
ON CONFLICT DO NOTHING;