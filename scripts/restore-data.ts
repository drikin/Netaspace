import fs from 'fs';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { users, weeks, topics, comments, stars } from '../shared/sqlite-schema';

const backupData = JSON.parse(fs.readFileSync('./backup-supabase-1749237202606.json', 'utf8'));

// Initialize database
const sqlite = new Database('./database/dev.sqlite');
const db = drizzle(sqlite);

console.log('Restoring data from backup...');

// Clear existing data
await db.delete(stars);
await db.delete(comments);
await db.delete(topics);
await db.delete(weeks);
await db.delete(users);

// Restore users
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

// Restore weeks
for (const week of backupData.weeks) {
  await db.insert(weeks).values({
    id: week.id,
    startDate: week.start_date,
    endDate: week.end_date,
    title: week.title,
    isActive: week.is_active || false
  });
}

// Restore topics
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

// Restore comments
if (backupData.comments) {
  for (const comment of backupData.comments) {
    await db.insert(comments).values({
      id: comment.id,
      topicId: comment.topic_id,
      commenter: comment.name || comment.commenter || 'Anonymous',
      fingerprint: comment.fingerprint || `fp_comment_${comment.id}`,
      content: comment.content,
      createdAt: comment.created_at
    });
  }
}

// Restore stars
if (backupData.stars) {
  for (const star of backupData.stars) {
    await db.insert(stars).values({
      id: star.id,
      topicId: star.topic_id,
      fingerprint: star.fingerprint || `fp_star_${star.id}`,
      createdAt: star.created_at
    });
  }
}

console.log('Data restoration completed!');
sqlite.close();