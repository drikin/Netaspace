#!/bin/bash

# Replit Deploy自動化スクリプト
# デプロイ時にバックアップ、マイグレーション、環境設定を自動実行

set -e

echo "🚀 Starting automated deployment process..."

# 環境変数の確認
if [ "$REPLIT_DEPLOYMENT" = "true" ]; then
    echo "✅ Production environment detected"
    
    # 本番データベースディレクトリの作成
    mkdir -p /var/data/backups
    echo "📁 Backup directory ensured"
    
    # 既存DBのバックアップ（存在する場合）
    if [ -f "/var/data/production.sqlite" ]; then
        BACKUP_FILE="/var/data/backups/backup-$(date +%Y%m%d-%H%M%S).sqlite"
        cp /var/data/production.sqlite "$BACKUP_FILE"
        echo "💾 Database backed up to: $BACKUP_FILE"
        
        # 古いバックアップの削除（最新5個を保持）
        cd /var/data/backups
        ls -t backup-*.sqlite 2>/dev/null | tail -n +6 | xargs rm -f
        echo "🗑️  Old backups cleaned up"
    else
        echo "ℹ️  No existing database found, skipping backup"
    fi
    
    # Node.jsの依存関係インストール
    npm ci --production
    echo "📦 Dependencies installed"
    
else
    echo "💻 Development environment detected"
    # 開発環境のDB用ディレクトリ作成
    mkdir -p ./database
fi

echo "✅ Deployment preparation completed"