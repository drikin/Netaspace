import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

async function testDatabaseConnection() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.log('❌ DATABASE_URL is not set');
    return;
  }

  console.log('🔍 Testing database connection...');
  console.log('Database URL format:', DATABASE_URL.replace(/:[^:]*@/, ':***@'));

  // Test different connection configurations
  const configs = [
    {
      name: 'Current config (SSL required)',
      config: {
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 60000,
      }
    },
    {
      name: 'Simple SSL config',
      config: {
        connectionString: DATABASE_URL,
        ssl: true
      }
    },
    {
      name: 'No SSL config',
      config: {
        connectionString: DATABASE_URL,
        ssl: false
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`\n📝 Testing: ${name}`);
    
    try {
      const pool = new Pool(config);
      const client = await pool.connect();
      
      // Test simple query
      const result = await client.query('SELECT 1 as test');
      console.log(`✅ ${name}: Connection successful`);
      console.log(`   Result: ${result.rows[0].test}`);
      
      client.release();
      await pool.end();
      
      // If this config works, test with Drizzle
      console.log(`   Testing with Drizzle...`);
      const testPool = new Pool(config);
      const db = drizzle(testPool);
      
      await testPool.end();
      console.log(`✅ ${name}: Drizzle connection successful`);
      
      return config;
      
    } catch (error) {
      console.log(`❌ ${name}: Failed`);
      console.log(`   Error: ${error.message}`);
    }
  }
  
  return null;
}

testDatabaseConnection()
  .then((workingConfig) => {
    if (workingConfig) {
      console.log('\n🎉 Found working configuration:', JSON.stringify(workingConfig, null, 2));
    } else {
      console.log('\n💔 No working configuration found');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });