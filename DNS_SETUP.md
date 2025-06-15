# DNS設定ガイド - neta.backspace.fm

## 概要

`neta.backspace.fm` を さくらクラウドサーバー `153.125.147.133` で運用するためのDNS設定手順です。

## DNS設定

### 1. ドメイン管理画面での設定

backspace.fm ドメインの管理画面で以下のレコードを追加：

```
Type: A
Name: neta
Value: 153.125.147.133
TTL: 3600 (1時間)
```

### 2. 設定確認コマンド

```bash
# DNS反映確認
nslookup neta.backspace.fm

# 期待される結果:
# Name: neta.backspace.fm
# Address: 153.125.147.133
```

### 3. 反映時間

- DNS変更は通常15分～1時間で反映
- 完全反映まで最大24時間

## SSL証明書取得手順

DNS反映後、以下のコマンドでSSL証明書を取得：

```bash
# Certbotインストール
sudo apt install certbot python3-certbot-nginx

# SSL証明書取得
sudo certbot --nginx -d neta.backspace.fm

# 自動更新テスト
sudo certbot renew --dry-run
```

## 設定完了後の確認

```bash
# HTTPS接続テスト
curl -I https://neta.backspace.fm

# 期待されるレスポンス:
# HTTP/2 200
# server: nginx
```

## トラブルシューティング

### DNS未反映の場合

```bash
# 直接IPアクセスでテスト
curl -H "Host: neta.backspace.fm" http://153.125.147.133
```

### SSL証明書エラーの場合

```bash
# Nginxログ確認
sudo tail -f /var/log/nginx/error.log

# Certbotログ確認
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

## 完了チェックリスト

- [ ] DNS AレコードでIPアドレス設定済み
- [ ] nslookupで名前解決確認済み
- [ ] HTTP接続でアプリケーション動作確認済み
- [ ] SSL証明書取得済み
- [ ] HTTPS接続でアプリケーション動作確認済み
- [ ] 自動更新設定済み