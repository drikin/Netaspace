import { eq, desc, and, not, sql, inArray } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import { db } from './db';

// In-memory cache for frequently accessed data
const queryCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes - increased for better performance

function getCachedResult<T>(key: string): T | null {
  const cached = queryCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.data as T;
  }
  queryCache.delete(key);
  return null;
}

function setCachedResult<T>(key: string, data: T): void {
  queryCache.set(key, {
    data,
    expiry: Date.now() + CACHE_TTL
  });
}

function clearActiveWeekCache(): void {
  // Clear all active week related cache entries
  for (const key of queryCache.keys()) {
    if (key.startsWith('active_week_topics:')) {
      queryCache.delete(key);
    }
  }
}

import {
  users,
  weeks,
  topics,
  stars,
  type User,
  type Week,
  type Topic,
  type Star,
  type InsertUser,
  type InsertWeek,
  type InsertTopic,
  type InsertStar,
  type TopicWithCommentsAndStars,
  type WeekWithTopics
} from '@shared/schema';

// Performance monitoring
interface PerformanceMetrics {
  totalQueries: number;
  slowQueries: number;
  averageQueryTime: number;
  totalQueryTime: number;
  connectionCount: number;
  errors: number;
}

class DatabasePerformanceMonitor {
  private metrics: PerformanceMetrics = {
    totalQueries: 0,
    slowQueries: 0,
    averageQueryTime: 0,
    totalQueryTime: 0,
    connectionCount: 0,
    errors: 0
  };

  recordQuery(duration: number, queryType: string) {
    this.metrics.totalQueries++;
    this.metrics.totalQueryTime += duration;
    this.metrics.averageQueryTime = this.metrics.totalQueryTime / this.metrics.totalQueries;
    
    // Log slow queries (over 200ms for production with remote DB)
    const threshold = SLOW_QUERY_THRESHOLD;
    if (duration > threshold) {
      this.metrics.slowQueries++;
      console.warn(`Slow query detected: ${queryType} took ${duration}ms`);
    }
  }

  recordError(error: Error, queryType: string) {
    this.metrics.errors++;
    console.error(`Database error in ${queryType}:`, error.message);
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      totalQueryTime: 0,
      connectionCount: 0,
      errors: 0
    };
  }
}

const performanceMonitor = new DatabasePerformanceMonitor();

// Simple performance optimization: reduce slow query threshold for production
const SLOW_QUERY_THRESHOLD = process.env.NODE_ENV === 'production' ? 200 : 100;

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
  
  // Star operations
  addStar(star: InsertStar): Promise<boolean>;
  removeStar(topicId: number, fingerprint: string): Promise<boolean>;
  hasStarred(topicId: number, fingerprint: string): Promise<boolean>;
  getStarsCountByTopicId(topicId: number): Promise<number>;
  
  // Combined operations
  getWeekWithTopics(weekId: number, fingerprint?: string): Promise<WeekWithTopics | undefined>;
  getActiveWeekWithTopics(fingerprint?: string): Promise<WeekWithTopics | undefined>;
}

// PostgreSQL database implementation using the existing connection
class PostgreSQLStorage implements IStorage {
  constructor() {
    console.log('Using PostgreSQL database with connection pool');
  }

