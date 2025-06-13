# さくらのクラウドデプロイメントガイド

## 概要

このガイドでは、さくらのクラウドのUbuntuサーバーに `neta.backspace.fm` をデプロイする手順を説明します。

## 推奨構成

- **OS**: Ubuntu 22.04 LTS
- **Node.js**: 20.x LTS
- **プロセス管理**: PM2
- **Webサーバー**: Nginx (リバースプロキシ)
- **SSL**: Let's Encrypt (Certbot)
- **データベース**: Neon PostgreSQL (外部サービス)

## デプロイ手順

### 1. サーバー初期設定

```bash
# サーバーにSSH接続
ssh ubuntu@your-server-ip

# 初期設定スクリプトを実行
curl -sSL https://raw.githubusercontent.com/your-repo/server-setup.sh | bash
```

### 2. アプリケーションのクローン

```bash
# ホームディレクトリに移動
cd ~

# リポジトリをクローン
git clone https://github.com/your-username/neta-backspace-fm.git
cd neta-backspace-fm

# 実行権限を付与
chmod +x deploy-sakura.sh server-setup.sh
```

### 3. 環境変数の設定

```bash
# 本番環境用の環境変数をコピー
cp .env.production .env

# 環境変数を編集
nano .env
```

必要な環境変数:
```bash
DATABASE_URL=postgresql://username:password@host:5432/database
SESSION_SECRET=your-super-secret-session-key-here
NODE_ENV=production
PORT=5000
```

### 4. アプリケーションのデプロイ

```bash
# デプロイスクリプトを実行
./deploy-sakura.sh
```

### 5. SSL証明書の取得

```bash
# Certbotをインストール
sudo apt install certbot python3-certbot-nginx

# SSL証明書を取得
sudo certbot --nginx -d neta.backspace.fm
```

### 6. Nginx設定の適用

```bash
# Nginx設定ファイルをコピー
sudo cp nginx-config.conf /etc/nginx/sites-available/neta.backspace.fm

# シンボリックリンクを作成
sudo ln -s /etc/nginx/sites-available/neta.backspace.fm /etc/nginx/sites-enabled/

# デフォルト設定を無効化
sudo rm /etc/nginx/sites-enabled/default

# 設定をテスト
sudo nginx -t

# Nginxを再読み込み
sudo systemctl reload nginx
```

## 運用コマンド

### PM2管理

```bash
# アプリケーション状態確認
pm2 status

# ログ確認
pm2 logs neta-app

# 再起動
pm2 restart neta-app

# 停止
pm2 stop neta-app

# 削除
pm2 delete neta-app
```

### サーバー管理

```bash
# Nginx状態確認
sudo systemctl status nginx

# Nginxログ確認
sudo tail -f /var/log/nginx/neta.backspace.fm.access.log
sudo tail -f /var/log/nginx/neta.backspace.fm.error.log

# SSL証明書の更新テスト
sudo certbot renew --dry-run
```

## 更新手順

```bash
# 最新コードを取得
git pull origin main

# 依存関係を更新
npm ci --production

# ビルド
npm run build

# アプリケーションを再起動
pm2 restart neta-app
```

## セキュリティ設定

### ファイアウォール

```bash
# UFW状態確認
sudo ufw status

# ポート22 (SSH)、80 (HTTP)、443 (HTTPS)のみ開放
```

### Fail2Ban

```bash
# Fail2Ban状態確認
sudo systemctl status fail2ban

# 設定確認
sudo fail2ban-client status
```

## トラブルシューティング

### アプリケーションが起動しない

```bash
# PM2ログを確認
pm2 logs neta-app

# データベース接続を確認
npm run db:push
```

### 502 Bad Gateway エラー

```bash
# PM2でアプリが動いているか確認
pm2 status

# Nginxエラーログを確認
sudo tail -f /var/log/nginx/neta.backspace.fm.error.log
```

### SSL証明書の問題

```bash
# 証明書の状態確認
sudo certbot certificates

# 手動で更新
sudo certbot renew
```

## パフォーマンス最適化

### PM2クラスター

複数のCPUコアを使用する場合:

```bash
# PM2設定を更新（pm2.config.js）
instances: 'max'  # CPUコア数に合わせて自動調整
```

### Nginxキャッシュ

静的ファイルのキャッシュは既に設定済みです。

## 監視とログ

### ログローテーション

PM2のログローテーションを設定:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## バックアップ

### データベース

Neon PostgreSQLは自動バックアップされますが、定期的な手動バックアップも推奨:

```bash
# データベースダンプ（管理画面から実行可能）
# /admin でアクセスして「バックアップ管理」から手動実行
```

## 費用最適化

- さくらのクラウドの最小構成（1GB RAM, 1 vCPU）で動作
- 必要に応じてスケールアップ可能
- Neon PostgreSQLの無料枠を活用

## サポート

問題が発生した場合は、以下のログを確認:
1. PM2ログ: `pm2 logs neta-app`
2. Nginxログ: `/var/log/nginx/neta.backspace.fm.error.log`
3. システムログ: `sudo journalctl -u nginx`