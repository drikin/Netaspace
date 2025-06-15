#!/bin/bash

# さくらのクラウドでのデプロイメントスクリプト
# 使用方法: ./deploy-sakura.sh

set -e

echo "🚀 さくらのクラウドへのデプロイを開始します..."

# 1. 依存関係のインストール
echo "📦 依存関係をインストール中..."
npm ci --production

# 2. ビルド実行
echo "🔨 アプリケーションをビルド中..."
npm run build

# 3. PM2がインストールされていない場合はインストール
if ! command -v pm2 &> /dev/null; then
    echo "📥 PM2をインストール中..."
    sudo npm install -g pm2
fi

# 4. 環境変数の確認
if [ ! -f .env ]; then
    echo "⚠️  .env ファイルが見つかりません"
    echo "DATABASE_URL等の環境変数を設定してください"
    exit 1
fi

# 5. データベース接続テスト
echo "🗄️  データベース接続をテスト中..."
npm run db:push

# 6. PM2でアプリケーションを起動/再起動
echo "🔄 アプリケーションを起動中..."
pm2 stop neta-app 2>/dev/null || true
pm2 delete neta-app 2>/dev/null || true
pm2 start dist/index.js --name "neta-app" --max-memory-restart 300M

# 7. PM2の自動起動設定
echo "⚙️  PM2の自動起動を設定中..."
pm2 save
pm2 startup

echo "✅ デプロイ完了！"
echo "📊 アプリケーション状態:"
pm2 status
echo ""
echo "📝 ログ確認: pm2 logs neta-app"
echo "🔄 再起動: pm2 restart neta-app"
echo "⏹️  停止: pm2 stop neta-app"