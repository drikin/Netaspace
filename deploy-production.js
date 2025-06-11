#!/usr/bin/env node

// Simple production deployment script
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('Starting production deployment...');

// Create a simple server file that includes all dependencies
const serverCode = `
import express from 'express';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './shared/schema.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_QBBAjQYs9lIjBVJuUKJkT4lBqEbTmILv@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

const db = drizzle(pool, { schema });

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the React app
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;

// Write the simple server file
fs.writeFileSync('simple-server.js', serverCode);

console.log('Created simple production server');
console.log('Deploy this file with the dist/public folder to your server');