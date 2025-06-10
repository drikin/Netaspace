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

# 使用方法表示
show_usage() {
    echo "Backspace.fm サーバー管理スクリプト"
    echo ""
    echo "使用方法: $0 <コマンド>"
    echo ""
    echo "利用可能なコマンド:"
    echo "  status    - サーバーとアプリケーションの状態確認"
    echo "  logs      - アプリケーションログを表示"
    echo "  restart   - アプリケーションを再起動"
    echo "  stop      - アプリケーションを停止"
    echo "  start     - アプリケーションを開始"
    echo "  backup    - データベースバックアップ作成"
    echo "  restore   - データベースバックアップから復元"
    echo "  update    - アプリケーション更新（再デプロイ）"
    echo "  shell     - サーバーにSSH接続"
    echo "  nginx     - Nginx設定確認・再起動"
    echo "  cleanup   - 古いDockerイメージとコンテナを削除"
    echo ""
}

# サーバー状態確認
check_status() {
    log_info "サーバー状態を確認しています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'STATUS_EOF'
        echo "=== システム情報 ==="
        echo "ホスト名: $(hostname)"
        echo "稼働時間: $(uptime)"
        echo "ディスク使用量: $(df -h / | tail -1)"
        echo "メモリ使用量: $(free -h | grep 'Mem:' | awk '{print $3"/"$2}')"
        echo ""
        
        echo "=== Nginx状態 ==="
        sudo systemctl status nginx --no-pager -l | head -10
        echo ""
        
        echo "=== Docker状態 ==="
        docker --version
        echo "実行中のコンテナ:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        
        echo "=== アプリケーション状態 ==="
        cd /home/ubuntu/backspace-fm-app 2>/dev/null || echo "アプリケーションディレクトリが見つかりません"
        if [ -f docker-compose.prod.yml ]; then
            docker-compose -f docker-compose.prod.yml ps
            echo ""
            echo "アプリケーション接続テスト:"
            if curl -s --connect-timeout 5 http://127.0.0.1:5000/api/version > /dev/null; then
                echo "✅ アプリケーションは正常に動作しています"
                echo "バージョン: $(curl -s http://127.0.0.1:5000/api/version)"
            else
                echo "❌ アプリケーションに接続できません"
            fi
        else
            echo "Docker Compose設定ファイルが見つかりません"
        fi
STATUS_EOF
}

# ログ表示
show_logs() {
    log_info "アプリケーションログを表示しています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'LOGS_EOF'
        cd /home/ubuntu/backspace-fm-app
        if [ -f docker-compose.prod.yml ]; then
            echo "=== アプリケーションログ（最新50行） ==="
            docker-compose -f docker-compose.prod.yml logs --tail=50 backspace-fm
            echo ""
            echo "=== PostgreSQLログ（最新20行） ==="
            docker-compose -f docker-compose.prod.yml logs --tail=20 postgres
            echo ""
            echo "リアルタイムログを見るには: docker-compose -f docker-compose.prod.yml logs -f"
        else
            echo "Docker Compose設定ファイルが見つかりません"
        fi
LOGS_EOF
}

# アプリケーション再起動
restart_app() {
    log_info "アプリケーションを再起動しています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'RESTART_EOF'
        cd /home/ubuntu/backspace-fm-app
        if [ -f docker-compose.prod.yml ]; then
            docker-compose -f docker-compose.prod.yml restart
            echo "アプリケーションの起動を待機しています..."
            for i in {1..15}; do
                if curl -s http://127.0.0.1:5000/api/version > /dev/null; then
                    echo "✅ アプリケーションが正常に再起動しました"
                    break
                fi
                echo "起動待機中... ($i/15)"
                sleep 3
            done
        else
            echo "Docker Compose設定ファイルが見つかりません"
        fi
RESTART_EOF
    
    log_success "アプリケーション再起動が完了しました"
}

# アプリケーション停止
stop_app() {
    log_info "アプリケーションを停止しています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'STOP_EOF'
        cd /home/ubuntu/backspace-fm-app
        if [ -f docker-compose.prod.yml ]; then
            docker-compose -f docker-compose.prod.yml down
            echo "✅ アプリケーションが停止しました"
        else
            echo "Docker Compose設定ファイルが見つかりません"
        fi
STOP_EOF
}

# アプリケーション開始
start_app() {
    log_info "アプリケーションを開始しています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'START_EOF'
        cd /home/ubuntu/backspace-fm-app
        if [ -f docker-compose.prod.yml ]; then
            docker-compose -f docker-compose.prod.yml up -d
            echo "アプリケーションの起動を待機しています..."
            for i in {1..20}; do
                if curl -s http://127.0.0.1:5000/api/version > /dev/null; then
                    echo "✅ アプリケーションが正常に開始しました"
                    break
                fi
                echo "起動待機中... ($i/20)"
                sleep 3
            done
        else
            echo "Docker Compose設定ファイルが見つかりません"
        fi
START_EOF
}

