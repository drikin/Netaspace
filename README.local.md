# ローカル開発環境セットアップ

## 🐳 Docker環境 (推奨)

### 前提条件
- Docker Desktop がインストールされていること

### 初回セットアップ
```bash
# 1. リポジトリクローン
git clone <repository-url>
cd Netaspace

# 2. 依存関係インストール
npm install

# 3. Docker環境セットアップ & 開発サーバー起動
npm run dev:docker:setup
```

### 日常的な使用
```bash
# Docker + 開発サーバー起動
npm run dev:docker:setup

# または手動で
npm run docker:start  # PostgreSQL起動
npm run dev:docker    # 開発サーバー起動
```

### 便利なコマンド
```bash
npm run docker:start   # PostgreSQLコンテナ起動
npm run docker:stop    # PostgreSQLコンテナ停止
npm run docker:reset   # データベースリセット
npm run db:docker      # スキーマ適用のみ
```

## 🌐 リモートDB環境

### Neon PostgreSQL使用
```bash
# リモートDBで開発
npm run dev:local:setup
```

## 📝 開発フロー

### 1. 環境起動
```bash
npm run dev:docker:setup
```

### 2. アクセス
- アプリケーション: http://localhost:5000
- 管理画面: http://localhost:5000/admin
  - ユーザー名: admin
  - パスワード: fmbackspace55

### 3. データベース直接接続
```bash
# PostgreSQL接続
psql postgresql://netaspace_user:netaspace_password@localhost:5432/netaspace_local
```

## 🔧 トラブルシューティング

### ポート5432が使用中
```bash
# 既存のPostgreSQLを停止
brew services stop postgresql
# または
sudo lsof -ti:5432 | xargs kill -9
```

### データベースリセット
```bash
npm run docker:reset
```

### 完全クリーンアップ
```bash
docker-compose down -v
docker system prune -f
npm run dev:docker:setup
```