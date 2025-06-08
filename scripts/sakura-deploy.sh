#!/bin/bash

# さくらのクラウド自動デプロイスクリプト
set -e

echo "=== さくらのクラウド デプロイスクリプト ==="

# 環境変数チェック
if [ -z "$SAKURA_SERVER_IP" ]; then
    read -p "サーバーIPアドレスを入力してください: " SAKURA_SERVER_IP
fi

if [ -z "$SAKURA_USER" ]; then
    SAKURA_USER="ubuntu"
fi

echo "デプロイ先: $SAKURA_USER@$SAKURA_SERVER_IP"

# データベースバックアップ作成
echo "=== ローカルバックアップ作成 ==="
if [ -f "scripts/deploy-with-backup.js" ]; then
    node scripts/deploy-with-backup.js pre-deploy
fi

# ファイル圧縮
echo "=== アプリケーションファイル圧縮 ==="
tar -czf backspace-fm-app.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.replit \
    --exclude="*.log" \
    --exclude=/tmp \
    .

# サーバーにファイル転送
echo "=== ファイル転送 ==="
scp backspace-fm-app.tar.gz $SAKURA_USER@$SAKURA_SERVER_IP:~/

# サーバー上でデプロイ実行
echo "=== リモートデプロイ実行 ==="
ssh $SAKURA_USER@$SAKURA_SERVER_IP << 'ENDSSH'
    # Docker Compose インストール確認
    if ! command -v docker-compose &> /dev/null; then
        echo "Docker Compose をインストール中..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        # パスを追加
        export PATH="/usr/local/bin:$PATH"
    fi
    
    # 作業ディレクトリ作成
    mkdir -p ~/backspace-fm-app
    cd ~/backspace-fm-app
    
    # 既存のアプリケーション停止
    if [ -f "docker-compose.yml" ]; then
        /usr/local/bin/docker-compose down || docker compose down || true
    fi
    
    # ファイル展開
    tar -xzf ~/backspace-fm-app.tar.gz
    
    # Docker ビルド & 起動
    /usr/local/bin/docker-compose up --build -d || docker compose up --build -d
    
    # ヘルスチェック
    echo "=== ヘルスチェック ==="
    sleep 10
    if curl -f http://localhost:5000/api/version; then
        echo "✓ デプロイ成功: アプリケーションが正常に動作しています"
    else
        echo "✗ デプロイ失敗: アプリケーションに問題があります"
        /usr/local/bin/docker-compose logs || docker compose logs
        exit 1
    fi
    
    # 一時ファイル削除
    rm ~/backspace-fm-app.tar.gz
ENDSSH

# ローカル一時ファイル削除
rm backspace-fm-app.tar.gz

echo "=== デプロイ完了 ==="
echo "アプリケーションURL: http://$SAKURA_SERVER_IP:5000"
echo ""
echo "管理コマンド:"
echo "  ログ確認: ssh $SAKURA_USER@$SAKURA_SERVER_IP 'cd ~/backspace-fm-app && docker-compose logs -f'"
echo "  再起動: ssh $SAKURA_USER@$SAKURA_SERVER_IP 'cd ~/backspace-fm-app && docker-compose restart'"
echo "  停止: ssh $SAKURA_USER@$SAKURA_SERVER_IP 'cd ~/backspace-fm-app && docker-compose down'"