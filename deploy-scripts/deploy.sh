#!/bin/bash
# 桜環境デプロイスクリプト

set -e

echo "🚀 桜環境へのデプロイを開始します..."

# 環境変数の確認
if [ ! -f ".env" ]; then
    echo "❌ .envファイルが見つかりません。.env.exampleを参考に作成してください。"
    exit 1
fi

# Docker と Docker Compose の確認
if ! command -v docker &> /dev/null; then
    echo "❌ Dockerがインストールされていません。"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Composeがインストールされていません。"
    exit 1
fi

# 既存のコンテナを停止・削除
echo "🛑 既存のコンテナを停止しています..."
docker-compose down --remove-orphans

# 新しいイメージをビルド
echo "🔨 新しいDockerイメージをビルドしています..."
docker-compose build --no-cache

# データベースマイグレーション
echo "🗄️ データベースを初期化しています..."
docker-compose up -d postgres
sleep 10

# アプリケーションを起動
echo "🚀 アプリケーションを起動しています..."
docker-compose up -d

# ヘルスチェック
echo "🏥 ヘルスチェックを実行しています..."
sleep 30

if curl -f http://localhost:5000/api/version; then
    echo "✅ デプロイが完了しました！"
    echo "🌐 アプリケーションは https://your-domain.com でアクセスできます"
    echo "👤 管理画面: https://your-domain.com/admin"
else
    echo "❌ ヘルスチェックに失敗しました。ログを確認してください："
    docker-compose logs app
    exit 1
fi