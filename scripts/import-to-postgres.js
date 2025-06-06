/**
 * Import backup data to PostgreSQL
 */

const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

async function importToPostgres() {
  console.log('🚀 Importing backup data to PostgreSQL...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found');
    return;
  }

  const postgres = neon(process.env.DATABASE_URL);
  const db = drizzle(postgres);

  // Load backup data
  const backupPath = './backup-supabase-1749237202606.json';
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found');
    return;
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log('📦 Loaded backup data:', {
    users: backupData.users?.length || 0,
    weeks: backupData.weeks?.length || 0,
    topics: backupData.topics?.length || 0,
    comments: backupData.comments?.length || 0,
    stars: backupData.stars?.length || 0
  });

  try {
    // Import users
    if (backupData.users && backupData.users.length > 0) {
      console.log('👤 Importing users...');
      for (const user of backupData.users) {
        await db.insert(users).values({
          id: user.id,
          username: user.username,
          password: user.password,
          isAdmin: user.isAdmin || false,
          email: user.email
        }).onConflictDoNothing();
      }
      console.log(`✅ ${backupData.users.length} users imported`);
    }

    // Import weeks
    if (backupData.weeks && backupData.weeks.length > 0) {
      console.log('📅 Importing weeks...');
      for (const week of backupData.weeks) {
        await db.insert(weeks).values({
          id: week.id,
          startDate: week.startDate ? new Date(week.startDate) : new Date('2025-05-31'),
          endDate: week.endDate ? new Date(week.endDate) : new Date('2025-06-07'),
          title: week.title,
          isActive: week.id === 2 // Set week 2 (ep607) as active
        }).onConflictDoNothing();
      }
      console.log(`✅ ${backupData.weeks.length} weeks imported`);
    }

    // Import topics
    if (backupData.topics && backupData.topics.length > 0) {
      console.log('📝 Importing topics...');
      let imported = 0;
      for (const topic of backupData.topics) {
        await db.insert(topics).values({
          id: topic.id,
          title: topic.title,
          url: topic.url,
          description: topic.description,
          submitter: topic.submitter,
          status: topic.status || 'pending',
          weekId: topic.weekId || 2, // Default to week 2 if no weekId
          createdAt: topic.createdAt ? new Date(topic.createdAt) : new Date(),
          stars: topic.stars || 0,
          featuredAt: topic.featuredAt ? new Date(topic.featuredAt) : null
        }).onConflictDoNothing();
        
        imported++;
        if (imported % 20 === 0) {
          console.log(`  Progress: ${imported}/${backupData.topics.length} topics imported...`);
        }
      }
      console.log(`✅ ${backupData.topics.length} topics imported`);
    }

    // Import comments
    if (backupData.comments && backupData.comments.length > 0) {
      console.log('💬 Importing comments...');
      for (const comment of backupData.comments) {
        if (comment.topicId) {
          await db.insert(comments).values({
            id: comment.id,
            name: comment.name,
            content: comment.content,
            topicId: comment.topicId,
            createdAt: comment.createdAt ? new Date(comment.createdAt) : new Date()
          }).onConflictDoNothing();
        }
      }
      console.log(`✅ ${backupData.comments.length} comments imported`);
    }

    // Import stars
    if (backupData.stars && backupData.stars.length > 0) {
      console.log('⭐ Importing stars...');
      for (const star of backupData.stars) {
        if (star.topicId && star.fingerprint) {
          await db.insert(stars).values({
            id: star.id,
            topicId: star.topicId,
            fingerprint: star.fingerprint,
            createdAt: star.createdAt ? new Date(star.createdAt) : new Date()
          }).onConflictDoNothing();
        }
      }
      console.log(`✅ ${backupData.stars.length} stars imported`);
    }

    console.log('\n🎉 All data imported successfully to PostgreSQL!');
    
    // Verify import
    const [userCount] = await db.select().from(users);
    const [weekCount] = await db.select().from(weeks);  
    const topicCount = await db.select().from(topics);
    
    console.log('\n📊 Verification:');
    console.log(`Users in database: ${userCount ? 1 : 0}`);
    console.log(`Weeks in database: ${weekCount ? 1 : 0}`);
    console.log(`Topics in database: ${topicCount.length}`);

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    throw error;
  }
}

importToPostgres().catch(console.error);