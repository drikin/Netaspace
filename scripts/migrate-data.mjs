#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as sqliteDrizzle } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import fs from 'fs';

// Initialize connections
const supabaseUrl = process.env.DATABASE_URL;
if (!supabaseUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sqlitePath = './database/dev.sqlite';

// Create database directory
const dir = sqlitePath.substring(0, sqlitePath.lastIndexOf('/'));
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

async function migrateData() {
  console.log('Starting data migration from Supabase to SQLite...');
  
  // Connect to Supabase
  const pgSql = postgres(supabaseUrl);
  
  // Connect to SQLite
  const sqlite = new Database(sqlitePath);
  
  try {
    // Export data from Supabase using raw SQL
    console.log('Exporting data from Supabase...');
    
    const users = await pgSql`SELECT * FROM users ORDER BY id`;
    const weeks = await pgSql`SELECT * FROM weeks ORDER BY id`;
    const topics = await pgSql`SELECT * FROM topics ORDER BY id`;
    const comments = await pgSql`SELECT * FROM comments ORDER BY id`;
    const stars = await pgSql`SELECT * FROM stars ORDER BY id`;
    
    console.log(`Found: ${users.length} users, ${weeks.length} weeks, ${topics.length} topics, ${comments.length} comments, ${stars.length} stars`);
    
    // Create backup
    const backupData = { users, weeks, topics, comments, stars };
    const backupPath = `./backup-supabase-${Date.now()}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`Backup created: ${backupPath}`);
    
    // Import to SQLite
    console.log('Importing data to SQLite...');
    
    // Users
    const insertUser = sqlite.prepare(`
      INSERT OR REPLACE INTO users (id, username, password, is_admin, email, created_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const user of users) {
      insertUser.run(
        user.id,
        user.username,
        user.password || 'defaultpass',
        user.is_admin ? 1 : 0,
        user.email,
        new Date().toISOString()
      );
    }
    
    // Weeks
    const insertWeek = sqlite.prepare(`
      INSERT OR REPLACE INTO weeks (id, start_date, end_date, title, is_active) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const week of weeks) {
      insertWeek.run(
        week.id,
        week.start_date?.toISOString() || new Date().toISOString(),
        week.end_date?.toISOString() || new Date().toISOString(),
        week.title || `Week ${week.id}`,
        week.is_active ? 1 : 0
      );
    }
    
    // Topics
    const insertTopic = sqlite.prepare(`
      INSERT OR REPLACE INTO topics (id, week_id, title, url, description, submitter, fingerprint, status, stars, featured_at, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const topic of topics) {
      insertTopic.run(
        topic.id,
        topic.week_id,
        topic.title,
        topic.url,
        topic.description,
        topic.submitter,
        topic.fingerprint || 'migrated',
        topic.status || 'pending',
        topic.stars || 0,
        topic.featured_at?.toISOString() || null,
        topic.created_at?.toISOString() || new Date().toISOString()
      );
    }
    
    // Comments
    const insertComment = sqlite.prepare(`
      INSERT OR REPLACE INTO comments (id, topic_id, commenter, fingerprint, content, created_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const comment of comments) {
      insertComment.run(
        comment.id,
        comment.topic_id,
        comment.name || 'Anonymous',
        comment.fingerprint || 'migrated',
        comment.content,
        comment.created_at?.toISOString() || new Date().toISOString()
      );
    }
    
    // Stars
    const insertStar = sqlite.prepare(`
      INSERT OR REPLACE INTO stars (id, topic_id, fingerprint, created_at) 
      VALUES (?, ?, ?, ?)
    `);
    
    for (const star of stars) {
      insertStar.run(
        star.id,
        star.topic_id,
        star.fingerprint,
        star.created_at?.toISOString() || new Date().toISOString()
      );
    }
    
    // Verify migration
    const sqliteUsers = sqlite.prepare('SELECT COUNT(*) as count FROM users').get();
    const sqliteWeeks = sqlite.prepare('SELECT COUNT(*) as count FROM weeks').get();
    const sqliteTopics = sqlite.prepare('SELECT COUNT(*) as count FROM topics').get();
    const sqliteComments = sqlite.prepare('SELECT COUNT(*) as count FROM comments').get();
    const sqliteStars = sqlite.prepare('SELECT COUNT(*) as count FROM stars').get();
    
    console.log('\nMigration verification:');
    console.log(`Users: ${users.length} → ${sqliteUsers.count}`);
    console.log(`Weeks: ${weeks.length} → ${sqliteWeeks.count}`);
    console.log(`Topics: ${topics.length} → ${sqliteTopics.count}`);
    console.log(`Comments: ${comments.length} → ${sqliteComments.count}`);
    console.log(`Stars: ${stars.length} → ${sqliteStars.count}`);
    
    const success = 
      users.length === sqliteUsers.count &&
      weeks.length === sqliteWeeks.count &&
      topics.length === sqliteTopics.count &&
      comments.length === sqliteComments.count &&
      stars.length === sqliteStars.count;
    
    if (success) {
      console.log('\n✅ Migration completed successfully!');
      console.log(`SQLite database: ${sqlitePath}`);
      console.log(`Backup: ${backupPath}`);
      
      console.log('\nNext step: Update server/storage.ts to use SQLite');
      return true;
    } else {
      throw new Error('Migration verification failed - record counts do not match');
    }
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await pgSql.end();
    sqlite.close();
  }
}

migrateData().catch(console.error);