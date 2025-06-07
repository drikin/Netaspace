#!/usr/bin/env node

import Database from 'better-sqlite3';
import fs from 'fs';

// Create database directory
const dbPath = './database/dev.sqlite';
const dir = dbPath.substring(0, dbPath.lastIndexOf('/'));
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Create SQLite database and tables
const db = new Database(dbPath);

// Create tables with the correct schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0 NOT NULL,
    email TEXT UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS weeks (
    id INTEGER PRIMARY KEY,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    title TEXT NOT NULL,
    is_active INTEGER DEFAULT 0 NOT NULL
  );

  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY,
    week_id INTEGER,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    submitter TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    stars INTEGER DEFAULT 0 NOT NULL,
    featured_at TEXT,
    FOREIGN KEY (week_id) REFERENCES weeks(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY,
    topic_id INTEGER NOT NULL,
    commenter TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (topic_id) REFERENCES topics(id)
  );

  CREATE TABLE IF NOT EXISTS stars (
    id INTEGER PRIMARY KEY,
    topic_id INTEGER NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (topic_id) REFERENCES topics(id)
  );

  CREATE INDEX IF NOT EXISTS topics_week_id_idx ON topics(week_id);
  CREATE INDEX IF NOT EXISTS topics_status_idx ON topics(status);
  CREATE INDEX IF NOT EXISTS stars_topic_fingerprint_idx ON stars(topic_id, fingerprint);
`);

console.log('SQLite database and tables created successfully');
db.close();