# データベースバックアップ
backup_database() {
    log_info "データベースバックアップを作成しています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'BACKUP_EOF'
        cd /home/ubuntu/backspace-fm-app
        if [ -f docker-compose.prod.yml ]; then
            # バックアップディレクトリ作成
            mkdir -p backups
            
            # バックアップファイル名（タイムスタンプ付き）
            BACKUP_FILE="backups/backup_$(date +%Y%m%d_%H%M%S).sql"
            
            # PostgreSQLダンプ作成
            docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U backspace_user -d backspace_fm > $BACKUP_FILE
            
            if [ -f $BACKUP_FILE ]; then
                echo "✅ バックアップが作成されました: $BACKUP_FILE"
                echo "ファイルサイズ: $(du -h $BACKUP_FILE | cut -f1)"
                
                # 古いバックアップファイル削除（7日以上前）
                find backups/ -name "backup_*.sql" -mtime +7 -delete
                echo "7日以上前の古いバックアップファイルを削除しました"
            else
                echo "❌ バックアップの作成に失敗しました"
            fi
        else
            echo "Docker Compose設定ファイルが見つかりません"
        fi
BACKUP_EOF
}

# Nginx管理
manage_nginx() {
    log_info "Nginx設定確認・管理を行います..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'NGINX_EOF'
        echo "=== Nginx設定テスト ==="
        sudo nginx -t
        echo ""
        
        echo "=== Nginx状態 ==="
        sudo systemctl status nginx --no-pager -l
        echo ""
        
        echo "=== 設定ファイル確認 ==="
        if [ -f /etc/nginx/sites-available/backspace-fm ]; then
            echo "✅ Backspace.fm設定ファイルが存在します"
        else
            echo "❌ Backspace.fm設定ファイルが見つかりません"
        fi
        
        echo ""
        echo "=== 最近のエラーログ ==="
        sudo tail -n 10 /var/log/nginx/error.log 2>/dev/null || echo "エラーログが見つかりません"
        
        echo ""
        echo "Nginxを再起動しますか？ (y/N)"
        read -t 10 -r response
        if [[ $response =~ ^[Yy]$ ]]; then
            sudo systemctl reload nginx
            echo "✅ Nginxが再起動されました"
        else
            echo "Nginxの再起動をスキップしました"
        fi
NGINX_EOF
}

# クリーンアップ
cleanup_docker() {
    log_info "Dockerリソースをクリーンアップしています..."
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'CLEANUP_EOF'
        echo "=== 停止中のコンテナ削除 ==="
        docker container prune -f
        
        echo "=== 未使用のイメージ削除 ==="
        docker image prune -f
        
        echo "=== 未使用のネットワーク削除 ==="
        docker network prune -f
        
        echo "=== 未使用のボリューム削除（注意：データが削除される可能性があります） ==="
        echo "未使用のボリュームを削除しますか？ (y/N)"
        read -t 10 -r response
        if [[ $response =~ ^[Yy]$ ]]; then
            docker volume prune -f
            echo "✅ 未使用のボリュームが削除されました"
        else
            echo "ボリュームの削除をスキップしました"
        fi
        
        echo ""
        echo "=== ディスク使用量確認 ==="
        df -h /
        docker system df
CLEANUP_EOF
    
    log_success "クリーンアップが完了しました"
}

# SSH接続
connect_shell() {
    log_info "サーバーにSSH接続しています..."
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST
}

# アプリケーション更新（再デプロイ）
update_app() {
    log_info "アプリケーションを更新しています..."
    log_warning "これは完全な再デプロイを実行します"
    
    echo "続行しますか？ (y/N)"
    read -r response
    if [[ $response =~ ^[Yy]$ ]]; then
        ./deploy.sh
    else
        log_info "更新をキャンセルしました"
    fi
}

# メイン処理
case "$1" in
    status)
        check_status
        ;;
    logs)
        show_logs
        ;;
    restart)
        restart_app
        ;;
    stop)
        stop_app
        ;;
    start)
        start_app
        ;;
    backup)
        backup_database
        ;;
    shell)
        connect_shell
        ;;
    nginx)
        manage_nginx
        ;;
    cleanup)
        cleanup_docker
        ;;
    update)
        update_app
        ;;
    *)
        show_usage
        exit 1
        ;;
esac