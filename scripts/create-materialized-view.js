#!/usr/bin/env node

// Script to create the materialized view for performance optimization
import { readFileSync } from 'fs';
import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function createMaterializedView() {
  const client = await pool.connect();
  
  try {
    console.log('Creating materialized view for active week topics...');
    
    const sql = readFileSync('create-materialized-view.sql', 'utf8');
    await client.query(sql);
    
    console.log('✅ Materialized view created successfully!');
    
    // Test that the view works
    const result = await client.query('SELECT COUNT(*) FROM active_week_topics');
    console.log(`📊 Materialized view contains ${result.rows[0].count} records`);
    
  } catch (error) {
    console.error('❌ Error creating materialized view:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createMaterializedView();