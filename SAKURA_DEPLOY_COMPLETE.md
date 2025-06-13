# さくらクラウド完全デプロイガイド - 153.125.147.133

## 即座にデプロイ開始

サーバー `153.125.147.133` にSSH接続し、以下のコマンドを実行：

```bash
# 1. リポジトリをダウンロード
wget https://github.com/your-repo/archive/main.zip
unzip main.zip
cd neta-backspace-fm-main

# 2. 即座にデプロイ実行
chmod +x quick-deploy.sh
./quick-deploy.sh
```

## 設定済み情報

### サーバー情報
- **IP**: 153.125.147.133
- **OS**: Ubuntu (想定)
- **ポート**: 5000 (アプリ), 80/443 (Nginx)

### データベース設定済み
- **Provider**: Neon PostgreSQL
- **URL**: `postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require`
- **SSL**: 有効

### DNS設定必要
backspace.fm の DNS に追加：
```
Type: A
Name: neta
Value: 153.125.147.133
```

## デプロイ後の確認

```bash
# アプリケーション状態
pm2 status

# 動作確認
curl http://153.125.147.133/health

# ログ確認
pm2 logs neta-app
```

## SSL設定（DNS反映後）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d neta.backspace.fm
```

## 最終確認URL
- HTTP: http://153.125.147.133
- HTTPS: https://neta.backspace.fm (DNS設定後)

データベースは既存のNeonインスタンスを使用するため、データ移行は不要です。