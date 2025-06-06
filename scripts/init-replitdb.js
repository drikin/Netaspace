/**
 * Replit Database初期化スクリプト
 * 本番環境でのデプロイ時にバックアップデータを自動的にReplit DBに復元
 */

import fs from 'fs';

// Replit Database接続ヘルパー
function createReplitDB() {
  if (!process.env.REPLIT_DB_URL) {
    console.log('No Replit DB URL found, skipping initialization');
    return null;
  }

  return {
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
}

async function initializeReplitDB() {
  console.log('🚀 Checking Replit Database initialization...');
  
  const db = createReplitDB();
  if (!db) {
    console.log('Replit Database not available, using in-memory storage');
    return;
  }

  // 既存データの確認
  const existingUsers = await db.list('user:');
  if (existingUsers.length > 0) {
    console.log('✅ Replit Database already initialized with data');
    return;
  }

  console.log('📦 Initializing Replit Database with backup data...');

  // バックアップファイルからデータを読み込み
  const backupPath = './backup-supabase-1749237202606.json';
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found:', backupPath);
    console.log('Creating minimal sample data instead...');
    await createMinimalData(db);
    return;
  }

  try {
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    // Users
    if (backupData.users) {
      for (const user of backupData.users) {
        await db.set(`user:${user.id}`, JSON.stringify({
          id: user.id,
          username: user.username,
          password: user.password,
          isAdmin: user.isAdmin || false,
          email: user.email
        }));
      }
      await db.set('users:counter', (Math.max(...backupData.users.map(u => u.id)) + 1).toString());
    }

    // Weeks
    if (backupData.weeks) {
      for (const week of backupData.weeks) {
        await db.set(`week:${week.id}`, JSON.stringify({
          id: week.id,
          startDate: week.startDate,
          endDate: week.endDate,
          title: week.title,
          isActive: week.isActive || false
        }));
        if (week.isActive) {
          await db.set('active:week', week.id.toString());
        }
      }
      await db.set('weeks:counter', (Math.max(...backupData.weeks.map(w => w.id)) + 1).toString());
    }

    // Topics
    if (backupData.topics) {
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
      }
      await db.set('topics:counter', (Math.max(...backupData.topics.map(t => t.id)) + 1).toString());
    }

    // Comments
    if (backupData.comments) {
      for (const comment of backupData.comments) {
        if (comment.topicId) {
          await db.set(`comment:topic:${comment.topicId}:${comment.id}`, JSON.stringify({
            id: comment.id,
            name: comment.name,
            content: comment.content,
            topicId: comment.topicId,
            createdAt: comment.createdAt
          }));
        }
      }
      await db.set('comments:counter', (Math.max(...backupData.comments.map(c => c.id)) + 1).toString());
    }

    // Stars
    if (backupData.stars) {
      for (const star of backupData.stars) {
        if (star.topicId && star.fingerprint) {
          await db.set(`star:topic:${star.topicId}:${star.fingerprint}`, JSON.stringify({
            id: star.id,
            topicId: star.topicId,
            fingerprint: star.fingerprint,
            createdAt: star.createdAt
          }));
        }
      }
      await db.set('stars:counter', (Math.max(...backupData.stars.map(s => s.id)) + 1).toString());
    }

    console.log('✅ Replit Database initialized successfully with backup data');
    console.log(`📊 Data imported: ${backupData.users?.length || 0} users, ${backupData.weeks?.length || 0} weeks, ${backupData.topics?.length || 0} topics, ${backupData.comments?.length || 0} comments, ${backupData.stars?.length || 0} stars`);

  } catch (error) {
    console.error('❌ Failed to initialize from backup:', error.message);
    console.log('Creating minimal sample data instead...');
    await createMinimalData(db);
  }
}

async function createMinimalData(db) {
  // 最小限のサンプルデータを作成
  await db.set('user:1', JSON.stringify({
    id: 1,
    username: 'admin',
    password: 'admin',
    isAdmin: true,
    email: 'admin@example.com'
  }));
  await db.set('users:counter', '2');

  await db.set('week:1', JSON.stringify({
    id: 1,
    startDate: '2025-05-31T00:00:00.000Z',
    endDate: '2025-06-07T00:00:00.000Z',
    title: 'ep607',
    isActive: true
  }));
  await db.set('weeks:counter', '2');
  await db.set('active:week', '1');

  await db.set('topics:counter', '1');
  await db.set('comments:counter', '1');
  await db.set('stars:counter', '1');

  console.log('✅ Minimal sample data created');
}

// 本番環境でのみ実行
if (process.env.REPLIT_DEPLOYMENT) {
  initializeReplitDB().catch(console.error);
} else {
  console.log('Skipping Replit DB initialization in development mode');
}