import fs from 'fs';
import pg from 'postgres';

async function bulkImportToPostgres() {
  console.log('Starting bulk import to PostgreSQL...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  try {
    // Load backup data
    const backupData = JSON.parse(fs.readFileSync('./backup-supabase-1749237202606.json', 'utf8'));
    
    // Import topics in batches
    if (backupData.topics && backupData.topics.length > 0) {
      console.log(`Importing ${backupData.topics.length} topics...`);
      
      for (let i = 0; i < backupData.topics.length; i += 10) {
        const batch = backupData.topics.slice(i, i + 10);
        
        for (const topic of batch) {
          const weekId = topic.week_id || 2; // Default to week 2 if missing
          
          await client.query(`
            INSERT INTO topics (id, title, url, description, submitter, status, week_id, created_at, stars, featured_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING
          `, [
            topic.id,
            topic.title,
            topic.url,
            topic.description,
            topic.submitter,
            topic.status || 'pending',
            weekId,
            topic.created_at || new Date().toISOString(),
            topic.stars || 0,
            topic.featured_at
          ]);
        }
        
        console.log(`Progress: ${Math.min(i + 10, backupData.topics.length)}/${backupData.topics.length} topics imported`);
      }
    }
    
    // Import comments
    if (backupData.comments && backupData.comments.length > 0) {
      console.log(`Importing ${backupData.comments.length} comments...`);
      
      for (const comment of backupData.comments) {
        await client.query(`
          INSERT INTO comments (id, name, content, topic_id, created_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [
          comment.id,
          comment.name,
          comment.content,
          comment.topic_id,
          comment.created_at || new Date().toISOString()
        ]);
      }
    }
    
    // Import stars
    if (backupData.stars && backupData.stars.length > 0) {
      console.log(`Importing ${backupData.stars.length} stars...`);
      
      for (const star of backupData.stars) {
        await client.query(`
          INSERT INTO stars (id, topic_id, fingerprint, created_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING
        `, [
          star.id,
          star.topic_id,
          star.fingerprint,
          star.created_at || new Date().toISOString()
        ]);
      }
    }
    
    // Verify import
    const topicsCount = await client.query('SELECT COUNT(*) FROM topics');
    const commentsCount = await client.query('SELECT COUNT(*) FROM comments');
    const starsCount = await client.query('SELECT COUNT(*) FROM stars');
    const activeWeekTopics = await client.query('SELECT COUNT(*) FROM topics WHERE week_id = 2');
    
    console.log('\nImport completed successfully!');
    console.log(`Topics: ${topicsCount.rows[0].count}`);
    console.log(`Comments: ${commentsCount.rows[0].count}`);
    console.log(`Stars: ${starsCount.rows[0].count}`);
    console.log(`Active week topics: ${activeWeekTopics.rows[0].count}`);
    
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

bulkImportToPostgres().catch(console.error);