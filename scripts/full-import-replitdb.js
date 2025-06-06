/**
 * 完全データ移行 - backup-supabase-1749237202606.jsonからReplit DBへ
 */

// Use the same Replit DB URL from the test
process.env.REPLIT_DB_URL = process.env.REPLIT_DB_URL || 'https://kv.replit.com/v0/eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjb25mYXIiLCJhdWQiOiJhbGwtcHJvamVjdHMiLCJleHAiOjE3NTUzNDQ0MTksImlhdCI6MTc0OTIzMjgxOSwidXNlcl9pZCI6NDgzMDY1OCwidXNlcl9oYW5kbGUiOiJzcGFjZW1vbnN0ZXIifQ.NjVBfQgXQA37qo4UQBbOwIpNFqxSEhItb9VrJaP6S6rGM_SJcMJOoBqKoIu_vFjPdKm6ZjdN8rnuqrCHpf3RrA';

async function fullImport() {
  console.log('🚀 Starting full data import to Replit Database...');
  
  const db = {
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
    async list() {
      try {
        const response = await fetch(`${process.env.REPLIT_DB_URL}?prefix=`);
        const text = await response.text();
        return text.split('\n').filter(k => k.length > 0);
      } catch {
        return [];
      }
    }
  };

  // Load backup data
  const fs = await import('fs');
  const backupPath = '../backup-supabase-1749237202606.json';
  
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found');
    return;
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log('📦 Backup data loaded:', {
    users: backupData.users?.length || 0,
    weeks: backupData.weeks?.length || 0,
    topics: backupData.topics?.length || 0,
    comments: backupData.comments?.length || 0,
    stars: backupData.stars?.length || 0
  });

  let imported = 0;

  // Import Users
  if (backupData.users) {
    console.log('\n👤 Importing users...');
    for (const user of backupData.users) {
      await db.set(`user:${user.id}`, JSON.stringify({
        id: user.id,
        username: user.username,
        password: user.password,
        isAdmin: user.isAdmin || false,
        email: user.email
      }));
      imported++;
    }
    await db.set('users:counter', (Math.max(...backupData.users.map(u => u.id)) + 1).toString());
    console.log(`✅ ${backupData.users.length} users imported`);
  }

  // Import Weeks
  if (backupData.weeks) {
    console.log('\n📅 Importing weeks...');
    let activeWeekSet = false;
    for (const week of backupData.weeks) {
      await db.set(`week:${week.id}`, JSON.stringify({
        id: week.id,
        startDate: week.startDate,
        endDate: week.endDate,
        title: week.title,
        isActive: week.isActive || false
      }));
      
      if (week.isActive && !activeWeekSet) {
        await db.set('active:week', week.id.toString());
        activeWeekSet = true;
        console.log(`📌 Set active week: ${week.id} (${week.title})`);
      }
      imported++;
    }
    
    // If no active week found, set week 2 as active (ep607)
    if (!activeWeekSet && backupData.weeks.length > 1) {
      await db.set('active:week', '2');
      console.log('📌 Set week 2 as active (ep607)');
    }
    
    await db.set('weeks:counter', (Math.max(...backupData.weeks.map(w => w.id)) + 1).toString());
    console.log(`✅ ${backupData.weeks.length} weeks imported`);
  }

  // Import Topics
  if (backupData.topics) {
    console.log('\n📝 Importing topics...');
    for (const topic of backupData.topics) {
      await db.set(`topic:${topic.id}`, JSON.stringify({
        id: topic.id,
        title: topic.title,
        url: topic.url,
        description: topic.description,
        submitter: topic.submitter,
        status: topic.status || 'pending',
        weekId: topic.weekId,
        createdAt: topic.createdAt,
        stars: topic.stars || 0,
        featuredAt: topic.featuredAt
      }));
      imported++;
      
      if (imported % 20 === 0) {
        console.log(`  Progress: ${imported} items imported...`);
      }
    }
    await db.set('topics:counter', (Math.max(...backupData.topics.map(t => t.id)) + 1).toString());
    console.log(`✅ ${backupData.topics.length} topics imported`);
  }

  // Import Comments
  if (backupData.comments) {
    console.log('\n💬 Importing comments...');
    for (const comment of backupData.comments) {
      if (comment.topicId) {
        await db.set(`comment:topic:${comment.topicId}:${comment.id}`, JSON.stringify({
          id: comment.id,
          name: comment.name,
          content: comment.content,
          topicId: comment.topicId,
          createdAt: comment.createdAt
        }));
        imported++;
      }
    }
    await db.set('comments:counter', (Math.max(...backupData.comments.map(c => c.id)) + 1).toString());
    console.log(`✅ ${backupData.comments.length} comments imported`);
  }

  // Import Stars
  if (backupData.stars) {
    console.log('\n⭐ Importing stars...');
    for (const star of backupData.stars) {
      if (star.topicId && star.fingerprint) {
        await db.set(`star:topic:${star.topicId}:${star.fingerprint}`, JSON.stringify({
          id: star.id,
          topicId: star.topicId,
          fingerprint: star.fingerprint,
          createdAt: star.createdAt
        }));
        imported++;
      }
    }
    await db.set('stars:counter', (Math.max(...backupData.stars.map(s => s.id)) + 1).toString());
    console.log(`✅ ${backupData.stars.length} stars imported`);
  }

  // Verify import
  console.log('\n🔍 Verifying import...');
  const allKeys = await db.list();
  console.log(`Total database keys: ${allKeys.length}`);
  
  const categoryCounts = {
    users: allKeys.filter(k => k.startsWith('user:')).length,
    weeks: allKeys.filter(k => k.startsWith('week:')).length,
    topics: allKeys.filter(k => k.startsWith('topic:')).length,
    comments: allKeys.filter(k => k.startsWith('comment:')).length,
    stars: allKeys.filter(k => k.startsWith('star:')).length,
    counters: allKeys.filter(k => k.endsWith(':counter')).length,
    others: allKeys.filter(k => !k.includes(':')).length
  };
  
  console.log('📊 Database contents:', categoryCounts);
  
  console.log('\n🎉 Full import completed successfully!');
  console.log(`📈 Total items imported: ${imported}`);
}

fullImport().catch(console.error);