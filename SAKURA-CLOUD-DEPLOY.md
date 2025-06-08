# さくらのクラウド デプロイガイド

## 必要なもの
- さくらのクラウドアカウント
- Docker対応のVMインスタンス（推奨: 2vCPU, 4GB RAM以上）
- SSH接続環境

## デプロイ手順

### 1. さくらのクラウドでVMインスタンス作成
1. さくらのクラウドコントロールパネルにログイン
2. 「サーバー」→「追加」を選択
3. 推奨スペック：
   - **プラン**: 石狩第2ゾーン / 2vCPU-4GBメモリ
   - **OS**: Ubuntu 22.04 LTS
   - **ディスク**: 40GB SSD
   - **ネットワーク**: インターネット接続あり

### 2. サーバー初期設定
```bash
# SSHでサーバーに接続
ssh ubuntu@YOUR_SERVER_IP

# システム更新
sudo apt update && sudo apt upgrade -y

# Docker インストール
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose インストール
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 再ログイン（Docker グループ反映のため）
exit
ssh ubuntu@YOUR_SERVER_IP
```

### 3. アプリケーションデプロイ
```bash
# アプリケーションディレクトリ作成
mkdir -p ~/backspace-fm-app
cd ~/backspace-fm-app

# 以下のファイルをサーバーにアップロード：
# - Dockerfile
# - docker-compose.yml
# - 全てのアプリケーションファイル

# Docker イメージビルド＆起動
docker-compose up --build -d

# ログ確認
docker-compose logs -f
```

### 4. ファイル転送方法

**方法1: SCPでファイル転送**
```bash
# ローカルから全ファイルを転送
scp -r ./* ubuntu@YOUR_SERVER_IP:~/backspace-fm-app/
```

**方法2: Gitリポジトリ経由**
```bash
# サーバー上でクローン
git clone YOUR_REPOSITORY_URL ~/backspace-fm-app
cd ~/backspace-fm-app
```

### 5. SSL証明書設定（Let's Encrypt）
```bash
# Certbot インストール
sudo apt install certbot

# SSL証明書取得（独自ドメインがある場合）
sudo certbot certonly --standalone -d your-domain.com

# nginx設定（オプション）
sudo apt install nginx
```

### 6. リバースプロキシ設定（nginx）
```nginx
# /etc/nginx/sites-available/backspace-fm
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7. ファイアウォール設定
```bash
# UFWファイアウォール設定
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

### 8. 自動起動設定
```bash
# Docker サービス自動起動
sudo systemctl enable docker

# アプリケーション自動起動用systemdサービス作成
sudo tee /etc/systemd/system/backspace-fm.service > /dev/null <<EOF
[Unit]
Description=Backspace FM Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/backspace-fm-app
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable backspace-fm.service
sudo systemctl start backspace-fm.service
```

## 運用管理

### バックアップ確認
```bash
# アプリケーションコンテナ内のバックアップ確認
docker-compose exec app ls -la /app/data/backups/
```

### ログ監視
```bash
# リアルタイムログ
docker-compose logs -f app

# 過去のログ
docker-compose logs --tail=100 app
```

### アップデート手順
```bash
# 新しいコードをpull
git pull origin main

# コンテナ再ビルド
docker-compose down
docker-compose up --build -d
```

## トラブルシューティング

### コンテナが起動しない場合
```bash
# コンテナ状態確認
docker-compose ps

# エラーログ確認
docker-compose logs app
```

### データベースの問題
```bash
# コンテナ内でデータベース確認
docker-compose exec app node scripts/debug-production.js
```

## 料金目安
- **VM**: 月額 3,000円程度（2vCPU-4GB）
- **ストレージ**: 40GB SSD 月額 1,200円程度
- **転送量**: 月10GBまで無料、超過分従量課金

## セキュリティ推奨設定
- SSH鍵認証の設定
- パスワード認証の無効化
- 定期的なセキュリティアップデート
- アクセスログの監視