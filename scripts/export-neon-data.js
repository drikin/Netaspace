#!/usr/bin/env node

// Script to export data from Neon PostgreSQL
import { writeFileSync } from 'fs';
import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const neonUrl = 'postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: neonUrl,
  ssl: { rejectUnauthorized: false }
});

async function exportData() {
  const client = await pool.connect();
  
  try {
    console.log('Exporting data from Neon PostgreSQL...');
    
    // Export users
    const users = await client.query('SELECT * FROM users ORDER BY id');
    console.log(`Users: ${users.rows.length} records`);
    
    // Export weeks
    const weeks = await client.query('SELECT * FROM weeks ORDER BY id');
    console.log(`Weeks: ${weeks.rows.length} records`);
    
    // Export topics
    const topics = await client.query('SELECT * FROM topics ORDER BY id');
    console.log(`Topics: ${topics.rows.length} records`);
    
    // Export stars
    const stars = await client.query('SELECT * FROM stars ORDER BY id');
    console.log(`Stars: ${stars.rows.length} records`);
    
    // Export sessions
    const sessions = await client.query('SELECT * FROM sessions ORDER BY sid');
    console.log(`Sessions: ${sessions.rows.length} records`);
    
    // Create export data
    const exportData = {
      users: users.rows,
      weeks: weeks.rows,
      topics: topics.rows,
      stars: stars.rows,
      sessions: sessions.rows
    };
    
    // Write to file
    writeFileSync('neon-export.json', JSON.stringify(exportData, null, 2));
    console.log('✅ Data exported successfully to neon-export.json');
    
  } catch (error) {
    console.error('❌ Error exporting data:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

exportData();