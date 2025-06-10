import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, desc, and, not } from 'drizzle-orm';
import {
  users,
  weeks,
  topics,
  comments,
  stars,
  type User,
  type Week,
  type Topic,
  type Comment,
  type Star,
  type InsertUser,
  type InsertWeek,
  type InsertTopic,
  type InsertComment,
  type InsertStar,
  type TopicWithCommentsAndStars,
  type WeekWithTopics
} from '@shared/schema';

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
  removeStar(topicId: number, fingerprint: string): Promise<boolean>;
  hasStarred(topicId: number, fingerprint: string): Promise<boolean>;
  getStarsCountByTopicId(topicId: number): Promise<number>;
  
  // Combined operations
  getWeekWithTopics(weekId: number, fingerprint?: string): Promise<WeekWithTopics | undefined>;
  getActiveWeekWithTopics(fingerprint?: string): Promise<WeekWithTopics | undefined>;
}

function getDatabasePath() {
  const dbPath = './database/neta.sqlite';
  const dbDir = path.dirname(dbPath);
  
  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  return dbPath;
}

function initializeSQLiteDatabase() {
  const dbPath = getDatabasePath();
  console.log('Using SQLite database:', dbPath);

  const sqlite = new Database(dbPath);
  console.log('SQLite database initialized successfully');
  
  return sqlite;
}

const sqlite = initializeSQLiteDatabase();
const db = drizzle(sqlite, { schema: { users, weeks, topics, comments, stars } });

class SQLiteStorage implements IStorage {
  db: ReturnType<typeof drizzle>;

  constructor(database: ReturnType<typeof drizzle>) {
    this.db = database;
  }

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
      .values({
        ...user,
        createdAt: new Date().toISOString()
      })
      .returning();
    
