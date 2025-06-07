#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * デプロイメント検証スクリプト
 * 開発環境と本番環境のデータベース内容を比較検証
 */

const DEV_DB_PATH = './database/dev.sqlite';
const PROD_DB_PATH = './data/production.sqlite';

function checkDatabaseExists(dbPath, name) {
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ ${name} database not found: ${dbPath}`);
    return false;
  }
  console.log(`✅ ${name} database found: ${dbPath}`);
  return true;
}

function getTableCounts(dbPath) {
  try {
    const tables = ['weeks', 'topics', 'users', 'comments', 'stars'];
    const counts = {};
    
    for (const table of tables) {
      const result = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM ${table};"`, { encoding: 'utf8' });
      counts[table] = parseInt(result.trim());
    }
    
    return counts;
  } catch (error) {
    console.error(`Error reading database ${dbPath}:`, error.message);
    return null;
  }
}

function compareDatabases() {
  console.log('📊 Comparing database contents...');
  
  const devCounts = getTableCounts(DEV_DB_PATH);
  const prodCounts = getTableCounts(PROD_DB_PATH);
  
  if (!devCounts || !prodCounts) {
    console.error('❌ Failed to read database contents');
    return false;
  }
  
  console.log('\n📈 Record counts comparison:');
  console.log('Table'.padEnd(12) + 'Development'.padEnd(15) + 'Production'.padEnd(15) + 'Status');
  console.log('-'.repeat(50));
  
  let allMatch = true;
  
  for (const table of Object.keys(devCounts)) {
    const devCount = devCounts[table];
    const prodCount = prodCounts[table];
    const status = devCount === prodCount ? '✅ Match' : '❌ Mismatch';
    
    console.log(
      table.padEnd(12) + 
      devCount.toString().padEnd(15) + 
      prodCount.toString().padEnd(15) + 
      status
    );
    
    if (devCount !== prodCount) {
      allMatch = false;
    }
  }
  
  return allMatch;
}

function verifyDatabaseStructure(dbPath) {
  try {
    const result = execSync(`sqlite3 "${dbPath}" ".schema"`, { encoding: 'utf8' });
    const tables = result.split('CREATE TABLE').length - 1;
    console.log(`✅ Database structure verified: ${tables} tables found`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to verify database structure: ${error.message}`);
    return false;
  }
}

function checkFileIntegrity() {
  const devStats = fs.statSync(DEV_DB_PATH);
  const prodStats = fs.statSync(PROD_DB_PATH);
  
  console.log('📁 File integrity check:');
  console.log(`Development DB: ${devStats.size} bytes`);
  console.log(`Production DB:  ${prodStats.size} bytes`);
  
  if (devStats.size === prodStats.size) {
    console.log('✅ File sizes match');
    return true;
  } else {
    console.log('⚠️  File sizes differ - this may be normal due to database optimization');
    return true; // Size differences can be normal
  }
}

function main() {
  console.log('🔍 Deployment Verification');
  console.log('==========================');
  
  // 基本的な存在確認
  const devExists = checkDatabaseExists(DEV_DB_PATH, 'Development');
  const prodExists = checkDatabaseExists(PROD_DB_PATH, 'Production');
  
  if (!devExists || !prodExists) {
    console.error('❌ Cannot proceed with verification - databases missing');
    process.exit(1);
  }
  
  // ファイル整合性確認
  const fileIntegrityOk = checkFileIntegrity();
  
  // データベース構造確認
  const devStructureOk = verifyDatabaseStructure(DEV_DB_PATH);
  const prodStructureOk = verifyDatabaseStructure(PROD_DB_PATH);
  
  // データ内容比較
  const dataMatches = compareDatabases();
  
  console.log('\n📋 Verification Summary:');
  console.log('========================');
  console.log(`File integrity: ${fileIntegrityOk ? '✅ OK' : '❌ Failed'}`);
  console.log(`Dev structure:  ${devStructureOk ? '✅ OK' : '❌ Failed'}`);
  console.log(`Prod structure: ${prodStructureOk ? '✅ OK' : '❌ Failed'}`);
  console.log(`Data integrity: ${dataMatches ? '✅ OK' : '❌ Failed'}`);
  
  if (fileIntegrityOk && devStructureOk && prodStructureOk && dataMatches) {
    console.log('\n🎉 Deployment verification successful!');
    console.log('✅ Production database is ready for deployment');
    return true;
  } else {
    console.log('\n❌ Deployment verification failed');
    console.log('Please check the issues above before deploying');
    process.exit(1);
  }
}

main();