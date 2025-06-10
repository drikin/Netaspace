# Backspace.fm 本番デプロイメントガイド

このドキュメントでは、さくらクラウドサーバー（153.125.147.133）への本番デプロイメント手順を説明します。

## 🚀 クイックデプロイメント

### 初回デプロイ
```bash
# Replit Shellから実行
./deploy.sh
```

### アプリケーション管理
```bash
# 状態確認
./server-management.sh status

# ログ確認
./server-management.sh logs

# アプリケーション再起動
./server-management.sh restart

# データベースバックアップ
./server-management.sh backup
```

### SSL証明書セットアップ
```bash
# SSL証明書の初期セットアップ
./setup-ssl.sh setup

# SSL証明書の状態確認
./setup-ssl.sh status
```

## 📋 デプロイメント詳細

### サーバー構成
- **サーバー**: さくらクラウド (153.125.147.133)
- **OS**: Ubuntu
- **ドメイン**: neta.backspace.fm
- **アプリケーションポート**: 5000
- **データベース**: PostgreSQL 15

### アーキテクチャ
```
インターネット
    ↓ (HTTPS/HTTP)
Nginx (リバースプロキシ)
    ↓ (HTTP:5000)
Node.js アプリケーション (Docker)
    ↓ (PostgreSQL接続)
PostgreSQL データベース (Docker)
```

## 🛠️ 利用可能なスクリプト

### 1. deploy.sh
- **用途**: 初回デプロイ・更新デプロイ
- **機能**:
  - SSH接続テスト
  - サーバー環境セットアップ
  - アプリケーションファイル転送
  - Docker Compose設定
  - Nginx設定
  - アプリケーション起動
  - デプロイメント検証

### 2. server-management.sh
- **用途**: サーバー管理・メンテナンス
- **利用可能なコマンド**:
  - `status` - サーバー・アプリケーション状態確認
  - `logs` - アプリケーションログ表示
  - `restart` - アプリケーション再起動
  - `stop` - アプリケーション停止
  - `start` - アプリケーション開始
  - `backup` - データベースバックアップ
  - `shell` - SSH接続
  - `nginx` - Nginx管理
  - `cleanup` - Dockerリソースクリーンアップ
  - `update` - アプリケーション更新

### 3. setup-ssl.sh
- **用途**: SSL証明書管理
- **利用可能なコマンド**:
  - `setup` - Let's Encrypt SSL証明書セットアップ
  - `renew` - SSL証明書手動更新
  - `status` - SSL証明書状態確認
  - `test` - HTTPS接続テスト

## 🔧 環境変数

本番環境では以下の環境変数が設定されます：

```bash
NODE_ENV=production
POSTGRES_PASSWORD=backspace_secure_password_2024
SESSION_SECRET=backspace_session_secret_2024
DATABASE_URL=postgresql://backspace_user:${POSTGRES_PASSWORD}@postgres:5432/backspace_fm
```

## 📁 サーバー上のディレクトリ構造

```
/home/ubuntu/backspace-fm-app/
├── docker-compose.prod.yml    # 本番用Docker Compose設定
├── .env                       # 環境変数
├── Dockerfile                 # Dockerイメージ定義
├── package.json              # Node.js依存関係
├── server/                   # サーバーサイドコード
├── client/                   # クライアントサイドコード
├── shared/                   # 共有コード
├── backups/                  # データベースバックアップ
└── data/                     # アプリケーションデータ
```

## 🔍 トラブルシューティング

### アプリケーションが起動しない場合
```bash
# ログ確認
./server-management.sh logs

# コンテナ状態確認
./server-management.sh status

# アプリケーション再起動
./server-management.sh restart
```

### データベース接続エラー
```bash
# PostgreSQLコンテナ確認
ssh ubuntu@153.125.147.133 -i ~/.ssh/id_ed25519
cd /home/ubuntu/backspace-fm-app
docker-compose -f docker-compose.prod.yml logs postgres
```

### Nginx設定エラー
```bash
# Nginx設定確認・管理
./server-management.sh nginx
```

### SSL証明書エラー
```bash
# SSL証明書状態確認
./setup-ssl.sh status

# HTTPS接続テスト
./setup-ssl.sh test
```

## 📊 モニタリング

### 基本的なヘルスチェック
```bash
# APIバージョン確認
curl https://neta.backspace.fm/api/version

# HTTP応答時間測定
curl -w "@curl-format.txt" -o /dev/null -s https://neta.backspace.fm/

# サーバー状態確認
./server-management.sh status
```

### ログ監視
```bash
# リアルタイムログ監視
ssh ubuntu@153.125.147.133 -i ~/.ssh/id_ed25519
cd /home/ubuntu/backspace-fm-app
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔄 定期メンテナンス

### 推奨される定期作業

1. **毎日**
   - アプリケーション状態確認: `./server-management.sh status`

2. **毎週**
   - データベースバックアップ: `./server-management.sh backup`
   - ログ確認: `./server-management.sh logs`

3. **毎月**
   - SSL証明書状態確認: `./setup-ssl.sh status`
   - Dockerリソースクリーンアップ: `./server-management.sh cleanup`
   - システムアップデート（サーバー上で `sudo apt update && sudo apt upgrade -y`）

### 自動化スクリプト例
```bash
# crontabに追加する例
# 毎日午前3時にバックアップ作成
0 3 * * * cd /home/ubuntu && ./server-management.sh backup

# 毎週日曜日午前4時にクリーンアップ
0 4 * * 0 cd /home/ubuntu && ./server-management.sh cleanup
```

## 🚨 緊急時対応

### アプリケーション完全停止
```bash
./server-management.sh stop
```

### 緊急復旧（バックアップから復元）
```bash
# 最新バックアップから復元
ssh ubuntu@153.125.147.133 -i ~/.ssh/id_ed25519
cd /home/ubuntu/backspace-fm-app

# バックアップファイル確認
ls -la backups/

# 復元実行（例：backup_20240110_120000.sql）
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U backspace_user -d backspace_fm < backups/backup_20240110_120000.sql

# アプリケーション再起動
docker-compose -f docker-compose.prod.yml restart
```

### 完全再デプロイ
```bash
./deploy.sh
```

## 📞 サポート情報

- **サーバー管理**: このREADMEとスクリプトを参照
- **アプリケーション問題**: ログ確認 (`./server-management.sh logs`)
- **緊急時**: `./server-management.sh stop` で一時停止後、問題解決

## 🔐 セキュリティ

- SSH鍵認証を使用（パスワード認証は無効）
- Nginxセキュリティヘッダー設定済み
- PostgreSQLは外部アクセス不可（127.0.0.1のみ）
- SSL/TLS証明書（Let's Encrypt）
- ファイアウォール設定（SSH、HTTP、HTTPS のみ許可）