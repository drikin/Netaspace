import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { createHash } from "crypto";
import { storage, getDatabaseMetrics, resetDatabaseMetrics } from "./storage";
import { 
  insertTopicSchema, 
  insertStarSchema,
  insertWeekSchema,
  submitTopicSchema,
} from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import iconv from 'iconv-lite';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { EXTENSION_VERSION, getVersionInfo } from '@shared/version';

// Performance optimization: Cache for URL metadata
const urlCache = new Map<string, { title: string; description: string; cached: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute

// Performance monitoring
const performanceMetrics = {
  totalRequests: 0,
  averageResponseTime: 0,
  errorRate: 0,
  cacheHitRate: 0,
  urlCacheHits: 0,
  urlCacheMisses: 0
};

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// リアルタイム更新を削除してトランザクションベースに変更
// WebSocket機能を無効化してCompute Unit消費を削減

// GoogleニュースのURLかどうかを確認する関数
function isGoogleNewsURL(url: string): boolean {
  return url.includes('news.google.com');
}

// URLから記事情報を取得する関数
async function fetchArticleInfo(url: string) {
  // Check cache first
  const cached = urlCache.get(url);
  if (cached && (Date.now() - cached.cached) < CACHE_TTL) {
    performanceMetrics.urlCacheHits++;
    return { title: cached.title, description: cached.description };
  }
  
  performanceMetrics.urlCacheMisses++;

  try {
    // Googleニュースのリンクかチェック
    if (isGoogleNewsURL(url)) {
      console.log('Google News URL detected:', url);
      // Googleニュースの場合は特別な処理をせず、
      // クライアント側で警告を表示するためにフラグを返す
      return {
        title: 'Google ニュース', 
        description: 'Googleニュースのリンクです。元の記事URLを入力してください。',
        finalUrl: url,
        originalUrl: url,
        ogImage: '',
        isGoogleNews: true
      };
    }
    
    // 通常のURLの場合
    let targetUrl = url;
    
    // 大幅軽量化: 最小限のHTTPリクエストのみでCompute Unit節約
    const response = await fetch(targetUrl, { 
      redirect: 'follow',
      signal: AbortSignal.timeout(3000), // 3秒タイムアウト（短縮）
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TopicBot/1.0)'
      }
    });
    
    const finalUrl = response.url;
    
    // 軽量化: 複雑なエンコード処理を削除、テキストのみ取得
    const html = await response.text();
    
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // タイトルを取得
    const title = document.querySelector('title')?.textContent?.trim() || '';
    
    // 説明（メタディスクリプション）を取得
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ||
                        document.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() || '';
    
    // OGイメージの取得を試みる
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content')?.trim() || '';
    
    // 返り値に最終的なURLと追加情報を含める
    const result = { 
      title, 
      description,
      finalUrl: finalUrl || targetUrl,
      originalUrl: url,
      ogImage
    };

    // Cache the result
    urlCache.set(url, { title, description, cached: Date.now() });

    return result;
  } catch (error) {
    console.error('Error fetching article info:', error);
    return { title: '', description: '', finalUrl: url, originalUrl: url, ogImage: '' };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Performance optimizations: Add compression and security headers
  app.use((req, res, next) => {
    // Add performance and security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Cache static resources
    if (req.url.includes('/assets/') || req.url.includes('.js') || req.url.includes('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    
    next();
  });

  // Rate limiting middleware
  app.use('/api/', (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ 
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
      });
    }
    
    next();
  });

  // Setup Replit authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Week routes
  app.get('/api/weeks', async (req, res) => {
    try {
      const weeks = await storage.getWeeks();
      res.json(weeks);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch weeks' });
    }
  });

  app.get('/api/weeks/active', async (req, res) => {
    try {
      const fingerprint = req.query.fingerprint as string;
      const week = await storage.getActiveWeekWithTopics(fingerprint);
      
      if (!week) {
        return res.status(404).json({ message: 'No active week found' });
      }
      
      res.json(week);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch active week' });
    }
  });

  app.get('/api/weeks/:id', async (req, res) => {
    try {
      const weekId = parseInt(req.params.id);
      const fingerprint = req.query.fingerprint as string;
      
      if (isNaN(weekId)) {
        return res.status(400).json({ message: 'Invalid week ID' });
      }
      
      const week = await storage.getWeekWithTopics(weekId, fingerprint);
      
      if (!week) {
        return res.status(404).json({ message: 'Week not found' });
      }
      
      res.json(week);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch week' });
    }
  });

  app.post('/api/weeks', isAdmin, async (req, res) => {
    try {
      // Validate the request data directly as strings (SQLite stores dates as text)
      const weekData = insertWeekSchema.parse(req.body);
      const week = await storage.createWeek(weekData);
      res.status(201).json(week);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid week data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create week' });
    }
  });

  app.post('/api/weeks/:id/setActive', isAdmin, async (req, res) => {
    try {
      const weekId = parseInt(req.params.id);
      
      if (isNaN(weekId)) {
        return res.status(400).json({ message: 'Invalid week ID' });
      }
      
      await storage.setActiveWeek(weekId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error setting active week:', error);
      res.status(500).json({ 
        message: 'Failed to set active week',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Topic routes
  // POST route must come before GET route to avoid routing conflicts
  app.post('/api/topics', async (req, res) => {
    try {
      // Validate using the submitTopicSchema
      const submissionData = submitTopicSchema.parse(req.body);
      
      // Check for duplicate URL
      const existingTopic = await storage.getTopicByUrl(submissionData.url);
      if (existingTopic) {
        return res.status(409).json({ 
          message: 'このURLは既に投稿されています。', 
          code: 'DUPLICATE_URL',
          existingTopic: {
            id: existingTopic.id,
            title: existingTopic.title,
            submitter: existingTopic.submitter
          }
        });
      }
      
      // Get the active week
      const activeWeek = await storage.getActiveWeek();
      if (!activeWeek) {
        return res.status(400).json({ message: 'No active week available' });
      }
      
      // Generate fingerprint for the submission
      const fingerprint = (req.ip || 'unknown') + (req.get('User-Agent') || 'anonymous');
      const hashedFingerprint = createHash('sha256').update(fingerprint).digest('hex');
      
      // Create the topic with all required fields for storage
      const topicData = {
        weekId: activeWeek.id,
        title: submissionData.title,
        url: submissionData.url,
        description: submissionData.description || null,
        submitter: submissionData.submitter,
        fingerprint: hashedFingerprint,
        status: 'pending'
      };
      
      const topic = await storage.createTopic(topicData);
      
      res.status(201).json(topic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid topic data', errors: error.errors });
      }
      console.error('Topic creation error:', error);
      res.status(500).json({ message: 'Failed to create topic' });
    }
  });

  app.get('/api/topics', async (req, res) => {
    try {
      const weekId = req.query.weekId ? parseInt(req.query.weekId as string) : undefined;
      const status = req.query.status as string;
      
      if (status) {
        const topics = await storage.getTopicsByStatus(status, weekId);
        return res.json(topics);
      }
      
      if (weekId) {
        const topics = await storage.getTopicsByWeekId(weekId);
        return res.json(topics);
      }
      
      res.status(400).json({ message: 'Either weekId or status query parameter is required' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch topics' });
    }
  });

  // Get topics by status from all weeks (for admin deleted view)
  app.get('/api/topics/status/:status', async (req, res) => {
    try {
      const status = req.params.status;
      const topics = await storage.getTopicsByStatus(status);
      res.json(topics);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch topics by status' });
    }
  });

  app.get('/api/topics/:id', async (req, res) => {
    try {
      const topicId = parseInt(req.params.id);
      const fingerprint = req.query.fingerprint as string;
      
      if (isNaN(topicId)) {
        return res.status(400).json({ message: 'Invalid topic ID' });
      }
      
      const topic = await storage.getTopic(topicId, fingerprint);
      
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      res.json(topic);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch topic' });
    }
  });

  // URLから記事情報を取得するAPI
  app.get('/api/fetch-url-info', async (req, res) => {
    try {
      const url = req.query.url as string;
      
      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }
      
      const articleInfo = await fetchArticleInfo(url);
      res.json(articleInfo);
    } catch (error) {
      console.error('Error fetching URL info:', error);
      res.status(500).json({ message: 'Failed to fetch URL info' });
    }
  });

  // Chrome extension version information is now imported from shared/version.ts
  
  // Chrome extension auto-update XML endpoint
  app.get('/api/extension/updates.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml');
    
    const updateXml = `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='backspace-fm-extension'>
    <updatecheck codebase='https://netaspace.replit.app/api/extension/download' version='${EXTENSION_VERSION}' />
  </app>
</gupdate>`;
    
    res.send(updateXml);
  });

  // Chrome extension version info endpoint
  app.get('/api/extension/version', (req, res) => {
    res.json({
      version: EXTENSION_VERSION,
      updateUrl: 'https://netaspace.replit.app/api/extension/updates.xml',
      downloadUrl: 'https://netaspace.replit.app/api/extension/download'
    });
  });

  // Application version info endpoint
  app.get('/api/version', (req, res) => {
    res.json(getVersionInfo());
  });

  // Chrome拡張機能ダウンロードエンドポイント
  app.get('/api/extension/download', async (req, res) => {
    try {
      const extensionDir = path.join(process.cwd(), 'chrome-extension');
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="backspace-fm-extension.zip"');
      
      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });
      
      // Handle errors
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Failed to create extension package' });
        }
      });
      
      // Pipe archive to response
      archive.pipe(res);
      
      // Update manifest.json with current version and server URL
      const manifest = {
        "manifest_version": 3,
        "name": "Backspace.fm ネタ投稿",
        "version": EXTENSION_VERSION,
        "description": "現在のページをbackspace.fmのネタとして簡単に投稿できます",
        "update_url": "https://netaspace.replit.app/api/extension/updates.xml",
        "permissions": ["activeTab", "storage"],
        "host_permissions": [
          "https://*.replit.dev/*",
          "https://*.replit.app/*",
          "http://localhost:*/*"
        ],
        "action": {
          "default_popup": "popup.html",
          "default_title": "Backspace.fm ネタ投稿"
        },
        "content_scripts": [{
          "matches": ["<all_urls>"],
          "js": ["content.js"]
        }],
        "icons": {
          "16": "icons/icon16.png",
          "48": "icons/icon48.png",
          "128": "icons/icon128.png"
        }
      };
      
      // Add manifest.json to archive
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
      
      // Add existing files to archive
      const files = [
        'popup.html', 
        'popup.js',
        'content.js',
        'README.md'
      ];
      
      for (const file of files) {
        const filePath = path.join(extensionDir, file);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: file });
        }
      }
      
      // Add icons directory
      const iconsDir = path.join(extensionDir, 'icons');
      if (fs.existsSync(iconsDir)) {
        const iconFiles = fs.readdirSync(iconsDir);
        for (const iconFile of iconFiles) {
          const iconPath = path.join(iconsDir, iconFile);
          if (fs.statSync(iconPath).isFile()) {
            archive.file(iconPath, { name: `icons/${iconFile}` });
          }
        }
      }
      
      // Finalize the archive
      await archive.finalize();
    } catch (error) {
      console.error('Extension download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to create extension package' });
      }
    }
  });

  // Database export endpoints (admin only)
  app.get('/api/admin/export/json', isAdmin, async (req, res) => {
    try {
      const [weeks, topics] = await Promise.all([
        storage.getWeeks(),
        storage.getTopicsByStatus('featured')
      ]);

      // Get all topics regardless of status for export
      const allTopicsPromises = weeks.map(week => storage.getTopicsByWeekId(week.id));
      const allTopicsArrays = await Promise.all(allTopicsPromises);
      const allTopics = allTopicsArrays.flat();

      // Comments functionality removed

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: getVersionInfo(),
        data: {
          weeks: weeks,
          topics: allTopics,
          statistics: {
            totalWeeks: weeks.length,
            totalTopics: allTopics.length,
            featuredTopics: allTopics.filter(t => t.status === 'featured').length,
            pendingTopics: allTopics.filter(t => t.status === 'pending').length,
            deletedTopics: allTopics.filter(t => t.status === 'deleted').length
          }
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="database-export-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error('JSON export error:', error);
      res.status(500).json({ message: 'Failed to export database' });
    }
  });

  // Performance monitoring endpoints
  app.get('/api/performance', (req, res) => {
    try {
      const metrics = getDatabaseMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      res.status(500).json({ message: 'Failed to get performance metrics' });
    }
  });

  app.post('/api/performance/reset', isAdmin, (req, res) => {
    try {
      resetDatabaseMetrics();
      res.json({ message: 'Performance metrics reset successfully' });
    } catch (error) {
      console.error('Failed to reset performance metrics:', error);
      res.status(500).json({ message: 'Failed to reset performance metrics' });
    }
  });

  app.get('/api/admin/export/csv', isAdmin, async (req, res) => {
    try {
      const weeks = await storage.getWeeks();
      const allTopicsPromises = weeks.map(week => storage.getTopicsByWeekId(week.id));
      const allTopicsArrays = await Promise.all(allTopicsPromises);
      const allTopics = allTopicsArrays.flat();

      // Create CSV content
      let csvContent = 'Week Title,Week Start Date,Week End Date,Topic ID,Topic Title,Topic URL,Topic Description,Submitter,Status,Created At,Featured At,Stars Count\n';
      
      for (const week of weeks) {
        const weekTopics = allTopics.filter(t => t.weekId === week.id);
        
        if (weekTopics.length === 0) {
          // Add week even if it has no topics
          csvContent += `"${week.title}","${week.startDate}","${week.endDate}","","","","","","","","",""\n`;
        } else {
          for (const topic of weekTopics) {
            const description = (topic.description || '').replace(/"/g, '""');
            const title = topic.title.replace(/"/g, '""');
            const submitter = topic.submitter.replace(/"/g, '""');
            const url = topic.url.replace(/"/g, '""');
            
            csvContent += `"${week.title}","${week.startDate}","${week.endDate}","${topic.id}","${title}","${url}","${description}","${submitter}","${topic.status}","${topic.createdAt}","${topic.featuredAt || ''}","${topic.starsCount || 0}"\n`;
          }
        }
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="database-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ message: 'Failed to export database as CSV' });
    }
  });

  // PostgreSQL database export (pg_dump format)
  app.get('/api/admin/export/sql', isAdmin, async (req, res) => {
    try {
      const { spawn } = require('child_process');
      const filename = `database-export-${new Date().toISOString().split('T')[0]}.sql`;

      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Use pg_dump to export the database
      const pgDump = spawn('pg_dump', [process.env.DATABASE_URL]);
      
      pgDump.stdout.pipe(res);
      
      pgDump.stderr.on('data', (data: Buffer) => {
        console.error('pg_dump error:', data.toString());
      });

      pgDump.on('error', (error: Error) => {
        console.error('pg_dump spawn error:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Failed to export PostgreSQL database' });
        }
      });
    } catch (error) {
      console.error('PostgreSQL export error:', error);
      res.status(500).json({ message: 'Failed to export PostgreSQL database' });
    }
  });

  // PostgreSQL backup management endpoints (admin only)
  app.get('/api/admin/backups', isAdmin, async (req, res) => {
    try {
      const backupDir = './data/backups';
      
      // Check if backup directory exists
      if (!fs.existsSync(backupDir)) {
        return res.json([]);
      }

      // Read backup directory for SQL files
      const files = fs.readdirSync(backupDir);
      const backupFiles = files.filter(file => file.endsWith('.sql') || file.endsWith('.gz'));

      // Get file information
      const backups = backupFiles.map(filename => {
        const filePath = path.join(backupDir, filename);
        const stats = fs.statSync(filePath);
        
        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          type: filename.endsWith('.gz') ? 'compressed' : 'sql'
        };
      });

      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(backups);
    } catch (error) {
      console.error('Backup list error:', error);
      res.status(500).json({ message: 'Failed to retrieve backup list' });
    }
  });

  app.get('/api/admin/backups/:filename', isAdmin, async (req, res) => {
    try {
      const { filename } = req.params;
      const backupDir = './data/backups';
      const filePath = path.join(backupDir, filename);

      // Security check: ensure filename is safe for PostgreSQL backups
      if ((!filename.endsWith('.sql') && !filename.endsWith('.gz')) || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ message: 'Invalid backup filename' });
      }

      // Check if backup file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Backup file not found' });
      }

      // Get file stats
      const stats = fs.statSync(filePath);

      // Set appropriate headers for PostgreSQL backup download
      const contentType = filename.endsWith('.gz') ? 'application/gzip' : 'application/sql';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', stats.size);

      // Create read stream and pipe to response
      const readStream = fs.createReadStream(filePath);
      readStream.on('error', (error) => {
        console.error('Backup download stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Failed to stream backup file' });
        }
      });

      readStream.pipe(res);
    } catch (error) {
      console.error('Backup download error:', error);
      res.status(500).json({ message: 'Failed to download backup file' });
    }
  });

  // Performance metrics endpoint (admin only)
  app.get('/api/metrics', isAdmin, (req, res) => {
    const totalCacheRequests = performanceMetrics.urlCacheHits + performanceMetrics.urlCacheMisses;
    const cacheHitRate = totalCacheRequests > 0 ? (performanceMetrics.urlCacheHits / totalCacheRequests) * 100 : 0;
    
    // Get database cache statistics
    const dbCacheStats = (storage as any).getCacheStats ? (storage as any).getCacheStats() : {
      totalCacheRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      cacheSize: 0
    };
    
    res.json({
      ...performanceMetrics,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      totalCacheRequests,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      urlCacheSize: urlCache.size,
      activeConnections: 0, // WebSocket削除によりゼロ固定
      // Database cache metrics
      dbCacheHits: dbCacheStats.cacheHits,
      dbCacheMisses: dbCacheStats.cacheMisses,
      dbCacheHitRate: Math.round(dbCacheStats.cacheHitRate * 100) / 100,
      dbCacheSize: dbCacheStats.cacheSize,
      totalDbCacheRequests: dbCacheStats.totalCacheRequests
    });
  });



  app.patch('/api/topics/:id/status', isAdmin, async (req, res) => {
    try {
      const topicId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (isNaN(topicId)) {
        return res.status(400).json({ message: 'Invalid topic ID' });
      }
      
      if (!status || !['pending', 'approved', 'featured', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const topic = await storage.updateTopicStatus(topicId, status);
      
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      // トランザクションベース実装: リアルタイム更新を削除
      
      res.json(topic);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update topic status' });
    }
  });
  
  // トピック削除エンドポイント（管理者専用）
  app.delete('/api/topics/:id', isAdmin, async (req, res) => {
    try {
      const topicId = parseInt(req.params.id);
      
      if (isNaN(topicId)) {
        return res.status(400).json({ message: 'Invalid topic ID' });
      }
      
      // 削除前にトピック情報を取得（ブロードキャスト用）
      const topic = await storage.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      // 物理削除ではなく、ステータスを「deleted」に変更（論理削除）
      const updatedTopic = await storage.updateTopicStatus(topicId, 'deleted');
      
      if (!updatedTopic) {
        return res.status(500).json({ message: 'Failed to delete topic' });
      }
      
      // トランザクションベース実装: リアルタイム更新を削除
      
      res.json({ success: true, message: 'Topic deleted successfully' });
    } catch (error) {
      console.error('トピック削除エラー:', error);
      res.status(500).json({ message: 'Failed to delete topic' });
    }
  });

  // Comment functionality removed

  // Star routes
  app.post('/api/topics/:id/star', async (req, res) => {
    try {
      const topicId = parseInt(req.params.id);
      const { fingerprint } = req.body;
      
      if (isNaN(topicId)) {
        return res.status(400).json({ message: 'Invalid topic ID' });
      }
      
      if (!fingerprint) {
        return res.status(400).json({ message: 'Fingerprint is required' });
      }
      
      // Check if the topic exists
      const topic = await storage.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      // Check current star status
      const hasStarred = await storage.hasStarred(topicId, fingerprint);
      let success = false;
      let action = '';
      
      if (hasStarred) {
        // User wants to unstar
        success = await storage.removeStar(topicId, fingerprint);
        action = 'unstarred';
      } else {
        // User wants to star
        success = await storage.addStar({
          topicId,
          fingerprint
        });
        action = 'starred';
      }
      
      if (!success) {
        return res.status(400).json({ message: 'Operation failed' });
      }
      
      // Get the updated star count and status
      const starsCount = await storage.getStarsCountByTopicId(topicId);
      const newHasStarred = await storage.hasStarred(topicId, fingerprint);
      
      res.json({ 
        success: true, 
        starsCount, 
        hasStarred: newHasStarred, 
        action 
      });
    } catch (error) {
      console.error('Star operation error:', error);
      res.status(500).json({ message: 'Failed to process star operation' });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocketサーバーをセットアップ
  // WebSocketサーバーを削除してトランザクションベース実装
  // リアルタイム更新の代わりにHTTPリクエスト時にデータ再取得
  
  return httpServer;
}

// Middleware to check if user is authenticated and is an admin
function isAdmin(req: Request, res: Response, next: Function) {
  const user = req.user as any;
  
  if (!req.isAuthenticated() || !user.claims) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Check if this is the specific Replit user (replace with actual user ID)
  const adminUserId = process.env.ADMIN_USER_ID || "your-replit-user-id";
  if (user.claims.sub !== adminUserId) {
    return res.status(403).json({ message: 'Access denied' });
  }

  return next();
}
