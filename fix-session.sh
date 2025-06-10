#!/bin/bash

# サーバー設定
SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"

# セッション設定修正とテスト
fix_session_and_test() {
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'FIX_EOF'
        cd /home/ubuntu/backspace-fm-app
        
        echo "=== セッション設定修正 ==="
        # routes.tsファイル内のsecure cookieオプションを修正
        sed -i 's/secure: process\.env\.NODE_ENV === '\''production'\'' && process\.env\.HTTPS === '\''true'\''/secure: false \/\/ HTTP deployment - will be handled by nginx proxy/' server/routes.ts
        
        echo "=== アプリケーション再ビルド・再起動 ==="
        docker-compose -f docker-compose.prod.yml down
        docker-compose -f docker-compose.prod.yml build --no-cache
        docker-compose -f docker-compose.prod.yml up -d
        
        echo "アプリケーションの起動を待機しています..."
        for i in {1..20}; do
            if curl -s http://127.0.0.1:5000/api/version > /dev/null; then
                echo "✅ アプリケーションが正常に起動しました"
                break
            fi
            echo "起動待機中... ($i/20)"
            sleep 5
        done
        
        echo ""
        echo "=== 管理者ログインテスト ==="
        # ログインテスト
        curl -X POST \
             -H "Content-Type: application/json" \
             -d '{"username":"admin","password":"fmbackspace55"}' \
             -c /tmp/test_cookies.txt \
             http://127.0.0.1:5000/api/auth/login
        
        echo ""
        echo ""
        echo "=== 認証状態確認 ==="
        curl -b /tmp/test_cookies.txt http://127.0.0.1:5000/api/auth/me
        
        echo ""
        echo ""
        echo "=== クッキー詳細 ==="
        cat /tmp/test_cookies.txt 2>/dev/null || echo "クッキーファイルが見つかりません"
        
        # クリーンアップ
        rm -f /tmp/test_cookies.txt
        
        echo ""
        echo ""
        echo "=== 最終確認 - 外部アクセステスト ==="
        curl -I http://127.0.0.1:5000/admin
FIX_EOF
}

fix_session_and_test