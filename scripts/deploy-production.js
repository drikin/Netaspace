#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * 本番環境デプロイメント用スクリプト
 * 開発環境のSQLiteデータベースを本番環境に確実にコピー
 */

const DEV_DB_PATH = './database/dev.sqlite';
const PROD_DB_PATH = './data/production.sqlite';
const BACKUP_DIR = './data/backups';

function ensureDirectories() {
  // 本番データディレクトリを作成
  const prodDir = path.dirname(PROD_DB_PATH);
  if (!fs.existsSync(prodDir)) {
    fs.mkdirSync(prodDir, { recursive: true });
    console.log('Created production directory:', prodDir);
  }

  // バックアップディレクトリを作成
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('Created backup directory:', BACKUP_DIR);
  }
}

function createBackup() {
  if (fs.existsSync(PROD_DB_PATH)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupPath = path.join(BACKUP_DIR, `production-${timestamp}.sqlite`);
    fs.copyFileSync(PROD_DB_PATH, backupPath);
    console.log('📦 Created backup of existing production database:', backupPath);
    return backupPath;
  }
  return null;
}

function deployDatabase() {
  console.log('🚀 Starting database deployment...');

  // 開発DBの存在確認
  if (!fs.existsSync(DEV_DB_PATH)) {
    console.error('❌ Development database not found:', DEV_DB_PATH);
    console.error('Please run the application in development mode first to create the database');
    process.exit(1);
  }

  ensureDirectories();
  const backupPath = createBackup();

  try {
    // 開発DBを本番環境にコピー
    console.log('📋 Copying development database to production...');
    fs.copyFileSync(DEV_DB_PATH, PROD_DB_PATH);

    // ファイルサイズとデータの整合性確認
    const devStats = fs.statSync(DEV_DB_PATH);
    const prodStats = fs.statSync(PROD_DB_PATH);

    console.log(`📊 Database sizes:`);
    console.log(`  Development: ${devStats.size} bytes`);
    console.log(`  Production:  ${prodStats.size} bytes`);

    if (devStats.size === prodStats.size) {
      console.log('✅ Database deployment completed successfully');
      console.log('📍 Production database path:', PROD_DB_PATH);
      
      // 環境変数の設定指示
      console.log('\n📝 Environment setup:');
      console.log(`REPLIT_DB_URL="${PROD_DB_PATH}"`);
      console.log('REPLIT_DEPLOYMENT=true');
      
    } else {
      throw new Error('Database size mismatch after copy');
    }

  } catch (error) {
    console.error('❌ Database deployment failed:', error.message);
    
    // エラー時の復元処理
    if (backupPath && fs.existsSync(backupPath)) {
      console.log('🔄 Restoring from backup...');
      fs.copyFileSync(backupPath, PROD_DB_PATH);
      console.log('✅ Restored from backup');
    }
    
    process.exit(1);
  }
}

function main() {
  console.log('🏭 Production Database Deployment');
  console.log('================================');
  
  deployDatabase();
  
  console.log('\n🎉 Database deployment completed!');
  console.log('📌 Next steps:');
  console.log('   1. Verify the production database contains your data');
  console.log('   2. Deploy your application');
  console.log('   3. The app will automatically use the production database');
}

main();