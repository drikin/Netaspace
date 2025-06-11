import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'backspace_session_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in HTTPS production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist/public')));

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'fmbackspace55') {
      // Create user in database if not exists
      let user;
      try {
        const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
          user = existingUser.rows[0];
        } else {
          const newUser = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
            [username, password]
          );
          user = newUser.rows[0];
        }
      } catch (error) {
        console.error('Database error during login:', error);
        // If database error, still allow login with session
        user = { id: 1, username: 'admin' };
      }
      
      req.session.userId = user.id;
      req.session.user = user;
      
      res.json({ 
        user: { id: user.id, username: user.username },
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
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (req.session.userId && req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
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
  console.log('Corrected application with authentication running on port ' + port);
});