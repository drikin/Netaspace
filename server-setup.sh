#!/bin/bash

# さくらのクラウド Ubuntu サーバー初期設定スクリプト
# 使用方法: curl -sSL https://raw.githubusercontent.com/your-repo/setup.sh | bash

set -e

echo "🔧 さくらのクラウド Ubuntu サーバーの初期設定を開始します..."

# システムアップデート
echo "🔄 システムを更新中..."
sudo apt update && sudo apt upgrade -y

# 必要なパッケージのインストール
echo "📦 必要なパッケージをインストール中..."
sudo apt install -y nginx curl git ufw fail2ban

# Node.js 20.x のインストール
echo "🟢 Node.js をインストール中..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2のグローバルインストール
echo "⚡ PM2をインストール中..."
sudo npm install -g pm2

# ファイアウォール設定
echo "🔒 ファイアウォールを設定中..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Nginxの起動と有効化
echo "🌐 Nginxを設定中..."
sudo systemctl start nginx
sudo systemctl enable nginx

# PM2用のログディレクトリ作成
echo "📁 ログディレクトリを作成中..."
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Git設定の確認
if [ ! -f ~/.gitconfig ]; then
    echo "📝 Git設定を入力してください:"
    read -p "Git username: " git_username
    read -p "Git email: " git_email
    git config --global user.name "$git_username"
    git config --global user.email "$git_email"
fi

echo "✅ 初期設定完了！"
echo ""
echo "次のステップ:"
echo "1. アプリケーションをクローン: git clone <your-repo-url>"
echo "2. 環境変数を設定: cp .env.example .env && nano .env"
echo "3. デプロイスクリプトを実行: ./deploy-sakura.sh"
echo "4. SSL証明書を設定: sudo certbot --nginx -d neta.backspace.fm"
echo "5. Nginx設定を適用: sudo cp nginx-config.conf /etc/nginx/sites-available/neta.backspace.fm"
echo "   sudo ln -s /etc/nginx/sites-available/neta.backspace.fm /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"