    return result[0];
  }

  async getWeeks(): Promise<Week[]> {
    return await this.db
      .select()
      .from(weeks)
      .orderBy(desc(weeks.startDate));
  }

  async getActiveWeek(): Promise<Week | undefined> {
    const result = await this.db
      .select()
      .from(weeks)
      .where(eq(weeks.isActive, true))
      .limit(1);
    
    return result[0];
  }

  async createWeek(week: InsertWeek): Promise<Week> {
    const result = await this.db
      .insert(weeks)
      .values(week)
      .returning();
    
    return result[0];
  }

  async setActiveWeek(weekId: number): Promise<void> {
    // Deactivate all weeks first
    await this.db
      .update(weeks)
      .set({ isActive: false });
    
    // Activate the specified week
    await this.db
      .update(weeks)
      .set({ isActive: true })
      .where(eq(weeks.id, weekId));
  }

  async getTopicsByWeekId(weekId: number): Promise<TopicWithCommentsAndStars[]> {
    const topicsResult = await this.db
      .select()
      .from(topics)
      .where(and(eq(topics.weekId, weekId), not(eq(topics.status, 'deleted'))))
      .orderBy(desc(topics.createdAt));

    return await this.enrichTopicsWithCommentsAndStars(topicsResult);
  }

  async getTopicsByStatus(status: string, weekId?: number): Promise<TopicWithCommentsAndStars[]> {
    let whereCondition;
    
    if (weekId) {
      whereCondition = and(eq(topics.status, status), eq(topics.weekId, weekId));
    } else {
      whereCondition = eq(topics.status, status);
    }

    const topicsResult = await this.db
      .select()
      .from(topics)
      .where(whereCondition)
      .orderBy(desc(topics.createdAt));
      
    return await this.enrichTopicsWithCommentsAndStars(topicsResult);
  }

  private async enrichTopicsWithCommentsAndStars(topicsResult: Topic[]): Promise<TopicWithCommentsAndStars[]> {
    const enrichedTopics: TopicWithCommentsAndStars[] = [];

    for (const topic of topicsResult) {
      const topicComments = await this.db
        .select()
        .from(comments)
        .where(eq(comments.topicId, topic.id))
        .orderBy(desc(comments.createdAt));

      const starCount = await this.db
        .select({ count: stars.id })
        .from(stars)
        .where(eq(stars.topicId, topic.id));

      enrichedTopics.push({
        ...topic,
        comments: topicComments,
        starsCount: starCount.length
      });
    }

    return enrichedTopics;
  }

  async getTopic(id: number, fingerprint?: string): Promise<TopicWithCommentsAndStars | undefined> {
    const result = await this.db
      .select()
      .from(topics)
      .where(eq(topics.id, id))
      .limit(1);

    if (!result[0]) return undefined;

    const topic = result[0];
    const topicComments = await this.db
      .select()
      .from(comments)
      .where(eq(comments.topicId, topic.id))
      .orderBy(desc(comments.createdAt));

    const starCount = await this.db
      .select({ count: stars.id })
      .from(stars)
      .where(eq(stars.topicId, topic.id));

    let hasStarred = false;
    if (fingerprint) {
      const starResult = await this.db
        .select()
        .from(stars)
        .where(and(eq(stars.topicId, topic.id), eq(stars.fingerprint, fingerprint)))
        .limit(1);
      hasStarred = starResult.length > 0;
    }

    return {
      ...topic,
      comments: topicComments,
      starsCount: starCount.length,
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
      .values({
        ...topic,
        createdAt: new Date().toISOString()
      })
      .returning();
    
    return result[0];
  }

  async updateTopicStatus(id: number, status: string): Promise<Topic | undefined> {
    const result = await this.db
      .update(topics)
      .set({ status })
      .where(eq(topics.id, id))
      .returning();
    
    return result[0];
  }

  async deleteTopic(id: number): Promise<boolean> {
    // Delete related comments and stars first
    await this.db.delete(comments).where(eq(comments.topicId, id));
    await this.db.delete(stars).where(eq(stars.topicId, id));
    
    const result = await this.db
      .delete(topics)
      .where(eq(topics.id, id))
      .returning();
    
    return result.length > 0;
  }

  async getCommentsByTopicId(topicId: number): Promise<Comment[]> {
    return await this.db
      .select()
      .from(comments)
      .where(eq(comments.topicId, topicId))
      .orderBy(desc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const result = await this.db
      .insert(comments)
      .values({
        ...comment,
        createdAt: new Date().toISOString()
      })
      .returning();
    
    return result[0];
  }

  async addStar(star: InsertStar): Promise<boolean> {
    try {
      await this.db
        .insert(stars)
        .values({
          ...star,
          createdAt: new Date().toISOString()
        });
      return true;
    } catch {
      return false;
    }
  }

  async removeStar(topicId: number, fingerprint: string): Promise<boolean> {
    const result = await this.db
      .delete(stars)
      .where(and(eq(stars.topicId, topicId), eq(stars.fingerprint, fingerprint)))
      .returning();
    
    return result.length > 0;
  }

  async hasStarred(topicId: number, fingerprint: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(stars)
      .where(and(eq(stars.topicId, topicId), eq(stars.fingerprint, fingerprint)))
      .limit(1);
    
    return result.length > 0;
  }

  async getStarsCountByTopicId(topicId: number): Promise<number> {
    const result = await this.db
      .select({ count: stars.id })
      .from(stars)
      .where(eq(stars.topicId, topicId));
    
    return result.length;
  }

  async getWeekWithTopics(weekId: number, fingerprint?: string): Promise<WeekWithTopics | undefined> {
    const week = await this.db
      .select()
      .from(weeks)
      .where(eq(weeks.id, weekId))
      .limit(1);

    if (!week[0]) return undefined;

    const weekTopics = await this.getTopicsByWeekId(weekId);

    // Add hasStarred info if fingerprint provided
    if (fingerprint) {
      for (const topic of weekTopics) {
        topic.hasStarred = await this.hasStarred(topic.id, fingerprint);
      }
    }

    return {
      ...week[0],
      topics: weekTopics
    };
  }

  async getActiveWeekWithTopics(fingerprint?: string): Promise<WeekWithTopics | undefined> {
    const activeWeek = await this.getActiveWeek();
    if (!activeWeek) return undefined;

    return await this.getWeekWithTopics(activeWeek.id, fingerprint);
  }
}

export const storage: IStorage = new SQLiteStorage(db);