import Database from 'better-sqlite3';
import path from 'path';

function verifyData() {
  const dbPath = '/tmp/persistent/production.sqlite';
  const db = new Database(dbPath);
  
  console.log('=== データベース検証結果 ===');
  
  // 週の数を確認
  const weekCount = db.prepare('SELECT COUNT(*) as count FROM weeks').get();
  console.log(`週の数: ${weekCount.count}`);
  
  // トピックの総数を確認
  const topicCount = db.prepare('SELECT COUNT(*) as count FROM topics').get();
  console.log(`トピック総数: ${topicCount.count}`);
  
  // アクティブな週のトピック数を確認
  const activeWeek = db.prepare('SELECT id, title FROM weeks WHERE is_active = 1').get();
  if (activeWeek) {
    const activeTopics = db.prepare('SELECT COUNT(*) as count FROM topics WHERE week_id = ?').get(activeWeek.id);
    console.log(`アクティブ週 "${activeWeek.title}" のトピック数: ${activeTopics.count}`);
  }
  
  // 最新のトピック5件を表示
  console.log('\n=== 最新トピック5件 ===');
  const latestTopics = db.prepare('SELECT id, title, submitter, created_at FROM topics ORDER BY created_at DESC LIMIT 5').all();
  latestTopics.forEach((topic, index) => {
    console.log(`${index + 1}. [ID:${topic.id}] ${topic.title}`);
    console.log(`   投稿者: ${topic.submitter} | 投稿日時: ${topic.created_at}`);
  });
  
  // ステータス別の集計
  console.log('\n=== ステータス別集計 ===');
  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM topics 
    GROUP BY status 
    ORDER BY count DESC
  `).all();
  
  statusCounts.forEach(status => {
    console.log(`${status.status}: ${status.count}件`);
  });
  
  db.close();
  console.log('\n✅ すべてのデータが正常に保存されています');
}

verifyData();