import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3001;
const publicDir = join(__dirname, 'dist', 'public');

// Simple session storage (in-memory for this production instance)
const sessions = new Map();

// Hard-coded admin credentials (matching the database)
const ADMIN_USER = {
  id: 1,
  username: 'admin',
  password: 'fmbackspace55'
};

// MIME type mapping
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function getMimeType(filePath) {
  const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
  return mimeTypes[ext] || 'application/octet-stream';
}

// Simple cookie parser
function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
  }
  return cookies;
}

// Generate session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Parse JSON body
async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

const server = createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  // Remove trailing slash except for root
  if (pathname !== '/' && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Parse cookies for session management
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies['connect.sid'];
  let currentUser = null;
  
  if (sessionId && sessions.has(sessionId)) {
    currentUser = ADMIN_USER;
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Authentication endpoints
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const { username, password } = body;
    
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
      const sessionId = generateSessionId();
      sessions.set(sessionId, ADMIN_USER.id);
      
      res.setHeader('Set-Cookie', `connect.sid=${sessionId}; HttpOnly; Path=/; SameSite=Lax; Secure=${req.headers['x-forwarded-proto'] === 'https'}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ user: { id: ADMIN_USER.id, username: ADMIN_USER.username } }));
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Invalid credentials' }));
    }
    return;
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.setHeader('Set-Cookie', 'connect.sid=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (pathname === '/api/auth/me') {
    if (currentUser) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ user: { id: currentUser.id, username: currentUser.username } }));
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Not authenticated' }));
    }
    return;
  }

  // Version endpoint
  if (pathname === '/api/version') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ app: '2.4.0', extension: '2.1.1', releaseDate: '2025-06-11' }));
    return;
  }

  // Mock weeks endpoint for admin functionality
  if (pathname === '/api/weeks/active') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: 2,
      startDate: '2025-06-10',
      endDate: '2025-06-17',
      isActive: true,
      topics: []
    }));
    return;
  }

  if (pathname === '/api/weeks') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([{
      id: 2,
      startDate: '2025-06-10',
      endDate: '2025-06-17',
      isActive: true
    }]));
    return;
  }

  // Other API endpoints (basic implementation)
  if (pathname.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API endpoint not implemented in production demo' }));
    return;
  }
  
  // Static file serving
  let filePath = join(publicDir, pathname === '/' ? 'index.html' : pathname);
  
  // If file doesn't exist, serve index.html for SPA routing
  if (!existsSync(filePath)) {
    filePath = join(publicDir, 'index.html');
  }
  
  try {
    const content = readFileSync(filePath);
    const mimeType = getMimeType(filePath);
    
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server with authentication running on http://0.0.0.0:${PORT}`);
  console.log(`Serving files from: ${publicDir}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});