import { eq, desc, and, not } from 'drizzle-orm';
import { db } from './db';

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
  type UpsertUser,
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
    
    // Log slow queries (over 100ms)
    if (duration > 100) {
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

export interface IStorage {
  // User operations - Updated for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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

  async getUser(id: string): Promise<User | undefined> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      return result[0];
    }, 'getUser');
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      return result[0];
    }, 'upsertUser');
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
      const topicsResult = await db
        .select()
        .from(topics)
        .where(eq(topics.weekId, weekId))
        .orderBy(desc(topics.createdAt));
      
      return await this.enrichTopicsWithCommentsAndStars(topicsResult);
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
    const enrichedTopics: TopicWithCommentsAndStars[] = [];
    
    for (const topic of topicsResult) {
      const starsCount = await this.getStarsCountByTopicId(topic.id);
      
      enrichedTopics.push({
        ...topic,
        starsCount,
        hasStarred: false // Will be set by the caller if fingerprint is provided
      });
    }
    
    return enrichedTopics;
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

  async getStarsCountByTopicId(topicId: number): Promise<number> {
    return this.executeWithMonitoring(async () => {
      const result = await db
        .select()
        .from(stars)
        .where(eq(stars.topicId, topicId));
      
      return result.length;
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
      const activeWeek = await this.getActiveWeek();
      
      if (!activeWeek) return undefined;
      
      return await this.getWeekWithTopics(activeWeek.id, fingerprint);
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