import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Optimized for production with 20 PM2 instances
  max: 50, // Increased from 10 to support high concurrency
  min: 10, // Increased from 2 for better performance
  idleTimeoutMillis: 30000, // Reduced from 60s to 30s
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000, // Added to prevent long-running queries
  query_timeout: 30000, // Added query timeout
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

pool.on('connect', (client) => {
  console.log('PostgreSQL connection established');
});

pool.on('acquire', (client) => {
  console.log('PostgreSQL connection acquired from pool');
});

pool.on('release', (err, client) => {
  if (err) {
    console.error('PostgreSQL connection release error:', err);
  }
});

export const db = drizzle(pool, { schema });

// Test database connection on startup
async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('PostgreSQL database connection test successful');
  } catch (error) {
    console.error('PostgreSQL database connection test failed:', error);
  }
}

// Run connection test
testConnection();
