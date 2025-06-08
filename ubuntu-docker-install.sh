#!/bin/bash

# Ubuntu用 Docker インストールスクリプト
set -e

echo "=== Ubuntu Docker インストール開始 ==="

# システム更新
echo "システムパッケージ更新中..."
sudo apt update
sudo apt upgrade -y

# 必要なパッケージインストール
echo "必要なパッケージをインストール中..."
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Docker公式GPGキー追加
echo "Docker GPGキー追加中..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Dockerリポジトリ追加
echo "Dockerリポジトリ追加中..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# パッケージリスト更新
sudo apt update

# Docker Engine インストール
echo "Docker Engine インストール中..."
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 現在のユーザーをdockerグループに追加
echo "ユーザーをdockerグループに追加中..."
sudo usermod -aG docker $USER

# Docker サービス開始・自動起動設定
echo "Docker サービス設定中..."
sudo systemctl start docker
sudo systemctl enable docker

# Docker Compose インストール（standalone版）
echo "Docker Compose インストール中..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# インストール確認
echo "=== インストール確認 ==="
docker --version
docker-compose --version

echo ""
echo "✅ Docker インストール完了！"
echo ""
echo "⚠️  重要: dockerグループの変更を反映するため、一度ログアウトして再ログインしてください"
echo ""
echo "再ログイン後、以下のコマンドでテストできます:"
echo "  docker run hello-world"
echo "  docker-compose --version"