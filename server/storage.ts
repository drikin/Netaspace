import {
  Topic, InsertTopic, Comment, InsertComment,
  Week, InsertWeek, Star, InsertStar, User, InsertUser,
  topics, comments, weeks, stars, users,
  WeekWithTopics, TopicWithCommentsAndStars
} from "@shared/schema";
import { eq, desc, asc, and, gt, lt, isNull, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Week operations
  getWeeks(): Promise<Week[]>;
  getActiveWeek(): Promise<Week | undefined>;
  createWeek(week: InsertWeek): Promise<Week>;
  setActiveWeek(weekId: number): Promise<void>;
  
  // Topic operations
  getTopicsByWeekId(weekId: number): Promise<TopicWithCommentsAndStars[]>;
  getTopicsByStatus(status: string, weekId?: number): Promise<TopicWithCommentsAndStars[]>;
  getTopic(id: number, fingerprint?: string): Promise<TopicWithCommentsAndStars | undefined>;
  getTopicByUrl(url: string): Promise<Topic | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopicStatus(id: number, status: string): Promise<Topic | undefined>;
  deleteTopic(id: number): Promise<boolean>;
  
  // Comment operations
  getCommentsByTopicId(topicId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // Star operations
  addStar(star: InsertStar): Promise<boolean>;
  hasStarred(topicId: number, fingerprint: string): Promise<boolean>;
  getStarsCountByTopicId(topicId: number): Promise<number>;
  
  // Combined operations
  getWeekWithTopics(weekId: number, fingerprint?: string): Promise<WeekWithTopics | undefined>;
  getActiveWeekWithTopics(fingerprint?: string): Promise<WeekWithTopics | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private weeks: Map<number, Week>;
  private topics: Map<number, Topic>;
  private comments: Map<number, Comment>;
  private stars: Map<number, Star>;
  
  private userIdCounter: number;
  private weekIdCounter: number;
  private topicIdCounter: number;
  private commentIdCounter: number;
  private starIdCounter: number;

  constructor() {
    this.users = new Map();
    this.weeks = new Map();
    this.topics = new Map();
    this.comments = new Map();
    this.stars = new Map();
    
    this.userIdCounter = 1;
    this.weekIdCounter = 1;
    this.topicIdCounter = 1;
    this.commentIdCounter = 1;
    this.starIdCounter = 1;
    
    // Add a default admin user
    this.createUser({
      username: "admin",
      password: "admin",
      isAdmin: true,
      email: "admin@example.com"
    });
    
    // Create initial week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    this.createWeek({
      startDate: startOfWeek,
      endDate: endOfWeek,
      title: `${startOfWeek.getFullYear()}年${startOfWeek.getMonth() + 1}月${startOfWeek.getDate()}日〜${endOfWeek.getMonth() + 1}月${endOfWeek.getDate()}日`,
      isActive: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
  
  // Week operations
  async getWeeks(): Promise<Week[]> {
    return Array.from(this.weeks.values()).sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  }

  async getActiveWeek(): Promise<Week | undefined> {
    return Array.from(this.weeks.values()).find(week => week.isActive);
  }

  async createWeek(week: InsertWeek): Promise<Week> {
    const id = this.weekIdCounter++;
    const newWeek: Week = { ...week, id };
    
    // If this week is set to active, deactivate all other weeks
    if (newWeek.isActive) {
      for (const week of this.weeks.values()) {
        if (week.isActive) {
          week.isActive = false;
        }
      }
    }
    
    this.weeks.set(id, newWeek);
    return newWeek;
  }

  async setActiveWeek(weekId: number): Promise<void> {
    for (const week of this.weeks.values()) {
      week.isActive = week.id === weekId;
    }
  }
  
  // Topic operations
  async getTopicsByWeekId(weekId: number): Promise<TopicWithCommentsAndStars[]> {
    const topicsInWeek = Array.from(this.topics.values())
      .filter(topic => topic.weekId === weekId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return Promise.all(topicsInWeek.map(async topic => {
      const comments = await this.getCommentsByTopicId(topic.id);
      const starsCount = await this.getStarsCountByTopicId(topic.id);
      
      return {
        ...topic,
        comments,
        starsCount
      };
    }));
  }

  async getTopicsByStatus(status: string, weekId?: number): Promise<TopicWithCommentsAndStars[]> {
    let filtered = Array.from(this.topics.values())
      .filter(topic => topic.status === status);
    
    if (weekId) {
      filtered = filtered.filter(topic => topic.weekId === weekId);
    }
    
    filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return Promise.all(filtered.map(async topic => {
      const comments = await this.getCommentsByTopicId(topic.id);
      const starsCount = await this.getStarsCountByTopicId(topic.id);
      
      return {
        ...topic,
        comments,
        starsCount
      };
    }));
  }

  async getTopic(id: number, fingerprint?: string): Promise<TopicWithCommentsAndStars | undefined> {
    const topic = this.topics.get(id);
    if (!topic) return undefined;
    
    const comments = await this.getCommentsByTopicId(id);
    const starsCount = await this.getStarsCountByTopicId(id);
    let hasStarred = false;
    
    if (fingerprint) {
      hasStarred = await this.hasStarred(id, fingerprint);
    }
    
    return {
      ...topic,
      comments,
      starsCount,
      hasStarred
    };
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const id = this.topicIdCounter++;
    const now = new Date();
    const newTopic: Topic = { 
      ...topic, 
      id, 
      createdAt: now,
      stars: 0,
      featuredAt: null
    };
    
    this.topics.set(id, newTopic);
    return newTopic;
  }

  async getTopicByUrl(url: string): Promise<Topic | undefined> {
    return Array.from(this.topics.values()).find(topic => topic.url === url);
  }

  async updateTopicStatus(id: number, status: string): Promise<Topic | undefined> {
    const topic = this.topics.get(id);
    if (!topic) return undefined;
    
    topic.status = status;
    
    // 採用された場合は現在の時刻を記録
    if (status === "featured") {
      topic.featuredAt = new Date();
    }
    // 採用以外のステータスに変更する場合はfeaturedAtをクリア
    else if (status !== "featured") {
      topic.featuredAt = null;
    }
    
    return topic;
  }
  
  async deleteTopic(id: number): Promise<boolean> {
    if (!this.topics.has(id)) return false;
    
    // 関連するコメントを削除
    const commentsToDelete = Array.from(this.comments.entries())
      .filter(([_, comment]) => comment.topicId === id)
      .map(([id]) => id);
    
    commentsToDelete.forEach(commentId => this.comments.delete(commentId));
    
    // 関連するスターを削除
    const starsToDelete = Array.from(this.stars.entries())
      .filter(([_, star]) => star.topicId === id)
      .map(([id]) => id);
    
    starsToDelete.forEach(starId => this.stars.delete(starId));
    
    // トピックを削除
    return this.topics.delete(id);
  }
  
  // Comment operations
  async getCommentsByTopicId(topicId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.topicId === topicId)
      .sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const id = this.commentIdCounter++;
    const now = new Date();
    const newComment: Comment = { ...comment, id, createdAt: now };
    
    this.comments.set(id, newComment);
    return newComment;
  }
  
  // Star operations
  async addStar(star: InsertStar): Promise<boolean> {
    // Check if this fingerprint has already starred this topic
    const hasStarred = await this.hasStarred(star.topicId, star.fingerprint);
    if (hasStarred) return false;
    
    // Add star
    const id = this.starIdCounter++;
    const now = new Date();
    const newStar: Star = { ...star, id, createdAt: now };
    
    this.stars.set(id, newStar);
    
    // Increment topic stars count
    const topic = this.topics.get(star.topicId);
    if (topic) {
      topic.stars += 1;
    }
    
    return true;
  }

  async hasStarred(topicId: number, fingerprint: string): Promise<boolean> {
    return Array.from(this.stars.values()).some(
      star => star.topicId === topicId && star.fingerprint === fingerprint
    );
  }

  async getStarsCountByTopicId(topicId: number): Promise<number> {
    return Array.from(this.stars.values()).filter(
      star => star.topicId === topicId
    ).length;
  }
  
  // Combined operations
  async getWeekWithTopics(weekId: number, fingerprint?: string): Promise<WeekWithTopics | undefined> {
    const week = this.weeks.get(weekId);
    if (!week) return undefined;
    
    const weekTopics = await this.getTopicsByWeekId(weekId);
    
    if (fingerprint) {
      // Check for each topic if the user has starred it
      for (const topic of weekTopics) {
        topic.hasStarred = await this.hasStarred(topic.id, fingerprint);
      }
    }
    
    return {
      ...week,
      topics: weekTopics
    };
  }

  async getActiveWeekWithTopics(fingerprint?: string): Promise<WeekWithTopics | undefined> {
    const activeWeek = await this.getActiveWeek();
    if (!activeWeek) return undefined;
    
    return this.getWeekWithTopics(activeWeek.id, fingerprint);
  }
}

// If using Supabase/PostgreSQL, this would be the implementation
export class PostgresStorage implements IStorage {
  db: ReturnType<typeof drizzle>;
  private queryCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 seconds cache

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    // PostgreSQL接続を最適化
    const client = postgres(process.env.DATABASE_URL, {
      max: 30,                    // 最大接続数を増加
      idle_timeout: 10,           // アイドルタイムアウトを短縮
      connect_timeout: 5,         // 接続タイムアウトを短縮
      prepare: false,             // プリペアードステートメントを無効化（高速化）
      transform: {
        undefined: null,          // undefinedをnullに変換
      },
      fetch_types: false,         // 型取得を無効化（高速化）
      publications: 'all',        // すべてのパブリケーションを使用
      target_session_attrs: 'read-write', // 読み書き可能なセッションを優先
    });
    this.db = drizzle(client);
  }

  // Query caching helper methods
  private getCacheKey(method: string, ...params: any[]): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.queryCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.queryCache.set(key, { data, timestamp: Date.now() });
  }

  private clearCacheByPattern(pattern: string): void {
    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
      }
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db
      .insert(users)
      .values(user)
      .returning();
    
    return result[0];
  }
  
  // Week operations
  async getWeeks(): Promise<Week[]> {
    return this.db
      .select()
      .from(weeks)
      .orderBy(desc(weeks.startDate));
  }

  async getActiveWeek(): Promise<Week | undefined> {
    const cacheKey = this.getCacheKey('getActiveWeek');
    const cached = this.getFromCache<Week>(cacheKey);
    if (cached) return cached;

    const result = await this.db
      .select()
      .from(weeks)
      .where(eq(weeks.isActive, true))
      .limit(1);
    
    const activeWeek = result[0];
    if (activeWeek) {
      this.setCache(cacheKey, activeWeek);
    }
    
    return activeWeek;
  }

  async createWeek(week: InsertWeek): Promise<Week> {
    // If this week is set to active, deactivate all other weeks
    if (week.isActive) {
      await this.db
        .update(weeks)
        .set({ isActive: false })
        .where(eq(weeks.isActive, true));
    }
    
    const result = await this.db
      .insert(weeks)
      .values(week)
      .returning();
    
    return result[0];
  }

  async setActiveWeek(weekId: number): Promise<void> {
    // First deactivate all weeks
    await this.db
      .update(weeks)
      .set({ isActive: false });
    
    // Then activate the selected week
    await this.db
      .update(weeks)
      .set({ isActive: true })
      .where(eq(weeks.id, weekId));
  }
  
  // Topic operations
  async getTopicsByWeekId(weekId: number): Promise<TopicWithCommentsAndStars[]> {
    const cacheKey = this.getCacheKey('getTopicsByWeekId', weekId);
    const cached = this.getFromCache<TopicWithCommentsAndStars[]>(cacheKey);
    if (cached) return cached;

    // 一括でトピックを取得
    const topicsResult = await this.db
      .select()
      .from(topics)
      .where(eq(topics.weekId, weekId))
      .orderBy(desc(topics.createdAt));
    
    if (topicsResult.length === 0) return [];
    
    const topicIds = topicsResult.map(t => t.id);
    
    // 一括でコメントを取得
    const commentsResult = await this.db
      .select()
      .from(comments)
      .where(inArray(comments.topicId, topicIds))
      .orderBy(asc(comments.createdAt));
    
    // 一括で星の数を取得
    const starsResult = await this.db
      .select({
        topicId: stars.topicId,
        count: sql<number>`count(*)`.as('count')
      })
      .from(stars)
      .where(inArray(stars.topicId, topicIds))
      .groupBy(stars.topicId);
    
    // データを整理
    const commentsMap = new Map<number, Comment[]>();
    const starsMap = new Map<number, number>();
    
    commentsResult.forEach(comment => {
      if (!commentsMap.has(comment.topicId)) {
        commentsMap.set(comment.topicId, []);
      }
      commentsMap.get(comment.topicId)!.push(comment);
    });
    
    starsResult.forEach(({ topicId, count }) => {
      starsMap.set(topicId, count);
    });
    
    // 結果を組み立て
    const result = topicsResult.map(topic => ({
      ...topic,
      comments: commentsMap.get(topic.id) || [],
      starsCount: starsMap.get(topic.id) || 0
    }));

    // Cache the result
    this.setCache(cacheKey, result);
    return result;
  }

  async getTopicsByStatus(status: string, weekId?: number): Promise<TopicWithCommentsAndStars[]> {
    let whereConditions = [eq(topics.status, status)];
    
    if (weekId) {
      whereConditions.push(eq(topics.weekId, weekId));
    }
    
    const topicsResult = await this.db
      .select()
      .from(topics)
      .where(and(...whereConditions))
      .orderBy(desc(topics.createdAt));
    
    if (topicsResult.length === 0) return [];
    
    const topicIds = topicsResult.map(t => t.id);
    
    // 一括でコメントと星を取得
    const [commentsResult, starsResult] = await Promise.all([
      this.db
        .select()
        .from(comments)
        .where(inArray(comments.topicId, topicIds))
        .orderBy(asc(comments.createdAt)),
      this.db
        .select({
          topicId: stars.topicId,
          count: sql<number>`count(*)`.as('count')
        })
        .from(stars)
        .where(inArray(stars.topicId, topicIds))
        .groupBy(stars.topicId)
    ]);
    
    // データを整理
    const commentsMap = new Map<number, Comment[]>();
    const starsMap = new Map<number, number>();
    
    commentsResult.forEach(comment => {
      if (!commentsMap.has(comment.topicId)) {
        commentsMap.set(comment.topicId, []);
      }
      commentsMap.get(comment.topicId)!.push(comment);
    });
    
    starsResult.forEach(({ topicId, count }) => {
      starsMap.set(topicId, count);
    });
    
    return topicsResult.map(topic => ({
      ...topic,
      comments: commentsMap.get(topic.id) || [],
      starsCount: starsMap.get(topic.id) || 0
    }));
  }

  async getTopic(id: number, fingerprint?: string): Promise<TopicWithCommentsAndStars | undefined> {
    const result = await this.db
      .select()
      .from(topics)
      .where(eq(topics.id, id))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    const topic = result[0];
    const comments = await this.getCommentsByTopicId(id);
    const starsCount = await this.getStarsCountByTopicId(id);
    let hasStarred = false;
    
    if (fingerprint) {
      hasStarred = await this.hasStarred(id, fingerprint);
    }
    
    return {
      ...topic,
      comments,
      starsCount,
      hasStarred
    };
  }

  async getTopicByUrl(url: string): Promise<Topic | undefined> {
    const result = await this.db
      .select()
      .from(topics)
      .where(eq(topics.url, url))
      .limit(1);
    
    return result[0];
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const result = await this.db
      .insert(topics)
      .values(topic)
      .returning();
    
    // Invalidate related caches
    this.clearCacheByPattern('getTopicsByWeekId');
    this.clearCacheByPattern('getTopicsByStatus');
    this.clearCacheByPattern('getActiveWeekWithTopics');
    
    return result[0];
  }

  async updateTopicStatus(id: number, status: string): Promise<Topic | undefined> {
    const updateData: any = { status };
    
    // 採用された場合は現在の時刻を記録
    if (status === "featured") {
      updateData.featuredAt = new Date();
    }
    // 採用以外のステータスに変更する場合はfeaturedAtをクリア
    else if (status !== "featured") {
      updateData.featuredAt = null;
    }
    
    const result = await this.db
      .update(topics)
      .set(updateData)
      .where(eq(topics.id, id))
      .returning();
    
    // Invalidate related caches
    this.clearCacheByPattern('getTopicsByWeekId');
    this.clearCacheByPattern('getTopicsByStatus');
    this.clearCacheByPattern('getActiveWeekWithTopics');
    this.clearCacheByPattern('getTopic');
    
    return result[0];
  }
  
  async deleteTopic(id: number): Promise<boolean> {
    try {
      // まず関連するスターとコメントを削除
      await this.db
        .delete(stars)
        .where(eq(stars.topicId, id));
        
      await this.db
        .delete(comments)
        .where(eq(comments.topicId, id));
      
      // 次にトピック自体を削除
      const result = await this.db
        .delete(topics)
        .where(eq(topics.id, id))
        .returning();
      
      // Invalidate related caches
      this.clearCacheByPattern('getTopicsByWeekId');
      this.clearCacheByPattern('getTopicsByStatus');
      this.clearCacheByPattern('getActiveWeekWithTopics');
      this.clearCacheByPattern('getTopic');
      
      return result.length > 0;
    } catch (error) {
      console.error('トピック削除エラー:', error);
      return false;
    }
  }
  
  // Comment operations
  async getCommentsByTopicId(topicId: number): Promise<Comment[]> {
    return this.db
      .select()
      .from(comments)
      .where(eq(comments.topicId, topicId))
      .orderBy(comments.createdAt);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const result = await this.db
      .insert(comments)
      .values(comment)
      .returning();
    
    // Invalidate related caches
    this.clearCacheByPattern('getTopicsByWeekId');
    this.clearCacheByPattern('getActiveWeekWithTopics');
    
    return result[0];
  }
  
  // Star operations
  async addStar(star: InsertStar): Promise<boolean> {
    // Check if this fingerprint has already starred this topic
    const hasStarred = await this.hasStarred(star.topicId, star.fingerprint);
    if (hasStarred) return false;
    
    // Add star
    await this.db
      .insert(stars)
      .values(star);
    
    // Increment topic stars count
    await this.db
      .update(topics)
      .set({
        stars: sql`${topics.stars} + 1`
      })
      .where(eq(topics.id, star.topicId));
    
    // Invalidate related caches
    this.clearCacheByPattern('getTopicsByWeekId');
    this.clearCacheByPattern('getActiveWeekWithTopics');
    
    return true;
  }

  async hasStarred(topicId: number, fingerprint: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(stars)
      .where(and(
        eq(stars.topicId, topicId),
        eq(stars.fingerprint, fingerprint)
      ))
      .limit(1);
    
    return result.length > 0;
  }

  async getStarsCountByTopicId(topicId: number): Promise<number> {
    const result = await this.db
      .select({ count: sql`count(*)` })
      .from(stars)
      .where(eq(stars.topicId, topicId));
    
    return Number(result[0].count);
  }
  
  // Combined operations
  async getWeekWithTopics(weekId: number, fingerprint?: string): Promise<WeekWithTopics | undefined> {
    const weekResult = await this.db
      .select()
      .from(weeks)
      .where(eq(weeks.id, weekId))
      .limit(1);
    
    if (weekResult.length === 0) return undefined;
    
    const week = weekResult[0];
    const weekTopics = await this.getTopicsByWeekId(weekId);
    
    // フィンガープリントがある場合、一括でスター情報を取得
    if (fingerprint && weekTopics.length > 0) {
      const topicIds = weekTopics.map(t => t.id);
      const userStars = await this.db
        .select({ topicId: stars.topicId })
        .from(stars)
        .where(
          and(
            inArray(stars.topicId, topicIds),
            eq(stars.fingerprint, fingerprint)
          )
        );
      
      const starredTopicIds = new Set(userStars.map(s => s.topicId));
      
      weekTopics.forEach(topic => {
        topic.hasStarred = starredTopicIds.has(topic.id);
      });
    }
    
    return {
      ...week,
      topics: weekTopics
    };
  }

  async getActiveWeekWithTopics(fingerprint?: string): Promise<WeekWithTopics | undefined> {
    const activeWeek = await this.getActiveWeek();
    if (!activeWeek) return undefined;
    
    return this.getWeekWithTopics(activeWeek.id, fingerprint);
  }
}

// Use the appropriate storage implementation
// If DATABASE_URL is set, use PostgresStorage, otherwise use MemStorage
export const storage: IStorage = process.env.DATABASE_URL
  ? new PostgresStorage()
  : new MemStorage();
