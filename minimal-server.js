import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Simple session storage (in-memory for demo)
const sessions = new Map();
const sessionTimeout = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

function getSession(req) {
  const cookies = req.headers.cookie || '';
  const sessionMatch = cookies.match(/sessionId=([^;]*)/);
  if (sessionMatch) {
    const sessionId = sessionMatch[1];
    const session = sessions.get(sessionId);
    if (session && Date.now() - session.lastAccess < sessionTimeout) {
      session.lastAccess = Date.now();
      return session;
    }
  }
  return null;
}

function setSession(res, sessionData) {
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    ...sessionData,
    lastAccess: Date.now()
  });
  res.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=${sessionTimeout / 1000}`);
  return sessionId;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Routes
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');

    if (pathname === '/api/version') {
      res.writeHead(200);
      res.end(JSON.stringify({
        app: '2.4.0',
        extension: '2.1.1',
        releaseDate: '2025-06-11'
      }));
      return;
    }

    if (pathname === '/api/auth/me') {
      const session = getSession(req);
      if (session && session.user) {
        res.writeHead(200);
        res.end(JSON.stringify({ user: session.user }));
      } else {
        res.writeHead(401);
        res.end(JSON.stringify({ message: 'Not authenticated' }));
      }
      return;
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await parseBody(req);
      const { username, password } = body;
      
      if (username === 'admin' && password === 'fmbackspace55') {
        const user = { id: 1, username: 'admin' };
        setSession(res, { user });
        res.writeHead(200);
        res.end(JSON.stringify({ user }));
      } else {
        res.writeHead(401);
        res.end(JSON.stringify({ message: 'Invalid credentials' }));
      }
      return;
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const session = getSession(req);
      if (session) {
        sessions.delete(session.id);
      }
      res.writeHead(200);
      res.end(JSON.stringify({ message: 'Logged out successfully' }));
      return;
    }

    // Default API response
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
    return;
  }

  // Static file serving
  let filePath = path.join(__dirname, 'dist/public', pathname === '/' ? 'index.html' : pathname);
  
  // Check if file exists
  try {
    await fs.promises.access(filePath);
  } catch {
    // If file doesn't exist, serve index.html for SPA routing
    filePath = path.join(__dirname, 'dist/public/index.html');
  }

  try {
    const data = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.writeHead(200);
    res.end(data);
  } catch (error) {
    res.writeHead(404);
    res.end('File not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment: production');
  console.log('Serving from:', path.join(__dirname, 'dist/public'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});