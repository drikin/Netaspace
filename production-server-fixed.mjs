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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist/public')));

app.get('/api/version', (req, res) => {
  res.json({ app: '2.4.0', extension: '2.1.1', releaseDate: '2025-06-11' });
});

app.get('/api/auth/me', async (req, res) => {
  const sessionId = req.headers.cookie?.match(/session=([^;]+)/)?.[1];
  if (sessionId === 'admin-session') {
    res.json({ user: { id: 1, username: 'admin' } });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

app.get('/api/weeks/active', async (req, res) => {
  try {
    const weekResult = await pool.query("SELECT * FROM weeks WHERE is_active = true LIMIT 1");
    if (weekResult.rows.length > 0) {
      const week = weekResult.rows[0];
      const topicsResult = await pool.query("SELECT * FROM topics WHERE week_id = $1", [week.id]);
      
      const topicsWithStars = [];
      for (const topic of topicsResult.rows) {
        const starsResult = await pool.query("SELECT COUNT(*) as count FROM stars WHERE topic_id = $1", [topic.id]);
        topicsWithStars.push({
          ...topic,
          stars_count: parseInt(starsResult.rows[0].count)
        });
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log('Corrected application running on port ' + port);
});