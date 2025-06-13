import { db } from '../server/db.js';
import { users, weeks } from '../shared/schema.js';

async function setupLocalData() {
  console.log('Setting up local development data...');

  try {
    // Create admin user
    console.log('Creating admin user...');
    await db.insert(users).values({
      username: 'admin',
      password: 'fmbackspace55', // In production, this should be hashed
      email: 'admin@backspace.fm',
      isAdmin: true
    }).onConflictDoNothing();

    // Create initial week
    console.log('Creating initial week...');
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    await db.insert(weeks).values({
      title: '第1回 ローカル開発週',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      isActive: true
    }).onConflictDoNothing();

    console.log('✅ Local development data setup complete!');
    console.log('');
    console.log('Admin credentials:');
    console.log('  Username: admin');
    console.log('  Password: fmbackspace55');
    console.log('');
    console.log('Access your app at: http://localhost:8080');
    console.log('Admin panel at: http://localhost:8080/admin');

  } catch (error) {
    console.error('❌ Failed to setup local data:', error);
  }

  process.exit(0);
}

setupLocalData();