import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
try {
  const envFile = readFileSync(path.join(__dirname, '.env'), 'utf8');
  const envVars = envFile.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  envVars.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
  console.log('Environment variables loaded from .env file');
  console.log('DATABASE_URL configured:', process.env.DATABASE_URL ? 'Yes' : 'No');
} catch (error) {
  console.error('Failed to load .env file:', error.message);
}

const app = express();
const port = 5000;

// Use Neon PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Neon PostgreSQL connection established successfully');
    client.release();
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

// Simple in-memory session store for production
const sessions = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist/public')));

// Session middleware
app.use((req, res, next) => {
  const sessionId = req.headers.cookie?.split(';')
    .find(c => c.trim().startsWith('sessionId='))
    ?.split('=')[1];
  
  if (sessionId && sessions.has(sessionId)) {
    req.session = sessions.get(sessionId);
  }
  next();
});

// Generate session ID
function generateSessionId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'fmbackspace55') {
      // Create session
      const sessionId = generateSessionId();
      const user = { id: 1, username: 'admin' };
      
      sessions.set(sessionId, {
        userId: user.id,
        user: user,
        createdAt: new Date()
      });
      
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
      });
      
      res.json({ 
        user: user,
        message: 'Login successful'
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      res.json({ user: req.session.user });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const sessionId = req.headers.cookie?.split(';')
      .find(c => c.trim().startsWith('sessionId='))
      ?.split('=')[1];
    
    if (sessionId) {
      sessions.delete(sessionId);
    }
    
    res.clearCookie('sessionId');
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// API endpoints
app.get('/api/version', (req, res) => {
  res.json({
    app: '2.4.0',
    extension: '2.1.1',
    releaseDate: '2025-06-11'
  });
});

// Get active week with topics
app.get('/api/weeks/active', async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Get active week
    const weekResult = await client.query(
      'SELECT * FROM weeks WHERE "isActive" = true ORDER BY "createdAt" DESC LIMIT 1'
    );
    
    if (weekResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'No active week found' });
    }
    
    const week = weekResult.rows[0];
    
    // Get topics for this week with star counts
    const topicsResult = await client.query(`
      SELECT 
        t.*,
        COALESCE(star_counts.stars_count, 0) as "starsCount"
      FROM topics t
      LEFT JOIN (
        SELECT 
          "topicId",
          COUNT(*) as stars_count
        FROM stars 
        GROUP BY "topicId"
      ) star_counts ON t.id = star_counts."topicId"
      WHERE t."weekId" = $1
      ORDER BY t."createdAt" DESC
    `, [week.id]);
    
    week.topics = topicsResult.rows;
    
    client.release();
    res.json(week);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all weeks
app.get('/api/weeks', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM weeks ORDER BY "createdAt" DESC'
    );
    client.release();
    
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new week
app.post('/api/weeks', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const { title, startDate, endDate, isActive } = req.body;
    const client = await pool.connect();
    
    // If setting as active, deactivate all other weeks
    if (isActive) {
      await client.query('UPDATE weeks SET "isActive" = false');
    }
    
    const result = await client.query(
      'INSERT INTO weeks (title, "startDate", "endDate", "isActive", "createdAt") VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [title, startDate, endDate, isActive]
    );
    
    client.release();
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set active week
app.post('/api/weeks/:id/setActive', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const weekId = parseInt(req.params.id);
    const client = await pool.connect();
    
    // Deactivate all weeks
    await client.query('UPDATE weeks SET "isActive" = false');
    
    // Activate the selected week
    const result = await client.query(
      'UPDATE weeks SET "isActive" = true WHERE id = $1 RETURNING *',
      [weekId]
    );
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Week not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update topic status
app.put('/api/topics/:id/status', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const topicId = parseInt(req.params.id);
    const { status } = req.body;
    const client = await pool.connect();
    
    let query = 'UPDATE topics SET status = $1';
    let params = [status, topicId];
    
    // If setting to featured, also set featuredAt timestamp
    if (status === 'featured') {
      query += ', "featuredAt" = NOW()';
    }
    
    query += ' WHERE id = $2 RETURNING *';
    
    const result = await client.query(query, params);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete topic
app.delete('/api/topics/:id', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const topicId = parseInt(req.params.id);
    const client = await pool.connect();
    
    // Delete associated stars first
    await client.query('DELETE FROM stars WHERE "topicId" = $1', [topicId]);
    
    // Delete the topic
    const result = await client.query('DELETE FROM topics WHERE id = $1 RETURNING *', [topicId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit new topic
app.post('/api/topics', async (req, res) => {
  try {
    const { title, url, description, submitter } = req.body;
    const fingerprint = req.headers['x-fingerprint'] || 'anonymous';
    
    const client = await pool.connect();
    
    // Get active week
    const weekResult = await client.query(
      'SELECT id FROM weeks WHERE "isActive" = true ORDER BY "createdAt" DESC LIMIT 1'
    );
    
    if (weekResult.rows.length === 0) {
      client.release();
      return res.status(400).json({ error: 'No active week found' });
    }
    
    const weekId = weekResult.rows[0].id;
    
    // Check if URL already exists for this week
    const existingResult = await client.query(
      'SELECT id FROM topics WHERE url = $1 AND "weekId" = $2',
      [url, weekId]
    );
    
    if (existingResult.rows.length > 0) {
      client.release();
      return res.status(409).json({ error: 'This URL has already been submitted for this week' });
    }
    
    // Insert new topic
    const result = await client.query(`
      INSERT INTO topics (title, url, description, submitter, fingerprint, "weekId", status, "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
      RETURNING *
    `, [title, url, description, submitter, fingerprint, weekId]);
    
    client.release();
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add star to topic
app.post('/api/topics/:id/star', async (req, res) => {
  try {
    const topicId = parseInt(req.params.id);
    const fingerprint = req.headers['x-fingerprint'] || 'anonymous';
    
    const client = await pool.connect();
    
    // Check if already starred
    const existingResult = await client.query(
      'SELECT id FROM stars WHERE "topicId" = $1 AND fingerprint = $2',
      [topicId, fingerprint]
    );
    
    if (existingResult.rows.length > 0) {
      client.release();
      return res.status(409).json({ error: 'Already starred' });
    }
    
    // Add star
    await client.query(
      'INSERT INTO stars ("topicId", fingerprint, "createdAt") VALUES ($1, $2, NOW())',
      [topicId, fingerprint]
    );
    
    // Get updated star count
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM stars WHERE "topicId" = $1',
      [topicId]
    );
    
    client.release();
    res.json({ starsCount: parseInt(countResult.rows[0].count) });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove star from topic
app.delete('/api/topics/:id/star', async (req, res) => {
  try {
    const topicId = parseInt(req.params.id);
    const fingerprint = req.headers['x-fingerprint'] || 'anonymous';
    
    const client = await pool.connect();
    
    // Remove star
    const result = await client.query(
      'DELETE FROM stars WHERE "topicId" = $1 AND fingerprint = $2 RETURNING *',
      [topicId, fingerprint]
    );
    
    // Get updated star count
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM stars WHERE "topicId" = $1',
      [topicId]
    );
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Star not found' });
    }
    
    res.json({ starsCount: parseInt(countResult.rows[0].count) });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public', 'index.html'));
});

// Test database connection on startup
testConnection();

app.listen(port, '0.0.0.0', () => {
  console.log(`Production server running on port ${port}`);
});