#!/usr/bin/env node

import { execSync } from 'child_process';

/**
 * 統合デプロイメントスクリプト
 * データベース準備から検証まで一括実行
 */

function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 Starting Production Deployment Process');
  console.log('=========================================');
  
  const steps = [
    {
      command: 'node scripts/deploy-production.js',
      description: 'Preparing production database'
    },
    {
      command: 'node scripts/verify-deployment.js', 
      description: 'Verifying deployment integrity'
    }
  ];
  
  for (const step of steps) {
    const success = runCommand(step.command, step.description);
    if (!success) {
      console.error('❌ Deployment failed. Please check the errors above.');
      process.exit(1);
    }
  }
  
  console.log('\n🎉 Deployment preparation completed successfully!');
  console.log('📋 Next steps:');
  console.log('   1. Click the "Deploy" button in Replit');
  console.log('   2. Your app will use the production database automatically');
  console.log('   3. All development data is now available in production');
}

main();