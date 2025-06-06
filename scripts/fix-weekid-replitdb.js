/**
 * Fix weekId values in Replit Database
 */

process.env.REPLIT_DB_URL = process.env.REPLIT_DB_URL || 'https://kv.replit.com/v0/eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjb25mYXIiLCJhdWQiOiJhbGwtcHJvamVjdHMiLCJleHAiOjE3NTUzNDQ0MTksImlhdCI6MTc0OTIzMjgxOSwidXNlcl9pZCI6NDgzMDY1OCwidXNlcl9oYW5kbGUiOiJzcGFjZW1vbnN0ZXIifQ.NjVBfQgXQA37qo4UQBbOwIpNFqxSEhItb9VrJaP6S6rGM_SJcMJOoBqKoIu_vFjPdKm6ZjdN8rnuqrCHpf3RrA';

async function fixWeekIds() {
  console.log('🔧 Fixing weekId values in topics...');
  
  const db = {
    async get(key) {
      try {
        const response = await fetch(`${process.env.REPLIT_DB_URL}/${encodeURIComponent(key)}`);
        if (!response.ok) return null;
        return await response.text();
      } catch {
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
      } catch {
        return false;
      }
    },
    async list(prefix) {
      try {
        const url = prefix ? `${process.env.REPLIT_DB_URL}?prefix=${encodeURIComponent(prefix)}` : `${process.env.REPLIT_DB_URL}?prefix=`;
        const response = await fetch(url);
        const text = await response.text();
        return text.split('\n').filter(k => k.length > 0);
      } catch {
        return [];
      }
    }
  };

  // Load original backup data to get correct weekId values
  const fs = await import('fs');
  const backupPath = '../backup-supabase-1749237202606.json';
  
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found');
    return;
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log(`📦 Found ${backupData.topics?.length || 0} topics in backup`);

  // Create mapping of topic ID to weekId from backup
  const topicWeekMapping = new Map();
  if (backupData.topics) {
    for (const topic of backupData.topics) {
      topicWeekMapping.set(topic.id, topic.weekId);
    }
  }

  // Get all topics from database and fix their weekId
  const topicKeys = await db.list('topic:');
  console.log(`🔍 Found ${topicKeys.length} topics in database`);
  
  let fixed = 0;
  let errors = 0;

  for (const key of topicKeys) {
    try {
      const data = await db.get(key);
      if (data) {
        const topic = JSON.parse(data);
        const originalWeekId = topicWeekMapping.get(topic.id);
        
        if (originalWeekId !== undefined && originalWeekId !== topic.weekId) {
          // Update the topic with correct weekId
          topic.weekId = originalWeekId;
          await db.set(key, JSON.stringify(topic));
          fixed++;
          
          if (fixed <= 5) {
            console.log(`✅ Fixed topic ${topic.id}: weekId ${topic.weekId || 'undefined'} → ${originalWeekId}`);
          } else if (fixed === 6) {
            console.log('... (continuing to fix remaining topics)');
          }
        }
      }
    } catch (error) {
      console.error(`Error fixing topic ${key}:`, error.message);
      errors++;
    }
  }

  // Fix week isActive flags
  console.log('\n📅 Fixing week isActive flags...');
  await db.set('week:1', JSON.stringify({
    id: 1,
    startDate: '2025-05-31T00:00:00.000Z',
    endDate: '2025-06-07T00:00:00.000Z',
    title: '今週のトピック',
    isActive: false
  }));

  await db.set('week:2', JSON.stringify({
    id: 2,
    startDate: '2025-05-31T00:00:00.000Z',
    endDate: '2025-06-07T00:00:00.000Z',
    title: 'ep607',
    isActive: true
  }));

  console.log('✅ Week flags updated');

  // Verify fixes
  console.log('\n🔍 Verifying fixes...');
  const week2Topics = [];
  for (const key of topicKeys.slice(0, 10)) {
    const data = await db.get(key);
    if (data) {
      const topic = JSON.parse(data);
      if (topic.weekId === 2) {
        week2Topics.push(topic);
      }
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`✅ Fixed ${fixed} topics`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📝 Sample topics for week 2: ${week2Topics.length}`);
  
  if (week2Topics.length > 0) {
    console.log('Sample week 2 topics:');
    week2Topics.slice(0, 3).forEach(topic => {
      console.log(`  - ${topic.title?.substring(0, 50)}... (ID: ${topic.id}, Status: ${topic.status})`);
    });
  }

  console.log('\n🎉 Database repair completed!');
}

fixWeekIds().catch(console.error);