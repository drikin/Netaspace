#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * SQLite環境への移行とデータベース設定
 */

const PRODUCTION_DB_PATH = '/var/data/production.sqlite';
const DEV_DB_PATH = './database/dev.sqlite';

// 環境に応じたデータベースパスの取得
function getDatabasePath() {
  if (process.env.REPLIT_DEPLOYMENT) {
    return PRODUCTION_DB_PATH;
  }
  return DEV_DB_PATH;
}

// SQLite用のDATABASE_URLの生成
function generateSQLiteDatabaseURL() {
  const dbPath = getDatabasePath();
  return `sqlite:${dbPath}`;
}

// 環境変数の設定確認
function checkEnvironment() {
  const isProduction = process.env.REPLIT_DEPLOYMENT;
  const dbPath = getDatabasePath();
  const dbUrl = generateSQLiteDatabaseURL();
  
  console.log('Environment Check:');
  console.log('- Mode:', isProduction ? 'Production' : 'Development');
  console.log('- Database Path:', dbPath);
  console.log('- Database URL:', dbUrl);
  
  return { isProduction, dbPath, dbUrl };
}

// ディレクトリの確保
function ensureDirectories() {
  const { dbPath, isProduction } = checkEnvironment();
  const dir = path.dirname(dbPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('Created directory:', dir);
  }
  
  // 本番環境の場合、バックアップディレクトリも作成
  if (isProduction) {
    const backupDir = '/var/data/backups';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('Created backup directory:', backupDir);
    }
  }
}

// 開発環境のデータベース初期化
function initDevDatabase() {
  const dbPath = DEV_DB_PATH;
  const dir = path.dirname(dbPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  console.log('Development database path prepared:', dbPath);
}

function main() {
  console.log('Setting up SQLite database configuration...');
  
  const env = checkEnvironment();
  ensureDirectories();
  
  if (!env.isProduction) {
    initDevDatabase();
  }
  
  console.log('SQLite migration setup completed');
  console.log('Next steps:');
  console.log('1. Update drizzle.config.ts to use SQLite');
  console.log('2. Update server/storage.ts to use SQLite path');
  console.log('3. Run npm run db:push to apply schema');
}

if (require.main === module) {
  main();
}

module.exports = { 
  getDatabasePath, 
  generateSQLiteDatabaseURL, 
  checkEnvironment, 
  ensureDirectories 
};