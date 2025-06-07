#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as sqliteDrizzle } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import { execSync } from 'child_process';

// スキーマのインポート
import { users, weeks, topics, comments, stars } from '../shared/schema.js';

/**
 * SupabaseからSQLiteへのデータ完全移行スクリプト
 */

class DataMigrator {
  constructor() {
    this.supabaseUrl = process.env.DATABASE_URL;
    this.sqlitePath = process.env.REPLIT_DEPLOYMENT ? '/var/data/production.sqlite' : './database/dev.sqlite';
    
    if (!this.supabaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
  }

  // Supabase接続の初期化
  initSupabaseConnection() {
    console.log('Connecting to Supabase...');
    const sql = postgres(this.supabaseUrl);
    return drizzle(sql);
  }

  // SQLite接続の初期化
  initSQLiteConnection() {
    console.log(`Initializing SQLite at: ${this.sqlitePath}`);
    
    // ディレクトリ作成
    const dir = path.dirname(this.sqlitePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const sqlite = new Database(this.sqlitePath);
    return sqliteDrizzle(sqlite);
  }

  // 全テーブルのデータをエクスポート
  async exportFromSupabase() {
    const supabaseDb = this.initSupabaseConnection();
    
    console.log('Exporting data from Supabase...');
    
    const data = {};

    try {
      // Users
      console.log('- Exporting users...');
      data.users = await supabaseDb.select().from(users);
      console.log(`  Found ${data.users.length} users`);

      // Weeks
      console.log('- Exporting weeks...');
      data.weeks = await supabaseDb.select().from(weeks);
      console.log(`  Found ${data.weeks.length} weeks`);

      // Topics
      console.log('- Exporting topics...');
      data.topics = await supabaseDb.select().from(topics);
      console.log(`  Found ${data.topics.length} topics`);

      // Comments
      console.log('- Exporting comments...');
      data.comments = await supabaseDb.select().from(comments);
      console.log(`  Found ${data.comments.length} comments`);

      // Stars
      console.log('- Exporting stars...');
      data.stars = await supabaseDb.select().from(stars);
      console.log(`  Found ${data.stars.length} stars`);

      return data;

    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  // SQLiteにデータをインポート
  async importToSQLite(data) {
    const sqliteDb = this.initSQLiteConnection();
    
    console.log('Importing data to SQLite...');

    try {
      // トランザクションで一括処理
      const transaction = sqliteDb.transaction(() => {
        
        // 1. Users
        if (data.users.length > 0) {
          console.log('- Importing users...');
          for (const user of data.users) {
            sqliteDb.insert(users).values(user).run();
          }
        }

        // 2. Weeks
        if (data.weeks.length > 0) {
          console.log('- Importing weeks...');
          for (const week of data.weeks) {
            sqliteDb.insert(weeks).values(week).run();
          }
        }

        // 3. Topics
        if (data.topics.length > 0) {
          console.log('- Importing topics...');
          for (const topic of data.topics) {
            sqliteDb.insert(topics).values(topic).run();
          }
        }

        // 4. Comments
        if (data.comments.length > 0) {
          console.log('- Importing comments...');
          for (const comment of data.comments) {
            sqliteDb.insert(comments).values(comment).run();
          }
        }

        // 5. Stars
        if (data.stars.length > 0) {
          console.log('- Importing stars...');
          for (const star of data.stars) {
            sqliteDb.insert(stars).values(star).run();
          }
        }

      });

      transaction();
      console.log('Import completed successfully');

    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  // データの検証
  async verifyMigration(originalData) {
    const sqliteDb = this.initSQLiteConnection();
    
    console.log('Verifying migration...');

    const verification = {};

    try {
      verification.users = await sqliteDb.select().from(users);
      verification.weeks = await sqliteDb.select().from(weeks);
      verification.topics = await sqliteDb.select().from(topics);
      verification.comments = await sqliteDb.select().from(comments);
      verification.stars = await sqliteDb.select().from(stars);

      // 件数チェック
      const checks = [
        { table: 'users', original: originalData.users.length, migrated: verification.users.length },
        { table: 'weeks', original: originalData.weeks.length, migrated: verification.weeks.length },
        { table: 'topics', original: originalData.topics.length, migrated: verification.topics.length },
        { table: 'comments', original: originalData.comments.length, migrated: verification.comments.length },
        { table: 'stars', original: originalData.stars.length, migrated: verification.stars.length }
      ];

      console.log('\nMigration Verification:');
      let allMatched = true;
      
      checks.forEach(check => {
        const status = check.original === check.migrated ? '✅' : '❌';
        console.log(`${status} ${check.table}: ${check.original} → ${check.migrated}`);
        if (check.original !== check.migrated) allMatched = false;
      });

      if (allMatched) {
        console.log('\n🎉 Migration verified successfully!');
        return true;
      } else {
        console.log('\n⚠️  Migration verification failed - record counts do not match');
        return false;
      }

    } catch (error) {
      console.error('Verification failed:', error);
      return false;
    }
  }

  // バックアップファイルの作成
  createDataBackup(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./backup-supabase-${timestamp}.json`;
    
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    console.log(`Data backup created: ${backupPath}`);
    return backupPath;
  }

  // 完全な移行プロセス
  async executeMigration() {
    console.log('🚀 Starting complete Supabase to SQLite migration...\n');

    try {
      // 1. データエクスポート
      const data = await this.exportFromSupabase();
      
      // 2. バックアップ作成
      const backupPath = this.createDataBackup(data);

      // 3. SQLiteスキーマ作成（マイグレーション）
      console.log('\n🔄 Running SQLite schema migration...');
      execSync('npx drizzle-kit push --config=drizzle.sqlite.config.ts', { stdio: 'inherit' });

      // 4. データインポート
      await this.importToSQLite(data);

      // 5. 検証
      const verified = await this.verifyMigration(data);

      if (verified) {
        console.log('\n✅ Migration completed successfully!');
        console.log(`📁 Data backup: ${backupPath}`);
        console.log(`🗄️  SQLite database: ${this.sqlitePath}`);
        
        console.log('\nNext steps:');
        console.log('1. Update server/storage.ts to use SQLite configuration');
        console.log('2. Test the application thoroughly');
        console.log('3. Deploy to production when ready');
        
        return true;
      } else {
        throw new Error('Migration verification failed');
      }

    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      throw error;
    }
  }
}

// CLI実行
async function main() {
  const command = process.argv[2];
  const migrator = new DataMigrator();

  try {
    switch (command) {
      case 'export':
        const data = await migrator.exportFromSupabase();
        migrator.createDataBackup(data);
        break;
      case 'import':
        // バックアップファイルから読み込み
        const backupFile = process.argv[3];
        if (!backupFile || !fs.existsSync(backupFile)) {
          throw new Error('Backup file required: node migrate-from-supabase.js import backup.json');
        }
        const importData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        await migrator.importToSQLite(importData);
        break;
      default:
        // フル移行
        await migrator.executeMigration();
    }
  } catch (error) {
    console.error('Operation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DataMigrator;