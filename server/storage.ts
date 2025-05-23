import {
  Topic, InsertTopic, Comment, InsertComment,
  Week, InsertWeek, Star, InsertStar, User, InsertUser,
  topics, comments, weeks, stars, users,
  WeekWithTopics, TopicWithCommentsAndStars
} from "@shared/schema";
import { eq, desc, and, gt, lt, isNull, sql, inArray } from "drizzle-orm";
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
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopicStatus(id: number, status: string): Promise<Topic | undefined>;
  
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
      stars: 0
    };
    
    this.topics.set(id, newTopic);
    return newTopic;
  }

  async updateTopicStatus(id: number, status: string): Promise<Topic | undefined> {
    const topic = this.topics.get(id);
    if (!topic) return undefined;
    
    topic.status = status;
    return topic;
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

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    const client = postgres(process.env.DATABASE_URL);
    this.db = drizzle(client);
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
    const result = await this.db
      .select()
      .from(weeks)
      .where(eq(weeks.isActive, true))
      .limit(1);
    
    return result[0];
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
    const result = await this.db
      .select()
      .from(topics)
      .where(eq(topics.weekId, weekId))
      .orderBy(desc(topics.createdAt));
    
    return Promise.all(result.map(async topic => {
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
    let query = this.db
      .select()
      .from(topics)
      .where(eq(topics.status, status));
    
    if (weekId) {
      query = query.where(eq(topics.weekId, weekId));
    }
    
    const result = await query.orderBy(desc(topics.createdAt));
    
    return Promise.all(result.map(async topic => {
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

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const result = await this.db
      .insert(topics)
      .values(topic)
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

// Use the appropriate storage implementation
// If DATABASE_URL is set, use PostgresStorage, otherwise use MemStorage
export const storage: IStorage = process.env.DATABASE_URL
  ? new PostgresStorage()
  : new MemStorage();
