#!/bin/bash

# Zero-reset deployment script for neta.backspace.fm

set -e

SERVER="153.125.147.133"
USER="ubuntu"
KEY="~/.ssh/id_ed25519"

echo "Starting zero-reset deployment to neta.backspace.fm..."

# Create deployment package
echo "Creating deployment package..."
tar -czf zero-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude='*.log' \
    --exclude='attached_assets' \
    --exclude='*.tar.gz' \
    .

# Test SSH connection
echo "Testing SSH connection..."
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i $KEY $USER@$SERVER "echo 'SSH connection successful'" || {
    echo "SSH connection failed. Please check the key or network."
    exit 1
}

# Transfer deployment package
echo "Transferring deployment package..."
scp -o StrictHostKeyChecking=no -i $KEY zero-deploy.tar.gz $USER@$SERVER:/home/ubuntu/

# Execute deployment on server
echo "Executing deployment on server..."
ssh -o StrictHostKeyChecking=no -i $KEY $USER@$SERVER << 'EOF'
set -e

echo "=== Starting Zero Reset Deployment ==="

# Stop existing services
sudo systemctl stop neta-app 2>/dev/null || true
sudo systemctl disable neta-app 2>/dev/null || true

# Remove existing systemd service
sudo rm -f /etc/systemd/system/neta-app.service

# Clean up Docker if exists
sudo docker stop $(sudo docker ps -aq) 2>/dev/null || true
sudo docker rm $(sudo docker ps -aq) 2>/dev/null || true
sudo docker rmi $(sudo docker images -q) 2>/dev/null || true

# Clean home directory (preserve SSH keys)
find /home/ubuntu -maxdepth 1 -not -name ".ssh" -not -name "." -not -name ".." -exec sudo rm -rf {} + 2>/dev/null || true

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Extract deployment package
cd /home/ubuntu
tar -xzf zero-deploy.tar.gz
rm zero-deploy.tar.gz

# Install dependencies
npm install

# Build the application
npm run build

# Create production server with data persistence
cat > production-server.mjs << 'PRODSERVER'
import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3001;
const publicDir = join(__dirname, 'dist', 'public');
const DATA_FILE = '/home/ubuntu/neta-data.json';

// Session storage and admin credentials
const sessions = new Map();
const ADMIN_USER = { id: 1, username: 'admin', password: 'fmbackspace55' };

// Data persistence
let persistentData = {
  weeks: [{ id: 2, startDate: '2025-06-10', endDate: '2025-06-17', isActive: true }],
  topics: [],
  topicIdCounter: 1
};

if (existsSync(DATA_FILE)) {
  try {
    const savedData = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    persistentData = { ...persistentData, ...savedData };
    console.log(`Loaded ${persistentData.topics.length} topics from storage`);
  } catch (error) {
    console.log('Using default data');
  }
}

let weeks = persistentData.weeks;
let topics = persistentData.topics;
let topicIdCounter = Math.max(persistentData.topicIdCounter, ...topics.map(t => t.id), 0) + 1;

function saveData() {
  try {
    writeFileSync(DATA_FILE, JSON.stringify({ weeks, topics, topicIdCounter }, null, 2));
  } catch (error) {
    console.error('Failed to save data:', error);
  }
}

// MIME types
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

function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) cookies[name] = decodeURIComponent(value);
    });
  }
  return cookies;
}

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function fetchUrlInfo(url) {
  return new Promise((resolve) => {
    const options = { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Backspace.fm/1.0)' } };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;
          const descMatch = data.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                           data.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
          const description = descMatch ? descMatch[1].trim() : '';
          resolve({ title, description: description.substring(0, 200) });
        } catch (error) {
          resolve({ title: new URL(url).hostname, description: '' });
        }
      });
    }).on('error', () => resolve({ title: new URL(url).hostname, description: '' }));
  });
}

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

