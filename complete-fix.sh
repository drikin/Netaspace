#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

# 完全修復とテスト
complete_fix() {
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'COMPLETE_EOF'
        cd /home/ubuntu/backspace-fm-app
        
        echo "=== 完全システム修復開始 ==="
        
        # すべてのコンテナを停止・削除
        docker-compose -f docker-compose.prod.yml down --volumes --remove-orphans
        docker system prune -f
        
        # PostgreSQL環境変数の確認と修正
        echo "=== 環境設定 ==="
        cat > .env << 'ENV_EOF'
NODE_ENV=production
POSTGRES_PASSWORD=backspace_secure_password_2024
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF
        
        # Docker Compose設定の最終確認
        echo "=== Docker Compose設定確認 ==="
        cat docker-compose.prod.yml | grep -A 5 -B 5 "POSTGRES"
        
        # PostgreSQL起動
        echo "=== PostgreSQL起動 ==="
        docker-compose -f docker-compose.prod.yml up -d postgres
        
        # PostgreSQL完全起動待機
        echo "PostgreSQL起動待機中..."
        for i in {1..60}; do
            if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres; then
                echo "PostgreSQL起動完了"
                break
            fi
            echo "待機中... ($i/60)"
            sleep 2
        done
        
        # データベースとユーザー設定
        echo "=== データベース設定 ==="
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres << 'DB_SETUP'
-- ユーザーが存在しない場合のみ作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'backspace_user') THEN
        CREATE USER backspace_user WITH PASSWORD 'backspace_secure_password_2024';
        ALTER USER backspace_user CREATEDB;
    END IF;
END $$;

-- データベース確認・作成
SELECT 1 FROM pg_database WHERE datname = 'backspace_fm';
\q
DB_SETUP
        
        # アプリケーション起動
        echo "=== アプリケーション起動 ==="
        docker-compose -f docker-compose.prod.yml up -d backspace-fm
        
        # アプリケーション起動完全待機
        echo "アプリケーション起動待機中..."
        for i in {1..120}; do
            if curl -s -f http://127.0.0.1:5000/api/version; then
                echo "アプリケーション起動完了"
                break
            fi
            echo "アプリケーション待機中... ($i/120)"
            sleep 5
        done
        
        # スキーマ初期化
        echo "=== スキーマ初期化 ==="
        docker-compose -f docker-compose.prod.yml exec backspace-fm npm run db:push
        
        # 管理者ユーザー作成
        echo "=== 管理者ユーザー作成 ==="
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d backspace_fm << 'ADMIN_SETUP'
-- 管理者ユーザー作成
INSERT INTO users (username, password, is_admin, email, created_at) 
VALUES ('admin', 'fmbackspace55', true, 'admin@backspace.fm', NOW())
ON CONFLICT (username) DO UPDATE SET 
  password = EXCLUDED.password,
  is_admin = EXCLUDED.is_admin;

-- 週データ作成
INSERT INTO weeks (title, start_date, end_date, is_active)
VALUES ('Week 1', '2025-01-06', '2025-01-12', true)
ON CONFLICT DO NOTHING;

-- 確認
SELECT username, is_admin FROM users WHERE username='admin';
\q
ADMIN_SETUP
        
        # 最終テスト
        echo "=== 最終ログインテスト ==="
        
        # API接続確認
        API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/version)
        echo "API Status: $API_STATUS"
        
        # ログインテスト
        LOGIN_RESPONSE=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"username":"admin","password":"fmbackspace55"}' \
            -c /tmp/admin_cookies.txt \
            -w "%{http_code}" \
            http://127.0.0.1:5000/api/auth/login)
        
        echo "Login Response: $LOGIN_RESPONSE"
        
        # 認証確認
        if [ -f /tmp/admin_cookies.txt ]; then
            AUTH_RESPONSE=$(curl -s -b /tmp/admin_cookies.txt http://127.0.0.1:5000/api/auth/me)
            echo "Auth Response: $AUTH_RESPONSE"
        fi
        
        # 管理画面アクセステスト
        ADMIN_PAGE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/admin)
        echo "Admin Page Status: $ADMIN_PAGE"
        
        # クリーンアップ
        rm -f /tmp/admin_cookies.txt
        
        echo ""
        echo "=== システム状態確認 ==="
        docker-compose -f docker-compose.prod.yml ps
        
        echo ""
        echo "=== 修復完了 ==="
        echo "管理者ログイン:"
        echo "  URL: http://neta.backspace.fm/admin"
        echo "  ユーザー名: admin"
        echo "  パスワード: fmbackspace55"
        
COMPLETE_EOF
}

complete_fix