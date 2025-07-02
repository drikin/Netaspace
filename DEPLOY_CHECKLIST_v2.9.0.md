# デプロイチェックリスト v2.9.0

## 今日の変更内容

### 追加された機能
1. **ネタ投稿TOP10ランキング**
   - 投稿数、スター数、採用数による総合評価
   - 採点ルールポップオーバー

2. **X共有追跡機能**
   - `shares`テーブルの追加
   - 共有ボタンクリックの記録

3. **台本管理機能**
   - `scripts`テーブルの追加
   - 管理者向け台本編集機能
   - 番組進行用テンプレート

4. **その他**
   - ポッドキャストプレイヤー
   - 管理者ページの削除（メインページに統合）

## デプロイ前の確認事項

### 1. データベースマイグレーション（重要）

```bash
# 本番サーバーで実行
sudo -u postgres psql -d neta_local < scripts/migrate-v2.9.0.sql
```

または手動で：

```sql
-- sharesテーブル作成
CREATE TABLE IF NOT EXISTS shares (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  fingerprint TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'x',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- scriptsテーブル作成
CREATE TABLE IF NOT EXISTS scripts (
  id SERIAL PRIMARY KEY,
  week_id INTEGER REFERENCES weeks(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

-- インデックス作成
CREATE INDEX shares_topic_id_idx ON shares(topic_id);
CREATE INDEX shares_fingerprint_idx ON shares(fingerprint);
CREATE INDEX shares_topic_fingerprint_idx ON shares(topic_id, fingerprint);
CREATE INDEX shares_created_at_idx ON shares(created_at);
CREATE INDEX scripts_week_id_idx ON scripts(week_id);
CREATE INDEX scripts_created_at_idx ON scripts(created_at);
```

### 2. 環境変数の確認
- `ADMIN_PASSWORD`が設定されていることを確認
- `DATABASE_URL`が正しいことを確認

### 3. デプロイ手順

```bash
# 1. 本番サーバーにSSH接続
ssh user@153.127.201.139

# 2. プロジェクトディレクトリに移動
cd ~/Netaspace

# 3. データベースマイグレーション実行
sudo -u postgres psql -d neta_local < scripts/migrate-v2.9.0.sql

# 4. デプロイスクリプト実行
./deploy.sh

# 5. 動作確認
curl -I https://neta.backspace.fm/health
pm2 logs neta-app
```

### 4. デプロイ後の確認

- [ ] ヘルスチェック成功
- [ ] トップページが正常に表示
- [ ] 管理者でログイン可能
- [ ] 台本タブが表示される（管理者のみ）
- [ ] TOP10ランキングが表示される
- [ ] 既存機能が正常動作

### 5. トラブルシューティング

**データベースエラーの場合:**
```bash
# ログ確認
pm2 logs neta-app

# データベース接続確認
sudo -u postgres psql -d neta_local -c "\dt"
```

**アプリケーションエラーの場合:**
```bash
# PM2再起動
pm2 restart neta-app

# Nginxログ確認
sudo tail -f /var/log/nginx/neta.backspace.fm.error.log
```

## 注意事項

1. **deploy.shは`npm run db:push`を実行しますが、Drizzleが新しいテーブルを作成できない可能性があります**
2. **手動でSQLを実行することを推奨します**
3. **バックアップを取ってから実行してください**

## ロールバック手順

問題が発生した場合：

```bash
# 1. 前のバージョンに戻す
git checkout v2.7.0
npm install
npm run build
pm2 restart neta-app

# 2. 追加したテーブルを削除（必要な場合）
# DROP TABLE IF EXISTS shares CASCADE;
# DROP TABLE IF EXISTS scripts CASCADE;
```