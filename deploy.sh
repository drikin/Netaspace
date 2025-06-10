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

# サーバー環境セットアップ
setup_server_environment() {
    log_info "サーバー環境をセットアップしています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'SETUP_EOF'
        # システムアップデート
        sudo apt update && sudo apt upgrade -y
        
        # 必要なパッケージインストール
        sudo apt install -y docker.io docker-compose nginx git curl
        
        # Dockerサービス開始・有効化
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker $USER
        
        # Nginxサービス開始・有効化
        sudo systemctl start nginx
        sudo systemctl enable nginx
        
        # アプリケーションディレクトリ作成
        mkdir -p /home/ubuntu/backspace-fm-app
        
        echo "サーバー環境セットアップが完了しました"
SETUP_EOF
    
    log_success "サーバー環境セットアップが完了しました"
}

# アプリケーションコードをサーバーに転送
deploy_application() {
    log_info "アプリケーションをデプロイしています..."
    
    # 現在のディレクトリからファイルを圧縮
    log_info "アプリケーションファイルを圧縮しています..."
    tar czf app.tar.gz \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=dist \
        --exclude=.replit \
        --exclude=.config \
        --exclude=app.tar.gz \
        --exclude='*.log' \
        .
    
    # サーバーにファイル転送
    log_info "サーバーにファイルを転送しています..."
    scp -i $SSH_KEY app.tar.gz $SERVER_USER@$SERVER_HOST:$APP_DIR/
    
    # 圧縮ファイルを削除
    rm app.tar.gz
    
    # サーバー側でファイル展開・セットアップ
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << DEPLOY_EOF
        cd $APP_DIR
        
        # 既存のアプリケーションファイルをバックアップ
        if [ -f docker-compose.yml ]; then
            sudo docker-compose down || true
            cp -r . ../backspace-fm-app-backup-\$(date +%Y%m%d_%H%M%S) || true
        fi
        
        # 新しいファイルを展開
        rm -rf ./* ./.* 2>/dev/null || true
        tar xzf app.tar.gz
        rm app.tar.gz
        
        # 本番用環境変数ファイル作成
        cat > .env << 'ENV_EOF'
NODE_ENV=production
POSTGRES_PASSWORD=backspace_secure_password_2024
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF
        
        # 本番用Docker Compose設定作成
        cat > docker-compose.prod.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: backspace-postgres
    environment:
      POSTGRES_DB: backspace_fm
      POSTGRES_USER: backspace_user
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-backspace_secure_password_2024}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "127.0.0.1:5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U backspace_user -d backspace_fm"]
      interval: 30s
      timeout: 10s
      retries: 3

  backspace-fm:
    build: .
    container_name: backspace-app
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://backspace_user:\${POSTGRES_PASSWORD:-backspace_secure_password_2024}@postgres:5432/backspace_fm
      SESSION_SECRET: \${SESSION_SECRET:-backspace_session_secret_2024}
      PORT: 5000
    ports:
      - "127.0.0.1:5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - ./data:/app/data

volumes:
  postgres_data:
COMPOSE_EOF
        
        # バックアップディレクトリ作成
        mkdir -p backups data
        
        echo "アプリケーションファイルの展開が完了しました"
DEPLOY_EOF
    
    log_success "アプリケーションファイルがサーバーに転送されました"
}

# Nginx設定
setup_nginx() {
    log_info "Nginx設定を行います..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'NGINX_EOF'
        # Nginx設定ファイル作成
        sudo tee /etc/nginx/sites-available/backspace-fm << 'NGINX_CONF'
server {
    listen 80;
    server_name neta.backspace.fm;
    
    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # アップロードサイズ制限
    client_max_body_size 10M;
    
    # バックエンドへのプロキシ
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket対応
    location /ws {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静的ファイル配信（必要に応じて）
    location /static {
        alias /home/ubuntu/backspace-fm-app/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_CONF
        
        # サイト有効化
        sudo ln -sf /etc/nginx/sites-available/backspace-fm /etc/nginx/sites-enabled/
        
        # デフォルトサイト無効化
        sudo rm -f /etc/nginx/sites-enabled/default
        
        # Nginx設定テスト
        sudo nginx -t
        
        # Nginx再起動
        sudo systemctl reload nginx
        
        echo "Nginx設定が完了しました"
NGINX_EOF
    
    log_success "Nginx設定が完了しました"
}

# アプリケーション起動
start_application() {
    log_info "アプリケーションを起動しています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'START_EOF'
        cd /home/ubuntu/backspace-fm-app
        
        # Docker Composeでアプリケーション起動
        docker-compose -f docker-compose.prod.yml down || true
        docker-compose -f docker-compose.prod.yml build --no-cache
        docker-compose -f docker-compose.prod.yml up -d
        
        # 起動待機
        echo "アプリケーションの起動を待機しています..."
        for i in {1..30}; do
            if curl -s http://127.0.0.1:5000/api/version > /dev/null; then
                echo "アプリケーションが正常に起動しました"
                break
            fi
            echo "起動待機中... ($i/30)"
            sleep 5
        done
        
        # ステータス確認
        docker-compose -f docker-compose.prod.yml ps
START_EOF
    
    log_success "アプリケーションが起動しました"
}

# デプロイメント検証
verify_deployment() {
    log_info "デプロイメントを検証しています..."
    
    # ローカルからHTTP接続テスト
    log_info "HTTP接続をテストしています..."
    if curl -s --connect-timeout 10 http://$SERVER_HOST/api/version > /dev/null; then
        log_success "HTTP接続が確認されました"
        version_info=$(curl -s http://$SERVER_HOST/api/version)
        log_info "バージョン情報: $version_info"
    else
        log_warning "HTTP接続に問題があります。Nginxまたはアプリケーションの設定を確認してください"
    fi
    
    # サーバー側でのステータス確認
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'VERIFY_EOF'
        echo "=== サービス状態 ==="
        sudo systemctl status nginx --no-pager -l
        echo ""
        
        echo "=== Docker Container状態 ==="
        cd /home/ubuntu/backspace-fm-app
        docker-compose -f docker-compose.prod.yml ps
        echo ""
        
        echo "=== アプリケーションログ（最新10行） ==="
        docker-compose -f docker-compose.prod.yml logs --tail=10 backspace-fm
VERIFY_EOF
}

# メイン実行
main() {
    echo "================================================"
    echo "  Backspace.fm 本番サーバーデプロイメント"
    echo "================================================"
    echo ""
    echo "デプロイ先: $DOMAIN ($SERVER_HOST)"
    echo "SSH Key: $SSH_KEY"
    echo ""
    
    # 各ステップ実行
    test_ssh_connection
    
    # 初回セットアップか確認
    if ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST "[ ! -d $APP_DIR ]"; then
        log_info "初回デプロイメントを開始します"
        setup_server_environment
        setup_nginx
    else
        log_info "既存環境への更新デプロイメントを開始します"
    fi
    
    deploy_application
    start_application
    verify_deployment
    
    echo ""
    echo "================================================"
    log_success "デプロイメントが完了しました！"
    echo "================================================"
    echo ""
    echo "🌐 ウェブサイト: http://$DOMAIN"
    echo "🔧 管理画面: http://$DOMAIN/admin"
    echo ""
    echo "📊 ステータス確認:"
    echo "   curl http://$DOMAIN/api/version"
    echo ""
    echo "🔍 ログ確認:"
    echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST"
    echo "   cd $APP_DIR && docker-compose -f docker-compose.prod.yml logs -f"
    echo ""
    echo "🔄 再デプロイ:"
    echo "   ./deploy.sh"
    echo ""
}

# スクリプト実行
main "$@"