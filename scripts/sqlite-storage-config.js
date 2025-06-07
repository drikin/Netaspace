#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * SQLite用のストレージ設定を自動生成
 * server/storage.ts を SQLite 接続に切り替える
 */

const STORAGE_FILE_PATH = './server/storage.ts';

// SQLite用の設定コードを生成
function generateSQLiteStorageConfig() {
  return `
// SQLite用のストレージ設定（自動生成）
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

function getDatabasePath() {
  if (process.env.REPLIT_DEPLOYMENT) {
    return '/var/data/production.sqlite';
  }
  return './database/dev.sqlite';
}

// SQLite接続の初期化
const dbPath = getDatabasePath();
console.log('Using SQLite database:', dbPath);

// ディレクトリ作成
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

// メインエクスポート - SQLiteStorageを使用
export const storage: IStorage = new SQLiteStorage(db);
`;
}

// 既存のstorage.tsをバックアップ
function createBackup() {
  const backupPath = `${STORAGE_FILE_PATH}.backup-${Date.now()}`;
  if (fs.existsSync(STORAGE_FILE_PATH)) {
    fs.copyFileSync(STORAGE_FILE_PATH, backupPath);
    console.log(`Backup created: ${backupPath}`);
    return backupPath;
  }
  return null;
}

// SQLiteStorage クラスの実装を追加
function addSQLiteStorageClass() {
  const sqliteStorageCode = `
export class SQLiteStorage implements IStorage {
  db: ReturnType<typeof drizzle>;

  constructor(database: ReturnType<typeof drizzle>) {
    this.db = database;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db
      .insert(users)
      .values(user)
      .returning();
    return result[0];
  }

  // Week operations
  async getWeeks(): Promise<Week[]> {
    return this.db
      .select()
      .from(weeks)
      .orderBy(weeks.startDate);
  }

  async getActiveWeek(): Promise<Week | undefined> {
    const result = await this.db
      .select()
      .from(weeks)
      .where(eq(weeks.isActive, true))
      .limit(1);
    return result[0];
  }

  async createWeek(week: InsertWeek): Promise<Week> {
    const result = await this.db
      .insert(weeks)
      .values(week)
      .returning();
    return result[0];
  }

  async setActiveWeek(weekId: number): Promise<void> {
    // すべてのweekを非アクティブにしてから指定されたweekをアクティブに
    await this.db
      .update(weeks)
      .set({ isActive: false });
    
    await this.db
      .update(weeks)
      .set({ isActive: true })
      .where(eq(weeks.id, weekId));
  }

  // Topic operations with optimized queries
  async getTopicsByWeekId(weekId: number): Promise<TopicWithCommentsAndStars[]> {
    const weekTopics = await this.db
      .select()
      .from(topics)
      .where(eq(topics.weekId, weekId))
      .orderBy(desc(topics.stars), desc(topics.createdAt));

    return Promise.all(weekTopics.map(async topic => {
      const comments = await this.getCommentsByTopicId(topic.id);
      return {
        ...topic,
        comments,
        starsCount: topic.stars
      };
    }));
  }

  async getTopicsByStatus(status: string, weekId?: number): Promise<TopicWithCommentsAndStars[]> {
    let query = this.db
      .select()
      .from(topics)
      .where(eq(topics.status, status));

    if (weekId) {
      query = query.where(and(eq(topics.status, status), eq(topics.weekId, weekId)));
    }

    const filteredTopics = await query.orderBy(desc(topics.createdAt));

    return Promise.all(filteredTopics.map(async topic => {
      const comments = await this.getCommentsByTopicId(topic.id);
      return {
        ...topic,
        comments,
        starsCount: topic.stars
      };
    }));
  }

  async getTopic(id: number, fingerprint?: string): Promise<TopicWithCommentsAndStars | undefined> {
    const result = await this.db
      .select()
      .from(topics)
      .where(eq(topics.id, id))
      .limit(1);

    if (result.length === 0) return undefined;

    const topic = result[0];
    const comments = await this.getCommentsByTopicId(id);
    
    let hasStarred = false;
    if (fingerprint) {
      hasStarred = await this.hasStarred(id, fingerprint);
    }

    return {
      ...topic,
      comments,
      starsCount: topic.stars,
      hasStarred
    };
  }

  async getTopicByUrl(url: string): Promise<Topic | undefined> {
    const result = await this.db
      .select()
      .from(topics)
      .where(eq(topics.url, url))
      .limit(1);
    return result[0];
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const result = await this.db
      .insert(topics)
      .values(topic)
      .returning();
    return result[0];
  }

  async updateTopicStatus(id: number, status: string): Promise<Topic | undefined> {
    const result = await this.db
      .update(topics)
      .set({ 
        status,
        featuredAt: status === 'featured' ? new Date() : null
      })
      .where(eq(topics.id, id))
      .returning();
    return result[0];
  }

  async deleteTopic(id: number): Promise<boolean> {
    const result = await this.db
      .delete(topics)
      .where(eq(topics.id, id))
      .returning();
    return result.length > 0;
  }

  // Comment operations
  async getCommentsByTopicId(topicId: number): Promise<Comment[]> {
    return this.db
      .select()
      .from(comments)
      .where(eq(comments.topicId, topicId))
      .orderBy(comments.createdAt);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const result = await this.db
      .insert(comments)
      .values(comment)
      .returning();
    return result[0];
  }

  // Star operations
  async addStar(star: InsertStar): Promise<boolean> {
    const hasStarred = await this.hasStarred(star.topicId, star.fingerprint);
    if (hasStarred) return false;

    await this.db.insert(stars).values(star);
    
    // トピックのスター数を増加
    await this.db
      .update(topics)
      .set({ stars: sql\`\${topics.stars} + 1\` })
      .where(eq(topics.id, star.topicId));

    return true;
  }

  async removeStar(topicId: number, fingerprint: string): Promise<boolean> {
    const hasStarred = await this.hasStarred(topicId, fingerprint);
    if (!hasStarred) return false;

    await this.db
      .delete(stars)
      .where(and(
        eq(stars.topicId, topicId),
        eq(stars.fingerprint, fingerprint)
      ));

    // トピックのスター数を減少
    await this.db
      .update(topics)
      .set({ stars: sql\`MAX(0, \${topics.stars} - 1)\` })
      .where(eq(topics.id, topicId));

    return true;
  }

  async hasStarred(topicId: number, fingerprint: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(stars)
      .where(and(
        eq(stars.topicId, topicId),
        eq(stars.fingerprint, fingerprint)
      ))
      .limit(1);
    return result.length > 0;
  }

  async getStarsCountByTopicId(topicId: number): Promise<number> {
    const result = await this.db
      .select({ count: sql\`count(*)\` })
      .from(stars)
      .where(eq(stars.topicId, topicId));
    return Number(result[0].count);
  }

  // Combined operations
  async getWeekWithTopics(weekId: number, fingerprint?: string): Promise<WeekWithTopics | undefined> {
    const week = await this.db
      .select()
      .from(weeks)
      .where(eq(weeks.id, weekId))
      .limit(1);

    if (week.length === 0) return undefined;

    const weekTopics = await this.getTopicsByWeekId(weekId);
    
    // フィンガープリントがある場合、スター情報を一括取得
    if (fingerprint && weekTopics.length > 0) {
      const topicIds = weekTopics.map(t => t.id);
      const userStars = await this.db
        .select({ topicId: stars.topicId })
        .from(stars)
        .where(and(
          inArray(stars.topicId, topicIds),
          eq(stars.fingerprint, fingerprint)
        ));
      
      const starredTopicIds = new Set(userStars.map(s => s.topicId));
      weekTopics.forEach(topic => {
        topic.hasStarred = starredTopicIds.has(topic.id);
      });
    }

    return {
      ...week[0],
      topics: weekTopics
    };
  }

  async getActiveWeekWithTopics(fingerprint?: string): Promise<WeekWithTopics | undefined> {
    const activeWeek = await this.getActiveWeek();
    if (!activeWeek) return undefined;
    
    return this.getWeekWithTopics(activeWeek.id, fingerprint);
  }
}
`;

  return sqliteStorageCode;
}

