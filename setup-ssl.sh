#!/bin/bash

# サーバー設定
SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
DOMAIN="neta.backspace.fm"

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

# SSL証明書セットアップ（Let's Encrypt）
setup_ssl() {
    log_info "SSL証明書をセットアップしています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << SSL_EOF
        # Certbot インストール
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
        
        # ファイアウォール設定（必要に応じて）
        sudo ufw allow 'Nginx Full'
        sudo ufw allow ssh
        
        # SSL証明書取得
        echo "SSL証明書を取得しています..."
        sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@backspace.fm --redirect
        
        # 自動更新設定
        echo "SSL証明書の自動更新を設定しています..."
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        
        # Nginx設定確認
        sudo nginx -t && sudo systemctl reload nginx
        
        echo "✅ SSL証明書のセットアップが完了しました"
        echo "🌐 https://$DOMAIN でアクセスできます"
SSL_EOF
    
    log_success "SSL証明書のセットアップが完了しました"
}

# SSL証明書更新
renew_ssl() {
    log_info "SSL証明書を更新しています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << RENEW_EOF
        sudo certbot renew --dry-run
        if [ $? -eq 0 ]; then
            sudo certbot renew
            sudo systemctl reload nginx
            echo "✅ SSL証明書が更新されました"
        else
            echo "❌ SSL証明書の更新に失敗しました"
        fi
RENEW_EOF
}

# SSL証明書状態確認
check_ssl_status() {
    log_info "SSL証明書の状態を確認しています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << STATUS_EOF
        echo "=== SSL証明書情報 ==="
        sudo certbot certificates
        
        echo ""
        echo "=== 証明書期限確認 ==="
        echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "SSL証明書が見つかりません"
        
        echo ""
        echo "=== Nginx SSL設定確認 ==="
        sudo nginx -t
STATUS_EOF
}

# 使用方法表示
show_usage() {
    echo "SSL証明書管理スクリプト"
    echo ""
    echo "使用方法: $0 <コマンド>"
    echo ""
    echo "利用可能なコマンド:"
    echo "  setup     - SSL証明書の初期セットアップ"
    echo "  renew     - SSL証明書の手動更新"
    echo "  status    - SSL証明書の状態確認"
    echo "  test      - HTTPS接続テスト"
    echo ""
}

# HTTPS接続テスト
test_https() {
    log_info "HTTPS接続をテストしています..."
    
    if curl -s --connect-timeout 10 https://$DOMAIN/api/version > /dev/null; then
        log_success "HTTPS接続が正常に動作しています"
        version_info=$(curl -s https://$DOMAIN/api/version)
        log_info "バージョン情報: $version_info"
    else
        log_error "HTTPS接続に失敗しました"
        log_info "HTTP接続を確認しています..."
        if curl -s --connect-timeout 10 http://$DOMAIN/api/version > /dev/null; then
            log_warning "HTTP接続は動作していますが、HTTPS接続に問題があります"
        else
            log_error "HTTP接続も失敗しました"
        fi
    fi
}

# メイン処理
case "$1" in
    setup)
        setup_ssl
        ;;
    renew)
        renew_ssl
        ;;
    status)
        check_ssl_status
        ;;
    test)
        test_https
        ;;
    *)
        show_usage
        exit 1
        ;;
esac