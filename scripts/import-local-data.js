#!/usr/bin/env node

// Script to import data to local PostgreSQL
import { readFileSync } from 'fs';
import { Pool } from 'pg';

const localUrl = 'postgresql://postgres:netapass123@localhost:5432/neta_local';

const pool = new Pool({
  connectionString: localUrl
});

async function importData() {
  const client = await pool.connect();
  
  try {
    console.log('Importing data to local PostgreSQL...');
    
    // Read export data
    const exportData = JSON.parse(readFileSync('neon-export.json', 'utf8'));
    
    // Clear existing data (except default admin)
    await client.query('DELETE FROM stars');
    await client.query('DELETE FROM topics');
    await client.query('DELETE FROM weeks WHERE id > 1');
    await client.query('DELETE FROM sessions');
    await client.query('DELETE FROM users WHERE username != \'admin\'');
    
    console.log('Cleared existing data...');
    
    // Import users (skip if admin already exists)
    for (const user of exportData.users) {
      if (user.username !== 'admin') {
        await client.query(
          'INSERT INTO users (id, username, password, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [user.id, user.username, user.password, user.created_at]
        );
      }
    }
    console.log(`✅ Imported ${exportData.users.length} users`);
    
    // Import weeks (skip default week)
    for (const week of exportData.weeks) {
      await client.query(
        'INSERT INTO weeks (id, title, start_date, end_date, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET title = $2, start_date = $3, end_date = $4, is_active = $5',
        [week.id, week.title, week.start_date, week.end_date, week.is_active, week.created_at || new Date()]
      );
    }
    console.log(`✅ Imported ${exportData.weeks.length} weeks`);
    
    // Import topics
    for (const topic of exportData.topics) {
      await client.query(
        'INSERT INTO topics (id, title, url, description, submitter, week_id, status, fingerprint, created_at, stars, featured_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [topic.id, topic.title, topic.url, topic.description, topic.submitter, topic.week_id, topic.status, topic.fingerprint, topic.created_at, topic.stars, topic.featured_at]
      );
    }
    console.log(`✅ Imported ${exportData.topics.length} topics`);
    
    // Import stars
    for (const star of exportData.stars) {
      await client.query(
        'INSERT INTO stars (id, topic_id, fingerprint, created_at) VALUES ($1, $2, $3, $4)',
        [star.id, star.topic_id, star.fingerprint, star.created_at]
      );
    }
    console.log(`✅ Imported ${exportData.stars.length} stars`);
    
    // Import sessions
    for (const session of exportData.sessions) {
      await client.query(
        'INSERT INTO sessions (sid, sess, expire) VALUES ($1, $2, $3) ON CONFLICT (sid) DO UPDATE SET sess = $2, expire = $3',
        [session.sid, session.sess, session.expire]
      );
    }
    console.log(`✅ Imported ${exportData.sessions.length} sessions`);
    
    // Update sequences
    await client.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);
    await client.query(`SELECT setval('weeks_id_seq', (SELECT MAX(id) FROM weeks))`);
    await client.query(`SELECT setval('topics_id_seq', (SELECT MAX(id) FROM topics))`);
    await client.query(`SELECT setval('stars_id_seq', (SELECT MAX(id) FROM stars))`);
    
    console.log('✅ Updated sequences');
    console.log('🎉 Data import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error importing data:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

importData();