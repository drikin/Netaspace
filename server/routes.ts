import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertTopicSchema, 
  insertCommentSchema, 
  insertStarSchema,
  insertWeekSchema,
  submitTopicSchema,
  submitCommentSchema,
} from "@shared/schema";
import { z } from "zod";
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import MemoryStore from 'memorystore';
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

const MemoryStoreSession = MemoryStore(session);

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

  // Session setup
  app.use(session({
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || 'backspace-fm-podcast-topics-app',
    resave: true,
    saveUninitialized: true,
    cookie: { 
      secure: false, // デプロイ環境でもHTTPSが確実でない場合はfalseに設定
      maxAge: 86400000, // 24 hours
      sameSite: 'lax'
    }
  }));

  // Passport setup
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return done(null, false, { message: 'Incorrect username or password' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    res.json({ user: req.user });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/auth/me', (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
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
      // Convert date strings to Date objects before validation
      const requestData = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };
      
      const weekData = insertWeekSchema.parse(requestData);
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
      res.status(500).json({ message: 'Failed to set active week' });
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
      
      // Create the topic with the active week ID and default status
      const topicData = {
        ...submissionData,
        weekId: activeWeek.id,
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

  // Comment routes
  app.post('/api/topics/:id/comments', async (req, res) => {
    try {
      const topicId = parseInt(req.params.id);
      
      if (isNaN(topicId)) {
        return res.status(400).json({ message: 'Invalid topic ID' });
      }
      
      // Validate using the submitCommentSchema
      const commentData = submitCommentSchema.parse(req.body);
      
      // Check if the topic exists
      const topic = await storage.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      // Create the comment
      const comment = await storage.createComment({
        ...commentData,
        topicId
      });
      
      // トランザクションベース実装: リアルタイム更新を削除
      
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid comment data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create comment' });
    }
  });

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
      
      // Try to add the star
      const starred = await storage.addStar({
        topicId,
        fingerprint
      });
      
      if (!starred) {
        return res.status(400).json({ message: 'Already starred' });
      }
      
      // Get the updated star count
      const starsCount = await storage.getStarsCountByTopicId(topicId);
      
      // トランザクションベース実装: リアルタイム更新を削除
      
      res.json({ success: true, starsCount });
    } catch (error) {
      res.status(500).json({ message: 'Failed to star topic' });
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
  if (req.isAuthenticated() && (req.user as any)?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: 'Access denied' });
}