// メイン設定関数
function configureSQLiteStorage() {
  console.log('Configuring SQLite storage...');
  
  // 既存ファイルをバックアップ
  createBackup();
  
  // 現在のstorage.tsを読み込み
  let content = fs.readFileSync(STORAGE_FILE_PATH, 'utf8');
  
  // 必要なインポートを追加
  const imports = `import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { sql, eq, and, desc, inArray } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
`;

  // PostgreSQLインポートを置換
  content = content.replace(
    /import { neon } from '@neondatabase\/serverless';[\s\S]*?import { drizzle } from 'drizzle-orm\/neon-http';/,
    imports
  );

  // SQLiteStorage クラスを追加
  const sqliteStorageClass = addSQLiteStorageClass();
  
  // PostgresStorageクラスの前に挿入
  content = content.replace(
    'export class PostgresStorage implements IStorage {',
    sqliteStorageClass + '\n\nexport class PostgresStorage implements IStorage {'
  );

  // storage エクスポートをSQLiteに変更
  const sqliteConfig = `
// SQLite用のストレージ設定
function getDatabasePath() {
  if (process.env.REPLIT_DEPLOYMENT) {
    return '/var/data/production.sqlite';
  }
  return './database/dev.sqlite';
}

// SQLite接続の初期化
const dbPath = getDatabasePath();
console.log('Using SQLite database:', dbPath);

// ディレクトリ作成
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

// メインエクスポート - SQLiteStorageを使用
export const storage: IStorage = new SQLiteStorage(db);
`;

  // 既存のstorageエクスポートを置換
  content = content.replace(
    /export const storage: IStorage = process\.env\.DATABASE_URL[\s\S]*?new MemStorage\(\);/,
    sqliteConfig
  );

  // ファイルに書き込み
  fs.writeFileSync(STORAGE_FILE_PATH, content);
  
  console.log('SQLite storage configuration completed');
  console.log('Storage file updated:', STORAGE_FILE_PATH);
}

function main() {
  try {
    configureSQLiteStorage();
    console.log('\n✅ SQLite storage configuration completed successfully');
    console.log('Next steps:');
    console.log('1. Run: node scripts/migrate-from-supabase.js');
    console.log('2. Test the application');
    console.log('3. Deploy when ready');
  } catch (error) {
    console.error('Configuration failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { configureSQLiteStorage };