const server = createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  if (pathname !== '/' && pathname.endsWith('/')) pathname = pathname.slice(0, -1);

  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies['connect.sid'];
  let currentUser = null;
  
  if (sessionId && sessions.has(sessionId)) currentUser = ADMIN_USER;

  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
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
    if (sessionId) sessions.delete(sessionId);
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

  // URL info fetcher
  if (pathname === '/api/fetch-url-info' && req.method === 'GET') {
    const url = parsedUrl.query.url;
    if (!url) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'URL parameter required' }));
      return;
    }
    try {
      const urlInfo = await fetchUrlInfo(url);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(urlInfo));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch URL info' }));
    }
    return;
  }

  // Week endpoints
  if (pathname === '/api/weeks/active') {
    const activeWeek = weeks.find(w => w.isActive);
    if (activeWeek) {
      const weekTopics = topics.filter(t => t.weekId === activeWeek.id)
        .map(topic => ({ ...topic, starsCount: 0, hasStarred: false }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...activeWeek, topics: weekTopics }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No active week found' }));
    }
    return;
  }

  if (pathname === '/api/weeks') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(weeks));
    return;
  }

  // Topic submission
  if (pathname === '/api/topics' && req.method === 'POST') {
    const body = await parseBody(req);
    const { title, url, description, submitterFingerprint } = body;
    
    const existingTopic = topics.find(t => t.url === url);
    if (existingTopic) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'URL already exists' }));
      return;
    }

    const activeWeek = weeks.find(w => w.isActive);
    if (!activeWeek) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No active week' }));
      return;
    }

    const newTopic = {
      id: topicIdCounter++,
      weekId: activeWeek.id,
      title: title || 'Untitled',
      url,
      description: description || '',
      submitter: 'Anonymous',
      fingerprint: submitterFingerprint || `fp_${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    topics.push(newTopic);
    saveData();
    
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(newTopic));
    return;
  }

  // Topic status update (admin)
  if (pathname.startsWith('/api/topics/') && pathname.endsWith('/status') && req.method === 'PUT') {
    if (!currentUser) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Authentication required' }));
      return;
    }

    const topicId = parseInt(pathname.split('/')[3]);
    const body = await parseBody(req);
    const { status } = body;

    const topicIndex = topics.findIndex(t => t.id === topicId);
    if (topicIndex === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Topic not found' }));
      return;
    }

    topics[topicIndex].status = status;
    saveData();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(topics[topicIndex]));
    return;
  }

  // Topic deletion (admin)
  if (pathname.startsWith('/api/topics/') && req.method === 'DELETE') {
    if (!currentUser) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Authentication required' }));
      return;
    }

    const topicId = parseInt(pathname.split('/')[3]);
    const topicIndex = topics.findIndex(t => t.id === topicId);
    
    if (topicIndex === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Topic not found' }));
      return;
    }

    topics.splice(topicIndex, 1);
    saveData();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Star endpoints (placeholder)
  if (pathname.startsWith('/api/topics/') && pathname.endsWith('/star')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Static file serving
  let filePath = join(publicDir, pathname === '/' ? 'index.html' : pathname);
  
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
  console.log(`Production server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving files from: ${publicDir}`);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully');
  server.close(() => process.exit(0));
});
PRODSERVER

# Create systemd service
sudo tee /etc/systemd/system/neta-app.service > /dev/null << 'SERVICE'
[Unit]
Description=Neta Backspace FM Topic Manager
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu
ExecStart=/usr/bin/node production-server.mjs
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

StandardOutput=journal
StandardError=journal
SyslogIdentifier=neta-app

[Install]
WantedBy=multi-user.target
SERVICE

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable neta-app
sudo systemctl start neta-app

# Verify deployment
sleep 5
if sudo systemctl is-active --quiet neta-app; then
    echo "✅ Deployment successful!"
    sudo systemctl status neta-app --no-pager -l
    
    # Test endpoints
    echo "Testing endpoints..."
    curl -f -s http://localhost:3001/health > /dev/null && echo "✅ Health check OK"
    curl -f -s http://localhost:3001/api/version > /dev/null && echo "✅ API OK"
    
    echo "🎉 neta.backspace.fm is now live!"
else
    echo "❌ Deployment failed"
    sudo journalctl -u neta-app -n 20 --no-pager
    exit 1
fi

EOF

echo "Deployment completed!"