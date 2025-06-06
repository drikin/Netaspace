/**
 * データ移行スクリプト - バックアップからReplit DBへ
 * backup-supabase-1749237202606.json のデータをReplit Database形式に変換
 */

import fs from 'fs';
import path from 'path';

class ReplitDBMigrator {
  constructor() {
    this.db = this.createMemoryDB(); // 開発環境用のメモリDB
    this.counters = {
      users: 1,
      weeks: 1,
      topics: 1,
      comments: 1,
      stars: 1
    };
  }

  createMemoryDB() {
    const store = new Map();
    return {
      async set(key, value) {
        store.set(key, JSON.stringify(value));
        console.log(`Set: ${key}`);
      },
      async get(key) {
        const data = store.get(key);
        return data ? JSON.parse(data) : null;
      },
      async list(prefix) {
        const keys = Array.from(store.keys());
        return prefix ? keys.filter(k => k.startsWith(prefix)) : keys;
      }
    };
  }

  async loadBackupData() {
    const backupPath = '../backup-supabase-1749237202606.json';
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log('Loaded backup data:', {
      users: data.users?.length || 0,
      weeks: data.weeks?.length || 0,
      topics: data.topics?.length || 0,
      comments: data.comments?.length || 0,
      stars: data.stars?.length || 0
    });

    return data;
  }

  async migrateUsers(users) {
    console.log('\n🔄 Migrating users...');
    
    for (const user of users) {
      const userData = {
        id: user.id,
        username: user.username,
        password: user.password,
        isAdmin: user.isAdmin || false,
        email: user.email
      };
      
      await this.db.set(`user:${user.id}`, userData);
      this.counters.users = Math.max(this.counters.users, user.id + 1);
    }
    
    await this.db.set('users:counter', this.counters.users);
    console.log(`✅ Migrated ${users.length} users`);
  }

  async migrateWeeks(weeks) {
    console.log('\n🔄 Migrating weeks...');
    
    let activeWeekId = null;
    
    for (const week of weeks) {
      const weekData = {
        id: week.id,
        startDate: new Date(week.startDate),
        endDate: new Date(week.endDate),
        title: week.title,
        isActive: week.isActive || false
      };
      
      if (weekData.isActive) {
        activeWeekId = week.id;
      }
      
      await this.db.set(`week:${week.id}`, weekData);
      this.counters.weeks = Math.max(this.counters.weeks, week.id + 1);
    }
    
    await this.db.set('weeks:counter', this.counters.weeks);
    
    if (activeWeekId) {
      await this.db.set('active:week', activeWeekId);
      console.log(`📌 Set active week: ${activeWeekId}`);
    }
    
    console.log(`✅ Migrated ${weeks.length} weeks`);
  }

  async migrateTopics(topics) {
    console.log('\n🔄 Migrating topics...');
    
    for (const topic of topics) {
      const topicData = {
        id: topic.id,
        title: topic.title,
        url: topic.url,
        description: topic.description,
        submitter: topic.submitter,
        status: topic.status || 'pending',
        weekId: topic.weekId,
        createdAt: new Date(topic.createdAt),
        stars: topic.stars || 0,
        featuredAt: topic.featuredAt ? new Date(topic.featuredAt) : null
      };
      
      await this.db.set(`topic:${topic.id}`, topicData);
      this.counters.topics = Math.max(this.counters.topics, topic.id + 1);
    }
    
    await this.db.set('topics:counter', this.counters.topics);
    console.log(`✅ Migrated ${topics.length} topics`);
  }

  async migrateComments(comments) {
    console.log('\n🔄 Migrating comments...');
    
    for (const comment of comments) {
      const commentData = {
        id: comment.id,
        name: comment.name,
        content: comment.content,
        topicId: comment.topicId,
        createdAt: new Date(comment.createdAt)
      };
      
      await this.db.set(`comment:topic:${comment.topicId}:${comment.id}`, commentData);
      this.counters.comments = Math.max(this.counters.comments, comment.id + 1);
    }
    
    await this.db.set('comments:counter', this.counters.comments);
    console.log(`✅ Migrated ${comments.length} comments`);
  }

  async migrateStars(stars) {
    console.log('\n🔄 Migrating stars...');
    
    for (const star of stars) {
      const starData = {
        id: star.id,
        topicId: star.topicId,
        fingerprint: star.fingerprint,
        createdAt: new Date(star.createdAt)
      };
      
      await this.db.set(`star:topic:${star.topicId}:${star.fingerprint}`, starData);
      this.counters.stars = Math.max(this.counters.stars, star.id + 1);
    }
    
    await this.db.set('stars:counter', this.counters.stars);
    console.log(`✅ Migrated ${stars.length} stars`);
  }

  async generateMigrationOutput() {
    console.log('\n📄 Generating migration commands...');
    
    const allKeys = await this.db.list();
    const commands = [];
    
    for (const key of allKeys) {
      const value = await this.db.get(key);
      commands.push({
        key,
        value: JSON.stringify(value)
      });
    }
    
    // 本番環境でのReplit DB移行用コマンドを生成
    const migrationScript = `
// Replit Database Migration Script
// Run this in Replit Console or deploy script

${commands.map(cmd => 
  `await db.set('${cmd.key}', '${cmd.value.replace(/'/g, "\\'")}');`
).join('\n')}

console.log('Migration completed. Total keys: ${commands.length}');
`;
    
    fs.writeFileSync('./replit-db-migration.js', migrationScript);
    console.log('✅ Migration script saved to: replit-db-migration.js');
    
    return commands.length;
  }

  async executeMigration() {
    try {
      console.log('🚀 Starting migration to Replit Database format...');
      
      const backupData = await this.loadBackupData();
      
      if (backupData.users && backupData.users.length > 0) {
        await this.migrateUsers(backupData.users);
      }
      
      if (backupData.weeks && backupData.weeks.length > 0) {
        await this.migrateWeeks(backupData.weeks);
      }
      
      if (backupData.topics && backupData.topics.length > 0) {
        await this.migrateTopics(backupData.topics);
      }
      
      if (backupData.comments && backupData.comments.length > 0) {
        await this.migrateComments(backupData.comments);
      }
      
      if (backupData.stars && backupData.stars.length > 0) {
        await this.migrateStars(backupData.stars);
      }
      
      const totalKeys = await this.generateMigrationOutput();
      
      console.log('\n🎉 Migration completed successfully!');
      console.log(`📊 Total database keys created: ${totalKeys}`);
      console.log('📝 Migration script generated for production deployment');
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }
}

async function main() {
  const migrator = new ReplitDBMigrator();
  await migrator.executeMigration();
}

main().catch(console.error);