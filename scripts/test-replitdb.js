/**
 * Replit Database接続テスト
 */

// Replit Database URLを環境変数に設定してテスト
process.env.REPLIT_DB_URL = process.env.REPLIT_DB_URL || 'https://kv.replit.com/v0/eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjb25mYXIiLCJhdWQiOiJhbGwtcHJvamVjdHMiLCJleHAiOjE3NTUzNDQ0MTksImlhdCI6MTc0OTIzMjgxOSwidXNlcl9pZCI6NDgzMDY1OCwidXNlcl9oYW5kbGUiOiJzcGFjZW1vbnN0ZXIifQ.NjVBfQgXQA37qo4UQBbOwIpNFqxSEhItb9VrJaP6S6rGM_SJcMJOoBqKoIu_vFjPdKm6ZjdN8rnuqrCHpf3RrA';

async function testReplitDB() {
  console.log('🔍 Testing Replit Database connection...');
  
  const db = {
    async get(key) {
      try {
        const response = await fetch(`${process.env.REPLIT_DB_URL}/${encodeURIComponent(key)}`);
        if (!response.ok) return null;
        return await response.text();
      } catch (error) {
        console.error('Error getting key:', error.message);
        return null;
      }
    },
    async set(key, value) {
      try {
        await fetch(process.env.REPLIT_DB_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        });
        return true;
      } catch (error) {
        console.error('Error setting key:', error.message);
        return false;
      }
    },
    async list(prefix) {
      try {
        const url = prefix ? `${process.env.REPLIT_DB_URL}?prefix=${encodeURIComponent(prefix)}` : `${process.env.REPLIT_DB_URL}?prefix=`;
        const response = await fetch(url);
        const text = await response.text();
        return text.split('\n').filter(k => k.length > 0);
      } catch (error) {
        console.error('Error listing keys:', error.message);
        return [];
      }
    }
  };

  // Test basic operations
  console.log('Testing basic operations...');
  
  // Set test data
  const testKey = 'test:connection';
  const testValue = JSON.stringify({ message: 'Hello Replit DB', timestamp: new Date().toISOString() });
  
  const setResult = await db.set(testKey, testValue);
  console.log('Set operation:', setResult ? '✅ Success' : '❌ Failed');
  
  // Get test data
  const getValue = await db.get(testKey);
  console.log('Get operation:', getValue ? '✅ Success' : '❌ Failed');
  
  if (getValue) {
    console.log('Retrieved data:', JSON.parse(getValue));
  }
  
  // List keys
  const keys = await db.list('test:');
  console.log('List operation:', keys.length > 0 ? '✅ Success' : '❌ Failed');
  console.log('Found keys:', keys);
  
  // Test importing actual data
  console.log('\n📦 Testing backup data import...');
  
  const fs = await import('fs');
  const backupPath = '../backup-supabase-1749237202606.json';
  
  if (fs.existsSync(backupPath)) {
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log('Backup data loaded:', {
      users: backupData.users?.length || 0,
      weeks: backupData.weeks?.length || 0,
      topics: backupData.topics?.length || 0,
      comments: backupData.comments?.length || 0,
      stars: backupData.stars?.length || 0
    });
    
    // Import first user as test
    if (backupData.users && backupData.users[0]) {
      const user = backupData.users[0];
      await db.set(`user:${user.id}`, JSON.stringify(user));
      console.log('✅ Test user imported');
      
      // Verify import
      const importedUser = await db.get(`user:${user.id}`);
      console.log('User verification:', importedUser ? '✅ Success' : '❌ Failed');
    }
    
    // Import first topic as test
    if (backupData.topics && backupData.topics[0]) {
      const topic = backupData.topics[0];
      await db.set(`topic:${topic.id}`, JSON.stringify(topic));
      console.log('✅ Test topic imported');
      
      // Verify import
      const importedTopic = await db.get(`topic:${topic.id}`);
      console.log('Topic verification:', importedTopic ? '✅ Success' : '❌ Failed');
    }
    
  } else {
    console.log('❌ Backup file not found');
  }
  
  // List all keys to see what's in the database
  console.log('\n📋 Current database contents:');
  const allKeys = await db.list('');
  console.log(`Total keys: ${allKeys.length}`);
  
  if (allKeys.length > 0) {
    console.log('Sample keys:', allKeys.slice(0, 10));
  }
  
  console.log('\n🎉 Replit Database test completed');
}

testReplitDB().catch(console.error);