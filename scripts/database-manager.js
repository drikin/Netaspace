#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 統合データベース管理システム
 * SQLite移行、バックアップ、マイグレーションを一元管理
 */

class DatabaseManager {
  constructor() {
    this.isProduction = process.env.REPLIT_DEPLOYMENT === 'true';
    this.productionDbPath = '/var/data/production.sqlite';
    this.devDbPath = './database/dev.sqlite';
    this.backupDir = '/var/data/backups';
  }

  getDatabasePath() {
    return this.isProduction ? this.productionDbPath : this.devDbPath;
  }

  // ディレクトリ構造の確保
  ensureDirectories() {
    const dbPath = this.getDatabasePath();
    const dbDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`Created database directory: ${dbDir}`);
    }

    if (this.isProduction && !fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  // バックアップ作成
  createBackup() {
    if (!this.isProduction) {
      console.log('Development environment - skipping backup');
      return null;
    }

    const dbPath = this.getDatabasePath();
    
    if (!fs.existsSync(dbPath)) {
      console.log('No existing database found - skipping backup');
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup-${timestamp}.sqlite`);
    
    try {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`Database backed up to: ${backupPath}`);
      this.cleanupOldBackups();
      return backupPath;
    } catch (error) {
      console.error('Backup failed:', error.message);
      throw error;
    }
  }

  // 古いバックアップの削除
  cleanupOldBackups() {
    if (!fs.existsSync(this.backupDir)) return;

    try {
      const backups = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('backup-') && file.endsWith('.sqlite'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          time: fs.statSync(path.join(this.backupDir, file)).mtime
        }))
        .sort((a, b) => b.time - a.time);

      if (backups.length > 5) {
        const toDelete = backups.slice(5);
        toDelete.forEach(backup => {
          fs.unlinkSync(backup.path);
          console.log(`Removed old backup: ${backup.name}`);
        });
      }
    } catch (error) {
      console.warn('Backup cleanup failed:', error.message);
    }
  }

  // マイグレーション実行
  runMigration() {
    console.log('Running database migration...');
    
    try {
      // SQLite用の設定ファイルを使用
      execSync('npx drizzle-kit push --config=drizzle.sqlite.config.ts', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('Migration completed successfully');
      return true;
    } catch (error) {
      console.error('Migration failed:', error.message);
      throw error;
    }
  }

  // バックアップからの復元
  restoreFromBackup(backupPath) {
    if (!backupPath || !fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    const dbPath = this.getDatabasePath();
    
    try {
      fs.copyFileSync(backupPath, dbPath);
      console.log(`Database restored from: ${backupPath}`);
    } catch (error) {
      console.error('Restore failed:', error.message);
      throw error;
    }
  }

  // 完全なデプロイメント処理
  executeDeployment() {
    console.log('Starting automated database deployment...');
    console.log(`Environment: ${this.isProduction ? 'Production' : 'Development'}`);
    
    let backupPath = null;

    try {
      // 1. ディレクトリ確保
      this.ensureDirectories();

      // 2. バックアップ作成（本番のみ）
      backupPath = this.createBackup();

      // 3. マイグレーション実行
      this.runMigration();

      console.log('Database deployment completed successfully');
      
    } catch (error) {
      console.error('Deployment failed:', error.message);
      
      // 失敗時の復元処理
      if (backupPath && this.isProduction) {
        console.log('Attempting to restore from backup...');
        try {
          this.restoreFromBackup(backupPath);
          console.log('Database restored successfully');
        } catch (restoreError) {
          console.error('Restore also failed:', restoreError.message);
        }
      }
      
      throw error;
    }
  }

  // データベース接続テスト
  testConnection() {
    const dbPath = this.getDatabasePath();
    console.log(`Testing database connection: ${dbPath}`);
    
    // 簡単な接続テスト
    if (fs.existsSync(dbPath)) {
      console.log('Database file exists');
      return true;
    } else {
      console.log('Database file not found - will be created during migration');
      return false;
    }
  }
}

// CLI実行
function main() {
  const dbManager = new DatabaseManager();
  
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'deploy':
        dbManager.executeDeployment();
        break;
      case 'backup':
        dbManager.createBackup();
        break;
      case 'migrate':
        dbManager.ensureDirectories();
        dbManager.runMigration();
        break;
      case 'test':
        dbManager.testConnection();
        break;
      default:
        // デフォルトはフル deployment
        dbManager.executeDeployment();
    }
  } catch (error) {
    console.error('Operation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseManager;