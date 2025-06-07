import {
  Topic, InsertTopic, Comment, InsertComment,
  Week, InsertWeek, Star, InsertStar, User, InsertUser,
  topics, comments, weeks, stars, users,
  WeekWithTopics, TopicWithCommentsAndStars
} from "../shared/sqlite-schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

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
  // Multiple persistent locations for maximum reliability
  const persistentCandidates = [
    '/tmp/persistent/production.sqlite',
    '/home/runner/workspace/data/persistent/production.sqlite',
    '/var/tmp/persistent/production.sqlite'
  ];
  
  const backupLocations = [
    '/tmp/persistent/backups',
    '/home/runner/workspace/data/backups',
    './data/backups'
  ];
  
  // Priority 1: Use existing persistent database
  for (const persistentPath of persistentCandidates) {
    if (fs.existsSync(persistentPath)) {
      console.log(`Using persistent production database: ${persistentPath}`);
      return persistentPath;
    }
  }
  
  // Priority 2: Restore from backup if available
  for (const backupDir of backupLocations) {
    const latestBackupInfo = path.join(backupDir, 'latest-backup.json');
    if (fs.existsSync(latestBackupInfo)) {
      try {
        const backupInfo = JSON.parse(fs.readFileSync(latestBackupInfo, 'utf8'));
        if (fs.existsSync(backupInfo.backupFile)) {
          console.log(`Restoring from backup: ${backupInfo.backupFile}`);
          
          // Create persistent directory and restore
          const targetPath = persistentCandidates[0];
          const targetDir = path.dirname(targetPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          fs.copyFileSync(backupInfo.backupFile, targetPath);
          console.log(`Database restored to: ${targetPath}`);
          return targetPath;
        }
      } catch (error) {
        console.log(`Backup restore attempt failed: ${error.message}`);
      }
    }
  }
  
  // Priority 3: Create persistent database from existing data
  const fallbackPaths = ['./data/production.sqlite', './database/dev.sqlite'];
  
  for (const fallbackPath of fallbackPaths) {
    if (fs.existsSync(fallbackPath)) {
      console.log(`Migrating database to persistent storage: ${fallbackPath}`);
      
      // Copy to persistent location
      const targetPath = persistentCandidates[0];
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      fs.copyFileSync(fallbackPath, targetPath);
      console.log(`Database migrated to: ${targetPath}`);
      return targetPath;
    }
  }
  
  // Priority 4: Create new persistent database
  const newDbPath = persistentCandidates[0];
  const newDbDir = path.dirname(newDbPath);
  if (!fs.existsSync(newDbDir)) {
    fs.mkdirSync(newDbDir, { recursive: true });
  }
  
  console.log(`Creating new persistent database: ${newDbPath}`);
  return newDbPath;
}

function createAutoBackup(dbPath: string) {
  try {
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `auto-backup-${timestamp}.sqlite`);
    
    fs.copyFileSync(dbPath, backupFile);
    
    // Update latest backup info
    const backupInfo = {
      timestamp,
      backupFile,
      sourceDb: dbPath,
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(backupDir, 'latest-backup.json'),
      JSON.stringify(backupInfo, null, 2)
    );
    
    console.log(`Auto-backup created: ${backupFile}`);
    
    // Clean old backups (keep last 10)
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('auto-backup-') && file.endsWith('.sqlite'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        mtime: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    const toDelete = backupFiles.slice(10);
    for (const file of toDelete) {
      fs.unlinkSync(file.path);
    }
    
    return backupFile;
  } catch (error) {
    console.warn('Auto-backup failed:', error.message);
    return null;
  }
}

function initializeSQLiteDatabase() {
  const dbPath = getDatabasePath();
  console.log('Using SQLite database:', dbPath);

  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log('Created database directory:', dir);
      } catch (error) {
        console.warn('Could not create directory, using current directory:', (error as Error).message);
        const fallbackPath = './fallback.sqlite';
        console.log('Using fallback database path:', fallbackPath);
        return new Database(fallbackPath);
      }
    }

    const sqlite = new Database(dbPath);
    console.log('SQLite database initialized successfully');
    
    // Create initial backup after successful initialization
    createAutoBackup(dbPath);
    
    // Schedule periodic backups every 4 hours for production persistence
    setInterval(() => {
      createAutoBackup(dbPath);
    }, 4 * 60 * 60 * 1000);
    
    return sqlite;
  } catch (error) {
    console.error('Failed to initialize SQLite database:', (error as Error).message);
    console.log('Using in-memory database as final fallback');
    return new Database(':memory:');
  }
}

