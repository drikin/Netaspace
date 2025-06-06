#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * デプロイメント用データベース設定スクリプト
 * 開発環境のSQLiteデータベースを本番環境に確実に移行
 */

const DEV_DB_PATH = './database/dev.sqlite';
const PROD_DB_PATH = './data/production.sqlite';

function ensureProductionDirectory() {
  const prodDir = path.dirname(PROD_DB_PATH);
  if (!fs.existsSync(prodDir)) {
    fs.mkdirSync(prodDir, { recursive: true });
    console.log('Created production directory:', prodDir);
  }
}

function initializeProductionDatabase() {
  ensureProductionDirectory();

  // 本番DBが既に存在する場合は何もしない（データ保護）
  if (fs.existsSync(PROD_DB_PATH)) {
    console.log('✅ Production database already exists, preserving existing data');
    console.log('📍 Production DB path:', PROD_DB_PATH);
    return;
  }

  // 本番DBが存在しない場合のみ、開発DBからコピー（初回デプロイのみ）
  if (!fs.existsSync(DEV_DB_PATH)) {
    console.error('Development database not found:', DEV_DB_PATH);
    process.exit(1);
  }

  // 初回デプロイ時のみコピー
  fs.copyFileSync(DEV_DB_PATH, PROD_DB_PATH);
  console.log('🚀 Initial deployment: Copied development database to production');
  console.log('📍 Production DB initialized at:', PROD_DB_PATH);

  // ファイルサイズ確認
  const devStats = fs.statSync(DEV_DB_PATH);
  const prodStats = fs.statSync(PROD_DB_PATH);
  
  console.log(`Database sizes - Dev: ${devStats.size} bytes, Prod: ${prodStats.size} bytes`);
  
  if (devStats.size === prodStats.size) {
    console.log('✅ Production database initialization completed successfully');
  } else {
    console.error('❌ Database initialization verification failed');
    process.exit(1);
  }
}

function updateEnvironmentConfig() {
  // package.jsonにデプロイ前スクリプトを追加
  const packageJsonPath = './package.json';
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  
  // デプロイ前の準備スクリプト
  packageJson.scripts['predeploy'] = 'node scripts/deploy-database.js';
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Updated package.json with predeploy script');
}

function main() {
  console.log('🚀 Preparing database for deployment...');
  
  try {
    initializeProductionDatabase();
    updateEnvironmentConfig();
    
    console.log('✅ Database deployment preparation completed');
    console.log('📝 Production data will be preserved on subsequent deployments');
    
  } catch (error) {
    console.error('❌ Deployment preparation failed:', error.message);
    process.exit(1);
  }
}

main();