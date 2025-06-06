#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { drizzle } = require('drizzle-orm/better-sqlite3');
const Database = require('better-sqlite3');

// Import schema
const { users, weeks, topics, comments, stars } = require('../shared/sqlite-schema.ts');

async function restoreFromBackup() {
  try {
    // Read the backup file
    const backupData = JSON.parse(fs.readFileSync('./backup-supabase-1749237202606.json', 'utf8'));
    
    // Initialize SQLite database
    const sqlite = new Database('./database/dev.sqlite');
    const db = drizzle(sqlite);
    
    console.log('Starting data restoration...');
    
    // Clear existing data
    await db.delete(stars);
    await db.delete(comments);
    await db.delete(topics);
    await db.delete(weeks);
    await db.delete(users);
    
    console.log('Cleared existing data');
    
    // Restore users
    if (backupData.users && backupData.users.length > 0) {
      for (const user of backupData.users) {
        await db.insert(users).values({
          id: user.id,
          username: user.username,
          password: user.password,
          isAdmin: user.is_admin || false,
          email: user.email,
          createdAt: user.created_at || new Date().toISOString()
        });
      }
      console.log(`Restored ${backupData.users.length} users`);
    }
    
    // Restore weeks
    if (backupData.weeks && backupData.weeks.length > 0) {
      for (const week of backupData.weeks) {
        await db.insert(weeks).values({
          id: week.id,
          startDate: week.start_date,
          endDate: week.end_date,
          title: week.title,
          isActive: week.is_active || false
        });
      }
      console.log(`Restored ${backupData.weeks.length} weeks`);
    }
    
    // Restore topics
    if (backupData.topics && backupData.topics.length > 0) {
      for (const topic of backupData.topics) {
        await db.insert(topics).values({
          id: topic.id,
          weekId: topic.week_id,
          title: topic.title,
          url: topic.url,
          description: topic.description,
          submitter: topic.submitter,
          fingerprint: topic.fingerprint || `fp_${topic.id}`,
          createdAt: topic.created_at,
          status: topic.status || 'pending',
          stars: topic.stars || 0,
          featuredAt: topic.featured_at
        });
      }
      console.log(`Restored ${backupData.topics.length} topics`);
    }
    
    // Restore comments
    if (backupData.comments && backupData.comments.length > 0) {
      for (const comment of backupData.comments) {
        await db.insert(comments).values({
          id: comment.id,
          topicId: comment.topic_id,
          commenter: comment.commenter,
          fingerprint: comment.fingerprint || `fp_comment_${comment.id}`,
          content: comment.content,
          createdAt: comment.created_at
        });
      }
      console.log(`Restored ${backupData.comments.length} comments`);
    }
    
    // Restore stars
    if (backupData.stars && backupData.stars.length > 0) {
      for (const star of backupData.stars) {
        await db.insert(stars).values({
          id: star.id,
          topicId: star.topic_id,
          fingerprint: star.fingerprint || `fp_star_${star.id}`,
          createdAt: star.created_at
        });
      }
      console.log(`Restored ${backupData.stars.length} stars`);
    }
    
    console.log('Data restoration completed successfully!');
    
    // Verify data
    const userCount = await db.select().from(users);
    const weekCount = await db.select().from(weeks);
    const topicCount = await db.select().from(topics);
    
    console.log('\nVerification:');
    console.log(`Users: ${userCount.length}`);
    console.log(`Weeks: ${weekCount.length}`);
    console.log(`Topics: ${topicCount.length}`);
    
    sqlite.close();
    
  } catch (error) {
    console.error('Error during restoration:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  restoreFromBackup();
}

module.exports = { restoreFromBackup };