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
  console.log('🚀 Starting persistent database deployment...');

  // 開発DBの存在確認
  if (!fs.existsSync(DEV_DB_PATH)) {
    console.error('❌ Development database not found:', DEV_DB_PATH);
    console.error('Please run the application in development mode first to create the database');
    process.exit(1);
  }

  // 永続化ディレクトリの設定
  const persistentPaths = [
    '/tmp/persistent',
    '/home/runner/.local/share/app-data',
    './data'
  ];

  let persistentDir = null;
  for (const testPath of persistentPaths) {
    try {
      if (!fs.existsSync(testPath)) {
        fs.mkdirSync(testPath, { recursive: true });
      }
      // 書き込みテスト
      const testFile = path.join(testPath, 'test-write.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      persistentDir = testPath;
      console.log(`✅ Using persistent directory: ${persistentDir}`);
      break;
    } catch (error) {
      console.log(`❌ Path not available: ${testPath}`);
    }
  }

  if (!persistentDir) {
    console.error('❌ No persistent storage available, using fallback');
    persistentDir = './data';
  }

  const persistentProdPath = path.join(persistentDir, 'production.sqlite');
  const persistentBackupDir = path.join(persistentDir, 'backups');

  // バックアップディレクトリ作成
  if (!fs.existsSync(persistentBackupDir)) {
    fs.mkdirSync(persistentBackupDir, { recursive: true });
    console.log(`📁 Created persistent backup directory: ${persistentBackupDir}`);
  }

  // 既存の永続化DBがある場合はバックアップ
  let backupPath = null;
  if (fs.existsSync(persistentProdPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    backupPath = path.join(persistentBackupDir, `production-${timestamp}.sqlite`);
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(persistentProdPath, backupPath);
      console.log('📦 Created backup of existing persistent database:', backupPath);
    }
  }

  try {
    // 開発DBを永続化ディレクトリにコピー
    console.log('📋 Copying development database to persistent storage...');
    fs.copyFileSync(DEV_DB_PATH, persistentProdPath);

    // ファイルサイズとデータの整合性確認
    const devStats = fs.statSync(DEV_DB_PATH);
    const prodStats = fs.statSync(persistentProdPath);

    console.log(`📊 Database sizes:`);
    console.log(`  Development: ${devStats.size} bytes`);
    console.log(`  Persistent:  ${prodStats.size} bytes`);

    if (devStats.size === prodStats.size) {
      console.log('✅ Persistent database deployment completed successfully');
      console.log('📍 Persistent database path:', persistentProdPath);
      
      // 環境変数の設定指示
      console.log('\n📝 Environment setup for persistence:');
      console.log(`REPLIT_DB_URL="${persistentProdPath}"`);
      console.log('REPLIT_DEPLOYMENT=true');
      
    } else {
      throw new Error('Database size mismatch after copy');
    }

  } catch (error) {
    console.error('❌ Persistent database deployment failed:', error.message);
    
    // エラー時の復元処理
    if (backupPath && fs.existsSync(backupPath)) {
      console.log('🔄 Restoring from backup...');
      fs.copyFileSync(backupPath, persistentProdPath);
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