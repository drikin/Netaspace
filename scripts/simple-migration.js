#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as sqliteDrizzle } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// 簡単なスキーマ定義（直接定義してimport問題を回避）
import { pgTable, serial, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { sqliteTable, integer as sqliteInteger, text as sqliteText } from 'drizzle-orm/sqlite-core';

// PostgreSQL tables
const pgUsers = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const pgWeeks = pgTable("weeks", {
  id: serial("id").primaryKey(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const pgTopics = pgTable("topics", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  submitter: text("submitter").notNull(),
  fingerprint: text("fingerprint").notNull(),
  status: text("status").default("pending").notNull(),
  weekId: integer("week_id").notNull(),
  stars: integer("stars").default(0).notNull(),
  featuredAt: timestamp("featured_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const pgComments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  commenter: text("commenter").notNull(),
  fingerprint: text("fingerprint").notNull(),
  topicId: integer("topic_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const pgStars = pgTable("stars", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull(),
  fingerprint: text("fingerprint").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// SQLite tables
const sqliteUsers = sqliteTable("users", {
  id: sqliteInteger("id").primaryKey(),
  username: sqliteText("username").notNull().unique(),
  createdAt: sqliteText("created_at").notNull(),
});

const sqliteWeeks = sqliteTable("weeks", {
  id: sqliteInteger("id").primaryKey(),
  startDate: sqliteText("start_date").notNull(),
  endDate: sqliteText("end_date").notNull(),
  isActive: sqliteInteger("is_active", { mode: 'boolean' }).default(false).notNull(),
  createdAt: sqliteText("created_at").notNull(),
});

const sqliteTopics = sqliteTable("topics", {
  id: sqliteInteger("id").primaryKey(),
  title: sqliteText("title").notNull(),
  url: sqliteText("url").notNull(),
  description: sqliteText("description"),
  submitter: sqliteText("submitter").notNull(),
  fingerprint: sqliteText("fingerprint").notNull(),
  status: sqliteText("status").default("pending").notNull(),
  weekId: sqliteInteger("week_id").notNull(),
  stars: sqliteInteger("stars").default(0).notNull(),
  featuredAt: sqliteText("featured_at"),
  createdAt: sqliteText("created_at").notNull(),
});

const sqliteComments = sqliteTable("comments", {
  id: sqliteInteger("id").primaryKey(),
  content: sqliteText("content").notNull(),
  commenter: sqliteText("commenter").notNull(),
  fingerprint: sqliteText("fingerprint").notNull(),
  topicId: sqliteInteger("topic_id").notNull(),
  createdAt: sqliteText("created_at").notNull(),
});

const sqliteStars = sqliteTable("stars", {
  id: sqliteInteger("id").primaryKey(),
  topicId: sqliteInteger("topic_id").notNull(),
  fingerprint: sqliteText("fingerprint").notNull(),
  createdAt: sqliteText("created_at").notNull(),
});

class SimpleMigrator {
  constructor() {
    this.supabaseUrl = process.env.DATABASE_URL;
    this.sqlitePath = './database/dev.sqlite';
    
    if (!this.supabaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
  }

  initSupabase() {
    const sql = postgres(this.supabaseUrl);
    return drizzle(sql);
  }

  initSQLite() {
    const dir = path.dirname(this.sqlitePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const sqlite = new Database(this.sqlitePath);
    return sqliteDrizzle(sqlite);
  }

  async exportData() {
    const db = this.initSupabase();
    console.log('Exporting from Supabase...');

    const data = {
      users: await db.select().from(pgUsers),
      weeks: await db.select().from(pgWeeks),
      topics: await db.select().from(pgTopics),
      comments: await db.select().from(pgComments),
      stars: await db.select().from(pgStars),
    };

    console.log(`Found: ${data.users.length} users, ${data.weeks.length} weeks, ${data.topics.length} topics, ${data.comments.length} comments, ${data.stars.length} stars`);
    
    // JSONバックアップ作成
    const backupPath = `./backup-supabase-${Date.now()}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    console.log(`Backup created: ${backupPath}`);
    
    return data;
  }

  async createSQLiteSchema() {
    console.log('Creating SQLite schema...');
    execSync('npx drizzle-kit push --config=drizzle.sqlite.config.ts', { stdio: 'inherit' });
  }

  async importData(data) {
    const db = this.initSQLite();
    console.log('Importing to SQLite...');

    // データを変換してインポート
    for (const user of data.users) {
      await db.insert(sqliteUsers).values({
        id: user.id,
        username: user.username,
        createdAt: user.createdAt.toISOString()
      });
    }

    for (const week of data.weeks) {
      await db.insert(sqliteWeeks).values({
        id: week.id,
        startDate: week.startDate.toISOString(),
        endDate: week.endDate.toISOString(),
        isActive: week.isActive,
        createdAt: week.createdAt.toISOString()
      });
    }

    for (const topic of data.topics) {
      await db.insert(sqliteTopics).values({
        id: topic.id,
        title: topic.title,
        url: topic.url,
        description: topic.description,
        submitter: topic.submitter,
        fingerprint: topic.fingerprint,
        status: topic.status,
        weekId: topic.weekId,
        stars: topic.stars,
        featuredAt: topic.featuredAt?.toISOString() || null,
        createdAt: topic.createdAt.toISOString()
      });
    }

    for (const comment of data.comments) {
      await db.insert(sqliteComments).values({
        id: comment.id,
        content: comment.content,
        commenter: comment.commenter,
        fingerprint: comment.fingerprint,
        topicId: comment.topicId,
        createdAt: comment.createdAt.toISOString()
      });
    }

    for (const star of data.stars) {
      await db.insert(sqliteStars).values({
        id: star.id,
        topicId: star.topicId,
        fingerprint: star.fingerprint,
        createdAt: star.createdAt.toISOString()
      });
    }

    console.log('Import completed');
  }

  async verify(originalData) {
    const db = this.initSQLite();
    console.log('Verifying migration...');

    const counts = {
      users: (await db.select().from(sqliteUsers)).length,
      weeks: (await db.select().from(sqliteWeeks)).length,
      topics: (await db.select().from(sqliteTopics)).length,
      comments: (await db.select().from(sqliteComments)).length,
      stars: (await db.select().from(sqliteStars)).length,
    };

    console.log('Migration verification:');
    console.log(`Users: ${originalData.users.length} → ${counts.users}`);
    console.log(`Weeks: ${originalData.weeks.length} → ${counts.weeks}`);
    console.log(`Topics: ${originalData.topics.length} → ${counts.topics}`);
    console.log(`Comments: ${originalData.comments.length} → ${counts.comments}`);
    console.log(`Stars: ${originalData.stars.length} → ${counts.stars}`);

    const success = 
      originalData.users.length === counts.users &&
      originalData.weeks.length === counts.weeks &&
      originalData.topics.length === counts.topics &&
      originalData.comments.length === counts.comments &&
      originalData.stars.length === counts.stars;

    return success;
  }

  async migrate() {
    try {
      console.log('Starting Supabase to SQLite migration...');
      
      const data = await this.exportData();
      await this.createSQLiteSchema();
      await this.importData(data);
      const verified = await this.verify(data);
      
      if (verified) {
        console.log('\nMigration completed successfully!');
        console.log(`SQLite database: ${this.sqlitePath}`);
        return true;
      } else {
        throw new Error('Migration verification failed');
      }
    } catch (error) {
      console.error('Migration failed:', error.message);
      throw error;
    }
  }
}

const migrator = new SimpleMigrator();
migrator.migrate().catch(console.error);