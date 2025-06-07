import Database from 'better-sqlite3';
import fs from 'fs';

async function debugProduction() {
  console.log('=== プロダクション環境デバッグ ===');
  
  // 環境変数の確認
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('REPLIT_DEPLOYMENT:', process.env.REPLIT_DEPLOYMENT);
  
  // データベースパスの確認
  const persistentPath = '/tmp/persistent/production.sqlite';
  const fallbackPath = './data/production.sqlite';
  const devPath = './database/dev.sqlite';
  
  console.log('\n=== データベースファイル存在確認 ===');
  console.log('Persistent:', fs.existsSync(persistentPath) ? '✓' : '✗');
  console.log('Fallback:', fs.existsSync(fallbackPath) ? '✓' : '✗');
  console.log('Dev:', fs.existsSync(devPath) ? '✓' : '✗');
  
  // 使用中のデータベースを確認
  const dbPath = fs.existsSync(persistentPath) ? persistentPath : 
                fs.existsSync(fallbackPath) ? fallbackPath : devPath;
  
  console.log('\n=== 使用データベース ===');
  console.log('Path:', dbPath);
  
  try {
    const db = new Database(dbPath);
    
    // データ確認
    const topicCount = db.prepare('SELECT COUNT(*) as count FROM topics').get();
    console.log('Total topics:', topicCount.count);
    
    const latestTopic = db.prepare('SELECT id, title, created_at FROM topics ORDER BY created_at DESC LIMIT 1').get();
    console.log('Latest topic:', latestTopic);
    
    const activeWeek = db.prepare('SELECT * FROM weeks WHERE is_active = 1').get();
    console.log('Active week:', activeWeek);
    
    if (activeWeek) {
      const weekTopics = db.prepare('SELECT COUNT(*) as count FROM topics WHERE week_id = ?').get(activeWeek.id);
      console.log('Active week topics:', weekTopics.count);
    }
    
    db.close();
  } catch (error) {
    console.error('Database error:', error);
  }
  
  // API テスト
  console.log('\n=== API レスポンステスト ===');
  try {
    const response = await fetch('http://localhost:5000/api/weeks/active');
    const data = await response.json();
    console.log('API status:', response.status);
    console.log('Topics in response:', data.topics ? data.topics.length : 0);
    console.log('Latest topic in API:', data.topics?.[0]?.title || 'None');
  } catch (error) {
    console.error('API error:', error);
  }
}

debugProduction().catch(console.error);