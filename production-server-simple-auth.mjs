import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Simple in-memory session store for production
const sessions = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist/public')));

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
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
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
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.cookies?.sessionId;
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.clearCookie('sessionId');
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req, res) => {
  const sessionId = req.cookies?.sessionId || req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
  
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    res.json({ user: session.user });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Admin endpoints - require authentication
function requireAuth(req, res, next) {
  const sessionId = req.cookies?.sessionId || req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
  
  if (sessionId && sessions.has(sessionId)) {
    req.session = sessions.get(sessionId);
    next();
  } else {
    res.status(401).json({ message: 'Authentication required' });
  }
}

// Topics management
app.post('/api/topics', async (req, res) => {
  try {
    const { title, url, description, submitter } = req.body;
    const weekResult = await pool.query("SELECT * FROM weeks WHERE is_active = true LIMIT 1");
    
    if (weekResult.rows.length > 0) {
      const week = weekResult.rows[0];
      const result = await pool.query(
        "INSERT INTO topics (week_id, title, url, description, submitter, status, fingerprint, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *",
        [week.id, title, url, description, submitter, 'pending', 'web-submission']
      );
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'No active week found' });
    }
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/topics/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const result = await pool.query(
      "UPDATE topics SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'Topic not found' });
    }
  } catch (error) {
    console.error('Error updating topic status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/topics/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete stars first
    await pool.query("DELETE FROM stars WHERE topic_id = $1", [id]);
    
    // Delete topic
    const result = await pool.query("DELETE FROM topics WHERE id = $1 RETURNING *", [id]);
    
    if (result.rows.length > 0) {
      res.json({ success: true, message: 'Topic deleted successfully' });
    } else {
      res.status(404).json({ message: 'Topic not found' });
    }
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(500).json({ error: error.message });
  }
});

// Other API endpoints
app.get('/api/version', (req, res) => {
  res.json({ app: '2.4.0', extension: '2.1.1', releaseDate: '2025-06-11' });
});

app.get('/api/weeks/active', async (req, res) => {
  try {
    const weekResult = await pool.query("SELECT * FROM weeks WHERE is_active = true LIMIT 1");
    if (weekResult.rows.length > 0) {
      const week = weekResult.rows[0];
      const topicsResult = await pool.query("SELECT * FROM topics WHERE week_id = $1", [week.id]);
      
      const topicsWithStars = [];
      for (const topic of topicsResult.rows) {
        try {
          const starsResult = await pool.query("SELECT COUNT(*) as count FROM stars WHERE topic_id = $1", [topic.id]);
          topicsWithStars.push({
            ...topic,
            stars_count: parseInt(starsResult.rows[0].count)
          });
        } catch (error) {
          console.error('Error getting stars for topic:', topic.id, error);
          topicsWithStars.push({
            ...topic,
            stars_count: 0
          });
        }
      }
      
      res.json({ ...week, topics: topicsWithStars });
    } else {
      res.status(404).json({ message: 'No active week found' });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log('Production server with authentication running on port ' + port);
});