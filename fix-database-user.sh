#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"

# PostgreSQLユーザー問題の修正
fix_database_user() {
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'FIX_EOF'
        cd /home/ubuntu/backspace-fm-app
        
        echo "=== PostgreSQLユーザー問題の修正 ==="
        
        # 1. 現在のDockerコンテナ状態確認
        docker-compose -f docker-compose.prod.yml ps
        
        echo ""
        echo "=== PostgreSQLコンテナ内でユーザー作成 ==="
        # PostgreSQLコンテナ内で必要なユーザーとデータベースを作成
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres << 'SQL_EOF'
-- backspace_userを作成
CREATE USER backspace_user WITH PASSWORD 'backspace_secure_password_2024';

-- データベース作成権限付与
ALTER USER backspace_user CREATEDB;

-- backspace_fmデータベースの所有者をbackspace_userに変更
ALTER DATABASE backspace_fm OWNER TO backspace_user;

-- 必要な権限付与
GRANT ALL PRIVILEGES ON DATABASE backspace_fm TO backspace_user;

-- 作成したユーザー確認
\du
SQL_EOF
        
        echo ""
        echo "=== アプリケーション環境変数の確認と修正 ==="
        
        # 環境変数ファイルの更新
        cat > .env << 'ENV_EOF'
NODE_ENV=production
POSTGRES_PASSWORD=backspace_secure_password_2024
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF
        
        echo ""
        echo "=== アプリケーションとPostgreSQLの再起動 ==="
        
        # アプリケーションを停止
        docker-compose -f docker-compose.prod.yml down
        
        # PostgreSQLを先に起動
        docker-compose -f docker-compose.prod.yml up -d postgres
        
        # PostgreSQLの完全起動を待機
        echo "PostgreSQLの起動を待機しています..."
        for i in {1..30}; do
            if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U backspace_user -d backspace_fm; then
                echo "✅ PostgreSQLが正常に起動しました"
                break
            fi
            echo "PostgreSQL起動待機中... ($i/30)"
            sleep 2
        done
        
        echo ""
        echo "=== データベーススキーマの初期化 ==="
        
        # アプリケーションを起動してスキーマを初期化
        docker-compose -f docker-compose.prod.yml up -d backspace-fm
        
        # アプリケーション起動待機
        echo "アプリケーションの起動を待機しています..."
        for i in {1..20}; do
            if curl -s http://127.0.0.1:5000/api/version > /dev/null; then
                echo "✅ アプリケーションが正常に起動しました"
                break
            fi
            echo "アプリケーション起動待機中... ($i/20)"
            sleep 3
        done
        
        echo ""
        echo "=== データベーススキーマとテーブル作成 ==="
        
        # Drizzleでスキーマをプッシュ
        docker-compose -f docker-compose.prod.yml exec backspace-fm npm run db:push
        
        echo ""
        echo "=== 管理者ユーザーとテストデータの作成 ==="
        
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U backspace_user -d backspace_fm << 'DATA_EOF'
-- 管理者ユーザー作成
INSERT INTO users (username, password, is_admin, email, created_at) 
VALUES ('admin', 'fmbackspace55', true, 'admin@backspace.fm', NOW())
ON CONFLICT (username) DO UPDATE SET 
  password = EXCLUDED.password,
  is_admin = EXCLUDED.is_admin,
  email = EXCLUDED.email;

-- 週データ作成
INSERT INTO weeks (title, start_date, end_date, is_active)
VALUES ('Week 1', '2025-01-06', '2025-01-12', true)
ON CONFLICT DO NOTHING;

-- データ確認
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Weeks', COUNT(*) FROM weeks;

-- 管理者ユーザー詳細確認
SELECT id, username, is_admin, email FROM users WHERE username='admin';
DATA_EOF
        
        echo ""
        echo "=== 最終接続テスト ==="
        
        # 管理者ログインテスト
        echo "管理者ログインテスト実行中..."
        LOGIN_RESULT=$(curl -s -X POST \
             -H "Content-Type: application/json" \
             -d '{"username":"admin","password":"fmbackspace55"}' \
             -c /tmp/login_test.txt \
             http://127.0.0.1:5000/api/auth/login)
        
        echo "ログイン結果: $LOGIN_RESULT"
        
        # 認証状態確認
        AUTH_RESULT=$(curl -s -b /tmp/login_test.txt http://127.0.0.1:5000/api/auth/me)
        echo "認証状態: $AUTH_RESULT"
        
        # クリーンアップ
        rm -f /tmp/login_test.txt
        
        echo ""
        echo "=== システム状態確認 ==="
        docker-compose -f docker-compose.prod.yml ps
        
        echo ""
        echo "✅ データベースユーザー問題の修正が完了しました"
        
FIX_EOF
}

fix_database_user