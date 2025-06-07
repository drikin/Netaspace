/**
 * デプロイ前自動バックアップ・デプロイ後リストアスクリプト
 * Replit Deploy時のデータ消失を完全に防ぐ
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { execSync } from 'child_process';

class DeploymentDataManager {
  constructor() {
    this.persistentPaths = [
      '/tmp/persistent',
      '/home/runner/workspace/data/persistent',
      './data/persistent'
    ];
    
    this.backupLocations = [
      '/tmp/persistent/backups',
      '/home/runner/workspace/data/backups', 
      './data/backups'
    ];
  }

  findOrCreatePersistentPath() {
    for (const dir of this.persistentPaths) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Test write permissions
        const testFile = path.join(dir, 'test.tmp');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        
        console.log(`✓ 永続化ディレクトリ確認: ${dir}`);
        return dir;
      } catch (error) {
        console.log(`✗ ${dir} 使用不可: ${error.message}`);
      }
    }
    throw new Error('永続化ディレクトリが見つかりません');
  }

  findOrCreateBackupPath() {
    for (const dir of this.backupLocations) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        console.log(`✓ バックアップディレクトリ確認: ${dir}`);
        return dir;
      } catch (error) {
        console.log(`✗ ${dir} 使用不可: ${error.message}`);
      }
    }
    throw new Error('バックアップディレクトリが見つかりません');
  }

  createPreDeployBackup() {
    console.log('=== デプロイ前バックアップ作成 ===');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = this.findOrCreateBackupPath();
    const backupFile = path.join(backupDir, `pre-deploy-${timestamp}.sqlite`);
    
    // 現在のデータベースを探す
    const dbCandidates = [
      '/tmp/persistent/production.sqlite',
      './database/dev.sqlite',
      './data/production.sqlite'
    ];
    
    let currentDb = null;
    for (const candidate of dbCandidates) {
      if (fs.existsSync(candidate)) {
        currentDb = candidate;
        break;
      }
    }
    
    if (!currentDb) {
      console.log('⚠️ バックアップ対象のデータベースが見つかりません');
      return null;
    }
    
    // バックアップ作成
    fs.copyFileSync(currentDb, backupFile);
    
    // データ確認
    const db = new Database(backupFile);
    const topicCount = db.prepare('SELECT COUNT(*) as count FROM topics').get();
    const latestTopic = db.prepare('SELECT title, created_at FROM topics ORDER BY created_at DESC LIMIT 1').get();
    db.close();
    
    console.log(`✓ バックアップ作成完了: ${backupFile}`);
    console.log(`  トピック数: ${topicCount.count}`);
    console.log(`  最新トピック: ${latestTopic?.title || 'なし'}`);
    
    // バックアップ情報をファイルに保存
    const backupInfo = {
      timestamp,
      backupFile,
      sourceDb: currentDb,
      topicCount: topicCount.count,
      latestTopic: latestTopic
    };
    
    fs.writeFileSync(
      path.join(backupDir, 'latest-backup.json'),
      JSON.stringify(backupInfo, null, 2)
    );
    
    return backupInfo;
  }

  restoreFromLatestBackup() {
    console.log('=== 最新バックアップからリストア ===');
    
    const backupDir = this.findOrCreateBackupPath();
    const backupInfoFile = path.join(backupDir, 'latest-backup.json');
    
    if (!fs.existsSync(backupInfoFile)) {
      console.log('⚠️ バックアップ情報が見つかりません');
      return false;
    }
    
    const backupInfo = JSON.parse(fs.readFileSync(backupInfoFile, 'utf8'));
    
    if (!fs.existsSync(backupInfo.backupFile)) {
      console.log(`⚠️ バックアップファイルが見つかりません: ${backupInfo.backupFile}`);
      return false;
    }
    
    // 永続化パスにリストア
    const persistentDir = this.findOrCreatePersistentPath();
    const restoreTarget = path.join(persistentDir, 'production.sqlite');
    
    fs.copyFileSync(backupInfo.backupFile, restoreTarget);
    
    // リストア確認
    const db = new Database(restoreTarget);
    const restoredCount = db.prepare('SELECT COUNT(*) as count FROM topics').get();
    db.close();
    
    console.log(`✓ リストア完了: ${restoreTarget}`);
    console.log(`  リストアされたトピック数: ${restoredCount.count}`);
    console.log(`  バックアップ時トピック数: ${backupInfo.topicCount}`);
    
    return restoredCount.count === backupInfo.topicCount;
  }

  cleanupOldBackups() {
    console.log('=== 古いバックアップの清理 ===');
    
    const backupDir = this.findOrCreateBackupPath();
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sqlite'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        mtime: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    // 最新5つを保持
    const toDelete = files.slice(5);
    
    for (const file of toDelete) {
      try {
        fs.unlinkSync(file.path);
        console.log(`✓ 古いバックアップ削除: ${file.name}`);
      } catch (error) {
        console.log(`⚠️ 削除失敗: ${file.name} - ${error.message}`);
      }
    }
    
    console.log(`✓ バックアップ清理完了: ${files.length - toDelete.length}件保持`);
  }

  executePreDeployment() {
    console.log('🚀 デプロイ前処理開始');
    
    try {
      const backupInfo = this.createPreDeployBackup();
      if (backupInfo) {
        console.log('✅ デプロイ前バックアップ完了');
      }
      
      this.cleanupOldBackups();
      
      console.log('🎯 デプロイ準備完了');
      return true;
    } catch (error) {
      console.error(`❌ デプロイ前処理エラー: ${error.message}`);
      return false;
    }
  }

  executePostDeployment() {
    console.log('🔄 デプロイ後処理開始');
    
    try {
      // デプロイ後のデータベース状態確認
      const persistentDir = this.findOrCreatePersistentPath();
      const dbPath = path.join(persistentDir, 'production.sqlite');
      
      if (!fs.existsSync(dbPath)) {
        console.log('⚠️ デプロイ後にデータベースが見つかりません - リストア実行');
        if (this.restoreFromLatestBackup()) {
          console.log('✅ バックアップからリストア完了');
        } else {
          throw new Error('リストアに失敗しました');
        }
      } else {
        console.log('✓ デプロイ後もデータベースが保持されています');
      }
      
      console.log('🎉 デプロイ後処理完了');
      return true;
    } catch (error) {
      console.error(`❌ デプロイ後処理エラー: ${error.message}`);
      return false;
    }
  }
}

function main() {
  const manager = new DeploymentDataManager();
  const mode = process.argv[2] || 'pre-deploy';
  
  switch (mode) {
    case 'pre-deploy':
      process.exit(manager.executePreDeployment() ? 0 : 1);
      
    case 'post-deploy':
      process.exit(manager.executePostDeployment() ? 0 : 1);
      
    case 'restore':
      const success = manager.restoreFromLatestBackup();
      console.log(success ? '✅ リストア成功' : '❌ リストア失敗');
      process.exit(success ? 0 : 1);
      
    default:
      console.log('使用方法: node deploy-with-backup.js [pre-deploy|post-deploy|restore]');
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}