  private async executeWithMonitoring<T>(
    operation: () => Promise<T>,
    queryType: string
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      performanceMonitor.recordQuery(duration, queryType);
      return result;
    } catch (error) {
      performanceMonitor.recordError(error as Error, queryType);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      return result[0];
    }, 'getUser');
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      return result[0];
    }, 'getUserByUsername');
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .insert(users)
        .values(user)
        .returning();
      
      return result[0];
    }, 'createUser');
  }

  async getWeeks(): Promise<Week[]> {
    return this.executeWithMonitoring(async () => {
      return await db
        .select()
        .from(weeks)
        .orderBy(desc(weeks.startDate));
    }, 'getWeeks');
  }

  async getActiveWeek(): Promise<Week | undefined> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .select()
        .from(weeks)
        .where(eq(weeks.isActive, true))
        .limit(1);
      
      return result[0];
    }, 'getActiveWeek');
  }

  async createWeek(week: InsertWeek): Promise<Week> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .insert(weeks)
        .values(week)
        .returning();
      
      return result[0];
    }, 'createWeek');
  }

  async setActiveWeek(weekId: number): Promise<void> {
    return this.executeWithMonitoring(async () => {
      // First, set all weeks to inactive
      await db
        .update(weeks)
        .set({ isActive: false });
      
      // Then set the specified week to active
      await db
        .update(weeks)
        .set({ isActive: true })
        .where(eq(weeks.id, weekId));
    }, 'setActiveWeek');
  }

  async getTopicsByWeekId(weekId: number): Promise<TopicWithCommentsAndStars[]> {
    return this.executeWithMonitoring(async () => {
      console.log('PostgreSQL connection acquired from pool');
      
      // Highly optimized single query with subquery for star counts
      const results = await db
        .select({
          id: topics.id,
          title: topics.title,
          url: topics.url,
          description: topics.description,
          submitter: topics.submitter,
          fingerprint: topics.fingerprint,
          weekId: topics.weekId,
          status: topics.status,
          createdAt: topics.createdAt,
          stars: topics.stars,
          featuredAt: topics.featuredAt,
          starsCount: sql<number>`(
            SELECT COUNT(*) 
            FROM ${stars} 
            WHERE ${stars.topicId} = ${topics.id}
          )`.as('starsCount')
        })
        .from(topics)
        .where(eq(topics.weekId, weekId))
        .orderBy(desc(topics.createdAt));
      
      return results.map(row => ({
        ...row,
        starsCount: Number(row.starsCount),
        hasStarred: false
      }));
    }, 'getTopicsByWeekId');
  }

  async getTopicsByStatus(status: string, weekId?: number): Promise<TopicWithCommentsAndStars[]> {
    return this.executeWithMonitoring(async () => {
      let query = db
        .select()
        .from(topics)
        .where(eq(topics.status, status));
      
      if (weekId !== undefined) {
        query = db
          .select()
          .from(topics)
          .where(and(eq(topics.status, status), eq(topics.weekId, weekId)));
      }
      
      const topicsResult = await query.orderBy(desc(topics.createdAt));
      return await this.enrichTopicsWithCommentsAndStars(topicsResult);
    }, 'getTopicsByStatus');
  }

  private async enrichTopicsWithCommentsAndStars(topicsResult: Topic[]): Promise<TopicWithCommentsAndStars[]> {
    if (topicsResult.length === 0) return [];
    
    // Get all star counts in a single query instead of N+1 queries
    const topicIds = topicsResult.map(topic => topic.id);
    const starCounts = await db
      .select({
        topicId: stars.topicId,
        count: count(stars.id).as('count')
      })
      .from(stars)
      .where(inArray(stars.topicId, topicIds))
      .groupBy(stars.topicId);
    
    // Create a map for quick lookup
    const starCountMap = new Map<number, number>();
    starCounts.forEach(row => {
      starCountMap.set(row.topicId, Number(row.count));
    });
    
    // Enrich topics with star counts
    return topicsResult.map(topic => ({
      ...topic,
      starsCount: starCountMap.get(topic.id) || 0,
      hasStarred: false // Will be set by the caller if fingerprint is provided
    }));
  }

  async getTopic(id: number, fingerprint?: string): Promise<TopicWithCommentsAndStars | undefined> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .select()
        .from(topics)
        .where(eq(topics.id, id))
        .limit(1);
      
      if (!result[0]) return undefined;
      
      const topic = result[0];
      const starsCount = await this.getStarsCountByTopicId(topic.id);
      const hasStarred = fingerprint ? await this.hasStarred(topic.id, fingerprint) : false;
      
      return {
        ...topic,
        starsCount,
        hasStarred
      };
    }, 'getTopic');
  }

  async getTopicByUrl(url: string): Promise<Topic | undefined> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .select()
        .from(topics)
        .where(eq(topics.url, url))
        .limit(1);
      
      return result[0];
    }, 'getTopicByUrl');
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .insert(topics)
        .values(topic)
        .returning();
      
      // Refresh materialized view after topic creation to ensure UI consistency
      try {
        await db.execute(sql`REFRESH MATERIALIZED VIEW active_week_topics`);
        console.log('Materialized view refreshed after topic creation');
      } catch (error) {
        console.warn('Failed to refresh materialized view:', error);
        // Don't fail the topic creation if view refresh fails
      }
      
      // Clear cache to ensure immediate UI updates
      clearActiveWeekCache();
      
      return result[0];
    }, 'createTopic');
  }

  async updateTopicStatus(id: number, status: string): Promise<Topic | undefined> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .update(topics)
        .set({ status })
        .where(eq(topics.id, id))
        .returning();
      
      // Refresh materialized view after status update to ensure UI consistency
      try {
        await db.execute(sql`REFRESH MATERIALIZED VIEW active_week_topics`);
        console.log('Materialized view refreshed after topic status update');
      } catch (error) {
        console.warn('Failed to refresh materialized view:', error);
      }
      
      // Clear cache to ensure immediate UI updates
      clearActiveWeekCache();
      
      return result[0];
    }, 'updateTopicStatus');
  }

  async deleteTopic(id: number): Promise<boolean> {
    return this.executeWithMonitoring(async () => {
      // First delete related stars
      await db
        .delete(stars)
        .where(eq(stars.topicId, id));
      
      // Then delete the topic
      const result = await db
        .delete(topics)
        .where(eq(topics.id, id));
      
      // Refresh materialized view after topic deletion to ensure UI consistency
      try {
        await db.execute(sql`REFRESH MATERIALIZED VIEW active_week_topics`);
        console.log('Materialized view refreshed after topic deletion');
      } catch (error) {
        console.warn('Failed to refresh materialized view:', error);
      }
      
      // Clear cache to ensure immediate UI updates
      clearActiveWeekCache();
      
      return true;
    }, 'deleteTopic');
  }

  async addStar(star: InsertStar): Promise<boolean> {
    return this.executeWithMonitoring(async () => {
      try {
        await db
          .insert(stars)
          .values(star);
        
        // Refresh materialized view after star addition to update star counts
        try {
          await db.execute(sql`REFRESH MATERIALIZED VIEW active_week_topics`);
          console.log('Materialized view refreshed after star addition');
        } catch (error) {
          console.warn('Failed to refresh materialized view:', error);
        }
        
        // Clear cache to ensure immediate UI updates
        clearActiveWeekCache();
        
        return true;
      } catch (error) {
        // Handle unique constraint violation (user already starred this topic)
        return false;
      }
    }, 'addStar');
  }

  async removeStar(topicId: number, fingerprint: string): Promise<boolean> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .delete(stars)
        .where(and(eq(stars.topicId, topicId), eq(stars.fingerprint, fingerprint)));
      
      // Refresh materialized view after star removal to update star counts
      try {
        await db.execute(sql`REFRESH MATERIALIZED VIEW active_week_topics`);
        console.log('Materialized view refreshed after star removal');
      } catch (error) {
        console.warn('Failed to refresh materialized view:', error);
      }
      
      // Clear cache to ensure immediate UI updates
      clearActiveWeekCache();
      
      return true;
    }, 'removeStar');
  }

  async hasStarred(topicId: number, fingerprint: string): Promise<boolean> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .select({ id: stars.id })
        .from(stars)
        .where(and(eq(stars.topicId, topicId), eq(stars.fingerprint, fingerprint)))
        .limit(1);
      
      return result.length > 0;
    }, 'hasStarred');
  }

  async getStarsCountByTopicId(topicId: number): Promise<number> {
    return this.executeWithMonitoring(async () => {
      console.log('PostgreSQL connection acquired from pool');
      
      const result = await db
        .select({ count: sql<number>`COUNT(*)`.as('count') })
        .from(stars)
        .where(eq(stars.topicId, topicId));
      
      return Number(result[0]?.count || 0);
    }, 'getStarsCountByTopicId');
  }

  async getWeekWithTopics(weekId: number, fingerprint?: string): Promise<WeekWithTopics | undefined> {
    return this.executeWithMonitoring(async () => {
      const week = await db
        .select()
        .from(weeks)
        .where(eq(weeks.id, weekId))
        .limit(1);
      
      if (!week[0]) return undefined;
      
      const topicsResult = await this.getTopicsByWeekId(weekId);
      
      // Set hasStarred for each topic if fingerprint is provided
      if (fingerprint) {
        for (const topic of topicsResult) {
          topic.hasStarred = await this.hasStarred(topic.id, fingerprint);
        }
      }
      
      return {
        ...week[0],
        topics: topicsResult
      };
    }, 'getWeekWithTopics');
  }

  async getActiveWeekWithTopics(fingerprint?: string): Promise<WeekWithTopics | undefined> {
    return this.executeWithMonitoring(async () => {
      console.log('PostgreSQL connection acquired from pool');
      
      // Check cache first - use base cache for week data, fingerprint-specific for starred status
      const baseCacheKey = 'active_week_topics:base';
      const cached = getCachedResult<WeekWithTopics>(baseCacheKey);
      if (cached && !fingerprint) {
        return cached;
      }
      
      // For fingerprinted requests, check if we can reuse base data and just update starred status
      if (cached && fingerprint) {
        const enrichedTopics = await Promise.all(
          cached.topics.map(async (topic) => ({
            ...topic,
            hasStarred: await this.hasStarred(topic.id, fingerprint)
          }))
        );
        return { ...cached, topics: enrichedTopics };
      }
      
      try {
        // Try to use materialized view for ultra-fast performance
        const results = await db.execute(sql`
          SELECT 
            week_id, week_title, start_date, end_date, is_active,
            topic_id, title, url, description, submitter, fingerprint as topic_fingerprint,
            status, created_at, stars, featured_at, stars_count,
            ${fingerprint ? sql`EXISTS(
              SELECT 1 FROM stars s 
              WHERE s.topic_id = topic_id 
              AND s.fingerprint = ${fingerprint}
            )` : sql`false`} as has_starred
          FROM active_week_topics
          WHERE topic_id IS NOT NULL
          ORDER BY created_at DESC
        `);
        
        if (results.rows.length === 0) {
          // Fallback to regular query if materialized view is empty
          return this.getActiveWeekWithTopicsFallback(fingerprint);
        }
        
        const firstRow = results.rows[0] as any;
        const week = {
          id: firstRow.week_id,
          title: firstRow.week_title,
          startDate: firstRow.start_date,
          endDate: firstRow.end_date,
          isActive: firstRow.is_active,
          createdAt: firstRow.start_date // weeks don't have created_at
        };
        
        const topics = results.rows.map((row: any) => ({
          id: row.topic_id,
          title: row.title,
          url: row.url,
          description: row.description,
          submitter: row.submitter,
          fingerprint: row.topic_fingerprint,
          weekId: row.week_id,
          status: row.status,
          createdAt: row.created_at,
          stars: row.stars,
          featuredAt: row.featured_at,
          starsCount: Number(row.stars_count),
          hasStarred: Boolean(row.has_starred)
        }));
        
        const result = { ...week, topics };
        
        // Cache the result using base cache key
        setCachedResult(baseCacheKey, result);
        
        return result;
      } catch (error) {
        // If materialized view doesn't exist or query fails, fall back to regular query
        console.log('Materialized view query failed, using fallback method:', error.message);
        return this.getActiveWeekWithTopicsFallback(fingerprint);
      }
    }, 'getActiveWeekWithTopics');
  }
  
  private async getActiveWeekWithTopicsFallback(fingerprint?: string): Promise<WeekWithTopics | undefined> {
    const activeWeek = await this.getActiveWeek();
    if (!activeWeek) return undefined;
    
    const topicsData = await this.getTopicsByWeekId(activeWeek.id);
    
    let enrichedTopics = topicsData;
    if (fingerprint && topicsData.length > 0) {
      const topicIds = topicsData.map(t => t.id);
      const starredResults = await db
        .select({ topicId: stars.topicId })
        .from(stars)
        .where(and(
          sql`${stars.topicId} IN (${sql.join(topicIds, sql`, `)})`,
          eq(stars.fingerprint, fingerprint)
        ));
      
      const starredTopicIds = new Set(starredResults.map(r => r.topicId));
      enrichedTopics = topicsData.map(topic => ({
        ...topic,
        hasStarred: starredTopicIds.has(topic.id)
      }));
    }
    
    return { ...activeWeek, topics: enrichedTopics };
  }
}

export const storage: IStorage = new PostgreSQLStorage();

export function getDatabaseMetrics(): PerformanceMetrics {
  return performanceMonitor.getMetrics();
}

export function resetDatabaseMetrics(): void {
  performanceMonitor.reset();
}