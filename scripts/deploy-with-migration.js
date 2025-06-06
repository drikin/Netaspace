#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Replit Deploy用の自動マイグレーションスクリプト
 * デプロイ前にバックアップ作成、マイグレーション実行を自動化
 */

const PRODUCTION_DB_PATH = '/var/data/production.sqlite';
const BACKUP_DIR = '/var/data/backups';

// バックアップディレクトリ作成
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('📁 Created backup directory:', BACKUP_DIR);
  }
}

// 本番データベースのバックアップ作成
function createBackup() {
  if (!fs.existsSync(PRODUCTION_DB_PATH)) {
    console.log('⚠️  Production database not found, skipping backup');
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.sqlite`);
  
  try {
    fs.copyFileSync(PRODUCTION_DB_PATH, backupPath);
    console.log('✅ Database backup created:', backupPath);
    return backupPath;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

// 古いバックアップの削除（最新5個を保持）
function cleanupOldBackups() {
  try {
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sqlite'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime
      }))
      .sort((a, b) => b.time - a.time);

    if (backups.length > 5) {
      const toDelete = backups.slice(5);
      toDelete.forEach(backup => {
        fs.unlinkSync(backup.path);
        console.log('🗑️  Removed old backup:', backup.name);
      });
    }
  } catch (error) {
    console.log('⚠️  Cleanup failed:', error.message);
  }
}

// データベースマイグレーション実行
function runMigration() {
  try {
    console.log('🔄 Running database migration...');
    execSync('npm run db:push', { stdio: 'inherit' });
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// メイン実行関数
function main() {
  console.log('🚀 Starting automated deployment with migration...');
  
  // 本番環境でのみ実行
  if (!process.env.REPLIT_DEPLOYMENT) {
    console.log('📝 Development environment detected, skipping production tasks');
    return;
  }

  ensureBackupDir();
  const backupPath = createBackup();
  cleanupOldBackups();
  
  try {
    runMigration();
    console.log('🎉 Deployment preparation completed successfully');
  } catch (error) {
    // マイグレーション失敗時の復元処理
    if (backupPath && fs.existsSync(backupPath)) {
      console.log('🔄 Restoring from backup...');
      fs.copyFileSync(backupPath, PRODUCTION_DB_PATH);
      console.log('✅ Database restored from backup');
    }
    throw error;
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, createBackup, runMigration };