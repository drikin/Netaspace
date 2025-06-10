#!/bin/bash

# サーバー設定
SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 管理者ログイン問題の診断と修正
debug_admin_login() {
    log_info "管理者ログイン問題を診断しています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'DEBUG_EOF'
        cd /home/ubuntu/backspace-fm-app
        
        echo "=== Docker コンテナ状態 ==="
        docker-compose -f docker-compose.prod.yml ps
        echo ""
        
        echo "=== PostgreSQL接続テスト ==="
        if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U backspace_user -d backspace_fm; then
            echo "✅ PostgreSQL接続正常"
        else
            echo "❌ PostgreSQL接続失敗"
        fi
        echo ""
        
        echo "=== データベーステーブル確認 ==="
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d backspace_fm << 'SQL_EOF'
\dt
SQL_EOF
        echo ""
        
        echo "=== ユーザーテーブル確認 ==="
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d backspace_fm << 'SQL_EOF'
SELECT id, username, password, is_admin, email, created_at FROM users;
SQL_EOF
        echo ""
        
        echo "=== 管理者ユーザー存在確認 ==="
        ADMIN_EXISTS=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d backspace_fm -t -c "SELECT COUNT(*) FROM users WHERE username='admin';" | tr -d ' \n')
        if [ "$ADMIN_EXISTS" = "1" ]; then
            echo "✅ 管理者ユーザーが存在します"
        else
            echo "❌ 管理者ユーザーが存在しません"
        fi
        echo ""
        
        echo "=== セッションテーブル確認 ==="
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d backspace_fm << 'SQL_EOF'
SELECT COUNT(*) as session_count FROM sessions;
SQL_EOF
        echo ""
        
        echo "=== アプリケーションログ（認証関連） ==="
        docker-compose -f docker-compose.prod.yml logs backspace-fm | grep -i -E "(auth|login|passport|session)" | tail -10
        echo ""
        
        echo "=== 環境変数確認 ==="
        docker-compose -f docker-compose.prod.yml exec backspace-fm printenv | grep -E "(DATABASE_URL|SESSION_SECRET|NODE_ENV)"
        echo ""
DEBUG_EOF
}

# 管理者ユーザーを作成/修正
fix_admin_user() {
    log_info "管理者ユーザーを作成/修正しています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'FIX_EOF'
        cd /home/ubuntu/backspace-fm-app
        
        echo "=== 管理者ユーザーの作成/更新 ==="
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d backspace_fm << 'SQL_EOF'
-- 管理者ユーザーを作成または更新
INSERT INTO users (username, password, is_admin, email, created_at, updated_at) 
VALUES ('admin', 'fmbackspace55', true, 'admin@backspace.fm', NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET 
  password = EXCLUDED.password,
  is_admin = EXCLUDED.is_admin,
  email = EXCLUDED.email,
  updated_at = NOW();

-- 確認
SELECT id, username, password, is_admin, email FROM users WHERE username='admin';
SQL_EOF
        
        echo ""
        echo "=== セッションテーブル初期化 ==="
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d backspace_fm << 'SQL_EOF'
-- 古いセッションをクリア
DELETE FROM sessions WHERE expire < NOW();

-- セッションテーブル状態確認
SELECT COUNT(*) as active_sessions FROM sessions WHERE expire > NOW();
SQL_EOF
        
        echo ""
        echo "=== アプリケーション再起動 ==="
        docker-compose -f docker-compose.prod.yml restart backspace-fm
        
        echo "アプリケーションの再起動を待機しています..."
        for i in {1..15}; do
            if curl -s http://127.0.0.1:5000/api/version > /dev/null; then
                echo "✅ アプリケーションが正常に再起動しました"
                break
            fi
            echo "起動待機中... ($i/15)"
            sleep 3
        done
FIX_EOF
    
    log_success "管理者ユーザーの修正が完了しました"
}

# データベーススキーマ初期化
init_database_schema() {
    log_info "データベーススキーマを初期化しています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'SCHEMA_EOF'
        cd /home/ubuntu/backspace-fm-app
        
        echo "=== データベーススキーマ初期化 ==="
        docker-compose -f docker-compose.prod.yml exec backspace-fm npm run db:push
        
        echo ""
        echo "=== 初期データ作成 ==="
        docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d backspace_fm << 'SQL_EOF'
-- 管理者ユーザー作成
INSERT INTO users (username, password, is_admin, email, created_at, updated_at) 
VALUES ('admin', 'fmbackspace55', true, 'admin@backspace.fm', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- 初期週作成
INSERT INTO weeks (title, start_date, end_date, is_active, created_at, updated_at)
VALUES ('Week 1', '2025-01-06', '2025-01-12', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 確認
SELECT 'Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Weeks:', COUNT(*) FROM weeks
UNION ALL
SELECT 'Topics:', COUNT(*) FROM topics
UNION ALL
SELECT 'Stars:', COUNT(*) FROM stars;
SQL_EOF
SCHEMA_EOF
}

# ログイン機能テスト
test_login() {
    log_info "ログイン機能をテストしています..."
    
    # サーバーでログインAPIをテスト
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'TEST_EOF'
        cd /home/ubuntu/backspace-fm-app
        
        echo "=== ログインAPIテスト ==="
        curl -X POST \
             -H "Content-Type: application/json" \
             -d '{"username":"admin","password":"fmbackspace55"}' \
             -c cookies.txt \
             http://127.0.0.1:5000/api/auth/login
        
        echo ""
        echo ""
        echo "=== 認証状態確認 ==="
        curl -b cookies.txt http://127.0.0.1:5000/api/auth/me
        
        echo ""
        echo ""
        echo "=== クッキー内容 ==="
        cat cookies.txt 2>/dev/null || echo "クッキーファイルが見つかりません"
        
        # クリーンアップ
        rm -f cookies.txt
TEST_EOF
}

# 使用方法表示
show_usage() {
    echo "管理者ログイン診断・修正スクリプト"
    echo ""
    echo "使用方法: $0 <コマンド>"
    echo ""
    echo "利用可能なコマンド:"
    echo "  debug     - 管理者ログイン問題の診断"
    echo "  fix       - 管理者ユーザーの作成/修正"
    echo "  init      - データベーススキーマ初期化"
    echo "  test      - ログイン機能テスト"
    echo "  all       - 全ての修正を順次実行"
    echo ""
}

# 全修正実行
fix_all() {
    log_info "管理者ログイン問題の完全修正を開始します..."
    
    debug_admin_login
    echo ""
    
    init_database_schema
    echo ""
    
    fix_admin_user
    echo ""
    
    test_login
    echo ""
    
    log_success "管理者ログイン問題の修正が完了しました"
    echo ""
    echo "🌐 管理画面URL: http://neta.backspace.fm/admin"
    echo "👤 ユーザー名: admin"
    echo "🔑 パスワード: fmbackspace55"
    echo ""
    echo "ログインに問題がある場合は、ブラウザのキャッシュとクッキーをクリアしてください。"
}

# メイン処理
case "$1" in
    debug)
        debug_admin_login
        ;;
    fix)
        fix_admin_user
        ;;
    init)
        init_database_schema
        ;;
    test)
        test_login
        ;;
    all)
        fix_all
        ;;
    *)
        show_usage
        exit 1
        ;;
esac