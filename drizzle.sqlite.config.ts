import { defineConfig } from 'drizzle-kit';

// SQLite用のDrizzle設定
// 環境に応じて自動的にデータベースパスを切り替え

function getDatabasePath() {
  if (process.env.REPLIT_DEPLOYMENT) {
    // Production環境では書き込み可能なディレクトリを使用
    return process.env.REPLIT_DB_URL || './data/production.sqlite';
  } else {
    // 開発環境
    return './database/dev.sqlite';
  }
}

export default defineConfig({
  dialect: 'sqlite',
  schema: './shared/sqlite-schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: getDatabasePath(),
  },
  verbose: true,
  strict: true,
});