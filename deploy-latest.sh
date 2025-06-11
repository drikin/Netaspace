#!/bin/bash

# サーバー設定
SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"
DOMAIN="neta.backspace.fm"

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ出力関数
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

# SSH接続テスト
test_ssh_connection() {
    log_info "SSH接続をテストしています..."
    if ssh -i $SSH_KEY -o ConnectTimeout=10 $SERVER_USER@$SERVER_HOST "echo 'SSH connection successful'" > /dev/null 2>&1; then
        log_success "SSH接続が確認されました"
        return 0
    else
        log_error "SSH接続に失敗しました"
        exit 1
    fi
}

# 最新コードのデプロイ
deploy_latest_code() {
    log_info "最新のアプリケーションコードをデプロイしています..."
    
    # 現在のディレクトリからファイルを圧縮（最新の変更を含む）
    log_info "最新のアプリケーションファイルを圧縮しています..."
    tar czf latest-app.tar.gz \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=dist \
        --exclude=.replit \
        --exclude=.config \
        --exclude='*.tar.gz' \
        --exclude='*.log' \
        --exclude=attached_assets \
        --exclude='*.sh' \
        .
    
    # サーバーにファイル転送
    log_info "サーバーに最新ファイルを転送しています..."
    scp -i $SSH_KEY latest-app.tar.gz $SERVER_USER@$SERVER_HOST:$APP_DIR/
    
    # 圧縮ファイルを削除
    rm latest-app.tar.gz
    
    # サーバー側で最新ファイル展開・セットアップ
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << DEPLOY_EOF
        cd $APP_DIR
        
        # 既存のアプリケーションを停止
        log_info "既存のアプリケーションを停止しています..."
        docker-compose down 2>/dev/null || true
        
        # バックアップ作成
        if [ -f package.json ]; then
            cp -r . ../backspace-fm-app-backup-\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
        fi
        
        # 新しいファイルを展開
        log_info "最新ファイルを展開しています..."
        tar xzf latest-app.tar.gz
        rm latest-app.tar.gz
        
        # 最新の環境変数ファイル作成（Neon database）
        cat > .env << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF
        
        # 最新のDocker Compose設定を使用（既存のdocker-compose.ymlを使用）
        log_info "アプリケーションをビルドしています..."
        docker-compose build --no-cache
        
        log_info "アプリケーションを起動しています..."
        docker-compose up -d
        
        # 起動待機
        echo "アプリケーションの起動を待機しています..."
        for i in {1..20}; do
            if curl -s http://127.0.0.1:5000/api/version > /dev/null; then
                echo "アプリケーションが正常に起動しました"
                break
            fi
            echo "起動待機中... (\$i/20)"
            sleep 3
        done
        
        # ステータス確認
        docker-compose ps
        echo ""
        echo "最新のアプリケーションログ："
        docker-compose logs --tail=10 backspace-fm
DEPLOY_EOF
    
    log_success "最新コードのデプロイが完了しました"
}

# デプロイメント検証
verify_latest_deployment() {
    log_info "最新デプロイメントを検証しています..."
    
    # ローカルからHTTPS接続テスト
    log_info "HTTPS接続をテストしています..."
    if curl -s --connect-timeout 10 https://$DOMAIN/api/version > /dev/null; then
        log_success "HTTPS接続が確認されました"
        version_info=$(curl -s https://$DOMAIN/api/version)
        log_info "バージョン情報: $version_info"
    else
        log_warning "HTTPS接続に問題があります。しばらく待ってから再度お試しください"
    fi
    
    # サーバー側でのステータス確認
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'VERIFY_EOF'
        echo "=== 最新アプリケーション状態 ==="
        cd /home/ubuntu/backspace-fm-app
        docker-compose ps
        echo ""
        
        echo "=== 最新アプリケーションログ（最新10行） ==="
        docker-compose logs --tail=10 backspace-fm
VERIFY_EOF
}

# メイン実行
main() {
    echo "================================================"
    echo "  Backspace.fm 最新コードデプロイメント"
    echo "================================================"
    echo ""
    echo "デプロイ先: $DOMAIN ($SERVER_HOST)"
    echo "SSH Key: $SSH_KEY"
    echo ""
    
    # 各ステップ実行
    test_ssh_connection
    deploy_latest_code
    verify_latest_deployment
    
    echo ""
    echo "================================================"
    log_success "最新コードのデプロイメントが完了しました！"
    echo "================================================"
    echo ""
    echo "🌐 ウェブサイト: https://$DOMAIN"
    echo "🔧 管理画面: https://$DOMAIN/admin"
    echo ""
    echo "📊 ステータス確認:"
    echo "   curl https://$DOMAIN/api/version"
    echo ""
    echo "🔍 ログ確認:"
    echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST"
    echo "   cd $APP_DIR && docker-compose logs -f"
    echo ""
}

# スクリプト実行
main "$@"