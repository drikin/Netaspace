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
import { WebSocketServer, WebSocket } from 'ws';

// WebSocketクライアント管理
const clients = new Set<WebSocket>();

// WebSocketでイベントを全クライアントに送信する関数
function broadcastEvent(eventType: string, data: any) {
  const message = JSON.stringify({ type: eventType, data });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

const MemoryStoreSession = MemoryStore(session);

// GoogleニュースのURLからリダイレクト先URLを抽出する関数
async function extractRealURLFromGoogleNews(url: string) {
  try {
    // GoogleニュースのURLパターンかどうかをチェック
    if (url.includes('news.google.com')) {
      console.log('Extracting from Google News URL:', url);
      
      // Google Newsの特殊リンクの場合、ヘッドレスブラウザのような動作で追跡
      // クッキーなしのリクエストを送信
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        redirect: 'follow',
      });
      
      // 最終的なURLを取得（リダイレクトがあった場合）
      const finalUrl = response.url;
      console.log('Redirected URL from initial fetch:', finalUrl);
      
      // 最終URLがGoogle Newsのものでない場合は成功
      if (finalUrl && !finalUrl.includes('news.google.com')) {
        return finalUrl;
      }
      
      // HTMLを取得して解析
      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // スクリプトタグを探してリダイレクト情報を見つける
      const scripts = document.querySelectorAll('script');
      for (const script of Array.from(scripts)) {
        const content = script.textContent || '';
        // Google Newsは記事のURLを含むJSONを埋め込むことがある
        if (content.includes('originalUrl') || content.includes('url')) {
          try {
            // JSON形式のデータを探す
            const matches = content.match(/\{.*?\}/g);
            if (matches) {
              for (const match of matches) {
                try {
                  const data = JSON.parse(match);
                  if (data.originalUrl && !data.originalUrl.includes('news.google.com')) {
                    console.log('Found originalUrl in script:', data.originalUrl);
                    return data.originalUrl;
                  }
                  if (data.url && typeof data.url === 'string' && !data.url.includes('news.google.com')) {
                    console.log('Found url in script:', data.url);
                    return data.url;
                  }
                } catch (e) {
                  // JSON解析エラーは無視
                }
              }
            }
          } catch (e) {
            // エラーは無視して次のスクリプトへ
          }
        }
      }
      
      // アンカータグからの抽出 - 最も可能性の高いものを特定
      const links = Array.from(document.querySelectorAll('a[href]'))
        .filter(link => {
          const href = link.getAttribute('href') || '';
          return !href.includes('news.google.com') && 
                 !href.includes('support.google.com') && 
                 !href.includes('accounts.google.com') && 
                 !href.includes('javascript:') && 
                 !href.includes('#') &&
                 href.startsWith('http');
        });
      
      // メインコンテンツリンクを見つける
      if (links.length > 0) {
        // テキスト内容があるリンクを優先
        const contentLinks = links.filter(link => link.textContent && link.textContent.trim().length > 20);
        if (contentLinks.length > 0) {
          const href = contentLinks[0].getAttribute('href');
          console.log('Found content link:', href);
          return href || url;
        }
        
        // その他のリンク
        const href = links[0].getAttribute('href');
        console.log('Found external link:', href);
        return href || url;
      }
      
      // データ属性にURLが含まれている場合
      const elementsWithData = document.querySelectorAll('[data-url], [data-href], [data-link]');
      for (const element of Array.from(elementsWithData)) {
        const dataUrl = element.getAttribute('data-url') || 
                      element.getAttribute('data-href') || 
                      element.getAttribute('data-link');
        if (dataUrl && dataUrl.startsWith('http') && !dataUrl.includes('news.google.com')) {
          console.log('Found URL in data attribute:', dataUrl);
          return dataUrl;
        }
      }
      
      // ページ内にcanonicalリンクがある場合はそれを使用
      const canonicalLink = document.querySelector('link[rel="canonical"]');
      if (canonicalLink && canonicalLink.getAttribute('href')) {
        const canonicalUrl = canonicalLink.getAttribute('href');
        if (canonicalUrl && !canonicalUrl.includes('news.google.com')) {
          console.log('Found canonical link:', canonicalUrl);
          return canonicalUrl;
        }
      }
      
      // メタタグからリダイレクト先URLを探す
      const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
      if (metaRefresh) {
        const content = metaRefresh.getAttribute('content');
        if (content) {
          const match = content.match(/URL=([^'"\s]+)/i);
          if (match && match[1]) {
            console.log('Found meta refresh URL:', match[1]);
            return match[1];
          }
        }
      }
      
      // OGURLを探す
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) {
        const content = ogUrl.getAttribute('content');
        if (content && !content.includes('news.google.com')) {
          console.log('Found og:url:', content);
          return content;
        }
      }
      
      // パラメータから直接記事URLを抽出する（最後の手段）
      // news.google.comのURLは時々、元の記事URLをパラメータとして含むことがある
      try {
        const urlObj = new URL(url);
        const urlParams = new URLSearchParams(urlObj.search);
        for (const [key, value] of urlParams.entries()) {
          if (value.startsWith('http') && !value.includes('news.google.com')) {
            console.log('Found URL in params:', value);
            return value;
          }
        }
      } catch (e) {
        // URL解析エラーは無視
      }
    }
    
    // Googleニュースではない場合や、リンクが見つからなかった場合は元のURLを返す
    return url;
  } catch (error) {
    console.error('Error extracting URL from Google News:', error);
    return url;
  }
}

// URLから記事情報を取得する関数
async function fetchArticleInfo(url: string) {
  try {
    // GoogleニュースのURLの場合、実際の記事URLを抽出
    let targetUrl = url;
    if (url.includes('news.google.com')) {
      targetUrl = await extractRealURLFromGoogleNews(url);
      console.log('Extracted URL from Google News:', targetUrl);
    }
    
    // リダイレクトを追跡して最終的なURLを取得
    const response = await fetch(targetUrl, { redirect: 'follow' });
    
    // 最終的なURL（リダイレクト後のURL）を取得
    const finalUrl = response.url;
    
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
    return { 
      title, 
      description,
      finalUrl: finalUrl || targetUrl,
      originalUrl: url,
      ogImage
    };
  } catch (error) {
    console.error('Error fetching article info:', error);
    return { title: '', description: '', finalUrl: url, originalUrl: url, ogImage: '' };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
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
      res.status(500).json({ message: 'Failed to set active week' });
    }
  });

  // Topic routes
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

  app.post('/api/topics', async (req, res) => {
    try {
      // Validate using the submitTopicSchema
      const submissionData = submitTopicSchema.parse(req.body);
      
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
      
      // 新しいトピックが作成されたことをブロードキャスト（完全なトピックデータを含める）
      const topicWithDetails = await storage.getTopic(topic.id);
      broadcastEvent('topic_created', { 
        topicId: topic.id, 
        weekId: topic.weekId,
        topic: topicWithDetails
      });
      
      res.status(201).json(topic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid topic data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create topic' });
    }
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
      
      // トピックのステータスが変更されたことをブロードキャスト（完全なトピックデータを含める）
      const fullTopic = await storage.getTopic(topic.id);
      broadcastEvent('topic_status_changed', { 
        topicId: topic.id, 
        weekId: topic.weekId, 
        status: topic.status,
        topic: fullTopic
      });
      
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
      
      const success = await storage.deleteTopic(topicId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete topic' });
      }
      
      // トピックが削除されたことをブロードキャスト
      broadcastEvent('topic_deleted', { 
        topicId: topic.id,
        weekId: topic.weekId
      });
      
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
      
      // 新しいコメントが追加されたことをブロードキャスト
      broadcastEvent('comment_added', { 
        commentId: comment.id, 
        topicId: comment.topicId 
      });
      
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
      
      // スターが追加されたことをブロードキャスト
      broadcastEvent('star_added', { 
        topicId, 
        starsCount 
      });
      
      res.json({ success: true, starsCount });
    } catch (error) {
      res.status(500).json({ message: 'Failed to star topic' });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocketサーバーをセットアップ
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    // 新しいクライアント接続
    clients.add(ws);
    console.log('WebSocket client connected, total clients:', clients.size);
    
    // クライアント切断時の処理
    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket client disconnected, remaining clients:', clients.size);
    });
  });
  
  return httpServer;
}

// Middleware to check if user is authenticated and is an admin
function isAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && (req.user as any)?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: 'Access denied' });
}
