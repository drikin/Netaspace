#!/bin/bash
# SSL証明書セットアップスクリプト

set -e

echo "🔒 SSL証明書をセットアップしています..."

# SSL証明書ディレクトリの作成
mkdir -p ssl

# Let's Encrypt証明書の取得（Certbotを使用）
if command -v certbot &> /dev/null; then
    echo "📜 Let's Encrypt証明書を取得しています..."
    
    # ドメイン名の入力を求める
    read -p "ドメイン名を入力してください (例: your-domain.com): " DOMAIN
    
    # 証明書の取得
    certbot certonly --standalone \
        --preferred-challenges http \
        --email admin@${DOMAIN} \
        --agree-tos \
        --no-eff-email \
        -d ${DOMAIN} \
        --non-interactive
    
    # 証明書をコピー
    cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ssl/cert.pem
    cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ssl/key.pem
    
    echo "✅ Let's Encrypt証明書のセットアップが完了しました"
else
    echo "⚠️ Certbotがインストールされていません。自己署名証明書を作成します..."
    
    # 自己署名証明書の作成
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=JP/ST=Tokyo/L=Tokyo/O=Backspace FM/CN=localhost"
    
    echo "⚠️ 自己署名証明書を作成しました。本番環境では適切なSSL証明書を使用してください。"
fi

# 権限設定
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem

echo "🔐 SSL証明書のセットアップが完了しました"