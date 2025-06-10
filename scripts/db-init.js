#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

/**
 * データベース初期化スクリプト
 * 本番環境での初回セットアップとマイグレーション実行
 */

const PRODUCTION_DB_PATH = '/var/data/production.sqlite';
const DEV_DB_PATH = './database/dev.sqlite';

function getDatabasePath() {
  return process.env.REPLIT_DEPLOYMENT ? PRODUCTION_DB_PATH : DEV_DB_PATH;
}

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('Created directory:', dir);
  }
}

function initializeDatabase() {
  const dbPath = getDatabasePath();
  
  console.log('Initializing database at:', dbPath);
  
  // ディレクトリ確保
  ensureDirectoryExists(dbPath);
  
  // データベース接続テスト
  try {
    const db = new Database(dbPath);
    
    // 基本的な接続テスト
    const result = db.prepare('SELECT 1 as test').get();
    if (result.test === 1) {
      console.log('Database connection successful');
    }
    
    db.close();
    
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    return false;
  }
}

function main() {
  const isProduction = process.env.REPLIT_DEPLOYMENT;
  console.log('Environment:', isProduction ? 'Production' : 'Development');
  
  const success = initializeDatabase();
  
  if (success) {
    console.log('Database initialization completed successfully');
  } else {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { initializeDatabase, getDatabasePath };