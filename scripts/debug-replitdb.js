/**
 * Replit Database Debug Script
 */

process.env.REPLIT_DB_URL = process.env.REPLIT_DB_URL || 'https://kv.replit.com/v0/eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjb25mYXIiLCJhdWQiOiJhbGwtcHJvamVjdHMiLCJleHAiOjE3NTUzNDQ0MTksImlhdCI6MTc0OTIzMjgxOSwidXNlcl9pZCI6NDgzMDY1OCwidXNlcl9oYW5kbGUiOiJzcGFjZW1vbnN0ZXIifQ.NjVBfQgXQA37qo4UQBbOwIpNFqxSEhItb9VrJaP6S6rGM_SJcMJOoBqKoIu_vFjPdKm6ZjdN8rnuqrCHpf3RrA';

async function debugDatabase() {
  console.log('🔍 Debugging Replit Database contents...');
  
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

  // Check active week
  console.log('\n📅 Active Week:');
  const activeWeekId = await db.get('active:week');
  console.log('Active week ID:', activeWeekId);
  
  if (activeWeekId) {
    const weekData = await db.get(`week:${activeWeekId}`);
    if (weekData) {
      const week = JSON.parse(weekData);
      console.log('Active week data:', week);
    }
  }

  // Check all weeks
  console.log('\n📅 All Weeks:');
  const weekKeys = await db.list('week:');
  console.log('Week keys found:', weekKeys);
  
  for (const key of weekKeys) {
    const data = await db.get(key);
    if (data) {
      const week = JSON.parse(data);
      console.log(`${key}:`, { id: week.id, title: week.title, isActive: week.isActive, weekId: week.weekId });
    }
  }

  // Check topic samples
  console.log('\n📝 Sample Topics:');
  const topicKeys = await db.list('topic:');
  console.log(`Total topics found: ${topicKeys.length}`);
  
  // Show first 5 topics
  for (let i = 0; i < Math.min(5, topicKeys.length); i++) {
    const key = topicKeys[i];
    const data = await db.get(key);
    if (data) {
      const topic = JSON.parse(data);
      console.log(`${key}:`, { 
        id: topic.id, 
        title: topic.title?.substring(0, 50) + '...', 
        weekId: topic.weekId, 
        status: topic.status 
      });
    }
  }

  // Check topics for week 2 specifically
  console.log('\n🔍 Topics for Week 2:');
  let week2Topics = 0;
  for (const key of topicKeys) {
    const data = await db.get(key);
    if (data) {
      const topic = JSON.parse(data);
      if (topic.weekId === 2) {
        week2Topics++;
        if (week2Topics <= 3) {
          console.log(`Found topic for week 2:`, { 
            id: topic.id, 
            title: topic.title?.substring(0, 40) + '...', 
            weekId: topic.weekId,
            status: topic.status
          });
        }
      }
    }
  }
  console.log(`Total topics for week 2: ${week2Topics}`);

  // Check counters
  console.log('\n🔢 Counters:');
  const counters = ['users:counter', 'weeks:counter', 'topics:counter', 'comments:counter', 'stars:counter'];
  for (const counter of counters) {
    const value = await db.get(counter);
    console.log(`${counter}: ${value}`);
  }

  // Check comments and stars
  console.log('\n💬 Comments:');
  const commentKeys = await db.list('comment:');
  console.log(`Total comments: ${commentKeys.length}`);
  
  console.log('\n⭐ Stars:');
  const starKeys = await db.list('star:');
  console.log(`Total stars: ${starKeys.length}`);
}

debugDatabase().catch(console.error);