const sqlite = initializeSQLiteDatabase();
const db = drizzle(sqlite);

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
    const userWithTimestamp = {
      ...user,
      createdAt: new Date().toISOString(),
      isAdmin: user.isAdmin || false
    };
    
    const result = await this.db
      .insert(users)
      .values(userWithTimestamp)
      .returning();
    return result[0];
  }

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
    const weekWithDefaults = {
      ...week,
      isActive: week.isActive || false
    };
    
    const result = await this.db
      .insert(weeks)
      .values(weekWithDefaults)
      .returning();
    return result[0];
  }

  async setActiveWeek(weekId: number): Promise<void> {
    // First, set all weeks to inactive
    await this.db
      .update(weeks)
      .set({ isActive: false });
    
    // Then set the specified week to active
    await this.db
      .update(weeks)
      .set({ isActive: true })
      .where(eq(weeks.id, weekId));
  }

  async getTopicsByWeekId(weekId: number): Promise<TopicWithCommentsAndStars[]> {
    const topicsResult = await this.db
      .select()
      .from(topics)
      .where(eq(topics.weekId, weekId))
      .orderBy(desc(topics.createdAt));

    return this.enrichTopicsWithCommentsAndStars(topicsResult);
  }

  async getTopicsByStatus(status: string, weekId?: number): Promise<TopicWithCommentsAndStars[]> {
    let query = this.db
      .select()
      .from(topics);

    if (weekId) {
      query = query.where(and(eq(topics.status, status), eq(topics.weekId, weekId)));
    } else {
      query = query.where(eq(topics.status, status));
    }

    const topicsResult = await query.orderBy(desc(topics.createdAt));
    return this.enrichTopicsWithCommentsAndStars(topicsResult);
  }

  private async enrichTopicsWithCommentsAndStars(topicsResult: Topic[]): Promise<TopicWithCommentsAndStars[]> {
    if (topicsResult.length === 0) return [];

    const topicIds = topicsResult.map(t => t.id);
    
    const [commentsResult, starsResult] = await Promise.all([
      this.db
        .select()
        .from(comments)
        .where(inArray(comments.topicId, topicIds))
        .orderBy(comments.createdAt),
      this.db
        .select()
        .from(stars)
        .where(inArray(stars.topicId, topicIds))
    ]);
    
    const commentsMap = new Map<number, Comment[]>();
    const starsMap = new Map<number, number>();
    
    commentsResult.forEach(comment => {
      if (!commentsMap.has(comment.topicId)) {
        commentsMap.set(comment.topicId, []);
      }
      commentsMap.get(comment.topicId)!.push(comment);
    });
    
    // Count stars by topicId
    starsResult.forEach(star => {
      const currentCount = starsMap.get(star.topicId) || 0;
      starsMap.set(star.topicId, currentCount + 1);
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
    const topicData = {
      weekId: topic.weekId,
      title: topic.title,
      url: topic.url,
      description: topic.description,
      submitter: topic.submitter,
      fingerprint: topic.fingerprint,
      createdAt: new Date().toISOString(),
      status: topic.status || 'pending',
      stars: 0
    };
    
    const result = await this.db
      .insert(topics)
      .values(topicData)
      .returning();
    
    return result[0];
  }

  async updateTopicStatus(id: number, status: string): Promise<Topic | undefined> {
    const updateData: any = { status };
    
    if (status === "featured") {
      updateData.featuredAt = new Date().toISOString();
    } else if (status !== "featured") {
      updateData.featuredAt = null;
    }
    
    const result = await this.db
      .update(topics)
      .set(updateData)
      .where(eq(topics.id, id))
      .returning();
    
    return result[0];
  }

  async deleteTopic(id: number): Promise<boolean> {
    // First delete related comments and stars
    await this.db.delete(comments).where(eq(comments.topicId, id));
    await this.db.delete(stars).where(eq(stars.topicId, id));
    
    // Then delete the topic
    const result = await this.db
      .delete(topics)
      .where(eq(topics.id, id))
      .returning();
    
    return result.length > 0;
  }

  async getCommentsByTopicId(topicId: number): Promise<Comment[]> {
    return this.db
      .select()
      .from(comments)
      .where(eq(comments.topicId, topicId))
      .orderBy(comments.createdAt);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const commentWithTimestamp = {
      ...comment,
      createdAt: new Date().toISOString()
    };
    
    const result = await this.db
      .insert(comments)
      .values(commentWithTimestamp)
      .returning();
    
    return result[0];
  }

  async addStar(star: InsertStar): Promise<boolean> {
    try {
      const starWithTimestamp = {
        ...star,
        createdAt: new Date().toISOString()
      };
      
      await this.db
        .insert(stars)
        .values(starWithTimestamp);
      
      return true;
    } catch (error) {
      // Star already exists or other error
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
      .select()
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
    
    if (week.length === 0) return undefined;
    
    let weekTopics = await this.getTopicsByWeekId(weekId);
    
    if (fingerprint) {
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
      ...week[0],
      topics: weekTopics
    };
  }

  async getActiveWeekWithTopics(fingerprint?: string): Promise<WeekWithTopics | undefined> {
    const activeWeek = await this.getActiveWeek();
    if (!activeWeek) return undefined;
    
    return this.getWeekWithTopics(activeWeek.id, fingerprint);
  }
}

export const storage: IStorage = new SQLiteStorage(db);