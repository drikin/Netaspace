/**
 * Replit永続化ストレージ設定スクリプト
 * Redeploy時のデータ消失を防ぐための設定
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

function findBestPersistentPath() {
  const candidates = [
    '/tmp/persistent',
    '/home/runner/persistent', 
    '/var/tmp/persistent',
    './data/persistent'
  ];
  
  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) {
        fs.mkdirSync(candidate, { recursive: true });
      }
      
      // Write test
      const testFile = path.join(candidate, 'test.txt');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      console.log(`✓ 永続化パス確認: ${candidate}`);
      return candidate;
    } catch (error) {
      console.log(`✗ パス使用不可: ${candidate} - ${error.message}`);
    }
  }
  
  throw new Error('利用可能な永続化パスが見つかりません');
}

function setupPersistentStorage() {
  console.log('=== Replit永続化ストレージ設定 ===');
  
  const persistentDir = findBestPersistentPath();
  const dbPath = path.join(persistentDir, 'production.sqlite');
  const backupDir = path.join(persistentDir, 'backups');
  
  // バックアップディレクトリ作成
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`✓ バックアップディレクトリ作成: ${backupDir}`);
  }
  
  // 現在のデータベースが存在する場合、永続化パスにコピー
  const currentDbPaths = [
    './database/dev.sqlite',
    './data/production.sqlite',
    '/tmp/production.sqlite'
  ];
  
  let sourceDb = null;
  for (const currentPath of currentDbPaths) {
    if (fs.existsSync(currentPath)) {
      sourceDb = currentPath;
      break;
    }
  }
  
  if (sourceDb && !fs.existsSync(dbPath)) {
    fs.copyFileSync(sourceDb, dbPath);
    console.log(`✓ データベースを永続化パスにコピー: ${sourceDb} → ${dbPath}`);
  }
  
  // データベース整合性確認
  try {
    const db = new Database(dbPath);
    const topicCount = db.prepare('SELECT COUNT(*) as count FROM topics').get();
    console.log(`✓ データベース確認: ${topicCount.count}件のトピック`);
    db.close();
  } catch (error) {
    console.error(`✗ データベース確認エラー: ${error.message}`);
    throw error;
  }
  
  return { dbPath, backupDir };
}

function verifyPersistence() {
  console.log('\n=== 永続化検証 ===');
  
  const persistentDir = findBestPersistentPath();
  const dbPath = path.join(persistentDir, 'production.sqlite');
  
  if (!fs.existsSync(dbPath)) {
    console.error('✗ 永続化データベースが見つかりません');
    return false;
  }
  
  try {
    const db = new Database(dbPath);
    const result = db.prepare('SELECT COUNT(*) as count FROM topics').get();
    db.close();
    
    console.log(`✓ 永続化確認完了: ${result.count}件のデータが保存されています`);
    return true;
  } catch (error) {
    console.error(`✗ 永続化検証エラー: ${error.message}`);
    return false;
  }
}

function main() {
  try {
    const { dbPath, backupDir } = setupPersistentStorage();
    
    // 環境変数更新スクリプト生成
    const envScript = `
# Replit永続化設定
export PERSISTENT_DB_PATH="${dbPath}"
export BACKUP_DIR="${backupDir}"
export NODE_ENV=production

echo "永続化データベース: $PERSISTENT_DB_PATH"
echo "バックアップディレクトリ: $BACKUP_DIR"
`;
    
    fs.writeFileSync('.env.persistent', envScript);
    console.log('✓ 永続化環境変数設定完了');
    
    if (verifyPersistence()) {
      console.log('\n✅ 永続化ストレージ設定完了');
      console.log(`データベース: ${dbPath}`);
      console.log(`バックアップ: ${backupDir}`);
    } else {
      throw new Error('永続化検証に失敗しました');
    }
    
  } catch (error) {
    console.error(`❌ 永続化設定エラー: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}