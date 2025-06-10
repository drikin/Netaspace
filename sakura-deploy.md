# 桜環境デプロイメント設定

桜環境向けの完全なデプロイ設定が準備されました。以下のファイルが作成されています：

- `Dockerfile` - アプリケーションコンテナ設定
- `docker-compose.yml` - 複数サービス構成
- `nginx.conf` - リバースプロキシとSSL設定
- `init.sql` - データベース初期化スクリプト
- `.env.example` - 環境変数テンプレート
- `deploy-scripts/deploy.sh` - 自動デプロイスクリプト
- `deploy-scripts/setup-ssl.sh` - SSL証明書設定

## 必要な環境変数

### 認証関連
```bash
# Replitドメイン設定（現在のReplit環境と桜環境の両方を含める）
REPLIT_DOMAINS="your-replit-domain.replit.app,your-sakura-domain.com"

# セッション暗号化キー（既存と同じものを使用）
SESSION_SECRET="your-existing-session-secret"

# 管理者ユーザーID（既存と同じものを使用）
ADMIN_USER_ID="29156743"
```

### データベース関連
```bash
# 桜環境のPostgreSQLデータベース接続URL
DATABASE_URL="postgresql://username:password@host:port/dbname"

# 関連するPostgreSQL設定
PGHOST="your-postgres-host"
PGPORT="5432"
PGUSER="your-postgres-user"
PGPASSWORD="your-postgres-password"
PGDATABASE="your-database-name"
```

### アプリケーション設定
```bash
# 本番環境フラグ
NODE_ENV="production"

# Replit OAuth設定
REPL_ID="3982670a-b0a3-4407-a7b6-ca27d6fabfdf"
ISSUER_URL="https://replit.com/oidc"
```

## デプロイ手順

### 1. データベースセットアップ
```sql
-- セッションテーブル作成
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- ユーザーテーブル確認・作成
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. パッケージインストール
```bash
npm install
```

### 3. データベースマイグレーション
```bash
npm run db:push
```

### 4. アプリケーション起動
```bash
npm run build
npm start
```

## Replit OAuth設定

桜環境用のコールバックURLをReplitのOAuth設定に追加する必要があります：

1. Replit Developerコンソールにアクセス
2. アプリケーション設定を開く
3. コールバックURLに以下を追加：
   - `https://your-sakura-domain.com/api/callback`

## セキュリティ設定

### SSL/HTTPS
```bash
# 本番環境ではHTTPS必須
# Reverse ProxyまたはロードバランサーでSSL終端を設定
```

### セッション設定
```javascript
// cookie設定は本番環境では自動的にsecure: trueになります
cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: sessionTtl,
}
```

## 動作確認

1. `https://your-sakura-domain.com` でアプリケーションにアクセス
2. `/admin` ページで「Replitでログイン」ボタンをクリック
3. Replit認証を完了後、管理画面にアクセスできることを確認

## トラブルシューティング

### よくある問題
1. **コールバックURL不一致**: Replit OAuth設定を確認
2. **セッションエラー**: SESSION_SECRETが正しく設定されているか確認
3. **データベース接続エラー**: DATABASE_URLとPostgreSQL設定を確認
4. **管理者権限なし**: ADMIN_USER_IDが正しいReplitユーザーIDに設定されているか確認