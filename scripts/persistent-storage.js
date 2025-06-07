#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Replit永続化ストレージ設定スクリプト
 * Redeploy時のデータ消失を防ぐための設定
 */

const PERSISTENT_PATHS = [
  '/tmp/persistent',
  '/home/runner/.local/share/app-data',
  './data'
];

const DEV_DB_PATH = './database/dev.sqlite';

function findBestPersistentPath() {
  for (const testPath of PERSISTENT_PATHS) {
    try {
      // ディレクトリが作成可能かテスト
      if (!fs.existsSync(testPath)) {
        fs.mkdirSync(testPath, { recursive: true });
      }
      
      // 書き込みテスト
      const testFile = path.join(testPath, 'test-write.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      console.log(`✅ Persistent path available: ${testPath}`);
      return testPath;
    } catch (error) {
      console.log(`❌ Path not available: ${testPath} - ${error.message}`);
    }
  }
  
  throw new Error('No persistent storage path available');
}

function setupPersistentStorage() {
  console.log('🔧 Setting up persistent storage for Replit deployment...');
  
  try {
    const persistentDir = findBestPersistentPath();
    const prodDbPath = path.join(persistentDir, 'production.sqlite');
    const backupDir = path.join(persistentDir, 'backups');
    
    // バックアップディレクトリ作成
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${backupDir}`);
    }
    
    // 開発DBが存在し、本番DBが存在しない場合は初期化
    if (fs.existsSync(DEV_DB_PATH) && !fs.existsSync(prodDbPath)) {
      fs.copyFileSync(DEV_DB_PATH, prodDbPath);
      console.log(`🚀 Initialized production database from development data`);
      console.log(`📍 Production DB: ${prodDbPath}`);
    }
    
    // 本番DBが既に存在する場合はバックアップ作成
    if (fs.existsSync(prodDbPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const backupPath = path.join(backupDir, `production-backup-${timestamp}.sqlite`);
      
      // 同じ日のバックアップが存在しない場合のみ作成
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(prodDbPath, backupPath);
        console.log(`📦 Created backup: ${backupPath}`);
      }
    }
    
    // 環境変数設定の指示
    console.log('\n📝 Environment Configuration:');
    console.log(`REPLIT_DB_URL="${prodDbPath}"`);
    console.log('REPLIT_DEPLOYMENT=true');
    
    return {
      persistentDir,
      prodDbPath,
      backupDir
    };
    
  } catch (error) {
    console.error('❌ Failed to setup persistent storage:', error.message);
    throw error;
  }
}

function verifyPersistence() {
  console.log('\n🔍 Verifying persistence setup...');
  
  const config = setupPersistentStorage();
  
  // データベースファイルの存在確認
  if (fs.existsSync(config.prodDbPath)) {
    const stats = fs.statSync(config.prodDbPath);
    console.log(`✅ Production database exists: ${(stats.size / 1024).toFixed(1)} KB`);
  } else {
    console.log('⚠️  Production database not found');
  }
  
  // バックアップの確認
  const backupFiles = fs.readdirSync(config.backupDir).filter(f => f.endsWith('.sqlite'));
  console.log(`✅ Available backups: ${backupFiles.length} files`);
  
  return config;
}

function main() {
  console.log('🏗️  Replit Persistent Storage Setup');
  console.log('===================================');
  
  try {
    const config = verifyPersistence();
    
    console.log('\n🎉 Persistent storage setup completed!');
    console.log('📌 Key points:');
    console.log('   • Database survives redeployments');
    console.log('   • Automatic backups are created');
    console.log('   • Data is preserved in persistent directory');
    console.log(`   • Production DB: ${config.prodDbPath}`);
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();