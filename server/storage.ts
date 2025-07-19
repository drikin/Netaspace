import { eq, desc, and, not, sql, inArray } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import { db } from './db';

// Removed caching system for simplicity and real-time data consistency

import {
  users,
  weeks,
  topics,
  stars,
  shares,
  scripts,
  type User,
  type Week,
  type Topic,
  type Star,
  type Share,
  type Script,
  type InsertUser,
  type InsertWeek,
  type InsertTopic,
  type InsertStar,
  type InsertShare,
  type InsertScript,
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
  updateWeekTitle(weekId: number, title: string): Promise<Week>;
  
  // Topic operations
  getTopicsByWeekId(weekId: number): Promise<TopicWithCommentsAndStars[]>;
  getTopicsByStatus(status: string, weekId?: number): Promise<TopicWithCommentsAndStars[]>;
  getTopic(id: number, fingerprint?: string): Promise<TopicWithCommentsAndStars | undefined>;
  getTopicByUrl(url: string): Promise<Topic | undefined>;
  getTopicByUrlInWeek(url: string, weekId: number): Promise<Topic | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopicStatus(id: number, status: string): Promise<Topic | undefined>;
  deleteTopic(id: number): Promise<boolean>;
  
  // Star operations
  addStar(star: InsertStar): Promise<boolean>;
  removeStar(topicId: number, fingerprint: string): Promise<boolean>;
  hasStarred(topicId: number, fingerprint: string): Promise<boolean>;
  getStarsCountByTopicId(topicId: number): Promise<number>;
  
  // Share operations
  addShare(share: InsertShare): Promise<boolean>;
  hasShared(topicId: number, fingerprint: string): Promise<boolean>;
  
  // Script operations
  getScriptByWeekId(weekId: number): Promise<Script | undefined>;
  createScript(script: InsertScript): Promise<Script>;
  updateScript(id: number, data: Partial<InsertScript>): Promise<Script | undefined>;
  
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

  async updateWeekTitle(weekId: number, title: string): Promise<Week> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .update(weeks)
        .set({ title })
        .where(eq(weeks.id, weekId))
        .returning();
      
      if (!result || result.length === 0) {
        throw new Error('Week not found');
      }
      
      return result[0];
    }, 'updateWeekTitle');
  }

  async updateWeek(weekId: number, updateData: { title?: string; liveRecordingDate?: string; liveUrl?: string }): Promise<Week> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .update(weeks)
        .set(updateData)
        .where(eq(weeks.id, weekId))
        .returning();
      
      if (!result || result.length === 0) {
        throw new Error('Week not found');
      }
      
      return result[0];
    }, 'updateWeek');
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
      // Validate weekId if provided
      if (weekId !== undefined && (!Number.isInteger(weekId) || weekId < 0)) {
        console.error(`Invalid weekId provided to getTopicsByStatus: ${weekId}`);
        return [];
      }
      
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
    
    // Get all share counts in a single query
    const shareCounts = await db
      .select({
        topicId: shares.topicId,
        count: count(shares.id).as('count')
      })
      .from(shares)
      .where(inArray(shares.topicId, topicIds))
      .groupBy(shares.topicId);
    
    // Create maps for quick lookup
    const starCountMap = new Map<number, number>();
    starCounts.forEach(row => {
      starCountMap.set(row.topicId, Number(row.count));
    });
    
    const shareCountMap = new Map<number, number>();
    shareCounts.forEach(row => {
      shareCountMap.set(row.topicId, Number(row.count));
    });
    
    // Enrich topics with star counts and share counts
    return topicsResult.map(topic => ({
      ...topic,
      starsCount: starCountMap.get(topic.id) || 0,
      sharesCount: shareCountMap.get(topic.id) || 0,
      hasStarred: false, // Will be set by the caller if fingerprint is provided
      hasShared: false   // Will be set by the caller if fingerprint is provided
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

  async getTopicByUrlInWeek(url: string, weekId: number): Promise<Topic | undefined> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .select()
        .from(topics)
        .where(and(eq(topics.url, url), eq(topics.weekId, weekId)))
        .limit(1);
      
      return result[0];
    }, 'getTopicByUrlInWeek');
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .insert(topics)
        .values(topic)
        .returning();
      
      
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
      
      
      return true;
    }, 'deleteTopic');
  }

  async addStar(star: InsertStar): Promise<boolean> {
    return this.executeWithMonitoring(async () => {
      try {
        await db
          .insert(stars)
          .values(star);
        
        
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

  async addShare(share: InsertShare): Promise<boolean> {
    return this.executeWithMonitoring(async () => {
      try {
        await db
          .insert(shares)
          .values(share);
        
        return true;
      } catch (error) {
        // Handle unique constraint violation (user already shared this topic)
        return false;
      }
    }, 'addShare');
  }

  async hasShared(topicId: number, fingerprint: string): Promise<boolean> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .select({ id: shares.id })
        .from(shares)
        .where(and(eq(shares.topicId, topicId), eq(shares.fingerprint, fingerprint)))
        .limit(1);
      
      return result.length > 0;
    }, 'hasShared');
  }

  async getScriptByWeekId(weekId: number): Promise<Script | undefined> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .select()
        .from(scripts)
        .where(eq(scripts.weekId, weekId))
        .limit(1);
      
      return result[0];
    }, 'getScriptByWeekId');
  }

  async createScript(script: InsertScript): Promise<Script> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .insert(scripts)
        .values(script)
        .returning();
      
      return result[0];
    }, 'createScript');
  }

  async updateScript(id: number, data: Partial<InsertScript>): Promise<Script | undefined> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .update(scripts)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(scripts.id, id))
        .returning();
      
      return result[0];
    }, 'updateScript');
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
      
      const activeWeek = await this.getActiveWeek();
      if (!activeWeek) return undefined;
      
      // Get basic topics first
      const topicsResult = await db
        .select()
        .from(topics)
        .where(eq(topics.weekId, activeWeek.id))
        .orderBy(desc(topics.createdAt));
      
      // Now enrich with star data using the same approach as enrichTopicsWithCommentsAndStars
      const enrichedTopics = await this.enrichTopicsWithCommentsAndStars(topicsResult);
      
      // Set hasStarred for each topic if fingerprint is provided
      if (fingerprint) {
        for (const topic of enrichedTopics) {
          topic.hasStarred = await this.hasStarred(topic.id, fingerprint);
        }
      }
      
      return { ...activeWeek, topics: enrichedTopics };
    }, 'getActiveWeekWithTopics');
  }
}

export const storage: IStorage = new PostgreSQLStorage();

export function getDatabaseMetrics(): PerformanceMetrics {
  return performanceMonitor.getMetrics();
}

export function resetDatabaseMetrics(): void {
  performanceMonitor.reset();
}