import {
  Topic, InsertTopic, Comment, InsertComment,
  Week, InsertWeek, Star, InsertStar, User, InsertUser,
  WeekWithTopics, TopicWithCommentsAndStars
} from "../shared/schema";

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

// Replit Database storage implementation
export class ReplitDBStorage implements IStorage {
  private db: any;
  private initialized = false;

  constructor() {
    if (process.env.REPLIT_DB_URL) {
      console.log('Using Replit Database');
      this.db = this.createReplitDB();
    } else {
      console.log('Using in-memory storage for development');
      this.db = this.createMemoryDB();
    }
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    
    if (process.env.REPLIT_DB_URL) {
      await this.initializeFromBackup();
    } else {
      await this.initializeSampleData();
    }
    
    this.initialized = true;
  }

  private createReplitDB() {
    // Simple wrapper for Replit Database
    return {
      async get(key: string) {
        try {
          const response = await fetch(`${process.env.REPLIT_DB_URL}/${encodeURIComponent(key)}`);
          if (!response.ok) return null;
          return await response.text();
        } catch {
          return null;
        }
      },
      async set(key: string, value: string) {
        try {
          await fetch(process.env.REPLIT_DB_URL!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
          });
          return true;
        } catch {
          return false;
        }
      },
      async delete(key: string) {
        try {
          await fetch(`${process.env.REPLIT_DB_URL}/${encodeURIComponent(key)}`, { method: 'DELETE' });
          return true;
        } catch {
          return false;
        }
      },
      async list(prefix?: string) {
        try {
          const url = prefix ? `${process.env.REPLIT_DB_URL}?prefix=${encodeURIComponent(prefix)}` : `${process.env.REPLIT_DB_URL}?prefix=`;
          const response = await fetch(url);
          const text = await response.text();
          return text.split('\n').filter(k => k.length > 0);
        } catch {
          return [];
        }
      }
    };
  }

  private createMemoryDB() {
    const store = new Map<string, string>();
    return {
      async get(key: string) {
        return store.get(key) || null;
      },
      async set(key: string, value: string) {
        store.set(key, value);
        return true;
      },
      async delete(key: string) {
        return store.delete(key);
      },
      async list(prefix?: string) {
        const keys = Array.from(store.keys());
        return prefix ? keys.filter(k => k.startsWith(prefix)) : keys;
      }
    };
  }

  private async initializeFromBackup() {
    try {
      // Check if data already exists
      const existingUsers = await this.db.list('user:');
      if (existingUsers.length > 0) {
        console.log('Replit Database already has data, skipping initialization');
        return;
      }

      console.log('Initializing Replit Database from backup...');
      
      // Load backup data
      const fs = await import('fs');
      const backupPath = './backup-supabase-1749237202606.json';
      
      if (!fs.existsSync(backupPath)) {
        console.warn('Backup file not found, creating minimal data');
        await this.initializeSampleData();
        return;
      }

      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      
      // Import users
      if (backupData.users) {
        for (const user of backupData.users) {
          await this.db.set(`user:${user.id}`, JSON.stringify({
            id: user.id,
            username: user.username,
            password: user.password,
            isAdmin: user.isAdmin || false,
            email: user.email
          }));
        }
        await this.db.set('users:counter', (Math.max(...backupData.users.map(u => u.id)) + 1).toString());
      }

      // Import weeks
      if (backupData.weeks) {
        for (const week of backupData.weeks) {
          await this.db.set(`week:${week.id}`, JSON.stringify(week));
          if (week.isActive) {
            await this.db.set('active:week', week.id.toString());
          }
        }
        await this.db.set('weeks:counter', (Math.max(...backupData.weeks.map(w => w.id)) + 1).toString());
      }

      // Import topics
      if (backupData.topics) {
        for (const topic of backupData.topics) {
          await this.db.set(`topic:${topic.id}`, JSON.stringify(topic));
        }
        await this.db.set('topics:counter', (Math.max(...backupData.topics.map(t => t.id)) + 1).toString());
      }

      // Import comments
      if (backupData.comments) {
        for (const comment of backupData.comments) {
          if (comment.topicId) {
            await this.db.set(`comment:topic:${comment.topicId}:${comment.id}`, JSON.stringify(comment));
          }
        }
        await this.db.set('comments:counter', (Math.max(...backupData.comments.map(c => c.id)) + 1).toString());
      }

      // Import stars
      if (backupData.stars) {
        for (const star of backupData.stars) {
          if (star.topicId && star.fingerprint) {
            await this.db.set(`star:topic:${star.topicId}:${star.fingerprint}`, JSON.stringify(star));
          }
        }
        await this.db.set('stars:counter', (Math.max(...backupData.stars.map(s => s.id)) + 1).toString());
      }

      console.log(`Replit Database initialized with backup data: ${backupData.users?.length || 0} users, ${backupData.topics?.length || 0} topics`);
      
    } catch (error) {
      console.error('Failed to initialize from backup:', error.message);
      await this.initializeSampleData();
    }
  }

  private async initializeSampleData() {
    console.log('Creating minimal sample data...');
    
    const adminUser: User = {
      id: 1,
      username: 'admin',
      password: 'admin',
      isAdmin: true,
      email: 'admin@example.com'
    };
    await this.db.set('user:1', JSON.stringify(adminUser));
    await this.db.set('users:counter', '2');

    const week: Week = {
      id: 1,
      startDate: new Date('2025-05-31'),
      endDate: new Date('2025-06-07'),
      title: 'ep607',
      isActive: true
    };
    await this.db.set('week:1', JSON.stringify(week));
    await this.db.set('weeks:counter', '2');
    await this.db.set('active:week', '1');
    
    console.log('Sample data created');
  }

  private async getNextId(entity: string): Promise<number> {
    const counterKey = `${entity}s:counter`;
    const current = await this.db.get(counterKey);
    const nextId = current ? parseInt(current) : 1;
    await this.db.set(counterKey, (nextId + 1).toString());
    return nextId;
  }

  async getUser(id: number): Promise<User | undefined> {
    await this.ensureInitialized();
    const data = await this.db.get(`user:${id}`);
    return data ? JSON.parse(data) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const userKeys = await this.db.list('user:');
    for (const key of userKeys) {
      const data = await this.db.get(key);
      if (data) {
        const user = JSON.parse(data);
        if (user.username === username) return user;
      }
    }
    return undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = await this.getNextId('user');
    const newUser: User = { 
      ...user, 
      id,
      isAdmin: user.isAdmin ?? false,
      email: user.email ?? null
    };
    await this.db.set(`user:${id}`, JSON.stringify(newUser));
    return newUser;
  }

  async getWeeks(): Promise<Week[]> {
    const weekKeys = await this.db.list('week:');
    const weeks: Week[] = [];
    
    for (const key of weekKeys) {
      const data = await this.db.get(key);
      if (data) {
        const week = JSON.parse(data);
        week.startDate = new Date(week.startDate);
        week.endDate = new Date(week.endDate);
        weeks.push(week);
      }
    }
    
    return weeks.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }

  async getActiveWeek(): Promise<Week | undefined> {
    const activeWeekId = await this.db.get('active:week');
    if (!activeWeekId) return undefined;
    
    const data = await this.db.get(`week:${activeWeekId}`);
    if (!data) return undefined;
    
    const week = JSON.parse(data);
    week.startDate = new Date(week.startDate);
    week.endDate = new Date(week.endDate);
    return week;
  }

  async createWeek(week: InsertWeek): Promise<Week> {
    const id = await this.getNextId('week');
    const newWeek: Week = { 
      ...week, 
      id,
      isActive: week.isActive ?? false
    };
    await this.db.set(`week:${id}`, JSON.stringify(newWeek));
    return newWeek;
  }

  async setActiveWeek(weekId: number): Promise<void> {
    await this.db.set('active:week', weekId.toString());
    
    // Update isActive flag for all weeks
    const weekKeys = await this.db.list('week:');
    for (const key of weekKeys) {
      const data = await this.db.get(key);
      if (data) {
        const week = JSON.parse(data);
        week.isActive = week.id === weekId;
        await this.db.set(key, JSON.stringify(week));
      }
    }
  }

  async getTopicsByWeekId(weekId: number): Promise<TopicWithCommentsAndStars[]> {
    const topicKeys = await this.db.list('topic:');
    const topics: Topic[] = [];
    
    for (const key of topicKeys) {
      const data = await this.db.get(key);
      if (data) {
        const topic = JSON.parse(data);
        topic.createdAt = new Date(topic.createdAt);
        if (topic.featuredAt) topic.featuredAt = new Date(topic.featuredAt);
        if (topic.weekId === weekId) {
          topics.push(topic);
        }
      }
    }
    
    const sortedTopics = topics.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return await this.enrichTopicsWithCommentsAndStars(sortedTopics);
  }

  async getTopicsByStatus(status: string, weekId?: number): Promise<TopicWithCommentsAndStars[]> {
    const topicKeys = await this.db.list('topic:');
    const topics: Topic[] = [];
    
    for (const key of topicKeys) {
      const data = await this.db.get(key);
      if (data) {
        const topic = JSON.parse(data);
        topic.createdAt = new Date(topic.createdAt);
        if (topic.featuredAt) topic.featuredAt = new Date(topic.featuredAt);
        
        if (topic.status === status && (!weekId || topic.weekId === weekId)) {
          topics.push(topic);
        }
      }
    }
    
    const sortedTopics = topics.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return await this.enrichTopicsWithCommentsAndStars(sortedTopics);
  }

  private async enrichTopicsWithCommentsAndStars(topics: Topic[]): Promise<TopicWithCommentsAndStars[]> {
    const enriched: TopicWithCommentsAndStars[] = [];
    
    for (const topic of topics) {
      const comments = await this.getCommentsByTopicId(topic.id);
      const starsCount = await this.getStarsCountByTopicId(topic.id);
      
      enriched.push({
        ...topic,
        comments,
        starsCount
      });
    }
    
    return enriched;
  }

  async getTopic(id: number, fingerprint?: string): Promise<TopicWithCommentsAndStars | undefined> {
    const data = await this.db.get(`topic:${id}`);
    if (!data) return undefined;
    
    const topic = JSON.parse(data);
    topic.createdAt = new Date(topic.createdAt);
    if (topic.featuredAt) topic.featuredAt = new Date(topic.featuredAt);
    
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
    const topicKeys = await this.db.list('topic:');
    
    for (const key of topicKeys) {
      const data = await this.db.get(key);
      if (data) {
        const topic = JSON.parse(data);
        if (topic.url === url) {
          topic.createdAt = new Date(topic.createdAt);
          if (topic.featuredAt) topic.featuredAt = new Date(topic.featuredAt);
          return topic;
        }
      }
    }
    
    return undefined;
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const id = await this.getNextId('topic');
    const now = new Date();
    const newTopic: Topic = {
      id,
      title: topic.title,
      url: topic.url,
      description: topic.description ?? null,
      submitter: topic.submitter,
      status: topic.status || 'pending',
      weekId: topic.weekId ?? null,
      createdAt: now,
      stars: 0,
      featuredAt: topic.status === 'featured' ? now : null
    };
    
    await this.db.set(`topic:${id}`, JSON.stringify(newTopic));
    return newTopic;
  }

  async updateTopicStatus(id: number, status: string): Promise<Topic | undefined> {
    const data = await this.db.get(`topic:${id}`);
    if (!data) return undefined;
    
    const topic = JSON.parse(data);
    topic.status = status;
    
    if (status === "featured") {
      topic.featuredAt = new Date();
    } else if (status !== "featured") {
      topic.featuredAt = null;
    }
    
    await this.db.set(`topic:${id}`, JSON.stringify(topic));
    
    topic.createdAt = new Date(topic.createdAt);
    if (topic.featuredAt) topic.featuredAt = new Date(topic.featuredAt);
    
    return topic;
  }

  async deleteTopic(id: number): Promise<boolean> {
    // Delete related comments and stars
    const commentKeys = await this.db.list(`comment:topic:${id}:`);
    for (const key of commentKeys) {
      await this.db.delete(key);
    }
    
    const starKeys = await this.db.list(`star:topic:${id}:`);
    for (const key of starKeys) {
      await this.db.delete(key);
    }
    
    return await this.db.delete(`topic:${id}`);
  }

  async getCommentsByTopicId(topicId: number): Promise<Comment[]> {
    const commentKeys = await this.db.list(`comment:topic:${topicId}:`);
    const comments: Comment[] = [];
    
    for (const key of commentKeys) {
      const data = await this.db.get(key);
      if (data) {
        const comment = JSON.parse(data);
        comment.createdAt = new Date(comment.createdAt);
        comments.push(comment);
      }
    }
    
    return comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const id = await this.getNextId('comment');
    const now = new Date();
    const newComment: Comment = { ...comment, id, createdAt: now };
    
    await this.db.set(`comment:topic:${comment.topicId}:${id}`, JSON.stringify(newComment));
    return newComment;
  }

  async addStar(star: InsertStar): Promise<boolean> {
    const starKey = `star:topic:${star.topicId}:${star.fingerprint}`;
    const existing = await this.db.get(starKey);
    
    if (existing) return false; // Already starred
    
    const id = await this.getNextId('star');
    const now = new Date();
    const newStar: Star = { ...star, id, createdAt: now };
    
    await this.db.set(starKey, JSON.stringify(newStar));
    return true;
  }

  async removeStar(topicId: number, fingerprint: string): Promise<boolean> {
    const starKey = `star:topic:${topicId}:${fingerprint}`;
    return await this.db.delete(starKey);
  }

  async hasStarred(topicId: number, fingerprint: string): Promise<boolean> {
    const starKey = `star:topic:${topicId}:${fingerprint}`;
    const data = await this.db.get(starKey);
    return !!data;
  }

  async getStarsCountByTopicId(topicId: number): Promise<number> {
    const starKeys = await this.db.list(`star:topic:${topicId}:`);
    return starKeys.length;
  }

  async getWeekWithTopics(weekId: number, fingerprint?: string): Promise<WeekWithTopics | undefined> {
    const data = await this.db.get(`week:${weekId}`);
    if (!data) return undefined;
    
    const week = JSON.parse(data);
    week.startDate = new Date(week.startDate);
    week.endDate = new Date(week.endDate);
    
    let weekTopics = await this.getTopicsByWeekId(weekId);
    
    if (fingerprint) {
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

export const storage: IStorage = new ReplitDBStorage();